function normalizeWallets(wallets) {
  return wallets.map(w => {
    const nfts = (w.nfts ?? []).map(n => {
      const tokenId = n.tokenId ?? n.tokeinid;
      return {
        ...n,
        tokenId: /^[0-9]+$/.test(tokenId) ? Number(tokenId) : tokenId,
        name: n.name ?? ''
      };
    }).sort((a, b) => {
      if (typeof a.tokenId === 'number' && typeof b.tokenId === 'number') {
        return a.tokenId - b.tokenId;
      }
      return String(a.tokenId).localeCompare(String(b.tokenId));
    });

    return {
      'wallet name': w['wallet name'],
      'wallet address': w['wallet address'],
      maxShots: w.maxShots ?? null,
      enableShots: w.enableShots ?? null,
      lastChecked: w.lastChecked ?? null,
      nfts
    };
  }).sort((a, b) => a['wallet name'].localeCompare(b['wallet name']));
}

module.exports = { normalizeWallets };
