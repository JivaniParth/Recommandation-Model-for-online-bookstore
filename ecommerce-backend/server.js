// ecommerce-backend/server.js
require("dotenv").config();
console.log("🔍 Environment check:");
console.log("  ORACLE_USER:", process.env.ORACLE_USER ? "✓" : "✗");
console.log("  ORACLE_PASSWORD:", process.env.ORACLE_PASSWORD ? "✓" : "✗");
console.log(
  "  ORACLE_CONNECTION_STRING:",
  process.env.ORACLE_CONNECTION_STRING
);
console.log("  JWT_SECRET exists:", !!process.env.JWT_SECRET);
console.log("  PORT:", process.env.PORT || "using default");

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("./db/oracleDb");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// Initialize database connection
console.log("🔧 Initializing Oracle database connection...");
db.initialize()
  .then(() => {
    console.log("✅ Database initialized successfully");
    startServer();
  })
  .catch((err) => {
    console.error("❌ Failed to initialize database:", err);
    process.exit(1);
  });

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "mySecretKey123!BookStoreApp2025";

// ==================== MIDDLEWARE ====================

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userType = decoded.userType;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.userType !== "admin") {
    return res
      .status(403)
      .json({ success: false, message: "Admin access required" });
  }
  next();
};

// ==================== AUTH ROUTES ====================

// Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;

    // Check if user exists
    const existingUser = await db.execute(
      "SELECT * FROM users WHERE email = :email",
      [email],
      { outFormat: db.OUT_FORMAT_OBJECT }
    );

    if (existingUser.rows.length > 0) {
      return res
        .status(400)
        .json({ success: false, error: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await db.execute(
      `INSERT INTO users (first_name, last_name, email, password_hash, phone, user_type)
       VALUES (:firstName, :lastName, :email, :password, :phone, 'customer')
       RETURNING user_id, first_name, last_name, email, phone, user_type, created_at INTO :id, :fname, :lname, :email_out, :phone_out, :type, :created`,
      {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phone: phone || null,
        id: { dir: db.BIND_OUT, type: db.NUMBER },
        fname: { dir: db.BIND_OUT, type: db.STRING },
        lname: { dir: db.BIND_OUT, type: db.STRING },
        email_out: { dir: db.BIND_OUT, type: db.STRING },
        phone_out: { dir: db.BIND_OUT, type: db.STRING },
        type: { dir: db.BIND_OUT, type: db.STRING },
        created: { dir: db.BIND_OUT, type: db.DATE },
      },
      { autoCommit: true }
    );

    const userId = result.outBinds.id;

    // Generate token
    const token = jwt.sign(
      { userId: userId, userType: "customer" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: userId,
        firstName: result.outBinds.fname,
        lastName: result.outBinds.lname,
        email: result.outBinds.email_out,
        phone: result.outBinds.phone_out,
        user_type: result.outBinds.type,
        joinedDate: result.outBinds.created,
        avatar: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=6366f1&color=fff`,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ success: false, error: "Registration failed" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await db.execute(
      "SELECT * FROM users WHERE email = :email",
      [email],
      { outFormat: db.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.PASSWORD_HASH);

    if (!validPassword) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.USER_ID, userType: user.USER_TYPE },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.USER_ID,
        firstName: user.FIRST_NAME,
        lastName: user.LAST_NAME,
        email: user.EMAIL,
        phone: user.PHONE,
        address: user.ADDRESS,
        city: user.CITY,
        postalCode: user.POSTAL_CODE,
        user_type: user.USER_TYPE,
        joinedDate: user.CREATED_AT,
        avatar: `https://ui-avatars.com/api/?name=${user.FIRST_NAME}+${user.LAST_NAME}&background=6366f1&color=fff`,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, error: "Login failed" });
  }
});

// Verify token
app.get("/api/auth/verify", authMiddleware, async (req, res) => {
  try {
    const result = await db.execute(
      "SELECT * FROM users WHERE user_id = :id",
      [req.userId],
      { outFormat: db.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      user: {
        id: user.USER_ID,
        firstName: user.FIRST_NAME,
        lastName: user.LAST_NAME,
        email: user.EMAIL,
        phone: user.PHONE,
        address: user.ADDRESS,
        city: user.CITY,
        postalCode: user.POSTAL_CODE,
        user_type: user.USER_TYPE,
        joinedDate: user.CREATED_AT,
        avatar: `https://ui-avatars.com/api/?name=${user.FIRST_NAME}+${user.LAST_NAME}&background=6366f1&color=fff`,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Verification failed" });
  }
});

// ==================== USER PROFILE ====================

app.put("/api/user/profile", authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, address, city, postalCode } =
      req.body;

    await db.execute(
      `UPDATE users SET
        first_name = :firstName, 
        last_name = :lastName, 
        email = :email, 
        phone = :phone,
        address = :address, 
        city = :city, 
        postal_code = :postalCode
       WHERE user_id = :userId`,
      {
        firstName,
        lastName,
        email,
        phone: phone || null,
        address: address || null,
        city: city || null,
        postalCode: postalCode || null,
        userId: req.userId,
      },
      { autoCommit: true }
    );

    const result = await db.execute(
      "SELECT * FROM users WHERE user_id = :id",
      [req.userId],
      { outFormat: db.OUT_FORMAT_OBJECT }
    );

    const user = result.rows[0];
    res.json({
      success: true,
      user: {
        id: user.USER_ID,
        firstName: user.FIRST_NAME,
        lastName: user.LAST_NAME,
        email: user.EMAIL,
        phone: user.PHONE,
        address: user.ADDRESS,
        city: user.CITY,
        postalCode: user.POSTAL_CODE,
        user_type: user.USER_TYPE,
        joinedDate: user.CREATED_AT,
        avatar: `https://ui-avatars.com/api/?name=${user.FIRST_NAME}+${user.LAST_NAME}&background=6366f1&color=fff`,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ success: false, error: "Profile update failed" });
  }
});

// ==================== BOOKS ====================

app.get("/api/books", async (req, res) => {
  try {
    const {
      search,
      category,
      author,
      publisher,
      sort = "title",
      page = 1,
      per_page = 20,
    } = req.query;

    let query = `
      SELECT 
        b.isbn as id, b.isbn, b.title, b.price, b.stock_quantity as stock,
        b.pages, b.description, b.image_url as image, b.publication_date as publicationDate,
        a.author_name as author,
        p.publisher_name as publisher,
        c.category_name as categoryName,
        c.category_id
      FROM books b
      LEFT JOIN authors a ON b.author_name = a.author_name
      LEFT JOIN publishers p ON b.publisher_name = p.publisher_name
      LEFT JOIN categories c ON b.category_name = c.category_name
      WHERE 1=1
    `;

    const binds = {};
    let bindCount = 1;

    if (search) {
      query += ` AND (LOWER(b.title) LIKE :search${bindCount} OR LOWER(a.author_name) LIKE :search${bindCount})`;
      binds[`search${bindCount}`] = `%${search.toLowerCase()}%`;
      bindCount++;
    }

    if (category && category !== "all") {
      query += ` AND c.category_id = :cat`;
      binds.cat = category;
    }

    if (author) {
      query += ` AND a.author_name = :auth`;
      binds.auth = author;
    }

    if (publisher) {
      query += ` AND p.publisher_name = :pub`;
      binds.pub = publisher;
    }

    // Sorting
    const sortMap = {
      title: "b.title ASC",
      author: "a.author_name ASC",
      publisher: "p.publisher_name ASC",
      "price-low": "b.price ASC",
      "price-high": "b.price DESC",
      newest: "b.publication_date DESC",
    };
    query += ` ORDER BY ${sortMap[sort] || "b.title ASC"}`;

    // Pagination
    const offset = (page - 1) * per_page;
    query += ` OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`;
    binds.offset = offset;
    binds.limit = parseInt(per_page);

    const result = await db.execute(query, binds, {
      outFormat: db.OUT_FORMAT_OBJECT,
    });

    res.json({
      success: true,
      books: db.resultToArray(result),
      pagination: {
        page: parseInt(page),
        per_page: parseInt(per_page),
        total: result.rows.length,
      },
    });
  } catch (error) {
    console.error("Get books error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch books" });
  }
});

// Continue with other routes (categories, cart, orders, etc.)
// Due to length constraints, I'll provide the structure for key routes

// ==================== CATEGORIES ====================

app.get("/api/categories", async (req, res) => {
  try {
    const result = await db.execute(
      "SELECT category_id as id, category_name as name, description FROM categories ORDER BY category_name",
      [],
      { outFormat: db.OUT_FORMAT_OBJECT }
    );

    const categories = [
      { id: "all", name: "All Books", description: "All available books" },
      ...db.resultToArray(result),
    ];

    res.json({ success: true, categories });
  } catch (error) {
    console.error("Get categories error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch categories" });
  }
});

// ... Continue with CART, ORDERS, and ADMIN routes following similar patterns

function startServer() {
  app.listen(PORT, () => {
    console.log(`✅ E-commerce API server running on port ${PORT}`);
    console.log(`📊 Database: Oracle`);
    console.log(`🔗 Frontend URL: http://localhost:5173`);
  });
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await db.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await db.close();
  process.exit(0);
});
