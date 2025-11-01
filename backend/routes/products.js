const express = require("express");
const router = express.Router();
const { pool } = require("../services/postgresService");

// GET /api/products - Get all products
router.get("/", async (req, res) => {
  try {
    const client = await pool.connect();
    const { rows } = await client.query(
      "SELECT id, sku, name, category, price FROM products ORDER BY id"
    );
    client.release();
    return res.json({ ok: true, products: rows });
  } catch (err) {
    console.error("Get products failed", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/products/:id - Get single product
router.get("/:id", async (req, res) => {
  const productId = parseInt(req.params.id);
  if (!productId) return res.status(400).json({ error: "invalid productId" });

  try {
    const client = await pool.connect();
    const { rows } = await client.query(
      "SELECT id, sku, name, category, price FROM products WHERE id = $1",
      [productId]
    );
    client.release();

    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Product not found" });
    }

    return res.json({ ok: true, product: rows[0] });
  } catch (err) {
    console.error("Get product failed", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/products/category/:category - Get products by category
router.get("/category/:category", async (req, res) => {
  const category = req.params.category;

  try {
    const client = await pool.connect();
    const { rows } = await client.query(
      "SELECT id, sku, name, category, price FROM products WHERE category = $1 ORDER BY name",
      [category]
    );
    client.release();
    return res.json({ ok: true, products: rows });
  } catch (err) {
    console.error("Get products by category failed", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
