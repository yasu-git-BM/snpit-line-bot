const fs = require('fs');
const path = require('path');
const { fetchMetadata, fetchOwner } = require('../utils/nftReader');

const botConfigPath = path.join(__dirname, '../data/bot-config.json');
const statusPath = path.join(__dirname, '../data/camera-status.json');

const botConfig = JSON.parse(fs.readFileSync(botConfigPath, 'utf8'));
const { pollingIntervalMs, tokenIds } = botConfig;

const updateStatus = async () => {
  const statusData = {};

  for (const tokenId of tokenIds) {
    const owner = await fetchOwner(tokenId);
    const metadata = await fetchMetadata(tokenId);

    if (owner && metadata) {
      statusData[owner] = {
        name: metadata.name || `Camera #${tokenId}`,
        image: metadata.image || '',
        remainingShots:
          metadata.attributes?.find(attr => attr.trait_type === 'Remaining Shots')?.value || 0
      };
    }
  }

  fs.writeFileSync(statusPath, JSON.stringify(statusData, null, 2));
  console.log('camera-status.json XVŠ®—¹');
};

setInterval(updateStatus, pollingIntervalMs);
updateStatus();
