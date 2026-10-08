import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SyncFlow',
    short_name: 'SyncFlow',
    description: 'We engineer cinematic digital architecture for brands whose reputation is the product. Start with a Strategic Briefing.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d0d0e',
    theme_color: '#0d0d0e',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/brand/logo-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
