import { extractProjectSpecification } from "../project-spec";
import type { GeneratedFile } from "../workspace-executor";

export const CLAUDE_CODING_MODEL = "claude-sonnet-5-5";
export const CLAUDE_MAX_OUTPUT_TOKENS = 20000;

export interface AnthropicCodingConfig {
  configured: boolean;
  model: string;
  maxOutputTokens: number;
  source: "env" | "none";
}

export interface ClaudeBenchmarkResult {
  ok: boolean;
  latencyMs: number;
  model: string;
  message?: string;
  error?: string;
  tokensUsed?: {
    input: number;
    output: number;
    total: number;
  };
}

export interface ClaudeSynthesisResult {
  ok: boolean;
  model: string;
  files: GeneratedFile[];
  latencyMs: number;
  tokensUsed?: {
    input: number;
    output: number;
    total: number;
  };
  error?: string;
}

/**
 * Internal helper to read ANTHROPIC_API_KEY strictly on the server.
 * Never expose this key to client bundles, logs, or responses.
 */
function getServerAnthropicApiKey(): string | null {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

/**
 * Returns public-safe metadata about the Claude Coding Agent configuration.
 * Never includes the raw API key.
 */
export function getAnthropicCodingConfig(): AnthropicCodingConfig {
  const key = getServerAnthropicApiKey();
  return {
    configured: Boolean(key),
    model: CLAUDE_CODING_MODEL,
    maxOutputTokens: CLAUDE_MAX_OUTPUT_TOKENS,
    source: key ? "env" : "none",
  };
}

/**
 * Clamps requested output tokens to the strict 20,000-token maximum.
 */
function clampOutputTokens(requested: number): number {
  return Math.max(64, Math.min(CLAUDE_MAX_OUTPUT_TOKENS, requested));
}

function redactSecrets(input: string): string {
  if (!input) return "";
  return input
    .replace(/sk-ant-[a-zA-Z0-9_-]+/g, "[REDACTED_KEY]")
    .replace(/sk-[a-zA-Z0-9_-]{16,}/g, "[REDACTED_KEY]")
    .replace(/AIza[a-zA-Z0-9_-]{20,}/g, "[REDACTED_KEY]");
}

/**
 * Low-level server-side call to the Anthropic Messages API (`https://api.anthropic.com/v1/messages`).
 */
async function callAnthropicMessages(params: {
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}): Promise<{
  ok: boolean;
  text: string;
  model: string;
  latencyMs: number;
  stopReason?: string;
  tokensUsed?: { input: number; output: number; total: number };
  error?: string;
}> {
  const apiKey = getServerAnthropicApiKey();
  if (!apiKey) {
    return {
      ok: false,
      text: "",
      model: CLAUDE_CODING_MODEL,
      latencyMs: 0,
      error: "Anthropic provider is not configured in server environment.",
    };
  }

  const startTime = Date.now();
  const maxTokens = clampOutputTokens(params.maxTokens ?? 16000);
  const timeoutMs = params.timeoutMs ?? 90000;

  try {
    const abortCtrl = new AbortController();
    const timer = setTimeout(() => abortCtrl.abort(), timeoutMs);

    const payload: Record<string, unknown> = {
      model: CLAUDE_CODING_MODEL,
      max_tokens: maxTokens,
      thinking: { type: "between_tools" },
      messages: params.messages,
    };

    if (params.system) {
      payload.system = params.system;
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: abortCtrl.signal,
    });
    clearTimeout(timer);

    const latencyMs = Date.now() - startTime;
    const body = await res.json().catch(() => null);

    if (!res.ok) {
      const errMsg = redactSecrets(
        body?.error?.message ||
          body?.message ||
          `Anthropic API returned HTTP ${res.status}`
      );
      return {
        ok: false,
        text: "",
        model: CLAUDE_CODING_MODEL,
        latencyMs,
        error: errMsg,
      };
    }

    const contentBlocks = Array.isArray(body?.content) ? body.content : [];
    const text = contentBlocks
      .filter((b: any) => b?.type === "text" && typeof b?.text === "string")
      .map((b: any) => b.text)
      .join("\n")
      .trim();

    const inputTokens = body?.usage?.input_tokens ?? 0;
    const outputTokens = body?.usage?.output_tokens ?? 0;

    return {
      ok: true,
      text,
      model: body?.model || CLAUDE_CODING_MODEL,
      latencyMs,
      stopReason: body?.stop_reason,
      tokensUsed: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
      },
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      ok: false,
      text: "",
      model: CLAUDE_CODING_MODEL,
      latencyMs,
      error: err?.name === "AbortError" ? "Anthropic API request timed out" : err?.message || String(err),
    };
  }
}

