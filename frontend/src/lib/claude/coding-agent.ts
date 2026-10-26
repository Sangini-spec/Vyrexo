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
ITERATIVE MODIFICATION & UI/FEATURE EVOLUTION DIRECTIVE:
- An active application already exists in this workspace (shown above).
- Carefully inspect what the user is requesting in their latest message:
  1. IF THE USER IS REQUESTING UI / THEME / DESIGN / COMPONENT CHANGES (e.g., "I don't like the UI", "use some other theme and elements", "make the changes", "redesign", "change colors/layout", "improve the UI"):
     - Completely transform and elevate the visual theme, color palette, typography, layout architecture, and UI components in "src/components/App.tsx"!
     - Do NOT keep a plain or basic layout. Upgrade the UI into a visually striking, modern, multi-theme interface (include an interactive Theme Switcher in the header supporting e.g. "Warm Editorial Daylight", "Aurora Violet Glass", and "Midnight Obsidian" themes, with rich cards, progress visualizations, interactive modals/drawers, category pills, priority badges, and micro-interactions).
     - Ensure every single interactive feature (creating, editing, completing, deleting, filtering, searching, sorting, and stats) works end-to-end with real state.
  2. IF THE USER IS REQUESTING NEW FEATURES, FUNCTIONAL CHANGES, OR BUG FIXES:
     - Preserve all working domain features from "src/components/App.tsx" and seamlessly integrate the newly requested features, controls, views, or fixes.
     - If the existing "src/components/App.tsx" was overly basic or lacked interactive CRUD controls, upgrade it into a complete, rich, production-grade implementation while applying the user's changes.`;
    }
  }

  const systemPrompt = `You are Vyrexo's Principal Coding Agent powered by Anthropic Claude Sonnet 5.5 (${CLAUDE_CODING_MODEL}).
Your role is to architect and implement complete, production-grade, deeply interactive React (TypeScript) software applications and executable unit tests.

PROJECT SPECIFICATION:
- Application Title: "${effectiveTitle}"
- Project Type: "${spec.projectType}"
- Purpose: ${spec.purpose}
- Target Users: ${spec.targetUsers}
- Core Features: ${spec.coreFeatures.join("; ")}
${historyContext}${existingWorkspaceSection}${iterativeModeDirective}

CRITICAL ENGINEERING, UI DESIGN & PERFORMANCE REQUIREMENTS:
1. "src/components/App.tsx":
   - Must be a complete, self-contained single-page React application component named "App" and exported via "export default App;" (and "export function App()").
   - Include "use client"; at the top, and import ONLY from 'react' (e.g., import React, { useState, useEffect, useMemo, useCallback } from 'react';).
   - Define all TypeScript types/interfaces directly inside "src/components/App.tsx" (do NOT import from '../types' or external modules) so "src/components/App.tsx" compiles standalone with zero unresolved imports.
   - Style with Tailwind CSS utility classes and write clean, well-structured, multi-section code (420 to 680 lines of TypeScript/JSX — do NOT golf or cram lines together, and never use bare icon boxes where product/visual imagery belongs).
   - VISUAL & PRODUCT QUALITY MANDATE:
     * NEVER use bare FontAwesome icons as a substitute for product photos in e-commerce, jewellery, fashion, food, real estate, or travel apps! Always use real, high-resolution curated Unsplash photography URLs (e.g., \`https://images.unsplash.com/photo-...?auto=format&fit=crop&w=800&q=80\`) with \`referrerPolicy="no-referrer"\`, \`loading="lazy"\`, object-cover styling, subtle hover zoom (\`group-hover:scale-105 transition-transform duration-500\`), and an \`onError\` fallback image so every card looks like a real luxury/production product!
     * NEVER use raw unstyled browser \`<input type="checkbox">\` or plain unstyled \`<select>\` dropdowns. Always build custom-styled pill selectors, segmented tab bars, custom toggle switches, and refined filter chips.
     * Include a striking **Hero Banner / Showcase Header** with editorial typography, value propositions, live KPI metrics, and primary/secondary CTA buttons.
     * Include **Multi-View Navigation Tabs** in the top navbar (e.g., for e-commerce/jewellery: "Collections Catalog", "Bespoke Customizer / Atelier", "Saved Wishlist", and "Orders & Concierge"; for productivity/SaaS: "Workspace", "Kanban Board", "Analytics & Insights", "Settings").
     * Include an interactive **Theme Switcher** with 4 cohesive, carefully crafted palettes (e.g., Luxury Noir & Champagne Gold, Warm Ivory Editorial, Emerald Velvet, Rose Quartz Daylight).
     * Include rich **Detail & Customization Modals** (e.g., for jewellery: selectable Metal Karat 14K/18K/Platinum, Ring/Chain Size selector, custom Engraving text preview, GIA certification badge, and customer reviews) and a **Multi-Step Slide-Over Drawer / Checkout Flow** (Cart items, Promo codes, Gift packaging toggle, Shipping form, and instant Order Confirmation with tracking ID).
   - PERFORMANCE & REACT STATE HYGIENE:
     * Guard \`localStorage\` persistence with an \`isHydrated\` state flag so the save \`useEffect\` never overwrites stored data with empty defaults on initial mount.
     * Memoize filtered/sorted lists with \`useMemo\` and handlers with \`useCallback\` for smooth 60fps interaction.
     * Zero placeholders, zero "TODO" comments, and zero non-functional buttons.
2. "src/types/index.ts":
   - Exported TypeScript interfaces for reference and documentation.
3. "package.json":
   - Valid JSON with name "${slug}", version "1.0.0", scripts: {"dev": "vite --port 5173", "build": "bun build src/components/App.tsx --outdir dist", "test": "bun test tests/app.test.ts"}.
4. "tests/app.test.ts":
   - Real executable unit tests using ONLY: import { test, expect } from "bun:test";
   - Include 5 to 6 meaningful unit test assertions verifying core calculations, filtering, customization pricing, state transitions, and domain invariants for "${effectiveTitle}". Do not import DOM/React rendering libraries in tests/app.test.ts.
5. "README.md":
   - Concise architectural overview, implemented features, and verification commands.

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
    ? `Execute this iterative change / UI redesign / feature implementation on the existing project ("${effectiveTitle}") for the user request:\n${wrappedPrompt}\nApply all requested changes and UI/theme enhancements thoroughly, ensure every interactive control works end-to-end, and return ONLY the valid JSON object.`
    : `Implement the complete, enhanced, production-grade application files for the user request:\n${wrappedPrompt}\n(Project Title: "${effectiveTitle}"). Fulfill every requirement with high-craft UI components and full interactivity, and return ONLY the valid JSON object.`;

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

