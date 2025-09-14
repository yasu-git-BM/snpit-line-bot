const express = require('express');
const fetch = require('node-fetch');
const { ethers } = require('ethers');

const router = express.Router();

const JSON_BIN_STATUS_URL = process.env.JSON_BIN_STATUS_URL;
const JSON_BIN_API_KEY = process.env.JSON_BIN_API_KEY;
const RPC_URL = process.env.RPC_URL;
const CAMERA_CONTRACT_ADDRESS = process.env.CAMERA_CONTRACT_ADDRESS;

const ABI = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)"
];

if (!JSON_BIN_STATUS_URL || !/^https?:\/\//.test(JSON_BIN_STATUS_URL)) {
  throw new Error('環境変数 JSON_BIN_STATUS_URL が未設定、または絶対URLではありません');
}
if (!JSON_BIN_API_KEY) {
  throw new Error('環境変数 JSON_BIN_API_KEY が未設定です');
}

const baseUrl = JSON_BIN_STATUS_URL.replace(/\/+$/, '');

/**
 * 値を数値化（数値でない場合は null）
 */
function toNumOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * 不整合判定
 * - enableShots が null/非数だが maxShots がある
 * - enableShots > maxShots
 * - enableShots < 0
 */
function isInconsistent(wallet) {
  const maxShots = toNumOrNull(wallet.maxShots);
  const enableShots = toNumOrNull(wallet.enableShots);

  if (maxShots === null && enableShots === null) return false; // 未登録は別カテゴリー
  if (enableShots === null && maxShots !== null) return true;
  if (enableShots !== null && enableShots < 0) return true;
  if (enableShots !== null && maxShots !== null && enableShots > maxShots) return true;
  return false;
}

/**
 * 未登録（maxShots・enableShotsがともに null）
 */
function isUnregistered(wallet) {
  return (toNumOrNull(wallet.maxShots) === null) && (toNumOrNull(wallet.enableShots) === null);
}

/**
 * 並び順：未登録 → 不整合 → enableShots降順 → wallet name昇順
 */
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
    if (aEnable !== bEnable) {
      // null は最下位、数値は降順
      const aScore = aEnable === null ? -Infinity : aEnable;
      const bScore = bEnable === null ? -Infinity : bEnable;
      if (bScore !== aScore) return bScore - aScore;
    }

    const nameA = (a['wallet name'] || '').toLowerCase();
    const nameB = (b['wallet name'] || '').toLowerCase();
    return nameA.localeCompare(nameB, 'ja');
  });
}

/**
 * wallets配列を更新
 * - NFTオーナーアドレス
 * - Total Shots
 * - Last Checked
 * - maxShots / enableShots は既存値を維持（未定義は null 補正）
 * - 並び順: 仕様の優先度に基づく sortWallets()
 */
async function updateWalletsData(statusData) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(CAMERA_CONTRACT_ADDRESS, ABI, provider);

  let updated = false;

  if (Array.isArray(statusData.wallets)) {
    for (const wallet of statusData.wallets) {
      // 型補正（未定義→null／数値化）
      wallet.maxShots = toNumOrNull(wallet.maxShots);
      wallet.enableShots = toNumOrNull(wallet.enableShots);

      if (Array.isArray(wallet.nfts)) {
        for (const nft of wallet.nfts) {
          if (nft && nft.tokenId !== undefined && nft.tokenId !== null && `${nft.tokenId}` !== '') {
            console.log(`🔍 NFT検出: tokenId=${nft.tokenId}`);

            const owner = await contract.ownerOf(nft.tokenId);

            let uri = await contract.tokenURI(nft.tokenId);
            if (uri.startsWith('ipfs://')) {
              uri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
            }
            const metaRes = await fetch(uri);
            if (!metaRes.ok) throw new Error(`メタデータ取得失敗: ${metaRes.status}`);
            const metadata = await metaRes.json();

            const totalShots = metadata.attributes?.find(
              attr => attr.trait_type === 'Total Shots'
            )?.value ?? 0;

            if (wallet['wallet address'] !== owner) {
              wallet['wallet address'] = owner;
              updated = true;
            }
            if (nft.lastTotalShots !== totalShots) {
              nft.lastTotalShots = totalShots;
              updated = true;
            }

            wallet.lastChecked = new Date().toISOString();
            updated = true;

            console.log(`📸 更新: wallet=${wallet['wallet name']}, owner=${owner}, totalShots=${totalShots}`);
          }
        }
      }
    }

    // 並び替え（未登録→不整合→enableShots降順→名前昇順）
    sortWallets(statusData.wallets);
  }

  return updated;
}

// ===== GET =====
router.get('/', async (req, res) => {
  try {
    console.log('📡 GET /api/status');
    const getUrl = `${baseUrl}/latest`;

    const response = await fetch(getUrl, {
      method: 'GET',
      headers: { 'X-Master-Key': JSON_BIN_API_KEY }
    });
    const text = await response.text();
    console.log('  JSONBin GET response:', response.status, text);

    if (!response.ok) throw new Error(`JSONBin GET失敗: ${response.status} ${text}`);
    let statusData = JSON.parse(text).record;

    const updated = await updateWalletsData(statusData);

    if (updated) {
      console.log('💾 JSONBinに更新を反映します');
      const putRes = await fetch(baseUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSON_BIN_API_KEY
        },
        body: JSON.stringify(statusData)
      });
      const putText = await putRes.text();
      console.log('  JSONBin PUT response:', putRes.status, putText);
      if (!putRes.ok) throw new Error(`JSONBin PUT失敗: ${putRes.status} ${putText}`);
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
    let statusData = req.body;

    if (!statusData || Object.keys(statusData).length === 0) {
      return res.status(400).json({ error: '更新データが空です' });
    }

    const updated = await updateWalletsData(statusData);

    const putRes = await fetch(baseUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSON_BIN_API_KEY
      },
      body: JSON.stringify(statusData)
    });
    const putText = await putRes.text();
    console.log('  JSONBin PUT response:', putRes.status, putText);
    if (!putRes.ok) throw new Error(`JSONBin PUT失敗: ${putRes.status} ${putText}`);

    res.json(statusData);

  } catch (err) {
    console.error('❌ /api/status POST error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
