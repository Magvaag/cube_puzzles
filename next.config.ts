import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  // Prefix routes and assets when hosted at /cube_puzzles on GitHub Pages
  basePath: isProd ? "/cube_puzzles" : undefined,
  assetPrefix: isProd ? "/cube_puzzles/" : undefined,
  images: {
    // Disable the image optimizer for static hosting (GitHub Pages)
    unoptimized: true,
  },
};

export default nextConfig;
