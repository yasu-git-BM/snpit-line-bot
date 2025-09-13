// line_bot/index.js
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app = express();

// ===== CORS設定 =====
// 環境変数 FRONTEND_URL に mon_register の本番URL（末尾スラなし）を設定
const FRONTEND_URL = process.env.FRONTEND_URL;
if (!FRONTEND_URL) {
  console.error('❗ FRONTEND_URL が未設定です');
  process.exit(1);
}
console.log('🔧 FRONTEND_URL =', FRONTEND_URL);

app.use(cors({
  origin: FRONTEND_URL,
  methods: ['GET', 'POST'],
  optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== GET /config.json =====
app.get('/config.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'config.json'));
});

// ===== POST /api/status =====
app.post('/api/status', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'camera-status.json');
  console.log('🧐 POST /api/status →', filePath);

  if (!fs.existsSync(filePath)) {
    return res.status(500).json({ error: 'Status file missing' });
  }
  try {
    const raw  = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return res.json(data);
  } catch (err) {
    console.error('🔥 Error reading status file:', err);
    return res.status(500).json({ error: 'Failed to read status' });
  }
});

// ===== POST /api/update/status =====
// 更新後の最新データを返す
app.post('/api/update/status', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'camera-status.json');
  console.log('🧐 POST /api/update/status →', filePath);

  try {
    const newData = req.body;
    fs.writeFileSync(filePath, JSON.stringify(newData, null, 2), 'utf-8');
    console.log('✅ camera-status.json updated');
    return res.json(newData);
  } catch (err) {
    console.error('🔥 Error updating status file:', err);
    return res.status(500).json({ error: 'Failed to update status' });
  }
});

// ===== サーバ起動 =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
