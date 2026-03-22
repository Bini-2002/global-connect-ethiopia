import type { NextConfig } from "next";

const backendOrigin = process.env.BACKEND_ORIGIN || "http://127.0.0.1:8000";

const isProductionBuild = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  distDir: isProductionBuild ? ".next-prod" : ".next",
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendOrigin}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
