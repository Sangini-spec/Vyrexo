import { NextRequest, NextResponse } from "next/server";
import { extractAcceptanceCriteria } from "@/lib/testing/requirements-extractor";
import { runDeterministicAppTests, type LiveTestReport } from "@/lib/testing/playwright-runner";
import { executeAutonomousRepairLoop, type AutonomousRepairSessionResult } from "@/lib/testing/repair-loop";
import { getSessionConnectedProject } from "@/lib/project-session-store";
import { getWorkspaceDir } from "@/lib/workspace-executor";
import fs from "fs";
import path from "path";

// In-memory store for session test reports
const sessionTestReports = new Map<string, LiveTestReport>();
const sessionRepairResults = new Map<string, AutonomousRepairSessionResult>();

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId") || "default";

  const report = sessionTestReports.get(sessionId);
  const repair = sessionRepairResults.get(sessionId);

  return NextResponse.json({
    ok: true,
    sessionId,
    hasReport: Boolean(report),
    report: report || null,
    repairSession: repair || null,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = (body.sessionId as string) || "default";
    const prompt = (body.prompt as string) || "Interactive web application";
    const autoRepair = Boolean(body.autoRepair ?? true);
    const maxRetries = Math.min(5, Math.max(1, body.maxRetries || 3));

    // Resolve project details from store or disk
    const connectedProj = getSessionConnectedProject(sessionId);
    const projectTitle = connectedProj?.name || "Vyrexo Application";

    // Build the preview URL to test
    const host = req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const appUrl = `${proto}://${host}/api/preview?sessionId=${encodeURIComponent(sessionId)}`;

    // 1. Extract acceptance criteria
    const criteria = extractAcceptanceCriteria(prompt, projectTitle, connectedProj?.techStack || []);

    // 2. Run initial deterministic tests
    const initialReport = await runDeterministicAppTests({
      sessionId,
      projectTitle,
      appUrl,
      criteria,
    });

    sessionTestReports.set(sessionId, initialReport);

    // 3. If test passed or autoRepair is disabled, return report
    if (initialReport.overallStatus === "Passed" || !autoRepair) {
      return NextResponse.json({
        ok: true,
        sessionId,
        status: initialReport.overallStatus,
        report: initialReport,
        repaired: false,
      });
    }

    // 4. Otherwise, trigger autonomous repair loop
    const wsDir = getWorkspaceDir(sessionId);
    const files: Array<{ path: string; content: string }> = [];

    if (fs.existsSync(wsDir)) {
      const walk = (dir: string, baseDir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          const rel = path.relative(baseDir, full);
          if (entry.isDirectory() && !entry.name.startsWith("node_modules") && !entry.name.startsWith(".next") && !entry.name.startsWith("dist")) {
            walk(full, baseDir);
          } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts") || entry.name.endsWith(".html") || entry.name.endsWith(".css"))) {
            files.push({ path: rel, content: fs.readFileSync(full, "utf-8") });
          }
        }
      };
      walk(wsDir, wsDir);
    }

    const repairResult = await executeAutonomousRepairLoop({
      sessionId,
      projectTitle,
      appUrl,
      initialReport,
      files,
      maxRetries,
    });

    sessionTestReports.set(sessionId, repairResult.finalTestReport);
    sessionRepairResults.set(sessionId, repairResult);

    return NextResponse.json({
      ok: true,
      sessionId,
      status: repairResult.finalWorkflowState,
      report: repairResult.finalTestReport,
      repairSession: repairResult,
      repaired: repairResult.totalAttempts > 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to execute live application testing" },
      { status: 500 }
    );
  }
}
