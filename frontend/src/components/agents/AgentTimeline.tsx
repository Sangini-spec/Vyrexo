"use client";

export interface AgentStep {
  agent: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed";
  files?: string[];
}

interface AgentTimelineProps {
  steps: AgentStep[];
  narration?: string;
}

const AGENT_STYLES: Record<string, { icon: string; color: string; bg: string }> = {
  planner: { icon: "P", color: "text-[#3B5998]", bg: "bg-[#3B599818]" },
  coding: { icon: "C", color: "text-[#7B93B0]", bg: "bg-[#7B93B015]" },
  testing: { icon: "T", color: "text-[#4ade80]", bg: "bg-[#16a34a18]" },
  review: { icon: "R", color: "text-[#C0C8D4]", bg: "bg-[#C0C8D418]" },
  executor: { icon: "E", color: "text-[var(--text3)]", bg: "bg-[#52525218]" },
  documentation: { icon: "D", color: "text-[#7B93B0]", bg: "bg-[#7B93B015]" },
};

const STATUS_STYLES: Record<string, string> = {
  running: "bg-[var(--steel-dim)] text-[var(--steel)]",
  completed: "bg-[#16a34a18] text-[#4ade80]",
  pending: "bg-[var(--border2)] text-[var(--muted2)]",
  failed: "bg-[#dc262618] text-[#f87171]",
};

export function AgentTimeline({ steps, narration }: AgentTimelineProps) {
  if (steps.length === 0 && !narration) {
    return (
      <div className="text-center text-[var(--muted)] text-xs mt-8">
        No tasks yet — give Rex a command and its plan will show up here.
      </div>
    );
  }

  return (
    <div>
      {/* Narration box */}
      {narration && (
        <div className="flex items-center gap-2 p-[9px_12px] mb-3 rounded-md border-l-[3px] border-l-[var(--steel)] bg-[#7B93B008] border border-[#7B93B015]">
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
      {steps.length > 0 && (() => {
        const done = steps.filter((s) => s.status === "completed").length;
        return (
          <div className="mb-2">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Plan</span>
              <span className="text-[10px] text-[var(--muted2)]">{done} / {steps.length} done</span>
            </div>
            <div className="h-[3px] rounded-full bg-[var(--border2)] overflow-hidden">
              <div className="h-full bg-[#4ade80] transition-all duration-300" style={{ width: `${(done / steps.length) * 100}%` }} />
            </div>
          </div>
        );
      })()}

      {/* Timeline */}
      <div className="flex flex-col gap-[3px]">
        {steps.map((step, i) => {
          const style = AGENT_STYLES[step.agent] || AGENT_STYLES.executor;
          const isActive = step.status === "running";
          const isCompleted = step.status === "completed";

          return (
            <div
              key={i}
              className={`flex items-start gap-[9px] p-[9px_10px] rounded-[7px] border transition-all
                ${isActive ? "border-[#7B93B033] bg-[#7B93B00c]" : isCompleted ? "border-[#16a34a22] bg-[#16a34a08]" : "border-[#14141a] bg-[var(--surface2)]"}
              `}
            >
              {/* Status-aware icon: check when done, spinner when running, else agent letter */}
              <div
                className={`w-6 h-6 rounded-[5px] flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                  isCompleted ? "bg-[#16a34a22] text-[#4ade80]" : `${style.bg} ${style.color}`
                }`}
              >
                {isCompleted ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                ) : isActive ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.2-8.5" /></svg>
                ) : (
                  style.icon
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-[7px]">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-[0.5px] ${style.color}`}
                  >
                    {step.agent}
                  </span>
                  <span
                    className={`text-[9px] px-[6px] py-[1px] rounded-[3px] font-semibold ${STATUS_STYLES[step.status]}`}
                  >
                    {step.status === "completed" ? "Done" : step.status === "running" ? "Running" : step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                  </span>
                </div>
                <div className="text-xs text-[var(--text4)] mt-[2px] leading-relaxed">
                  {step.description}
                </div>
                {step.files && step.files.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-[5px]">
                    {step.files.map((file, j) => (
                      <span
                        key={j}
                        className="text-[10px] px-[7px] py-[2px] rounded-[3px] bg-[var(--surface2)] text-[var(--steel)] font-mono border border-[var(--border2)]"
                      >
                        {file}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
