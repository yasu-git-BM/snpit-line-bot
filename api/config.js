// api/config.js
const fetch = require('node-fetch');

const WALLET_ORDER_URL = process.env.JSON_BIN_WALLET_ORDER_URL; // BIN for wallet list
const JSON_BIN_API_KEY = process.env.JSON_BIN_API_KEY;          // Master Key

// 正: POLLING_INTERVAL_MS（ms指定）
const POLLING_INTERVAL_MS = Number.parseInt(process.env.POLLING_INTERVAL_MS, 10);

// バリデーション（不正/未設定時は明示エラー）
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
  // 名前順にソート
  return data.record.sort((a, b) => a.name.localeCompare(b.name));
}

async function getConfig() {
  const wallets = await fetchWalletOrder();
  return {
    pollInterval: POLLING_INTERVAL_MS,
    wallets
  };
}

module.exports = { getConfig };
