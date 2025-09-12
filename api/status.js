const express = require('express');
const fs      = require('fs');
const path    = require('path');

const router = express.Router();
const statusPath = path.join(__dirname, '../data/camera-status.json');

router.get('/', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
    res.json(data);
  } catch (err) {
    console.error('Cannot read status file:', err.message);
    res.status(500).json({});
  }
});

module.exports = router;
