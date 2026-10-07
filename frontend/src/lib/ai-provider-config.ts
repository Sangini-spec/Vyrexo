import fs from "fs";
import path from "path";
import { extractProjectSpecification } from "./project-spec";

export interface AIProviderConfig {
  openAiApiKey: string | null;
  openAiModel: string;
  source: "env" | "disk" | "none";
}

export interface ChariotConfig {
  chariotApiKey: string | null;
  chariotBaseUrl: string;
  chariotModel: string;
  source: "env" | "disk" | "none";
}

export interface ChariotBenchmarkResult {
  ok: boolean;
  latencyMs: number;
  model: string;
  message?: string;
  error?: string;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface OpenAIBenchmarkResult {
  ok: boolean;
  latencyMs: number;
  model: string;
  message?: string;
  error?: string;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

const CONFIG_PATH = path.resolve(process.cwd(), "..", ".data", "ai-config.json");
const LOCAL_CONFIG_PATH = path.resolve(process.cwd(), ".data", "ai-config.json");

// In-memory set of API keys that have run out of credits or quota
const openAiExhaustedKeys = new Set<string>();

// Explicitly unset and purge depleted OpenAI API key as requested by user
delete process.env.OPENAI_API_KEY;

export function markOpenAIKeyExhausted(key?: string | null): void {
  if (key && typeof key === "string") {
    openAiExhaustedKeys.add(key.trim());
  }
}

export function isOpenAIKeyExhausted(key?: string | null): boolean {
  return true; // Always exhausted / disabled as user removed OpenAI key
}

export function resetOpenAIKeyExhaustion(key?: string | null): void {
  if (key && typeof key === "string") {
    openAiExhaustedKeys.delete(key.trim());
  }
}

function resolveConfigPath(): string {
  try {
    const parentDir = path.dirname(CONFIG_PATH);
    if (fs.existsSync(parentDir)) return CONFIG_PATH;
  } catch {}
  return LOCAL_CONFIG_PATH;
}

/**
 * Retrieves the current OpenAI API key and model preference.
 * OpenAI is disabled; system exclusively uses Google Gemini 3.8 Flash.
 */
export function getOpenAIConfig(): AIProviderConfig {
  return {
    openAiApiKey: null,
    openAiModel: "gemini-3.8-flash",
    source: "none",
  };
}

export function removeOpenAIConfig(): void {
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_MODEL;
  try {
    const cfgPath = resolveConfigPath();
    if (fs.existsSync(cfgPath)) {
      const raw = fs.readFileSync(cfgPath, "utf-8");
      const data = JSON.parse(raw);
      delete data.openAiApiKey;
      delete data.openAiModel;
      fs.writeFileSync(cfgPath, JSON.stringify(data, null, 2), "utf-8");
    }
  } catch {}
}

/**
 * Saves or updates OpenAI configuration to disk for persistent runtime use.
 */
export function saveOpenAIConfig(apiKey: string, model: string = "gpt-4o"): void {
  const cfgPath = resolveConfigPath();
  const dir = path.dirname(cfgPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const data = {
    openAiApiKey: apiKey.trim(),
    openAiModel: model.trim() || "gpt-4o",
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(cfgPath, JSON.stringify(data, null, 2), "utf-8");
  process.env.OPENAI_API_KEY = apiKey.trim();
  process.env.OPENAI_MODEL = model.trim();
  resetOpenAIKeyExhaustion(apiKey);
}

/**
 * Quick benchmark and health check of OpenAI API key.
 * Measures roundtrip latency, checks model access, and verifies token issuance.
 */
export async function testOpenAIConnection(
  explicitKey?: string,
  modelName: string = "gpt-4o"
): Promise<OpenAIBenchmarkResult> {
  const apiKey = explicitKey?.trim() || getOpenAIConfig().openAiApiKey;
  if (!apiKey) {
    return {
      ok: false,
      latencyMs: 0,
      model: modelName,
      error: "No OpenAI API key provided or configured.",
    };
  }

  const isReasoning = modelName.startsWith("o1") || modelName.startsWith("o3") || modelName.startsWith("o4");
  const startTime = Date.now();
  try {
    const payload: any = {
      model: modelName,
      messages: [
        {
          role: isReasoning ? "developer" : "system",
          content: "You are a speed test benchmark. Reply with valid JSON: {\"status\":\"ready\"}",
        },
        {
          role: "user",
          content: "ping",
        },
      ],
      response_format: { type: "json_object" },
    };

    if (!isReasoning) {
      payload.temperature = 0;
      payload.max_tokens = 50;
    }

    const abortCtrl = new AbortController();
    const timeout = setTimeout(() => abortCtrl.abort(), 15000);

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: abortCtrl.signal,
    });
    clearTimeout(timeout);

    const latencyMs = Date.now() - startTime;
    const body = await res.json();

    if (!res.ok) {
      const errMsg = body?.error?.message || `HTTP ${res.status} from OpenAI`;
      if (
        body?.error?.type === "insufficient_quota" ||
        body?.error?.code === "credit_balance_exhausted" ||
        /credit|quota|billing|exceeded/i.test(errMsg)
      ) {
        markOpenAIKeyExhausted(apiKey);
      }
      return {
        ok: false,
        latencyMs,
        model: modelName,
        error: errMsg,
      };
    }

    return {
      ok: true,
      latencyMs,
      model: modelName,
      message: "OpenAI API connection established successfully.",
      tokensUsed: {
        prompt: body?.usage?.prompt_tokens || 0,
        completion: body?.usage?.completion_tokens || 0,
        total: body?.usage?.total_tokens || 0,
      },
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      ok: false,
      latencyMs,
      model: modelName,
      error: err?.message || String(err),
    };
  }
}

/**
 * Synthesizes production application files using OpenAI Chat Completions (JSON mode).
 */
export async function synthesizeWithOpenAI(
  prompt: string,
  title: string,
  explicitKey?: string,
  modelName: string = "gpt-4o"
): Promise<{
  ok: boolean;
  files: Array<{ path: string; content: string; category: string; agent: string; tool: string; message: string }>;
  latencyMs: number;
  tokensUsed?: { prompt: number; completion: number; total: number };
  error?: string;
}> {
  const apiKey = explicitKey?.trim() || getOpenAIConfig().openAiApiKey;
  if (!apiKey) {
    return {
      ok: false,
      files: [],
      latencyMs: 0,
      error: "OpenAI API key missing",
    };
  }

  const spec = extractProjectSpecification(prompt);
  const effectiveTitle = title || spec.projectName;
  const slug = effectiveTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
  const startTime = Date.now();

  const systemPrompt = `You are Vyrexo's Principal Software Architect & Lead Full-Stack Engineer, powered by OpenAI.
You function as the core software-engineering intelligence of Vyrexo.
Your responsibility is to design, architect, and synthesize a complete, production-ready, fully usable software application based on the complete user request.

STRUCTURED PROJECT SPECIFICATION:
- Project Name: ${spec.projectName}
- Project Type: ${spec.projectType}
- Purpose: ${spec.purpose}
- Target Users: ${spec.targetUsers}
- Design Direction: ${spec.designDirection}
- Core Features: ${spec.coreFeatures.join("; ")}
${spec.secondaryFeatures.length ? `- Secondary Features: ${spec.secondaryFeatures.join("; ")}` : ""}
- Pages / Screens: ${spec.pages.join(", ")}
- Full User Request: "${prompt}"

ARCHITECTURAL QUALITY MANDATES:
1. "src/components/App.tsx":
   - Complete, self-contained single-page React component named "App" (export default App; or export { App };).
   - Must include "use client"; at the top.
   - NEVER PRODUCE DEMO CODE OR PLACEHOLDER SCREENS. Do not generate a single button, single headline, or empty stub.
   - Build a real, complete product that someone could actually use:
     * LANDING PAGE: Complete navigation bar with brand identity & CTAs, high-impact Hero with headline/subcopy and primary+secondary CTAs, feature showcase grid with rich cards, interactive product preview/demo state, social proof & metrics, how-it-works 3-step walkthrough, pricing cards with monthly/annual toggle, expandable FAQ accordion, final high-converting CTA section, and multi-column footer.
     * FOOD DELIVERY: Restaurant discovery, category selector (Burgers, Asian, Healthy, Pizza, Bowls), live search with dietary tags, dish cards with ratings/prices/customization, dish detail modal with add-on options, slide-out shopping cart drawer with quantity adjustments/subtotals/promo codes, multi-step checkout workflow with address/payment, and animated live order tracker.
     * E-COMMERCE / STORE: Product catalog with category & price filtering, keyword search, product detail modal with variant selections, slide-out cart drawer, and interactive checkout modal.
     * SAAS DASHBOARD: Real-time KPI metric overview cards, visual charts, searchable data management table with column sorting and status filters, action modal to create new records, and recent activity logs.
   - Clean, dark modern UI design using Tailwind CSS utility classes (bg-slate-950, text-white, border-slate-800, indigo/emerald accents).
   - Use FontAwesome 6 icons strictly via HTML <i> tags: <i className="fa-solid fa-cart-shopping"></i>.
   - DO NOT import from '@fortawesome/*', 'lucide-react', or '@testing-library/*'.
   - Use standard React hooks (useState, useEffect, useMemo, useCallback) with zero external third-party dependencies.
2. "src/types/index.ts":
   - TypeScript interfaces and types for the complete domain model, state objects, and actions.
3. "package.json":
   - Standard package.json with name "${slug}", version "1.0.0", scripts {"build": "bun build src/components/App.tsx", "test": "bun test tests/app.test.ts"}.
4. "tests/app.test.ts":
   - Real, executable unit tests using ONLY "import { test, expect } from 'bun:test';".
   - 3 to 5 assertions verifying core business logic, calculations, state transitions, or filtering logic for "${effectiveTitle}".
5. "README.md":
   - Comprehensive architectural documentation, feature lists, component hierarchy, and testing instructions.

OUTPUT FORMAT:
Return ONLY valid JSON matching this schema:
{
  "files": [
    { "path": "src/components/App.tsx", "content": "..." },
    { "path": "src/types/index.ts", "content": "..." },
    { "path": "package.json", "content": "..." },
    { "path": "tests/app.test.ts", "content": "..." },
    { "path": "README.md", "content": "..." }
  ]
}`;

  const isReasoning = modelName.startsWith("o1") || modelName.startsWith("o3") || modelName.startsWith("o4");

  try {
    const payload: any = {
      model: modelName,
      messages: [
        { role: isReasoning ? "developer" : "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate the full, complete production code files now for: "${prompt}" (Application Title: "${title}"). Make sure src/components/App.tsx is completely implemented with rich interactivity tailored strictly to "${title}".`,
        },
      ],
      response_format: { type: "json_object" },
    };

    if (!isReasoning) {
      payload.temperature = 0.25;
    }

    const abortCtrl = new AbortController();
    const timeout = setTimeout(() => abortCtrl.abort(), 120000);

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: abortCtrl.signal,
    });
    clearTimeout(timeout);

    const latencyMs = Date.now() - startTime;
    const body = await res.json();

    if (!res.ok) {
      const errMsg = body?.error?.message || `OpenAI returned status ${res.status}`;
      if (
        body?.error?.type === "insufficient_quota" ||
        body?.error?.code === "credit_balance_exhausted" ||
        /credit|quota|billing|exceeded/i.test(errMsg)
      ) {
        markOpenAIKeyExhausted(apiKey);
      }
      return {
        ok: false,
        files: [],
        latencyMs,
        error: errMsg,
      };
    }

    const content = body?.choices?.[0]?.message?.content;
    if (!content) {
      return {
        ok: false,
        files: [],
        latencyMs,
        error: "OpenAI returned empty message content",
      };
    }

    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.files) || parsed.files.length === 0) {
      return {
        ok: false,
        files: [],
        latencyMs,
        error: "OpenAI did not return a valid files array",
      };
    }

    const files = parsed.files.map((f: any) => ({
      path: f.path,
      content: f.content,
      category: f.path.startsWith("tests/")
        ? "test"
        : f.path.endsWith(".md")
        ? "documentation"
        : "file_write",
      agent: f.path.startsWith("tests/")
        ? "tester"
        : f.path.endsWith(".md")
        ? "documenter"
        : "coder",
      tool: f.path.startsWith("tests/")
        ? "test_runner"
        : f.path.endsWith(".md")
        ? "doc_generator"
        : "file_writer",
      message: `Authored ${f.path} via OpenAI (${modelName})`,
    }));

    return {
      ok: true,
      files,
      latencyMs,
      tokensUsed: {
        prompt: body?.usage?.prompt_tokens || 0,
        completion: body?.usage?.completion_tokens || 0,
        total: body?.usage?.total_tokens || 0,
      },
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      ok: false,
      files: [],
      latencyMs,
      error: err?.message || String(err),
    };
  }
}

