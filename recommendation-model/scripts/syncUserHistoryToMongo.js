// recommendation-model/scripts/syncUserHistoryToMongo.js
// Script to sync user purchase/order history from Oracle to MongoDB

require("dotenv").config();
const oracledb = require("oracledb");
const { MongoClient } = require("mongodb");

// Oracle configuration
const oracleConfig = {
  user: process.env.ORACLE_USER || "BOOKSTORE_ADMIN",
  password: process.env.ORACLE_PASSWORD || "admin123",
  connectString:
    process.env.ORACLE_CONNECTION_STRING || "localhost:1521/FREEPDB1",
};

// MongoDB configuration
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGODB_DB_NAME || "bookstore_recommendations";

async function syncUserHistory() {
  let oracleConnection = null;
  let mongoClient = null;

  try {
    console.log("🚀 Starting user history sync from Oracle to MongoDB...\n");

    // Initialize Oracle Client
    const instantClientPath =
      process.env.ORACLE_INSTANT_CLIENT_PATH ||
      "C:\\oracle\\instantclient_23_9";
    try {
      oracledb.initOracleClient({ libDir: instantClientPath });
      console.log("✅ Oracle client initialized");
    } catch (err) {
      if (!err.message.includes("already been initialized")) {
        throw err;
      }
    }

    // Connect to Oracle
    console.log("📊 Connecting to Oracle...");
    oracleConnection = await oracledb.getConnection(oracleConfig);
    console.log("✅ Connected to Oracle");

    // Connect to MongoDB
    console.log("🍃 Connecting to MongoDB...");
    mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
    const db = mongoClient.db(DB_NAME);
    const userHistoryCollection = db.collection("user_history");
    console.log("✅ Connected to MongoDB\n");

    // Fetch user purchase history from Oracle
    console.log("📥 Fetching user purchase history from Oracle...");
    const result = await oracleConnection.execute(
      `
      SELECT 
        o.user_id,
        oi.isbn,
        o.created_at as order_date
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      WHERE o.payment_status = 'completed'
      ORDER BY o.user_id, o.created_at DESC
      `,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log(
      `✅ Fetched ${result.rows.length} purchase records from Oracle\n`
    );

    if (result.rows.length === 0) {
      console.log("⚠️ No purchase history found in Oracle database");
      return;
    }

    // Group purchases by user
    console.log("🔄 Processing user purchase history...");
    const userPurchases = new Map();

    for (const row of result.rows) {
      const userId = row.USER_ID;
      const isbn = row.ISBN;

      if (!userPurchases.has(userId)) {
        userPurchases.set(userId, {
          purchased: new Set(),
          viewed: new Set(),
        });
      }

      userPurchases.get(userId).purchased.add(isbn);
    }

    console.log(`✅ Processed ${userPurchases.size} unique users\n`);

    // Sync to MongoDB
    console.log("💾 Syncing user history to MongoDB...");
    let successCount = 0;
    let errorCount = 0;

    for (const [userId, history] of userPurchases.entries()) {
      try {
        await userHistoryCollection.updateOne(
          { user_id: userId },
          {
            $set: {
              purchased: Array.from(history.purchased),
              last_updated: new Date(),
            },
            $setOnInsert: {
              viewed: [],
            },
          },
          { upsert: true }
        );

        successCount++;
        if (successCount % 10 === 0) {
          process.stdout.write(
            `\r   Synced ${successCount}/${userPurchases.size} users...`
          );
        }
      } catch (err) {
        errorCount++;
        console.error(`\n❌ Error syncing user ${userId}:`, err.message);
      }
    }

    console.log(`\n\n✅ Sync completed successfully!`);
    console.log(`   - Total users: ${userPurchases.size}`);
    console.log(`   - Successfully synced: ${successCount}`);
    console.log(`   - Errors: ${errorCount}`);

    // Create indexes
    console.log("\n📑 Creating MongoDB indexes...");
    await userHistoryCollection.createIndex({ user_id: 1 }, { unique: true });
    await userHistoryCollection.createIndex({ last_updated: -1 });
    console.log("✅ Indexes created successfully");

    console.log("\n🎉 User history sync completed!");
  } catch (error) {
    console.error("\n❌ Error during sync:", error);
    throw error;
  } finally {
    // Close connections
    if (oracleConnection) {
      try {
        await oracleConnection.close();
        console.log("\n🔌 Oracle connection closed");
      } catch (err) {
        console.error("Error closing Oracle connection:", err);
      }
    }

    if (mongoClient) {
      try {
        await mongoClient.close();
        console.log("🔌 MongoDB connection closed");
      } catch (err) {
        console.error("Error closing MongoDB connection:", err);
      }
    }
  }
}

// Run the sync
syncUserHistory()
  .then(() => {
    console.log("\n✅ All done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Fatal error:", err);
    process.exit(1);
  });
