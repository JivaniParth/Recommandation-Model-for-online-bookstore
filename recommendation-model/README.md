# Recommandation Model for E-Commerce

Multi-database recommendation system with A/B testing support for e-commerce applications.

## Recommendation Systems

This project implements **4 different recommendation algorithms** using different database technologies:

1. **Oracle - Collaborative Filtering** ✅

   - Uses Oracle analytic functions and Jaccard similarity
   - Recommends products based on similar users' purchases
   - Advanced SQL with window functions and CTEs

2. **MongoDB - Content-Based Filtering** ✅

   - Uses product attributes (category, author, tags)
   - MongoDB aggregation pipelines for attribute matching
   - Flexible schema for varying product metadata

3. **Neo4j - Graph-Based Recommendations** ✅

   - Uses graph relationships between users and products
   - Collaborative filtering through purchase patterns
   - Multiple fallback strategies

4. **Oracle - Random Recommendations** ✅
   - Simple fallback using random sampling
   - Integrated in main backend (port 5000)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│                    http://localhost:5173                     │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Backend    │  │ Recommendation│  │   Neo4j DB   │
│  (Oracle)    │  │    Service    │  │  Graph Data  │
│  Port 5000   │  │  Port 4000    │  │  Port 7687   │
└──────────────┘  └───────┬───────┘  └──────────────┘
                          │
                  ┌───────┼───────┐
                  │       │       │
                  ▼       ▼       ▼
            ┌────────┐ ┌─────────┐ ┌─────────┐
            │ Oracle │ │ MongoDB │ │  Neo4j  │
            │ Collab │ │ Content │ │  Graph  │
            └────────┘ └─────────┘ └─────────┘
```

## Prerequisites

- Node.js 18+
- Oracle Database 23c Free Edition (with data)
- MongoDB 6.0+ (local or Atlas)
- Neo4j 5.0+ (optional, for graph recommendations)
- Oracle Instant Client

## Quick setup

### 1. Install Dependencies

```powershell
cd recommendation-model
npm install
```

### 2. Configure Environment

Copy `.env` file and update with your database credentials:

```env
# Oracle Configuration (Collaborative Filtering)
ORACLE_USER=BOOKSTORE_ADMIN
ORACLE_PASSWORD=admin123
ORACLE_CONNECTION_STRING=localhost:1521/FREEPDB1
ORACLE_INSTANT_CLIENT_PATH=C:\\oracle\\instantclient_23_9

# MongoDB Configuration (Content-Based Filtering)
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=bookstore_recommendations

# Neo4j Configuration (Graph-Based Recommendations)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=bookstore123

# Server Configuration
PORT=4000
FRONTEND_URL=http://localhost:5173
```

### 3. Sync Data to MongoDB

Before using content-based recommendations, sync products and user history from Oracle to MongoDB:

```powershell
# Sync products (books catalog)
npm run sync-products

# Sync user purchase history
npm run sync-history

# Or sync both at once
npm run sync-all
```

### 4. (Optional) Sync Data to Neo4j

For graph-based recommendations:

```powershell
npm run sync-neo4j
```

### 5. Start Server

```powershell
npm start
# or for development with auto-reload
npm run dev
```

The API will be available at `http://localhost:4000`

## API Endpoints

### Recommendations

```http
GET /api/recommendations/:userId?model=<model>&limit=<number>
```

**Models:**

- `collab` or `collaborative` - Oracle collaborative filtering
- `content` - MongoDB content-based filtering
- `graph` - Neo4j graph-based filtering

If no model is specified, the system uses A/B testing assignment.

**Example:**

```bash
# Get collaborative filtering recommendations
curl http://localhost:4000/api/recommendations/1?model=collab&limit=10

# Get content-based recommendations
curl http://localhost:4000/api/recommendations/1?model=content&limit=10

# Get graph-based recommendations
curl http://localhost:4000/api/recommendations/1?model=graph&limit=10

# Use A/B testing (automatically assigned model)
curl http://localhost:4000/api/recommendations/1?limit=10
```

