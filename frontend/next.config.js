const path = require('path');
const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./i18n.ts');

const SKIP_AUTH = process.env.NEXT_PUBLIC_SKIP_AUTH === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
    ],
  },
  outputFileTracingRoot: path.join(__dirname),
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // In SKIP_AUTH / mock-testing mode, replace @clerk/nextjs with a lightweight
  // mock so the app renders without real Clerk credentials.
  webpack: (config) => {
    if (SKIP_AUTH) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@clerk/nextjs': path.resolve(__dirname, 'lib/clerk-mock.tsx'),
        '@clerk/nextjs/server': path.resolve(__dirname, 'lib/clerk-mock.tsx'),
      };
    }
    return config;
  },
}

module.exports = withNextIntl(nextConfig)
