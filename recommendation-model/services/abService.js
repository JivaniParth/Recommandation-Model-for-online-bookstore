// backend/services/abService.js
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

// In-memory cache fallback
const assignmentCache = new Map();

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
      "✅ A/B Service: Connected to Oracle database for persistent assignments"
    );
  } catch (err) {
    console.warn(
      "⚠️ A/B Service: Failed to connect to Oracle, using in-memory cache",
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
      console.log("🔌 A/B Service: Oracle connection closed");
    } catch (err) {
      console.error("Error closing A/B Service Oracle pool:", err);
    }
  }
}

/**
 * Get active recommendation models from database
 */
async function getActiveModels() {
  if (!usingOracle || !pool) {
    return [
      { id: 1, name: "collaborative" },
      { id: 2, name: "content" },
      { id: 3, name: "graph" },
    ];
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const result = await connection.execute(
      `SELECT model_id, model_name FROM recommendation_models WHERE is_active = 1 ORDER BY model_id`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return result.rows.map((row) => ({
      id: row.MODEL_ID,
      name: row.MODEL_NAME.toLowerCase(),
    }));
  } catch (error) {
    console.error("Error fetching active models:", error.message);
    return [
      { id: 1, name: "collaborative" },
      { id: 2, name: "content" },
      { id: 3, name: "graph" },
    ];
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
 * Assign all existing users to models evenly (round-robin).
 * Persistent implementation using Oracle database.
 */
async function assignAllUsersEvenSplit(modelIds = [1, 2, 3]) {
  if (!Array.isArray(modelIds) || modelIds.length === 0) {
    throw new Error("modelIds required");
  }

  if (!usingOracle || !pool) {
    console.warn("Oracle not available, using in-memory assignments");
    // Fallback to in-memory
    for (let i = 1; i <= 100; i++) {
      const modelId = modelIds[(i - 1) % modelIds.length];
      assignmentCache.set(i, modelId);
    }
    return {
      assigned: 100,
      total: 100,
      warning: "Using in-memory assignments (not persistent)",
    };
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Get all users from database
    const usersResult = await connection.execute(
      `SELECT user_id FROM users ORDER BY user_id`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (usersResult.rows.length === 0) {
      return { assigned: 0, total: 0, message: "No users found in database" };
    }

    let assigned = 0;
    const totalUsers = usersResult.rows.length;

    // Assign each user to a model (round-robin)
    for (let i = 0; i < usersResult.rows.length; i++) {
      const userId = usersResult.rows[i].USER_ID;
      const modelId = modelIds[i % modelIds.length];

      try {
        // Insert or update assignment
        await connection.execute(
          `MERGE INTO user_model_assignments uma
           USING dual ON (uma.user_id = :userId)
           WHEN MATCHED THEN
             UPDATE SET model_id = :modelId, assigned_at = CURRENT_TIMESTAMP
           WHEN NOT MATCHED THEN
             INSERT (user_id, model_id, assigned_at)
             VALUES (:userId, :modelId, CURRENT_TIMESTAMP)`,
          { userId, modelId },
          { autoCommit: true }
        );
        assigned++;
      } catch (err) {
        console.error(`Error assigning user ${userId}:`, err.message);
      }
    }

    console.log(
      `✅ Assigned ${assigned}/${totalUsers} users to models: ${modelIds.join(
        ", "
      )}`
    );

    return {
      assigned,
      total: totalUsers,
      message: "Users successfully assigned to models (persistent)",
    };
  } catch (error) {
    console.error("Error in assignAllUsersEvenSplit:", error.message);
    throw error;
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
 * Get or assign a model for a single user.
 * Persistent implementation using Oracle database.
 */
async function getOrAssignUserModel(userId) {
  if (!userId) {
    throw new Error("userId is required");
  }

  // Try in-memory cache first if Oracle not available
  if (!usingOracle || !pool) {
    let modelId = assignmentCache.get(userId);
    if (!modelId) {
      modelId = Math.floor(Math.random() * 3) + 1; // Random 1-3
      assignmentCache.set(userId, modelId);
    }

    const models = [
      { id: 1, name: "collaborative" },
      { id: 2, name: "content" },
      { id: 3, name: "graph" },
    ];
    const model = models.find((m) => m.id === modelId) || models[0];

    return {
      user_id: userId,
      model_id: model.id,
      model_name: model.name,
    };
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Check if user already has an assignment
    const result = await connection.execute(
      `SELECT uma.model_id, rm.model_name
       FROM user_model_assignments uma
       JOIN recommendation_models rm ON uma.model_id = rm.model_id
       WHERE uma.user_id = :userId AND rm.is_active = 1`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length > 0) {
      // User already has an assignment
      return {
        user_id: userId,
        model_id: result.rows[0].MODEL_ID,
        model_name: result.rows[0].MODEL_NAME.toLowerCase(),
      };
    }

    // No assignment found, assign a random active model
    const activeModels = await getActiveModels();
    if (activeModels.length === 0) {
      throw new Error("No active recommendation models found");
    }

    const randomIndex = Math.floor(Math.random() * activeModels.length);
    const assignedModel = activeModels[randomIndex];

    // Insert the assignment
    await connection.execute(
      `INSERT INTO user_model_assignments (user_id, model_id, assigned_at)
       VALUES (:userId, :modelId, CURRENT_TIMESTAMP)`,
      { userId, modelId: assignedModel.id },
      { autoCommit: true }
    );

    console.log(
      `✅ Assigned user ${userId} to model ${assignedModel.name} (id: ${assignedModel.id})`
    );

    return {
      user_id: userId,
      model_id: assignedModel.id,
      model_name: assignedModel.name,
    };
  } catch (error) {
    console.error(
      `Error getting/assigning model for user ${userId}:`,
      error.message
    );

    // Fallback to random assignment
    const models = await getActiveModels();
    const randomModel = models[Math.floor(Math.random() * models.length)];

    return {
      user_id: userId,
      model_id: randomModel.id,
      model_name: randomModel.name,
    };
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
  assignAllUsersEvenSplit,
  getOrAssignUserModel,
};
