// recommendation-model/services/oracleService.js
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

// Initialize Oracle connection pool
async function initialize() {
  try {
    // Try to initialize Oracle client if not already done
    const instantClientPath =
      process.env.ORACLE_INSTANT_CLIENT_PATH ||
      "C:\\oracle\\instantclient_23_9";

    try {
      oracledb.initOracleClient({ libDir: instantClientPath });
    } catch (err) {
      // Client might already be initialized
      if (!err.message.includes("already been initialized")) {
        console.warn("Oracle client initialization warning:", err.message);
      }
    }

    pool = await oracledb.createPool({
      user: dbConfig.user,
      password: dbConfig.password,
      connectString: dbConfig.connectString,
      poolMin: 1,
      poolMax: 5,
      poolIncrement: 1,
      poolTimeout: 60,
    });

    usingOracle = true;
    console.log(
      "✅ Oracle service: Connection pool created for recommendations"
    );
  } catch (err) {
    console.warn(
      "⚠️ Oracle service: Failed to create pool, using mock data",
      err.message
    );
    usingOracle = false;
  }
}

// Close Oracle connection pool
async function close() {
  if (pool) {
    try {
      await pool.close(10);
      console.log("🔌 Oracle service: Connection pool closed");
    } catch (err) {
      console.error("Error closing Oracle pool:", err);
    }
  }
}

/**
 * Collaborative Filtering using Oracle Analytic Functions
 * Strategy: Find users with similar purchase history and recommend products they bought
 *
 * Algorithm:
 * 1. Find users who bought similar products as the target user
 * 2. Calculate similarity score using Jaccard similarity
 * 3. Recommend products that similar users purchased but target user hasn't
 * 4. Rank by weighted score (similarity * purchase frequency)
 */
