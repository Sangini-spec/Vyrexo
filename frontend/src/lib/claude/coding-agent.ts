import { extractProjectSpecification } from "../project-spec";
import type { GeneratedFile } from "../workspace-executor";
import {
  redactSensitiveData,
  wrapUntrustedContent,
  validateEnvironmentSecurity,
  recordAuditEvent,
} from "../security/governance";

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
 * Validates ANTHROPIC_MODEL configuration without treating the model identifier as a secret.
 */
export function getAnthropicCodingConfig(): AnthropicCodingConfig {
  const key = getServerAnthropicApiKey();
  const envStatus = validateEnvironmentSecurity();
  return {
    configured: Boolean(key),
    model: envStatus.providers.anthropicModel || CLAUDE_CODING_MODEL,
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
  return redactSensitiveData(input);
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
  const timeoutMs = params.timeoutMs ?? 120000;
  const configuredModel = getAnthropicCodingConfig().model || CLAUDE_CODING_MODEL;
  const candidateModels = Array.from(
    new Set([
      configuredModel,
      CLAUDE_CODING_MODEL,
      "claude-sonnet-5",
      "claude-sonnet-4-6",
    ])
  );

  let lastError = "Anthropic API request failed";

  for (const modelId of candidateModels) {
    try {
      const abortCtrl = new AbortController();
      const timer = setTimeout(() => abortCtrl.abort(), timeoutMs);

      // Note: Do NOT send `temperature` because `claude-sonnet-5-5` deprecates `temperature`
      // and rejects requests containing it with HTTP 400 invalid_request_error.
      // Use `output_config: { effort: "low" }` on Sonnet 5.x models so 100% of `max_tokens`
      // are dedicated to direct code output rather than consuming 15k+ internal thinking tokens.
      const payload: Record<string, unknown> = {
        model: modelId,
        max_tokens: maxTokens,
        messages: params.messages,
      };

      if (modelId.includes("sonnet-5") || modelId.includes("opus-4-7")) {
        payload.output_config = { effort: "low" };
      }

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
        lastError = errMsg;
        // If the account does not have access to this specific model identifier, try next Sonnet tier
        if (
          res.status === 404 ||
          /model|not_found/i.test(errMsg)
        ) {
          continue;
        }
        return {
          ok: false,
          text: "",
          model: configuredModel,
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
        model: body?.model || modelId,
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
        model: configuredModel,
        latencyMs,
        error: err?.name === "AbortError" ? "Anthropic API request timed out" : err?.message || String(err),
      };
    }
  }

  return {
    ok: false,
    text: "",
    model: configuredModel,
    latencyMs: Date.now() - startTime,
    error: lastError,
  };
}

/**
 * Verifies live connectivity and model availability for `claude-sonnet-5-5`.
 */
export async function testClaudeConnection(): Promise<ClaudeBenchmarkResult> {
  const res = await callAnthropicMessages({
    system: "You are a health check responder. Reply only with OK.",
    messages: [{ role: "user", content: "ping" }],
    maxTokens: 64,
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
 * Linear-time O(N) JSON string scanner to recover {"path": "...", "content": "..."}
 * entries without catastrophic regex backtracking if trailing JSON was truncated.
 */
function scanJsonStringLiteral(text: string, openQuoteIndex: number): { value: string; nextIndex: number } | null {
  if (text[openQuoteIndex] !== '"') return null;
  let out = "";
  let i = openQuoteIndex + 1;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\\") {
      if (i + 1 >= text.length) break;
      const next = text[i + 1];
      if (next === '"') out += '"';
      else if (next === "\\") out += "\\";
      else if (next === "/") out += "/";
      else if (next === "n") out += "\n";
      else if (next === "r") out += "\r";
      else if (next === "t") out += "\t";
      else if (next === "b") out += "\b";
      else if (next === "f") out += "\f";
      else if (next === "u" && i + 5 < text.length) {
        const hex = text.slice(i + 2, i + 6);
        if (/^[0-9a-fA-F]{4}$/.test(hex)) {
          out += String.fromCharCode(parseInt(hex, 16));
          i += 6;
          continue;
        }
        out += next;
      } else {
        out += next;
      }
      i += 2;
      continue;
    }
    if (ch === '"') {
      return { value: out, nextIndex: i + 1 };
    }
    out += ch;
    i++;
  }
  // If string was truncated near the very end of max_tokens, still return what was accumulated if substantial
  if (out.length > 200) {
    return { value: out, nextIndex: text.length };
  }
  return null;
}

/**
 * Extracts a JSON object containing `{ files: [...] }` from Claude's response text.
 */
function parseFilesJsonFromClaudeResponse(rawText: string): Array<{ path: string; content: string }> | null {
  if (!rawText) return null;

  const candidates: string[] = [];

  // 1. Try fenced ```json block if present
  const jsonFenceMatch = rawText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/i);
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

  // 4. Linear-time O(N) recovery of {"path": "...", "content": "..."} pairs
  try {
    const recovered: Array<{ path: string; content: string }> = [];
    let searchIdx = 0;
    while (searchIdx < rawText.length) {
      const pathKeyMatch = rawText.slice(searchIdx).match(/"path"\s*:\s*"/);
      if (!pathKeyMatch || pathKeyMatch.index === undefined) break;
      const pathQuoteStart = searchIdx + pathKeyMatch.index + pathKeyMatch[0].length - 1;
      const pathParsed = scanJsonStringLiteral(rawText, pathQuoteStart);
      if (!pathParsed) break;

      const afterPath = rawText.slice(pathParsed.nextIndex);
      const contentKeyMatch = afterPath.match(/^\s*,\s*"content"\s*:\s*"/);
      if (!contentKeyMatch) {
        searchIdx = pathParsed.nextIndex;
        continue;
      }
      const contentQuoteStart = pathParsed.nextIndex + contentKeyMatch[0].length - 1;
      const contentParsed = scanJsonStringLiteral(rawText, contentQuoteStart);
      if (!contentParsed) break;

      if (pathParsed.value && contentParsed.value) {
        recovered.push({
          path: pathParsed.value.trim(),
          content: contentParsed.value,
        });
      }
      searchIdx = contentParsed.nextIndex;
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
    existingFiles.some((f) => f.path === "src/components/App.tsx" && f.content.length > 40);

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
ITERATIVE MODIFICATION & ARCHITECTURE EVOLUTION DIRECTIVE:
- An active application already exists in this workspace (shown above).
- Carefully inspect what the user is requesting in their latest message:
  1. IF THE USER IS REQUESTING A UI / LAYOUT / THEME / DESIGN OVERHAUL (e.g., "I don't like the UI", "use a different layout or theme", "make the changes", "redesign", "make it look like an enterprise app"):
     - Re-architect the layout structure, navigation paradigm, color palette, typography, and component hierarchy in "src/components/App.tsx" to genuinely match the user's vision!
     - Never fall back to a repetitive template. Choose the layout structure that best fits what the user asked for (e.g., left-sidebar enterprise workbench, split-pane studio, dense data grid, full-canvas tool, or editorial storefront).
     - Ensure every single interactive feature works end-to-end with real React state.
  2. IF THE USER IS REQUESTING NEW FEATURES, ENTERPRISE MODULES, FUNCTIONAL CHANGES, OR BUG FIXES:
     - Preserve existing working domain state from "src/components/App.tsx" and seamlessly integrate the newly requested modules, workflows, controls, views, or fixes.`;
    }
  }

  const systemPrompt = `You are Vyrexo's Principal Software Architect & Coding Agent powered by Anthropic Claude Sonnet 5.5 (${CLAUDE_CODING_MODEL}).
Your role is to dynamically architect and implement complete, bespoke, production-grade React (TypeScript) applications — ranging from focused consumer tools and interactive simulations to complex, multi-module enterprise systems — together with executable unit tests.

USER REQUEST & PROJECT CONTEXT:
- Application Title: "${effectiveTitle}"
- Detected Domain / Category: "${spec.projectType}"
- Core Objective: ${spec.purpose}
- User-Specified Features & Requirements: ${[...spec.coreFeatures, ...spec.functionalRequirements].join("; ")}
${historyContext}${existingWorkspaceSection}${iterativeModeDirective}

DYNAMIC ARCHITECTURE & ANTI-COOKIE-CUTTER MANDATE (CRITICAL):
- Every application you build MUST have a unique, bespoke layout architecture, navigation paradigm, component hierarchy, and visual system engineered specifically for the user's prompt.
- DO NOT use a repetitive boilerplate layout across projects! Specifically:
  * DO NOT default to a top navbar with 4 generic pill tabs ("Workspace", "Kanban Board", "Analytics & Insights", "Settings").
  * DO NOT add 4 circular color-dot theme switchers in the top-right corner unless the user specifically asks for a multi-theme switcher.
  * DO NOT slap a generic photo Hero Banner + 4 KPI cards at the top of every app! Only consumer landing pages or retail storefronts should start with a promotional hero banner. Operational apps, enterprise platforms, developer tools, calculators, games, and workbenches must open directly into their functional workspace!
- Match the spatial architecture to the exact domain requested by the user:
  1. **Enterprise Platforms (ERP, CRM, Supply Chain, FinTech, SIEM/Cybersecurity SOC, Healthcare EMR, HRMS, LegalTech, Cloud/DevOps Console)**:
     - Architect a true enterprise workspace: collapsible left navigation rail or multi-module sidebar, global command/search header with role/tenant switcher (RBAC), dense interactive data tables with multi-column sorting/filtering/pagination/bulk actions, master-detail split panes or slide-over inspection drawers, multi-stage workflow/approval pipelines, custom SVG charts/telemetry, and live audit logs.
  2. **Developer Tools, IDEs, Data Pipelines, & Technical Workbenches**:
     - Architect a multi-pane workbench: file/node explorer tree, interactive code/schema/node canvas, live execution output/log console, and parameter inspector panels.
  3. **Games, Physics/Science Simulators, Audio/Music Studios, & Creative Canvas Apps**:
     - Architect a viewport-First interactive canvas/stage, real-time transport/simulation controls, custom Web Audio or SVG/Canvas rendering engines, and HUD telemetry.
  4. **E-Commerce, Marketplaces, Food Delivery, & Hospitality**:
     - Architect a rich commerce experience: category & attribute filter rails, high-resolution product/listing cards using curated Unsplash photography (\`referrerPolicy="no-referrer"\`, \`loading="lazy"\`, \`onError\` fallback), interactive product configurator/detail modal, slide-over cart/bag drawer, promo/tax calculation, and multi-step checkout flow.
  5. **Focused Utilities, Calculators, & Personal Productivity**:
     - Architect a crisp, high-craft direct-manipulation interface where the core interactive engine is immediately usable above the fold with zero fluff.

CRITICAL ENGINEERING & REACT IMPLEMENTATION RULES:
1. "src/components/App.tsx":
   - Must be a complete, self-contained React application component named "App" and exported via both "export function App()" and "export default App;".
   - Include "use client"; at the top, and import ONLY from 'react' (e.g., import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';).
   - Define all TypeScript types/interfaces directly inside "src/components/App.tsx" (do NOT import from '../types' or external packages) so "src/components/App.tsx" compiles standalone with zero unresolved imports.
   - Style with Tailwind CSS utility classes and write clean, well-structured, multi-module TypeScript/JSX (450 to 750 lines of rich, domain-authentic code).
   - Guard any \`localStorage\` persistence with an \`isHydrated\` state flag so initial mount never overwrites stored state.
   - Memoize derived datasets, analytics, and filtered collections with \`useMemo\` and handlers with \`useCallback\`.
   - Zero placeholders, zero "TODO" comments, and zero dead buttons — every button, modal, filter, form, chart toggle, and workflow action must mutate or compute real state.
2. "src/types/index.ts":
   - Exported TypeScript interfaces documenting the domain data model.
3. "package.json":
   - Valid JSON with name "${slug}", version "1.0.0", scripts: {"dev": "vite --port 5173", "build": "bun build src/components/App.tsx --outdir dist", "test": "bun test tests/app.test.ts"}.
4. "tests/app.test.ts":
   - Real executable unit tests using ONLY: import { test, expect } from "bun:test";
   - Include 5 to 6 meaningful unit test assertions verifying core domain calculations, filtering, workflow state transitions, and business rules for "${effectiveTitle}". Do not import DOM/React rendering libraries in tests/app.test.ts.
5. "README.md":
   - Concise architectural overview, domain modules, and verification commands.

OUTPUT FORMAT:
Respond ONLY with a single valid JSON object (no markdown prose outside the JSON) matching this exact schema:
{
  "files": [
    { "path": "src/components/App.tsx", "content": "..." },
    { "path": "src/types/index.ts", "content": "..." },
    { "path": "package.json", "content": "..." },
    { "path": "tests/app.test.ts", "content": "..." },
    { "path": "README.md", "content": "..." }
  ]
}`;

  const wrappedPrompt = wrapUntrustedContent("user_request", prompt);
  const userMessage = hasExistingApp
    ? `Execute this iterative change / architectural evolution / feature implementation on the existing project ("${effectiveTitle}") for the user request:\n${wrappedPrompt}\nApply all requested changes thoroughly with a domain-authentic UI and complete end-to-end state, and return ONLY the valid JSON object.`
    : `Architect and implement a bespoke, production-grade application for the user request:\n${wrappedPrompt}\n(Project Title: "${effectiveTitle}"). Design a unique layout, navigation structure, and domain state engine tailored specifically to this request — never a generic template — and return ONLY the valid JSON object.`;

  // Allocate 20,000 max_tokens and 180s timeout for thorough, high-quality synthesis
  const response = await callAnthropicMessages({
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
    maxTokens: clampOutputTokens(20000),
    timeoutMs: 180000,
  });

  if (!response.ok) {
    recordAuditEvent({
      category: "fallback",
      severity: "MEDIUM",
      action: "Claude coding agent API call returned non-OK",
      outcome: "fallback",
      agent: "claude-coding",
      latencyMs: response.latencyMs,
      reason: response.error,
    });
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
    recordAuditEvent({
      category: "validation",
      severity: "MEDIUM",
      action: "Claude output schema validation failed",
      outcome: "fallback",
      agent: "claude-coding",
      latencyMs: response.latencyMs,
      reason: "Response did not contain a valid files JSON array",
    });
    return {
      ok: false,
      model: response.model,
      files: [],
      latencyMs: response.latencyMs,
      tokensUsed: response.tokensUsed,
      error: "Claude response did not contain a valid files JSON array",
    };
  }

  recordAuditEvent({
    category: "validation",
    severity: "INFO",
    action: `Claude Sonnet 5.5 synthesized ${parsedFiles.length} verified files`,
    outcome: "verified",
    agent: "claude-coding",
    latencyMs: response.latencyMs,
    metadata: {
      model: response.model,
      filesCount: parsedFiles.length,
      tokensUsed: response.tokensUsed,
    },
  });

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
    maxTokens: clampOutputTokens(20000),
    timeoutMs: 90000,
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
  const patchedCode = (codeBlockMatch ? codeBlockMatch[1] : res.text)
    .replace(/^\s*```[a-zA-Z]*\s*\n?/, "")
    .replace(/\n?\s*```\s*$/, "")
    .trim();

  // Reject truncated repairs that stopped mid-JSX before closing the component
  const isTruncatedTsx =
    targetFile.path.endsWith(".tsx") &&
    res.stopReason === "max_tokens" &&
    !patchedCode.includes("export default");

  if (isTruncatedTsx) {
    return {
      ok: false,
      patchedCode: "",
      patchDescription: "",
      latencyMs: res.latencyMs,
      error: "Repair response reached max_tokens before completing the component",
    };
  }

  return {
    ok: patchedCode.length > 20,
    patchedCode,
    patchDescription: `Repaired ${targetFile.path} with Claude Sonnet 5.5 (${CLAUDE_CODING_MODEL})`,
    latencyMs: res.latencyMs,
  };
}

