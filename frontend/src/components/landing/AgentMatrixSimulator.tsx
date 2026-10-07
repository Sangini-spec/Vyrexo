"use client";

import { useState, useEffect } from "react";

interface AgentStep {
  agent: "Planner" | "Coder" | "Executor" | "Tester" | "Reviewer" | "Documenter";
  status: "pending" | "running" | "done";
  detail: string;
  time: string;
}

interface Scenario {
  id: string;
  title: string;
  prompt: string;
  steps: AgentStep[];
}

const SCENARIOS: Scenario[] = [
  {
    id: "auth",
    title: "Supabase Auth Flow",
    prompt: "Hey Rex, set up full OAuth and email sign-in with persistent Supabase sessions.",
    steps: [
      {
        agent: "Planner",
        status: "done",
        detail: "Synthesizing schema: auth-context, Google/GitHub OAuth, session listener",
        time: "0.12s",
      },
      {
        agent: "Coder",
        status: "done",
        detail: "Generated /src/lib/supabase.ts & AuthProvider with autoRefreshToken",
        time: "0.65s",
      },
      {
        agent: "Executor",
        status: "done",
        detail: "Loaded @supabase/supabase-js, verified environment variable bindings",
        time: "0.22s",
      },
      {
        agent: "Tester",
        status: "done",
        detail: "Passed 4/4 auth flows: session restore, token refresh, redirect, error states",
        time: "0.34s",
      },
      {
        agent: "Reviewer",
        status: "done",
        detail: "Audited security: Zero token leakages, strictly httpOnly / client separation",
        time: "0.18s",
      },
      {
        agent: "Documenter",
        status: "done",
        detail: "Generated Auth Integration Guide and updated environment checklist",
        time: "0.09s",
      },
    ],
  },
  {
    id: "voice",
    title: "Live Voice Pipeline",
    prompt: "Hey Rex, add voice barge-in with acoustic feedback cancellation.",
    steps: [
      {
        agent: "Planner",
        status: "done",
        detail: "Decomposing into: SpeechRecognition loop, audio state sync, interruption hook",
        time: "0.09s",
      },
      {
        agent: "Coder",
        status: "done",
        detail: "Engineered useVoice.ts with active conversational interrupt detector",
        time: "0.58s",
      },
      {
        agent: "Executor",
        status: "done",
        detail: "Configured 48kHz audio context constraints & permission safeguards",
        time: "0.19s",
      },
      {
        agent: "Tester",
        status: "done",
        detail: "Acoustic feedback verified: zero echo-back loop detected",
        time: "0.27s",
      },
      {
        agent: "Reviewer",
        status: "done",
        detail: "Verified memory cleanup: event listeners and speech synthesizers cleanly unmounted",
        time: "0.14s",
      },
      {
        agent: "Documenter",
        status: "done",
        detail: "Documented barge-in state transition matrix for client hooks",
        time: "0.08s",
      },
    ],
  },
  {
    id: "feature",
    title: "Rapid 3D Dashboard",
    prompt: "Hey Rex, build an interactive 3D telemetry dashboard with dark mode.",
    steps: [
      {
        agent: "Planner",
        status: "done",
        detail: "Specifying layout: 3D perspective canvas, metric cards, theme context",
        time: "0.11s",
      },
      {
        agent: "Coder",
        status: "done",
        detail: "Crafted 3D tilt cards with specular light reflection and CSS variables",
        time: "0.72s",
      },
      {
        agent: "Executor",
        status: "done",
        detail: "Built production bundle: compiled in 820ms, zero CSS conflicts",
        time: "0.31s",
      },
      {
        agent: "Tester",
        status: "done",
        detail: "Verified 60fps frame budget across desktop and mobile screens",
        time: "0.25s",
      },
      {
        agent: "Reviewer",
        status: "done",
        detail: "Contrast check: Passed WCAG AA standards across dark and light palettes",
        time: "0.15s",
      },
      {
        agent: "Documenter",
        status: "done",
        detail: "Generated component API docs and CSS token specifications",
        time: "0.07s",
      },
    ],
  },
];

