const express = require('express');
const router = express.Router();

const POLLING_INTERVAL_MS = Number.parseInt(process.env.POLLING_INTERVAL_MS, 10);

if (!Number.isFinite(POLLING_INTERVAL_MS) || POLLING_INTERVAL_MS <= 0) {
  throw new Error('POLLING_INTERVAL_MS が未設定または不正です（正の整数のミリ秒で指定してください）');
}

router.get('/', (req, res) => {
  res.json({
    pollInterval: POLLING_INTERVAL_MS
  });
});

module.exports = router;
