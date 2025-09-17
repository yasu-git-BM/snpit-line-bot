console.log('[scheduler] 起動しました');
require('dotenv').config();

const { fetchMetadata, fetchOwner } = require('../utils/nftReader');
const { getGistJson, updateGistJson } = require('../gistClient');
const { normalizeWallets } = require('../lib/normalize');
const { buildFlexMessage } = require('../utils/flexBuilder');
const { Client } = require('@line/bot-sdk');

const POLLING_INTERVAL_MS = Number(process.env.POLLING_INTERVAL_MS) || 600000;

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
});

const lastNotified = {
  morning: null,
  afternoon: null,
  night: null
};

function getTimeSlot(now = new Date()) {
  const hour = now.getHours();
  if (hour >= 23) return 'night';
  if (hour >= 17) return 'afternoon';
  if (hour >= 11) return 'morning';
  return null;
}

async function updateStatus() {
  console.log(`[scheduler] ポーリング開始: ${new Date().toISOString()}`);

  try {
    const statusData = await getGistJson();
    const wallets = normalizeWallets(statusData?.wallets ?? []);

    console.log('[debug] statusData:', JSON.stringify(statusData, null, 2));
    console.log('[debug] normalized wallets:', JSON.stringify(wallets, null, 2));

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

    await updateGistJson({ wallets });

    if (updated) {
      console.log('💾 Gistに更新を反映しました');

      const now = new Date();
      const slot = getTimeSlot(now);
      if (slot && (!lastNotified[slot] || now - lastNotified[slot] > 1000 * 60 * 60)) {
        const hasShots = wallets.some(w =>
          Array.isArray(w.nfts) &&
          w.nfts.some(nft => (nft.lastTotalShots ?? 0) > 0)
        );

        if (hasShots) {
          const walletOrder = wallets.map(w => w['wallet address']);
          const statusPayload = {};

          for (const wallet of wallets) {
            if (!Array.isArray(wallet.nfts)) continue;

            for (const nft of wallet.nfts) {
              statusPayload[wallet['wallet address']] = {
                name: nft.name || `Camera #${nft.tokenId}`,
                image: nft.image || '',
                remainingShots: nft.lastTotalShots ?? 0,
                maxShots: wallet.maxShots ?? 16
              };
            }
          }

          const flex = buildFlexMessage(statusPayload, walletOrder);
          await client.pushMessage(process.env.LINE_USER_ID, flex);
          lastNotified[slot] = now;
          console.log(`📨 通知送信済み（${slot}）`);
        } else {
          console.log('🔕 通知スキップ（全ウォレット残枚数ゼロ）');
        }
      }
    } else {
      console.log('ℹ️ 更新は不要でした');
    }
  } catch (err) {
    console.error('⛔️ ポーリング中に例外:', err);
  }

  return POLLING_INTERVAL_MS;
}

// ポーリング起動（requireされた場合でも動く）
(async () => {
  try {
    const interval = await updateStatus();
    setInterval(() => {
      updateStatus().catch(err => console.error('⛔️ ポーリング失敗:', err));
    }, interval);
  } catch (err) {
    console.error('⛔️ 初回ポーリング失敗:', err);
  }
})();

module.exports = { updateStatus };
