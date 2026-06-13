"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

// ── Typewriter Effect ──────────────────────────────────────────
function Typewriter({ text, speed = 40, delay = 0, className = "" }: { text: string; speed?: number; delay?: number; className?: string }) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    if (displayed.length < text.length) {
      const t = setTimeout(() => setDisplayed(text.slice(0, displayed.length + 1)), speed);
      return () => clearTimeout(t);
    }
  }, [displayed, text, speed, started]);

  return (
    <span className={className}>
      {displayed}
      {displayed.length < text.length && started && <span className="inline-block w-[2px] h-[1em] bg-[#5a7aa0] ml-[2px] animate-pulse" />}
    </span>
  );
}

// ── Scroll Reveal ──────────────────────────────────────────────
function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold });
    if (ref.current) o.observe(ref.current);
    return () => o.disconnect();
  }, [threshold]);
  return { ref, v };
}

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, v } = useReveal();
  return (
    <div ref={ref} className={`transition-all duration-[1.6s] ease-[cubic-bezier(0.16,1,0.3,1)] ${v ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-16 blur-[2px]"} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// ── Neural Network Canvas (JARVIS-style) ───────────────────────
function NeuralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const handleResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    };
    window.addEventListener("resize", handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX / w, y: e.clientY / h };
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Nodes
    const nodeCount = 120;
    const nodes: Array<{ x: number; y: number; vx: number; vy: number; r: number; pulse: number; speed: number }> = [];
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 0.5,
        pulse: Math.random() * Math.PI * 2,
        speed: 0.01 + Math.random() * 0.02,
      });
    }

    let animId: number;
    const connectionDist = 180;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      const mx = mouse.current.x * w;
      const my = mouse.current.y * h;

      // Update nodes
      nodes.forEach((n) => {
        // Drift
        n.x += n.vx;
        n.y += n.vy;
        n.pulse += n.speed;

        // Mouse attraction (subtle)
        const dx = mx - n.x;
        const dy = my - n.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 300) {
          const force = (300 - dist) / 300 * 0.015;
          n.vx += dx * force * 0.01;
          n.vy += dy * force * 0.01;
        }

        // Damping
        n.vx *= 0.998;
        n.vy *= 0.998;

        // Boundaries (wrap)
        if (n.x < -20) n.x = w + 20;
        if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20;
        if (n.y > h + 20) n.y = -20;
      });

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < connectionDist) {
            const alpha = (1 - dist / connectionDist) * 0.15;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(90, 122, 160, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      nodes.forEach((n) => {
        const pulseSize = 1 + Math.sin(n.pulse) * 0.4;
        const distToMouse = Math.sqrt((mx - n.x) ** 2 + (my - n.y) ** 2);
        const glow = distToMouse < 200 ? (200 - distToMouse) / 200 : 0;

        // Glow
        if (glow > 0.1) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r * 6 * glow, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(90, 122, 160, ${glow * 0.1})`;
          ctx.fill();
        }

        // Node
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * pulseSize, 0, Math.PI * 2);
        const brightness = 120 + glow * 135;
        ctx.fillStyle = `rgba(${brightness}, ${brightness + 20}, ${brightness + 50}, ${0.4 + glow * 0.6})`;
        ctx.fill();
      });

      // Central glow (where the orb would be)
      const coreGrd = ctx.createRadialGradient(w / 2, h * 0.48, 0, w / 2, h * 0.48, 250);
      coreGrd.addColorStop(0, "rgba(42, 64, 112, 0.08)");
      coreGrd.addColorStop(0.5, "rgba(30, 50, 90, 0.03)");
      coreGrd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = coreGrd;
      ctx.fillRect(0, 0, w, h);

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-0" />;
}

// ── Circular Progress Ring ─────────────────────────────────────
function Ring({ progress, size = 80, label, value }: { progress: number; size?: number; label: string; value: string }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - progress * circ;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(90,122,160,0.08)" strokeWidth="2" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(90,122,160,0.5)" strokeWidth="2" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-[2s] ease-out" />
      </svg>
      <div className="text-center -mt-[calc(50%+10px)] mb-4">
        <div className="text-[22px] font-semibold text-[#a0b0c8]">{value}</div>
      </div>
      <div className="text-[11px] text-[#6a6a80] uppercase tracking-[2px] font-medium">{label}</div>
    </div>
  );
}

