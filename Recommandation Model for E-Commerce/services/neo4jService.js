require("dotenv").config();

// Lightweight Neo4j service shim.
// If NEO4J_URI and the neo4j driver are available this will try to connect.
// Otherwise it returns a deterministic mock recommendation list so the
// API can be exercised without a running Neo4j instance.

let usingNeo4j = false;
let driver = null;
const NEO4J_URI = process.env.NEO4J_URI;

if (NEO4J_URI) {
  try {
    const neo4j = require("neo4j-driver");
    driver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(
        process.env.NEO4J_USER || "neo4j",
        process.env.NEO4J_PASSWORD || "password"
      )
    );
    usingNeo4j = true;
    console.log("neo4jService: driver initialized");
  } catch (err) {
    console.warn(
      "neo4jService: neo4j driver not available or connection failed, using mock",
      err.message
    );
  }
}

async function getGraphRecommendations(userId, limit = 10) {
  if (usingNeo4j && driver) {
    const session = driver.session();
    try {
      // Placeholder Cypher — real queries will depend on your graph schema
      const cypher = `MATCH (u:User {id:$userId})-[:PURCHASED]->(:Product)<-[:PURCHASED]-(other:User)-[:PURCHASED]->(p:Product)
        WHERE NOT (u)-[:PURCHASED]->(p)
        RETURN p.id AS product_id, COUNT(DISTINCT other) AS score
        ORDER BY score DESC
        LIMIT $limit`;
      const res = await session.run(cypher, {
        userId: neo4jParam(userId),
        limit: neo4jParam(limit),
      });
      return res.records.map((r) => ({
        product_id: r.get("product_id"),
        score: r.get("score").toNumber
          ? r.get("score").toNumber()
          : r.get("score"),
      }));
    } finally {
      await session.close();
    }
  }

  // Deterministic mock recommendations so demos are repeatable
  const start = (userId % 50) * 3; // pseudo-random but deterministic
  const rows = [];
  for (let i = 0; i < limit; i++)
    rows.push({ product_id: start + i + 1, score: limit - i });
  return rows;
}

function neo4jParam(v) {
  // helper: neo4j-driver may accept numbers/strings; keep as-is
  return v;
}

module.exports = { getGraphRecommendations };
