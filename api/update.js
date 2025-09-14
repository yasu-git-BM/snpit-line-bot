const express = require('express');
const { getGistJson, updateGistJson } = require('../gistClient');

const router = express.Router();

// ===== GET =====
router.get('/', async (req, res) => {
  try {
    console.log('📡 GET /api/update');
    const status = await getGistJson();
    res.json(status);
  } catch (err) {
    console.error('❌ /api/update GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== POST =====
router.post('/', async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: '更新データが空です' });
    }

    console.log('📡 POST /api/update');
    console.log('  Request body:', JSON.stringify(req.body, null, 2));

    const updated = await updateGistJson(req.body);
    res.json(updated);
  } catch (err) {
    console.error('❌ /api/update POST error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
