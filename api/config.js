const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();

const WALLET_ORDER_URL = process.env.JSON_BIN_WALLET_ORDER_URL;
const JSON_BIN_API_KEY = process.env.JSON_BIN_API_KEY;
const POLLING_INTERVAL_MS = Number.parseInt(process.env.POLLING_INTERVAL_MS, 10);

if (!WALLET_ORDER_URL || !/^https?:\/\//.test(WALLET_ORDER_URL)) {
  throw new Error('環境変数 JSON_BIN_WALLET_ORDER_URL が未設定、または絶対URLではありません');
}
if (!JSON_BIN_API_KEY) {
  throw new Error('環境変数 JSON_BIN_API_KEY が未設定です');
}
if (!Number.isFinite(POLLING_INTERVAL_MS) || POLLING_INTERVAL_MS <= 0) {
  throw new Error('POLLING_INTERVAL_MS が未設定または不正です（正の整数のミリ秒で指定してください）');
}

async function fetchWalletOrder() {
  const res = await fetch(`${WALLET_ORDER_URL}/latest`, {
    method: 'GET',
    headers: { 'X-Master-Key': JSON_BIN_API_KEY }
  });
  if (!res.ok) throw new Error(`JSONBin GET失敗: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.record.sort((a, b) => a.name.localeCompare(b.name));
}

router.get('/', async (req, res) => {
  try {
    const wallets = await fetchWalletOrder();
    res.json({
      pollInterval: POLLING_INTERVAL_MS,
      wallets
    });
  } catch (err) {
    console.error('❌ /api/config GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
