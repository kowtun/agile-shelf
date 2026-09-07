import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.graphassets.com',
      },
    ],
  },
};

export default nextConfig;
