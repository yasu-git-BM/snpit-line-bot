console.log('🟢 index.js is running');
console.log('🔐 LINE_CHANNEL_SECRET:', process.env.LINE_CHANNEL_SECRET);
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const fetch = require('node-fetch');
const { Client, middleware } = require('@line/bot-sdk');
const { updateWalletsData } = require('./api/status');
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
      try {
        const statusData = await getGistJson();
        const updated = await updateWalletsData(statusData, { ignoreManual: true });

        if (updated) {
          await updateGistJson(statusData);
          console.log('💾 Gistに更新を反映しました');
        } else {
          console.log('ℹ️ 更新は不要でした');
        }

        const message = buildStatusMessage(statusData.wallets);
        return lineClient.replyMessage(event.replyToken, message);
      } catch (err) {
        console.error('❌ fetchStatus error:', err);
        return lineClient.replyMessage(event.replyToken, {
          type: 'text',
          text: '最新情報の取得に失敗しました。'
        });
      }
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

  const statusData = await getGistJson();
  console.log(`[LINE] updateWalletsData START`);
  const updated = await updateWalletsData(statusData, { ignoreManual: true });
  console.log(`[LINE] updateWalletsData END`);

  if (updated) {
    await updateGistJson(statusData);
    console.log('💾 Gistに更新を反映しました');
  } else {
    console.log('ℹ️ 更新は不要でした');
  }

  try {
    if (!text.includes('カメラ')) {
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
    }

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

// ===== サーバ起動 =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// ===== ポーリング処理起動 =====
require('./polling/scheduler');
