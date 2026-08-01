import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // The keycap parts library is read at runtime by /api/keycap and is not an
  // import, so file tracing cannot find it on its own — say so explicitly or
  // the standalone build ships without it.
  outputFileTracingIncludes: {
    '/api/keycap': ['./assets/keycaps/**'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'platform-lookaside.fbsbx.com' },
      { protocol: 'https', hostname: 'graph.facebook.com' },
    ],
  },
};

export default nextConfig;
