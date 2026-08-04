import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // The keycap parts library is read at runtime by /api/keycap and is not an
  // import, so file tracing cannot find it on its own — say so explicitly or
  // the standalone build ships without it.
  outputFileTracingIncludes: {
    '/api/keycap': ['./assets/keycaps/**'],
    // The .scad sources and the render worker are both resolved by path at
    // runtime rather than imported, so tracing cannot find either on its own.
    // openscad-wasm is a third case and is NOT listed here: tracing includes
    // skip node_modules paths, so it is copied by scripts/bundle-openscad.mjs
    // as a postbuild step instead.
    '/api/parametric/[slug]': [
      './assets/parametric/**',
      './lib/parametric/render.worker.mjs',
    ],
    '/api/paint-kit': ['./lib/parametric/render.worker.mjs'],
  },
  // 13MB of embedded wasm has no business going through the bundler.
  serverExternalPackages: ['openscad-wasm'],
  async redirects() {
    return [
      // /keycaps shipped on its own before the generators were grouped under
      // one nav entry; keep the old link working.
      {
        source: '/keycaps',
        destination: '/3d-generator/parametric/keycaps',
        permanent: true,
      },
    ];
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
