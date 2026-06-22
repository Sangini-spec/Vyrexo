"""Project management endpoints — load projects, open in VS Code, pick a folder."""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

import structlog
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/projects", tags=["projects"])
logger = structlog.get_logger()

# Directories never shown in the file tree.
_TREE_SKIP = {
    ".git", "node_modules", "__pycache__", ".venv", "venv", "env", ".next",
    "dist", "build", ".mypy_cache", ".pytest_cache", ".idea", ".vscode",
    ".ruff_cache", ".turbo", ".cache", "site-packages", ".pytest_cache",
}
_MAX_TREE_ENTRIES = 1200
_MAX_FILE_BYTES = 500_000


class ProjectLoadRequest(BaseModel):
    path: str


class VSCodeOpenRequest(BaseModel):
    path: str
    line: int | None = None


# Modern Windows folder picker (Vista+ IFileOpenDialog with FOS_PICKFOLDERS —
# the same chooser modern apps use). Falls back to the classic dialog if the COM
# path fails, so the picker can never end up broken.
_PICK_PS = r'''
$ErrorActionPreference = 'Stop'
$result = ''
try {
  Add-Type -Language CSharp -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
namespace RexPicker {
  [ComImport, Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  public interface IShellItem {
    void BindToHandler(IntPtr pbc, ref Guid bhid, ref Guid riid, out IntPtr ppv);
    void GetParent(out IShellItem ppsi);
    void GetDisplayName(uint sigdnName, out IntPtr ppszName);
    void GetAttributes(uint sfgaoMask, out uint psfgaoAttribs);
    void Compare(IShellItem psi, uint hint, out int piOrder);
  }
  [ComImport, Guid("DC1C5A9C-E88A-4dde-A5A1-60F82A20AEF7")]
  public class FileOpenDialog { }
  [ComImport, Guid("42F85136-DB7E-439C-85F1-E4075D135FC8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  public interface IFileDialog {
    [PreserveSig] int Show(IntPtr parent);
    void SetFileTypes(uint cFileTypes, IntPtr rgFilterSpec);
    void SetFileTypeIndex(uint iFileType);
    void GetFileTypeIndex(out uint piFileType);
    void Advise(IntPtr pfde, out uint pdwCookie);
    void Unadvise(uint dwCookie);
    void SetOptions(uint fos);
    void GetOptions(out uint pfos);
    void SetDefaultFolder(IShellItem psi);
    void SetFolder(IShellItem psi);
    void GetFolder(out IShellItem ppsi);
    void GetCurrentSelection(out IShellItem ppsi);
    void SetFileName(string pszName);
    void GetFileName(out IntPtr pszName);
    void SetTitle(string pszTitle);
    void SetOkButtonLabel(string pszText);
    void SetFileNameLabel(string pszLabel);
    void GetResult(out IShellItem ppsi);
  }
}
"@
  $dlg = New-Object RexPicker.FileOpenDialog
  $ifd = [RexPicker.IFileDialog]$dlg
  $ifd.SetOptions(0x20)            # FOS_PICKFOLDERS
  $ifd.SetTitle('Select your project folder for Rex')
  if ($ifd.Show([IntPtr]::Zero) -eq 0) {
    $item = $null
    $ifd.GetResult([ref]$item)
    $ptr = [IntPtr]::Zero
    $item.GetDisplayName(0x80058000, [ref]$ptr)   # SIGDN_FILESYSPATH
    $result = [Runtime.InteropServices.Marshal]::PtrToStringAuto($ptr)
    [Runtime.InteropServices.Marshal]::FreeCoTaskMem($ptr)
  }
} catch {
  try {
    Add-Type -AssemblyName System.Windows.Forms
    $f = New-Object System.Windows.Forms.FolderBrowserDialog
    $f.Description = 'Select your project folder for Rex'
    $top = New-Object System.Windows.Forms.Form; $top.TopMost = $true
    if ($f.ShowDialog($top) -eq [System.Windows.Forms.DialogResult]::OK) { $result = $f.SelectedPath }
  } catch { $result = '' }
}
[Console]::Out.Write($result)
'''


