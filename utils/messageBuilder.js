// utils/messageBuilder.js

function getLabel(shots, max) {
  const thresholds = {
    16: { yellow: [9, 12], red: [13, 16] },
    8:  { yellow: [5, 6],  red: [7, 8] },
    4:  { yellow: [3, 3],  red: [4, 4] },
    2:  { yellow: [1, 1],  red: [2, 2] }
  };
  const t = thresholds[max] || { yellow: [1, max - 1], red: [max, max] };
  if (shots >= t.red[0] && shots <= t.red[1]) return '🟥';
  if (shots >= t.yellow[0] && shots <= t.yellow[1]) return '🟨';
  return '🟩';
}

function buildStatusMessage(wallets) {
  const walletOrder = wallets.map(w => w['wallet address']);
  const lines = walletOrder.map(addr => {
    const w = wallets.find(w => w['wallet address'] === addr);
    const label = getLabel(w.enableShots ?? 0, w.maxShots ?? 16);
    const paddedName = w['wallet name']?.padEnd(10, '　') ?? 'Unnamed';
    const shots = w.enableShots ?? 0;
    return `${label} ${paddedName}${shots}枚`;
  });

  return {
    type: 'text',
    text: `📸 撮影可能枚数一覧\n\n${lines.join('\n')}`
  };
}

module.exports = { buildStatusMessage };
