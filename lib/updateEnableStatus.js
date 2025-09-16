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

  // manualOverride は GUI補正後の一時フラグ。
  if (wallet.manualOverride === true) {
	wallet.manualOverride = false;
    return;
  }

  console.log(`🔍 ウォレット名 : ${wallet['wallet name']} 【更新前】カメラ撮影可能枚数 : ${enableShots}`);

  // 時間ベースの回復（最大1回分に制限）
  const recoveryHours = [6, 12, 18, 0];
  let recovered = false;

  // 仮想時間変換関数（0時台は24時扱い）
  function toVirtualMinutesJST(date) {
    const jst = new Date(date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
    const hour = jst.getHours();
    const minutes = jst.getMinutes();
    const virtualHour = (hour === 0) ? 24 : hour;
    return virtualHour * 60 + minutes;
  }

  for (const h of recoveryHours) {
    // boundary は now の日付を基準に構築（JSTベース）
    const boundary = new Date(now);
    boundary.setHours(h === 0 ? 0 : h, 0, 0, 0);

    const lastCheckedMinutes = toVirtualMinutesJST(lastChecked);
    const boundaryMinutes = toVirtualMinutesJST(boundary);
    const nowMinutes = toVirtualMinutesJST(now);

    const lastCheckedStr = new Date(lastChecked).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    const boundaryStr = boundary.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    const nowStr = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

    console.log(`🕒 回復判定: lastChecked(${lastCheckedStr})[${lastCheckedMinutes}] < boundary(${boundaryStr})[${boundaryMinutes}] && now(${nowStr})[${nowMinutes}] >= boundary(${boundaryStr})[${boundaryMinutes}]`);

    if (!recovered && lastCheckedMinutes < boundaryMinutes && nowMinutes >= boundaryMinutes) {
      const recoveryAmount = Math.floor(maxShots / 4);
      enableShots = Math.min(maxShots, (enableShots ?? 0) + recoveryAmount);
      console.log(`🔋 ウォレット名 : ${wallet['wallet name']} 【エネ回復】+${recoveryAmount} → 撮影可能枚数 : ${enableShots}`);
      recovered = true;
    }
  }

  // NFTベースの消費検知
  for (const nft of wallet.nfts) {
    const lastShots = toNumOrNull(nft.lastTotalShots);
    const currentShots = toNumOrNull(nft.currentTotalShots);

    if (lastShots === null || currentShots === null) continue;

    const delta = currentShots - lastShots;

    console.log(`🔍 カメラ名 : ${nft['name']} 前回取得撮影枚数 : ${lastShots} / 今回取得撮影枚数 : ${currentShots} ★★★エネ計上★★★ ${delta}枚`);
    if (delta > 0) {
      enableShots = Math.max(0, enableShots - delta);
      nft.lastTotalShots = currentShots;
      console.log(`🔍 カメラ名 : ${nft['name']} エネ差し引き後撮影枚数 : ${enableShots} ★★★エネ計上★★★ ${delta}枚`);
    } else if (delta < 0) {
      console.warn(`🔍 カメラ名 : ${nft['name']} 【不整合】前回取得撮影枚数 : ${lastShots} / 今回取得撮影枚数 : ${currentShots}`);
      enableShots = null; // 不整合検知
      nft.lastTotalShots = currentShots;
    }
  }

  wallet.enableShots = enableShots;
  console.log(`🔍 ウォレット名 : ${wallet['wallet name']} 【更新後】最終カメラ撮影可能枚数 : ${enableShots}`);
}

module.exports = { updateEnableShots };
