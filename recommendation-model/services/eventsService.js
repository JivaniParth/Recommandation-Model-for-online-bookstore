// backend/services/eventsService.js
require("dotenv").config();
const oracledb = require("oracledb");

// Oracle connection configuration
const dbConfig = {
  user: process.env.ORACLE_USER || "BOOKSTORE_ADMIN",
  password: process.env.ORACLE_PASSWORD || "admin123",
  connectString:
    process.env.ORACLE_CONNECTION_STRING || "localhost:1521/FREEPDB1",
};

let pool = null;
let usingOracle = false;

// In-memory event storage fallback
const eventCache = [];

/**
 * Initialize Oracle connection pool
 */
async function initialize() {
  try {
    // Try to initialize Oracle client if not already done
    const instantClientPath =
      process.env.ORACLE_INSTANT_CLIENT_PATH ||
      "C:\\oracle\\instantclient_23_9";

    try {
      oracledb.initOracleClient({ libDir: instantClientPath });
    } catch (err) {
      if (!err.message.includes("already been initialized")) {
        console.warn("Oracle client initialization warning:", err.message);
      }
    }

    pool = await oracledb.createPool({
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: dbConfig.connectString,
      poolMin: 1,
      poolMax: 3,
      poolIncrement: 1,
      poolTimeout: 60,
    });

    usingOracle = true;
    console.log(
      "✅ Events Service: Connected to Oracle database for persistent event logging"
    );
  } catch (err) {
    console.warn(
      "⚠️ Events Service: Failed to connect to Oracle, using in-memory storage",
      err.message
    );
    usingOracle = false;
  }
}

/**
 * Close Oracle connection pool
 */
async function close() {
  if (pool) {
    try {
      await pool.close(10);
      console.log("🔌 Events Service: Oracle connection closed");
    } catch (err) {
      console.error("Error closing Events Service Oracle pool:", err);
    }
  }
}

/**
 * Log recommendation event to Oracle database.
 * Persistent implementation for tracking user interactions.
 */
async function logEvent({
  user_id = null,
  product_id = null,
  model_id = null,
  event_type,
  metadata = {},
}) {
  if (!event_type) {
    throw new Error("event_type is required");
  }

  const event = {
    user_id,
    product_id,
    model_id,
    event_type,
    metadata,
    created_at: new Date().toISOString(),
  };

  // If Oracle not available, store in memory
  if (!usingOracle || !pool) {
    event.id = eventCache.length + 1;
    eventCache.push(event);
    console.log(
      `[IN-MEMORY EVENT] Type: ${event_type}, User: ${user_id}, Product: ${product_id}, Model: ${model_id}`
    );
    return event;
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Convert metadata to JSON string for CLOB storage
    const metadataJson = JSON.stringify(metadata);

    // Insert event into database
    const result = await connection.execute(
      `INSERT INTO recommendation_events 
       (event_id, user_id, isbn, model_id, event_type, metadata, created_at)
       VALUES (recommendation_events_seq.nextval, :user_id, :isbn, :model_id, :event_type, :metadata, CURRENT_TIMESTAMP)
       RETURNING event_id INTO :event_id`,
      {
        user_id: user_id || null,
        isbn: product_id || null,
        model_id: model_id || null,
        event_type,
        metadata: metadataJson,
        event_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      },
      { autoCommit: true }
    );

    event.id = result.outBinds.event_id[0];

    console.log(
      `✅ [EVENT LOGGED] ID: ${event.id}, Type: ${event_type}, User: ${user_id}, Product: ${product_id}, Model: ${model_id}`
    );

    return event;
  } catch (error) {
    console.error("Error logging event to Oracle:", error.message);

    // Fallback to in-memory
    event.id = eventCache.length + 1;
    eventCache.push(event);
    console.log(
      `[FALLBACK EVENT] Type: ${event_type}, User: ${user_id}, Product: ${product_id}, Model: ${model_id}`
    );

    return event;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error closing connection:", err);
      }
    }
  }
}

/**
 * Get event counts by model from Oracle database.
 * Returns real analytics data.
 */
