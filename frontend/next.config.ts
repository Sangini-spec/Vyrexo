import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    reactStrictMode: false,
    // Use Next.js's standard production output and "next start" server.
    // This avoids relying on custom standalone packaging for the monorepo.
    distDir: isDev ? ".next-dev" : ".next",
    onDemandEntries: {
      // Keep compiled pages in memory for a long time in dev so chunks never vanish mid-session
      maxInactiveAge: 1000 * 60 * 60,
      pagesBufferLength: 20,
    },
    async headers() {
      return [
        {
          source: "/(.*)",
          headers: [
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            { key: "X-DNS-Prefetch-Control", value: "off" },
            {
              key: "Permissions-Policy",
              value: "camera=(), geolocation=(), microphone=(self)",
            },
          ],
        },
      ];
    },
  };
}