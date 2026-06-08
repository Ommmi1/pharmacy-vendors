/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cloudflare Pages compatible
  output: 'standalone',
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
