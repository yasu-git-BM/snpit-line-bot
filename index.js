// index.js
const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { buildFlexMessage } = require('./utils/flexBuilder');
const statusRouter = require('./api/status');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);
const app = express();

// JSONボディをパース（GUI向けAPIで必要）
app.use(express.json());

// GUI向けAPIエンドポイントをマウント
app.use('/api', statusRouter);

// LINE Webhookエンドポイント
app.post('/webhook', middleware(config), async (req, res) => {
  const events = req.body.events || [];

  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const msg = event.message.text.trim().toLowerCase();

      if (msg === 'status') {
        try {
          // 状態ファイルの読み込み
          const statusPath = path.join(__dirname, 'data/camera-status.json');
          const orderPath = path.join(__dirname, 'data/wallet-order.json');
          const statusData = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
          const walletOrder = JSON.parse(fs.readFileSync(orderPath, 'utf8'));

          // Flex Message生成＆返信
          const flexMessage = buildFlexMessage(statusData, walletOrder);
          await client.replyMessage(event.replyToken, flexMessage);
        } catch (err) {
          console.error('ステータス取得エラー:', err);
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: 'ステータス取得に失敗しました。',
          });
        }
      } else {
        // それ以外のテキストはエコー返信
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: `受信: ${msg}`,
        });
      }
    }
  }

  res.sendStatus(200);
});

// サーバ起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LINE Bot running on port ${PORT}`);
});
