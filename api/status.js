const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();

const JSON_BIN_STATUS_URL = process.env.JSON_BIN_STATUS_URL;
const JSON_BIN_API_KEY = process.env.JSON_BIN_API_KEY;

// ===== 安全チェック =====
if (!JSON_BIN_STATUS_URL || !/^https?:\/\//.test(JSON_BIN_STATUS_URL)) {
  throw new Error(
    '環境変数 JSON_BIN_STATUS_URL が未設定、または絶対URLではありません。\n' +
    '例: https://api.jsonbin.io/v3/b/<BIN_ID>'
  );
}
if (!JSON_BIN_API_KEY) {
  throw new Error('環境変数 JSON_BIN_API_KEY が未設定です');
}

const baseUrl = JSON_BIN_STATUS_URL.replace(/\/+$/, '');

// ===== GET =====
router.get('/', async (req, res) => {
  try {
    const getUrl = `${baseUrl}/latest`;
    console.log('📡 GET /api/status');
    console.log('  GET先URL:', getUrl);
    console.log('  JSON_BIN_API_KEY(先頭8文字):', JSON_BIN_API_KEY.slice(0, 8));

    const response = await fetch(getUrl, {
      method: 'GET',
      headers: { 'X-Master-Key': JSON_BIN_API_KEY }
    });

    const text = await response.text();
    console.log('  JSONBin GET response:', response.status, text);

    if (!response.ok) throw new Error(`JSONBin GET失敗: ${response.status} ${text}`);

    const data = JSON.parse(text);
    res.json(data.record);
  } catch (err) {
    console.error('❌ /api/status GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== POST =====
router.post('/', async (req, res) => {
  try {
    const putUrl = baseUrl;
    console.log('📡 POST /api/status');
    console.log('  PUT先URL:', putUrl);
    console.log('  JSON_BIN_API_KEY(先頭8文字):', JSON_BIN_API_KEY.slice(0, 8));
    console.log('  Request body:', JSON.stringify(req.body));

    const response = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSON_BIN_API_KEY
      },
      body: JSON.stringify(req.body)
    });

    const text = await response.text();
    console.log('  JSONBin PUT response:', response.status, text);

    if (!response.ok) throw new Error(`JSONBin PUT失敗: ${response.status} ${text}`);

    const data = JSON.parse(text);
    res.json(data.record);
  } catch (err) {
    console.error('❌ /api/status POST error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
