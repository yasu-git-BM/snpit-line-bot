// bot.js
const { Client } = require('@line/bot-sdk');
const express = require('express');
const { getGistJson } = require('./gistClient');
const { buildFlexMessage } = require('./utils/flexBuilder');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new Client(config);
const app = express();
app.use(express.json());

// 🔹 LINE webhook受信
app.post('/webhook', async (req, res) => {
  const events = req.body.events;
  const results = await Promise.all(events.map(handleEvent));
  res.status(200).json(results);
});

// 🔹 イベント処理
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const text = event.message.text.trim();

  // 🔸 トリガー判定（例: 「カメラ」含む）
  if (!text.includes('カメラ')) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '「カメラ」と送ると撮影可能枚数を表示します📸'
    });
  }

  try {
    const wallets = await getGistJson();

    // 🔸 wallet address順に並べる（GUIとBotで共有）
    const walletOrder = wallets.map(w => w['wallet address']);
    const statusData = {};

    for (const wallet of wallets) {
      if (!Array.isArray(wallet.nfts)) continue;

      for (const nft of wallet.nfts) {
        statusData[wallet['wallet address']] = {
          name: nft.name || `Camera #${nft.tokenId}`,
          image: nft.image || '',
          remainingShots: nft.lastTotalShots ?? 0
        };
      }
    }

    const flex = buildFlexMessage(statusData, walletOrder);
    return client.replyMessage(event.replyToken, flex);
  } catch (err) {
    console.error('❌ LINE Bot error:', err);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'エラーが発生しました。後でもう一度お試しください。'
    });
  }
}

// 🔹 Bot専用ポートで起動（任意）
const PORT = process.env.BOT_PORT || 3001;
app.listen(PORT, () => {
  console.log(`🤖 LINE Bot running on port ${PORT}`);
});