/**
 * Verifies live connectivity and model availability for `claude-sonnet-5-5`.
 */
export async function testClaudeConnection(): Promise<ClaudeBenchmarkResult> {
  const res = await callAnthropicMessages({
    system: "You are a health check responder. Reply only with OK.",
    messages: [{ role: "user", content: "ping" }],
    maxTokens: 32,
    temperature: 0,
    timeoutMs: 15000,
  });

  if (!res.ok) {
    return {
      ok: false,
      latencyMs: res.latencyMs,
      model: CLAUDE_CODING_MODEL,
      error: res.error,
    };
  }

  return {
    ok: true,
    latencyMs: res.latencyMs,
    model: res.model,
    message: `Claude Sonnet 5.5 (${res.model}) coding agent online (${res.latencyMs}ms).`,
    tokensUsed: res.tokensUsed,
  };
}

/**
 * Extracts a JSON object containing `{ files: [...] }` from Claude's response text.
 */
function parseFilesJsonFromClaudeResponse(rawText: string): Array<{ path: string; content: string }> | null {
  if (!rawText) return null;

  const candidates: string[] = [];

  // 1. Try fenced ```json block if present
  const jsonFenceMatch = rawText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
  if (jsonFenceMatch && jsonFenceMatch[1]) {
    candidates.push(jsonFenceMatch[1].trim());
  }

  // 2. Try outermost { ... }
  const firstBrace = rawText.indexOf("{");
  const lastBrace = rawText.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(rawText.slice(firstBrace, lastBrace + 1).trim());
  }

  // 3. Raw text directly
  candidates.push(rawText.trim());

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed?.files) && parsed.files.length > 0) {
        const validFiles = parsed.files.filter(
          (f: any) => f && typeof f.path === "string" && typeof f.content === "string"
        );
        if (validFiles.length > 0) {
          return validFiles;
        }
      }
    } catch {
      // Continue trying next candidate format
    }
  }

  // Fallback recovery: extract complete {"path": "...", "content": "..."} objects even if trailing JSON was truncated
  try {
    const recovered: Array<{ path: string; content: string }> = [];
    const fileBlockRegex = /\{\s*"path"\s*:\s*"([^"]+)"\s*,\s*"content"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}/g;
    let match: RegExpExecArray | null;
    while ((match = fileBlockRegex.exec(rawText)) !== null) {
      try {
        const pathVal = JSON.parse(`"${match[1]}"`);
        const contentVal = JSON.parse(`"${match[2]}"`);
        if (pathVal && typeof contentVal === "string") {
          recovered.push({ path: pathVal, content: contentVal });
        }
      } catch {}
    }
    if (recovered.length > 0) {
      return recovered;
    }
  } catch {}

  return null;
}

/**
 * Synthesizes or incrementally updates a software application using Anthropic Claude Sonnet 5.5 (`claude-sonnet-5-5`).
 * Uses focused context and adheres to the 20,000 output token ceiling.
 */
