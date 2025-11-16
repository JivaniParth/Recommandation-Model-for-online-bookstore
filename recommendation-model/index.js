require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT || 4000;

// Import services
const oracleService = require("./services/oracleService");
const mongoService = require("./services/mongoService");
const neo4jService = require("./services/neo4jService");
const abService = require("./services/abService");
const eventsService = require("./services/eventsService");

app.use(express.json());

const cors = require("cors");
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// Routes
const recommendations = require("./routes/recommendations");
app.use("/api/recommendations", recommendations);

// const products = require("./routes/products");
// app.use("/api/products", products);

// A/B testing routes
const abRoutes = require("./routes/ab");
app.use("/api/ab", abRoutes);

// Events (impression/click) routes
const eventsRoutes = require("./routes/events");
app.use("/api/events", eventsRoutes);

app.get("/", (req, res) => {
  res.send("Recommandation Model for E-Commerce — API root");
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    services: {
      oracle: "Collaborative Filtering",
      mongodb: "Content-Based Filtering",
      neo4j: "Graph-Based Filtering",
    },
  });
});

// Initialize database connections
async function initializeServices() {
  console.log("🚀 Initializing recommendation services...");

  try {
    await oracleService.initialize();
  } catch (err) {
    console.error("Failed to initialize Oracle service:", err.message);
  }

  try {
    await mongoService.initialize();
  } catch (err) {
    console.error("Failed to initialize MongoDB service:", err.message);
  }

  try {
    await abService.initialize();
  } catch (err) {
    console.error("Failed to initialize A/B Testing service:", err.message);
  }

  try {
    await eventsService.initialize();
  } catch (err) {
    console.error("Failed to initialize Events service:", err.message);
  }

  console.log("✅ Recommendation services initialized");
}

// Graceful shutdown
async function shutdown() {
  console.log("\n🛑 Shutting down gracefully...");

  await oracleService.close();
  await mongoService.close();
  await neo4jService.close();
  await abService.close();
  await eventsService.close();

  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Start server
app.listen(port, async () => {
  console.log(`Recommendation API listening on port ${port}`);
  await initializeServices();
});
