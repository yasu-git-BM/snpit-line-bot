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

router.get('/', async (req, res) => {
  try {
    const getUrl = `${baseUrl}/latest`;
    const response = await fetch(getUrl, {
      method: 'GET',
      headers: { 'X-Master-Key': JSON_BIN_API_KEY }
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`JSONBin GET失敗: ${response.status} ${text}`);
    let statusData = JSON.parse(text).record;

    if (statusData?.cameraNFT?.tokenId) {
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

      await fetch(baseUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSON_BIN_API_KEY
        },
        body: JSON.stringify(statusData)
      });
    }

    res.json(statusData);

  } catch (err) {
    console.error('❌ /api/status GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: '更新データが空です' });
    }

    const response = await fetch(baseUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSON_BIN_API_KEY
      },
      body: JSON.stringify(req.body)
    });

    const text = await response.text();
    if (!response.ok) throw new Error(`JSONBin PUT失敗: ${response.status} ${text}`);

    const data = JSON.parse(text);
    res.json(data.record);
  } catch (err) {
    console.error('❌ /api/status POST error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
