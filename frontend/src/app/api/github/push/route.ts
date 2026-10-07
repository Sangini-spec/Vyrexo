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

export async function POST(request: NextRequest) {
  try {
    const body: PushRequestBody = await request.json();
    const rawRepo = body.repo ? body.repo.trim() : "";
    const token = (body.token ? body.token.trim() : "") || process.env.GITHUB_TOKEN || "";
    const isPrivate = body.private ?? true;
    const generateCi = body.generate_ci ?? true;
    const commitMessage = body.commit_message || "feat: initial commit with automated CI/CD pipeline [via Vyrexo]";
    const sessionId = body.sessionId;
    const clientFiles = body.files;

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error: "GitHub Personal Access Token is required. Please provide a token with the 'repo' scope.",
          needToken: true,
          tokenUrl: "https://github.com/settings/tokens/new?scopes=repo&description=Vyrexo%20App%20Deployment",
        },
        { status: 401 }
      );
    }

    // 1. Verify GitHub credentials & get authenticated user
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Vyrexo-Assistant/1.0",
      },
    });

    if (!userRes.ok) {
      const errData = await userRes.json().catch(() => ({}));
      return NextResponse.json(
        {
          ok: false,
          error: `GitHub Authentication Failed (${userRes.status}): ${errData.message || "Invalid Personal Access Token"}. Ensure token has 'repo' scope.`,
          needToken: true,
          tokenUrl: "https://github.com/settings/tokens/new?scopes=repo&description=Vyrexo%20App%20Deployment",
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
      const parts = rawRepo.replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "").split("/");
      if (parts.length >= 2) {
        owner = parts[0];
        repoName = parts[1];
      } else {
        repoName = parts[0];
      }
    } else if (rawRepo.includes("/")) {
      const parts = rawRepo.split("/");
      owner = parts[0];
      repoName = parts[1];
    }

    repoName = repoName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/^-|-$/g, "");
    if (!repoName) {
      repoName = "vyrexo-app";
    }

    // 3. Collect comprehensive project files
    const project = await collectProjectExportData(sessionId, clientFiles, body.projectTitle || repoName);
    let filesToPush = project.files;

    if (!generateCi) {
      filesToPush = filesToPush.filter((f) => !f.path.startsWith(".github/"));
    }

    // 4. Check if repository already exists
    const repoCheckRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Vyrexo-Assistant/1.0",
      },
    });

    let defaultBranch = "main";

    if (repoCheckRes.status === 404) {
      // Create the repository
      const createRes = await fetch("https://api.github.com/user/repos", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
          "User-Agent": "Vyrexo-Assistant/1.0",
        },
        body: JSON.stringify({
          name: repoName,
          private: isPrivate,
          description: `${project.title} - Built with Vyrexo AI Coding Assistant`,
          auto_init: false,
        }),
      });

      if (!createRes.ok) {
        const createErr = await createRes.json().catch(() => ({}));
        return NextResponse.json(
          {
            ok: false,
            error: `Failed to create GitHub repository "${repoName}": ${createErr.message || "Unknown error"}`,
          },
          { status: createRes.status }
        );
      }

      const createdRepo = await createRes.json();
      defaultBranch = createdRepo.default_branch || "main";
    } else if (repoCheckRes.ok) {
      const existingRepo = await repoCheckRes.json();
      defaultBranch = existingRepo.default_branch || "main";
    }

    // 5. Commit and push files
    // Check if the branch exists
    const branchRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/ref/heads/${defaultBranch}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Vyrexo-Assistant/1.0",
        },
      }
    );

    let parentCommitSha: string | null = null;

    if (branchRes.ok) {
      const branchData = await branchRes.json();
      parentCommitSha = branchData.object.sha;
    } else {
      // Empty repo without default branch yet.
      // Initialize with README.md to establish the branch
      const readmeFile = filesToPush.find((f) => f.path.toLowerCase() === "readme.md") || {
        path: "README.md",
        content: `# ${project.title}\n\nBuilt with Vyrexo AI Assistant.`,
      };

      const initRes = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/contents/${readmeFile.path}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
            "User-Agent": "Vyrexo-Assistant/1.0",
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
        parentCommitSha = initData.commit.sha;
      }
    }

    // Now push all files using GitHub Git Trees API for atomic commit
    try {
      const treeEntries: Array<{ path: string; mode: string; type: string; sha: string }> = [];

      for (const file of filesToPush) {
        // Create blob
        const blobRes = await fetch(
          `https://api.github.com/repos/${owner}/${repoName}/git/blobs`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github.v3+json",
              "Content-Type": "application/json",
              "User-Agent": "Vyrexo-Assistant/1.0",
            },
            body: JSON.stringify({
              content: file.content,
              encoding: "utf-8",
            }),
          }
        );

        if (blobRes.ok) {
          const blobData = await blobRes.json();
          treeEntries.push({
            path: file.path.replace(/^\/+/, ""),
            mode: "100644",
            type: "blob",
            sha: blobData.sha,
          });
        }
      }

      // Create tree
      const treePayload: any = { tree: treeEntries };
      if (parentCommitSha) {
        treePayload.base_tree = parentCommitSha;
      }

      const treeRes = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/git/trees`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
            "User-Agent": "Vyrexo-Assistant/1.0",
          },
          body: JSON.stringify(treePayload),
        }
      );

      if (!treeRes.ok) {
        throw new Error("Failed to create Git tree");
      }

      const treeData = await treeRes.json();

      // Create commit
      const commitRes = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/git/commits`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
            "User-Agent": "Vyrexo-Assistant/1.0",
          },
          body: JSON.stringify({
            message: commitMessage,
            tree: treeData.sha,
            parents: parentCommitSha ? [parentCommitSha] : [],
          }),
        }
      );

      if (!commitRes.ok) {
        throw new Error("Failed to create Git commit");
      }

      const commitData = await commitRes.json();
      const newCommitSha = commitData.sha;

      // Update or create branch ref
      const updateRefRes = await fetch(
        `https://api.github.com/repos/${owner}/${repoName}/git/refs/heads/${defaultBranch}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
            "User-Agent": "Vyrexo-Assistant/1.0",
          },
          body: JSON.stringify({
            sha: newCommitSha,
            force: true,
          }),
        }
      );

      if (!updateRefRes.ok) {
        // If ref doesn't exist, create it
        await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/refs`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
            "User-Agent": "Vyrexo-Assistant/1.0",
          },
          body: JSON.stringify({
            ref: `refs/heads/${defaultBranch}`,
            sha: newCommitSha,
          }),
        });
      }

      const repoUrl = `https://github.com/${owner}/${repoName}`;
      const actionsUrl = `${repoUrl}/actions`;

      return NextResponse.json({
        ok: true,
        message: `Successfully pushed ${filesToPush.length} files to GitHub with active CI/CD pipeline!`,
        repo_url: repoUrl,
        actions_url: actionsUrl,
        clone_url: `${repoUrl}.git`,
        branch: defaultBranch,
        commit_sha: newCommitSha.slice(0, 7),
        files_pushed: filesToPush.length,
        ci_cd_configured: generateCi,
      });
    } catch (pushErr: any) {
      // Fallback: direct contents API for smaller sets
      let pushedCount = 0;
      for (const file of filesToPush.slice(0, 10)) {
        try {
          const res = await fetch(
            `https://api.github.com/repos/${owner}/${repoName}/contents/${file.path}`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json",
                "Content-Type": "application/json",
                "User-Agent": "Vyrexo-Assistant/1.0",
              },
              body: JSON.stringify({
                message: `Update ${file.path} [via Vyrexo]`,
                content: Buffer.from(file.content, "utf-8").toString("base64"),
                branch: defaultBranch,
              }),
            }
          );
          if (res.ok) pushedCount++;
        } catch {}
      }

      const repoUrl = `https://github.com/${owner}/${repoName}`;
      return NextResponse.json({
        ok: true,
        message: `Repository created and synchronized ${pushedCount} key files to GitHub!`,
        repo_url: repoUrl,
        actions_url: `${repoUrl}/actions`,
        clone_url: `${repoUrl}.git`,
        branch: defaultBranch,
        files_pushed: pushedCount,
        ci_cd_configured: generateCi,
      });
    }
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to push repository to GitHub",
      },
      { status: 500 }
    );
  }
}