// ── Main Landing Page ──────────────────────────────────────────
export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    setHeroVisible(true);
    const h = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--app-grad-to)] text-[var(--text2)] overflow-x-hidden relative">
      {/* Neural network background */}
      <NeuralCanvas />

      {/* ── Navbar ──────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${scrollY > 80 ? "bg-[var(--app-grad-to)]/60 backdrop-blur-2xl border-b border-[#ffffff05]" : ""}`}>
        <div className="max-w-[1200px] mx-auto px-8 py-5 flex items-center justify-between">
          <Link href="/" className="text-[15px] font-semibold tracking-[3px] uppercase" style={{ background: "linear-gradient(90deg, #5a7aa0, #8a9cb8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Vyrexo
          </Link>
          <div className="hidden md:flex items-center gap-10 text-[11px] tracking-[2px] uppercase text-[#6a6a80] font-semibold">
            <a href="#system" className="hover:text-[#8a9cb8] transition-colors duration-500">System</a>
            <a href="#protocol" className="hover:text-[#8a9cb8] transition-colors duration-500">Protocol</a>
            <a href="#agents" className="hover:text-[#8a9cb8] transition-colors duration-500">Agents</a>
          </div>
          <Link href="/auth" className="text-[11px] tracking-[2px] uppercase text-[#8a9cb8] hover:text-[var(--text2)] font-bold border border-[#5a7aa030] hover:border-[#5a7aa060] px-5 py-2 rounded-full transition-all duration-500">
            Initialize
          </Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 z-10">
        {/* Status line */}
        <div className={`transition-all duration-[2s] delay-300 ${heroVisible ? "opacity-100" : "opacity-0"}`}>
          <div className="flex items-center gap-3 mb-10">
            <div className="w-[7px] h-[7px] rounded-full bg-[#5a7aa0] animate-pulse shadow-[0_0_12px_#5a7aa066]" />
            <span className="text-[12px] tracking-[4px] uppercase text-[#6a6a80] font-medium">System Online</span>
          </div>
        </div>

        {/* Main headline — typewriter */}
        <div className={`transition-all duration-[2s] delay-500 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <h1 className="text-center leading-[1.1] max-w-[1000px]">
            <span className="block text-[clamp(2.2rem,5.5vw,4.2rem)] font-light italic text-[#b5b5c8] tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              <Typewriter text="Good evening, Developer." speed={50} delay={800} />
            </span>
            <span className="block text-[clamp(2.2rem,5vw,3.8rem)] tracking-tight mt-4 font-extrabold" style={{ fontFamily: "'Outfit', sans-serif", background: "linear-gradient(135deg, #4A72B2, #8CA2C5, #D2DBE8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              <Typewriter text="I am Rex" speed={60} delay={2500} />
            </span>
          </h1>
        </div>

        {/* Subtitle */}
        <div className={`transition-all duration-[2s] delay-[3.5s] ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p className="text-[19px] text-[#8e8eab] text-center max-w-[640px] mt-10 leading-[1.8] font-normal">
            Your voice-first AI coding agent. I plan, code, test, review, and document. All through natural conversation.
          </p>
        </div>

        {/* CTA */}
        <div className={`transition-all duration-[2s] delay-[4.5s] ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <Link href="/auth" className="group mt-12 inline-flex items-center gap-3 px-8 py-3.5 rounded-full border border-[#5a7aa030] hover:border-[#5a7aa060] text-[14px] text-[#8a9cb8] font-medium tracking-[1px] transition-all duration-700 hover:shadow-[0_0_60px_#1a2a5020] hover:bg-[#5a7aa010]">
            <span className="w-[8px] h-[8px] rounded-full bg-[#5a7aa0] group-hover:shadow-[0_0_15px_#5a7aa088] transition-all duration-700" />
            Initialize Rex
          </Link>
        </div>

        {/* Scroll indicator */}
        <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 transition-all duration-[2s] delay-[5.5s] ${heroVisible ? "opacity-100" : "opacity-0"}`}>
          <div className="flex flex-col items-center gap-2">
            <span className="text-[9px] tracking-[3px] uppercase text-[#1a1a2a]">Scroll</span>
            <div className="w-[1px] h-8 bg-gradient-to-b from-[#5a7aa030] to-transparent" />
          </div>
        </div>
      </section>

      {/* ── System Stats ───────────────────────── */}
      <section className="relative z-10 py-32 px-6">
        <div className="max-w-[900px] mx-auto">
          <Reveal>
            <div className="flex justify-center gap-16 md:gap-24">
              <Ring progress={1.0} label="Agents" value="6" />
              <Ring progress={0.87} label="Tools" value="13" />
              <Ring progress={0.75} label="Accents" value="8+" />
              <Ring progress={0.95} label="Uptime" value="99%" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── System Overview ────────────────────── */}
      <section id="system" className="relative z-10 py-32 px-6">
        <div className="max-w-[1100px] mx-auto">
          <Reveal>
            <div className="text-center mb-24">
              <span className="text-[11px] tracking-[5px] uppercase text-[#6a6a80] font-medium">System Overview</span>
              <h2 className="mt-6 text-[clamp(1.8rem,3.5vw,2.8rem)] font-medium text-[var(--text2)] tracking-tight">
                What can{" "}
                <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "#8a9cb8" }}>
                  Rex
                </span>{" "}
                do?
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { title: "Voice Command", desc: "Say 'Hey Rex, create an API' — Rex understands, plans, and executes while narrating every step.", tag: "INPUT", icon: (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
              )},
              { title: "Multi-Agent Pipeline", desc: "Six agents coordinate — Planner breaks tasks, Coder writes, Tester validates, Reviewer audits.", tag: "CORE", icon: (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>
              )},
              { title: "Interrupt & Redirect", desc: "Say 'Wait, use OAuth instead.' Rex pauses, re-plans, and adjusts in real-time.", tag: "CONTROL", icon: (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M10 9l-6 6m0-6l6 6"/><path d="M20 4v7a4 4 0 0 1-4 4H5"/></svg>
              )},
              { title: "Codebase Intelligence", desc: "Ask 'Where is the auth logic?' — Rex indexes your project with ChromaDB and gives precise answers.", tag: "CONTEXT", icon: (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6m-3-3h6"/></svg>
              )},
              { title: "Emotion Awareness", desc: "Frustrated? Clearer explanations. In flow? Terse, fast responses. Rex adapts to your state.", tag: "ADAPT", icon: (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>
              )},
              { title: "Full Dev Lifecycle", desc: "Plan, Code, Test, Review, Document, Git — complete lifecycle through voice conversation.", tag: "OUTPUT", icon: (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              )},
            ].map((f, i) => (
              <Reveal key={f.title} delay={i * 80}>
                <div className="group relative p-7 rounded-2xl border border-[#ffffff06] bg-[var(--card)] hover:border-[#5a7aa025] transition-all duration-700 h-full overflow-hidden cursor-default" style={{ transformStyle: "preserve-3d", perspective: "800px" }}>
                  {/* 3D tilt on hover via CSS */}
                  <div className="transition-transform duration-500 group-hover:translate-y-[-2px]">
                    {/* Tag */}
                    <div className="text-[9px] tracking-[3px] text-[#5a7aa060] uppercase font-semibold mb-5">{f.tag}</div>

                    {/* Icon */}
                    <div className="w-14 h-14 rounded-xl bg-[#5a7aa008] border border-[#5a7aa015] flex items-center justify-center text-[#5a7aa0] mb-5 group-hover:bg-[#5a7aa012] group-hover:border-[#5a7aa030] group-hover:shadow-[0_0_30px_#5a7aa010] transition-all duration-700">
                      {f.icon}
                    </div>

                    {/* Content */}
                    <h3 className="text-[16px] font-semibold text-[var(--text2)] mb-2">{f.title}</h3>
                    <p className="text-[13px] text-[#6a6a80] leading-[1.8]">{f.desc}</p>
                  </div>

                  {/* Corner glow on hover */}
                  <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-[#5a7aa0] opacity-0 group-hover:opacity-[0.03] blur-3xl transition-opacity duration-700" />
                  {/* Bottom line */}
                  <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-[#5a7aa025] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Protocol Layer (3D exploded stack) ──── */}
      <section id="protocol" className="relative z-10 py-36 px-6 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 50% 40% at 40% 50%, var(--app-grad-from) 0%, transparent 100%)" }} />
        <div className="max-w-[1200px] mx-auto relative">
          <Reveal>
            <div className="text-center mb-24">
              <span className="text-[11px] tracking-[5px] uppercase text-[#6a6a80] font-medium">Architecture</span>
              <h2 className="mt-6 text-[clamp(1.8rem,3.5vw,2.8rem)] font-medium text-[var(--text2)] tracking-tight">
                Protocol{" "}
                <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "#8a9cb8" }}>
                  Layers
                </span>
              </h2>
            </div>
          </Reveal>

          <div className="flex flex-col md:flex-row items-center gap-16">
            {/* Left — 3D exploded layer view */}
            <div className="flex-1 flex justify-center" style={{ perspective: "1200px" }}>
              <div className="relative" style={{ transform: "rotateX(45deg) rotateZ(-30deg) rotateY(5deg)", transformStyle: "preserve-3d" }}>
                {[
                  { label: "Voice Interface", icon: "🎙️", color: "#8a9cb8", z: 220 },
                  { label: "Conversation Engine", icon: "💬", color: "#7a8cb0", z: 170 },
                  { label: "Agent Orchestrator", icon: "🧠", color: "#5a7aa0", z: 120 },
                  { label: "6 AI Agents", icon: "⚡", color: "#4a6a90", z: 70 },
                  { label: "Tool Interface", icon: "🔧", color: "#3a5a80", z: 20 },
                  { label: "Knowledge Base", icon: "📚", color: "#2a4a70", z: -30 },
                ].map((layer, i) => (
                  <Reveal key={layer.label} delay={200 + i * 120}>
                    <div
                      className="group relative w-[360px] h-[65px] rounded-xl border flex items-center gap-4 px-5 cursor-default hover:scale-[1.04] transition-all duration-500"
                      style={{
                        transform: `translateZ(${layer.z}px) translateX(${i * 4}px)`,
                        background: `linear-gradient(135deg, ${layer.color}18, ${layer.color}08)`,
                        borderColor: `${layer.color}20`,
                        boxShadow: `0 10px 40px ${layer.color}0a, inset 0 1px 0 ${layer.color}15`,
                      }}
                    >
                      <span className="text-xl">{layer.icon}</span>
                      <span className="text-[14px] font-semibold" style={{ color: layer.color }}>{layer.label}</span>
                      {/* Glow dot */}
                      <div className="ml-auto w-2 h-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: layer.color, boxShadow: `0 0 12px ${layer.color}88` }} />
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>

            {/* Right — layer description */}
            <Reveal delay={400} className="flex-1 max-w-[420px]">
              <div className="p-8 rounded-2xl border border-[#ffffff06] bg-[var(--card)]">
                <h3 className="text-[24px] font-semibold text-[var(--text2)] tracking-tight mb-5" style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}>
                  Protocol Stack
                </h3>
                <p className="text-[14px] text-[#7a7a90] leading-[1.9] mb-8">
                  Six interconnected layers power every interaction — from your voice command to the final git commit. Each layer communicates through an event-driven backbone.
                </p>
                <div className="flex flex-col gap-4">
                  {[
                    { label: "Voice Input", desc: "Whisper STT + Edge-TTS + Wake Word 'Rex'", color: "#8a9cb8" },
                    { label: "AI Reasoning", desc: "Gemini 2.5 Pro/Flash via LangGraph", color: "#5a7aa0" },
                    { label: "Code Execution", desc: "13 tools — files, terminal, git operations", color: "#4a6a90" },
                    { label: "Context Engine", desc: "ChromaDB RAG + live file watching", color: "#3a5a80" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: item.color, boxShadow: `0 0 8px ${item.color}44` }} />
                      <div>
                        <span className="text-[13px] text-[#b0b8c8] font-semibold">{item.label}</span>
                        <span className="text-[12px] text-[#5a5a70] ml-2">{item.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Agents ─────────────────────────────── */}
      <section id="agents" className="relative z-10 py-32 px-6">
        <div className="max-w-[700px] mx-auto">
          <Reveal>
            <div className="text-center mb-20">
              <span className="text-[11px] tracking-[5px] uppercase text-[#6a6a80] font-medium">Agents</span>
              <h2 className="mt-6 text-[clamp(1.8rem,3.5vw,2.8rem)] font-medium text-[var(--text2)] tracking-tight">
                Six minds,{" "}
                <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "#8a9cb8" }}>
                  one voice
                </span>
              </h2>
            </div>
          </Reveal>

          {[
            { name: "Planner", role: "Decomposes instructions into executable steps", color: "#2a4070" },
            { name: "Coder", role: "Writes production-ready code with 13 tools", color: "#5a7aa0" },
            { name: "Executor", role: "Runs commands, installs packages, manages infra", color: "#8a9cb8" },
            { name: "Tester", role: "Generates and executes comprehensive tests", color: "#4ade80" },
            { name: "Reviewer", role: "Audits for security, bugs, and quality", color: "#f59e0b" },
            { name: "Documenter", role: "Generates README, API docs, architecture notes", color: "#a78bfa" },
          ].map((a, i) => (
            <Reveal key={a.name} delay={i * 60}>
              <div className="group flex items-center gap-5 py-4 px-5 rounded-lg border border-transparent hover:border-[#ffffff05] hover:bg-[#ffffff02] transition-all duration-700 mb-1">
                <div className="w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all duration-500 group-hover:shadow-[0_0_20px_var(--glow)]" style={{ background: `${a.color}0a`, color: a.color, "--glow": `${a.color}22` } as any}>
                  {a.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold text-[#a0a0b8] group-hover:text-[var(--text2)] transition-colors duration-500">{a.name}</div>
                  <div className="text-[12px] text-[#5a5a70] group-hover:text-[#7a7a90] transition-colors duration-500">{a.role}</div>
                </div>
                <div className="w-[5px] h-[5px] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700" style={{ background: a.color, boxShadow: `0 0 10px ${a.color}66` }} />
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────── */}
      <section className="relative z-10 py-40 px-6">
        <Reveal>
          <div className="max-w-[500px] mx-auto text-center">
            <p className="text-[13px] text-[#6a6a80] tracking-[3px] uppercase mb-6 font-medium">Ready?</p>
            <h2 className="text-[clamp(1.8rem,4vw,3rem)] font-medium text-[var(--text2)] tracking-tight leading-tight">
              Say{" "}
              <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "#8a9cb8" }}>
                &ldquo;Hey Rex&rdquo;
              </span>
            </h2>
            <p className="text-[14px] text-[#7a7a90] mt-4">and start building.</p>
            <Link href="/auth" className="group mt-12 inline-flex items-center gap-3 px-10 py-4 rounded-full border border-[#5a7aa025] hover:border-[#5a7aa050] text-[14px] text-[#8a9cb8] font-medium tracking-[1px] transition-all duration-700 hover:shadow-[0_0_80px_#1a2a5020]">
              <span className="w-[8px] h-[8px] rounded-full bg-[#5a7aa0] group-hover:shadow-[0_0_15px_#5a7aa088] transition-all duration-700" />
              Initialize
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ─────────────────────────────── */}
      <footer className="relative z-10 border-t border-[#ffffff03] py-10 px-6">
        <div className="max-w-[1000px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <span className="text-[11px] tracking-[3px] uppercase" style={{ background: "linear-gradient(90deg, #5a7aa0, #8a9cb8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Vyrexo
          </span>
          <div className="flex gap-8 text-[11px] tracking-[2px] uppercase text-[#6a6a80]">
            <a href="#system" className="hover:text-[#8a9cb8] transition-colors duration-500">System</a>
            <a href="#protocol" className="hover:text-[#8a9cb8] transition-colors duration-500">Protocol</a>
            <a href="#agents" className="hover:text-[#8a9cb8] transition-colors duration-500">Agents</a>
            <Link href="/auth" className="hover:text-[#8a9cb8] transition-colors duration-500">Login</Link>
          </div>
          <div className="text-[12px] text-[#6a6a80] tracking-[1px]">Built for developers who&apos;d rather talk than type.</div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes floatLabel { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
}