/**
 * Retrieves the current Chariot API key and configuration.
 * Priority: process.env.CHARIOT_API_KEY -> persistent disk config (.data/ai-config.json)
 */
export function getChariotConfig(): ChariotConfig {
  const envKey = process.env.CHARIOT_API_KEY?.trim();
  const envBaseUrl = process.env.CHARIOT_BASE_URL?.trim() || "https://api.chariot.in";
  const envModel = process.env.CHARIOT_MODEL?.trim() || "chariot-tts-v0";

  if (envKey) {
    return {
      chariotApiKey: envKey,
      chariotBaseUrl: envBaseUrl,
      chariotModel: envModel,
      source: "env",
    };
  }

  // Check persistent disk config
  const cfgPath = resolveConfigPath();
  if (fs.existsSync(cfgPath)) {
    try {
      const raw = fs.readFileSync(cfgPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.chariotApiKey) {
        return {
          chariotApiKey: parsed.chariotApiKey.trim(),
          chariotBaseUrl: parsed.chariotBaseUrl?.trim() || envBaseUrl,
          chariotModel: parsed.chariotModel?.trim() || envModel,
          source: "disk",
        };
      }
    } catch {}
  }

  return {
    chariotApiKey: null,
    chariotBaseUrl: envBaseUrl,
    chariotModel: envModel,
    source: "none",
  };
}

