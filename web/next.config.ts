import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  async rewrites() {
    // In dev, proxy uploads to the API so relative /uploads URLs resolve
    const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
    const origin = api.replace(/\/api\/v1\/?$/, '');
    return [{ source: '/uploads/:path*', destination: `${origin}/uploads/:path*` }];
  },
};

export default nextConfig;
