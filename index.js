require('dotenv').config();
const express = require('express');
const { ethers } = require('ethers');
const fetch = require('node-fetch'); // Node 18以上なら不要
const app = express();

app.use(express.json());

// ======================
// ルートアクセス（UptimeRobot用 keep-alive）
// ======================
app.get('/', (req, res) => {
  res.status(200).send('✅ snpit-line-bot is running');
});

// ======================
// NFT情報取得API
// ======================
const RPC_URL = process.env.RPC_URL;
const CAMERA_CONTRACT_ADDRESS = process.env.CAMERA_CONTRACT_ADDRESS;

const ABI = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)"
];

app.get('/api/nft-info/:tokenId', async (req, res) => {
  const tokenId = req.params.tokenId;
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CAMERA_CONTRACT_ADDRESS, ABI, provider);

    // オーナーアドレス取得
    const owner = await contract.ownerOf(tokenId);

    // メタデータURI取得
    let uri = await contract.tokenURI(tokenId);
    if (uri.startsWith('ipfs://')) {
      uri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }

    // メタデータ取得
    const response = await fetch(uri);
    if (!response.ok) throw new Error(`メタデータ取得失敗: ${response.status}`);
    const metadata = await response.json();

    // Total Shots 抽出
    const totalShots = metadata.attributes?.find(
      attr => attr.trait_type === 'Total Shots'
    )?.value ?? 0;

    res.json({ owner, totalShots });
  } catch (err) {
    console.error('❌ /api/nft-info error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ======================
// 他の既存ルート（必要に応じて追加）
// ======================
// 例: /api/status, /api/config など

// ======================
// サーバ起動
// ======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