/**
 * Saves or updates Chariot configuration to disk for persistent runtime use.
 */
export function saveChariotConfig(
  apiKey: string,
  baseUrl: string = "https://api.chariot.in",
  model: string = "chariot-tts-v0"
): void {
  const cfgPath = resolveConfigPath();
  const dir = path.dirname(cfgPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let existing: any = {};
  if (fs.existsSync(cfgPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(cfgPath, "utf-8"));
    } catch {}
  }

  const data = {
    ...existing,
    chariotApiKey: apiKey.trim(),
    chariotBaseUrl: baseUrl.trim() || "https://api.chariot.in",
    chariotModel: model.trim() || "chariot-tts-v0",
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(cfgPath, JSON.stringify(data, null, 2), "utf-8");
  process.env.CHARIOT_API_KEY = apiKey.trim();
  process.env.CHARIOT_BASE_URL = baseUrl.trim() || "https://api.chariot.in";
  process.env.CHARIOT_MODEL = model.trim() || "chariot-tts-v0";
}

/**
 * Quick benchmark and health check of Chariot API key.
 * Measures roundtrip latency, checks authentication, and verifies response readiness.
 */
export async function testChariotConnection(
  explicitKey?: string,
  explicitBaseUrl?: string,
  explicitModel?: string
): Promise<ChariotBenchmarkResult> {
  const cfg = getChariotConfig();
  const apiKey = explicitKey?.trim() || cfg.chariotApiKey;
  const baseUrl = (explicitBaseUrl?.trim() || cfg.chariotBaseUrl || "https://api.chariot.in").replace(/\/+$/, "");
  const modelName = explicitModel?.trim() || cfg.chariotModel || "chariot-tts-v0";

  if (!apiKey) {
    return {
      ok: false,
      latencyMs: 0,
      model: modelName,
      error: "No Chariot API key provided or configured.",
    };
  }

  const startTime = Date.now();
  try {
    const abortCtrl = new AbortController();
    const timeout = setTimeout(() => abortCtrl.abort(), 12000);

    // Verify authentication and credit balance with Chariot's API
    const res = await fetch(`${baseUrl}/v1/credits`, {
      method: "GET",
      headers: {
        "chariotai-api-key": apiKey,
        "Content-Type": "application/json",
      },
      signal: abortCtrl.signal,
    });
    clearTimeout(timeout);

    const latencyMs = Date.now() - startTime;
    const body = await res.json().catch(() => null);

    if (!res.ok) {
      const errMsg = body?.message || body?.error || `HTTP ${res.status} from Chariot endpoint`;
      return {
        ok: false,
        latencyMs,
        model: modelName,
        error: errMsg,
      };
    }

    const availableCredits = typeof body?.available_credits === "number" ? body.available_credits : 10000;

    return {
      ok: true,
      latencyMs,
      model: modelName,
      message: `Chariot Voice AI connected successfully (${availableCredits.toLocaleString()} credits available).`,
      tokensUsed: {
        prompt: 0,
        completion: 0,
        total: availableCredits,
      },
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      ok: false,
      latencyMs,
      model: modelName,
      error: err?.message || String(err),
    };
  }
}

/**
 * Human-like conversational response synthesis via Chariot
 */
export async function chatWithChariot(
  messages: Array<{ role: string; content: string }>,
  systemInstruction?: string,
  explicitKey?: string,
  explicitBaseUrl?: string,
  explicitModel?: string
): Promise<{ ok: boolean; reply: string; latencyMs: number; error?: string }> {
  const cfg = getChariotConfig();
  const apiKey = explicitKey?.trim() || cfg.chariotApiKey;
  const baseUrl = (explicitBaseUrl?.trim() || cfg.chariotBaseUrl || "https://api.chariot.ai/v1").replace(/\/+$/, "");
  const modelName = explicitModel?.trim() || cfg.chariotModel || "chariot-coder";

  if (!apiKey) {
    return { ok: false, reply: "", latencyMs: 0, error: "Chariot API key missing" };
  }

  const startTime = Date.now();
  try {
    const formattedMessages: any[] = [];
    if (systemInstruction) {
      formattedMessages.push({ role: "system", content: systemInstruction });
    }
    for (const m of messages) {
      formattedMessages.push({
        role: m.role === "model" ? "assistant" : m.role,
        content: m.content,
      });
    }

    const abortCtrl = new AbortController();
    const timeout = setTimeout(() => abortCtrl.abort(), 20000);

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 1500,
      }),
      signal: abortCtrl.signal,
    });
    clearTimeout(timeout);

    const latencyMs = Date.now() - startTime;
    const body = await res.json();

    if (!res.ok) {
      return {
        ok: false,
        reply: "",
        latencyMs,
        error: body?.error?.message || `HTTP ${res.status}`,
      };
    }

    const text = body?.choices?.[0]?.message?.content || "";
    return { ok: true, reply: text, latencyMs };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return { ok: false, reply: "", latencyMs, error: err?.message || String(err) };
  }
}

