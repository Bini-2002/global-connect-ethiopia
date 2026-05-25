import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getBackendOrigin } from "./app/lib/apiBase";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendOrigin = getBackendOrigin();

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '..'),
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Disable filesystem cache in dev to prevent ArrayBuffer allocation errors
      config.cache = false;
    }
    return config;
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
