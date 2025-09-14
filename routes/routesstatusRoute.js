const express = require('express');
const router = express.Router();
const { saveToJsonBin } = require('../lib/jsonbin');
const { normalizeWallets } = require('../lib/normalize');
const { StatusSchema } = require('../lib/schema');

router.post('/', async (req, res) => {
  try {
    const incoming = req.body;

    // 🔍 スキーマ検証
    const parsed = StatusSchema.safeParse(incoming);
    if (!parsed.success) {
      console.warn('⚠️ JSON schema validation failed:', parsed.error);
      return res.status(400).json({ error: 'JSONフォーマットが不正です' });
    }

    // 🧼 補正・整列
    const normalized = normalizeWallets(parsed.data.wallets);

    // 💾 保存
    await saveToJsonBin({ wallets: normalized });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ bot updateStatus error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
