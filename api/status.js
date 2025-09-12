const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { buildFlexMessage } = require('../utils/flexBuilder');

router.get('/snpit-status', (req, res) => {
  try {
    const statusPath = path.join(__dirname, '../data/camera-status.json');
    const orderPath = path.join(__dirname, '../data/wallet-order.json');

    const statusData = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
    const walletOrder = JSON.parse(fs.readFileSync(orderPath, 'utf8'));

    const flexMessage = buildFlexMessage(statusData, walletOrder);
    res.json(flexMessage);
  } catch (err) {
    console.error('APIステータス取得エラー:', err);
    res.status(500).json({ error: 'ステータス取得に失敗しました' });
  }
});

module.exports = router;
