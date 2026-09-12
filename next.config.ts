import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Enable experimental features for performance
  experimental: {
    optimizeCss: true,
    // Allows server components to import heavy node modules without bundling
    serverComponentsHmrCache: true,
  },

  // Bundle analyzer support (set ANALYZE=true env var)
  ...(process.env.ANALYZE === "true" && {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webpack: (config: any) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
      config.plugins = config.plugins ?? [];
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: "static",
          reportFilename: "./bundle-report.html",
          openAnalyzer: false,
        })
      );
      return config;
    },
  }),

  // Headers for performance optimization
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
    ];
  },
};

export default nextConfig;
