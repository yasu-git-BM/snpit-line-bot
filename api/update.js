const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();

const JSON_BIN_STATUS_URL = process.env.JSON_BIN_STATUS_URL;
const JSON_BIN_API_KEY  = process.env.JSON_BIN_API_KEY;

if (!JSON_BIN_STATUS_URL || !/^https?:\/\//.test(JSON_BIN_STATUS_URL)) {
  throw new Error('環境変数 JSON_BIN_STATUS_URL が未設定、または絶対URLではありません');
}
if (!JSON_BIN_API_KEY) {
  throw new Error('環境変数 JSON_BIN_API_KEY が未設定です');
}

async function getCameraStatus() {
  console.log('📡 GET /api/update');
  console.log('  GET先URL:', `${JSON_BIN_STATUS_URL}/latest`);

  const res = await fetch(`${JSON_BIN_STATUS_URL}/latest`, {
    method: 'GET',
    headers: { 'X-Master-Key': JSON_BIN_API_KEY }
  });

  const text = await res.text();
  console.log('  JSONBin GET response:', res.status, text);

  if (!res.ok) throw new Error(`JSONBin GET失敗: ${res.status} ${text}`);
  const data = JSON.parse(text);
  return data.record;
}

async function updateCameraStatus(newStatus) {
  console.log('📡 POST /api/update');
  console.log('  PUT先URL:', JSON_BIN_STATUS_URL);
  console.log('  Request body:', JSON.stringify(newStatus));

  const res = await fetch(JSON_BIN_STATUS_URL, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': JSON_BIN_API_KEY
    },
    body: JSON.stringify(newStatus)
  });

  const text = await res.text();
  console.log('  JSONBin PUT response:', res.status, text);

  if (!res.ok) throw new Error(`JSONBin PUT失敗: ${res.status} ${text}`);
  const data = JSON.parse(text);
  return data.record;
}

// ===== GET =====
router.get('/', async (req, res) => {
  try {
    const status = await getCameraStatus();
    res.json(status);
  } catch (err) {
    console.error('❌ /api/update GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== POST =====
router.post('/', async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: '更新データが空です' });
    }
    const updated = await updateCameraStatus(req.body);
    res.json(updated);
  } catch (err) {
    console.error('❌ /api/update POST error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
