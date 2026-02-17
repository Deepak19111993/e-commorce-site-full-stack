import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.bbassets.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
