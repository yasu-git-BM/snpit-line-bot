// line_bot/index.js

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// CORS 許可：本番では Vercel ドメインに限定する
app.use(cors({
  origin: process.env.FRONTEND_URL || '*'
}));
app.use(express.json());

// 静的ファイル(config.json)を public 配下から提供
app.use(express.static(path.join(__dirname, 'public')));

// エンドポイント
app.post('/api/status', (req, res) => {
  // 例: camera-status.json を読み込んで返す
  const data = require('./camera-status.json');
  res.json(data);
});

app.post('/api/update/status', (req, res) => {
  // 例: データ更新処理
  console.log('📄 camera-status.json updated');
  res.json({ ok: true });
});

// サーバ起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
