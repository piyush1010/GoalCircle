import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GoalYaar — Social accountability for meaningful goals',
    short_name: 'GoalYaar',
    description: 'Set meaningful goals, share progress and stay accountable with people who want to see you win.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#101B2D',
    theme_color: '#101B2D',
    orientation: 'portrait-primary',
    categories: ['productivity', 'social', 'lifestyle'],
    icons: [
      { src: '/goalyaar-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/goalyaar-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/goalyaar-icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
