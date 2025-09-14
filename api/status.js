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

    if (statusData?.cameraNFT?.tokenId) {
      console.log(`🔍 カメラNFT検出: tokenId=${statusData.cameraNFT.tokenId}`);

      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(CAMERA_CONTRACT_ADDRESS, ABI, provider);

      const owner = await contract.ownerOf(statusData.cameraNFT.tokenId);
      let uri = await contract.tokenURI(statusData.cameraNFT.tokenId);
      if (uri.startsWith('ipfs://')) {
        uri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
      }

      const metaRes = await fetch(uri);
      if (!metaRes.ok) throw new Error(`メタデータ取得失敗: ${metaRes.status}`);
      const metadata = await metaRes.json();

      const totalShots = metadata.attributes?.find(
        attr => attr.trait_type === 'Total Shots'
      )?.value ?? 0;

      statusData.cameraNFT.owner = owner;
      statusData.cameraNFT.totalShots = totalShots;

      console.log(`📸 最新情報更新: owner=${owner}, totalShots=${totalShots}`);

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
