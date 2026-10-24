import { NextRequest, NextResponse } from "next/server";
import { collectProjectExportData, ProjectExportFile } from "@/lib/project-export";

interface PushRequestBody {
  repo: string;
  token?: string;
  private?: boolean;
  generate_ci?: boolean;
  commit_message?: string;
  sessionId?: string;
  files?: ProjectExportFile[];
  projectTitle?: string;
}

/**
 * Strictly block any .env, secret, or build cache files from ever being pushed to GitHub.
 * Only .env.example templates are permitted.
 */
function isExcludedFromGitHubPush(filePath: string): boolean {
  const clean = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!clean || clean.includes("..")) return true;
  const parts = clean.split("/");
  const base = parts[parts.length - 1].toLowerCase();

  // Never push .env or .env.* files (allow only .env.example)
  if ((base === ".env" || base.startsWith(".env.") || base.endsWith(".env")) && base !== ".env.example") {
    return true;
  }

  // Never push build caches, node_modules, .git, or runtime secret stores
  if (
    parts.includes("node_modules") ||
    parts.includes(".next") ||
    parts.includes(".next-dev") ||
    parts.includes(".git") ||
    parts.includes(".data") ||
    base === "ai-config.json" ||
    base === ".vyrexo-project.json"
  ) {
    return true;
  }

  return false;
}

