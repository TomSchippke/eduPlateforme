import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["pdfjs-dist", "pdf-parse"],
  experimental: {
    outputFileTracingIncludes: {
      "/api/**/*": ["./node_modules/pdf-parse/**/*", "./node_modules/pdfjs-dist/**/*"],
    },
  },
};

export default nextConfig;
