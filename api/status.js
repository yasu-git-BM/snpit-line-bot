const express = require('express');
const fetch = require('node-fetch');
const { ethers } = require('ethers');
const { getGistJson, updateGistJson } = require('../gistClient');

const router = express.Router();

const RPC_URL = process.env.RPC_URL;
const CAMERA_CONTRACT_ADDRESS = process.env.CAMERA_CONTRACT_ADDRESS;

const ABI = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)"
];

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

async function updateWalletsData(statusData) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(CAMERA_CONTRACT_ADDRESS, ABI, provider);

  let updated = false;

  if (Array.isArray(statusData.wallets)) {
    for (const wallet of statusData.wallets) {
      wallet.maxShots = toNumOrNull(wallet.maxShots);
      wallet.enableShots = toNumOrNull(wallet.enableShots);

      if (Array.isArray(wallet.nfts)) {
        for (const nft of wallet.nfts) {
          const tokenId = nft?.tokenId ?? nft?.tokeinid;
          if (tokenId) {
            try {
              console.log(`🔍 NFT検出: tokenId=${tokenId}`);
              const owner = await contract.ownerOf(tokenId);
              let uri = await contract.tokenURI(tokenId);
              if (uri.startsWith('ipfs://')) {
                uri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
              }
              const metaRes = await fetch(uri);
              if (!metaRes.ok) throw new Error(`メタデータ取得失敗: ${metaRes.status}`);
              const metadata = await metaRes.json();
              const totalShots = metadata.attributes?.find(
                attr => attr.trait_type === 'Total Shots'
              )?.value ?? 0;

              wallet['wallet address'] = owner;
              nft.lastTotalShots = totalShots;
              wallet.lastChecked = new Date().toISOString();
              updated = true;

              console.log(`📸 更新: wallet=${wallet['wallet name']}, owner=${owner}, totalShots=${totalShots}`);
            } catch (err) {
              console.warn(`⚠️ tokenId=${tokenId} の取得に失敗: ${err.reason || err.message}`);
              wallet.lastChecked = new Date().toISOString();
              continue;
            }
          }
        }
      }
    }

    sortWallets(statusData.wallets);
  }

  return updated;
}

// ===== GET =====
router.get('/', async (req, res) => {
  try {
    console.log('📡 GET /api/status');
    const statusData = await getGistJson();

    const updated = await updateWalletsData(statusData);

    if (updated) {
      console.log('💾 Gistに更新を反映します');
      await updateGistJson(statusData);
    } else {
      console.log('ℹ️ 更新は不要でした');
    }

    res.json(statusData);

  } catch (err) {
    console.error('❌ /api/status GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== POST =====
router.post('/', async (req, res) => {
  try {
    console.log('📡 POST /api/status');
    const statusData = req.body;

    if (!statusData || Object.keys(statusData).length === 0) {
      return res.status(400).json({ error: '更新データが空です' });
    }

    const updated = await updateWalletsData(statusData);
    await updateGistJson(statusData);

    res.json(statusData);

  } catch (err) {
    console.error('❌ /api/status POST error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
