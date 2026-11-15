import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'GoalYaar: Exam Study Planner',
    short_name: 'GoalYaar',
    description: 'Goals you actually keep: exams, fitness, reading, your mind and new skills on one short list for today. Free, no ads.',
    lang: 'en-IN',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#101B2D',
    theme_color: '#101B2D',
    orientation: 'portrait-primary',
    categories: ['education', 'productivity'],
    icons: [
      { src: '/goalyaar-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/goalyaar-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/goalyaar-icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
