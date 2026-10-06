import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SyncFlow',
    short_name: 'SyncFlow',
    description: 'Premium B2B websites with Next.js and Remotion. Flat price, live in 14 days.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d0d0e',
    theme_color: '#0d0d0e',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
