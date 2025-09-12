// line_bot/polling/scheduler.js
const fs   = require('fs');
const path = require('path');
const { fetchMetadata, fetchOwner } = require('../utils/nftReader');

const cfgPath    = path.join(__dirname, '../data/bot-config.json');
const statusPath = path.join(__dirname, '../data/camera-status.json');

/**
 * 設定ファイルから pollingIntervalMs, tokenIds を読み込む
 */
function loadConfig() {
  const { pollingIntervalMs, tokenIds } = JSON.parse(
    fs.readFileSync(cfgPath, 'utf8')
  );
  return { pollingIntervalMs, tokenIds };
}

/**
 * NFTごとに最新データを取得し JSON ファイルに書き出す
 */
async function updateStatus() {
  const { pollingIntervalMs, tokenIds } = loadConfig();
  const out = {};

  for (const id of tokenIds) {
    try {
      const owner = await fetchOwner(id);
      const md    = await fetchMetadata(id);
      if (owner && md) {
        out[owner] = {
          name: md.name || `Camera #${id}`,
          image: md.image || '',
          remainingShots:
            md.attributes?.find(a => a.trait_type === 'Remaining Shots')
              ?.value || 0
        };
      }
    } catch (err) {
      console.error(`Error fetching token ${id}:`, err.message);
    }
  }

  fs.writeFileSync(statusPath, JSON.stringify(out, null, 2), 'utf8');
  console.log('📄 camera-status.json updated');
  return { pollingIntervalMs };
}

module.exports = { updateStatus };
