"use client";

import React, { useId } from "react";

interface VyrexoLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  withSurface?: boolean;
  forceDark?: boolean;
  className?: string;
}

/**
 * Universal Vyrexo Brand Logo component derived from /assets/aistudio/vyrexo-logo-universal_be4b0ebf.svg
 * and re-themed to match the exact Vyrexo application palette:
 * - Dark Theme: Luminous Ice (#EDF2F8) -> Steel (#9AB0CD / #5A7AA0) -> Midnight (#2B4270 / #0E1729)
 * - Light Theme: Deep Midnight (#1E325C) -> Royal Steel (#3B5998 / #5A72A0) for high contrast
 * - Acoustic Waveform Pulse: Ice-Cyan (#7DD3FC -> #C0C8D4) instead of clashing orange
 * - 100% transparent background submerged directly into the page theme (no box/container).
 */
export function VyrexoLogo({
  size = "md",
  forceDark = false,
  className = "",
}: VyrexoLogoProps) {
  const rawId = useId().replace(/:/g, "");
  const orbId = `vyrexo-orb-${rawId}`;
  const rimId = `vyrexo-rim-${rawId}`;
  const wordId = `vyrexo-word-${rawId}`;
  const waveId = `vyrexo-wave-${rawId}`;

  const sizeClasses =
    size === "sm"
      ? "h-[34px] sm:h-[36px] w-auto"
      : size === "md"
      ? "h-[38px] sm:h-[42px] w-auto"
      : size === "lg"
      ? "h-[42px] sm:h-[48px] w-auto"
      : "h-[46px] sm:h-[52px] lg:h-[58px] w-auto";

  const orb1 = forceDark ? "#D6E2F0" : "var(--logo-orb-1)";
  const orb2 = forceDark ? "#5A7AA0" : "var(--logo-orb-2)";
  const orb3 = forceDark ? "#2B4270" : "var(--logo-orb-3)";
  const orb4 = forceDark ? "#0E1729" : "var(--logo-orb-4)";
  const rimColor = forceDark ? "#7B93B0" : "var(--logo-rim)";
  const bracketColor = forceDark ? "#F4F7FB" : "var(--logo-bracket)";
  const waveColor = forceDark ? "#7DD3FC" : "var(--logo-wave)";
  const word1 = forceDark ? "#EDF2F8" : "var(--logo-word-1)";
  const word2 = forceDark ? "#9AB0CD" : "var(--logo-word-2)";
  const word3 = forceDark ? "#5A7AA0" : "var(--logo-word-3)";

  return (
    <span
      className={`inline-flex items-center justify-start bg-transparent border-0 p-0 select-none transition-transform duration-300 group-hover:scale-[1.02] ${className}`}
      aria-label="VYREXO"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="14 14 456 132"
        className={`${sizeClasses} block bg-transparent overflow-visible`}
        role="img"
        aria-label="VYREXO"
      >
        <defs>
          <radialGradient id={orbId} cx="33%" cy="28%" r="78%">
            <stop offset="0%" stopColor={orb1} />
            <stop offset="30%" stopColor={orb2} />
            <stop offset="66%" stopColor={orb3} />
            <stop offset="100%" stopColor={orb4} />
          </radialGradient>
          <radialGradient id={rimId} cx="50%" cy="50%" r="50%">
            <stop offset="78%" stopColor={rimColor} stopOpacity="0" />
            <stop offset="92%" stopColor={rimColor} stopOpacity="0.55" />
            <stop offset="100%" stopColor={rimColor} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={wordId} x1="0%" y1="0%" x2="100%" y2="60%">
            <stop offset="0%" stopColor={word1} />
            <stop offset="48%" stopColor={word2} />
            <stop offset="100%" stopColor={word3} />
          </linearGradient>
          <linearGradient id={waveId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={waveColor} />
            <stop offset="100%" stopColor="#C0C8D4" />
          </linearGradient>
        </defs>

        <g transform="translate(16,16) scale(0.64)">
          <circle cx="100" cy="100" r="98" fill={`url(#${rimId})`} />
          <circle cx="100" cy="100" r="94" fill={`url(#${orbId})`} />
          <ellipse cx="70" cy="56" rx="42" ry="26" fill="#FFFFFF" opacity="0.18" />
          <path
            d="M80,66 L52,100 L80,134"
            fill="none"
            stroke={bracketColor}
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M120,66 L148,100 L120,134"
            fill="none"
            stroke={bracketColor}
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M84,100 L92,100 L97,82 L105,118 L112,86 L118,100 L124,100"
            fill="none"
            stroke={`url(#${waveId})`}
            strokeWidth="6.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="124" cy="100" r="4.5" fill={waveColor} />
        </g>

        <text
          x="168"
          y="100"
          fontFamily="'Outfit','Poppins','Segoe UI',Arial,sans-serif"
          fontSize="56"
          fontWeight="700"
          letterSpacing="6"
          fill={`url(#${wordId})`}
        >
          VYREXO
        </text>
      </svg>
    </span>
  );
}
