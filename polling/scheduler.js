const { fetchMetadata, fetchOwner } = require('../utils/nftReader');
const { getGistJson, updateGistJson } = require('../gistClient');
const { normalizeWallets } = require('../lib/normalize');

const POLLING_INTERVAL_MS = Number(process.env.POLLING_INTERVAL_MS) || 600000;

async function updateStatus() {
  const statusData = await getGistJson();
  const wallets = normalizeWallets(statusData.wallets || []);

  let updated = false;

  for (const wallet of wallets) {
    if (!Array.isArray(wallet.nfts)) continue;

    for (const nft of wallet.nfts) {
      const tokenId = nft.tokenId;
      try {
        const owner = await fetchOwner(tokenId);
        const md = await fetchMetadata(tokenId);

        if (owner && md) {
          nft.lastTotalShots = md.attributes?.find(a => a.trait_type === 'Total Shots')?.value || 0;
          wallet['wallet address'] = owner;
          wallet.lastChecked = new Date().toISOString();
          updated = true;

          console.log(`📸 更新: wallet=${wallet['wallet name']}, tokenId=${tokenId}, owner=${owner}`);
        }
      } catch (err) {
        console.warn(`⚠️ tokenId=${tokenId} の取得に失敗: ${err.message}`);
        wallet.lastChecked = new Date().toISOString();
      }
    }
  }

  if (updated) {
    await updateGistJson({ wallets });
    console.log('💾 Gistに更新を反映しました');
  } else {
    console.log('ℹ️ 更新は不要でした');
  }

  return POLLING_INTERVAL_MS;
}

if (require.main === module) {
  (async () => {
    const interval = await updateStatus();
    setInterval(updateStatus, interval);
  })();
}

module.exports = { updateStatus };
