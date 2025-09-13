// index.js
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL
  || 'https://<あなたの-vercel-project>.vercel.app';

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GET /config.json
app.get('/config.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'config.json'));
});

// POST /api/status
app.post('/api/status', (req, res) => {
  const data = require('./camera-status.json');
  res.json(data);
});

// POST /api/update/status
app.post('/api/update/status', (req, res) => {
  // ここでファイル更新などの処理を行う
  console.log('📄 camera-status.json updated');
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
