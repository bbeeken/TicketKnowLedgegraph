const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  eslint: {
    // Disable linting during build to avoid debug output issues
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Disable tracing to avoid permissions issues with trace file
    instrumentationHook: false,
  },
  // Use src directory
  distDir: '.next',
}

module.exports = nextConfig
