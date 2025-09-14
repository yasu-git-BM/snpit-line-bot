const fetch = require('node-fetch');
const { StatusSchema } = require('./lib/schema');
const { normalizeWallets } = require('./lib/normalize');

const GIST_ID = process.env.GIST_ID;
const GIST_JSON_FILE_NAME = process.env.GIST_JSON_FILE_NAME || 'camera-status.json';
const GIST_JSON_TOKEN = process.env.GIST_JSON_TOKEN;

if (!GIST_ID || !GIST_JSON_TOKEN) {
  throw new Error('❌ GIST_ID または GIST_JSON_TOKEN が未設定です');
}

const headers = {
  'Authorization': `Bearer ${GIST_JSON_TOKEN}`,
  'Accept': 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28'
};

// 🔹 GistからJSONデータを取得
async function getGistJson() {
  const url = `https://api.github.com/gists/${GIST_ID}`;
  const res = await fetch(url, { headers });

  if (!res.ok) throw new Error(`Gist取得失敗: ${res.status}`);
  const gist = await res.json();

  const content = gist.files?.[GIST_JSON_FILE_NAME]?.content;
  if (!content) throw new Error(`Gistに ${GIST_JSON_FILE_NAME} が存在しません`);

  console.log(`📦 Gist content raw:\n${content}`);

  let parsed;
  try {
    parsed = JSON.parse(content);
    console.log(`✅ Gist JSON parse成功`);
  } catch (err) {
    console.error(`❌ Gist JSON parse失敗: ${err.message}`);
    throw new Error(`Gist JSON parse失敗: ${err.message}`);
  }

  const result = StatusSchema.safeParse(parsed);
  if (!result.success) {
    console.warn('⚠️ Gist JSON schema validation failed:', result.error);
    throw new Error('Gist JSON schemaが不正です');
  }

  console.log(`✅ schema validation OK`);
  console.log(`🧪 wallets.length = ${result.data.wallets?.length}`);
  console.log(`🧪 wallets sample =`, JSON.stringify(result.data.wallets?.[0], null, 2));

  const normalized = normalizeWallets(result.data.wallets);
  console.log(`📤 normalized wallets sample =`, JSON.stringify(normalized.wallets?.[0], null, 2));

  return normalized; // ✅ { wallets: [...] } を返す
}

// 🔹 GistにJSONデータを更新
async function updateGistJson(data) {
  const result = StatusSchema.safeParse(data);
  if (!result.success) {
    console.warn('⚠️ 更新データのschema validation失敗:', result.error);
    throw new Error('更新データが不正です');
  }

  const url = `https://api.github.com/gists/${GIST_ID}`;
  const body = {
    files: {
      [GIST_JSON_FILE_NAME]: {
        content: JSON.stringify(result.data, null, 2)
      }
    }
  };

  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error(`Gist更新失敗: ${res.status}`);
  console.log(`✅ Gist更新成功: ${GIST_JSON_FILE_NAME}`);
}

module.exports = {
  getGistJson,
  updateGistJson
};
