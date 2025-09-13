// index.js
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app = express();

// ----------------------------------------------------------------------------
// 1. CORS 設定（単一オリジン許可）
// ----------------------------------------------------------------------------
// 環境変数 FRONTEND_URL を必ずセットしてください。
// 例: https://snpit-mon-register.vercel.app
const FRONTEND_URL = process.env.FRONTEND_URL;
if (!FRONTEND_URL) {
  console.error('❗️ 環境変数 FRONTEND_URL が設定されていません');
  process.exit(1);
}
console.log('🔧 FRONTEND_URL =', FRONTEND_URL);

app.use(cors({
  origin: FRONTEND_URL,
  methods: ['GET', 'POST'],
  optionsSuccessStatus: 200
}));

// ----------------------------------------------------------------------------
// 2. Body パーサー & 静的ファイル配信
// ----------------------------------------------------------------------------
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ----------------------------------------------------------------------------
// 3. ルート定義
// ----------------------------------------------------------------------------

// 3.1 GET /config.json
//   public/config.json を返却
app.get('/config.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'config.json'));
});

// 3.2 POST /api/status
//   data/camera-status.json を読み込んで返却
app.post('/api/status', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'camera-status.json');
  console.log('🧐 POST /api/status → loading', filePath);

  if (!fs.existsSync(filePath)) {
    console.error('❌ Status file not found:', filePath);
    return res
      .status(500)
      .json({ error: 'Status file missing on server' });
  }

  try {
    const raw  = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return res.json(data);

  } catch (err) {
    console.error('🔥 Error reading status file:', err);
    return res
      .status(500)
      .json({ error: 'Failed to read status' });
  }
});

// 3.3 POST /api/update/status
//   data/camera-status.json を書き換え
app.post('/api/update/status', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'camera-status.json');
  console.log('🧐 POST /api/update/status → updating', filePath);

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
    return res
      .status(500)
      .json({ error: 'Failed to update status' });
  }
});

// ----------------------------------------------------------------------------
// 4. サーバ起動
// ----------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
