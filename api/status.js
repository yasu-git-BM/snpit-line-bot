// api/status.js
const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();

const JSON_BIN_URL = process.env.JSON_BIN_URL;       // 例: https://api.jsonbin.io/v3/b/<BIN_ID>
const JSON_BIN_API_KEY = process.env.JSON_BIN_API_KEY; // Master Key

router.get('/', async (req, res) => {
  try {
    console.log('📡 GET /api/status');
    console.log('  JSON_BIN_URL:', JSON_BIN_URL);
    console.log('  JSON_BIN_API_KEY(先頭8文字):', JSON_BIN_API_KEY?.slice(0, 8));

    const response = await fetch(`${JSON_BIN_URL}/latest`, {
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

router.post('/', async (req, res) => {
  try {
    console.log('📡 POST /api/status');
    console.log('  JSON_BIN_URL:', JSON_BIN_URL);
    console.log('  JSON_BIN_API_KEY(先頭8文字):', JSON_BIN_API_KEY?.slice(0, 8));
    console.log('  Request body:', JSON.stringify(req.body));

    const response = await fetch(JSON_BIN_URL, {
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
