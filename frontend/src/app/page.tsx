"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Neural3DCanvas } from "@/components/landing/Neural3DCanvas";
import { Tilt3DCard } from "@/components/landing/Tilt3DCard";
import { InteractiveVoiceHero } from "@/components/landing/InteractiveVoiceHero";
import { Protocol3DStack } from "@/components/landing/Protocol3DStack";
import { AgentMatrixSimulator } from "@/components/landing/AgentMatrixSimulator";

// ── Typewriter Effect ──────────────────────────────────────────
function Typewriter({
  text,
  speed = 40,
  delay = 0,
  className = "",
}: {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
}) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    if (displayed.length < text.length) {
      const t = setTimeout(
        () => setDisplayed(text.slice(0, displayed.length + 1)),
        speed
      );
      return () => clearTimeout(t);
    }
  }, [displayed, text, speed, started]);

  return (
    <span className={className}>
      {displayed}
      {displayed.length < text.length && started && (
        <span className="inline-block w-[2px] h-[1em] bg-[#5a7aa0] ml-[2px] animate-pulse" />
      )}
    </span>
  );
}

// ── Scroll Reveal ──────────────────────────────────────────────
function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const o = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setV(true);
      },
      { threshold }
    );
    if (ref.current) o.observe(ref.current);
    return () => o.disconnect();
  }, [threshold]);
  return { ref, v };
}

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, v } = useReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] ${
        v
          ? "opacity-100 translate-y-0 blur-0"
          : "opacity-0 translate-y-12 blur-[2px]"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ── Circular Progress Ring ─────────────────────────────────────
function Ring({
  progress,
  size = 112,
  label,
  value,
}: {
  progress: number;
  size?: number;
  label: string;
  value: string;
}) {
  const strokeWidth = 3.5;
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - progress * circ;

  return (
    <div className="flex flex-col items-center group cursor-default text-center">
      {/* Relative container holding both the SVG ring and centered text */}
      <div
        className="relative flex items-center justify-center transition-transform duration-500 group-hover:scale-105"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          className="absolute inset-0 -rotate-90 pointer-events-none"
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            className="text-[var(--border2)] opacity-40"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="url(#ring-grad)"
            strokeWidth={strokeWidth}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-[2.2s] ease-out"
          />
          <defs>
            <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#5a7aa0" />
              <stop offset="100%" stopColor="#8a9cb8" />
            </linearGradient>
          </defs>
        </svg>

        {/* Ambient subtle glow inside the circle */}
        <div className="absolute inset-2 rounded-full bg-[var(--steel)]/5 group-hover:bg-[var(--steel)]/10 transition-colors duration-500 blur-sm pointer-events-none" />

        {/* Perfectly centered numerical value */}
        <div className="relative z-10 text-[20px] sm:text-[22px] font-bold tracking-tight text-[var(--text)] group-hover:text-[var(--steel)] transition-colors">
          {value}
        </div>
      </div>

      {/* Label neatly spaced below the circle */}
      <div className="mt-4 text-[11px] sm:text-[12px] text-[var(--muted2)] group-hover:text-[var(--text2)] transition-colors uppercase tracking-[2.5px] font-mono font-semibold max-w-[150px] leading-tight">
        {label}
      </div>
    </div>
  );
}

// ── Main Landing Page ──────────────────────────────────────────
export default function LandingPage() {
  const { user } = useAuth();
  const [scrollY, setScrollY] = useState(0);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    setHeroVisible(true);
    const h = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--app-grad-to)] text-[var(--text2)] overflow-x-hidden relative selection:bg-[#3B599833] selection:text-[var(--text)]">
      {/* 3D Spatial Neural Network Background with Parallax and Gyroscopic Core */}
      <Neural3DCanvas />

      {/* ── Navbar ──────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrollY > 40
            ? "bg-[var(--app-grad-to)]/80 backdrop-blur-2xl border-b border-[var(--border2)]/50 shadow-lg"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8 py-4 sm:py-5 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group cursor-pointer"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg shadow-sm transition-transform duration-300 group-hover:scale-105"
              style={{ background: "linear-gradient(135deg, #3B5998, #7B93B0)" }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="8" height="8" rx="1.5" />
                <rect x="13" y="3" width="8" height="8" rx="1.5" />
                <rect x="3" y="13" width="8" height="8" rx="1.5" />
                <rect x="13" y="13" width="8" height="8" rx="1.5" />
              </svg>
            </span>
            <span
              className="text-[17px] font-bold tracking-[3px] uppercase"
              style={{
                background: "linear-gradient(90deg, #5a7aa0, #8a9cb8, #C0C8D4)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Vyrexo
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-[12px] tracking-[2.5px] uppercase text-[var(--muted2)] font-semibold">
            <a
              href="#system"
              className="hover:text-[var(--text)] transition-colors duration-300 py-1"
            >
              System
            </a>
            <a
              href="#protocol"
              className="hover:text-[var(--text)] transition-colors duration-300 py-1"
            >
              Protocol
            </a>
            <a
              href="#agents"
              className="hover:text-[var(--text)] transition-colors duration-300 py-1"
            >
              Agents
            </a>
            <a
              href="#simulator"
              className="hover:text-[var(--text)] transition-colors duration-300 py-1"
            >
              Lab
            </a>
          </div>

          {/* Actions: Theme Toggle + Single Streamlined Action (Redundant Login removed) */}
          <div className="flex items-center gap-3.5">
            <ThemeToggle />
            {user ? (
              <Link
                href="/app"
                className="flex items-center gap-2 text-[12px] tracking-[2px] uppercase text-[var(--text)] font-bold border border-[#5a7aa040] hover:border-[var(--steel)] bg-[#5a7aa018] hover:bg-[#5a7aa030] px-5 py-2.5 rounded-full transition-all duration-300 shadow-sm"
              >
                <span>Open App</span>
                <span className="text-xs">&rarr;</span>
              </Link>
            ) : (
              <Link
                href="/auth"
                className="group relative flex items-center gap-2 text-[12px] tracking-[2px] uppercase text-[var(--text)] font-bold border border-[#5a7aa045] hover:border-[var(--steel)] bg-[#5a7aa015] hover:bg-[#5a7aa025] px-5 py-2.5 rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(59,89,152,0.15)] hover:shadow-[0_0_30px_rgba(59,89,152,0.28)]"
              >
                <span className="w-2 h-2 rounded-full bg-[#5a7aa0] group-hover:scale-125 group-hover:shadow-[0_0_10px_#5a7aa0] transition-all duration-300" />
                <span>Initialize</span>
                <span className="text-xs transition-transform duration-300 group-hover:translate-x-0.5">&rarr;</span>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero Section ───────────────────────── */}
      <section className="relative min-h-[96vh] pt-36 sm:pt-40 pb-24 sm:pb-28 flex flex-col items-center justify-center px-6 sm:px-8 z-10">
        {/* System Online Badge */}
        <div
          className={`transition-all duration-[1.6s] delay-200 ${
            heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[var(--surface2)]/80 border border-[#5a7aa030] shadow-sm mb-10 sm:mb-12">
            <div className="w-[7px] h-[7px] rounded-full bg-[#4ade80] animate-pulse shadow-[0_0_10px_#4ade80aa]" />
            <span className="text-[11px] tracking-[3.5px] uppercase text-[var(--muted)] font-mono font-semibold">
              Autonomous System Online
            </span>
          </div>
        </div>

        {/* Main headline — typewriter */}
        <div
          className={`transition-all duration-[1.8s] delay-400 ${
            heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h1 className="text-center leading-[1.2] max-w-[1080px]">
            <span
              className="block text-[clamp(2.5rem,6vw,4.75rem)] font-light italic text-[var(--hero-greeting)] tracking-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              <Typewriter text="Good evening, Developer." speed={45} delay={500} />
            </span>
            <span
              className="block text-[clamp(2.5rem,5.6vw,4.4rem)] tracking-tight mt-4 sm:mt-5 font-extrabold"
              style={{
                fontFamily: "'Outfit', sans-serif",
                background: "var(--hero-rex-grad)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              <Typewriter text="I am Rex" speed={60} delay={2000} />
            </span>
          </h1>
        </div>

        {/* Subtitle with generous line-height and breathing room */}
        <div
          className={`transition-all duration-[1.8s] delay-[2.8s] ${
            heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <p className="text-[17px] sm:text-[19px] md:text-[20px] text-[var(--muted2)] text-center max-w-[720px] mt-8 sm:mt-10 mb-2 leading-[1.85] font-normal tracking-wide">
            Your voice-first AI coding agent. I plan, code, test, review, and document.
            All through natural conversation.
          </p>
        </div>

        {/* Live Interactive Voice Audition Widget with ample margin */}
        <div
          className={`w-full max-w-[660px] my-10 sm:my-12 transition-all duration-[1.8s] delay-[3.4s] ${
            heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <InteractiveVoiceHero />
        </div>

        {/* Primary Hero Call to Action */}
        <div
          className={`transition-all duration-[1.8s] delay-[3.8s] ${
            heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div className="mt-2 sm:mt-4 flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/auth"
              className="group relative inline-flex items-center gap-3.5 px-9 py-4 rounded-full border border-[#5a7aa040] hover:border-[var(--steel)] bg-[#3B599818] hover:bg-[#3B599828] text-[15px] text-[var(--text)] font-semibold tracking-[1.5px] uppercase text-xs transition-all duration-500 shadow-[0_0_40px_rgba(59,89,152,0.2)] hover:shadow-[0_0_60px_rgba(59,89,152,0.4)] cursor-pointer"
            >
              <span className="w-[8px] h-[8px] rounded-full bg-[#5a7aa0] group-hover:scale-125 group-hover:shadow-[0_0_15px_#5a7aa0] transition-all duration-300" />
              <span>Initialize Rex</span>
              <span className="text-sm transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div
          className={`mt-20 sm:mt-24 transition-all duration-[1.8s] delay-[4.2s] ${
            heroVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <a
            href="#system"
            className="flex flex-col items-center gap-2 text-[var(--muted)] hover:text-[var(--text)] transition-colors group cursor-pointer"
          >
            <span className="text-[10px] tracking-[3px] uppercase font-mono">Scroll</span>
            <div className="w-[1px] h-8 bg-gradient-to-b from-[#5a7aa060] to-transparent group-hover:h-10 transition-all duration-300" />
          </a>
        </div>
      </section>

      {/* ── System Telemetry Rings (4 Things in Circle) ──────────────── */}
      <section className="relative z-10 py-24 sm:py-28 px-6 sm:px-8 border-y border-[var(--border2)]/40 bg-[var(--surface)]/50 backdrop-blur-xl">
        <div className="max-w-[1100px] mx-auto">
          <Reveal>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10 sm:gap-12 md:gap-14 items-center justify-items-center">
              <Ring progress={1.0} label="Autonomous Agents" value="6" />
              <Ring progress={0.92} label="Integrated Tools" value="13" />
              <Ring progress={0.88} label="Voice Modulations" value="4 Tones" />
              <Ring progress={0.99} label="Pipeline Uptime" value="99.9%" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── System Overview (3D Tilt Cards) ─────── */}
      <section id="system" className="relative z-10 py-32 px-6">
        <div className="max-w-[1200px] mx-auto">
          <Reveal>
            <div className="text-center mb-20">
              <span className="text-[12px] tracking-[5px] uppercase text-[var(--steel)] font-mono font-semibold">
                System Overview
              </span>
              <h2 className="mt-4 text-[clamp(1.9rem,3.8vw,3rem)] font-medium text-[var(--text)] tracking-tight">
                What can{" "}
                <span
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontStyle: "italic",
                    color: "#8a9cb8",
                  }}
                >
                  Rex
                </span>{" "}
                orchestrate?
              </h2>
              <p className="text-[16px] text-[var(--muted2)] max-w-xl mx-auto mt-4">
                Six synchronized models connected via a real-time event graph, giving you
                an autonomous software engineering team at the speed of speech.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Voice Command & Dictation",
                desc: "Say 'Hey Rex, create an API with rate limiting' — Rex parses intent, plans the topology, and writes code while narrating in real time.",
                tag: "INPUT ENGINE",
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                ),
              },
              {
                title: "Multi-Agent Graph Pipeline",
                desc: "Six agents coordinate seamlessly — Planner decomposes architecture, Coder scripts files, Tester checks tests, Reviewer audits security.",
                tag: "CORE MATRIX",
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v4m0 12v4M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
                  </svg>
                ),
              },
              {
                title: "Barge-In & Live Redirect",
                desc: "Say 'Wait, use Supabase OAuth instead.' Rex immediately interrupts speech output, re-plans the DAG, and adjusts without missing a beat.",
                tag: "CONTROL LOOP",
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M10 9l-6 6m0-6l6 6" />
                    <path d="M20 4v7a4 4 0 0 1-4 4H5" />
                  </svg>
                ),
              },
              {
                title: "Context Intelligence & RAG",
                desc: "Ask 'Where is our authentication logic?' — Rex indexes your repo with ChromaDB and returns exact file paths and line numbers.",
                tag: "KNOWLEDGE STORE",
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                    <path d="M11 8v6m-3-3h6" />
                  </svg>
                ),
              },
              {
                title: "Emotion-Aware Voice Modulations",
                desc: "Frustrated with a tricky bug? Rex provides empathetic clarity. In a rapid flow state? Rex delivers concise, high-velocity execution.",
                tag: "ACOUSTIC AI",
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                    <line x1="9" x2="9.01" y1="9" y2="9" />
                    <line x1="15" x2="15.01" y1="9" y2="9" />
                  </svg>
                ),
              },
              {
                title: "Full Autonomous Lifecycle",
                desc: "Plan, Code, Test, Lint, Review, Document, and Git commit — execute your entire engineering workflow directly through conversation.",
                tag: "TOOL SUITE",
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                ),
              },
            ].map((f, i) => (
              <Reveal key={f.title} delay={i * 70}>
                <Tilt3DCard
                  maxTilt={7}
                  className="rounded-2xl border border-[var(--border2)]/50 bg-[var(--card)]/90 backdrop-blur-md hover:border-[#5a7aa040] shadow-md hover:shadow-xl transition-all h-full"
                >
                  <div className="p-7 flex flex-col justify-between h-full">
                    <div>
                      <div
                        className="text-[10px] tracking-[2.5px] text-[var(--steel)] uppercase font-mono font-semibold mb-4"
                        style={{ transform: "translateZ(15px)" }}
                      >
                        {f.tag}
                      </div>

                      <div
                        className="w-12 h-12 rounded-xl bg-[#5a7aa010] border border-[#5a7aa020] flex items-center justify-center text-[var(--steel)] mb-5 shadow-sm"
                        style={{ transform: "translateZ(25px)" }}
                      >
                        {f.icon}
                      </div>

                      <h3
                        className="text-[18px] font-bold text-[var(--text)] mb-2.5 tracking-tight"
                        style={{ transform: "translateZ(20px)" }}
                      >
                        {f.title}
                      </h3>
                      <p
                        className="text-[14px] text-[var(--muted2)] leading-[1.75]"
                        style={{ transform: "translateZ(10px)" }}
                      >
                        {f.desc}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[var(--border2)]/30 flex items-center gap-1.5 text-xs text-[var(--steel)] font-medium">
                      <span>Explore protocol</span>
                      <span>&rarr;</span>
                    </div>
                  </div>
                </Tilt3DCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Protocol Architecture Stack (3D Exploded View) ─ */}
      <section id="protocol" className="relative z-10 py-32 px-6 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 50%, var(--app-grad-from) 0%, transparent 100%)",
          }}
        />
        <div className="max-w-[1240px] mx-auto relative">
          <Reveal>
            <div className="text-center mb-12">
              <span className="text-[12px] tracking-[5px] uppercase text-[var(--steel)] font-mono font-semibold">
                Architecture
              </span>
              <h2 className="mt-4 text-[clamp(1.9rem,3.8vw,3rem)] font-medium text-[var(--text)] tracking-tight">
                Protocol{" "}
                <span
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontStyle: "italic",
                    color: "#8a9cb8",
                  }}
                >
                  Layers
                </span>
              </h2>
              <p className="text-[16px] text-[var(--muted2)] max-w-xl mx-auto mt-4">
                Interact with the 3D exploded protocol stack below to inspect how voice
                signals flow into cognitive graphs and sandboxed tool executions.
              </p>
            </div>
          </Reveal>

          {/* Interactive 3D Exploded Stack Component */}
          <Protocol3DStack />
        </div>
      </section>

      {/* ── Agents Cohort ──────────────────────── */}
      <section id="agents" className="relative z-10 py-32 px-6">
        <div className="max-w-[1100px] mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <span className="text-[12px] tracking-[5px] uppercase text-[var(--steel)] font-mono font-semibold">
                Autonomous Agents
              </span>
              <h2 className="mt-4 text-[clamp(1.9rem,3.8vw,3rem)] font-medium text-[var(--text)] tracking-tight">
                Six minds,{" "}
                <span
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontStyle: "italic",
                    color: "#8a9cb8",
                  }}
                >
                  one unified voice
                </span>
              </h2>
              <p className="text-[16px] text-[var(--muted2)] max-w-lg mx-auto mt-4">
                Each agent has an explicit specialty, running in parallel loops with
                self-healing barriers.
              </p>
            </div>
          </Reveal>

          {/* Agent Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                name: "Planner",
                role: "Decomposes instructions into an executable DAG",
                color: "#2a4070",
                badge: "DAG Plan",
              },
              {
                name: "Coder",
                role: "Writes production TypeScript, CSS, and API schemas",
                color: "#5a7aa0",
                badge: "Synthesizer",
              },
              {
                name: "Executor",
                role: "Runs sandbox commands, manages packages and build tools",
                color: "#8a9cb8",
                badge: "Sandbox",
              },
              {
                name: "Tester",
                role: "Generates test suites and verifies runtime behavior",
                color: "#4ade80",
                badge: "QA / Lint",
              },
              {
                name: "Reviewer",
                role: "Audits for security bugs, memory leaks, and performance",
                color: "#f59e0b",
                badge: "Security Audit",
              },
              {
                name: "Documenter",
                role: "Generates clear READMEs, docs, and git commit messages",
                color: "#a78bfa",
                badge: "Docs Engine",
              },
            ].map((a, i) => (
              <Reveal key={a.name} delay={i * 50}>
                <div className="group flex items-center gap-4 p-4 rounded-xl border border-[var(--border2)]/40 bg-[var(--card)]/70 hover:border-[#5a7aa035] hover:bg-[var(--surface2)]/60 transition-all duration-300">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 transition-transform group-hover:scale-105"
                    style={{
                      background: `${a.color}20`,
                      color: a.color,
                      border: `1px solid ${a.color}40`,
                    }}
                  >
                    {a.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] font-bold text-[var(--text)] group-hover:text-[var(--steel)] transition-colors">
                        {a.name}
                      </span>
                      <span className="text-[10px] font-mono uppercase text-[var(--muted)]">
                        {a.badge}
                      </span>
                    </div>
                    <p className="text-[13px] text-[var(--muted2)] mt-0.5 leading-snug">
                      {a.role}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Interactive Agent Orchestration Simulator Terminal */}
          <section id="simulator" className="pt-16">
            <Reveal delay={200}>
              <div className="text-center mb-4">
                <span className="text-[11px] uppercase tracking-[3px] font-mono text-[var(--steel)]">
                  Interactive Lab
                </span>
                <h3 className="text-xl font-bold text-[var(--text)] mt-1">
                  Watch the multi-agent pipeline execute
                </h3>
              </div>
              <AgentMatrixSimulator />
            </Reveal>
          </section>
        </div>
      </section>

      {/* ── Final CTA Section ───────────────────── */}
      <section className="relative z-10 py-36 px-6">
        <Reveal>
          <div className="max-w-[620px] mx-auto text-center p-10 rounded-3xl border border-[#5a7aa030] bg-[var(--card)]/80 backdrop-blur-xl shadow-2xl">
            <p className="text-[12px] text-[var(--steel)] tracking-[4px] uppercase mb-4 font-mono font-semibold">
              Get Started
            </p>
            <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-medium text-[var(--text)] tracking-tight leading-tight">
              Say{" "}
              <span
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontStyle: "italic",
                  color: "#8a9cb8",
                }}
              >
                &ldquo;Hey Rex&rdquo;
              </span>
            </h2>
            <p className="text-[16px] text-[var(--muted2)] mt-4 leading-relaxed max-w-md mx-auto">
              No complex setup required. Initialize the workspace and start engineering
              with an autonomous voice AI.
            </p>

            <div className="mt-8 flex justify-center">
              <Link
                href="/auth"
                className="group inline-flex items-center gap-3 px-9 py-4 rounded-full border border-[#5a7aa040] hover:border-[var(--steel)] bg-[#3B599818] hover:bg-[#3B599830] text-[15px] text-[var(--text)] font-semibold tracking-[1px] transition-all duration-500 shadow-[0_0_50px_rgba(59,89,152,0.25)] hover:shadow-[0_0_70px_rgba(59,89,152,0.45)]"
              >
                <span className="w-[8px] h-[8px] rounded-full bg-[#5a7aa0] group-hover:scale-125 group-hover:shadow-[0_0_15px_#5a7aa0] transition-all duration-300" />
                <span>Initialize Workspace</span>
                <span className="transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ─────────────────────────────── */}
      <footer
        id="landing-footer"
        className="relative z-10 border-t border-[var(--border2)]/50 bg-[var(--surface)]/80 backdrop-blur-xl pt-16 pb-12 px-6 sm:px-10"
      >
        <div className="max-w-[1240px] mx-auto">
          {/* Top section: Brand & Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-[var(--border2)]/40">
            {/* Column 1: Brand Info */}
            <div className="lg:col-span-2 flex flex-col gap-4 pr-0 lg:pr-8">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg shadow-sm"
                  style={{ background: "linear-gradient(135deg, #3B5998, #7B93B0)" }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="8" height="8" rx="1.5" />
                    <rect x="13" y="3" width="8" height="8" rx="1.5" />
                    <rect x="3" y="13" width="8" height="8" rx="1.5" />
                    <rect x="13" y="13" width="8" height="8" rx="1.5" />
                  </svg>
                </span>
                <span
                  className="text-xl font-bold tracking-tight"
                  style={{
                    background: "linear-gradient(135deg, #3B5998, #7B93B0, #C0C8D4)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Vyrexo
                </span>
              </div>
              <p className="text-[14px] text-[var(--muted2)] leading-relaxed max-w-sm">
                Voice-first conversational AI coding workspace. Think out loud, dictate
                architecture, and watch autonomous multi-agent pipelines plan, code,
                review, and test in real time.
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs font-mono text-[var(--steel)] bg-[var(--surface2)] px-3 py-1.5 rounded-full border border-[var(--border2)] w-fit">
                <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
                <span>Neural Agent Engine · Online</span>
              </div>
            </div>

            {/* Column 2: System */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-[2px] text-[var(--text)]">
                System
              </h3>
              <ul className="flex flex-col gap-2 text-sm text-[var(--muted2)]">
                <li>
                  <a href="#system" className="hover:text-[var(--text)] transition-colors">
                    3D Neural Canvas
                  </a>
                </li>
                <li>
                  <a href="#protocol" className="hover:text-[var(--text)] transition-colors">
                    Voice Pipeline
                  </a>
                </li>
                <li>
                  <a href="#protocol" className="hover:text-[var(--text)] transition-colors">
                    Real-Time WebSocket
                  </a>
                </li>
                <li>
                  <a href="#system" className="hover:text-[var(--text)] transition-colors">
                    Context Engine & RAG
                  </a>
                </li>
                <li>
                  <Link href="/app" className="hover:text-[var(--text)] transition-colors">
                    Live Preview Engine
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Autonomous Agents */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-[2px] text-[var(--text)]">
                Agents
              </h3>
              <ul className="flex flex-col gap-2 text-sm text-[var(--muted2)]">
                <li>
                  <a href="#agents" className="hover:text-[var(--text)] transition-colors">
                    Planner Agent
                  </a>
                </li>
                <li>
                  <a href="#agents" className="hover:text-[var(--text)] transition-colors">
                    Coder Agent
                  </a>
                </li>
                <li>
                  <a href="#agents" className="hover:text-[var(--text)] transition-colors">
                    Executor Agent
                  </a>
                </li>
                <li>
                  <a href="#agents" className="hover:text-[var(--text)] transition-colors">
                    Reviewer Agent
                  </a>
                </li>
                <li>
                  <a href="#agents" className="hover:text-[var(--text)] transition-colors">
                    Tester & QA Agent
                  </a>
                </li>
                <li>
                  <a href="#agents" className="hover:text-[var(--text)] transition-colors">
                    Documenter Agent
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4: Quick Navigation & Settings */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-[2px] text-[var(--text)]">
                Workspace
              </h3>
              <ul className="flex flex-col gap-2 text-sm text-[var(--muted2)]">
                <li>
                  <Link
                    href="/app"
                    className="text-[var(--steel)] font-medium hover:text-[var(--text)] transition-colors"
                  >
                    Open Workspace
                  </Link>
                </li>
                <li>
                  <Link
                    href="/settings"
                    className="hover:text-[var(--text)] transition-colors"
                  >
                    Voice Settings
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth"
                    className="hover:text-[var(--text)] transition-colors"
                  >
                    Account & Access
                  </Link>
                </li>
                <li>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[var(--text)] transition-colors"
                  >
                    GitHub Sync
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar: Copyright & Details */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--muted2)]">
            <div className="flex items-center gap-2">
              <span>&copy; {new Date().getFullYear()} Vyrexo. Autonomous AI Engineering.</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="font-mono text-[11px] text-[var(--muted)]">
                Wake cue: &ldquo;Hey Rex&rdquo;
              </span>
              <a href="#system" className="hover:text-[var(--text)] transition-colors">
                Back to top &uarr;
              </a>
            </div>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
}
