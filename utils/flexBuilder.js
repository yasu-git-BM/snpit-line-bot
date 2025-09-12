const buildFlexMessage = (statusData, walletOrder) => {
  if (!statusData || !walletOrder || !Array.isArray(walletOrder)) {
    throw new Error('Invalid input to buildFlexMessage');
  }

  const bubbles = walletOrder
    .filter(addr => statusData[addr])
    .map(addr => {
      const cam = statusData[addr];
      return {
        type: 'bubble',
        hero: cam.image
          ? {
              type: 'image',
              url: cam.image,
              size: 'full',
              aspectRatio: '20:13',
              aspectMode: 'cover'
            }
          : undefined,
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: cam.name || addr,
              weight: 'bold',
              size: 'md',
              wrap: true
            },
            {
              type: 'text',
              text: `残枚数: ${cam.remainingShots}`,
              size: 'sm',
              color: '#999999'
            }
          ]
        }
      };
    });

  return {
    type: 'flex',
    altText: '撮影可能枚数一覧',
    contents: {
      type: 'carousel',
      contents: bubbles
    }
  };
};

module.exports = { buildFlexMessage };
