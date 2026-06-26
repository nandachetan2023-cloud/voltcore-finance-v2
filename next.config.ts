import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Set the correct workspace root for Turbopack
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  // Experimental features for better performance
  experimental: {
    // Tree-shake heavy barrel packages so each lazy-loaded module only pulls the
    // icons/components/helpers it actually uses (smaller per-route JS chunks).
    optimizePackageImports: [
      'lucide-react',
      '@prisma/client',
      'recharts',
      'date-fns',
    ],
  },
};

export default nextConfig;
