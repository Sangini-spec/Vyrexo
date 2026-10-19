import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";
import {
  launchVSCodeCLI,
  resolveWorkspaceLaunchInfo,
} from "@/lib/vscode-launcher";
import {
  getSessionConnectedProject,
  getSessionProject,
  getSessionWorkspaceFiles,
  ensureSessionWorkspaceMaterialized,
  type ProjectFile,
} from "@/lib/project-session-store";
import { getWorkspaceDir } from "@/lib/workspace-executor";
import { collectProjectExportData } from "@/lib/project-export";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawSessionId = (body.sessionId as string | undefined) || "default";
    const sessionId =
      !rawSessionId || rawSessionId === "default" ? "session-1790005321834" : rawSessionId;
    const titleHint = (body.projectName || body.title || body.sessionTitle) as string | undefined;
    const localAgentUrl = (body.localAgentUrl as string | undefined) || "http://127.0.0.1:4040";
    const requestedIde = (body.ide as string | undefined) || "vscode";
    const rawRequestedPath = typeof body.path === "string" ? body.path.trim() : "";

    // 1. Ensure the chosen session's full workspace is loaded from disk if present
    ensureSessionWorkspaceMaterialized(sessionId, titleHint);

    const sessionProj = getSessionConnectedProject(sessionId);
    const activeSessionProj = getSessionProject(sessionId);

    // 2. Collect all code files for this session (never overwrite existing built files)
    let sessionFiles: ProjectFile[] = getSessionWorkspaceFiles(sessionId);

    if (sessionFiles.length === 0 && Array.isArray(body.files) && body.files.length > 0) {
      sessionFiles = body.files.map((f: any) => ({
        path: String(f.path || "").replace(/^\/+/, ""),
        content: String(f.content || ""),
        size: Buffer.byteLength(String(f.content || ""), "utf-8"),
      }));
    }

    if (sessionFiles.length === 0) {
      try {
        const exportData = await collectProjectExportData(sessionId, undefined, titleHint);
        if (exportData && exportData.files.length > 0) {
          sessionFiles = exportData.files.map((f) => ({
            path: f.path,
            content: f.content,
            size: Buffer.byteLength(f.content, "utf-8"),
          }));
        }
      } catch (err: any) {
        console.warn("[vscode/route] Failed to collect export data:", err.message);
      }
    }

    const projectName =
      sessionProj?.name ||
      activeSessionProj?.title ||
      titleHint ||
      "RailGo Train Booking";
    const safeProjectSlug =
      projectName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 45) || "vyrexo-project";

    // Write files to session workspace dir, clean slug workspace folder, AND ~/vyrexo-projects/<slug>
    const sessionWorkspaceDir = getWorkspaceDir(sessionId);
    const workspacesRoot = path.dirname(sessionWorkspaceDir);
    const cleanProjectDir = path.join(workspacesRoot, safeProjectSlug);
    const homeProjectDir = path.join(os.homedir(), "vyrexo-projects", safeProjectSlug);

    // Expand custom path if user entered one
    let customResolvedPath = "";
    const isWindowsCustomPath = /^[a-zA-Z]:[\\/]/.test(rawRequestedPath);
    if (rawRequestedPath && rawRequestedPath !== "." && rawRequestedPath !== "default") {
      if (rawRequestedPath.startsWith("~/") || rawRequestedPath.startsWith("~\\")) {
        customResolvedPath = path.join(os.homedir(), rawRequestedPath.slice(2));
      } else if (isWindowsCustomPath) {
        customResolvedPath = rawRequestedPath.replace(/\//g, "\\").replace(/\\+$/, "");
      } else {
        customResolvedPath = path.resolve(rawRequestedPath);
      }
    }

    const targetDirsToMaterialize = [sessionWorkspaceDir, cleanProjectDir, homeProjectDir];
    if (
      customResolvedPath &&
      !isWindowsCustomPath &&
      customResolvedPath !== path.resolve(process.cwd()) &&
      !targetDirsToMaterialize.includes(customResolvedPath)
    ) {
      targetDirsToMaterialize.push(customResolvedPath);
    }

    for (const targetDir of targetDirsToMaterialize) {
      try {
        fs.mkdirSync(targetDir, { recursive: true });
        for (const f of sessionFiles) {
          const cleanRel = f.path.replace(/^\/+/, "");
          if (!cleanRel || cleanRel.includes("..") || cleanRel.endsWith(".code-workspace")) continue;
          const targetFilePath = path.join(targetDir, cleanRel);
          fs.mkdirSync(path.dirname(targetFilePath), { recursive: true });
          fs.writeFileSync(targetFilePath, f.content, "utf-8");
        }

        const vscodeDir = path.join(targetDir, ".vscode");
        fs.mkdirSync(vscodeDir, { recursive: true });
        fs.writeFileSync(
          path.join(vscodeDir, "settings.json"),
          JSON.stringify(
            {
              "workbench.startupEditor": "readme",
              "explorer.autoReveal": true,
              "explorer.compactFolders": false,
              "files.exclude": {
                "**/.git": true,
                "**/.DS_Store": true,
                "**/.vyrexo-project.json": true,
                "**/project-meta.json": true,
              },
            },
            null,
            2
          ),
          "utf-8"
        );

        const workspaceFilePath = path.join(targetDir, `${safeProjectSlug}.code-workspace`);
        fs.writeFileSync(
          workspaceFilePath,
          JSON.stringify(
            {
              folders: [
                {
                  name: projectName,
                  path: ".",
                },
              ],
              settings: {
                "workbench.startupEditor": "readme",
                "explorer.autoReveal": true,
                "explorer.compactFolders": false,
              },
            },
            null,
            2
          ),
          "utf-8"
        );
      } catch {}
    }

    const effectiveTargetPath = customResolvedPath || cleanProjectDir;
    const launchInfo = resolveWorkspaceLaunchInfo(
      effectiveTargetPath,
      sessionId,
      false,
      safeProjectSlug
    );
    const downloadUrl = `/api/projects/download?sessionId=${encodeURIComponent(sessionId)}`;
    const vscodeServerUrl = `/vscode?sessionId=${encodeURIComponent(sessionId)}`;

    // 3. If the user has a local agent running on their desktop, delegate open command with all files!
    let localAgentOpened = false;
    let localAgentMessage = "";
    let localAgentTargetPath = effectiveTargetPath;

    try {
      const abortCtrl = new AbortController();
      const timeout = setTimeout(() => abortCtrl.abort(), 2000);

      const agentRes = await fetch(`${localAgentUrl}/api/vscode/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: customResolvedPath || undefined,
          sessionId,
          ide: requestedIde,
          projectName,
          projectSlug: safeProjectSlug,
          files: sessionFiles.map((f) => ({ path: f.path, content: f.content })),
          reuseWindow: false,
        }),
        signal: abortCtrl.signal,
      }).catch(() => null);
      clearTimeout(timeout);

      if (agentRes && agentRes.ok) {
        const agentData = await agentRes.json().catch(() => null);
        if (agentData?.ok) {
          localAgentOpened = true;
          if (agentData.targetPath || agentData.path) {
            localAgentTargetPath = agentData.targetPath || agentData.path;
          }
          localAgentMessage =
            agentData.message ||
            `Opened full project workspace (${sessionFiles.length} files) in ${requestedIde.toUpperCase()} via Vyrexo Local Agent.`;
        }
      }
    } catch {
      // Local agent not running on localhost:4040
    }

    const ideDisplayName =
      requestedIde === "cursor"
        ? "Cursor"
        : requestedIde === "windsurf"
        ? "Windsurf"
        : requestedIde === "vscode-insiders"
        ? "VS Code Insiders"
        : "VS Code";

    if (localAgentOpened) {
      const agentLaunchInfo = resolveWorkspaceLaunchInfo(
        localAgentTargetPath,
        sessionId,
        false,
        safeProjectSlug
      );
      return NextResponse.json({
        ok: true,
        targetPath: localAgentTargetPath,
        sandboxPath: cleanProjectDir,
        homeWorkspacePath: homeProjectDir,
        vscodeServerUrl,
        projectName,
        projectSlug: safeProjectSlug,
        filesCount: sessionFiles.length,
        files: sessionFiles.map((f) => ({ path: f.path, content: f.content, size: f.size })),
        source: "local_agent",
        vscodeUri: agentLaunchInfo.vscodeUri,
        cursorUri: agentLaunchInfo.cursorUri,
        windsurfUri: agentLaunchInfo.windsurfUri,
        vscodeInsidersUri: agentLaunchInfo.vscodeInsidersUri,
        workspaceUri: agentLaunchInfo.workspaceUri,
        cursorWorkspaceUri: agentLaunchInfo.cursorWorkspaceUri,
        windsurfWorkspaceUri: agentLaunchInfo.windsurfWorkspaceUri,
        downloadUrl,
        syncPackageUrl: downloadUrl,
        message: localAgentMessage,
        requiresLocalSync: false,
      });
    }

    // 4. If running locally (host CLI available) and the target directory exists on disk
    if (!isWindowsCustomPath && fs.existsSync(effectiveTargetPath)) {
      const cliResult = await launchVSCodeCLI(effectiveTargetPath, requestedIde as any);
      if (cliResult.success) {
        return NextResponse.json({
          ok: true,
          targetPath: effectiveTargetPath,
          sandboxPath: cleanProjectDir,
          homeWorkspacePath: homeProjectDir,
          vscodeServerUrl,
          projectName,
          projectSlug: safeProjectSlug,
          filesCount: sessionFiles.length,
          files: sessionFiles.map((f) => ({ path: f.path, content: f.content, size: f.size })),
          source: "host_cli",
          commandExecuted: cliResult.command,
          vscodeUri: launchInfo.vscodeUri,
          cursorUri: launchInfo.cursorUri,
          windsurfUri: launchInfo.windsurfUri,
          vscodeInsidersUri: launchInfo.vscodeInsidersUri,
          workspaceUri: launchInfo.workspaceUri,
          cursorWorkspaceUri: launchInfo.cursorWorkspaceUri,
          windsurfWorkspaceUri: launchInfo.windsurfWorkspaceUri,
          downloadUrl,
          syncPackageUrl: downloadUrl,
          message: `Opened full directory structure of ${projectName} in ${ideDisplayName}.`,
          requiresLocalSync: false,
        });
      }
    }

    // 5. Return complete files and clean project path for VS Code Server / Local Folder Save / Desktop Bridge
    return NextResponse.json({
      ok: true,
      targetPath: effectiveTargetPath,
      sandboxPath: cleanProjectDir,
      homeWorkspacePath: homeProjectDir,
      vscodeServerUrl,
      projectName,
      projectSlug: safeProjectSlug,
      filesCount: sessionFiles.length,
      files: sessionFiles.map((f) => ({ path: f.path, content: f.content, size: f.size })),
      filePaths: sessionFiles.map((f) => f.path),
      source: "uri_scheme",
      vscodeUri: launchInfo.vscodeUri,
      cursorUri: launchInfo.cursorUri,
      windsurfUri: launchInfo.windsurfUri,
      vscodeInsidersUri: launchInfo.vscodeInsidersUri,
      workspaceUri: launchInfo.workspaceUri,
      cursorWorkspaceUri: launchInfo.cursorWorkspaceUri,
      windsurfWorkspaceUri: launchInfo.windsurfWorkspaceUri,
      requiresLocalSync: false,
      downloadUrl,
      syncPackageUrl: downloadUrl,
      message: `Ready to open full directory structure of ${projectName} (${sessionFiles.length} files) in ${ideDisplayName}.`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to prepare IDE workspace launch",
      },
      { status: 500 }
    );
  }
}
