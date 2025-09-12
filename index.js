// line_bot/index.js

const express    = require('express');
const path       = require('path');
const bodyParser = require('body-parser');
const { updateStatus } = require('./polling/scheduler');

const statusRouter = require('./api/status');
const updateRouter = require('./api/update');

const app = express();
app.use(bodyParser.json());

// API ルート
app.use('/api/status', statusRouter);
app.use('/api/update', updateRouter);

// フロントエンド静的配信
app.use(express.static(path.join(__dirname, '../mon_register/dist')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../mon_register/dist/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Listening on port ${PORT}`);

  // 起動直後に一度だけ更新
  try {
    const interval = await updateStatus();
    console.log(`Initial update done. Next in ${interval}ms.`);
    // 以後は設定に従って定期実行
    setInterval(
      () => updateStatus().catch(err => console.error('Scheduled update failed:', err)),
      interval
    );
  } catch (err) {
    console.error('Initial update failed:', err);
  }
});
