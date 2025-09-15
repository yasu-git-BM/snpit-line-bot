const { toNumOrNull } = require('./utils');

/**
 * enableShots を補正する（GUI補正保持 + 時間回復 + NFT消費検知）
 * @param {object} wallet - ウォレットオブジェクト
 * @param {string|Date} nowJST - JST時刻（DateまたはISO文字列）
 * @param {object} options - オプション（例: { forceOverride: true }）
 */
function updateEnableShots(wallet, nowJST, options = {}) {
  if (!wallet || !Array.isArray(wallet.nfts)) return;

  const maxShots = toNumOrNull(wallet.maxShots);
  let enableShots = toNumOrNull(wallet.enableShots);
  const lastChecked = new Date(wallet.lastChecked);
  const now = new Date(nowJST);

  if (maxShots === null) return;

  // GUI補正を優先する場合（POST時）
  if (options.forceOverride === true) {
    wallet.manualOverride = true;
    wallet.enableShots = enableShots;
    return;
  }

  // manualOverride は GUI補正後の一時フラグ。次回補正時に false に戻す。
  if (wallet.manualOverride === true) {
    wallet.manualOverride = false;
    return;
  }

  // 時間ベースの回復（最大1回分に制限）
  const recoveryHours = [6, 12, 18, 0];
  let recovered = false;

  for (const h of recoveryHours) {
    const boundary = new Date(lastChecked);
    boundary.setHours(h === 0 ? 0 : h, 0, 0, 0);
    if (!recovered && lastChecked < boundary && now >= boundary) {
      const recoveryAmount = Math.floor(maxShots / 4); // 小数点切り捨て
      enableShots = Math.min(maxShots, (enableShots ?? 0) + recoveryAmount);
      recovered = true;
    }
  }

  // NFTベースの消費検知
  for (const nft of wallet.nfts) {
    const recorded = toNumOrNull(nft.lastTotalShots);
    const latest = toNumOrNull(nft.latestTotalShots);

    if (recorded === null || latest === null) continue;

    const delta = latest - recorded;

    if (delta > 0) {
      enableShots = Math.max(0, enableShots - delta);
      nft.lastTotalShots = latest;
    } else if (delta < 0) {
      enableShots = null; // 不整合検知
      nft.lastTotalShots = latest;
    }
  }

  wallet.enableShots = enableShots;
}

module.exports = { updateEnableShots };
