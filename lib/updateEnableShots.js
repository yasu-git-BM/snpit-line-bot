const { toNumOrNull } = require('./utils');

/**
 * enableShots を補正する
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

  // GUIからの補正を優先する場合は補正ロジックをスキップ
  if (options.forceOverride === true) {
    wallet.enableShots = enableShots;
    return;
  }

  // 時間ベースの回復
  const recoveryHours = [6, 12, 18, 0];
  let recoveryCount = 0;

  for (const h of recoveryHours) {
    const boundary = new Date(lastChecked);
    boundary.setHours(h === 0 ? 0 : h, 0, 0, 0);
    if (lastChecked < boundary && now >= boundary) {
      recoveryCount++;
    }
  }

  if (recoveryCount > 0) {
    enableShots = Math.min(maxShots, (enableShots ?? 0) + 4 * recoveryCount);
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
      enableShots = null;
      nft.lastTotalShots = latest;
    }
  }

  wallet.enableShots = enableShots;
}

module.exports = { updateEnableShots };
