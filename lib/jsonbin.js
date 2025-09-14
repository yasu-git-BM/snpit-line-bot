const axios = require('axios');

const BIN_URL = process.env.JSON_BIN_STATUS_URL;
const API_KEY = process.env.JSONBIN_API_KEY;

async function saveToJsonBin(data) {
  if (!BIN_URL || !API_KEY) {
    throw new Error('JSONBin‚ÌŠÂ‹«•Ï”‚ª–¢İ’è‚Å‚·');
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-Access-Key': API_KEY,
    'X-Bin-Private': true
  };

  const res = await axios.put(BIN_URL, data, { headers });
  return res.data;
}

module.exports = { saveToJsonBin };
