// api/config.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.get('/', (req, res) => {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/bot-config.json')));
    const order = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/wallet-order.json')));
    res.json({ ...cfg, walletOrder: order });
  } catch {
    res.status(500).json({ error: 'cannot read config' });
  }
});

module.exports = router;
