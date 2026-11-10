import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'GoalYaar: Exam Study Planner',
    short_name: 'GoalYaar',
    description: 'A free daily study plan for UPSC, state PCS, SSC, banking, teaching, judiciary and CAT: tick the syllabus, revise on time, prepare with your batch.',
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
