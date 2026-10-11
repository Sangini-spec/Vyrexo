"use client";

import React from "react";

export interface AgentStep {
  agent: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed";
  files?: string[];
  output?: string;
}

interface AgentTimelineProps {
  steps: AgentStep[];
  narration?: string;
}

export interface AgentInfo {
  id: "planner" | "coder" | "executor" | "reviewer" | "tester" | "documenter";
  name: string;
  role: string;
  icon: string;
  color: string;
  borderColor: string;
  bg: string;
  activeBg: string;
}

export const SIX_AGENTS: AgentInfo[] = [
  {
    id: "planner",
    name: "Planner",
    role: "Architecture & Decomposition",
    icon: "📋",
    color: "text-blue-400",
    borderColor: "border-blue-500/30",
    bg: "bg-blue-500/10",
    activeBg: "bg-blue-500/20 ring-1 ring-blue-400/50",
  },
  {
    id: "coder",
    name: "Coder",
    role: "Component & Logic Synthesis",
    icon: "💻",
    color: "text-indigo-400",
    borderColor: "border-indigo-500/30",
    bg: "bg-indigo-500/10",
    activeBg: "bg-indigo-500/20 ring-1 ring-indigo-400/50",
  },
  {
    id: "executor",
    name: "Executor",
    role: "Bundling, Environment & Shell",
    icon: "⚡",
    color: "text-amber-400",
    borderColor: "border-amber-500/30",
    bg: "bg-amber-500/10",
    activeBg: "bg-amber-500/20 ring-1 ring-amber-400/50",
  },
  {
    id: "reviewer",
    name: "Reviewer",
    role: "Security, UX & Quality Audit",
    icon: "🛡️",
    color: "text-pink-400",
    borderColor: "border-pink-500/30",
    bg: "bg-pink-500/10",
    activeBg: "bg-pink-500/20 ring-1 ring-pink-400/50",
  },
  {
    id: "tester",
    name: "Tester",
    role: "Automated Test Suite & Verification",
    icon: "🧪",
    color: "text-emerald-400",
    borderColor: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    activeBg: "bg-emerald-500/20 ring-1 ring-emerald-400/50",
  },
  {
    id: "documenter",
    name: "Documenter",
    role: "Architecture Specs & README",
    icon: "📄",
    color: "text-cyan-400",
    borderColor: "border-cyan-500/30",
    bg: "bg-cyan-500/10",
    activeBg: "bg-cyan-500/20 ring-1 ring-cyan-400/50",
  },
];

const AGENT_STYLES: Record<string, { icon: string; color: string; bg: string }> = {
  planner: { icon: "P", color: "text-[#60a5fa]", bg: "bg-[#3b82f618]" },
  coder: { icon: "C", color: "text-[#818cf8]", bg: "bg-[#6366f118]" },
  coding: { icon: "C", color: "text-[#818cf8]", bg: "bg-[#6366f118]" },
  executor: { icon: "E", color: "text-[#f59e0b]", bg: "bg-[#f59e0b18]" },
  tester: { icon: "T", color: "text-[#34d399]", bg: "bg-[#10b98118]" },
  testing: { icon: "T", color: "text-[#34d399]", bg: "bg-[#10b98118]" },
  reviewer: { icon: "R", color: "text-[#f472b6]", bg: "bg-[#ec489918]" },
  review: { icon: "R", color: "text-[#f472b6]", bg: "bg-[#ec489918]" },
  documenter: { icon: "D", color: "text-[#38bdf8]", bg: "bg-[#0ea5e918]" },
  documentation: { icon: "D", color: "text-[#38bdf8]", bg: "bg-[#0ea5e918]" },
};

const STATUS_STYLES: Record<string, string> = {
  running: "bg-[var(--steel-dim)] text-[var(--steel)]",
  completed: "bg-[#16a34a18] text-[#4ade80]",
  pending: "bg-[var(--border2)] text-[var(--muted2)]",
  failed: "bg-[#dc262618] text-[#f87171]",
};

export function AgentTimeline({ steps, narration }: AgentTimelineProps) {
  const doneCount = steps.filter((s) => s.status === "completed").length;

  return (
    <div className="space-y-4">

      {/* Narration box */}
      {narration && (
        <div className="flex items-center gap-2 p-[9px_12px] rounded-md border-l-[3px] border-l-[var(--steel)] bg-[#7B93B008] border border-[#7B93B015]">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--steel)"
            strokeWidth="2"
            className="flex-shrink-0 opacity-70"
          >
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
          <span className="text-xs text-[var(--ice)] italic">
            &ldquo;{narration}&rdquo;
          </span>
        </div>
      )}

      {/* Progress summary — how many steps are ticked off */}
      {steps.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] uppercase font-semibold tracking-wide text-[var(--muted)]">
              Execution Pipeline
            </span>
            <span className="text-[10px] text-[var(--muted2)] font-mono">
              {doneCount} / {steps.length} steps completed
            </span>
          </div>
          <div className="h-[4px] rounded-full bg-[var(--border2)] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${(doneCount / Math.max(steps.length, 1)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Step-by-step Timeline */}
      <div className="flex flex-col gap-[6px]">
        {steps.map((step, i) => {
          const style = AGENT_STYLES[step.agent] || AGENT_STYLES.executor;
          const isActive = step.status === "running";
          const isCompleted = step.status === "completed";
          const isFailed = step.status === "failed";

          return (
            <div
              key={i}
              className={`p-[10px_12px] rounded-[8px] border transition-all ${
                isActive
                  ? "border-[#7B93B044] bg-[#7B93B010] shadow-sm ring-1 ring-[#7B93B022]"
                  : isCompleted
                  ? "border-[#16a34a22] bg-[#16a34a08]"
                  : isFailed
                  ? "border-rose-500/30 bg-rose-500/10"
                  : "border-[#14141a] bg-[var(--surface2)]"
              }`}
            >
              {/* Header row: Status indicator + Agent Name + Completion state */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      isCompleted
                        ? "bg-[#4ade80] shadow-[0_0_6px_#4ade8088]"
                        : isActive
                        ? "bg-amber-400 animate-pulse shadow-[0_0_6px_#f59e0b88]"
                        : isFailed
                        ? "bg-rose-500"
                        : "bg-[var(--border2)]"
                    }`}
                  />
                  <span className={`text-[11px] font-bold uppercase tracking-[0.5px] truncate ${style.color}`}>
                    {step.agent}
                  </span>
                </div>
                <span className={`text-[9.5px] px-[7px] py-[1.5px] rounded-[4px] font-semibold flex-shrink-0 ${STATUS_STYLES[step.status]}`}>
                  {step.status === "completed"
                    ? "Done"
                    : step.status === "running"
                    ? "Running"
                    : step.status === "failed"
                    ? "Error"
                    : "Pending"}
                </span>
              </div>

              {/* Task description */}
              <div className="text-xs text-[var(--text4)] mt-1.5 leading-relaxed pl-4">
                {step.description}
              </div>

              {/* Associated files */}
              {step.files && step.files.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 pl-4">
                  {step.files.map((file, j) => (
                    <span
                      key={j}
                      className="text-[10px] px-[7px] py-[2px] rounded-[3px] bg-[var(--surface)] text-[var(--steel)] font-mono border border-[var(--border2)]"
                    >
                      {file}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {steps.length === 0 && !narration && (
        <div className="text-center text-[var(--muted)] text-xs py-8">
          The 6-agent cohort is standing by. Speak or type a command to trigger the pipeline.
        </div>
      )}
    </div>
  );
}
