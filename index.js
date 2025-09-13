// index.js
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app = express();

// === 設定: 環境変数 FRONTEND_URL の値を確認 ===
// Render/Vercel の Env Vars に
//   FRONTEND_URL=https://spoilt-mini-misstate.vercel.app
// を登録し、末尾スラッシュ「/」がついていないことを必ず確認してください。
const FRONTEND_URL = process.env.FRONTEND_URL;
console.log('🔧 FRONTEND_URL =', FRONTEND_URL);

if (!FRONTEND_URL) {
  console.error('❗️ 環境変数 FRONTEND_URL が設定されていません');
  process.exit(1);
}

// === CORS ミドルウェア (単一オリジン許可) ===
app.use(cors({
  origin: FRONTEND_URL,
  methods: ['GET', 'POST'],
  optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// === GET /config.json ===
app.get('/config.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'config.json'));
});

// データファイルへのパスをプロジェクトルート基準で解決
function dataFile(name) {
  // プロジェクトルート直下に data フォルダを置いている想定
  return path.resolve(process.cwd(), 'data', name);
}

// === GET /all-states ===
// ブラウザのアドレスバーから叩く (GET) 用に追加
app.get('/all-states', (req, res) => {
  const filePath = dataFile('camera-status.json');
  console.log('🧐 GET all-states – loading', filePath);

  if (!fs.existsSync(filePath)) {
    console.error('❌ File not found:', filePath);
    return res.status(500).json({ error: 'State file missing' });
  }

  try {
    const raw  = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return res.json(data);
  } catch (err) {
    console.error('🔥 Error parsing state file:', err);
    return res.status(500).json({ error: 'Failed to read state' });
  }
});

// === POST /all-states ===
// フロントエンドの fetch から叩く (POST) 用
app.post('/all-states', (req, res) => {
  const filePath = dataFile('camera-status.json');
  console.log('🧐 POST all-states – updating', filePath);

  try {
    const newData = req.body;
    fs.writeFileSync(filePath, JSON.stringify(newData, null, 2), 'utf-8');
    console.log('✅ camera-status.json updated');
    return res.json({ ok: true });
  } catch (err) {
    console.error('🔥 Error writing state file:', err);
    return res.status(500).json({ error: 'Failed to update state' });
  }
});

// === サーバ起動 ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
