import { NextRequest, NextResponse } from "next/server";
import {
  getSessionConnectedProject,
  getSessionWorkspaceFiles,
  buildFileTree,
} from "@/lib/project-session-store";
import { collectProjectExportData } from "@/lib/project-export";

interface TreeNode {
  name: string;
  type: "file" | "dir";
  path: string;
  children?: TreeNode[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (sessionId) {
    // 1. Check if session has a connected project
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
          name: "Active Workspace Project",
          path: `workspaces/${sessionId}`,
          source: "workspace",
          filesCount: wsFiles.length,
        },
      });
    }

    // 3. Fallback to synthesizing export data for this session
    try {
      const projectData = await collectProjectExportData(sessionId);
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

  // Default starter tree
  const defaultProject = await collectProjectExportData();
  const formatted = defaultProject.files.map((f) => ({
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
      name: defaultProject.title,
      filesCount: formatted.length,
    },
  });
}
