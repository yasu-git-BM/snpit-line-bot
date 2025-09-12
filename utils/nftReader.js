const { ethers } = require('ethers');
require('dotenv').config();
const fetch = require('node-fetch');

const ABI = [
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)'
];

const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
const contract = new ethers.Contract(process.env.CAMERA_CONTRACT_ADDRESS, ABI, provider);

const fetchMetadata = async (tokenId) => {
  try {
    const uri = await contract.tokenURI(tokenId);
    const response = await fetch(uri);
    const metadata = await response.json();
    return metadata;
  } catch (err) {
    console.error(`tokenURI取得失敗: ${tokenId}`, err);
    return null;
  }
};

const fetchOwner = async (tokenId) => {
  try {
    const owner = await contract.ownerOf(tokenId);
    return owner.toLowerCase();
  } catch (err) {
    console.error(`ownerOf取得失敗: ${tokenId}`, err);
    return null;
  }
};

module.exports = { fetchMetadata, fetchOwner };
