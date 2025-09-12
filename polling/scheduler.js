const fs   = require('fs');
const path = require('path');
const { fetchMetadata, fetchOwner } = require('../utils/nftReader');

const cfgPath    = path.join(__dirname, '../data/bot-config.json');
const statusPath = path.join(__dirname, '../data/camera-status.json');

function loadConfig() {
  return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
}

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
            md.attributes?.find(a => a.trait_type === 'Remaining Shots')?.value || 0
        };
      }
    } catch (err) {
      console.error(`Error fetching token ${id}:`, err.message);
    }
  }

  fs.writeFileSync(statusPath, JSON.stringify(out, null, 2), 'utf8');
  console.log('📄 camera-status.json updated');
  return loadConfig().pollingIntervalMs;
}

if (require.main === module) {
  (async () => {
    const interval = await updateStatus();
    setInterval(updateStatus, interval);
  })();
}

module.exports = { updateStatus };
