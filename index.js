// index.js
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app = express();
const FRONTEND_URL = process.env.FRONTEND_URL;
if (!FRONTEND_URL) {
  console.error('❗️ FRONTEND_URL が設定されていません');
  process.exit(1);
}

app.use(cors({ origin: FRONTEND_URL, methods: ['GET','POST'] }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GET /config.json
app.get('/config.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'config.json'));
});

// POST /api/status
app.post('/api/status', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'camera-status.json');
  if (!fs.existsSync(filePath)) {
    return res.status(500).json({ error: 'Status file missing' });
  }
  const raw  = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);
  return res.json(data);
});

// ↓ 修正：更新後に最新データを返却する ↓
app.post('/api/update/status', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'camera-status.json');

  try {
    // ファイル上書き
    fs.writeFileSync(
      filePath,
      JSON.stringify(req.body, null, 2),
      'utf-8'
    );

    // 書き込んだデータを再読み込みして返却
    const raw  = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return res.json(data);

  } catch (err) {
    console.error('Error updating status:', err);
    return res.status(500).json({ error: 'Failed to update status' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
