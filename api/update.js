// line_bot/api/update.js
const express       = require('express');
const fs            = require('fs');
const path          = require('path');
const { updateStatus } = require('../polling/scheduler');

const router = express.Router();

router.post('/status', async (_req, res) => {
  try {
    await updateStatus();
    const data = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../data/camera-status.json'), 'utf8')
    );
    res.json(data);
  } catch (err) {
    console.error('Cannot update status:', err.message);
    res.status(500).json({ error: 'Cannot update camera status' });
  }
});

router.post('/config', (req, res) => {
  try {
    const base = path.join(__dirname, '../data');
    fs.writeFileSync(
      path.join(base, 'bot-config.json'),
      JSON.stringify(req.body, null, 2),
      'utf8'
    );
    if (req.body.walletOrder) {
      fs.writeFileSync(
        path.join(base, 'wallet-order.json'),
        JSON.stringify(req.body.walletOrder, null, 2),
        'utf8'
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Cannot write config:', err.message);
    res.status(500).json({ error: 'Cannot update config' });
  }
});

module.exports = router;
