"use client";

import { useEffect, useState } from "react";

export type OrbState = "idle" | "listening" | "speaking" | "thinking";

interface OrbProps {
  state: OrbState;
  transcript?: string;
  onClick?: () => void;
}

const STATE_CONFIG: Record<OrbState, { label: string; color: string; gradient: string }> = {
  idle: {
    label: "Ready",
    color: "text-[var(--steel)]",
    gradient: "from-[#C0C8D4] via-[#7B93B0] to-[#3B5998]",
  },
  listening: {
    label: "Listening",
    color: "text-[var(--steel)]",
    gradient: "from-[#C0C8D4] via-[#7B93B0] to-[#3B5998]",
  },
  speaking: {
    label: "Speaking",
    color: "text-[var(--ice)]",
    gradient: "from-[#C0C8D4] via-[#7B93B0] to-[#3B5998]",
  },
  thinking: {
    label: "Thinking",
    color: "text-[var(--midnight)]",
    gradient: "from-[#7B93B0] via-[#3B5998] to-[#2a4070]",
  },
};

export function Orb({ state, transcript, onClick }: OrbProps) {
  const config = STATE_CONFIG[state];

  return (
    <div className="flex flex-col items-center">
      {/* Orb */}
      <div
        className="relative flex items-center justify-center w-[200px] h-[200px] cursor-pointer"
        onClick={onClick}
      >
        {/* Outer glow */}
        <div
          className="absolute w-[200px] h-[200px] rounded-full opacity-70"
          style={{
            background: "radial-gradient(circle, rgba(123,147,176,0.13) 0%, transparent 70%)",
            animation: "orb-breathe 4s ease-in-out infinite",
          }}
        />

        {/* Outer ring */}
        <div
          className="absolute w-[165px] h-[165px] rounded-full border border-[#3B599815]"
          style={{ animation: "orb-breathe 4s ease-in-out infinite 0.5s" }}
        />

        {/* Inner ring */}
        <div
          className="absolute w-[135px] h-[135px] rounded-full border border-[#7B93B020]"
          style={{ animation: "orb-breathe 4s ease-in-out infinite 1s" }}
        />

        {/* Core */}
        <div
          className="relative w-[100px] h-[100px] rounded-full"
          style={{
            background: "radial-gradient(circle at 35% 35%, #C0C8D4, #7B93B0, #3B5998)",
            boxShadow:
              "0 0 50px #7B93B033, 0 0 100px #3B59981A, inset 0 0 30px #C0C8D433",
            animation:
              state === "listening"
                ? "orb-listen 1.2s ease-in-out infinite"
                : state === "speaking"
                ? "orb-speak 0.6s ease-in-out infinite alternate"
                : state === "thinking"
                ? "orb-think 2s linear infinite"
                : "orb-pulse 4s ease-in-out infinite",
          }}
        />
      </div>

      {/* State label */}
      <div
        className={`mt-7 text-xs font-semibold tracking-[1.5px] uppercase ${config.color}`}
      >
        {config.label}
      </div>

      {/* Live transcript */}
      {transcript && (
        <div className="mt-2 text-[13px] text-[var(--muted2)] italic text-center max-w-[340px] leading-relaxed">
          &ldquo;{transcript}&rdquo;
        </div>
      )}

      {/* Waveform */}
      {(state === "listening" || state === "speaking") && <Waveform />}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes orb-breathe {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.7; }
        }
        @keyframes orb-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @keyframes orb-listen {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.06); }
          50% { transform: scale(0.97); }
          75% { transform: scale(1.08); }
        }
        @keyframes orb-speak {
          0% { transform: scale(1); }
          100% { transform: scale(1.12); }
        }
        @keyframes orb-think {
          0% { transform: rotate(0deg) scale(1.02); }
          100% { transform: rotate(360deg) scale(1.02); }
        }
      `}</style>
    </div>
  );
}

function Waveform() {
  const bars = [
    { h: 6, delay: "0s", color: "#3B5998" },
    { h: 12, delay: "0.1s", color: "#3B5998" },
    { h: 18, delay: "0.15s", color: "#7B93B0" },
    { h: 10, delay: "0.25s", color: "#7B93B0" },
    { h: 22, delay: "0.1s", color: "#C0C8D4" },
    { h: 14, delay: "0.2s", color: "#7B93B0" },
    { h: 8, delay: "0.3s", color: "#3B5998" },
  ];

  return (
    <div className="flex items-center gap-[3px] h-[22px] mt-4">
      {bars.map((bar, i) => (
        <div
          key={i}
          className="w-[3px] rounded-sm"
          style={{
            height: bar.h,
            background: bar.color,
            animation: `wave 0.8s ease-in-out infinite ${bar.delay}`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.3); }
        }
      `}</style>
    </div>
  );
}
