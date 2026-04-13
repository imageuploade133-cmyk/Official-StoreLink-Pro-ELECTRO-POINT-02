import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ─── Fix: Allow network devices (phones, tablets on same WiFi) ───────────
  // Next.js 15 requires hostnames only (no protocol or port)
  allowedDevOrigins: [
    '192.168.0.9',
    '192.168.0.*',
    '*.local',
  ],

  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
    // Speed: optimize imports from large icon/component libraries
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'recharts',
    ],
  },

  // ─── Performance: faster page transitions ────────────────────────────────
  poweredByHeader: false,

  images: {
    // Speed: enable modern image formats
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 3600,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ibb.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'valentino-ice-cream.firebasestorage.app',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pixabay.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'abdkstore.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'abdkstore.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
