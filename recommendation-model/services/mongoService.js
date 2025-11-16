// recommendation-model/services/mongoService.js
require("dotenv").config();
const { MongoClient } = require("mongodb");

// MongoDB connection configuration
const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGODB_DB_NAME || "bookstore_recommendations";

let client = null;
let db = null;
let usingMongo = false;

/**
 * Initialize MongoDB connection
 */
async function initialize() {
  try {
    client = new MongoClient(MONGO_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    db = client.db(DB_NAME);
    usingMongo = true;

    console.log(
      "✅ MongoDB service: Connected successfully for content-based recommendations"
    );

    // Create indexes for better performance
    await createIndexes();
  } catch (err) {
    console.warn(
      "⚠️ MongoDB service: Failed to connect, using mock data",
      err.message
    );
    usingMongo = false;
  }
}

/**
 * Create indexes for performance optimization
 */
async function createIndexes() {
  try {
    const productsCollection = db.collection("products");

    // Create text index for product search
    await productsCollection.createIndex({
      title: "text",
      author: "text",
      category: "text",
      description: "text",
    });

    // Create index for category-based queries
    await productsCollection.createIndex({ category: 1 });

    // Create index for author-based queries
    await productsCollection.createIndex({ author: 1 });

    console.log("✅ MongoDB indexes created successfully");
  } catch (err) {
    console.warn("Warning creating MongoDB indexes:", err.message);
  }
}

/**
 * Close MongoDB connection
 */
async function close() {
  if (client) {
    try {
      await client.close();
      console.log("🔌 MongoDB service: Connection closed");
    } catch (err) {
      console.error("Error closing MongoDB connection:", err);
    }
  }
}

/**
 * Sync products from Oracle to MongoDB for content-based filtering
 * This should be called periodically or triggered when products are updated
 */
async function syncProductsFromOracle(oracleConnection) {
  if (!usingMongo || !db) {
    console.log("MongoDB not available, skipping product sync");
    return;
  }

  try {
    const productsCollection = db.collection("products");

    // This is a placeholder - you would call this from your main app
    // with the actual Oracle connection
    console.log("Product sync functionality available");
  } catch (err) {
    console.error("Error syncing products:", err);
  }
}

/**
 * Content-Based Filtering using MongoDB
 * Strategy: Recommend products similar to what the user has purchased/viewed
 * Based on: category, author, tags, and text similarity
 *
 * Algorithm:
 * 1. Get user's purchase/view history
 * 2. Extract key attributes (categories, authors, keywords)
 * 3. Find products with similar attributes
 * 4. Score by attribute overlap and popularity
 */
async function getContentRecommendations(userId, limit = 10) {
  if (!usingMongo || !db) {
    console.log("Using mock content-based recommendations");
    return getMockContentRecommendations(userId, limit);
  }

  try {
    const userHistoryCollection = db.collection("user_history");
    const productsCollection = db.collection("products");

    // Step 1: Get user's interaction history
    const userHistory = await userHistoryCollection.findOne({
      user_id: userId,
    });

    if (!userHistory || (!userHistory.purchased && !userHistory.viewed)) {
      console.log(
        `No history found for user ${userId}, using popular content recommendations`
      );
      return await getPopularContentRecommendations(productsCollection, limit);
    }

    // Step 2: Extract user preferences
    const purchasedIds = userHistory.purchased || [];
    const viewedIds = userHistory.viewed || [];
    const allInteractedIds = [...new Set([...purchasedIds, ...viewedIds])];

    if (allInteractedIds.length === 0) {
      return await getPopularContentRecommendations(productsCollection, limit);
    }

    // Get details of products user has interacted with
    const interactedProducts = await productsCollection
      .find({
        product_id: { $in: allInteractedIds },
      })
      .toArray();

    if (interactedProducts.length === 0) {
      return await getPopularContentRecommendations(productsCollection, limit);
    }

    // Step 3: Extract preferences (categories, authors, tags)
    const preferredCategories = [
      ...new Set(interactedProducts.map((p) => p.category).filter(Boolean)),
    ];
    const preferredAuthors = [
      ...new Set(interactedProducts.map((p) => p.author).filter(Boolean)),
    ];
    const preferredTags = [
      ...new Set(interactedProducts.flatMap((p) => p.tags || [])),
    ];

    // Step 4: Build aggregation pipeline for content-based recommendations
    const pipeline = [
      // Exclude already purchased/viewed products
      {
        $match: {
          product_id: { $nin: allInteractedIds },
          stock: { $gt: 0 },
        },
      },
      // Add similarity score
      {
        $addFields: {
          category_match: {
            $cond: [
              { $in: ["$category", preferredCategories] },
              3, // High weight for category match
              0,
            ],
          },
          author_match: {
            $cond: [
              { $in: ["$author", preferredAuthors] },
              2, // Medium weight for author match
              0,
            ],
          },
          tag_match: {
            $size: {
              $setIntersection: [{ $ifNull: ["$tags", []] }, preferredTags],
            },
          },
        },
      },
      // Calculate total similarity score
      {
        $addFields: {
          score: {
            $add: [
              "$category_match",
              "$author_match",
              "$tag_match",
              { $ifNull: ["$popularity_score", 0] },
            ],
          },
        },
      },
      // Filter out products with zero score
      {
        $match: {
          score: { $gt: 0 },
        },
      },
      // Sort by score and limit results
      {
        $sort: { score: -1, popularity_score: -1 },
      },
      {
        $limit: limit,
      },
      // Project final fields
      {
        $project: {
          _id: 0,
          product_id: 1,
          product_name: "$title",
          price: 1,
          product_image: "$image",
          author: 1,
          category: 1,
          score: 1,
          category_match: 1,
          author_match: 1,
          tag_match: 1,
        },
      },
    ];

    const recommendations = await productsCollection
      .aggregate(pipeline)
      .toArray();

    if (recommendations.length === 0) {
      console.log(
        `No content recommendations found for user ${userId}, using popular items`
      );
      return await getPopularContentRecommendations(productsCollection, limit);
    }

    console.log(
      `✅ Found ${recommendations.length} MongoDB content-based recommendations for user ${userId}`
    );
    return recommendations;
  } catch (error) {
    console.error("Error in MongoDB content-based filtering:", error.message);
    return getMockContentRecommendations(userId, limit);
  }
}

/**
 * Get popular products as fallback
 */
async function getPopularContentRecommendations(productsCollection, limit) {
  try {
    const popularProducts = await productsCollection
      .find({ stock: { $gt: 0 } })
      .sort({ popularity_score: -1, rating: -1 })
      .limit(limit)
      .project({
        _id: 0,
        product_id: 1,
        product_name: "$title",
        price: 1,
        product_image: "$image",
        author: 1,
        category: 1,
        score: "$popularity_score",
      })
      .toArray();

    console.log(
      `Using popular content-based recommendations (${popularProducts.length} items)`
    );
    return popularProducts;
  } catch (error) {
    console.error("Error getting popular products:", error.message);
    return getMockContentRecommendations(1, limit);
  }
}

/**
 * Mock content-based recommendations for development/testing
 */
function getMockContentRecommendations(userId, limit) {
  console.log(
    `Returning mock content-based recommendations for user ${userId}`
  );
  const recommendations = [];
  for (let i = 0; i < limit; i++) {
    recommendations.push({
      product_id: `CONTENT-${100 + i + 1}`,
      product_name: `Content-Based Mock Product ${i + 1}`,
      price: 24.99 + i,
      category: "Fiction",
      author: "Mock Author",
      score: limit - i,
    });
  }
  return recommendations;
}

/**
 * Update user interaction history in MongoDB
 * Call this when user purchases or views a product
 */
async function updateUserHistory(
  userId,
  productId,
  interactionType = "viewed"
) {
  if (!usingMongo || !db) {
    console.log("MongoDB not available, skipping history update");
    return;
  }

  try {
    const userHistoryCollection = db.collection("user_history");

    const updateField =
      interactionType === "purchased" ? "purchased" : "viewed";

    await userHistoryCollection.updateOne(
      { user_id: userId },
      {
        $addToSet: { [updateField]: productId },
        $set: { last_updated: new Date() },
      },
      { upsert: true }
    );

    console.log(
      `✅ Updated user ${userId} history: ${interactionType} ${productId}`
    );
  } catch (err) {
    console.error("Error updating user history:", err);
  }
}

/**
 * Add or update product in MongoDB
 * Call this when products are created/updated in Oracle
 */
async function upsertProduct(productData) {
  if (!usingMongo || !db) {
    return;
  }

  try {
    const productsCollection = db.collection("products");

    const product = {
      product_id: productData.isbn || productData.product_id,
      title: productData.title,
      author: productData.author,
      category: productData.category,
      price: productData.price,
      image: productData.image,
      description: productData.description,
      tags: productData.tags || [],
      stock: productData.stock || 0,
      popularity_score: productData.popularity_score || 0,
      rating: productData.rating || 0,
      updated_at: new Date(),
    };

    await productsCollection.updateOne(
      { product_id: product.product_id },
      { $set: product },
      { upsert: true }
    );

    console.log(`✅ Product ${product.product_id} synced to MongoDB`);
  } catch (err) {
    console.error("Error upserting product:", err);
  }
}

module.exports = {
  initialize,
  close,
  getContentRecommendations,
  updateUserHistory,
  upsertProduct,
  syncProductsFromOracle,
};
