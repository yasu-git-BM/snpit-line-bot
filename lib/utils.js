function toNumOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function sortWallets(wallets) {
  wallets.sort((a, b) => {
    const nameA = a['wallet name'] ?? '';
    const nameB = b['wallet name'] ?? '';
    return nameA.localeCompare(nameB);
  });

  for (const wallet of wallets) {
    wallet.nfts?.sort((a, b) => {
      const idA = toNumOrNull(a.tokenId);
      const idB = toNumOrNull(b.tokenId);
      if (typeof idA === 'number' && typeof idB === 'number') {
        return idA - idB;
      }
      return String(a.tokenId).localeCompare(String(b.tokenId));
    });
  }
}

module.exports = {
  toNumOrNull,
  sortWallets
};
