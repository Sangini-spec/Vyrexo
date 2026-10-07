"use client";

import { useState, useRef } from "react";

interface LayerData {
  id: string;
  name: string;
  icon: string;
  color: string;
  zBase: number;
  badge: string;
  summary: string;
  specs: Array<{ label: string; value: string }>;
  telemetry: string;
}

const LAYERS: LayerData[] = [
  {
    id: "voice",
    name: "Voice Interface",
    icon: "🎙️",
    color: "#8a9cb8",
    zBase: 240,
    badge: "FRONTEND I/O",
    summary:
      "Acoustic beamforming, wake word detection ('Hey Rex'), browser Web Audio API, and barge-in suppression.",
    specs: [
      { label: "Speech Engine", value: "Whisper Web STT + Neural Edge-TTS" },
      { label: "Audio Sampling", value: "48 kHz PCM Float32" },
      { label: "Latency", value: "< 140ms acoustic response" },
    ],
    telemetry: "STREAMING DUPLEX",
  },
  {
    id: "conversation",
    name: "Conversation Engine",
    icon: "💬",
    color: "#7a8cb0",
    zBase: 190,
    badge: "SEMANTIC DISPATCH",
    summary:
      "Fast intent extraction, emotion cadence modulation, context stitching, and real-time interruption handling.",
    specs: [
      { label: "Turn Manager", value: "Barge-in acoustic suppression" },
      { label: "Memory State", value: "Ephemeral sliding token buffer" },
      { label: "Emotion Model", value: "Adaptive Pitch & Cadence" },
    ],
    telemetry: "STATEFUL SESSIONS",
  },
  {
    id: "orchestrator",
    name: "Agent Orchestrator",
    icon: "🧠",
    color: "#5a7aa0",
    zBase: 140,
    badge: "LANGGRAPH CORE",
    summary:
      "State graph executor determining parallel sub-agent handoffs, loop barriers, and human-in-the-loop approvals.",
    specs: [
      { label: "Graph Engine", value: "Directed Acyclic Sub-Task DAG" },
      { label: "Concurrency", value: "Up to 6 agents in parallel" },
      { label: "Fail-Safe", value: "3-tier self-healing retry" },
    ],
    telemetry: "ACTIVE GRAPH DISPATCH",
  },
  {
    id: "agents",
    name: "6 Autonomous Agents",
    icon: "⚡",
    color: "#4a6a90",
    zBase: 90,
    badge: "COGNITIVE MATRIX",
    summary:
      "Specialized roles: Planner decomposes goals, Coder writes files, Executor runs shells, Tester verifies, Reviewer audits.",
    specs: [
      { label: "Active Cohort", value: "Planner, Coder, Exec, Test, Review, Doc" },
      { label: "Reasoning Tier", value: "Gemini 2.5 Pro & Flash" },
      { label: "Verification", value: "Automated test passes before commit" },
    ],
    telemetry: "6/6 AGENTS ONLINE",
  },
  {
    id: "tools",
    name: "Tool & System Bridge",
    icon: "🔧",
    color: "#3a5a80",
    zBase: 40,
    badge: "SANDBOX I/O",
    summary:
      "Direct deterministic system actions: file edits, linting, dependency installation, compiler triggers, and git commits.",
    specs: [
      { label: "Available Tools", value: "13 system, git & web tools" },
      { label: "Security Policy", value: "Sandboxed workspace isolation" },
      { label: "Execution Time", value: "Deterministic sub-millisecond IPC" },
    ],
    telemetry: "13 TOOLS LOADED",
  },
  {
    id: "knowledge",
    name: "Context & Vector RAG",
    icon: "📚",
    color: "#2a4a70",
    zBase: -10,
    badge: "KNOWLEDGE STORE",
    summary:
      "ChromaDB embeddings, live project AST traversal, and codebase indexing for instant structural query responses.",
    specs: [
      { label: "Vector Database", value: "ChromaDB Embedded" },
      { label: "Embeddings", value: "Cosine similarity semantic search" },
      { label: "File Indexer", value: "AST structural indexing" },
    ],
    telemetry: "RAG EMBEDDINGS SYNCED",
  },
];

