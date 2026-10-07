import { NextRequest, NextResponse } from "next/server";
import {
  setSessionConnectedProject,
  getSessionConnectedProject,
  removeSessionConnectedProject,
  analyzeCodebase,
  ConnectedProject,
  ProjectFile,
} from "@/lib/project-session-store";

interface ProjectItem {
  name: string;
  path: string;
  description?: string;
  filesCount?: number;
}

const mockProjects: ProjectItem[] = [
  {
    name: "fastapi-service",
    path: "/projects/fastapi-service",
    description: "FastAPI REST microservice with JWT auth and SQLite",
    filesCount: 12,
  },
  {
    name: "react-starter-app",
    path: "/projects/react-starter-app",
    description: "Modern React and Tailwind single page app",
    filesCount: 18,
  },
  {
    name: "vyrexo-workspace",
    path: ".",
    description: "Current active workspace",
    filesCount: 24,
  },
];

// Helper to provide starter files if a workspace preset without files is picked
function getStarterFiles(name: string, path: string): ProjectFile[] {
  if (name.includes("fastapi")) {
    return [
      {
        path: "src/main.py",
        content: `from fastapi import FastAPI\n\napp = FastAPI(title="${name}", version="1.0.0")\n\n@app.get("/health")\ndef health():\n    return {"status": "ok", "project": "${name}"}\n`,
      },
      {
        path: "pyproject.toml",
        content: `[project]\nname = "${name}"\nversion = "0.1.0"\ndependencies = ["fastapi>=0.115.0", "uvicorn>=0.30.0"]\n`,
      },
      {
        path: "README.md",
        content: `# ${name}\n\nFastAPI REST service connected to Vyrexo.\n`,
      },
    ];
  }

  return [
    {
      path: "package.json",
      content: JSON.stringify(
        {
          name,
          version: "0.1.0",
          private: true,
          dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" },
        },
        null,
        2
      ),
    },
    {
      path: "src/App.tsx",
      content: `export default function App() {\n  return <div className="p-8 text-xl font-bold">Hello from ${name}</div>;\n}\n`,
    },
    {
      path: "README.md",
      content: `# ${name}\n\nConnected workspace for Vyrexo multi-agent development.\n`,
    },
  ];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (sessionId) {
    const connected = getSessionConnectedProject(sessionId);
    if (connected) {
      return NextResponse.json({
        ok: true,
        connected: true,
        project: connected,
      });
    }
    return NextResponse.json({
      ok: true,
      connected: false,
      project: null,
      projects: mockProjects,
    });
  }

  return NextResponse.json({
    ok: true,
    projects: mockProjects,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionId = body.sessionId || "default";
    const name = (body.name || `project-${Date.now()}`).trim();
    const path = body.path || `/projects/${name}`;
    const source = body.source || (body.files?.length ? "local_folder" : "workspace");

    let files: ProjectFile[] = Array.isArray(body.files) ? body.files : [];
    if (files.length === 0) {
      files = getStarterFiles(name, path);
    }

    const analysis = analyzeCodebase(name, files);

    const connectedProject: ConnectedProject = {
      id: `proj-${Date.now()}`,
      sessionId,
      name,
      path,
      source,
      summary: body.description || analysis.summary,
      techStack: analysis.techStack,
      filesCount: files.length,
      files,
      connectedAt: Date.now(),
      lastUpdatedAt: Date.now(),
    };

    setSessionConnectedProject(sessionId, connectedProject);

    return NextResponse.json({
      ok: true,
      project: connectedProject,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to connect project" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      const body = await request.json().catch(() => ({}));
      sessionId = body.sessionId;
    }

    if (sessionId) {
      removeSessionConnectedProject(sessionId);
      return NextResponse.json({
        ok: true,
        message: `Project disconnected for session ${sessionId}`,
      });
    }

    return NextResponse.json(
      { ok: false, error: "sessionId required to disconnect project" },
      { status: 400 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to disconnect" },
      { status: 500 }
    );
  }
}
