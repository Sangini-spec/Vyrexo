"use client";

import React, { useState, useEffect } from "react";
import type { LiveTestReport } from "@/lib/testing/playwright-runner";
import type { AutonomousRepairSessionResult, OrchestratorWorkflowState } from "@/lib/testing/repair-loop";

interface TestingTabProps {
  sessionId?: string;
  previewUrl: string;
}

const WORKFLOW_STEPS: Array<{ key: OrchestratorWorkflowState; label: string }> = [
  { key: "PLANNING", label: "Plan" },
  { key: "IMPLEMENTING", label: "Build" },
  { key: "STARTING_APP", label: "Launch" },
  { key: "TESTING", label: "Test" },
  { key: "DIAGNOSING", label: "Diagnose" },
  { key: "REPAIRING", label: "Repair" },
  { key: "RETESTING", label: "Retest" },
  { key: "COMPLETED", label: "Verified" },
];

export function TestingTab({ sessionId = "default", previewUrl }: TestingTabProps) {
  const [running, setRunning] = useState(false);
  const [autoRepair, setAutoRepair] = useState(true);
  const [testPrompt, setTestPrompt] = useState("");
  const [currentState, setCurrentState] = useState<OrchestratorWorkflowState>("COMPLETED");
  const [stateMessage, setStateMessage] = useState<string>("Ready to test acceptance criteria.");
  const [report, setReport] = useState<LiveTestReport | null>(null);
  const [repairSession, setRepairSession] = useState<AutonomousRepairSessionResult | null>(null);
  const [activeView, setActiveView] = useState<"criteria" | "evidence" | "repairs">("criteria");

  // Fetch existing report on load
  useEffect(() => {
    let isMounted = true;
    async function loadReport() {
      try {
        const res = await fetch(`/api/testing?sessionId=${encodeURIComponent(sessionId)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.hasReport) {
            setReport(data.report);
            if (data.repairSession) setRepairSession(data.repairSession);
          }
        }
      } catch {}
    }
    loadReport();
    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  const handleRunTests = async () => {
    setRunning(true);
    setCurrentState("STARTING_APP");
    setStateMessage("Launching live application and preparing Playwright test runner...");

    try {
      const res = await fetch("/api/testing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          prompt: testPrompt || "Interactive web application with responsive UI and working controls",
          autoRepair,
          maxRetries: 3,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setReport(data.report);
        if (data.repairSession) {
          setRepairSession(data.repairSession);
          setCurrentState(data.repairSession.finalWorkflowState);
          setStateMessage(data.repairSession.summary);
        } else {
          setCurrentState(data.status === "Passed" ? "COMPLETED" : "FAILED");
          setStateMessage(data.report?.summary || "Testing completed.");
        }
      } else {
        setCurrentState("FAILED");
        setStateMessage(`Test run error: ${data.error}`);
      }
    } catch (err: any) {
      setCurrentState("FAILED");
      setStateMessage(`Execution failed: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const passedCount = report?.passedCount ?? 0;
  const failedCount = report?.failedCount ?? 0;
  const totalCount = report?.totalRequirements ?? 0;

  return (
    <div className="h-full flex flex-col bg-[var(--surface)] overflow-hidden text-[var(--text)]">
      {/* Header & Controls */}
      <div className="p-3.5 border-b border-[var(--border2)] space-y-3 bg-[var(--surface2)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text)] flex items-center gap-1.5">
              <span>🛡️</span>
              Autonomous Live Testing & Verification
            </h2>
            <p className="text-[11px] text-[var(--muted2)] mt-0.5">
              Deterministic Playwright browser execution and self-healing repair loop
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[11px] text-[var(--muted2)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRepair}
                onChange={(e) => setAutoRepair(e.target.checked)}
                className="rounded accent-[var(--steel)] cursor-pointer"
              />
              Auto-Repair
            </label>
            <button
              onClick={handleRunTests}
              disabled={running}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                running
                  ? "bg-[var(--border)] text-[var(--muted)] cursor-not-allowed"
                  : "bg-[var(--midnight)] hover:bg-[var(--steel)] text-white shadow-sm"
              }`}
            >
              {running ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>▶</span>
                  <span>Run Playwright Suite</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Workflow Lifecycle Pipeline */}
        <div className="p-2 rounded-xl bg-[var(--card)] border border-[var(--border2)]">
          <div className="flex items-center justify-between text-[10px] font-mono px-1">
            {WORKFLOW_STEPS.map((step, idx) => {
              const isCurrent = currentState === step.key;
              const isFinished = currentState === "COMPLETED" || (currentState !== "FAILED" && idx < 3);

              return (
                <div key={step.key} className="flex items-center gap-1">
                  <span
                    className={`px-1.5 py-0.5 rounded font-semibold transition-all ${
                      isCurrent
                        ? "bg-indigo-600 text-white ring-1 ring-indigo-400"
                        : isFinished
                        ? "text-emerald-400 bg-emerald-950/40"
                        : "text-[var(--muted)]"
                    }`}
                  >
                    {step.label}
                  </span>
                  {idx < WORKFLOW_STEPS.length - 1 && <span className="text-[var(--muted)]">→</span>}
                </div>
              );
            })}
          </div>
          <p className="text-[10.5px] text-[var(--muted2)] mt-1.5 px-1 truncate">{stateMessage}</p>
        </div>

        {/* Requirements Prompt Input */}
        <div>
          <input
            type="text"
            placeholder="Specific feature requirements to verify (e.g. 'Add to cart works, inputs validate, 0 console errors')"
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--input)] border border-[var(--border2)] text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--steel)]"
          />
        </div>
      </div>

      {/* Metrics Card */}
      {report && (
        <div className="grid grid-cols-4 gap-2 p-3 border-b border-[var(--border2)] bg-[var(--surface)] text-center text-xs">
          <div className="p-2 rounded-lg bg-[var(--surface2)] border border-[var(--border2)]">
            <span className="text-[10px] text-[var(--muted)] block uppercase">Total Criteria</span>
            <span className="text-sm font-bold text-[var(--text)]">{totalCount}</span>
          </div>
          <div className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-900/30">
            <span className="text-[10px] text-emerald-400 block uppercase">Passed</span>
            <span className="text-sm font-bold text-emerald-400">{passedCount}</span>
          </div>
          <div className="p-2 rounded-lg bg-red-950/20 border border-red-900/30">
            <span className="text-[10px] text-red-400 block uppercase">Failed</span>
            <span className="text-sm font-bold text-red-400">{failedCount}</span>
          </div>
          <div className="p-2 rounded-lg bg-[var(--surface2)] border border-[var(--border2)]">
            <span className="text-[10px] text-[var(--muted)] block uppercase">Repairs Run</span>
            <span className="text-sm font-bold text-indigo-400">{report.fixesAppliedCount}</span>
          </div>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex border-b border-[var(--border2)] px-3 bg-[var(--surface2)] text-xs font-medium">
        <button
          onClick={() => setActiveView("criteria")}
          className={`py-2 px-3 border-b-2 transition-all ${
            activeView === "criteria" ? "border-[var(--steel)] text-[var(--steel)] font-semibold" : "border-transparent text-[var(--muted)]"
          }`}
        >
          Acceptance Criteria ({report?.criteria.length || 0})
        </button>
        <button
          onClick={() => setActiveView("evidence")}
          className={`py-2 px-3 border-b-2 transition-all ${
            activeView === "evidence" ? "border-[var(--steel)] text-[var(--steel)] font-semibold" : "border-transparent text-[var(--muted)]"
          }`}
        >
          Visual Evidence & DOM
        </button>
        <button
          onClick={() => setActiveView("repairs")}
          className={`py-2 px-3 border-b-2 transition-all ${
            activeView === "repairs" ? "border-[var(--steel)] text-[var(--steel)] font-semibold" : "border-transparent text-[var(--muted)]"
          }`}
        >
          Repair History ({repairSession?.repairHistory.length || 0})
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeView === "criteria" && (
          <div className="space-y-2">
            {!report && (
              <div className="text-center py-12 text-[var(--muted2)] text-xs space-y-2">
                <p className="text-2xl">📋</p>
                <p className="font-semibold text-[var(--text)]">No test suite executed yet.</p>
                <p>Click &quot;Run Playwright Suite&quot; above to launch and verify the application against requirements.</p>
              </div>
            )}
            {report?.criteria.map((crit) => (
              <div
                key={crit.id}
                className={`p-3 rounded-xl border transition-all ${
                  crit.status === "Passed"
                    ? "border-emerald-900/30 bg-emerald-950/10"
                    : crit.status === "Failed"
                    ? "border-red-900/40 bg-red-950/15"
                    : "border-[var(--border2)] bg-[var(--surface2)]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-[var(--text)] block">{crit.title}</span>
                    <p className="text-[11px] text-[var(--muted2)] mt-0.5 leading-relaxed">{crit.description}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
                      crit.status === "Passed"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : crit.status === "Failed"
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : "bg-slate-700/30 text-slate-400 border border-slate-600/30"
                    }`}
                  >
                    {crit.status}
                  </span>
                </div>

                {crit.evidence?.observedDom && (
                  <div className="mt-2 text-[10.5px] font-mono text-emerald-300 bg-black/40 p-1.5 rounded border border-emerald-900/30">
                    ✓ {crit.evidence.observedDom}
                  </div>
                )}
                {crit.evidence?.failureReason && (
                  <div className="mt-2 text-[10.5px] font-mono text-red-300 bg-black/40 p-1.5 rounded border border-red-900/30">
                    ✕ {crit.evidence.failureReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeView === "evidence" && (
          <div className="space-y-3">
            {report?.screenshots && report.screenshots.length > 0 ? (
              report.screenshots.map((s, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-[var(--border2)] bg-[var(--surface2)] space-y-2">
                  <span className="text-xs font-semibold text-[var(--text)] block">{s.title}</span>
                  <div className="rounded-lg overflow-hidden border border-[var(--border2)] bg-black/40 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.dataUrl} alt={s.title} className="w-full max-h-[280px] object-contain" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-[var(--muted2)] text-xs">
                No visual screenshots captured yet. Run tests to generate visual evidence.
              </div>
            )}
          </div>
        )}

        {activeView === "repairs" && (
          <div className="space-y-2.5">
            {repairSession?.repairHistory && repairSession.repairHistory.length > 0 ? (
              repairSession.repairHistory.map((rep, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-[var(--border2)] bg-[var(--surface2)] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-400">Attempt #{rep.attemptNumber}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        rep.testOutcomeAfterPatch === "Passed" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {rep.testOutcomeAfterPatch === "Passed" ? "Resolved" : "Still Failing"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--muted2)]">{rep.patchDescription}</p>
                  <div className="text-[10px] font-mono text-slate-400 bg-black/30 p-2 rounded border border-[var(--border)] truncate">
                    Modified: {rep.filesModified.join(", ")}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-[var(--muted2)] text-xs">
                No autonomous repair cycles were needed. All criteria were satisfied cleanly.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
