import { NextRequest, NextResponse } from "next/server";
import {
  getSessionConnectedProject,
  getSessionWorkspaceFiles,
  ensureSessionWorkspaceMaterialized,
  buildFileTree,
} from "@/lib/project-session-store";
import { collectProjectExportData } from "@/lib/project-export";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawSessionId = searchParams.get("sessionId");
  const titleHint = searchParams.get("title") || undefined;
  const sessionId =
    !rawSessionId || rawSessionId === "default" ? "session-1790005321834" : rawSessionId;

  if (sessionId) {
    // Ensure previously built session workspace (e.g. RailGo train booking) is materialized on disk
    ensureSessionWorkspaceMaterialized(sessionId, titleHint);

    // 1. Check if session has a connected project with complete files
    const connectedProject = getSessionConnectedProject(sessionId);
    if (connectedProject && connectedProject.files && connectedProject.files.length > 0) {
      const tree = buildFileTree(connectedProject.files);
      return NextResponse.json({
        ok: true,
        tree,
        project: {
          name: connectedProject.name,
          path: connectedProject.path,
          source: connectedProject.source,
          filesCount: connectedProject.filesCount,
        },
      });
    }

    // 2. Check if workspace disk files exist
    const wsFiles = getSessionWorkspaceFiles(sessionId);
    if (wsFiles && wsFiles.length > 0) {
      const tree = buildFileTree(wsFiles);
      return NextResponse.json({
        ok: true,
        tree,
        project: {
          name: titleHint || "Active Sandbox Project",
          path: `workspaces/${sessionId}`,
          source: "workspace",
          filesCount: wsFiles.length,
        },
      });
    }

    // 3. If this is a brand-new empty session ("New Session"), return empty tree until user builds
    if (titleHint === "New Session") {
      return NextResponse.json({
        ok: true,
        tree: [],
        project: null,
      });
    }

    // 4. Fallback to synthesizing export data for this session
    try {
      const projectData = await collectProjectExportData(sessionId, undefined, titleHint);
      if (projectData.files.length > 0) {
        const formatted = projectData.files.map((f) => ({
          path: f.path,
          content: f.content,
          size: Buffer.byteLength(f.content, "utf-8"),
          lastModified: Date.now(),
        }));
        const tree = buildFileTree(formatted);
        return NextResponse.json({
          ok: true,
          tree,
          project: {
            name: projectData.title,
            path: `workspaces/${projectData.slug}`,
            source: "session_template",
            filesCount: formatted.length,
          },
        });
      }
    } catch {}
  }

  return NextResponse.json({
    ok: true,
    tree: [],
    project: null,
  });
}

