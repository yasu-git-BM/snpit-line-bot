console.log('🟢 index.js is running');
console.log('🔐 LINE_CHANNEL_SECRET:', process.env.LINE_CHANNEL_SECRET);
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const fetch = require('node-fetch');
const { Client, middleware } = require('@line/bot-sdk');
const { updateWalletsData, sortWallets } = require('./api/status');
const { getGistJson, updateGistJson } = require('./gistClient');
const { buildStatusMessage } = require('./utils/messageBuilder');


const app = express();
app.use(express.json());

// ===== CORS設定 =====
const FRONTEND_URL = process.env.FRONTEND_URL;
app.use(cors({
  origin: FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ===== UptimeRobot用 keep-alive =====
app.get('/', (req, res) => {
  res.status(200).send('✅ snpit-line-bot is running');
});

app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});


// ===== GUI用 config.jsonルート =====
app.get('/config.json', (req, res) => {
  res.json({
    apiVersion: '1.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// ===== GistベースAPIルート =====
const { router: statusRouter } = require('./api/status');
app.use('/api/status', statusRouter);
app.use('/api/config', require('./api/config'));
app.use('/api/update', require('./api/update'));

// ===== NFT情報取得API（個別tokenId） =====
const RPC_URL = process.env.RPC_URL;
const CAMERA_CONTRACT_ADDRESS = process.env.CAMERA_CONTRACT_ADDRESS;

const ABI = [
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)'
];

app.get('/api/nft-info/:tokenId', async (req, res) => {
  const tokenId = req.params.tokenId;
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CAMERA_CONTRACT_ADDRESS, ABI, provider);

    const owner = await contract.ownerOf(tokenId);
    let uri = await contract.tokenURI(tokenId);
    if (uri.startsWith('ipfs://')) {
      uri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }

    const response = await fetch(uri);
    if (!response.ok) throw new Error(`メタデータ取得失敗: ${response.status}`);
    const metadata = await response.json();

    const totalShots = metadata.attributes?.find(
      attr => attr.trait_type === 'Total Shots'
    )?.value ?? 0;

    res.json({ owner, totalShots });
  } catch (err) {
    console.error('❌ /api/nft-info error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== LINE Bot設定 =====
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const lineClient = new Client(lineConfig);

// ===== LINE Webhook受信ルート =====
app.post('/webhook', (req, res, next) => {
  const signature = req.headers['x-line-signature'];
  const body = JSON.stringify(req.body);

  console.log('🧾 Signature header:', signature);
  console.log('📦 Raw body:', body);

  if (!signature || signature.length < 10) {
    console.log('⚠️ Webhook test request detected, skipping signature validation');
    return res.status(200).send('OK');
  }

  middleware(lineConfig)(req, res, async () => {
    console.log('✅ Webhook received:', JSON.stringify(req.body, null, 2));
    const events = req.body.events;
    const results = await Promise.all(events.map(handleEvent));
    res.status(200).json(results);
  });
});

// ===== LINEイベント処理 =====
async function handleEvent(event) {
  console.log('📩 Event received:', JSON.stringify(event, null, 2));
  console.log(`📩 event.type:${event.type}`);

  if (event.type === 'postback') {
    const data = event.postback.data;
    console.log('🔸 Postback:', data);

    if (data === 'action=fetchStatus') {
      console.log('🔹 fetchStatus triggered');
      return null; // ✅ replyTokenは1回しか使えない
    }


    if (data === 'action=showGUI') {
      console.log('🔹 showGUI triggered');
      return lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: `設定画面はこちらです：\n${process.env.FRONTEND_URL}`
      });
    }

    return null;
  }

  if (event.type !== 'message' || event.message.type !== 'text') {
    console.log('⚠️ Unsupported event type:', event.type);
    return null;
  }

  const text = event.message.text.trim();
  console.log('💬 Text message:', text);

  // LINEからのオンデマンドリクエスト
  if (text.includes('Reflesh!!')) {
    try {
      // ✅ 1段階目：即レス
      await lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: '最新情報取得中…'
      });
      console.log('📨 即レス送信済み（最新情報取得中…）');

      // ✅ 2段階目：後追い通知（push）
      const statusData = await getGistJson();
      
      console.log(`[LINE] updateWalletsData START`);
      const updated = await updateWalletsData(statusData, { ignoreManual: true, skipOwner: true });
      console.log(`[LINE] updateWalletsData END`);

      if (updated) {
        await updateGistJson(statusData);
        console.log('💾 Gistに更新を反映しました');
      }

      const message = buildStatusMessage(statusData.wallets);
      await lineClient.pushMessage(event.source.userId, message);
    } catch (err) {
      console.error('❌ fetchStatus error:', err);
      await lineClient.pushMessage(event.source.userId, {
        type: 'text',
        text: '最新情報の取得に失敗しました。'
      });
    }
  }
  else {
    try {
      console.log('🔸 Sending menu template');
      return lineClient.replyMessage(event.replyToken, {
        type: 'template',
        altText: '操作メニュー',
        template: {
          type: 'buttons',
          title: '操作メニュー',
          text: '以下から選択してください',
          actions: [
            {
              type: 'postback',
              label: '最新情報取得',
              data: 'action=fetchStatus'
            },
            {
              type: 'postback',
              label: '設定画面表示',
              data: 'action=showGUI'
            }
          ]
        }
      });
      console.log('🔸 Sending camera status');
      const message = buildStatusMessage(statusData.wallets);
      return lineClient.replyMessage(event.replyToken, message);
    } catch (err) {
      console.error('❌ LINE Bot error:', err);
      return lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: 'エラーが発生しました。後でもう一度お試しください。'
      });
    }
  }
}

