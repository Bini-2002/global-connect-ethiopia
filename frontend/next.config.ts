import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getBackendOrigin } from "./app/lib/apiBase";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendOrigin = getBackendOrigin();

const nextConfig: NextConfig = {
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
