// ✅ 修正済みの api/status.js
const express = require('express');
const fetch = require('node-fetch');
const { ethers } = require('ethers');
const { DateTime } = require('luxon');
const { getGistJson, updateGistJson } = require('../gistClient');
const { updateEnableShots } = require('../lib/updateEnableStatus');

const router = express.Router();

const RPC_URL = process.env.RPC_URL;
const CAMERA_CONTRACT_ADDRESS = process.env.CAMERA_CONTRACT_ADDRESS;

const ABI = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)"
];

// ===== Utility =====
function toNumOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isInconsistent(wallet) {
  const maxShots = toNumOrNull(wallet.maxShots);
  const enableShots = toNumOrNull(wallet.enableShots);
  if (maxShots === null && enableShots === null) return false;
  if (enableShots === null && maxShots !== null) return true;
  if (enableShots !== null && enableShots < 0) return true;
  if (enableShots !== null && maxShots !== null && enableShots > maxShots) return true;
  return false;
}

function isUnregistered(wallet) {
  return (toNumOrNull(wallet.maxShots) === null) && (toNumOrNull(wallet.enableShots) === null);
}

function sortWallets(wallets) {
  wallets.sort((a, b) => {
    const aUnreg = isUnregistered(a) ? 0 : 1;
    const bUnreg = isUnregistered(b) ? 0 : 1;
    if (aUnreg !== bUnreg) return aUnreg - bUnreg;

    const aIncon = isInconsistent(a) ? 0 : 1;
    const bIncon = isInconsistent(b) ? 0 : 1;
    if (aIncon !== bIncon) return aIncon - bIncon;

    const aEnable = toNumOrNull(a.enableShots);
    const bEnable = toNumOrNull(b.enableShots);
    const aScore = aEnable === null ? -Infinity : aEnable;
    const bScore = bEnable === null ? -Infinity : bEnable;
    if (bScore !== aScore) return bScore - aScore;

    const nameA = (a['wallet name'] || '').toLowerCase();
    const nameB = (b['wallet name'] || '').toLowerCase();
    return nameA.localeCompare(nameB, 'ja');
  });
}

// ===== Core Update =====
async function updateWalletsData(statusData, options = {}) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(CAMERA_CONTRACT_ADDRESS, ABI, provider);

  const nowJST = DateTime.now().setZone('Asia/Tokyo');
  let updated = false;

  if (!Array.isArray(statusData.wallets)) {
    console.warn('⚠️ statusData.wallets が配列ではありません');
    return false;
  }

  for (const [wIdx, wallet] of statusData.wallets.entries()) {
    console.log(`🧪 wallet[${wIdx}]: ${wallet['wallet name']}`);

    wallet.maxShots = toNumOrNull(wallet.maxShots);
    wallet.enableShots = toNumOrNull(wallet.enableShots);

    if (!Array.isArray(wallet.nfts)) {
      console.warn(`⚠️ wallet[${wIdx}] に nfts が存在しません`);
      continue;
    }

    for (const [nIdx, nft] of wallet.nfts.entries()) {
      const tokenId = nft?.tokenId ?? nft?.tokeinid;
      if (!tokenId) {
        console.warn(`⚠️ wallet[${wIdx}].nfts[${nIdx}] に tokenId が未設定`);
        continue;
      }

      try {
        console.log(`🔍 NFT検出: wallet=${wallet['wallet name']}, tokenId=${tokenId}`);
        const owner = await contract.ownerOf(tokenId);
        let uri = await contract.tokenURI(tokenId);
        if (uri.startsWith('ipfs://')) {
          uri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
        }

        const metaRes = await fetch(uri);
        if (!metaRes.ok) throw new Error(`メタデータ取得失敗: ${metaRes.status}`);
        const metadata = await metaRes.json();
        const totalShots = metadata.attributes?.find(attr => attr.trait_type === 'Total Shots')?.value ?? 0;

        nft.currentTotalShots = toNumOrNull(totalShots);
        wallet['wallet address'] = owner;
        updated = true;

        console.log(`📸 更新成功: wallet=${wallet['wallet name']}, owner=${owner}, Last totalShots = ${nft.lastTotalShots} ---> New CurrentTotalShots=${totalShots}`);
      } catch (err) {
        console.warn(`⚠️ tokenId=${tokenId} の取得に失敗: ${err.reason || err.message}`);
        continue;
      }
    }

    updateEnableShots(wallet, nowJST, options);
    if (!options.forceOverride) {
      wallet.lastChecked = nowJST.toISO();
      wallet.manualOverride = false;
    }
  }

  sortWallets(statusData.wallets);
  return updated;
}

// ===== GET(GUIから補正処理以外) =====
router.get('/', async (req, res) => {
  try {
    console.log('📡 GET /api/status START');
    const statusData = await getGistJson();

    if (!Array.isArray(statusData?.wallets)) {
      console.warn('⚠️ statusData.wallets が配列ではないため、空配列で返します');
      return res.json({ wallets: [] });
    }

    const updated = await updateWalletsData(statusData);

    if (updated) {
      console.log('💾 Gistに更新を反映します');
      await updateGistJson(statusData);
    } else {
      console.log('ℹ️ 更新は不要でした');
    }

    res.json(statusData);
    console.log('📡 GET /api/status END');
  } catch (err) {
    console.error('❌ /api/status GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== POST(GUIからの補正処理) =====
router.post('/', async (req, res) => {
  try {
    console.log('📡 POST /api/status START');
    const { wallets, forceOverride } = req.body;

    if (!Array.isArray(wallets)) {
      return res.status(400).json({ error: 'wallets配列が必要です' });
    }

    const statusData = { wallets };
    const updated = await updateWalletsData(statusData, { forceOverride });
    await updateGistJson(statusData);

    res.json(statusData);
    console.log('📡 POST /api/status END');
  } catch (err) {
    console.error('❌ /api/status POST error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ エクスポートを分離
module.exports = {
  router,
  updateWalletsData
};
