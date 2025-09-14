// utils/nftReader.js
const { ethers } = require('ethers');
const fetch = require('node-fetch'); // ✅ 明示的に追加

// ABI 定義
const ABI = [
  'function ownerOf(uint256) view returns (address)',
  'function tokenURI(uint256) view returns (string)'
];

// Infura ベースの Polygon RPC URL を組み立て
const INFURA_ID = process.env.INFURA_PROJECT_ID;
const RPC_URL = `https://polygon-mainnet.infura.io/v3/${INFURA_ID}`;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(
  process.env.CAMERA_CONTRACT_ADDRESS,
  ABI,
  provider
);

// tokenURI からメタデータ取得
async function fetchMetadata(tokenId) {
  try {
    let uri = await contract.tokenURI(tokenId);
    if (uri.startsWith('ipfs://')) {
      uri = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }
    const res = await fetch(uri);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`tokenURI取得失敗: ${tokenId}`, err);
    return null;
  }
}

// ownerOf からオーナー取得
async function fetchOwner(tokenId) {
  try {
    const owner = await contract.ownerOf(tokenId);
    return owner.toLowerCase();
  } catch (err) {
    console.error(`ownerOf取得失敗: ${tokenId}`, err);
    return null;
  }
}

module.exports = {
  fetchMetadata,
  fetchOwner
};
