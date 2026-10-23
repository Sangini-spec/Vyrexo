import { NextRequest, NextResponse } from "next/server";
import {
  getObservabilitySnapshot,
  runSecurityGovernanceEvaluation,
  inspectUntrustedInput,
  validateWorkspaceFilePath,
  validateSafeCommand,
  validateSafeExternalUrl,
  checkToolPermission,
  type AgentRole,
  type ToolName,
} from "@/lib/security/governance";

export async function GET() {
  const snapshot = getObservabilitySnapshot();
  const evaluation = runSecurityGovernanceEvaluation();

  return NextResponse.json({
    ok: true,
    service: "Vyrexo Security, Governance, Evaluation & Observability Engine",
    architecture: {
      conversationalAgent: {
        role: "gemini-conversation",
        provider: "Google Gemini",
        responsibilities: [
          "Conversational interaction",
          "Voice input & spoken synthesis narration",
          "Dialogue & conversation history",
        ],
      },
      codingAgent: {
        role: "claude-coding",
        provider: "Anthropic Claude Sonnet 5.5",
        model: snapshot.environment.providers.anthropicModel,
        responsibilities: [
          "Coding & project implementation",
          "Debugging & code modification",
          "Autonomous repair tasks",
        ],
      },
    },
    observability: snapshot,
    evaluation,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = (body.action as string) || "evaluate";

    if (action === "inspect_prompt") {
      const result = inspectUntrustedInput(String(body.input || ""), {
        source: body.source || "user",
      });
      return NextResponse.json({ ok: true, result });
    }

    if (action === "validate_path") {
      const result = validateWorkspaceFilePath(
        String(body.workspaceDir || "/tmp/vyrexo-workspace"),
        String(body.filePath || "")
      );
      return NextResponse.json({ ok: true, result });
    }

    if (action === "validate_command") {
      const result = validateSafeCommand(String(body.command || ""));
      return NextResponse.json({ ok: true, result });
    }

    if (action === "validate_url") {
      const result = validateSafeExternalUrl(String(body.url || ""));
      return NextResponse.json({ ok: true, result });
    }

    if (action === "check_permission") {
      const result = checkToolPermission(
        (body.agent as AgentRole) || "gemini-conversation",
        (body.tool as ToolName) || "file_write"
      );
      return NextResponse.json({ ok: true, result });
    }

    const evaluation = runSecurityGovernanceEvaluation();
    const snapshot = getObservabilitySnapshot();
    return NextResponse.json({
      ok: evaluation.ok,
      evaluation,
      observability: snapshot,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Security audit evaluation failed" },
      { status: 500 }
    );
  }
}
