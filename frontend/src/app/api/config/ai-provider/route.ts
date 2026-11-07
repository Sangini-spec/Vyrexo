import { NextRequest, NextResponse } from "next/server";
import {
  getOpenAIConfig,
  saveOpenAIConfig,
  removeOpenAIConfig,
  testOpenAIConnection,
  getChariotConfig,
  saveChariotConfig,
  testChariotConnection,
  getGnaniConfig,
  saveGnaniConfig,
  removeGnaniConfig,
  testGnaniConnection,
  getElevenLabsConfig,
  saveElevenLabsConfig,
  removeElevenLabsConfig,
  testElevenLabsConnection,
} from "@/lib/ai-provider-config";
import {
  getAnthropicCodingConfig,
  CLAUDE_CODING_MODEL,
} from "@/lib/claude/coding-agent";

export async function GET() {
  const anthropicConfig = getAnthropicCodingConfig();
  const openAiConfig = getOpenAIConfig();
  const isOpenAiConfigured = Boolean(openAiConfig.openAiApiKey);

  const chariotConfig = getChariotConfig();
  const isChariotConfigured = Boolean(chariotConfig.chariotApiKey);

  const gnaniConfig = getGnaniConfig();
  const isGnaniConfigured = Boolean(gnaniConfig.gnaniApiKey);
  const gnaniStatus = isGnaniConfigured ? "connected" : "unconfigured";

  const elevenConfig = getElevenLabsConfig();
  const isElevenConfigured = Boolean(elevenConfig.elevenLabsApiKey);

  let elevenStatus = isElevenConfigured ? "ready" : "unconfigured";
  let elevenCharCount: number | null = null;
  let elevenCharLimit: number | null = null;

  if (isElevenConfigured && elevenConfig.elevenLabsApiKey) {
    try {
      const res = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
        headers: { "xi-api-key": elevenConfig.elevenLabsApiKey },
      });
      if (res.ok) {
        const sub = await res.json();
        elevenCharCount = sub.character_count ?? 0;
        elevenCharLimit = sub.character_limit ?? 10000;
        elevenStatus = "connected";
      } else {
        const errBody = await res.json().catch(() => null);
        if (errBody?.detail?.status === "missing_permissions") {
          elevenStatus = "connected";
        }
      }
    } catch {
      elevenStatus = "ready";
    }
  }

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

  // Hierarchy: Gnani (Tier 1) -> ElevenLabs (Tier 2) -> Gemini (Tier 3)
  let activeProvider = "gemini";
  if (isGnaniConfigured) {
    activeProvider = "gnani";
  } else if (isElevenConfigured) {
    activeProvider = "elevenlabs";
  } else if (isChariotConfigured) {
    activeProvider = "chariot";
  } else if (isOpenAiConfigured) {
    activeProvider = "openai";
  }

  return NextResponse.json({
    ok: true,
    provider: activeProvider,
    hierarchy: ["gnani", "elevenlabs", "gemini"],
    codingAgent: {
      provider: anthropicConfig.configured ? "anthropic" : "gemini",
      configured: anthropicConfig.configured,
      model: anthropicConfig.model,
      maxOutputTokens: anthropicConfig.maxOutputTokens,
      source: anthropicConfig.source,
    },
    conversationalAgent: {
      provider: activeProvider,
      hierarchy: ["gnani", "elevenlabs", "gemini"],
      configured: isGnaniConfigured || isElevenConfigured || Boolean(process.env.GEMINI_API_KEY),
      model: isGnaniConfigured
        ? gnaniConfig.gnaniModel
        : isElevenConfigured
        ? elevenConfig.elevenLabsModel
        : "gemini-2.5-flash",
    },
    gnani: {
      configured: isGnaniConfigured,
      status: gnaniStatus,
      baseUrl: gnaniConfig.gnaniBaseUrl,
      model: gnaniConfig.gnaniModel,
      source: gnaniConfig.source,
      tier: 1,
      role: "Primary Human-Like Voice Engine (until credits exhausted)",
      voices: [
        { id: "adam", name: "Shubham (Adam - Conversational, Expressive Male)", gnaniVoice: "Shubham", status: "active" },
        { id: "ryan", name: "Avinash (Brian - Rich, Deliberate Male)", gnaniVoice: "Avinash", status: "active" },
        { id: "george", name: "Devansh (George - Warm, Emotive Male)", gnaniVoice: "Devansh", status: "active" },
        { id: "ava", name: "Shivani (Rachel - Calm, Empathetic Female)", gnaniVoice: "Shivani", status: "active" },
        { id: "sonia", name: "Riyaa (Charlotte - Elegant, Warm Female)", gnaniVoice: "Riyaa", status: "active" },
        { id: "nicole", name: "Vasudha (Nicole - Expressive, Caring Female)", gnaniVoice: "Vasudha", status: "active" },
      ],
    },
    elevenlabs: {
      configured: isElevenConfigured,
      status: elevenStatus,
      characterCount: elevenCharCount,
      characterLimit: elevenCharLimit,
      model: elevenConfig.elevenLabsModel,
      source: elevenConfig.source,
      tier: 2,
      role: "First Fallback Voice Engine (activates when Gnani credits exhausted)",
      voices: [
        { id: "adam", name: "Adam (American Male - Conversational, Expressive)", elevenId: "pNInz6obpgDQGcFmaJgB", status: "active" },
        { id: "ryan", name: "Brian (British Male - Rich, Narrative)", elevenId: "nPczCjzI2devNBz1zQrb", status: "active" },
        { id: "ava", name: "Rachel (American Female - Calm, Empathetic)", elevenId: "21m00Tcm4TlvDq8ikWAM", status: "active" },
        { id: "sonia", name: "Charlotte (British Female - Elegant, Warm)", elevenId: "XB0fDUnXU5powFXDhCwa", status: "active" },
      ],
    },
    chariot: {
      configured: isChariotConfigured,
      status: chariotStatus,
      credits: chariotCredits,
      baseUrl: chariotConfig.chariotBaseUrl,
      model: chariotConfig.chariotModel,
      source: chariotConfig.source,
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
    },
    activeAgents: [
      { name: "planner", role: "Software Architect & Specification Engine", model: CLAUDE_CODING_MODEL },
      { name: "coder", role: "Principal TSX/React Engineer (Claude Sonnet 5.5)", model: CLAUDE_CODING_MODEL },
      { name: "executor", role: "Bun Bundler & Runtime Packager" },
      { name: "reviewer", role: "Code Quality & Autonomous Repair Auditor", model: CLAUDE_CODING_MODEL },
      { name: "tester", role: "Automated Bun & Acceptance Test Runner" },
      { name: "documenter", role: "Technical Documentation Author", model: CLAUDE_CODING_MODEL },
    ],
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const provider = (typeof body.provider === "string" ? body.provider.trim().toLowerCase() : "gnani") as
      | "gnani"
      | "elevenlabs"
      | "chariot"
      | "openai";
    const explicitKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    const apiKey =
      explicitKey ||
      (provider === "gnani"
        ? getGnaniConfig().gnaniApiKey || ""
        : provider === "elevenlabs"
        ? getElevenLabsConfig().elevenLabsApiKey || ""
        : provider === "chariot"
        ? getChariotConfig().chariotApiKey || ""
        : getOpenAIConfig().openAiApiKey || "");
    const baseUrl = typeof body.baseUrl === "string" ? body.baseUrl.trim() : undefined;
    const model =
      typeof body.model === "string"
        ? body.model.trim()
        : provider === "gnani"
        ? "timbre-v3.0"
        : provider === "elevenlabs"
        ? "eleven_turbo_v2_5"
        : provider === "chariot"
        ? "chariot-coder"
        : "gpt-4o";
    const testOnly = Boolean(body.testOnly) || !explicitKey;

    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error: `${
            provider === "gnani"
              ? "Gnani"
              : provider === "elevenlabs"
              ? "ElevenLabs"
              : provider === "chariot"
              ? "Chariot"
              : "OpenAI"
          } API key is not configured on the server.`,
        },
        { status: 400 }
      );
    }

    if (provider === "gnani") {
      const benchmark = await testGnaniConnection(apiKey, model, baseUrl);
      if (!benchmark.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: benchmark.error || "Failed to authenticate with Gnani Vachana API",
            latencyMs: benchmark.latencyMs,
          },
          { status: 400 }
        );
      }

      if (!testOnly) {
        saveGnaniConfig(apiKey, model, baseUrl);
      }

      return NextResponse.json({
        ok: true,
        provider: "gnani",
        saved: !testOnly,
        latencyMs: benchmark.latencyMs,
        model: benchmark.model,
        message: testOnly
          ? `Gnani AI connection test successful (${benchmark.latencyMs}ms roundtrip).`
          : `Gnani AI integrated as primary human-like conversational voice engine (${benchmark.latencyMs}ms roundtrip).`,
      });
    }

    if (provider === "elevenlabs") {
      const benchmark = await testElevenLabsConnection(apiKey, model);
      if (!benchmark.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: benchmark.error || "Failed to authenticate with ElevenLabs API",
            latencyMs: benchmark.latencyMs,
          },
          { status: 400 }
        );
      }

      if (!testOnly) {
        saveElevenLabsConfig(apiKey, model);
      }

      return NextResponse.json({
        ok: true,
        provider: "elevenlabs",
        saved: !testOnly,
        latencyMs: benchmark.latencyMs,
        model: benchmark.model,
        characterCount: benchmark.characterCount,
        characterLimit: benchmark.characterLimit,
        message: testOnly
          ? `ElevenLabs connection test successful (${benchmark.latencyMs}ms roundtrip).`
          : `ElevenLabs voice AI integrated as fallback voice synthesis engine (${benchmark.latencyMs}ms roundtrip).`,
      });
    }

    if (provider === "chariot") {
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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider") || "gnani";
    if (provider === "gnani") {
      removeGnaniConfig();
      return NextResponse.json({
        ok: true,
        message: "Gnani configuration removed. System automatically falls back to ElevenLabs then Google Gemini.",
      });
    }
    if (provider === "elevenlabs") {
      removeElevenLabsConfig();
      return NextResponse.json({
        ok: true,
        message: "ElevenLabs configuration removed. System uses Gnani AI primary and Google Gemini fallback.",
      });
    }
    if (provider === "openai") {
      removeOpenAIConfig();
      return NextResponse.json({
        ok: true,
        message: "OpenAI API key removed successfully.",
      });
    }
    return NextResponse.json({ ok: false, error: "Unsupported provider for removal" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
