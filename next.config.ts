/** @type {import('next').NextConfig} */
const nextConfig = {
  /* output: 'export' removed to enable dynamic API routes, authentication callbacks, and cookies */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // Photos uploaded through our own address (see rewrites below).
      ...['goalyaar.in', 'www.goalyaar.in'].map((hostname) => ({ protocol: 'https', hostname, pathname: '/sb/storage/v1/object/public/**' })),
    ],
  },
  // Some Indian networks block *.supabase.co. The app in the browser calls goalyaar.in/sb/... and
  // this passes it on to Supabase, so those students can still sign up and use the app.
  async rewrites() {
    const supabase = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
    return supabase ? [{ source: '/sb/:path*', destination: `${supabase}/:path*` }] : []
  },
  // Old pages that were never finished; anyone with a saved link lands on Today.
  async redirects() {
    return [
      { source: '/leaderboard', destination: '/dashboard', permanent: false },
      { source: '/referrals', destination: '/dashboard', permanent: false },
    ]
  },
  async headers() {
    return [
      {
        // Android app link check for the Play Store app; filled in once the app's signing key exists.
        source: '/.well-known/assetlinks.json',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ]
  },
}

module.exports = nextConfig
