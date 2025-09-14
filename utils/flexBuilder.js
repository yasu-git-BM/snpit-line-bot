function getColorBySlots(shots, maxSlots) {
  if (shots === 0) {
    return { color: '#339933', label: '🟩 撮影不可' }; // 緑
  }

  // 色分け閾値（画像の表に準拠）
  const thresholds = {
    16: { yellow: [1, 11], red: [12, 16] },
    8:  { yellow: [1, 5],  red: [6, 8] },
    4:  { yellow: [1, 1],  red: [2, 4] },
    2:  { yellow: [1, 1],  red: [2, 2] }
  };

  const t = thresholds[maxSlots] || { yellow: [1, maxSlots - 1], red: [maxSlots, maxSlots] };

  if (shots >= t.red[0] && shots <= t.red[1]) {
    return { color: '#cc0000', label: `🟥 残り ${shots} 枚` }; // 赤
  }

  if (shots >= t.yellow[0] && shots <= t.yellow[1]) {
    return { color: '#ffcc00', label: `🟨 残り ${shots} 枚` }; // 黄
  }

  return { color: '#999999', label: `残り ${shots} 枚` }; // グレー（未定義ゾーン）
}

function buildFlexMessage(statusData, walletOrder) {
  const bubbles = walletOrder
    .filter(addr => statusData[addr])
    .map(addr => {
      const cam = statusData[addr];
      const name = cam.name || addr;
      const shots = cam.remainingShots ?? 0;
      const maxSlots = cam.maxShots ?? 16; // デフォルト16（GUIと揃える）

      const { color: shotColor, label: shotText } = getColorBySlots(shots, maxSlots);

      return {
        type: 'bubble',
        hero: cam.image
          ? {
              type: 'image',
              url: cam.image,
              size: 'full',
              aspectRatio: '1:1',
              aspectMode: 'cover'
            }
          : {
              type: 'box',
              layout: 'vertical',
              size: 'full',
              backgroundColor: '#eeeeee',
              justifyContent: 'center',
              alignItems: 'center',
              contents: [
                {
                  type: 'text',
                  text: 'No Image',
                  color: '#888888',
                  size: 'md',
                  weight: 'bold'
                }
              ]
            },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: name,
              weight: 'bold',
              size: 'lg',
              align: 'center',
              wrap: true,
              color: '#333333'
            },
            {
              type: 'text',
              text: shotText,
              size: 'sm',
              align: 'center',
              color: shotColor
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
      contents: bubbles.length ? bubbles : [{
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'カメラ情報が見つかりませんでした',
              size: 'md',
              align: 'center',
              color: '#666666',
              wrap: true
            }
          ]
        }
      }]
    }
  };
}

module.exports = { buildFlexMessage };
