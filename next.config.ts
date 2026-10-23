import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Client emails can carry up to 4 MB of attachments (src/lib/attachments.ts); Vercel caps requests at 4.5 MB.
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
  // Fonts and logo read from disk when invoice and receipt PDFs are made on the server.
  outputFileTracingIncludes: {
    "/admin/**": ["src/lib/server/pdf/assets/**/*"],
    "/api/**": ["src/lib/server/pdf/assets/**/*"],
    "/pay/**": ["src/lib/server/pdf/assets/**/*"],
    // The link preview image reads the logo and brand fonts if it's generated on demand.
    "/opengraph-image": ["src/lib/server/pdf/assets/*.ttf", "public/brand/ledobiz-logo-email.png"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
