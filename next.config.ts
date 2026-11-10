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
    ],
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
