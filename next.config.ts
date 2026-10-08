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
}

module.exports = nextConfig
