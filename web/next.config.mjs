/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

const nextConfig = {
  transpilePackages: ['../studio', '../templates', '../schemas'],
  experimental: {
    externalDir: true,
  },
  async rewrites() {
    return [
      {
        source: '/projects/:path*',
        destination: `${BACKEND_URL}/projects/:path*`,
      },
      {
        source: '/exports/:path*',
        destination: `${BACKEND_URL}/exports/:path*`,
      },
      {
        source: '/storage/:path*',
        destination: `${BACKEND_URL}/storage/:path*`,
      },
      {
        source: '/packs/:path*',
        destination: `${BACKEND_URL}/packs/:path*`,
      },
      {
        source: '/packs',
        destination: `${BACKEND_URL}/packs`,
      },
    ];
  },
};

export default nextConfig;
