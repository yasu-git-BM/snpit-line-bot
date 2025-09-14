const express = require('express');
const router = express.Router();
const { saveToJsonBin, getFromJsonBin } = require('../lib/jsonbin');
const { normalizeWallets } = require('../lib/normalize');
const { StatusSchema } = require('../lib/schema');

// 🔹 GET /api/status → JSONBinから取得して返す
router.get('/', async (req, res) => {
  try {
    const data = await getFromJsonBin();
    res.status(200).json(data);
  } catch (err) {
    console.error('❌ bot fetchStatus error:', err);
    res.status(500).json({ error: 'Status取得失敗' });
  }
});

// 🔹 POST /api/status → schema検証 → 補正 → 保存
router.post('/', async (req, res) => {
  try {
    const incoming = req.body;

    const parsed = StatusSchema.safeParse(incoming);
    if (!parsed.success) {
      console.warn('⚠️ JSON schema validation failed:', parsed.error);
      return res.status(400).json({ error: 'JSONフォーマットが不正です' });
    }

    const normalized = normalizeWallets(parsed.data.wallets);
    await saveToJsonBin({ wallets: normalized });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ bot updateStatus error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;