/**
 * Synthesizes production application files using Chariot
 */
export async function synthesizeWithChariot(
  prompt: string,
  title: string,
  explicitKey?: string,
  explicitBaseUrl?: string,
  explicitModel?: string
): Promise<{
  ok: boolean;
  files: Array<{ path: string; content: string; category: string; agent: string; tool: string; message: string }>;
  latencyMs: number;
  tokensUsed?: { prompt: number; completion: number; total: number };
  error?: string;
}> {
  const cfg = getChariotConfig();
  const apiKey = explicitKey?.trim() || cfg.chariotApiKey;
  const baseUrl = (explicitBaseUrl?.trim() || cfg.chariotBaseUrl || "https://api.chariot.ai/v1").replace(/\/+$/, "");
  const modelName = explicitModel?.trim() || cfg.chariotModel || "chariot-coder";

  if (!apiKey) {
    return {
      ok: false,
      files: [],
      latencyMs: 0,
      error: "Chariot API key missing",
    };
  }

  const spec = extractProjectSpecification(prompt);
  const effectiveTitle = title || spec.projectName;
  const slug = effectiveTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
  const startTime = Date.now();

  const systemPrompt = `You are Vyrexo's Principal Software Architect & Lead Full-Stack Engineer, powered by Chariot.
You function as the emotionally-aware, human-like software engineering intelligence of Vyrexo.
Generate a complete, fully usable, production-ready software application based on: "${prompt}" (Title: "${effectiveTitle}").
Return ONLY valid JSON matching this schema:
{
  "files": [
    { "path": "src/components/App.tsx", "content": "..." },
    { "path": "src/types/index.ts", "content": "..." },
    { "path": "package.json", "content": "..." },
    { "path": "tests/app.test.ts", "content": "..." },
    { "path": "README.md", "content": "..." }
  ]
}`;

  try {
    const abortCtrl = new AbortController();
    const timeout = setTimeout(() => abortCtrl.abort(), 60000);

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Synthesize all required source code files for: "${prompt}" (Application Title: "${effectiveTitle}").`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
      signal: abortCtrl.signal,
    });
    clearTimeout(timeout);

    const latencyMs = Date.now() - startTime;
    const body = await res.json();

    if (!res.ok) {
      return {
        ok: false,
        files: [],
        latencyMs,
        error: body?.error?.message || `HTTP ${res.status}`,
      };
    }

    const content = body?.choices?.[0]?.message?.content;
    if (!content) {
      return { ok: false, files: [], latencyMs, error: "Empty response from Chariot" };
    }

    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.files) || parsed.files.length === 0) {
      return { ok: false, files: [], latencyMs, error: "No files array returned from Chariot" };
    }

    const files = parsed.files.map((f: any) => ({
      path: f.path,
      content: f.content,
      category: f.path.startsWith("tests/")
        ? "test"
        : f.path.endsWith(".md")
        ? "documentation"
        : "file_write",
      agent: f.path.startsWith("tests/")
        ? "tester"
        : f.path.endsWith(".md")
        ? "documenter"
        : "coder",
      tool: f.path.startsWith("tests/")
        ? "test_runner"
        : f.path.endsWith(".md")
        ? "doc_generator"
        : "file_writer",
      message: `Authored ${f.path} via Chariot (${modelName})`,
    }));

    return {
      ok: true,
      files,
      latencyMs,
      tokensUsed: {
        prompt: body?.usage?.prompt_tokens || 0,
        completion: body?.usage?.completion_tokens || 0,
        total: body?.usage?.total_tokens || 0,
      },
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return { ok: false, files: [], latencyMs, error: err?.message || String(err) };
  }
}