const AGENT_COLORS: Record<string, string> = {
  Planner: "#2a4070",
  Coder: "#5a7aa0",
  Executor: "#8a9cb8",
  Tester: "#4ade80",
  Reviewer: "#f59e0b",
  Documenter: "#a78bfa",
};

export function AgentMatrixSimulator() {
  const [activeScenarioId, setActiveScenarioId] = useState<string>("auth");
  const [animatingStep, setAnimatingStep] = useState<number>(6);

  const scenario = SCENARIOS.find((s) => s.id === activeScenarioId) || SCENARIOS[0];

  useEffect(() => {
    // Replay animation on scenario change
    setAnimatingStep(0);
    const interval = setInterval(() => {
      setAnimatingStep((prev) => {
        if (prev < 6) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 280);
    return () => clearInterval(interval);
  }, [activeScenarioId]);

  return (
    <div className="w-full max-w-[900px] mx-auto mt-12 rounded-2xl border border-[#5a7aa025] bg-[var(--card)]/80 backdrop-blur-xl shadow-2xl overflow-hidden">
      {/* Top terminal bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-[var(--panel-bar)] border-b border-[var(--border2)]/60">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ef4444]/80" />
          <div className="w-3 h-3 rounded-full bg-[#f59e0b]/80" />
          <div className="w-3 h-3 rounded-full bg-[#10b981]/80" />
          <span className="ml-2 font-mono text-xs text-[var(--muted2)]">
            rex-orchestrator://live-matrix
          </span>
        </div>

        {/* Preset scenario triggers */}
        <div className="flex items-center gap-2">
          {SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              onClick={() => setActiveScenarioId(sc.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeScenarioId === sc.id
                  ? "bg-[#3B599825] text-[var(--text)] border border-[var(--steel)] shadow-sm"
                  : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text2)] border border-[var(--border2)]"
              }`}
            >
              {sc.title}
            </button>
          ))}
        </div>
      </div>

      {/* Voice prompt input simulation */}
      <div className="p-6 border-b border-[var(--border2)]/40 bg-[var(--surface2)]/40">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#3B599820] border border-[#3B599840] flex items-center justify-center text-sm flex-shrink-0">
            🎙️
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--steel)]">
              Developer Voice Input
            </div>
            <p className="text-[15px] font-medium text-[var(--text)] mt-1">
              &ldquo;{scenario.prompt}&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* 6 Agent Orchestration pipeline steps */}
      <div className="p-6 space-y-3 font-mono text-xs">
        {scenario.steps.map((step, idx) => {
          const isVisible = idx < animatingStep;
          const isCurrent = idx === animatingStep - 1;
          const color = AGENT_COLORS[step.agent] || "#5a7aa0";

          return (
            <div
              key={step.agent}
              className={`flex items-start justify-between gap-4 p-3 rounded-lg border transition-all duration-300 ${
                isVisible
                  ? "opacity-100 translate-x-0 bg-[var(--surface2)]/70 border-[var(--border2)]"
                  : "opacity-20 translate-x-2 bg-transparent border-transparent"
              } ${isCurrent ? "ring-1 ring-[var(--steel)]" : ""}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className="px-2 py-0.5 rounded text-[11px] font-bold tracking-wide"
                  style={{
                    background: `${color}18`,
                    color: color,
                    border: `1px solid ${color}35`,
                  }}
                >
                  {step.agent}
                </span>
                <span className="text-[var(--text2)] leading-relaxed">{step.detail}</span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 text-[var(--muted2)]">
                {isVisible ? (
                  <>
                    <span className="text-[#4ade80]">✓</span>
                    <span>{step.time}</span>
                  </>
                ) : (
                  <span className="text-[var(--muted)]">waiting</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer status summary */}
      <div className="px-6 py-3 bg-[var(--panel-bar)] border-t border-[var(--border2)]/60 flex items-center justify-between text-xs text-[var(--muted2)] font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
          <span>Pipeline execution completed in 1.69s</span>
        </div>
        <span className="text-[var(--steel)] font-semibold">Zero human intervention required</span>
      </div>
    </div>
  );
}
