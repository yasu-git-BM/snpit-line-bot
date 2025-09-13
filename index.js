// src/index.js
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app = express();

// フロント用のオリジナルURL（環境変数 or デフォルト）
const FRONTEND_URL = process.env.FRONTEND_URL
  || 'https://<あなたの-frontend-domain>.vercel.app';

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// util: JSONファイルの絶対パスを返す
function getStatusFilePath() {
  // process.cwd() => /opt/render/project/src など、プロジェクトのルート相当になる
  return path.resolve(
    process.cwd(),
    'line_bot',
    'data',
    'camera-status.json'
  );
}

// GET /config.json
app.get('/config.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'config.json'));
});

// POST /api/status
app.post('/api/status', (req, res) => {
  const filePath = getStatusFilePath();
  console.log('🧐 Trying to load status file at:', filePath);

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

// POST /api/update/status
app.post('/api/update/status', (req, res) => {
  const filePath = getStatusFilePath();
  console.log('🧐 Trying to update status file at:', filePath);

  try {
    const newData = req.body;
    fs.writeFileSync(filePath, JSON.stringify(newData, null, 2), 'utf-8');
    console.log('✅ camera-status.json updated:', filePath);
    return res.json({ ok: true });

  } catch (err) {
    console.error('🔥 Error updating status file:', err);
    return res.status(500).json({ error: 'Failed to update status' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