### A/B Testing

```http
# Get user's assigned model
GET /api/ab/user/:userId

# Assign all users to models (round-robin)
POST /api/ab/assign-all?models=1,2,3
```

### Event Logging

```http
# Log recommendation event (impression, click, purchase)
POST /api/events
Content-Type: application/json

{
  "user_id": 1,
  "product_id": "ISBN-123",
  "model_id": 1,
  "event_type": "click",
  "metadata": {}
}

# Get event counts for a model
GET /api/events/model/:modelId/counts
```

### Health Check

```http
GET /health
```

## How Each Recommendation System Works

### 1. Oracle Collaborative Filtering

**Algorithm:**

1. Find users who purchased similar products as the target user
2. Calculate Jaccard similarity: `|intersection| / |union|`
3. Find products purchased by similar users
4. Weight by similarity score and purchase frequency
5. Fallback to popular products if no history exists

**SQL Features Used:**

- Common Table Expressions (WITH clauses)
- Window Functions and Analytics
- Set Operations
- Subqueries and Joins

### 2. MongoDB Content-Based Filtering

**Algorithm:**

1. Retrieve user's purchase/view history
2. Extract preferred categories, authors, and tags
3. Use aggregation pipeline to match products:
   - Category match (weight: 3)
   - Author match (weight: 2)
   - Tag overlap (weight: 1 per tag)
   - Popularity score
4. Sort by combined score

**MongoDB Features Used:**

- Aggregation Pipeline
- Text Search Indexes
- Set Operations ($setIntersection)
- Conditional Logic ($cond)

### 3. Neo4j Graph-Based Filtering

**Algorithm:**

1. Find users connected through product purchases
2. Traverse purchase relationships
3. Recommend products from similar users' networks
4. Multiple fallback strategies (views, popular, random)

**Graph Features Used:**

- MATCH patterns
- Relationship traversal
- DISTINCT filtering
- COUNT aggregation

## Maintenance & Sync

### Periodic Sync Required

MongoDB content-based filtering requires periodic data sync from Oracle:

```powershell
# Run daily or after significant product/order changes
npm run sync-all
```

### Manual Sync

You can also sync specific collections:

```powershell
# Sync only products
npm run sync-products

# Sync only user history
npm run sync-history
```

## Troubleshooting

### Oracle Connection Issues

1. Ensure Oracle Instant Client is installed
2. Check `ORACLE_INSTANT_CLIENT_PATH` in `.env`
3. Verify connection string format: `host:port/service_name`
4. Test connection: `sqlplus username/password@connection_string`

### MongoDB Connection Issues

1. Ensure MongoDB is running: `mongosh`
2. Check connection string in `.env`
3. Verify network access (firewall, port 27017)

### Neo4j Connection Issues

1. Ensure Neo4j is running
2. Check Browser UI: `http://localhost:7474`
3. Verify credentials in `.env`
4. Test with: `cypher-shell -u neo4j -p password`

## Development

### Adding New Recommendation Algorithm

1. Create service in `services/yourService.js`
2. Implement `getRecommendations(userId, limit)` function
3. Update `routes/recommendations.js` to handle new model
4. Update A/B testing configuration

### Testing Individual Services

```javascript
// Test Oracle collaborative
const oracleService = require("./services/oracleService");
await oracleService.initialize();
const recs = await oracleService.getCollaborativeRecommendations(1, 10);
console.log(recs);

// Test MongoDB content-based
const mongoService = require("./services/mongoService");
await mongoService.initialize();
const recs = await mongoService.getContentRecommendations(1, 10);
console.log(recs);
```

## Notes & Next Steps

This scaffold provides Oracle-based collaborative filtering and MongoDB-based content filtering, replacing the previous PostgreSQL implementation. The system supports A/B testing to compare recommendation algorithms.

## References

See `PROJECTPLAN.md` in the parent directory for the full plan and timeline.
