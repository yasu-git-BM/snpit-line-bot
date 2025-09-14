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

// ===== GET =====
router.get('/', async (req, res) => {
  try {
    const getUrl = `${baseUrl}/latest`;
    console.log('📡 GET /api/status');
    console.log('  GET先URL:', getUrl);

    const response = await fetch(getUrl, {
      method: 'GET',
      headers: { 'X-Master-Key': JSON_BIN_API_KEY }
    });
    const text = await response.text();
    console.log('  JSONBin GET response:', response.status, text);

    if (!response.ok) throw new Error(`JSONBin GET失敗: ${response.status} ${text}`);
    let statusData = JSON.parse(text).record;

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CAMERA_CONTRACT_ADDRESS, ABI, provider);

    let updated = false;

    if (Array.isArray(statusData.wallets)) {
      for (const wallet of statusData.wallets) {
        if (Array.isArray(wallet.nfts)) {
          for (const nft of wallet.nfts) {
            if (nft.tokenId) {
              console.log(`🔍 NFT検出: tokenId=${nft.tokenId}`);

              // 最新オーナー取得
              const owner = await contract.ownerOf(nft.tokenId);

              // メタデータ取得
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

              // 更新判定と反映
              if (wallet['wallet address'] !== owner) {
                wallet['wallet address'] = owner;
                updated = true;
              }
              if (nft.lastTotalShots !== totalShots) {
                nft.lastTotalShots = totalShots;
                updated = true;
              }

              console.log(`📸 更新候補: wallet=${wallet['wallet name']}, owner=${owner}, totalShots=${totalShots}`);
            }
          }
        }
      }
    }

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

// ===== POST（現状維持） =====
router.post('/', async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: '更新データが空です' });
    }

    console.log('📡 POST /api/status');
    console.log('  Request body:', JSON.stringify(req.body));

    const response = await fetch(baseUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSON_BIN_API_KEY
      },
      body: JSON.stringify(req.body)
    });

    const text = await response.text();
    console.log('  JSONBin PUT response:', response.status, text);

    if (!response.ok) throw new Error(`JSONBin PUT失敗: ${response.status} ${text}`);

    const data = JSON.parse(text);
    res.json(data.record);
  } catch (err) {
    console.error('❌ /api/status POST error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
