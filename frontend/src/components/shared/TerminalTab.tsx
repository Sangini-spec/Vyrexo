"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  checkLocalAgentHealth,
  openProjectInLocalVSCode,
  executeLocalTerminalCommand,
  type LocalAgentHealth,
} from "@/lib/local-agent-client";

interface TerminalTabProps {
  projectPath?: string;
  sessionId?: string;
}

interface LogEntry {
  id: string;
  type: "cmd" | "stdout" | "stderr" | "info" | "error";
  text: string;
  time: string;
}

export function TerminalTab({ projectPath = ".", sessionId = "default" }: TerminalTabProps) {
  const [agentHealth, setAgentHealth] = useState<LocalAgentHealth>({ status: "unreachable" });
  const [checkingAgent, setCheckingAgent] = useState(false);
  const [commandInput, setCommandInput] = useState("");
  const [executing, setExecuting] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "init",
      type: "info",
      text: "Vyrexo Terminal & Local Agent bridge initialized.",
      time: new Date().toLocaleTimeString(),
    },
  ]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Poll local agent status on mount
  useEffect(() => {
    let isMounted = true;
    async function check() {
      setCheckingAgent(true);
      const h = await checkLocalAgentHealth();
      if (isMounted) {
        setAgentHealth(h);
        setCheckingAgent(false);
        if (h.status === "ok") {
          addLog("info", `Connected to Vyrexo Local Agent daemon on ${h.hostname || "localhost"} (${h.platform}).`);
        } else {
          addLog("info", "Local Agent not detected on http://127.0.0.1:4040. Run 'npm run agent' on your machine to enable native local execution.");
        }
      }
    }
    check();
    const interval = setInterval(check, 12000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (type: LogEntry["type"], text: string) => {
    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        type,
        text,
        time: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const handleOpenVSCode = async () => {
    addLog("cmd", `$ code "${projectPath}"`);
    const res = await openProjectInLocalVSCode(projectPath);
    if (res.ok) {
      addLog("stdout", `✓ ${res.message}`);
    } else {
      addLog("stderr", `✕ ${res.message} ${res.error || ""}`);
    }
  };

  const handleRunCommand = async (cmdToRun?: string) => {
    const cmd = (cmdToRun || commandInput).trim();
    if (!cmd || executing) return;

    setExecuting(true);
    addLog("cmd", `$ ${cmd}`);
    if (!cmdToRun) setCommandInput("");

    try {
      const isBackground = cmd.includes("run dev") || cmd.includes("start");
      const res = await executeLocalTerminalCommand({
        command: cmd,
        cwd: projectPath,
        isBackground,
      });

      if (res.stdout) addLog("stdout", res.stdout);
      if (res.stderr) addLog(res.ok ? "stdout" : "stderr", res.stderr);
      if (res.detectedUrl) addLog("info", `🚀 Dev server detected live at: ${res.detectedUrl}`);

      addLog(res.ok ? "info" : "error", `Process exited with code ${res.exitCode ?? 0} in ${res.durationMs}ms`);
    } catch (err: any) {
      addLog("error", `Command execution failed: ${err.message}`);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#090d16] text-slate-200 font-mono text-xs overflow-hidden">
      {/* Top Status Bar */}
      <div className="p-3 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              agentHealth.status === "ok" ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-amber-400"
            }`}
          />
          <span className="font-semibold text-white">
            {agentHealth.status === "ok" ? `Local Agent: Connected (${agentHealth.platform})` : "Local Agent: Disconnected"}
          </span>
          {checkingAgent && <span className="text-[10px] text-slate-400 animate-pulse">Checking...</span>}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenVSCode}
            className="px-2.5 py-1 rounded bg-[#007ACC]/20 hover:bg-[#007ACC]/30 text-[#38bdf8] border border-[#007ACC]/30 text-[11px] font-semibold flex items-center gap-1.5 transition-all"
            title="Launch VS Code for this project"
          >
            <span>💻</span>
            <span>Open in VS Code</span>
          </button>
          <button
            onClick={() => setLogs([])}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] transition-all"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="px-3 py-2 bg-[#090d16] border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px]">
        <span className="text-slate-500 text-[10px] uppercase font-bold mr-1">Quick:</span>
        <button
          onClick={() => handleRunCommand("npm run dev")}
          disabled={executing}
          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 transition-all flex-shrink-0"
        >
          npm run dev
        </button>
        <button
          onClick={() => handleRunCommand("npm test")}
          disabled={executing}
          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-all flex-shrink-0"
        >
          npm test
        </button>
        <button
          onClick={() => handleRunCommand("git status")}
          disabled={executing}
          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-all flex-shrink-0"
        >
          git status
        </button>
        <button
          onClick={() => handleRunCommand("ls -la")}
          disabled={executing}
          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all flex-shrink-0"
        >
          ls -la
        </button>
      </div>

      {/* Terminal Output Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 selection:bg-indigo-900 selection:text-white">
        {logs.map((log) => (
          <div key={log.id} className="leading-relaxed break-words">
            {log.type === "cmd" && <span className="text-indigo-400 font-bold">{log.text}</span>}
            {log.type === "stdout" && <span className="text-slate-200 whitespace-pre-wrap">{log.text}</span>}
            {log.type === "stderr" && <span className="text-red-400 whitespace-pre-wrap">{log.text}</span>}
            {log.type === "info" && <span className="text-slate-500 italic text-[11px] block">{log.text}</span>}
            {log.type === "error" && <span className="text-rose-400 font-semibold">{log.text}</span>}
          </div>
        ))}
        {executing && (
          <div className="flex items-center gap-2 text-indigo-400 text-xs py-1">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span>Executing command...</span>
          </div>
        )}
        <div ref={logEndRef} />
      </div>

      {/* Terminal Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleRunCommand();
        }}
        className="p-2 bg-[#0f172a] border-t border-slate-800 flex items-center gap-2 flex-shrink-0"
      >
        <span className="text-emerald-400 font-bold pl-2 select-none">&gt;</span>
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          placeholder={agentHealth.status === "ok" ? "Type command to execute on your computer..." : "Local agent not running (Run 'npm run agent')"}
          disabled={executing}
          className="flex-1 bg-transparent border-none text-white text-xs font-mono focus:outline-none placeholder:text-slate-600"
        />
        <button
          type="submit"
          disabled={executing || !commandInput.trim()}
          className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-500 text-xs font-semibold transition-all"
        >
          Run
        </button>
      </form>
    </div>
  );
}
