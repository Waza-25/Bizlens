import type { NextConfig } from "next";

// BizLens: we keep Next.js's simpler default caching (cacheComponents off),
// so every signed-in page always shows fresh business data.
const nextConfig: NextConfig = {
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
