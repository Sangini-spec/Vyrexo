import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy API requests to FastAPI backend during development
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8001/api/:path*",
      },
      {
        source: "/ws/:path*",
        destination: "http://127.0.0.1:8001/ws/:path*",
      },
    ];
  },
};

export default nextConfig;
