const express = require('express');
const router = express.Router();
const SecurityLog = require('../models/SecurityLog');
const { authMiddleware } = require('../middleware/auth');

// GET /api/logs?limit=50&page=1&q=search
router.get('/', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(200, parseInt(req.query.limit || '50', 10));
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const q = (req.query.q || '').trim();

    const filter = {};
    if (q) {
      const re = new RegExp(q.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
      filter.$or = [{ username: re }, { email: re }, { recordAccessed: re }];
    }

    const total = await SecurityLog.countDocuments(filter);
    const logs = await SecurityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({ total, page, limit, logs });
  } catch (err) {
    console.error('Failed to fetch logs:', err && (err.stack || err));
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Dev-only endpoint: /api/logs/dev-check
// Returns a small recent logs payload without requiring auth when NODE_ENV !== 'production'
router.get('/dev-check', async (req, res) => {
  try {
    if ((process.env.NODE_ENV || 'development') === 'production') {
      return res.status(403).json({ error: 'Not available in production' });
    }

    const limit = Math.min(50, parseInt(req.query.limit || '20', 10));
    const logs = await SecurityLog.find({}).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ total: logs.length, logs });
  } catch (err) {
    console.error('Dev-check logs error:', err && (err.stack || err));
    res.status(500).json({ error: 'Failed to fetch dev logs' });
  }
});

module.exports = router;
