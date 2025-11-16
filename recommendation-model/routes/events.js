const express = require("express");
const router = express.Router();
const eventsService = require("../services/eventsService");

// POST /api/events
// Body: { user_id, product_id, model_id, event_type, metadata }
router.post("/", async (req, res) => {
  const payload = req.body || {};
  try {
    const row = await eventsService.logEvent(payload);
    return res.json({ ok: true, event: row });
  } catch (err) {
    console.error("logEvent failed", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/events/model/:modelId/counts
router.get("/model/:modelId/counts", async (req, res) => {
  const modelId = parseInt(req.params.modelId);
  if (!modelId) return res.status(400).json({ error: "invalid modelId" });
  try {
    const rows = await eventsService.getCountsByModel(modelId);
    return res.json({ ok: true, counts: rows });
  } catch (err) {
    console.error("getCountsByModel failed", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/events/user/:userId
// Get recent events for a specific user
router.get("/user/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId);
  const limit = parseInt(req.query.limit) || 50;
  if (!userId) return res.status(400).json({ error: "invalid userId" });

  try {
    const events = await eventsService.getUserEvents(userId, limit);
    return res.json({ ok: true, events, count: events.length });
  } catch (err) {
    console.error("getUserEvents failed", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/events/stats
// Get overall event statistics
router.get("/stats", async (req, res) => {
  try {
    const stats = await eventsService.getOverallStats();
    return res.json({ ok: true, stats });
  } catch (err) {
    console.error("getOverallStats failed", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
