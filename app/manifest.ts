import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GoalCircle — Social accountability for meaningful goals',
    short_name: 'GoalCircle',
    description: 'Set meaningful goals, share progress and stay accountable with people who want to see you win.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#07101f',
    theme_color: '#f59e0b',
    orientation: 'portrait-primary',
    categories: ['productivity', 'social', 'lifestyle'],
    icons: [
      { src: '/goalcircle-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/goalcircle-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/goalcircle-icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
