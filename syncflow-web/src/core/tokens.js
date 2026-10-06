// SyncFlow marka ve hareket tokenları. SAF VERİ: DOM / tarayıcı bağımlılığı yok.
// Aynı dosyayı hem site paketi (esbuild) hem Remotion bileşenleri içe aktarır.
// Renkler src/styles/input.css içindeki @theme ile birebir aynı olmalı; scripts/check.mjs bunu doğrular.

export const colors = {
  navy50: '#f4f7fc',
  navy100: '#e1e8f3',
  navy200: '#c3d0e6',
  navy300: '#94a9cb',
  navy400: '#627ba6',
  navy500: '#3f5a87',
  navy600: '#2c4570',
  navy700: '#1d3257',
  navy800: '#12244a',
  navy900: '#0a1730',
  navy950: '#050d1c',
  teal200: '#99f0e4',
  teal300: '#5eead4',
  teal400: '#2dd4bf',
  teal500: '#14b8a6',
  teal600: '#0d9488',
  teal700: '#0f766e',
};

export const fonts = {
  sans: '"Plus Jakarta Sans", Arial, sans-serif',
};

// Süreler saniye cinsindendir. CSS --ease-soft ile aynı cubic-bezier.
export const motion = {
  ease: [0.22, 0.8, 0.3, 1],
  reveal: { y: 22, duration: 0.7, stagger: 0.09 },
  bubble: { y: 14, duration: 0.55, scaleFrom: 0.98 },
  typing: { fade: 0.2 },
  tag: { y: 8, duration: 0.5, scaleFrom: 0.96 },
};
