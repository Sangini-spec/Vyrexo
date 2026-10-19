import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function openDirectoryInVSCode(targetDirectory: string, reuseWindow: boolean = true): Promise<{ ok: boolean; command: string; message: string; error?: string }> {
  const norm = path.resolve(targetDirectory);
  if (!fs.existsSync(norm)) {
    return {
      ok: false,
      command: `code "${norm}"`,
      message: `Failed: directory does not exist at ${norm}`,
      error: `Directory not found`,
    };
  }

  const reuseFlag = reuseWindow ? "-r" : "";

  // Common executable search on user OS
  const candidateExecutables: string[] = ["code", "code-insiders"];

  if (process.platform === "darwin") {
    candidateExecutables.push(
      "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code",
      "/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code-insiders",
      path.join(process.env.HOME || "", "Applications/Visual Studio Code.app/Contents/Resources/app/bin/code")
    );
  } else if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || "";
    const programFiles = process.env.ProgramFiles || "C:\\Program Files";
    candidateExecutables.push(
      path.join(localAppData, "Programs\\Microsoft VS Code\\bin\\code.cmd"),
      path.join(localAppData, "Programs\\Microsoft VS Code Insiders\\bin\\code-insiders.cmd"),
      path.join(programFiles, "Microsoft VS Code\\bin\\code.cmd")
    );
  } else {
    candidateExecutables.push("/usr/bin/code", "/usr/local/bin/code", "/snap/bin/code");
  }

  for (const exe of candidateExecutables) {
    try {
      const cmd = `"${exe}" ${reuseFlag} "${norm}"`.trim();
      await execAsync(cmd, { timeout: 5000 });
      return {
        ok: true,
        command: cmd,
        message: `Successfully launched VS Code for workspace: ${path.basename(norm)}`,
      };
    } catch {
      continue;
    }
  }

  // Final attempt: simple code command
  try {
    const cmd = `code ${reuseFlag} "${norm}"`.trim();
    await execAsync(cmd, { timeout: 5000 });
    return {
      ok: true,
      command: cmd,
      message: `Successfully launched VS Code for workspace: ${path.basename(norm)}`,
    };
  } catch (err: any) {
    return {
      ok: false,
      command: `code "${norm}"`,
      message: `VS Code launcher was not found on your system PATH. Please ensure the 'code' command is installed from VS Code (Command Palette > 'Shell Command: Install 'code' command in PATH').`,
      error: err?.message,
    };
  }
}
