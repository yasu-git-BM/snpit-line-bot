const axios = require('axios');

const BIN_URL = process.env.JSON_BIN_STATUS_URL;
const API_KEY = process.env.JSONBIN_API_KEY;

// 🔹 保存処理（変更なし）
async function saveToJsonBin(data) {
  if (!BIN_URL || !API_KEY) {
    throw new Error('JSONBinの環境変数が未設定です');
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-Access-Key': API_KEY,
    'X-Bin-Private': true
  };

  const res = await axios.put(BIN_URL, data, { headers });
  return res.data;
}

// 🔹 取得処理（ログ追加済み）
async function getFromJsonBin() {
  if (!BIN_URL || !API_KEY) {
    console.error('❌ JSONBinの環境変数が未設定です');
    throw new Error('JSONBinの環境変数が未設定です');
  }

  const headers = {
    'X-Access-Key': API_KEY
  };

  try {
    const res = await axios.get(BIN_URL, { headers });
    console.log('✅ JSONBin GET response:', JSON.stringify(res.data, null, 2));

    // 🔍 レスポンス構造に応じて返却
    if (res.data?.record) {
      return res.data.record;
    } else {
      console.warn('⚠️ JSONBinレスポンスに record が存在しません。res.data をそのまま返します');
      return res.data;
    }
  } catch (err) {
    const errorData = err.response?.data || err.message;
    console.error('❌ JSONBin GET error:', errorData);
    throw new Error('Status取得失敗: ' + errorData);
  }
}

module.exports = { saveToJsonBin, getFromJsonBin };
