import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@dpat/shared'],
  typedRoutes: true,
};

export default nextConfig;
