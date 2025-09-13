// line_bot/index.js
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fetch   = require('node-fetch'); // ①あなたの環境は node-fetch@2 を追加済み

const app = express();

// ===== CORS設定 =====
const FRONTEND_URL = process.env.FRONTEND_URL;
if (!FRONTEND_URL) {
  console.error('❗ FRONTEND_URL が未設定です');
  process.exit(1);
}
console.log('🔧 FRONTEND_URL =', FRONTEND_URL);

app.use(cors({
  origin: FRONTEND_URL,
  methods: ['GET', 'POST'],
  optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== JSONBin設定 =====
const BIN_ID  = process.env.JSON_BIN_ID;
const API_KEY = process.env.JSON_BIN_KEY;
if (!BIN_ID || !API_KEY) {
  console.error('❗ JSON_BIN_ID または JSON_BIN_KEY が未設定です');
  process.exit(1);
}
const BIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

// ===== ポーリング間隔設定 =====
const POLLING_INTERVAL_MS = parseInt(process.env.POLLING_INTERVAL_MS, 10) || 60000;
console.log(`⏱ ポーリング間隔: ${POLLING_INTERVAL_MS} ms`);

// ===== GET /api/config =====
app.get('/api/config', (req, res) => {
  res.json({
    pollingIntervalMs: POLLING_INTERVAL_MS
  });
});

// ===== POST /api/status =====
// JSONBin 上の最新レコードを返却。レコードをそのまま返す（record 部分）。
app.post('/api/status', async (req, res) => {
  try {
    const r = await fetch(`${BIN_URL}/latest`, {
      method: 'GET',
      headers: { 'X-Master-Key': API_KEY }
    });
    if (!r.ok) throw new Error(`JSONBin GET failed: ${r.status}`);
    const json = await r.json();

    console.log('📥 /api/status JSONBin record:', JSON.stringify(json.record, null, 2));

    // 返却は record をそのまま（{ wallets: [...] } を想定）
    return res.json(json.record || {});
  } catch (err) {
    console.error('🔥 Error fetching status from JSONBin:', err);
    return res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// ===== POST /api/update/status =====
// 受け取ったJSONを保存前にキー名を正規化（tokenid/contract → tokenId）して PUT 上書き。
app.post('/api/update/status', async (req, res) => {
  try {
    console.log('📤 /api/update/status received body:', JSON.stringify(req.body, null, 2));

    const newData = req.body || {};

    // --- NFTキー名統一処理（tokenid, contract → tokenId に統一） ---
    if (Array.isArray(newData.wallets)) {
      newData.wallets.forEach(wallet => {
        if (Array.isArray(wallet.nfts)) {
          wallet.nfts = wallet.nfts.map(nft => {
            if (nft && typeof nft === 'object') {
              if (nft.tokenid && !nft.tokenId) {
                nft.tokenId = nft.tokenid;
              }
              if (nft.contract && !nft.tokenId) {
                nft.tokenId = nft.contract;
              }
              delete nft.tokenid;
              delete nft.contract;
            }
            return nft;
          });
        } else if (wallet && typeof wallet === 'object') {
          // nfts が未定義なら空配列に
          wallet.nfts = [];
        }
      });
    } else {
      // wallets が未定義なら空配列に
      newData.wallets = [];
    }

    const r = await fetch(BIN_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': API_KEY
      },
      body: JSON.stringify(newData)
    });
    if (!r.ok) throw new Error(`JSONBin PUT failed: ${r.status}`);
    const json = await r.json();

    console.log('✅ JSONBin updated record:', JSON.stringify(json.record, null, 2));

    return res.json(json.record || {});
  } catch (err) {
    console.error('🔥 Error updating status to JSONBin:', err);
    return res.status(500).json({ error: 'Failed to update status' });
  }
});

// ===== サーバ起動 =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
