// line_bot/index.js
const express    = require('express');
const path       = require('path');
const bodyParser = require('body-parser');

const statusRouter = require('./api/status');
const updateRouter = require('./api/update');
const { updateStatus } = require('./polling/scheduler');

const app = express();
app.use(bodyParser.json());

// API ルート
app.use('/api/status', statusRouter);
app.use('/api/update', updateRouter);

// フロントエンドのビルド成果物を静的配信
app.use(express.static(path.join(__dirname, '../mon_register/dist')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../mon_register/dist/index.html'));
});

// サーバー起動と初回＋定期更新スケジュール
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);

  // 起動直後の1回目実行
  updateStatus().catch(err => console.error('Initial update failed:', err));

  // 以降は config に従って定期実行
  const { pollingIntervalMs } = require('./polling/scheduler').updateStatus();
  setInterval(
    () => updateStatus().catch(err => console.error('Scheduled update failed:', err)),
    pollingIntervalMs
  );
});
