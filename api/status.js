async function updateWalletsData(statusData) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(CAMERA_CONTRACT_ADDRESS, ABI, provider);

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

      if (tokenId === null || tokenId === undefined || tokenId === '') {
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
        const totalShots = metadata.attributes?.find(
          attr => attr.trait_type === 'Total Shots'
        )?.value ?? 0;

        nft.lastTotalShots = toNumOrNull(totalShots);
        wallet['wallet address'] = owner;
        wallet.lastChecked = new Date().toISOString();

        updated = true;

        console.log(`📸 更新成功: wallet=${wallet['wallet name']}, owner=${owner}, totalShots=${totalShots}`);
      } catch (err) {
        console.warn(`⚠️ tokenId=${tokenId} の取得に失敗: ${err.reason || err.message}`);
        wallet.lastChecked = new Date().toISOString();
        continue;
      }
    }
  }

  sortWallets(statusData.wallets);
  return updated;
}
