// api/config.js
const fetch = require('node-fetch');

const WALLET_ORDER_URL = process.env.JSON_BIN_WALLET_ORDER_URL; // BIN for wallet list
const JSON_BIN_API_KEY = process.env.JSON_BIN_API_KEY;          // Master Key

// ��: POLLING_INTERVAL_MS�ims�w��j
const POLLING_INTERVAL_MS = Number.parseInt(process.env.POLLING_INTERVAL_MS, 10);

// �o���f�[�V�����i�s��/���ݒ莞�͖����G���[�j
if (!Number.isFinite(POLLING_INTERVAL_MS) || POLLING_INTERVAL_MS <= 0) {
  throw new Error('POLLING_INTERVAL_MS �����ݒ�܂��͕s���ł��i���̐����̃~���b�Ŏw�肵�Ă��������j');
}

async function fetchWalletOrder() {
  const res = await fetch(`${WALLET_ORDER_URL}/latest`, {
    method: 'GET',
    headers: { 'X-Master-Key': JSON_BIN_API_KEY }
  });
  if (!res.ok) throw new Error(`JSONBin GET���s: ${res.status} ${await res.text()}`);
  const data = await res.json();
  // ���O���Ƀ\�[�g
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
