import { NextResponse } from "next/server";
import { validateEnvironmentSecurity } from "@/lib/security/governance";

export async function GET() {
  const envSecurity = validateEnvironmentSecurity();
  return NextResponse.json({
    ok: true,
    status: "healthy",
    version: "0.2.0",
    service: "Vyrexo API",
    time: new Date().toISOString(),
    agents: {
      conversation: "gemini",
      coding: envSecurity.providers.anthropicModel,
    },
    security: {
      valid: envSecurity.valid,
      unrestrictedTestingMode: envSecurity.unrestrictedTestingMode,
    },
  });
}