async function getCollaborativeRecommendations(userId, limit = 10) {
  if (!usingOracle || !pool) {
    console.log("Using mock collaborative recommendations");
    return getMockCollaborativeRecommendations(userId, limit);
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Collaborative filtering using Oracle analytic functions
    const query = `
      WITH user_purchases AS (
        -- Get target user's purchase history
        SELECT DISTINCT oi.isbn
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        WHERE o.user_id = :userId
      ),
      similar_users AS (
        -- Find users with similar purchase history
        SELECT 
          o.user_id,
          COUNT(DISTINCT CASE WHEN up.isbn IS NOT NULL THEN oi.isbn END) AS common_items,
          COUNT(DISTINCT oi.isbn) AS total_items,
          -- Jaccard similarity = |intersection| / |union|
          ROUND(
            COUNT(DISTINCT CASE WHEN up.isbn IS NOT NULL THEN oi.isbn END) * 1.0 / 
            (COUNT(DISTINCT oi.isbn) + 
             (SELECT COUNT(*) FROM user_purchases) - 
             COUNT(DISTINCT CASE WHEN up.isbn IS NOT NULL THEN oi.isbn END)),
            4
          ) AS similarity_score
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        LEFT JOIN user_purchases up ON oi.isbn = up.isbn
        WHERE o.user_id != :userId
        GROUP BY o.user_id
        HAVING COUNT(DISTINCT CASE WHEN up.isbn IS NOT NULL THEN oi.isbn END) > 0
        ORDER BY similarity_score DESC
        FETCH FIRST 20 ROWS ONLY
      ),
      recommended_products AS (
        -- Get products purchased by similar users
        SELECT 
          oi.isbn,
          SUM(su.similarity_score) AS weighted_score,
          COUNT(DISTINCT o.order_id) AS purchase_count
        FROM similar_users su
        JOIN orders o ON su.user_id = o.user_id
        JOIN order_items oi ON o.order_id = oi.order_id
        WHERE oi.isbn NOT IN (SELECT isbn FROM user_purchases)
        GROUP BY oi.isbn
        ORDER BY weighted_score DESC, purchase_count DESC
        FETCH FIRST :limit ROWS ONLY
      )
      SELECT 
        rp.isbn AS product_id,
        b.title AS product_name,
        b.price,
        b.image_url AS product_image,
        b.author_name AS author,
        c.category_name AS category,
        ROUND(rp.weighted_score, 2) AS score,
        rp.purchase_count
      FROM recommended_products rp
      JOIN books b ON rp.isbn = b.isbn
      LEFT JOIN categories c ON b.category_name = c.category_name
      ORDER BY rp.weighted_score DESC
    `;

    const result = await connection.execute(
      query,
      { userId: parseInt(userId), limit: parseInt(limit) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      console.log(
        `No collaborative recommendations found for user ${userId}, trying fallback...`
      );
      // Fallback: popular products
      return await getPopularProductsFallback(connection, userId, limit);
    }

    const recommendations = result.rows.map((row) => ({
      product_id: row.PRODUCT_ID,
      product_name: row.PRODUCT_NAME,
      price: row.PRICE,
      product_image: row.PRODUCT_IMAGE,
      author: row.AUTHOR,
      category: row.CATEGORY,
      score: row.SCORE || 0,
      purchase_count: row.PURCHASE_COUNT || 0,
    }));

    console.log(
      `✅ Found ${recommendations.length} Oracle collaborative recommendations for user ${userId}`
    );
    return recommendations;
  } catch (error) {
    console.error("Error in Oracle collaborative filtering:", error.message);
    return getMockCollaborativeRecommendations(userId, limit);
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
 * Fallback: Popular products when user has no purchase history
 */
async function getPopularProductsFallback(connection, userId, limit) {
  try {
    const fallbackQuery = `
      SELECT 
        b.isbn AS product_id,
        b.title AS product_name,
        b.price,
        b.image_url AS product_image,
        b.author_name AS author,
        c.category_name AS category,
        COUNT(oi.order_item_id) AS purchase_count,
        5.0 AS score
      FROM books b
      LEFT JOIN order_items oi ON b.isbn = oi.isbn
      LEFT JOIN categories c ON b.category_name = c.category_name
      WHERE b.stock_quantity > 0
        AND b.isbn NOT IN (
          SELECT DISTINCT oi2.isbn
          FROM orders o2
          JOIN order_items oi2 ON o2.order_id = oi2.order_id
          WHERE o2.user_id = :userId
        )
      GROUP BY b.isbn, b.title, b.price, b.image_url, b.author_name, c.category_name
      ORDER BY purchase_count DESC, b.isbn
      FETCH FIRST :limit ROWS ONLY
    `;

    const result = await connection.execute(
      fallbackQuery,
      { userId: parseInt(userId), limit: parseInt(limit) },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log(`Using popular products fallback for user ${userId}`);
    return result.rows.map((row) => ({
      product_id: row.PRODUCT_ID,
      product_name: row.PRODUCT_NAME,
      price: row.PRICE,
      product_image: row.PRODUCT_IMAGE,
      author: row.AUTHOR,
      category: row.CATEGORY,
      score: row.SCORE || 5.0,
      purchase_count: row.PURCHASE_COUNT || 0,
    }));
  } catch (error) {
    console.error("Error in fallback recommendations:", error.message);
    return getMockCollaborativeRecommendations(userId, limit);
  }
}

/**
 * Mock collaborative recommendations for development/testing
 */
function getMockCollaborativeRecommendations(userId, limit) {
  console.log(
    `Returning mock collaborative recommendations for user ${userId}`
  );
  const recommendations = [];
  for (let i = 0; i < limit; i++) {
    recommendations.push({
      product_id: `COLLAB-${i + 1}`,
      product_name: `Collaborative Mock Product ${i + 1}`,
      price: 19.99 + i,
      category: "Mock Category",
      score: limit - i,
      purchase_count: 10 - i,
    });
  }
  return recommendations;
}

module.exports = {
  initialize,
  close,
  getCollaborativeRecommendations,
};
