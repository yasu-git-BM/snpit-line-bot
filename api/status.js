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

async function updateWalletsData(statusData) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(CAMERA_CONTRACT_ADDRESS, ABI, provider);

  let updated = false;

  if (Array.isArray(statusData.wallets)) {
    for (const wallet of statusData.wallets) {
      if (Array.isArray(wallet.nfts)) {
        for (const nft of wallet.nfts) {
          if (nft.tokenId) {
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

    // ソート: EnableShots降順 → wallet name昇順
    statusData.wallets.sort((a, b) => {
      const shotsDiff = (b.enableShots ?? 0) - (a.enableShots ?? 0);
      if (shotsDiff !== 0) return shotsDiff;
      const nameA = (a['wallet name'] || '').toLowerCase();
      const nameB = (b['wallet name'] || '').toLowerCase();
      return nameA.localeCompare(nameB, 'ja');
    });
  }

  return updated;
}

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
