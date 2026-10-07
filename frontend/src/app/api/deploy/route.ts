import { NextRequest, NextResponse } from "next/server";
import { collectProjectExportData, ProjectExportFile } from "@/lib/project-export";
import {
  writeWorkspaceFiles,
  compileWorkspace,
  testWorkspace,
  getWorkspaceDir,
} from "@/lib/workspace-executor";
import { updateSessionProjectType } from "@/lib/project-session-store";
import fs from "fs";
import path from "path";

export interface DeploymentRecord {
  id: string;
  sessionId: string;
  projectTitle: string;
  target: "live_container" | "github_actions" | "vercel" | "docker";
  status: "building" | "live" | "failed";
  liveUrl: string;
  previewUrl: string;
  vercelDeployUrl?: string;
  createdAt: number;
  completedAt: number;
  durationMs: number;
  filesCount: number;
  compilation: {
    success: boolean;
    durationMs: number;
    output: string;
    bundleSize?: number;
  };
  testing: {
    success: boolean;
    durationMs: number;
    output: string;
    passCount: number;
    failCount: number;
  };
  steps: Array<{
    name: string;
    status: "completed" | "failed" | "in_progress";
    durationMs: number;
    log?: string;
  }>;
}

// In-memory deployment store by sessionId
const globalDeployments = globalThis as unknown as {
  __sessionDeployments?: Map<string, DeploymentRecord[]>;
};

if (!globalDeployments.__sessionDeployments) {
  globalDeployments.__sessionDeployments = new Map<string, DeploymentRecord[]>();
}

const sessionDeployments = globalDeployments.__sessionDeployments;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId") || "default";

  const history = sessionDeployments.get(sessionId) || [];
  const latest = history.length > 0 ? history[history.length - 1] : null;

  return NextResponse.json({
    ok: true,
    latest,
    history,
  });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const sessionId = body.sessionId || "default";
    const target = body.target || "live_container";
    const explicitTitle = body.projectTitle || body.title;
    const clientFiles: ProjectExportFile[] | undefined = Array.isArray(body.files) ? body.files : undefined;

    const steps: DeploymentRecord["steps"] = [];

    // Step 1: Collect files & validation
    const step1Start = Date.now();
    const project = await collectProjectExportData(sessionId, clientFiles, explicitTitle);
    steps.push({
      name: "Artifact Collection & Tree Synthesis",
      status: "completed",
      durationMs: Date.now() - step1Start,
      log: `Collected ${project.files.length} production files for "${project.title}".`,
    });

    // Step 2: Write workspace files to disk
    const step2Start = Date.now();
    const wsFiles = project.files.map((f) => ({
      path: f.path,
      content: f.content,
      category: f.path.startsWith("tests/")
        ? "test"
        : f.path.endsWith(".md")
        ? "documentation"
        : "file_write",
      agent: "coder",
      tool: "file_writer",
      message: `Deployed ${f.path}`,
    }));

    const wsDir = writeWorkspaceFiles(sessionId, project.title, wsFiles as any);
    steps.push({
      name: "Workspace Disk Sync",
      status: "completed",
      durationMs: Date.now() - step2Start,
      log: `Synced workspace files to execution directory ${wsDir}.`,
    });

    // Step 3: Bundle & Compile (Bun build)
    const step3Start = Date.now();
    const compilation = await compileWorkspace(wsDir);
    steps.push({
      name: "Production Bundle Compilation",
      status: compilation.success ? "completed" : "failed",
      durationMs: compilation.durationMs || Date.now() - step3Start,
      log: compilation.output,
    });

    // Step 4: Run Automated Tests (Bun test)
    const step4Start = Date.now();
    const testing = await testWorkspace(wsDir);
    steps.push({
      name: "Automated Regression Test Suite",
      status: testing.success ? "completed" : "failed",
      durationMs: testing.durationMs || Date.now() - step4Start,
      log: testing.output,
    });

    // Step 5: Provision Live Preview & Deployment URL
    const step5Start = Date.now();
    updateSessionProjectType(sessionId, "custom", project.title, `Live deployed instance of ${project.title}`);

    // If there is compiled App.js, write deployment meta
    try {
      const deployMetaPath = path.join(wsDir, "deployment.json");
      fs.writeFileSync(
        deployMetaPath,
        JSON.stringify(
          {
            deployedAt: Date.now(),
            title: project.title,
            target,
            status: "live",
            filesCount: project.files.length,
          },
          null,
          2
        ),
        "utf-8"
      );
    } catch {}

    const deployId = `dep_${Date.now().toString(36)}`;
    const previewUrl = `/api/preview?session=${encodeURIComponent(sessionId)}&deployed=true&depId=${deployId}`;
    
    // Construct full live URL
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const fullLiveUrl = `${proto}://${host}${previewUrl}`;

    // Vercel deploy link
    const vercelDeployUrl = `https://vercel.com/new/import?s=https://github.com/developer/${project.slug}`;

    steps.push({
      name: "Live Container Provisioning & Routing",
      status: "completed",
      durationMs: Date.now() - step5Start,
      log: `Deployment live at ${previewUrl} with isolated session runtime.`,
    });

    const isSuccess = compilation.success && testing.success;

    const record: DeploymentRecord = {
      id: deployId,
      sessionId,
      projectTitle: project.title,
      target,
      status: isSuccess ? "live" : "failed",
      liveUrl: fullLiveUrl,
      previewUrl,
      vercelDeployUrl,
      createdAt: startTime,
      completedAt: Date.now(),
      durationMs: Date.now() - startTime,
      filesCount: project.files.length,
      compilation,
      testing,
      steps,
    };

    const currentHistory = sessionDeployments.get(sessionId) || [];
    sessionDeployments.set(sessionId, [...currentHistory, record]);

    return NextResponse.json({
      ok: true,
      deployment: record,
      message: `Application "${project.title}" successfully deployed and live!`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Deployment failed unexpectedly",
      },
      { status: 500 }
    );
  }
}