export function Protocol3DStack() {
  const [activeLayerId, setActiveLayerId] = useState<string>("agents");
  const [mouseRot, setMouseRot] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const activeLayer = LAYERS.find((l) => l.id === activeLayerId) || LAYERS[0];

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseRot({
      x: ny * 12,
      y: nx * 14,
    });
  };

  const handleMouseLeave = () => {
    setMouseRot({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16 pt-8 pb-12"
    >
      {/* ── Left: 3D Exploded Layer Stack ── */}
      <div
        className="flex-1 w-full max-w-[500px] flex items-center justify-center py-12"
        style={{ perspective: "1400px" }}
      >
        <div
          className="relative transition-transform duration-300 ease-out cursor-pointer"
          style={{
            transform: `rotateX(${48 + mouseRot.x}deg) rotateZ(${-28 + mouseRot.y}deg) rotateY(${4}deg)`,
            transformStyle: "preserve-3d",
          }}
        >
          {/* Vertical axis light beam running through all layers */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-[340px] pointer-events-none"
            style={{
              transform: "rotateX(-90deg) translateZ(100px)",
              background:
                "linear-gradient(to top, rgba(42,74,112,0.1), rgba(123,147,176,0.6), rgba(192,200,212,0.1))",
              boxShadow: "0 0 15px rgba(123,147,176,0.4)",
            }}
          />

          {LAYERS.map((layer, idx) => {
            const isSelected = activeLayerId === layer.id;
            // On hover/selection, lift the active layer further upward
            const zPos = isSelected ? layer.zBase + 28 : layer.zBase;
            const xShift = idx * 6;

            return (
              <div
                key={layer.id}
                onClick={() => setActiveLayerId(layer.id)}
                onMouseEnter={() => setActiveLayerId(layer.id)}
                className={`group relative w-[310px] sm:w-[350px] h-[64px] rounded-xl border flex items-center gap-4 px-5 transition-all duration-500 select-none ${
                  isSelected
                    ? "ring-2 ring-[var(--steel)] shadow-[0_20px_50px_rgba(59,89,152,0.25)] scale-[1.03]"
                    : "hover:scale-[1.02]"
                }`}
                style={{
                  transform: `translateZ(${zPos}px) translateX(${xShift}px)`,
                  transformStyle: "preserve-3d",
                  background: isSelected
                    ? `linear-gradient(135deg, ${layer.color}35, ${layer.color}15)`
                    : `linear-gradient(135deg, ${layer.color}18, ${layer.color}06)`,
                  borderColor: isSelected ? layer.color : `${layer.color}30`,
                }}
              >
                {/* Layer Icon */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 transition-transform group-hover:scale-110"
                  style={{
                    background: `${layer.color}20`,
                    boxShadow: isSelected ? `0 0 12px ${layer.color}50` : "none",
                  }}
                >
                  {layer.icon}
                </div>

                {/* Layer Name & Tag */}
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[14px] sm:text-[15px] font-semibold tracking-wide truncate"
                    style={{ color: isSelected ? "#ffffff" : layer.color }}
                  >
                    {layer.name}
                  </div>
                  <div className="text-[10px] tracking-[1.5px] uppercase text-[var(--muted2)] font-mono">
                    {layer.badge}
                  </div>
                </div>

                {/* Pulsing indicator node */}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      isSelected ? "scale-125" : "opacity-60"
                    }`}
                    style={{
                      background: layer.color,
                      boxShadow: `0 0 10px ${layer.color}`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: Live Layer Diagnostic Terminal ── */}
      <div className="flex-1 w-full max-w-[480px]">
        <div className="relative p-6 sm:p-8 rounded-2xl border border-[#5a7aa025] bg-[var(--card)]/90 backdrop-blur-xl shadow-2xl transition-all duration-500">
          {/* Header pill */}
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border2)]/50">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{activeLayer.icon}</span>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[2px] text-[var(--steel)]">
                  Active Layer Inspection
                </span>
                <h3 className="text-[20px] font-bold text-[var(--text)] tracking-tight">
                  {activeLayer.name}
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#3B599818] border border-[#3B599830] text-[10px] font-mono text-[var(--steel)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
              <span>{activeLayer.telemetry}</span>
            </div>
          </div>

          {/* Description */}
          <p className="mt-4 text-[14px] text-[var(--muted2)] leading-relaxed min-h-[50px]">
            {activeLayer.summary}
          </p>

          {/* Specifications list */}
          <div className="mt-6 space-y-3">
            {activeLayer.specs.map((spec, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface2)]/80 border border-[var(--border2)] text-xs"
              >
                <span className="text-[var(--muted)] font-medium">{spec.label}</span>
                <span className="font-mono text-[var(--text2)] font-semibold">{spec.value}</span>
              </div>
            ))}
          </div>

          {/* Quick layer tabs */}
          <div className="mt-6 pt-4 border-t border-[var(--border2)]/50 flex flex-wrap gap-1.5">
            {LAYERS.map((layer) => (
              <button
                key={layer.id}
                onClick={() => setActiveLayerId(layer.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  activeLayerId === layer.id
                    ? "bg-[#3B599825] text-[var(--text)] border border-[var(--steel)]"
                    : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text2)] border border-transparent"
                }`}
              >
                {layer.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
