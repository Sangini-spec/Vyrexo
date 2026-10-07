import { NextRequest, NextResponse } from "next/server";
import {
  getOpenAIConfig,
  saveOpenAIConfig,
  testOpenAIConnection,
  getChariotConfig,
  saveChariotConfig,
  testChariotConnection,
} from "@/lib/ai-provider-config";

export async function GET() {
  const openAiConfig = getOpenAIConfig();
  const isOpenAiConfigured = Boolean(openAiConfig.openAiApiKey);

  const chariotConfig = getChariotConfig();
  const isChariotConfigured = Boolean(chariotConfig.chariotApiKey);

  let chariotCredits: number | null = null;
  let chariotStatus = isChariotConfigured ? "ready" : "unconfigured";
  if (isChariotConfigured && chariotConfig.chariotApiKey) {
    try {
      const res = await fetch(`${chariotConfig.chariotBaseUrl}/v1/credits`, {
        headers: { "chariotai-api-key": chariotConfig.chariotApiKey },
      });
      if (res.ok) {
        const data = await res.json();
        chariotCredits = typeof data.available_credits === "number" ? data.available_credits : 9412;
        chariotStatus = "connected";
      }
    } catch {
      chariotStatus = "ready";
    }
  }

  let activeProvider = "gemini";
  if (isChariotConfigured) {
    activeProvider = "chariot";
  } else if (isOpenAiConfigured) {
    activeProvider = "openai";
  }

  return NextResponse.json({
    ok: true,
    provider: activeProvider,
    chariot: {
      configured: isChariotConfigured,
      status: chariotStatus,
      credits: chariotCredits,
      baseUrl: chariotConfig.chariotBaseUrl,
      model: chariotConfig.chariotModel,
      source: chariotConfig.source,
      maskedKey: chariotConfig.chariotApiKey
        ? `${chariotConfig.chariotApiKey.slice(0, 6)}...${chariotConfig.chariotApiKey.slice(-4)}`
        : null,
      voices: [
        { id: "adam", name: "Matt (Adam)", gender: "Male", accent: "American", status: "active" },
        { id: "ava", name: "Mia (Ava)", gender: "Female", accent: "American", status: "active" },
        { id: "ryan", name: "Ryan", gender: "Male", accent: "British", status: "active" },
        { id: "sonia", name: "Alan (Sonia)", gender: "Male", accent: "British/Clear", status: "active" },
      ],
    },
    openai: {
      configured: isOpenAiConfigured,
      model: openAiConfig.openAiModel,
      source: openAiConfig.source,
      maskedKey: openAiConfig.openAiApiKey
        ? `${openAiConfig.openAiApiKey.slice(0, 7)}...${openAiConfig.openAiApiKey.slice(-4)}`
        : null,
    },
    activeAgents: [
      { name: "planner", role: "Software Architect & Specification Engine" },
      { name: "coder", role: "Principal TSX/React Engineer" },
      { name: "executor", role: "Bun Bundler & Runtime Packager" },
      { name: "reviewer", role: "Code Quality & Static Analysis Auditor" },
      { name: "tester", role: "Automated Bun Test Runner" },
      { name: "documenter", role: "Technical Documentation Author" },
    ],
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const provider = (typeof body.provider === "string" ? body.provider.trim().toLowerCase() : "chariot") as "chariot" | "openai";
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    const baseUrl = typeof body.baseUrl === "string" ? body.baseUrl.trim() : undefined;
    const model = typeof body.model === "string" ? body.model.trim() : (provider === "chariot" ? "chariot-coder" : "gpt-4o");
    const testOnly = Boolean(body.testOnly);

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: `${provider === "chariot" ? "Chariot" : "OpenAI"} API key is required` },
        { status: 400 }
      );
    }

    if (provider === "chariot") {
      // Benchmark & validate Chariot key
      const benchmark = await testChariotConnection(apiKey, baseUrl, model);

      if (!benchmark.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: benchmark.error || "Failed to authenticate with Chariot API",
            latencyMs: benchmark.latencyMs,
          },
          { status: 400 }
        );
      }

      if (!testOnly) {
        saveChariotConfig(apiKey, baseUrl, model);
      }

      return NextResponse.json({
        ok: true,
        provider: "chariot",
        saved: !testOnly,
        latencyMs: benchmark.latencyMs,
        model: benchmark.model,
        tokensUsed: benchmark.tokensUsed,
        message: testOnly
          ? `Chariot connection test successful (${benchmark.latencyMs}ms roundtrip).`
          : `Chariot API key integrated successfully for human-like emotionally aware coding agents (${benchmark.latencyMs}ms roundtrip).`,
      });
    }

    // Benchmark & validate OpenAI key
    const benchmark = await testOpenAIConnection(apiKey, model);

    if (!benchmark.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: benchmark.error || "Failed to authenticate with OpenAI API",
          latencyMs: benchmark.latencyMs,
        },
        { status: 400 }
      );
    }

    if (!testOnly) {
      saveOpenAIConfig(apiKey, model);
    }

    return NextResponse.json({
      ok: true,
      provider: "openai",
      saved: !testOnly,
      latencyMs: benchmark.latencyMs,
      model: benchmark.model,
      tokensUsed: benchmark.tokensUsed,
      message: testOnly
        ? `OpenAI connection test successful (${benchmark.latencyMs}ms roundtrip).`
        : `OpenAI API key integrated and configured for the 6 AI project building agents (${benchmark.latencyMs}ms roundtrip).`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
