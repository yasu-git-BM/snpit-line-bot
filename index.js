console.log('🟢 index.js is running');
console.log('🔐 LINE_CHANNEL_SECRET:', process.env.LINE_CHANNEL_SECRET);
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const fetch = require('node-fetch');
const { Client, middleware } = require('@line/bot-sdk');
const { getGistJson } = require('./gistClient');

const app = express();
app.use(express.json());

// ===== CORS設定 =====
const FRONTEND_URL = process.env.FRONTEND_URL;
app.use(cors({
  origin: FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ===== UptimeRobot用 keep-alive =====
app.get('/', (req, res) => {
  res.status(200).send('✅ snpit-line-bot is running');
});

// ===== GUI用 config.jsonルート =====
app.get('/config.json', (req, res) => {
  res.json({
    apiVersion: '1.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// ===== GistベースAPIルート =====
const { router: statusRouter } = require('./api/status'); // ✅ 修正
app.use('/api/status', statusRouter);                     // ✅ 修正
app.use('/api/config', require('./api/config'));
app.use('/api/update', require('./api/update'));

// ===== NFT情報取得API（個別tokenId） =====
// ...（この部分は変更なし）

// ===== LINE Bot設定・Webhook・イベント処理 =====
// ...（この部分も変更なし）

// ===== サーバ起動 =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// index.js のどこか（できれば最下部）に追加
require('./polling/scheduler');
