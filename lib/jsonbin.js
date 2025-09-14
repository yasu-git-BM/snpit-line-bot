const axios = require('axios');
const https = require('https');

// ✅ TLS検証を緩和（Render環境での証明書問題対策）
const agent = new https.Agent({
  rejectUnauthorized: false
});

// ✅ 正しい環境変数名
const BIN_URL = process.env.JSON_BIN_STATUS_URL;
const API_KEY = process.env.JSON_BIN_API_KEY;

// 🔹 保存処理（PUT）
async function saveToJsonBin(data) {
  if (!BIN_URL || !API_KEY) {
    throw new Error('JSONBinの環境変数が未設定です');
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-Access-Key': API_KEY,
    'User-Agent': 'curl/7.79.1'
  };

  try {
    const res = await axios.put(BIN_URL, data, {
      headers,
      httpsAgent: agent
    });
    return res.data;
  } catch (err) {
    const errorData = err.response?.data || err.message;
    console.error('❌ JSONBin PUT error:', JSON.stringify(errorData, null, 2));
    throw new Error('Status保存失敗: ' + JSON.stringify(errorData));
  }
}

// 🔹 取得処理（GET）
async function getFromJsonBin() {
  if (!BIN_URL || !API_KEY) {
    console.error('❌ JSONBinの環境変数が未設定です');
    throw new Error('JSONBinの環境変数が未設定です');
  }

  const headers = {
    'X-Access-Key': API_KEY,
    'User-Agent': 'curl/7.79.1',
    'Accept': 'application/json'
  };

  console.log('📤 axios GET url:', BIN_URL);
  console.log('📤 axios GET headers:', headers);

  try {
    const res = await axios.get(BIN_URL, {
      headers,
      httpsAgent: agent
    });

    console.log('✅ JSONBin GET response:', JSON.stringify(res.data, null, 2));

    if (res.data?.record) {
      return res.data.record;
    } else {
      console.warn('⚠️ JSONBinレスポンスに record が存在しません。res.data をそのまま返します');
      return res.data;
    }
  } catch (err) {
    const errorData = err.response?.data || err.message;
    console.error('❌ JSONBin GET error:', JSON.stringify(errorData, null, 2));
    throw new Error('Status取得失敗: ' + JSON.stringify(errorData));
  }
}

module.exports = { saveToJsonBin, getFromJsonBin };
