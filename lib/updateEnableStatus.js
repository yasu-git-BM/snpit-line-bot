const { toNumOrNull } = require('./utils');
const { DateTime } = require('luxon');

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
  const lastChecked = DateTime.fromISO(wallet.lastChecked, { zone: 'Asia/Tokyo' });
  const now = nowJST;

  if (maxShots === null) return;

  if (options.forceOverride === true) {
    wallet.manualOverride = true;
    wallet.enableShots = enableShots;
    return;
  }

  if (wallet.manualOverride === true) {
    wallet.manualOverride = false;
    return;
  }

  console.log(`🔍 ウォレット名 : ${wallet['wallet name']} 【更新前】カメラ撮影可能枚数 : ${enableShots}`);

  const recoveryHours = [6, 12, 18, 24];
  let recovered = false;

  function buildJSTBoundary(base, hour) {
    if (!base || !base.isValid) {
      console.warn('⚠️ buildJSTBoundary に無効な DateTime が渡されました');
      return DateTime.invalid('Invalid base DateTime');
    }
    return base.set({ hour: hour === 0 ? 0 : hour, minute: 0, second: 0, millisecond: 0 });
  }

  function toVirtualMinutes(dt) {
    const h = dt.hour === 0 ? 24 : dt.hour;
    return h * 60 + dt.minute;
  }

  for (const h of recoveryHours) {
    const boundary = buildJSTBoundary(now, h);

    const lastCheckedMinutes = toVirtualMinutes(lastChecked);
    const boundaryMinutes = toVirtualMinutes(boundary);
    const nowMinutes = toVirtualMinutes(now);

    console.log(`🕒 回復判定:[${h}] lastChecked(${lastChecked.toFormat('yyyy/MM/dd HH:mm:ss')})[${lastCheckedMinutes}] < boundary(${boundary.toFormat('yyyy/MM/dd HH:mm:ss')})[${boundaryMinutes}] && now(${now.toFormat('yyyy/MM/dd HH:mm:ss')})[${nowMinutes}] >= boundary(${boundary.toFormat('yyyy/MM/dd HH:mm:ss')})[${boundaryMinutes}]`);

    if (!recovered && lastCheckedMinutes < boundaryMinutes && nowMinutes >= boundaryMinutes) {
      const recoveryAmount = Math.floor(maxShots / 4);
      enableShots = Math.min(maxShots, (enableShots ?? 0) + recoveryAmount);
      console.log(`🔋 ウォレット名 : ${wallet['wallet name']} 【エネ回復】+${recoveryAmount} → 撮影可能枚数 : ${enableShots}`);
      recovered = true;
    }
  }

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
      enableShots = null;
      nft.lastTotalShots = currentShots;
    }
  }

  wallet.enableShots = enableShots;
  console.log(`🔍 ウォレット名 : ${wallet['wallet name']} 【更新後】最終カメラ撮影可能枚数 : ${enableShots}`);
}

module.exports = { updateEnableShots };