async function getCountsByModel(modelId) {
  if (!usingOracle || !pool) {
    // Return in-memory counts if Oracle not available
    const counts = {};
    eventCache
      .filter((e) => e.model_id === modelId)
      .forEach((e) => {
        counts[e.event_type] = (counts[e.event_type] || 0) + 1;
      });

    const result = Object.entries(counts).map(([event_type, cnt]) => ({
      event_type,
      cnt,
    }));

    console.log(
      `[IN-MEMORY COUNTS] Model ${modelId}: ${result.length} event types`
    );
    return result;
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const result = await connection.execute(
      `SELECT event_type, COUNT(*) as cnt
       FROM recommendation_events
       WHERE model_id = :modelId
       GROUP BY event_type
       ORDER BY cnt DESC`,
      { modelId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const counts = result.rows.map((row) => ({
      event_type: row.EVENT_TYPE,
      cnt: row.CNT,
    }));

    console.log(
      `✅ [REAL COUNTS] Model ${modelId}: ${
        counts.length
      } event types, Total: ${counts.reduce((sum, c) => sum + c.cnt, 0)} events`
    );

    return counts;
  } catch (error) {
    console.error(
      `Error getting event counts for model ${modelId}:`,
      error.message
    );
    return [];
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error closing connection:", err);
      }
    }
  }
}

/**
 * Get recent events for a user (useful for debugging/analytics)
 */
async function getUserEvents(userId, limit = 50) {
  if (!usingOracle || !pool) {
    return eventCache
      .filter((e) => e.user_id === userId)
      .slice(-limit)
      .reverse();
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const result = await connection.execute(
      `SELECT event_id, user_id, isbn, model_id, event_type, metadata, created_at
       FROM recommendation_events
       WHERE user_id = :userId
       ORDER BY created_at DESC
       FETCH FIRST :limit ROWS ONLY`,
      { userId, limit },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return result.rows.map((row) => ({
      id: row.EVENT_ID,
      user_id: row.USER_ID,
      product_id: row.ISBN,
      model_id: row.MODEL_ID,
      event_type: row.EVENT_TYPE,
      metadata: row.METADATA ? JSON.parse(row.METADATA) : {},
      created_at: row.CREATED_AT,
    }));
  } catch (error) {
    console.error(`Error getting events for user ${userId}:`, error.message);
    return [];
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error closing connection:", err);
      }
    }
  }
}

/**
 * Get overall event statistics (useful for dashboards)
 */
async function getOverallStats() {
  if (!usingOracle || !pool) {
    const stats = {
      total_events: eventCache.length,
      event_types: {},
      models: {},
    };

    eventCache.forEach((e) => {
      stats.event_types[e.event_type] =
        (stats.event_types[e.event_type] || 0) + 1;
      if (e.model_id) {
        stats.models[e.model_id] = (stats.models[e.model_id] || 0) + 1;
      }
    });

    return stats;
  }

  let connection;
  try {
    connection = await pool.getConnection();

    const [totalResult, typeResult, modelResult] = await Promise.all([
      connection.execute(
        `SELECT COUNT(*) as total FROM recommendation_events`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      ),
      connection.execute(
        `SELECT event_type, COUNT(*) as cnt FROM recommendation_events GROUP BY event_type`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      ),
      connection.execute(
        `SELECT model_id, COUNT(*) as cnt FROM recommendation_events WHERE model_id IS NOT NULL GROUP BY model_id`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      ),
    ]);

    const stats = {
      total_events: totalResult.rows[0].TOTAL,
      event_types: {},
      models: {},
    };

    typeResult.rows.forEach((row) => {
      stats.event_types[row.EVENT_TYPE] = row.CNT;
    });

    modelResult.rows.forEach((row) => {
      stats.models[row.MODEL_ID] = row.CNT;
    });

    return stats;
  } catch (error) {
    console.error("Error getting overall stats:", error.message);
    return { total_events: 0, event_types: {}, models: {} };
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error closing connection:", err);
      }
    }
  }
}

module.exports = {
  initialize,
  close,
  logEvent,
  getCountsByModel,
  getUserEvents,
  getOverallStats,
};
