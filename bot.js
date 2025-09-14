// bot.js
require('dotenv').config(); // ← .env から FRONTEND_URL を読み込む

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
  // 🔸 Postback対応（ボタン操作）
  if (event.type === 'postback') {
    const data = event.postback.data;

    if (data === 'action=fetchStatus') {
      try {
        const wallets = await getGistJson();
        const walletOrder = wallets.map(w => w['wallet address']);
        const statusData = {};

        for (const wallet of wallets) {
          if (!Array.isArray(wallet.nfts)) continue;

          for (const nft of wallet.nfts) {
            statusData[wallet['wallet address']] = {
              name: nft.name || `Camera #${nft.tokenId}`,
              image: nft.image || '',
              remainingShots: nft.lastTotalShots ?? 0,
              maxShots: wallet.maxShots ?? 16 // ← 追加
            };
          }
        }

        const flex = buildFlexMessage(statusData, walletOrder);
        return client.replyMessage(event.replyToken, flex);
      } catch (err) {
        console.error('❌ fetchStatus error:', err);
        return client.replyMessage(event.replyToken, {
          type: 'text',
          text: '最新情報の取得に失敗しました。'
        });
      }
    }

    if (data === 'action=showGUI') {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `設定画面はこちらです：\n${process.env.FRONTEND_URL}`
      });
    }

    return null;
  }

  // 🔸 通常のテキストメッセージ対応
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const text = event.message.text.trim();

  if (!text.includes('カメラ')) {
    return client.replyMessage(event.replyToken, {
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

  // 🔸 「カメラ」メッセージ → ステータス表示
  try {
    const wallets = await getGistJson();
    const walletOrder = wallets.map(w => w['wallet address']);
    const statusData = {};

    for (const wallet of wallets) {
      if (!Array.isArray(wallet.nfts)) continue;

      for (const nft of wallet.nfts) {
        statusData[wallet['wallet address']] = {
          name: nft.name || `Camera #${nft.tokenId}`,
          image: nft.image || '',
          remainingShots: nft.lastTotalShots ?? 0,
          maxShots: wallet.maxShots ?? 16 // ← 追加
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

// 🔹 Bot専用ポートで起動
const PORT = process.env.BOT_PORT || 3001;
app.listen(PORT, () => {
  console.log(`🤖 LINE Bot running on port ${PORT}`);
});
