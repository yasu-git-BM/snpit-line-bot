// index.js
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app = express();

// 本番フロントエンドの URL を環境変数から取得
// 環境変数 FRONTEND_URL を必ず設定してください
const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  'https://snpit-mon-register.vercel.app';

// CORS ミドルウェア（単一オリジン）
app.use(cors({
  origin: FRONTEND_URL,
  methods: ['GET', 'POST']
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GET /config.json → public/config.json を返却
app.get('/config.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'config.json'));
});

// POST /api/status → data/camera-status.json を返却
app.post('/api/status', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'camera-status.json');
  console.log('🧐 Load status file at:', filePath);

  try {
    if (!fs.existsSync(filePath)) {
      console.error('❌ Status file not found:', filePath);
      return res.status(500).json({ error: 'Status file missing on server' });
    }

    const raw  = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return res.json(data);

  } catch (err) {
    console.error('🔥 Error reading status file:', err);
    return res.status(500).json({ error: 'Failed to read status' });
  }
});

// POST /api/update/status → data/camera-status.json を上書き
app.post('/api/update/status', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'camera-status.json');
  console.log('🧐 Update status file at:', filePath);

  try {
    const newData = req.body;
    fs.writeFileSync(
      filePath,
      JSON.stringify(newData, null, 2),
      'utf-8'
    );
    console.log('✅ camera-status.json updated');
    return res.json({ ok: true });

  } catch (err) {
    console.error('🔥 Error updating status file:', err);
    return res.status(500).json({ error: 'Failed to update status' });
  }
});

// サーバ起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
