import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function nextConfig(phase: string): NextConfig {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    reactStrictMode: false,
    distDir: isDev ? ".next/dev" : ".next",
    onDemandEntries: {
      // Keep compiled pages in memory for a long time in dev so chunks never vanish mid-session
      maxInactiveAge: 1000 * 60 * 60,
      pagesBufferLength: 20,
    },
  };
}