function formatJST(date) {
  const days = ["日", "月", "火", "水", "木", "金", "土"];

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");

  const weekday = days[date.getDay()];

  // 曜日付きにしたいならこれを返す
  return `${y}/${m}/${d}(${weekday}) ${hh}:${mm}:${ss}`;

  // 曜日いらないならこっち
  // return `${y}/${m}/${d} ${hh}:${mm}:${ss}`;
}


// ===== 撮影枚数クリアAPI（全ウォレットサマリHTML版） =====
app.get('/clear', async (req, res) => {
  const { wallet } = req.query;

  if (!wallet) {
    return res.status(400).send("wallet missing");
  }

  try {
    const config = await getGistJson();

    const target = config.wallets.find(
      w => w["wallet address"].toLowerCase() === wallet.toLowerCase()
    );

    if (!target) {
      return res.status(404).send("wallet not found");
    }

    // 撮影可能枚数を0に
    target.enableShots = 0;

    // JSTの現在時刻を生成
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    
    // 表示用にフォーマット
    const jstString = formatJST(jst);

    // 保存用は ISO +09:00 のままでもOK
    target.lastChecked = jst.toISOString().replace("Z", "+09:00");
    await updateGistJson(config);

    // ★ LINE と同じサマリテキストを生成
    sortWallets(config.wallets);
    const summary = buildStatusMessage(config.wallets).text;

    // HTML
    const html = `
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>撮影枚数クリア</title>
        <style>
          body {
            background: #f5f5f5;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 0 20px 20px 20px;  /* ← 上だけ 0 に変更 */
            font-size: 18px;
            line-height: 1.6;   /* ← 少し詰める */
          }
          .card {
            white-space: pre-wrap;
          }
          .title {
            font-size: 22px;
            font-weight: bold;
            color: #2c7be5;
            margin-bottom: 4px;   /* ← 10px → 4px に縮小 */
          }
          .time {
            font-size: 16px;
            color: #555;
            margin-bottom: 8px;   /* ← 15px → 8px に縮小 */
          }
          pre {
            font-size: 18px;
            line-height: 1.6;
            margin: 4px 0 0 0;    /* ← 上の余白を最小限に */
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="title">📸撮影枚数クリア📸 ${jstString}</div>
          <pre>${summary}</pre>
        </div>
      </body>
      </html>
    `;

    return res.send(html);

  } catch (err) {
    console.error("❌ /clear error:", err);
    return res.status(500).send(err.message);
  }
});


// ===== サーバ起動 =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  setInterval(() => {
    fetch(`${process.env.MY_URL}/healthz`)
      .then(res => console.log(`🌀 Self-ping status: ${res.status}`))
      .catch(err => console.warn(`⚠️ Self-ping failed: ${err.message}`));
  }, 5 * 60 * 1000); // 5分ごと
    
});

// ===== ポーリング処理起動 =====
require('./polling/scheduler');
