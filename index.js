require('dotenv').config();

const express    = require('express');
const bodyParser = require('body-parser');
const { updateStatus } = require('./polling/scheduler');
const statusRouter    = require('./api/status');
const updateRouter    = require('./api/update');

const app = express();
app.use(bodyParser.json());

app.use('/api/status', statusRouter);
app.use('/api/update', updateRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Listening on port ${PORT}`);

  try {
    const interval = await updateStatus();
    console.log(`Initial update done. Next in ${interval}ms.`);
    setInterval(
      () => updateStatus().catch(err => console.error('Scheduled update failed:', err)),
      interval
    );
  } catch (err) {
    console.error('Initial update failed:', err);
  }
});
