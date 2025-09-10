const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');

const config = {
  channelAccessToken: 'djlrK2feA+MepTYdJQdpcc/nRDsjewPulSoSHVoUij7bUQhZH+h+empThY5z5SMe1j1fM6HAbSSBe1D9/pZnh03cV98SecQq/ZsKqgzQR7kA2nyvznSZQabyDesh2j9F15tLNsseRdIOOHvjheFdAAdB04t89/1O/w1cDnyilFU=',
  channelSecret: 'f35e89f12f64ec77d854c0428ff87a6e'
};

const app = express();

// LINEのWebhookイベントを受け取るためのミドルウェア
app.use(middleware(config));

// JSONボディをパースするミドルウェア（これが必要！）
app.use(express.json());

const client = new Client(config); // ← 先に初期化！

// イベント処理関数
function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    // テキストメッセージ以外は無視
    return Promise.resolve(null);
  }

  // 返信メッセージを作成
  const reply = {
    type: 'text',
    text: `📩 メッセージ「${event.message.text}」を受け取りました！`
  };

  // LINEに返信
  return client.replyMessage(event.replyToken, [reply]);
}

app.get("/", (req, res) => {
  res.send("Bot is alive!");
});

// Webhookエンドポイント
app.post('/webhook', (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => {
      console.error(err);
      res.status(500).end();
    });
});


// Render用のポート設定
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`LINE Bot is running on port ${port}`);
});
