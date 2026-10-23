import path from "path";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  const workspaceRoot = process.cwd().endsWith("/frontend")
    ? path.resolve(process.cwd(), "..")
    : process.cwd();
  return {
    reactStrictMode: false,
    output: isDev ? undefined : "standalone",
    outputFileTracingRoot: isDev ? undefined : workspaceRoot,
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