export async function synthesizeProjectWithClaude(
  prompt: string,
  title: string,
  history?: Array<{ role: string; content: string }>,
  existingFiles?: Array<{ path: string; content: string }>
): Promise<ClaudeSynthesisResult> {
  const apiKey = getServerAnthropicApiKey();
  if (!apiKey) {
    return {
      ok: false,
      model: CLAUDE_CODING_MODEL,
      files: [],
      latencyMs: 0,
      error: "ANTHROPIC_API_KEY not configured",
    };
  }

  const spec = extractProjectSpecification(prompt, history);
  const effectiveTitle = title || spec.projectName;
  const slug =
    effectiveTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "project";

  // Keep conversation context comprehensive (last 10 turns) so iterative requirements are fully retained
  const historyContext =
    history && history.length > 0
      ? `\nRECENT CONVERSATION & ITERATION HISTORY:\n${history
          .slice(-10)
          .map((h) => `${h.role.toUpperCase()}: ${h.content.slice(0, 900)}`)
          .join("\n")}\n`
      : "";

  // Check if modifying/evolving an existing workspace application
  const hasExistingApp =
    Array.isArray(existingFiles) &&
    existingFiles.some((f) => f.path === "src/components/App.tsx" && f.content.length > 100);

  let existingWorkspaceSection = "";
  let iterativeModeDirective = "";
  if (hasExistingApp && existingFiles) {
    const focusedFiles = existingFiles
      .filter((f) =>
        ["src/components/App.tsx", "src/types/index.ts", "tests/app.test.ts", "package.json"].includes(f.path)
      )
      .map((f) => `### Existing File: ${f.path}\n\`\`\`\n${f.content.slice(0, 32000)}\n\`\`\``)
      .join("\n\n");

    if (focusedFiles) {
      existingWorkspaceSection = `\nEXISTING WORKSPACE CODEBASE (Active Project in Sandbox):\n${focusedFiles}\n`;
      iterativeModeDirective = `
ITERATIVE PRODUCT EVOLUTION DIRECTIVE:
- An active application already exists in this workspace (shown above).
- If the user is asking to make changes, add a feature, refine the UI/UX, fix an issue, or "take it to an entire product level" / expand the existing project:
  1. PRESERVE all existing working domain features, data models, tabs, and interactive workflows from the existing "src/components/App.tsx".
  2. SEAMLESSLY INTEGRATE AND EXPAND the codebase with every newly requested feature, workflow, modal, analytics view, filter, validation rule, or product-grade enhancement.
  3. If the user asks to elevate or take the project to a full product level, expand it into a comprehensive, multi-view production suite with rich domain data, end-to-end interactive workflows, search/filtering, summary KPIs, modals/drawers, and polished visual design.
- Only replace the domain entirely if the user explicitly asks to build a completely different, unrelated type of application.`;
    }
  }

  const systemPrompt = `You are Vyrexo's Principal Coding Agent powered by Anthropic Claude Sonnet 5.5 (${CLAUDE_CODING_MODEL}).
Your role is to architect and implement complete, production-grade, deeply interactive React (TypeScript) software applications and executable unit tests.
Take the necessary time and care to fulfill every single condition and requirement of the product specification without cutting corners.

PROJECT SPECIFICATION:
- Application Title: "${effectiveTitle}"
- Project Type: "${spec.projectType}"
- Purpose: ${spec.purpose}
- Target Users: ${spec.targetUsers}
- Core Features: ${spec.coreFeatures.join("; ")}
${historyContext}${existingWorkspaceSection}${iterativeModeDirective}

CRITICAL ENGINEERING & QUALITY REQUIREMENTS:
1. "src/components/App.tsx":
   - Must be a complete, self-contained single-page React application component named "App" and exported via "export default App;" (and "export function App()").
   - Include "use client"; at the top.
   - Write a thorough, feature-complete, production-grade implementation (typically 300 to 650+ lines of well-structured TypeScript/JSX) that implements every requested workflow, view, and interactive feature in full detail.
   - Zero placeholders, zero "TODO" comments, and zero stubbed buttons. Every button, search bar, filter, modal, tab, form input, stepper, and interactive control must work with real React state (useState, useEffect, useMemo, useCallback).
   - Use Tailwind CSS utility classes for a refined, high-contrast, responsive UI with clear visual hierarchy, status badges, KPI cards, and interactive feedback.
   - Use FontAwesome 6 icons via standard HTML <i> tags (e.g., <i className="fa-solid fa-train"></i>).
   - Do NOT import external third-party packages like 'lucide-react', '@fortawesome/*', or external chart libraries; keep all subcomponents, modals, and helpers self-contained inside "src/components/App.tsx" so it compiles cleanly in a single bundle via Bun.
2. "src/types/index.ts":
   - Complete TypeScript interfaces and domain types for the application.
3. "package.json":
   - Valid JSON with name "${slug}", version "1.0.0", scripts: {"dev": "vite --port 5173", "build": "bun build src/components/App.tsx --outdir dist", "test": "bun test tests/app.test.ts"}.
4. "tests/app.test.ts":
   - Real executable unit tests using ONLY: import { test, expect } from "bun:test";
   - Include 4 to 6 meaningful unit test assertions verifying core calculations, filtering, state transitions, and domain invariants for "${effectiveTitle}". Do not import DOM/React rendering libraries in tests/app.test.ts; test pure domain logic and data invariants so "bun test" runs deterministically.
5. "README.md":
   - Comprehensive architectural overview, implemented features, and verification commands.

OUTPUT FORMAT:
Respond ONLY with a single valid JSON object (no markdown commentary outside the JSON) matching this exact schema:
{
  "files": [
    { "path": "src/components/App.tsx", "content": "..." },
    { "path": "src/types/index.ts", "content": "..." },
    { "path": "package.json", "content": "..." },
    { "path": "tests/app.test.ts", "content": "..." },
    { "path": "README.md", "content": "..." }
  ]
}`;

  const userMessage = hasExistingApp
    ? `Execute this iterative upgrade / feature implementation on the existing project ("${effectiveTitle}") for the user request: "${prompt}". Fulfill every requirement thoroughly, preserve existing working capabilities while adding the new features/improvements, and return ONLY the valid JSON object.`
    : `Implement the complete, production-grade application files for the user request: "${prompt}" (Project Title: "${effectiveTitle}"). Fulfill every requirement thoroughly, ensure every interactive feature works end-to-end, and return ONLY the valid JSON object.`;

  // Allocate 19,500 max_tokens (strictly within the 20,000-token cap) and 180s timeout for thorough, high-quality synthesis
  const response = await callAnthropicMessages({
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
    maxTokens: clampOutputTokens(19500),
    timeoutMs: 180000,
  });

  if (!response.ok) {
    return {
      ok: false,
      model: CLAUDE_CODING_MODEL,
      files: [],
      latencyMs: response.latencyMs,
      error: response.error,
    };
  }

  const parsedFiles = parseFilesJsonFromClaudeResponse(response.text);
  if (!parsedFiles || parsedFiles.length === 0) {
    return {
      ok: false,
      model: response.model,
      files: [],
      latencyMs: response.latencyMs,
      tokensUsed: response.tokensUsed,
      error: "Claude response did not contain a valid files JSON array",
    };
  }

  const files: GeneratedFile[] = parsedFiles.map((f) => ({
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
    message: `Authored ${f.path} via Claude Sonnet 5.5 (${CLAUDE_CODING_MODEL})`,
  }));

  return {
    ok: true,
    model: response.model,
    files,
    latencyMs: response.latencyMs,
    tokensUsed: response.tokensUsed,
  };
}

