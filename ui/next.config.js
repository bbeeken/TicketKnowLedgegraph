/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    // Disable linting during build to avoid debug output issues
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Disable tracing to avoid permissions issues with trace file
    instrumentationHook: false,
  },
}

module.exports = nextConfig
