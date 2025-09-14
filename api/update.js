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
  const res = await fetch(`${JSON_BIN_STATUS_URL}/latest`, {
    method: 'GET',
    headers: { 'X-Master-Key': JSON_BIN_API_KEY }
  });
  if (!res.ok) throw new Error(`JSONBin GET失敗: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.record;
}

async function updateCameraStatus(newStatus) {
  const res = await fetch(JSON_BIN_STATUS_URL, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': JSON_BIN_API_KEY
    },
    body: JSON.stringify(newStatus)
  });
  if (!res.ok) throw new Error(`JSONBin PUT失敗: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.record;
}

router.get('/', async (req, res) => {
  try {
    const status = await getCameraStatus();
    res.json(status);
  } catch (err) {
    console.error('❌ /api/update GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const updated = await updateCameraStatus(req.body);
    res.json(updated);
  } catch (err) {
    console.error('❌ /api/update POST error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