@router.post("/pick")
async def pick_folder() -> dict:
    """Open a native OS folder-picker dialog and return the selected path.

    The backend runs on the user's own machine, so we can pop a real folder
    chooser — far more reliable than asking them to type an absolute path
    (browsers can't expose it). Uses the modern Windows picker, falling back to
    the classic dialog if needed.
    """
    if sys.platform != "win32":
        return {"ok": False, "error": "Folder picker is only wired for Windows right now."}

    import base64
    encoded = base64.b64encode(_PICK_PS.encode("utf-16-le")).decode("ascii")
    try:
        proc = await asyncio.create_subprocess_exec(
            "powershell", "-NoProfile", "-STA", "-EncodedCommand", encoded,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=180)
    except asyncio.TimeoutError:
        return {"ok": False, "error": "Folder picker timed out."}
    except Exception as e:
        logger.warning("folder_pick_failed", error=str(e)[:120])
        return {"ok": False, "error": "Could not open the folder picker."}

    path = stdout.decode("utf-8", errors="replace").strip()
    if not path:
        return {"ok": False, "cancelled": True}
    logger.info("folder_picked", path=path)
    return {"ok": True, "path": path}


@router.post("/load")
async def load_project(req: ProjectLoadRequest) -> dict:
    """Load a project directory — indexes codebase for context retrieval."""
    from vyrexo.main import context_engine

    if context_engine is None:
        return {"error": "Context engine not initialized"}

    stats = await context_engine.load_project(req.path)
    return stats


@router.post("/vscode")
async def open_vscode(req: VSCodeOpenRequest) -> dict:
    """Open a project or file in VS Code."""
    from vyrexo.integrations.vscode import open_file_in_vscode, open_in_vscode

    if req.line:
        return await open_file_in_vscode(req.path, req.line)
    return await open_in_vscode(req.path)


@router.get("/vscode/status")
async def vscode_status() -> dict:
    """Check if VS Code CLI is available."""
    from vyrexo.integrations.vscode import is_vscode_available

    available = await is_vscode_available()
    return {"available": available}


def _build_tree(root: Path, current: Path, depth: int, budget: list[int]) -> list[dict]:
    """Recursively list a directory into a nested tree (dirs first, then files),
    skipping build/VCS noise. ``budget`` caps the total number of entries."""
    if depth > 7 or budget[0] <= 0:
        return []
    try:
        items = sorted(os.scandir(current), key=lambda e: (e.is_file(), e.name.lower()))
    except Exception:
        return []
    out: list[dict] = []
    for entry in items:
        if budget[0] <= 0:
            break
        name = entry.name
        try:
            is_dir = entry.is_dir()
        except OSError:
            continue
        # Skip junk dirs and any hidden directory.
        if is_dir and (name in _TREE_SKIP or name.startswith(".")):
            continue
        budget[0] -= 1
        try:
            rel = str(Path(entry.path).resolve().relative_to(root)).replace("\\", "/")
        except Exception:
            continue
        if is_dir:
            out.append({
                "name": name, "type": "dir", "path": rel,
                "children": _build_tree(root, Path(entry.path), depth + 1, budget),
            })
        else:
            out.append({"name": name, "type": "file", "path": rel})
    return out


@router.get("/tree")
async def project_tree(path: str) -> dict:
    """Return the project's file structure as a nested tree (for the Code tab)."""
    root = Path(path).expanduser()
    if not root.is_dir():
        return {"ok": False, "error": "Not a directory"}
    root = root.resolve()
    budget = [_MAX_TREE_ENTRIES]
    return {"ok": True, "tree": _build_tree(root, root, 0, budget)}


@router.get("/file")
async def read_project_file(path: str, file: str) -> dict:
    """Return a file's text content (for the Code tab viewer). Scoped to the
    project root, with a size cap and path-traversal protection."""
    root = Path(path).expanduser().resolve()
    target = (root / file).resolve()
    # Path-traversal guard: target must live inside the project root.
    if root != target and root not in target.parents:
        return {"ok": False, "error": "Path outside the project"}
    if not target.is_file():
        return {"ok": False, "error": "File not found"}
    try:
        if target.stat().st_size > _MAX_FILE_BYTES:
            return {"ok": False, "error": "File too large to preview"}
        content = target.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        return {"ok": False, "error": str(e)[:120]}
    return {"ok": True, "path": file, "content": content}
