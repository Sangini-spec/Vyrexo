import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { exec } from "child_process";

// Helper to sanitize and resolve workspace directory
function resolveTargetDirectory(userPath?: string): string {
  if (!userPath || userPath === "." || userPath === "default") {
    return process.cwd();
  }
  if (path.isAbsolute(userPath)) {
    return userPath;
  }
  return path.resolve(process.cwd(), userPath);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const targetDir = resolveTargetDirectory(body.path);
    const targetFile = body.file ? path.resolve(targetDir, body.file) : targetDir;

    // 1. Direct deep link URI protocols for desktop IDEs
    // VS Code: vscode://file/{absolutePath} or vscode-insiders://file/{absolutePath}
    // Cursor: cursor://file/{absolutePath}
    // Windsurf: windsurf://file/{absolutePath}
    const cleanPath = targetFile.replace(/\\/g, "/");
    const vscodeUri = `vscode://file/${cleanPath.startsWith("/") ? cleanPath : "/" + cleanPath}`;
    const cursorUri = `cursor://file/${cleanPath.startsWith("/") ? cleanPath : "/" + cleanPath}`;
    const windsurfUri = `windsurf://file/${cleanPath.startsWith("/") ? cleanPath : "/" + cleanPath}`;
    const vscodeInsidersUri = `vscode-insiders://file/${cleanPath.startsWith("/") ? cleanPath : "/" + cleanPath}`;

    // 2. Try launching via local CLI command if available on host OS
    let cliLaunched = false;
    try {
      if (fs.existsSync(targetDir)) {
        exec(`code "${targetFile}"`, (err) => {
          if (!err) cliLaunched = true;
        });
      }
    } catch {
      // CLI might not be installed or container environment sandboxed
    }

    return NextResponse.json({
      ok: true,
      targetPath: targetFile,
      vscodeUri,
      cursorUri,
      windsurfUri,
      vscodeInsidersUri,
      cliLaunched,
      message: `VS Code bridge target prepared for ${path.basename(targetFile)}`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to generate IDE link" },
      { status: 500 }
    );
  }
}