/**
 * Focused, incremental code repair using Claude Sonnet 5.5 (`claude-sonnet-5-5`).
 * Inspects compiler errors, unit test errors, or live acceptance test failures and returns the fixed file content.
 */
export async function repairCodeWithClaude(params: {
  projectTitle: string;
  targetFile: { path: string; content: string };
  failureSummary: string;
  consoleErrors?: string[];
  compilerError?: string;
}): Promise<{
  ok: boolean;
  patchedCode: string;
  patchDescription: string;
  latencyMs: number;
  error?: string;
}> {
  const { projectTitle, targetFile, failureSummary, consoleErrors = [], compilerError } = params;

  const systemPrompt = `You are Vyrexo's Autonomous Code Repair Engineer powered by Anthropic Claude Sonnet 5.5 (${CLAUDE_CODING_MODEL}).
Your task is to inspect a specific failure (compilation error, unit test failure, or runtime DOM test failure) and return the complete, corrected code for "${targetFile.path}".
Rules:
- Preserve all working functionality in "${targetFile.path}".
- Fix the exact root cause reported in the diagnostics.
- Ensure "src/components/App.tsx" exports "App" ("export default App;") and has zero external package imports besides "react".
- Return ONLY the complete, valid source code for "${targetFile.path}".`;

  const userPrompt = `Project: ${projectTitle}
Target File: ${targetFile.path}

Failure Summary:
${failureSummary}

${compilerError ? `Compiler / Test Runner Output:\n${compilerError}\n` : ""}
${consoleErrors.length > 0 ? `Console / Runtime Errors:\n${consoleErrors.join("\n")}\n` : ""}

Current Code of "${targetFile.path}":
\`\`\`tsx
${targetFile.content.slice(0, 24000)}
\`\`\`

Return ONLY the complete corrected code for "${targetFile.path}" inside a single \`\`\`tsx code block.`;

  const res = await callAnthropicMessages({
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: clampOutputTokens(12000),
    temperature: 0.15,
    timeoutMs: 60000,
  });

  if (!res.ok || !res.text) {
    return {
      ok: false,
      patchedCode: "",
      patchDescription: "",
      latencyMs: res.latencyMs,
      error: res.error || "Empty repair response from Claude",
    };
  }

  const codeBlockMatch = res.text.match(/```(?:tsx|typescript|ts|jsx|js|json)?\s*([\s\S]*?)```/i);
  const patchedCode = (codeBlockMatch ? codeBlockMatch[1] : res.text).trim();

  return {
    ok: patchedCode.length > 20,
    patchedCode,
    patchDescription: `Repaired ${targetFile.path} with Claude Sonnet 5.5 (${CLAUDE_CODING_MODEL})`,
    latencyMs: res.latencyMs,
  };
}