async function commitTreeToBranch(params: {
  owner: string;
  repoName: string;
  defaultBranch: string;
  token: string;
  parentCommitSha: string | null;
  baseTreeSha: string | null;
  commitMessage: string;
  files: ProjectExportFile[];
}): Promise<{ ok: boolean; commitSha?: string; status?: number; errorText?: string }> {
  const {
    owner,
    repoName,
    defaultBranch,
    token,
    parentCommitSha,
    baseTreeSha,
    commitMessage,
    files,
  } = params;

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
    "User-Agent": "Vyrexo-Assistant/1.0",
  };

  // Build inline tree entries directly (avoids 20+ sequential /git/blobs calls)
  const treeEntries = files.map((f) => ({
    path: f.path.replace(/\\/g, "/").replace(/^\/+/, ""),
    mode: "100644",
    type: "blob",
    content: typeof f.content === "string" ? f.content : String(f.content ?? ""),
  }));

  const treePayload: Record<string, unknown> = { tree: treeEntries };
  if (baseTreeSha) {
    treePayload.base_tree = baseTreeSha;
  } else if (parentCommitSha) {
    treePayload.base_tree = parentCommitSha;
  }

  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/git/trees`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(treePayload),
    }
  );

  if (!treeRes.ok) {
    const errBody = await treeRes.json().catch(() => ({}));
    return {
      ok: false,
      status: treeRes.status,
      errorText: errBody?.message || `GitHub tree creation failed (${treeRes.status})`,
    };
  }

  const treeData = await treeRes.json();

  const commitRes = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/git/commits`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: commitMessage,
        tree: treeData.sha,
        parents: parentCommitSha ? [parentCommitSha] : [],
      }),
    }
  );

  if (!commitRes.ok) {
    const errBody = await commitRes.json().catch(() => ({}));
    return {
      ok: false,
      status: commitRes.status,
      errorText: errBody?.message || `GitHub commit creation failed (${commitRes.status})`,
    };
  }

  const commitData = await commitRes.json();
  const newCommitSha: string = commitData.sha;

  const updateRefRes = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/git/refs/heads/${defaultBranch}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        sha: newCommitSha,
        force: true,
      }),
    }
  );

  if (!updateRefRes.ok) {
    const createRefRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/refs`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          ref: `refs/heads/${defaultBranch}`,
          sha: newCommitSha,
        }),
      }
    );
    if (!createRefRes.ok) {
      const refErr = await createRefRes.json().catch(() => ({}));
      return {
        ok: false,
        status: createRefRes.status,
        errorText: refErr?.message || `GitHub branch ref update failed (${createRefRes.status})`,
      };
    }
  }

  return { ok: true, commitSha: newCommitSha };
}

export async function POST(request: NextRequest) {
  try {
    const body: PushRequestBody = await request.json();
    const rawRepo = body.repo ? body.repo.trim() : "";
    const token = (body.token ? body.token.trim() : "") || process.env.GITHUB_TOKEN || "";
    const isPrivate = body.private ?? true;
    const generateCi = body.generate_ci ?? true;
    const commitMessage =
      body.commit_message || "feat: update project workspace [via Vyrexo]";
    const sessionId = body.sessionId;
    const clientFiles = body.files;

    const tokenCreateUrl =
      "https://github.com/settings/tokens/new?scopes=repo,workflow&description=Vyrexo%20App%20Deployment";

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "GitHub Personal Access Token is required. Please provide a token with 'repo' (and 'workflow' for CI/CD) scopes.",
          needToken: true,
          tokenUrl: tokenCreateUrl,
        },
        { status: 401 }
      );
    }

    const ghHeaders = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Vyrexo-Assistant/1.0",
    };

    // 1. Verify GitHub credentials & get authenticated user
    const userRes = await fetch("https://api.github.com/user", {
      headers: ghHeaders,
    });

    if (!userRes.ok) {
      const errData = await userRes.json().catch(() => ({}));
      return NextResponse.json(
        {
          ok: false,
          error: `GitHub Authentication Failed (${userRes.status}): ${
            errData.message || "Invalid Personal Access Token"
          }. Ensure your token has the 'repo' scope.`,
          needToken: true,
          tokenUrl: tokenCreateUrl,
        },
        { status: 401 }
      );
    }

    const userData = await userRes.json();
    const authenticatedUsername = userData.login;

    // 2. Parse repo owner and name
    let owner = authenticatedUsername;
    let repoName = rawRepo;

    if (rawRepo.includes("github.com/")) {
      const parts = rawRepo
        .replace(/^https?:\/\/github\.com\//, "")
        .replace(/\.git$/, "")
        .split("/")
        .filter(Boolean);
      if (parts.length >= 2) {
        owner = parts[0];
        repoName = parts[1];
      } else if (parts.length === 1) {
        repoName = parts[0];
      }
    } else if (rawRepo.includes("/")) {
      const parts = rawRepo.split("/").filter(Boolean);
      if (parts.length >= 2) {
        owner = parts[0];
        repoName = parts[1];
      }
    }

    repoName = repoName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/^-|-$/g, "");
    if (!repoName) {
      repoName = "vyrexo-app";
    }

    // 3. Collect project files and strictly strip any .env or secret files
    const project = await collectProjectExportData(
      sessionId,
      clientFiles,
      body.projectTitle || repoName
    );
    let filesToPush = project.files.filter((f) => !isExcludedFromGitHubPush(f.path));

    // If pushing to the main Vyrexo repository (or when no session mini-project files exist),
    // include the root README.md and .env.example from the Vyrexo workspace root.
    if (repoName.toLowerCase() === "vyrexo" || filesToPush.length === 0) {
      try {
        const fs = require("fs");
        const path = require("path");
        const repoRoot = process.cwd().endsWith("frontend")
          ? path.resolve(process.cwd(), "..")
          : process.cwd();
        const rootReadmePath = path.join(repoRoot, "README.md");
        if (fs.existsSync(rootReadmePath)) {
          const rootReadmeContent = fs.readFileSync(rootReadmePath, "utf-8");
          const existingIdx = filesToPush.findIndex(
            (f) => f.path.replace(/^\/+/, "").toLowerCase() === "readme.md"
          );
          if (existingIdx >= 0) {
            filesToPush[existingIdx] = { path: "README.md", content: rootReadmeContent };
          } else {
            filesToPush.unshift({ path: "README.md", content: rootReadmeContent });
          }
        }
        const rootEnvExamplePath = path.join(repoRoot, ".env.example");
        if (fs.existsSync(rootEnvExamplePath)) {
          const envExampleContent = fs.readFileSync(rootEnvExamplePath, "utf-8");
          if (!filesToPush.some((f) => f.path.replace(/^\/+/, "") === ".env.example")) {
            filesToPush.push({ path: ".env.example", content: envExampleContent });
          }
        }
      } catch {}
    }

    // Ensure .gitignore is present and explicitly blocks .env files
    const existingGitignoreIdx = filesToPush.findIndex(
      (f) => f.path.replace(/^\/+/, "") === ".gitignore"
    );
    const envIgnoreRules = [
      "node_modules/",
      ".next/",
      ".next-dev/",
      "dist/",
      "build/",
      ".env",
      ".env.*",
      ".env.local",
      ".env.*.local",
      "*.env",
      "!.env.example",
      ".data/",
      ".DS_Store",
    ].join("\n");

    if (existingGitignoreIdx >= 0) {
      const current = filesToPush[existingGitignoreIdx].content || "";
      if (!current.includes(".env")) {
        filesToPush[existingGitignoreIdx] = {
          ...filesToPush[existingGitignoreIdx],
          content: `${current.trim()}\n\n# Never commit .env secrets\n.env\n.env.*\n*.env\n!.env.example\n`,
        };
      }
    } else {
      filesToPush.push({
        path: ".gitignore",
        content: `${envIgnoreRules}\n`,
      });
    }

    if (!generateCi) {
      filesToPush = filesToPush.filter((f) => !f.path.replace(/^\/+/, "").startsWith(".github/"));
    }

    // 4. Check if repository already exists (create with auto_init: true if missing)
    const repoCheckRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}`,
      { headers: ghHeaders }
    );

    let defaultBranch = "main";

    if (repoCheckRes.status === 404) {
      const createRes = await fetch("https://api.github.com/user/repos", {
        method: "POST",
        headers: {
          ...ghHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: repoName,
          private: isPrivate,
          description: `${project.title} - Built with Vyrexo AI Coding Assistant`,
          auto_init: true,
        }),
      });

      if (!createRes.ok) {
        const createErr = await createRes.json().catch(() => ({}));
        return NextResponse.json(
          {
            ok: false,
            error: `Failed to create GitHub repository "${repoName}": ${
              createErr.message || "Check that your token has 'repo' permissions."
            }`,
          },
          { status: createRes.status }
        );
      }

      const createdRepo = await createRes.json();
      defaultBranch = createdRepo.default_branch || "main";
      owner = createdRepo.owner?.login || owner;
    } else if (repoCheckRes.ok) {
      const existingRepo = await repoCheckRes.json();
      defaultBranch = existingRepo.default_branch || "main";
      owner = existingRepo.owner?.login || owner;
    }

    // 5. Resolve latest commit and base tree on defaultBranch
    let parentCommitSha: string | null = null;
    let baseTreeSha: string | null = null;

    const branchRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/ref/heads/${defaultBranch}`,
      { headers: ghHeaders }
    );

    if (branchRes.ok) {
      const branchData = await branchRes.json();
      parentCommitSha = branchData?.object?.sha || null;
      if (parentCommitSha) {
        const commitInfoRes = await fetch(
          `https://api.github.com/repos/${owner}/${repoName}/git/commits/${parentCommitSha}`,
          { headers: ghHeaders }
        );
        if (commitInfoRes.ok) {
          const commitInfo = await commitInfoRes.json();
          baseTreeSha = commitInfo?.tree?.sha || null;
        }
      }
    } else {
      // Repository exists but has 0 commits yet — bootstrap with README.md
      const readmeFile =
        filesToPush.find((f) => f.path.toLowerCase() === "readme.md") || {
          path: "README.md",
          content: `# ${project.title}\n\nBuilt with Vyrexo AI Assistant.\n`,
        };

      const initRes = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/contents/${readmeFile.path}`,
        {
          method: "PUT",
          headers: {
            ...ghHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: "Initial commit [via Vyrexo]",
            content: Buffer.from(readmeFile.content, "utf-8").toString("base64"),
            branch: defaultBranch,
          }),
        }
      );

      if (initRes.ok) {
        const initData = await initRes.json();
        parentCommitSha = initData?.commit?.sha || null;
        baseTreeSha = initData?.commit?.tree?.sha || null;
      }
    }

    // 6. Commit & push all files atomically via Git Trees API
    let ciIncluded = generateCi;
    let commitAttempt = await commitTreeToBranch({
      owner,
      repoName,
      defaultBranch,
      token,
      parentCommitSha,
      baseTreeSha,
      commitMessage,
      files: filesToPush,
    });

    // If the token lacks 'workflow' scope, GitHub rejects commits containing .github/workflows/*
    // Automatically retry without .github/workflows/* so the push still succeeds!
    if (!commitAttempt.ok && generateCi) {
      const filesWithoutCi = filesToPush.filter(
        (f) => !f.path.replace(/^\/+/, "").startsWith(".github/")
      );
      if (filesWithoutCi.length < filesToPush.length) {
        const retryWithoutCi = await commitTreeToBranch({
          owner,
          repoName,
          defaultBranch,
          token,
          parentCommitSha,
          baseTreeSha,
          commitMessage,
          files: filesWithoutCi,
        });
        if (retryWithoutCi.ok) {
          commitAttempt = retryWithoutCi;
          filesToPush = filesWithoutCi;
          ciIncluded = false;
        }
      }
    }

    if (commitAttempt.ok && commitAttempt.commitSha) {
      const repoUrl = `https://github.com/${owner}/${repoName}`;
      return NextResponse.json({
        ok: true,
        message: ciIncluded
          ? `Successfully pushed ${filesToPush.length} files to GitHub (.env files excluded) with CI/CD pipeline!`
          : `Successfully pushed ${filesToPush.length} files to GitHub (.env files excluded)! (Skipped .github/workflows/ci.yml because token lacked 'workflow' scope)`,
        repo_url: repoUrl,
        actions_url: `${repoUrl}/actions`,
        clone_url: `${repoUrl}.git`,
        branch: defaultBranch,
        commit_sha: commitAttempt.commitSha.slice(0, 7),
        files_pushed: filesToPush.length,
        ci_cd_configured: ciIncluded,
      });
    }

    // 7. Fallback: Contents API with automatic existing-file SHA lookup
    let pushedCount = 0;
    let lastError = commitAttempt.errorText || "Failed to push files";
    const safeFiles = filesToPush.filter(
      (f) => !f.path.replace(/^\/+/, "").startsWith(".github/")
    );

    for (const file of safeFiles.slice(0, 20)) {
      try {
        const cleanPath = file.path.replace(/\\/g, "/").replace(/^\/+/, "");
        let existingSha: string | undefined;

        const existingRes = await fetch(
          `https://api.github.com/repos/${owner}/${repoName}/contents/${cleanPath}?ref=${encodeURIComponent(
            defaultBranch
          )}`,
          { headers: ghHeaders }
        );
        if (existingRes.ok) {
          const existingData = await existingRes.json();
          if (existingData?.sha) existingSha = existingData.sha;
        }

        const putBody: Record<string, unknown> = {
          message: `Update ${cleanPath} [via Vyrexo]`,
          content: Buffer.from(file.content, "utf-8").toString("base64"),
          branch: defaultBranch,
        };
        if (existingSha) {
          putBody.sha = existingSha;
        }

        const res = await fetch(
          `https://api.github.com/repos/${owner}/${repoName}/contents/${cleanPath}`,
          {
            method: "PUT",
            headers: {
              ...ghHeaders,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(putBody),
          }
        );
        if (res.ok) {
          pushedCount++;
        } else {
          const errJson = await res.json().catch(() => ({}));
          if (errJson?.message) lastError = errJson.message;
        }
      } catch {}
    }

    if (pushedCount > 0) {
      const repoUrl = `https://github.com/${owner}/${repoName}`;
      return NextResponse.json({
        ok: true,
        message: `Synchronized ${pushedCount} project files to GitHub (.env files excluded)!`,
        repo_url: repoUrl,
        actions_url: `${repoUrl}/actions`,
        clone_url: `${repoUrl}.git`,
        branch: defaultBranch,
        files_pushed: pushedCount,
        ci_cd_configured: false,
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error: `GitHub push failed: ${lastError}. Verify your token has 'repo' write permissions for ${owner}/${repoName}.`,
      },
      { status: 400 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to push repository to GitHub",
      },
      { status: 500 }
    );
  }
}
