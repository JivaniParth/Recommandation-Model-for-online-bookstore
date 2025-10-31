/**
 * Minimal sync stub — intended as a placeholder for a real sync script.
 * Running this will print a helpful message describing how to implement
 * or enable the sync to Neo4j/Postgres/Oracle in this project.
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");

async function run() {
  console.log("Sync stub: no-op sync script present.");
  console.log(
    "If you want to sync data to Neo4j, implement scripts/syncToNeo4j.js using your drivers."
  );
  console.log(
    "Example: connect to Postgres, read users/products/purchases and write to Neo4j using neo4j-driver."
  );
  console.log(
    "This repository includes 'scripts/runOracleMigrations.js' to apply Oracle DDL/seed files."
  );
}

if (require.main === module)
  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });

module.exports = { run };
