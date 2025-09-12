// line_bot/api/status.js
const express = require('express');
const fs      = require('fs');
const path    = require('path');

const router     = express.Router();
const statusPath = path.join(__dirname, '../data/camera-status.json');

router.get('/', (_req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
    res.json(data);
  } catch (err) {
    console.error('Cannot read status:', err.message);
    res.status(500).json({ error: 'Cannot read camera status' });
  }
});

module.exports = router;
