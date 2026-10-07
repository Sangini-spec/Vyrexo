"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Sidebar, type Session } from "@/components/shared/Sidebar";
import { Orb, type OrbState } from "@/components/voice/Orb";
import { type AgentStep } from "@/components/agents/AgentTimeline";
import { ModeIndicator } from "@/components/shared/ModeIndicator";
import { RightPanel, type RightTab, type CodeEvent } from "@/components/shared/RightPanel";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { ConnectProjectModal } from "@/components/shared/ConnectProjectModal";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useVoice } from "@/hooks/useVoice";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useAuth } from "@/lib/auth-context";
import type { ServerMessage } from "@/lib/ws-protocol";
import { primeSpeechSynthesis, speakHumanizedText } from "@/lib/voice-synthesizer";

// A persisted, renamable chat session. Stored in localStorage so they survive
// reloads; grouped/labelled for the Sidebar at render time.
interface StoredSession {
  id: string;
  name: string;
  icon: string;
  createdAt: number;
}

const SESSION_ICONS = ["\u{1F680}", "\u{1F6E0}", "\u{1F4A1}", "\u{26A1}", "\u{1F9E9}", "\u{1F4E6}", "\u{1F52D}", "\u{1F3AF}"];

function getSessionTimestamp(s: { id?: string; createdAt?: number }): number {
  const idMatch = s.id?.match(/^session-(\d{10,14})$/);
  const idTs = idMatch ? parseInt(idMatch[1], 10) : null;

  if (s.createdAt && typeof s.createdAt === "number" && s.createdAt > 1000000000000) {
    // If the ID timestamp is older by > 1 hour, use the true original ID timestamp
    if (idTs && idTs < s.createdAt - 3600000) {
      return idTs;
    }
    return s.createdAt;
  }
  if (idTs && idTs > 1000000000000) return idTs;
  return s.createdAt || Date.now();
}

function relTime(ts: number): string {
  if (!ts) return "";
  const diffMs = Math.max(0, Date.now() - ts);
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(diffMs / 86400000);
  if (d <= 1) return "1d ago";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

function dayGroup(ts: number): string {
  if (!ts) return "Today";
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOfThisWeek = startOfToday - (now.getDay() || 7) * 86400000;

  if (ts >= startOfToday) return "Today";
  if (ts >= startOfYesterday) return "Yesterday";
  if (ts >= startOfThisWeek) return "This Week";
  return "Earlier";
}

// A spoken barge-in that means "stop now" (hard interrupt), vs just talking over Rex.
// Single stop words count as a hard stop when they appear ANYWHERE in a short
// utterance — so "stop", "rex stop", "rex can you stop", "ok stop please" all
// halt Rex, not just phrases that literally start with "stop".
const STOP_SINGLE = ["stop", "wait", "cancel", "pause", "quiet", "enough", "shush", "hush", "silence"];
const STOP_PHRASES = ["stop it", "hold on", "shut up", "be quiet", "never mind", "nevermind", "knock it off", "that's enough", "thats enough", "stop talking", "stop listening"];
function isStopPhrase(lower: string): boolean {
  const words = lower.split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  // A short command (≤ 6 words) containing a stop word as a whole word.
  if (words.length <= 6 && words.some((w) => STOP_SINGLE.includes(w))) return true;
  // Multi-word stop phrases appearing anywhere.
  return STOP_PHRASES.some((p) => lower.includes(p));
}

interface FastPathResponse {
  reply: string;
  spoken: string;
  action?: "preview" | "code" | "chat" | "clear" | "stop";
  emotion?: "warm" | "upbeat" | "calm" | "empathetic";
}

function checkClientFastPath(rawText: string): FastPathResponse | null {
  const t = rawText.trim().toLowerCase().replace(/[,!?;:]/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return null;

  // Simple greetings & pleasantries
  if (
    /^(he|hey|hi|hello|yo|sup|wassup|whats up|what s up|good morning|good afternoon|good evening)$/i.test(t) ||
    /^(he|hey|hi|hello)\s+(rex|there|team|friend|mate)$/i.test(t) ||
    /^(what('s|s)?\s*up|sup|wassup|whats\s+good|how('s|s)\s+it\s+going)$/i.test(t)
  ) {
    return {
      reply: "Hey! Good to see you. I'm right here with you and ready to build. What are we working on today?",
      spoken: "Hey, ... Good to see you! I'm right here with you and ready to build. What are we working on today?",
      emotion: "warm",
    };
  }

  // How are you / state check
  if (/^how\s*(are\s*you|are\s*things|is\s*your\s*day|are\s*you\s*doing)$/i.test(t)) {
    return {
      reply: "I'm doing great and fully operational! Ready to design architectures, write code, or iterate on workspaces with you. How about you?",
      spoken: "I'm doing great! Feeling energized and fully focused. Ready to dive into code and iterate with you. How about you?",
      emotion: "upbeat",
    };
  }

  // Status / Health check
  if (/^(status|system status|health|are you ready|ping)$/i.test(t)) {
    return {
      reply: "All systems 100% active. Neural voice pipeline, real-time code compiler, and sandbox preview are ready.",
      spoken: "All systems active. Voice pipeline, code compiler, and preview sandboxes are ready.",
      emotion: "calm",
    };
  }

  // Help / Capabilities / Identity
  if (/^(help|what can you do|who are you)$/i.test(t)) {
    return {
      reply: "I'm Rex, your autonomous software engineering teammate. I design architectures, author full-stack React applications, execute automated test suites, and launch live previews.",
      spoken: "I'm Rex, your software teammate. I can design architectures, write full-stack code, run tests, and launch live previews.",
      emotion: "warm",
    };
  }

  // Tab & UI navigation commands
  if (/^(show preview|open preview|view preview|preview tab|switch to preview|preview)$/i.test(t)) {
    return {
      reply: "Switched to the Preview tab.",
      spoken: "Switched to Preview.",
      action: "preview",
      emotion: "calm",
    };
  }

  if (/^(show code|open code|view code|code tab|switch to code|code|files|show files)$/i.test(t)) {
    return {
      reply: "Switched to the Code tab.",
      spoken: "Switched to Code.",
      action: "code",
      emotion: "calm",
    };
  }

  if (/^(show chat|open chat|view chat|chat tab|switch to chat|chat)$/i.test(t)) {
    return {
      reply: "Switched to the Chat tab.",
      spoken: "Switched to Chat.",
      action: "chat",
      emotion: "calm",
    };
  }

  if (/^(clear chat|clear|reset chat|wipe chat)$/i.test(t)) {
    return {
      reply: "Cleared chat history.",
      spoken: "Chat cleared. What would you like to build?",
      action: "clear",
      emotion: "calm",
    };
  }

  if (/^(stop|pause|wait|be quiet|shut up|hush)$/i.test(t)) {
    return {
      reply: "Stopped active execution.",
      spoken: "Stopped. What would you like to do instead?",
      action: "stop",
      emotion: "calm",
    };
  }

  return null;
}

/**
 * Detects if a captured microphone transcript is an acoustic echo of Rex's
 * own voice output that was picked up by the user's microphone.
 */
function checkIsSelfEcho(
  userText: string,
  recentAiUtterances: Array<{ text: string; time: number }>
): boolean {
  if (!userText.trim()) return false;
  const cleanInput = userText.toLowerCase().replace(/[^\w\s]/g, " ").trim();
  const inputWords = cleanInput.split(/\s+/).filter((w) => w.length > 1);
  if (inputWords.length === 0) return false;

  const now = Date.now();

  for (const { text: aiText, time } of recentAiUtterances) {
    // Only check speech outputted within the last 25 seconds
    if (now - time > 25000) continue;
    const cleanAi = aiText.toLowerCase().replace(/[^\w\s]/g, " ").trim();
    if (!cleanAi) continue;

    // Direct substring check
    if (cleanAi.includes(cleanInput)) {
      return true;
    }

    // Tokenized word-overlap check
    const aiWords = new Set(cleanAi.split(/\s+/).filter((w) => w.length > 1));
    let matchingWordCount = 0;
    for (const w of inputWords) {
      if (aiWords.has(w)) {
        matchingWordCount++;
      }
    }

    const overlapRatio = matchingWordCount / inputWords.length;
    // If >= 60% of words in the transcript appear in Rex's recent speech, it is an echo
    if (inputWords.length >= 2 && overlapRatio >= 0.6) {
      return true;
    }
  }

  return false;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// Read an image File into a data URL, downscaled so big photos don't bloat the
// WebSocket payload / model request.
function downscaleImage(file: File, maxDim = 1280): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(src);
        ctx.drawImage(img, 0, 0, w, h);
        try {
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        } catch {
          resolve(src);
        }
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

// Draggable divider for resizing a panel. onDelta gets the horizontal mouse
// movement since the last event; the parent applies it to the right width.
function ResizeHandle({ onDelta }: { onDelta: (dx: number) => void }) {
  const dragging = useRef(false);
  const lastX = useRef(0);
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragging.current) return;
      onDelta(e.clientX - lastX.current);
      lastX.current = e.clientX;
    };
    const up = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [onDelta]);
  return (
    <div
      onMouseDown={(e) => {
        dragging.current = true;
        lastX.current = e.clientX;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      }}
      title="Drag to resize"
      className="w-[5px] flex-shrink-0 cursor-col-resize bg-[var(--border)] hover:bg-[var(--steel)] active:bg-[var(--steel)] transition-colors relative z-20"
    />
  );
}

// Home-screen quick actions. Each carries a concrete prompt (not just its
// label) so clicking it kicks off real agent work. All operate inside a
// project folder, so the work is scoped (and "create" tasks don't dump files
// into the server's own directory).
interface QuickAction {
  title: string;
  desc: string;
  prompt: string;
  connectHint: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    title: "Create a REST API",
    desc: "FastAPI with auth and database",
    prompt:
      "Build a working REST API using FastAPI in this project. Actually create and write the real files — project structure, JWT-based authentication, a couple of example CRUD endpoints with request/response models, and a database layer — and install the dependencies. Implement it fully, don't just describe it, then run a quick check that it imports.",
    connectHint: "First, pick the folder you want me to build the API in.",
  },
  {
    title: "Build a React app",
    desc: "Next.js with components",
    prompt:
      "Build a working starter web app using Next.js and React in this project. Actually create and write the real files — a clean project structure, a sample home page, and a few reusable components — and install the dependencies. Implement it fully, don't just describe it.",
    connectHint: "First, pick the folder you want me to build the app in.",
  },
  {
    title: "Debug my project",
    desc: "Find and fix issues",
    prompt:
      "Go through this project, find the bugs and issues, and actually fix them by editing the real files. Implement the fixes (don't just list them), then run the tests to verify, and tell me what you changed.",
    connectHint: "First, connect the project you want me to debug.",
  },
  {
    title: "Review my code",
    desc: "Security and quality check",
    prompt:
      "Review the code in this project for security vulnerabilities, bugs, and quality problems. Summarize the issues you find with suggested fixes.",
    connectHint: "First, connect the project you want me to review.",
  },
];

export default function App() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  // Resizable panel widths (drag the divider). Persisted across reloads.
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [rightPanelWidth, setRightPanelWidth] = useState(420);
  useEffect(() => {
    try {
      const s = localStorage.getItem("vyrexo_sidebar_w");
      const r = localStorage.getItem("vyrexo_rightpanel_w");
      if (s) setSidebarWidth(clamp(parseInt(s), 180, 520));
      if (r) setRightPanelWidth(clamp(parseInt(r), 280, 760));
    } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem("vyrexo_sidebar_w", String(sidebarWidth)); } catch {} }, [sidebarWidth]);
  useEffect(() => { try { localStorage.setItem("vyrexo_rightpanel_w", String(rightPanelWidth)); } catch {} }, [rightPanelWidth]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const activeSessionRef = useRef<string | null>(activeSession);
  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [transcript, setTranscript] = useState("");
  const [mode, setMode] = useState("normal");
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [narration, setNarration] = useState("Say 'Rex' to start, or click the orb");
  const [textInput, setTextInput] = useState("");
  const [chatLog, setChatLog] = useState<Array<{ role: string; text: string; images?: string[]; docs?: string[] }>>([]);
  const chatLogRef = useRef(chatLog);
  useEffect(() => {
    chatLogRef.current = chatLog;
  }, [chatLog]);
  // Attachments for the next message.
  const [attachedImages, setAttachedImages] = useState<string[]>([]); // data URLs
  const [attachedDocs, setAttachedDocs] = useState<{ name: string; dataurl: string }[]>([]);
  const [attachedVideo, setAttachedVideo] = useState<{ name: string; videoId: string } | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [connectProjectModalOpen, setConnectProjectModalOpen] = useState(false);
  const [vsCodeModalOpen, setVsCodeModalOpen] = useState(false);
  const [vsCodeDetails, setVsCodeDetails] = useState<{
    targetPath?: string;
    vscodeUri?: string;
    cursorUri?: string;
    windsurfUri?: string;
    copied?: boolean;
  }>({});
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  // ── Sessions (persisted + renamable) ────────────────────────
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);

  // Load the sidebar list from the DB (scoped to the logged-in user) so it
  // survives restarts and follows the account across browsers. Any sessions that
  // only exist in this browser's localStorage are migrated into the DB so they
  // aren't lost. Falls back to localStorage if the DB/backend is unavailable.
  useEffect(() => {
    if (!user?.id || sessionsLoaded) return;
    let cancelled = false;
    const readLocal = (): StoredSession[] => {
      try {
        const raw = localStorage.getItem("vyrexo_sessions");
        const p = raw ? JSON.parse(raw) : null;
        return Array.isArray(p) ? p : [];
      } catch { return []; }
    };
    (async () => {
      const local = readLocal().map((s) => ({
        ...s,
        createdAt: getSessionTimestamp(s),
      }));
      let dbList: StoredSession[] | null = null;
      try {
        const r = await fetch(`/api/sessions?user_id=${encodeURIComponent(user.id)}`);
        const d = await r.json();
        if (d?.ok && Array.isArray(d.sessions)) {
          dbList = d.sessions.map((s: { id: string; name?: string; icon?: string; createdAt?: number }) => ({
            id: s.id,
            name: s.name || "New Session",
            icon: s.icon || SESSION_ICONS[0],
            createdAt: getSessionTimestamp(s),
          }));
        }
      } catch { /* DB down — fall back below */ }
      if (cancelled) return;

      if (dbList === null) {
        // No DB — keep working off localStorage (or a fresh session).
        const now = Date.now();
        setSessions(local.length ? local : [{ id: `session-${now}`, name: "New Session", icon: SESSION_ICONS[0], createdAt: now }]);
        setSessionsLoaded(true);
        return;
      }

      // Migrate any localStorage-only sessions into the DB.
      const dbIds = new Set(dbList.map((s) => s.id));
      const toMigrate = local.filter((s) => s?.id && !dbIds.has(s.id));
      for (const s of toMigrate) {
        try {
          await fetch("/api/sessions", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: s.id, user_id: user.id, name: s.name, icon: s.icon, createdAt: s.createdAt }),
          });
        } catch {}
      }
      let merged = [...toMigrate, ...dbList].sort((a, b) => getSessionTimestamp(b) - getSessionTimestamp(a));
      if (!merged.length) {
        // Brand-new account: seed a first session.
        const now = Date.now();
        const id = `session-${now}`;
        const first = { id, name: "New Session", icon: SESSION_ICONS[0], createdAt: now };
        try {
          await fetch("/api/sessions", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, user_id: user.id, name: first.name, icon: first.icon, createdAt: now }),
          });
        } catch {}
        merged = [first];
      }
      if (cancelled) return;
      setSessions(merged);
      setSessionsLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user?.id, sessionsLoaded]);

  useEffect(() => {
    if (sessionsLoaded) {
      try { localStorage.setItem("vyrexo_sessions", JSON.stringify(sessions)); } catch {}
    }
  }, [sessions, sessionsLoaded]);

  const groupedSessions = useMemo(() => {
    const groups: Record<string, Session[]> = {};
    const sorted = [...sessions].sort((a, b) => getSessionTimestamp(b) - getSessionTimestamp(a));
    for (const s of sorted) {
      const ts = getSessionTimestamp(s);
      const g = dayGroup(ts);
      (groups[g] ||= []).push({
        id: s.id,
        name: s.name,
        icon: s.icon,
        status: s.id === activeSession ? "active" : "ended",
        time: s.id === activeSession ? "" : relTime(ts),
      });
    }
    return groups;
  }, [sessions, activeSession]);

  // Right panel: 4 tabs (Chat / Code / Task / Preview)
  const [activeRightTab, setActiveRightTab] = useState<RightTab>("task");
  const [codeEvents, setCodeEvents] = useState<CodeEvent[]>([]);
  const [previewUrl, setPreviewUrl] = useState("");
  // Track each session's preview URL to guarantee strict isolation between sessions
  const sessionPreviewsRef = useRef<Record<string, string>>({});
  // Track each session's connected project to guarantee strict session-to-session isolation
  const sessionProjectsRef = useRef<
    Record<
      string,
      {
        path: string;
        name: string;
        summary?: string;
        filesCount?: number;
        techStack?: string[];
        source?: string;
      } | null
    >
  >({});

  // Connected project — all agent tasks for the session run inside this folder.
  const [activeProject, setActiveProject] = useState<{
    path: string;
    name: string;
    summary?: string;
    filesCount?: number;
    techStack?: string[];
    source?: string;
  } | null>(null);
  // Mirror in a ref so the WS-connected effect can read it without re-subscribing,
  // and track the last path we told the backend about to avoid duplicate sends.
  const activeProjectRef = useRef<{ path: string; name: string } | null>(null);
  const sentProjectPathRef = useRef<string>("");
  useEffect(() => {
    activeProjectRef.current = activeProject;
  }, [activeProject]);

  // A quick-action command waiting to run. It's sent once the WebSocket is
  // connected and (if the action needs one) a project is bound — so clicking a
  // home-screen card reliably kicks off real work instead of dropping the
  // message during the connection handshake.
  const [pendingCmd, setPendingCmd] = useState<{ text: string; needsProject: boolean } | null>(null);
  // True once the backend has confirmed (via project.loaded) that the project
  // is bound for the CURRENT connection. Project-scoped commands wait for this
  // so work never runs before the project directory is actually set server-side.
  const [projectBound, setProjectBound] = useState(false);

  // A yes/no proposal from Rex (e.g. "Should I implement these fixes?"). When
  // set, we show Approve/Decline buttons — Claude-Code style.
  const [pendingProposal, setPendingProposal] = useState<string | null>(null);

  // Tracks whether Rex is currently speaking, read synchronously inside the
  // voice callback so the user talking over Rex (barge-in) triggers an interrupt.
  const speakingRef = useRef(false);
  useEffect(() => {
    speakingRef.current = orbState === "speaking";
  }, [orbState]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [user, loading, router]);

  // ── Backend-driven audio playback (Edge-TTS over WebSocket) ──
  const { beginUtterance, pushChunk, endUtterance, stop: stopAudio, mute: mutePlayer, unmute: unmutePlayer, isPlaying: audioIsPlaying } = useAudioPlayer();
  // Synchronous mirror of "is Rex's audio playing right now" for use inside the
  // voice callback (barge-in needs to know instantly, without a re-render).
  const isPlayingRef = useRef(false);
  useEffect(() => { isPlayingRef.current = audioIsPlaying; }, [audioIsPlaying]);

  const lastRexSpeechEndTimeRef = useRef(0);
  const recentAiSpeechRef = useRef<Array<{ text: string; time: number }>>([]);
  const isBuildingRef = useRef(false);
  const recordAiSpeech = useCallback((text: string) => {
    if (!text || !text.trim()) return;
    recentAiSpeechRef.current = [
      { text: text.trim(), time: Date.now() },
      ...recentAiSpeechRef.current.filter((item) => Date.now() - item.time < 25000),
    ].slice(0, 15);
  }, []);

  // The orb must reflect REALITY: drive it off actual playback.
  // When audio stops, drop back to the resting state (thinking if active build, listening if mic live, otherwise idle).
  const wasPlayingRef = useRef(false);
  // Mirrors "is the mic live" (voiceMode is declared further down, so a ref keeps
  // this effect independent of declaration order).
  const voiceListeningRef = useRef(false);
  useEffect(() => {
    if (audioIsPlaying) {
      wasPlayingRef.current = true;
      setOrbState("speaking");
      return;
    }
    if (!wasPlayingRef.current) return; // never started; nothing to reset
    const t = setTimeout(() => {
      if (isPlayingRef.current) return; // next utterance already started
      wasPlayingRef.current = false;
      lastRexSpeechEndTimeRef.current = Date.now();
      setOrbState((prev) => {
        if (isBuildingRef.current) return "thinking";
        return prev === "speaking" ? (voiceListeningRef.current ? "listening" : "idle") : prev;
      });
    }, 600);
    return () => clearTimeout(t);
  }, [audioIsPlaying]);

  // When the user interrupts, the backend may still have audio chunks in flight.
  // This flag makes us DISCARD any incoming audio until the next user turn, so
  // Rex goes silent immediately instead of finishing buffered speech.
  const audioMutedRef = useRef(false);
  const muteAudio = useCallback(() => {
    audioMutedRef.current = true;
    mutePlayer(); // hard stop + block all playback until a new turn
  }, [mutePlayer]);
  const unmuteAudio = useCallback(() => {
    audioMutedRef.current = false;
    unmutePlayer();
  }, [unmutePlayer]);

  // Sync Rex's chat bubble with his VOICE: hold the reply text and reveal it the
  // moment the audio actually starts, so it doesn't pop up a beat before he
  // speaks (which felt like text-to-speech). A fallback reveals it anyway if no
  // audio arrives within a moment (e.g. muted, or TTS failed).
  const pendingRexRef = useRef<string | null>(null);
  const pendingRexTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushPendingRex = useCallback(() => {
    if (pendingRexTimerRef.current) {
      clearTimeout(pendingRexTimerRef.current);
      pendingRexTimerRef.current = null;
    }
    const text = pendingRexRef.current;
    if (!text) return;
    pendingRexRef.current = null;
    setChatLog((prev) => [...prev, { role: "assistant", text }]);
    if (isBuildingRef.current) {
      setOrbState("thinking");
    } else {
      setOrbState((prev) => (prev === "thinking" ? (voiceListeningRef.current ? "listening" : "idle") : prev));
      const isReport = text.length > 180 || text.includes("\n");
      if (isReport) {
        setNarration("Done — the details are in the Chat tab.");
        setActiveRightTab("chat");
      } else {
        setNarration(text);
      }
    }
  }, []);

  // ── High-Performance RAF Stream Batching (prevents main thread bottleneck) ──
  const codeEventsBufferRef = useRef<CodeEvent[]>([]);
  const codeEventsRafRef = useRef<number | null>(null);

  const flushCodeEvents = useCallback(() => {
    if (codeEventsBufferRef.current.length === 0) return;
    const chunk = codeEventsBufferRef.current;
    codeEventsBufferRef.current = [];
    setCodeEvents((prev) => {
      const combined = prev.concat(chunk);
      return combined.length > 500 ? combined.slice(-500) : combined;
    });
  }, []);

  const queueCodeEvent = useCallback(
    (event: CodeEvent) => {
      codeEventsBufferRef.current.push(event);
      if (codeEventsRafRef.current === null) {
        codeEventsRafRef.current = requestAnimationFrame(() => {
          codeEventsRafRef.current = null;
          flushCodeEvents();
        });
      }
    },
    [flushCodeEvents]
  );

  useEffect(() => {
    return () => {
      if (codeEventsRafRef.current !== null) {
        cancelAnimationFrame(codeEventsRafRef.current);
      }
    };
  }, []);

  // Throttled partial transcript updater
  const partialTranscriptRef = useRef<string>("");
  const partialTranscriptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── WebSocket: handles all server events ────────────────────
  const onServerMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case "voice.transcription.partial": {
        const text = msg.payload.text as string;
        partialTranscriptRef.current = text;
        if (!partialTranscriptTimerRef.current) {
          partialTranscriptTimerRef.current = setTimeout(() => {
            partialTranscriptTimerRef.current = null;
            setTranscript(partialTranscriptRef.current);
          }, 35);
        }
        break;
      }

      case "voice.transcription.final": {
        if (partialTranscriptTimerRef.current) {
          clearTimeout(partialTranscriptTimerRef.current);
          partialTranscriptTimerRef.current = null;
        }
        setTranscript(msg.payload.text as string);
        break;
      }

      case "voice.output.start":
      case "voice.output.started":
        // Rex is starting a NEW utterance — make sure the player is live so his
        // voice can never get permanently stuck muted (the "responds in text but
        // not by voice" bug). This is safe because interrupt/hush now DRAIN and
        // SUPPRESS speech at the backend: after a stop, no voice.output.started
        // fires until the user's next turn clears suppression, so there's no
        // stale audio to sneak back in.
        unmuteAudio();
        beginUtterance();
        flushPendingRex(); // reveal Rex's text exactly as his voice begins
        setOrbState("speaking");
        break;

      case "voice.output.end":
      case "voice.output.completed":
        endUtterance();
        // Do not force orbState to listening/idle here; audioIsPlaying lifecycle
        // governs the orb state until all audio finishes physically playing.
        break;

      case "agent.narration": {
        // Live "what Rex is doing right now" — shows in the narration box only,
        // NOT in the chat log (chat is reserved for actual conversation turns).
        const narrText = (msg.payload.text as string) || "";
        if (narrText) {
          recordAiSpeech(narrText);
          setNarration(narrText);
        }
        break;
      }

      case "conversation.turn.completed": {
        // Rex's reply. Hold it and reveal it when his voice starts (synced),
        // rather than popping the text up a beat early. Fallback timer shows it
        // promptly within 500ms if no audio stream arrives. Full text → Chat tab.
        const responseText = (msg.payload.text as string) || "";
        if (responseText.trim()) {
          recordAiSpeech(responseText);
          flushPendingRex(); // show any earlier pending reply first
          pendingRexRef.current = responseText;
          pendingRexTimerRef.current = setTimeout(flushPendingRex, 500);
        }
        break;
      }

      case "session.renamed": {
        const newName = msg.payload.name as string;
        const targetId = (msg.payload.id as string) || activeSession;
        if (newName && targetId) {
          setSessions((prev) =>
            prev.map((s) => (s.id === targetId ? { ...s, name: newName } : s))
          );
        }
        break;
      }

      case "action.proposed":
        // Rex is asking to proceed (e.g. implement the reviewed fixes).
        setPendingProposal((msg.payload.prompt as string) || "Want me to go ahead?");
        break;

      case "agent.plan.created":
      case "agent.plan": {
        const plan = msg.payload.plan as Array<Record<string, string>>;
        if (plan) {
          setSteps(plan.map((s) => ({
            agent: s.agent_name,
            description: s.description,
            status: "pending" as const,
          })));
        }
        break;
      }

      case "agent.step.start":
      case "agent.plan.step.started":
        setSteps((prev) =>
          prev.map((s, i) =>
            i === (msg.payload.step_index as number) ? { ...s, status: "running" as const } : s
          )
        );
        setNarration(msg.payload.description as string);
        break;

      case "agent.step.complete":
      case "agent.plan.step.completed":
        setSteps((prev) =>
          prev.map((s, i) =>
            i === (msg.payload.step_index as number) ? { ...s, status: "completed" as const } : s
          )
        );
        break;

      case "agent.action": {
        // A tool the agent ran (file read/write, command, git op) — feeds Code tab via RAF queue.
        queueCodeEvent({
          kind: "action",
          agent: msg.payload.agent as string,
          tool: msg.payload.tool as string,
          category: msg.payload.category as string,
          path: msg.payload.path as string,
          command: msg.payload.command as string,
          message: msg.payload.message as string,
          content: msg.payload.content as string,
          oldContent: msg.payload.old_content as string,
        });
        break;
      }

      case "execution.output": {
        const out = (msg.payload.output as string) || (msg.payload.text as string) || "";
        if (out) queueCodeEvent({ kind: "output", text: out });
        break;
      }

      case "project.loaded": {
        if (msg.payload.ok) {
          const name = (msg.payload.name as string) || "project";
          const path = (msg.payload.path as string) || "";
          const files = (msg.payload.files_indexed as number) ?? 0;
          const proj = { path, name, filesCount: files };
          setActiveProject(proj);
          setProjectBound(true);
          if (activeSession) {
            sessionProjectsRef.current[activeSession] = proj;
            try {
              const map = JSON.parse(localStorage.getItem("vyrexo_session_projects") || "{}");
              map[activeSession] = proj;
              localStorage.setItem("vyrexo_session_projects", JSON.stringify(map));
            } catch {}
          }
          setNarration(`Connected to ${name}${files ? ` — indexed ${files} file${files === 1 ? "" : "s"}` : ""}. Everything I build now happens in this project.`);
        } else {
          setActiveProject(null);
          setProjectBound(false);
          sentProjectPathRef.current = "";
          if (activeSession) {
            sessionProjectsRef.current[activeSession] = null;
            try {
              const map = JSON.parse(localStorage.getItem("vyrexo_session_projects") || "{}");
              delete map[activeSession];
              localStorage.setItem("vyrexo_session_projects", JSON.stringify(map));
            } catch {}
          }
          setNarration((msg.payload.error as string) || "Couldn't connect that project.");
        }
        break;
      }

      case "agent.building.started": {
        isBuildingRef.current = true;
        setOrbState("thinking");
        break;
      }

      case "agent.building.completed": {
        isBuildingRef.current = false;
        break;
      }

      case "preview.ready": {
        isBuildingRef.current = false;
        const url = (msg.payload.url as string) || "";
        if (url) {
          if (activeSession) {
            sessionPreviewsRef.current[activeSession] = url;
          }
          setPreviewUrl(url);
          setActiveRightTab("preview");
          setRightPanelCollapsed(false);
        }
        break;
      }

      case "preview.stopped":
        setPreviewUrl("");
        break;

      case "mode.changed":
        setMode(msg.payload.to as string);
        break;

      case "error":
        setNarration(`Error: ${msg.payload.message || "Something went wrong"}`);
        setOrbState("idle");
        break;
    }
  }, [beginUtterance, endUtterance, unmuteAudio, flushPendingRex, activeSession, recordAiSpeech, queueCodeEvent]);

  const onAudioMessage = useCallback((data: ArrayBuffer) => {
    if (audioMutedRef.current) return; // discard audio that arrives after an interrupt
    // Every binary frame from the backend is an MP3 chunk for the current utterance
    pushChunk(data);
  }, [pushChunk]);

  const { status: wsStatus, connect, disconnect, sendMessage } = useWebSocket({
    sessionId: activeSession || "default",
    onMessage: onServerMessage,
    onAudio: onAudioMessage,
  });

  const handleInterruptVoice = useCallback(() => {
    muteAudio();
    try { window.speechSynthesis.cancel(); } catch {}
    sendMessage({ type: "execution.interrupt", payload: {} });
    setOrbState("idle");
    setNarration("Stopped. What would you like instead?");
    setTranscript("");
  }, [muteAudio, sendMessage]);

  // Unified voice synthesis: keeps Rex's voice 100% consistent across all turns
  const playUnifiedVoice = useCallback(
    async (spokenText: string, emotion: string = "warm") => {
      try {
        const res = await fetch("/api/voice/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: spokenText, emotion }),
        });
        if (res.ok && res.headers.get("Content-Type")?.includes("audio")) {
          const buffer = await res.arrayBuffer();
          if (buffer.byteLength > 100) {
            unmuteAudio();
            beginUtterance();
            pushChunk(buffer);
            endUtterance();
            return;
          }
        }
      } catch {}
      // Fallback only if server audio endpoint fails
      speakHumanizedText(
        spokenText,
        { voice: "adam", speed: "normal", emotion: emotion as any },
        { onEnd: () => setOrbState(voiceListeningRef.current ? "listening" : "idle") }
      );
    },
    [unmuteAudio, beginUtterance, pushChunk, endUtterance]
  );

  // Voice synthesis is now driven by the backend (Edge-TTS streamed over WebSocket).
  // The browser SpeechSynthesisUtterance fallback is no longer used; the chosen voice
  // and speed flow from the Settings page through a voice.config WebSocket message.

  // ── Voice: wake word "Rex" + continuous conversation ────────
  const handleVoiceTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      setTranscript(text);
      const raw = text.trim();
      if (!raw) return;
      const lower = raw.toLowerCase().replace(/[.!?,]/g, "").trim();
      const isStop = isStopPhrase(lower);
      const rexTalking = isPlayingRef.current || speakingRef.current || wasPlayingRef.current;

      // ── BARGE-IN ──────────────────────────────────────────────────────────
      // Only explicit stop words ("stop", "wait", "pause", "quiet", "cancel")
      // are permitted to interrupt Rex mid-speech.
      // Arbitrary speech or acoustic spill from the speakers MUST NEVER interrupt Rex!
      if (!isFinal) {
        if (rexTalking && isStop) {
          muteAudio(); // pause local audio + discard any in-flight chunks
          try { window.speechSynthesis.cancel(); } catch {}
          sendMessage({ type: "execution.interrupt", payload: {} });
          setOrbState("idle");
          setNarration("Stopped. What would you like instead?");
          setTranscript("");
        }
        return; // wait for the final transcript to act on the actual message
      }

      // ── FINAL transcript ──────────────────────────────────────────────────
      // 1. Explicit user stop
      if (isStop) {
        muteAudio();
        try { window.speechSynthesis.cancel(); } catch {}
        sendMessage({ type: "execution.interrupt", payload: {} });
        setOrbState("idle");
        setNarration("Stopped. What would you like instead?");
        setTranscript("");
        return;
      }

      // 2. Suppress acoustic spill while Rex is talking
      if (rexTalking) {
        console.debug("[voice] Suppressing transcript received while Rex was speaking (acoustic spill):", raw);
        setTranscript("");
        return;
      }

      // 3. Suppress acoustic spill in the post-speech cooldown (reverberation & speech-recognition delay)
      const now = Date.now();
      const timeSinceRexSpoke = now - lastRexSpeechEndTimeRef.current;
      const hasExplicitWake = /\b(hey|hello|hi|ok|okay)\s+rex\b/i.test(raw);
      if (timeSinceRexSpoke < 2500 && !hasExplicitWake) {
        console.debug("[voice] Suppressing transcript received in echo cooldown:", raw);
        setTranscript("");
        return;
      }

      // 4. Semantic self-echo check: Did the mic pick up Rex's own speech?
      if (checkIsSelfEcho(raw, recentAiSpeechRef.current)) {
        console.debug("[voice] Suppressing self-echo transcript matching Rex's recent speech:", raw);
        setTranscript("");
        return;
      }

      // 5. Genuine user request -> send to Rex with instant zero-lag responsiveness!
      primeSpeechSynthesis();
      unmuteAudio(); // new turn → allow Rex's reply to play
      setPendingProposal(null);
      setOrbState("thinking");
      setNarration("Thinking...");

      // Heuristic fast-correction for zero perceived lag
      let cleanText = raw.trim()
        .replace(/^he\s+(whatever|rex|can\s+you|could\s+you|what|how|show|run|build|tell|i\s+want)/i, "Hey, $1")
        .replace(/^he\s+how\s+are\s+you/i, "Hey, how are you?")
        .replace(/^he$/i, "Hey")
        .replace(/^he\s+/i, "Hey ")
        .replace(/\bbed\s+for\b/gi, "built for")
        .replace(/\bbill\s+for\b/gi, "built for")
        .replace(/\b(bill|built|billed|bil|belt|bulb)\s+(a|an|the|me|new)\b/gi, "build $2")
        .replace(/\b(bill|bil)\s+(finance|financial|calc|calculator|caculator|project|app|software)\b/gi, "build $2")
        .replace(/\b(cacu|cacula|caculator|calcualtor|calculater|calcultor|calcutor)\b/gi, "calculator")
        .replace(/\bor\s+a\s+mart\b/gi, "AuraMart")
        .replace(/\baura\s*mart\b/gi, "AuraMart")
        .replace(/\baura\s*beauty\b/gi, "AuraBeauty")
        .replace(/\bapex\s*wealth\b/gi, "ApexWealth")
        .replace(/\broom\s*canvas\b/gi, "RoomCanvas")
        .replace(/\bto\s*do\s*list\b/gi, "todo list");

      if (cleanText.length > 0) {
        cleanText = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
      }

      // Check lightweight client fast-path for simple greetings or common commands (<10ms instant response)
      const fastResult = checkClientFastPath(cleanText);
      if (fastResult) {
        if (fastResult.action === "preview") {
          setActiveRightTab("preview");
          setRightPanelCollapsed(false);
        } else if (fastResult.action === "code") {
          setActiveRightTab("code");
          setRightPanelCollapsed(false);
        } else if (fastResult.action === "chat") {
          setActiveRightTab("chat");
        } else if (fastResult.action === "clear") {
          setChatLog([]);
          setNarration("Chat cleared. Ready for your next idea.");
          setTranscript("");
          return;
        } else if (fastResult.action === "stop") {
          handleInterruptVoice();
          return;
        }

        setChatLog((prev) => [
          ...prev,
          { role: "user", text: cleanText },
          { role: "assistant", text: fastResult.reply },
        ]);
        setNarration(fastResult.spoken);
        recordAiSpeech(fastResult.spoken);
        setOrbState("speaking");
        playUnifiedVoice(fastResult.spoken, fastResult.emotion || "warm");
        sendMessage({ type: "text.input", payload: { text: cleanText, fastPath: true } });
        setTranscript("");
        return;
      }

      setChatLog((prev) => [...prev, { role: "user", text: cleanText }]);
      sendMessage({ type: "text.input", payload: { text: cleanText } });
      setTranscript("");
    },
    [sendMessage, muteAudio, unmuteAudio, recordAiSpeech, handleInterruptVoice, playUnifiedVoice]
  );

  const handleActivated = useCallback(() => {
    primeSpeechSynthesis();
    setOrbState("listening");
    setNarration("I'm listening...");
    setTranscript("");
  }, []);

  const handleDeactivated = useCallback(() => {
    setOrbState("idle");
    setNarration("Say 'Rex' to start, or click the orb");
  }, []);

  const {
    mode: voiceMode,
    audioLevel,
    startListening,
    stopListening,
    forceActivate,
  } = useVoice({
    onTranscript: handleVoiceTranscript,
    onActivated: handleActivated,
    onDeactivated: handleDeactivated,
    onInterrupt: handleInterruptVoice,
    isAiSpeaking: isPlayingRef.current || orbState === "speaking" || wasPlayingRef.current,
  });

  // Keep the mic-live mirror in sync for the orb-reset effect above.
  useEffect(() => {
    voiceListeningRef.current = voiceMode === "active_conversation";
  }, [voiceMode]);

  // Clicking the orb: while Rex is talking or working, it's a STOP button —
  // silence + halt immediately. Otherwise it triggers push-to-talk.
  const handleOrbClick = useCallback(() => {
    primeSpeechSynthesis();
    if (isPlayingRef.current || orbState === "speaking" || orbState === "thinking") {
      muteAudio();
      sendMessage({ type: "execution.interrupt", payload: {} });
      setOrbState("idle");
      setNarration("Stopped. What would you like instead?");
      return;
    }
    forceActivate();
  }, [orbState, muteAudio, sendMessage, forceActivate]);

  // ── Session management ──────────────────────────────────────
  // Tracks the most recently opened session so a slow history fetch from an
  // earlier click can't populate the chat of the session we're now on.
  const historyReqRef = useRef<string>("");

  // ── Auto-persist active session chat log to localStorage & backend ────────
  useEffect(() => {
    if (!activeSession || chatLog.length === 0) return;
    try {
      localStorage.setItem(`vyrexo_chat_history_${activeSession}`, JSON.stringify(chatLog));
    } catch {}

    const timer = setTimeout(() => {
      fetch(`/api/sessions/${encodeURIComponent(activeSession)}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turns: chatLog.map((c) => ({
            role: c.role,
            text: c.text,
            images: c.images,
            docs: c.docs,
            timestamp: Date.now(),
          })),
        }),
      }).catch(() => {});
    }, 500);

    return () => clearTimeout(timer);
  }, [activeSession, chatLog]);

  const handleSessionClick = useCallback(
    (id: string) => {
      if (activeSession) disconnect();
      setActiveSession(id);
      setSteps([]);
      setNarration("Say 'Rex' to start, or click the orb");

      // Instantly restore this session's saved conversation from localStorage (zero flicker)
      let initialTurns: Array<{ role: string; text: string; images?: string[]; docs?: string[] }> = [];
      try {
        const raw = localStorage.getItem(`vyrexo_chat_history_${id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) initialTurns = parsed;
        }
      } catch {}
      setChatLog(initialTurns);

      setCodeEvents([]);
      setTranscript("");
      // Strict session isolation: restore this session's dedicated preview or start fresh
      const sessionUrl = sessionPreviewsRef.current[id] || "";
      setPreviewUrl(sessionUrl);

      // Strict session isolation: restore THIS session's connected project (or null if none)
      let sessProj = sessionProjectsRef.current[id] || null;
      if (!sessProj) {
        try {
          const map = JSON.parse(localStorage.getItem("vyrexo_session_projects") || "{}");
          if (map[id]) sessProj = map[id];
        } catch {}
      }
      setActiveProject(sessProj);
      activeProjectRef.current = sessProj;
      sentProjectPathRef.current = sessProj ? sessProj.path : "";
      setProjectBound(!!sessProj);

      // Also verify with backend for this specific session
      fetch(`/api/projects?sessionId=${encodeURIComponent(id)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d?.ok && d.connected && d.project) {
            const p = {
              path: d.project.path,
              name: d.project.name,
              summary: d.project.summary,
              techStack: d.project.techStack,
              filesCount: d.project.filesCount,
              source: d.project.source,
            };
            setActiveProject(p);
            activeProjectRef.current = p;
            sessionProjectsRef.current[id] = p;
            try {
              const map = JSON.parse(localStorage.getItem("vyrexo_session_projects") || "{}");
              map[id] = p;
              localStorage.setItem("vyrexo_session_projects", JSON.stringify(map));
            } catch {}
          }
        })
        .catch(() => {});

      // Restore and synchronize this session's saved conversation with the backend
      historyReqRef.current = id;
      fetch(`/api/sessions/${encodeURIComponent(id)}/history`)
        .then((r) => r.json())
        .then((d) => {
          if (historyReqRef.current !== id) return; // user switched again
          if (d?.ok && Array.isArray(d.turns) && d.turns.length) {
            const mapped = d.turns.map((t: { role: string; content?: string; text?: string; images?: string[]; docs?: string[] }) => ({
              role: t.role,
              text: t.text || t.content || "",
              images: t.images,
              docs: t.docs,
            }));
            setChatLog((prev) => {
              if (prev.length >= mapped.length) return prev;
              return mapped;
            });
            try {
              localStorage.setItem(`vyrexo_chat_history_${id}`, JSON.stringify(mapped));
            } catch {}
          }
        })
        .catch(() => {});
    },
    [activeSession, disconnect]
  );

  // Create a brand-new session: persist it to the DB, add to the list, activate.
  const createSession = useCallback(() => {
    const id = `session-${Date.now()}`;
    sessionPreviewsRef.current[id] = "";
    sessionProjectsRef.current[id] = null;
    setActiveProject(null);
    activeProjectRef.current = null;
    setProjectBound(false);
    sentProjectPathRef.current = "";
    setPreviewUrl("");
    const icon = SESSION_ICONS[sessions.length % SESSION_ICONS.length];
    const initialGreeting = [
      {
        role: "assistant",
        text: "Hey! Rex here. What would you like to explore, discuss, or build together?",
      },
    ];
    setChatLog(initialGreeting);
    try {
      localStorage.setItem(`vyrexo_chat_history_${id}`, JSON.stringify(initialGreeting));
    } catch {}

    const now = Date.now();
    setSessions((prev) => [{ id, name: "New Session", icon, createdAt: now }, ...prev]);
    if (user?.id) {
      fetch("/api/sessions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, user_id: user.id, name: "New Session", icon, createdAt: now }),
      }).catch(() => {});
    }
    handleSessionClick(id);
    return id;
  }, [handleSessionClick, user?.id, sessions.length]);

  const handleRenameSession = useCallback((id: string, name: string) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
    fetch(`/api/sessions/${encodeURIComponent(id)}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).catch(() => {});
  }, []);

  const handleDeleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      fetch(`/api/sessions/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
      fetch(`/api/projects?sessionId=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
      fetch(`/api/sessions/${encodeURIComponent(id)}/history`, { method: "DELETE" }).catch(() => {});
      delete sessionProjectsRef.current[id];
      delete sessionPreviewsRef.current[id];
      try {
        localStorage.removeItem(`vyrexo_chat_history_${id}`);
        const map = JSON.parse(localStorage.getItem("vyrexo_session_projects") || "{}");
        delete map[id];
        localStorage.setItem("vyrexo_session_projects", JSON.stringify(map));
      } catch {}
      if (id === activeSession) {
        disconnect();
        setActiveSession(null);
        setActiveProject(null);
        activeProjectRef.current = null;
        setProjectBound(false);
        sentProjectPathRef.current = "";
        setChatLog([]);
      }
    },
    [activeSession, disconnect]
  );

  const handleClearCurrentChat = useCallback(() => {
    if (!activeSession) return;
    setChatLog([]);
    try {
      localStorage.removeItem(`vyrexo_chat_history_${activeSession}`);
    } catch {}
    fetch(`/api/sessions/${encodeURIComponent(activeSession)}/history`, {
      method: "DELETE",
    }).catch(() => {});
  }, [activeSession]);

  const handleDeleteOldChats = useCallback(
    async (days: number) => {
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      const toRemove = sessions.filter((s) => getSessionTimestamp(s) < cutoff);
      for (const s of toRemove) {
        try {
          localStorage.removeItem(`vyrexo_chat_history_${s.id}`);
        } catch {}
      }
      setSessions((prev) => prev.filter((s) => getSessionTimestamp(s) >= cutoff));
      if (activeSession && toRemove.some((s) => s.id === activeSession)) {
        disconnect();
        setActiveSession(null);
        setActiveProject(null);
        setChatLog([]);
      }
      try {
        await fetch(
          `/api/sessions?older_than_days=${days}&user_id=${encodeURIComponent(user?.id || "dev-local-user")}`,
          { method: "DELETE" }
        );
      } catch {}
    },
    [sessions, activeSession, disconnect, user?.id]
  );

  const handleClearAllHistory = useCallback(async () => {
    for (const s of sessions) {
      try {
        localStorage.removeItem(`vyrexo_chat_history_${s.id}`);
      } catch {}
    }
    setChatLog([]);
    setSessions([]);
    disconnect();
    setActiveSession(null);
    setActiveProject(null);
    try {
      await fetch(
        `/api/sessions?clear_all=true&user_id=${encodeURIComponent(user?.id || "dev-local-user")}`,
        { method: "DELETE" }
      );
    } catch {}
    createSession();
  }, [sessions, disconnect, user?.id, createSession]);

  // Connect WS + start voice when session is selected
  useEffect(() => {
    if (activeSession) {
      connect();
      startListening();
      return () => {
        disconnect();
        stopListening();
      };
    }
  }, [activeSession, connect, disconnect, startListening, stopListening]);

  // Update narration when WS connects and push voice config to the backend
  useEffect(() => {
    if (wsStatus === "connected") {
      setNarration("Say 'Rex' to start, or click the orb");

      // Push the user's saved voice preference so backend TTS uses the right voice
      try {
        const saved = localStorage.getItem("vyrexo_voice");
        if (saved) {
          const prefs = JSON.parse(saved);
          const rateMap: Record<string, string> = {
            slow: "-15%",
            normal: "+0%",
            fast: "+15%",
          };
          sendMessage({
            type: "voice.config",
            payload: {
              voice: prefs.voice || "adam",
              rate: rateMap[prefs.speed] || "+0%",
            },
          });
        }
      } catch {
        // Settings not set yet; backend will use default voice
      }
    }
  }, [wsStatus, sendMessage]);

  // Restore session-isolated projects map on initial load
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vyrexo_session_projects");
      if (saved) {
        const map = JSON.parse(saved);
        sessionProjectsRef.current = map;
        if (activeSession && map[activeSession]) {
          setActiveProject(map[activeSession]);
        }
      }
    } catch {}
  }, [activeSession]);

  // A fresh socket means the backend hasn't been told our project yet.
  useEffect(() => {
    if (wsStatus !== "connected") {
      sentProjectPathRef.current = "";
      setProjectBound(false);
    }
  }, [wsStatus]);

  // Bind the connected project to the backend session whenever the socket is up.
  useEffect(() => {
    if (wsStatus === "connected" && activeProject && sentProjectPathRef.current !== activeProject.path) {
      sentProjectPathRef.current = activeProject.path;
      sendMessage({ type: "project.set", payload: { path: activeProject.path } });
    }
  }, [wsStatus, activeProject, sendMessage]);

  // Flush a queued quick-action command once we're connected (and, for actions
  // that operate on existing code, once a project is bound).
  useEffect(() => {
    if (!pendingCmd) return;
    if (wsStatus !== "connected") return;
    // Wait until the backend confirms the project is bound for this connection.
    if (pendingCmd.needsProject && !projectBound) return;
    const text = pendingCmd.text;
    setPendingCmd(null);
    unmuteAudio();
    setChatLog((prev) => [...prev, { role: "user", text }]);
    sendMessage({ type: "text.input", payload: { text } });
    setOrbState("thinking");
    setNarration("On it — let me get started.");
  }, [pendingCmd, wsStatus, projectBound, sendMessage, unmuteAudio]);

  // ── Project + VS Code ────────────────────────────────────────
  // Browsers cannot expose an absolute filesystem path, so the directory
  // picker is used (when available) only to suggest a folder name; the user
  // confirms the absolute path. The backend validates it, indexes it, and
  // scopes every subsequent task in this session to that folder.
  const handleConnectProject = useCallback(() => {
    setConnectProjectModalOpen(true);
  }, []);

  const handleSelectProjectFromModal = useCallback(
    (project: {
      name: string;
      path: string;
      summary?: string;
      filesCount?: number;
      techStack?: string[];
      source?: string;
    }) => {
      setActiveProject(project);
      activeProjectRef.current = project;
      setNarration(`Connected to ${project.name}${project.filesCount ? ` (${project.filesCount} files)` : ""}.`);
      sentProjectPathRef.current = "";

      const currentSessionId = activeSession || `session-${Date.now()}`;
      sessionProjectsRef.current[currentSessionId] = project;
      try {
        const map = JSON.parse(localStorage.getItem("vyrexo_session_projects") || "{}");
        map[currentSessionId] = project;
        localStorage.setItem("vyrexo_session_projects", JSON.stringify(map));
      } catch {}

      if (!activeSession) {
        createSession();
      } else if (wsStatus === "connected") {
        sentProjectPathRef.current = project.path;
        sendMessage({ type: "project.set", payload: { path: project.path } });
      }
    },
    [activeSession, wsStatus, sendMessage, createSession]
  );

  const handleDisconnectProject = useCallback(async () => {
    if (!activeSession) return;
    try {
      await fetch(`/api/projects?sessionId=${encodeURIComponent(activeSession)}`, {
        method: "DELETE",
      });
    } catch {}
    setActiveProject(null);
    activeProjectRef.current = null;
    setProjectBound(false);
    sentProjectPathRef.current = "";
    sessionProjectsRef.current[activeSession] = null;
    try {
      const map = JSON.parse(localStorage.getItem("vyrexo_session_projects") || "{}");
      delete map[activeSession];
      localStorage.setItem("vyrexo_session_projects", JSON.stringify(map));
    } catch {}
    setNarration("Project disconnected from this session.");
    setConnectProjectModalOpen(false);
  }, [activeSession]);

  const handleOpenVSCode = useCallback(async () => {
    try {
      const res = await fetch("/api/projects/vscode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: activeProject?.path || "." }),
      });
      const data = await res.json();
      if (data?.ok) {
        setVsCodeDetails({
          targetPath: data.targetPath,
          vscodeUri: data.vscodeUri,
          cursorUri: data.cursorUri,
          windsurfUri: data.windsurfUri,
        });
        setVsCodeModalOpen(true);
        // Attempt browser deep-link trigger to open VS Code app directly
        if (data.vscodeUri && typeof window !== "undefined") {
          window.location.href = data.vscodeUri;
        }
      }
    } catch (err) {
      console.error("Failed to open VS Code:", err);
    }
  }, [activeProject]);

  // Run a home-screen quick action: queue its real command, then make sure we
  // have a session and (for project-scoped work) a connected project. The
  // pendingCmd effect sends the command once everything is ready.
  const runQuickAction = useCallback(
    (action: QuickAction) => {
      setPendingCmd({ text: action.prompt, needsProject: true });

      if (!activeProjectRef.current) {
        // No project yet — open the connect flow (which also starts a session).
        // The command flushes automatically once project.loaded confirms.
        setNarration(action.connectHint);
        handleConnectProject();
        return;
      }

      // Project already connected — just make sure a session is live; the
      // pendingCmd effect flushes the command as soon as the socket is up.
      if (!activeSession) createSession();
    },
    [activeSession, handleConnectProject, createSession]
  );

  // ── Text input ──────────────────────────────────────────────
  // Attach image files (from the + button, drag, or paste), downscaled. Max 4.
  const addImageFiles = useCallback(async (files: FileList | File[]) => {
    const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imgs.length === 0) return;
    const urls = (await Promise.all(imgs.map((f) => downscaleImage(f)))).filter(Boolean) as string[];
    setAttachedImages((prev) => [...prev, ...urls].slice(0, 4));
  }, []);

  // Attach documents (read as data URLs; the backend extracts the text).
  const addDocFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).slice(0, 5);
    Promise.all(
      arr.map(
        (f) =>
          new Promise<{ name: string; dataurl: string }>((res) => {
            const r = new FileReader();
            r.onload = () => res({ name: f.name, dataurl: r.result as string });
            r.onerror = () => res({ name: f.name, dataurl: "" });
            r.readAsDataURL(f);
          })
      )
    ).then((docs) => setAttachedDocs((prev) => [...prev, ...docs.filter((d) => d.dataurl)].slice(0, 5)));
  }, []);

  // Attach a video → upload to the backend, which hands it to Gemini for real
  // video understanding (visuals + audio narration).
  const addVideoFile = useCallback(async (file: File) => {
    setVideoUploading(true);
    setAttachedVideo(null);
    setNarration("Uploading your video so Rex can watch it — longer clips take a moment...");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/media/video", { method: "POST", body: form });
      const d = await res.json();
      if (d.ok && d.video_id) {
        setAttachedVideo({ name: d.name || file.name, videoId: d.video_id });
        setNarration("Video's ready — ask me about it, or say \"build what's in this\".");
      } else {
        setNarration(d.error || "I couldn't process that video.");
      }
    } catch {
      setNarration("Couldn't upload the video — is the backend running?");
    } finally {
      setVideoUploading(false);
    }
  }, []);

  const handleTextSubmit = useCallback(() => {
    const text = textInput.trim();
    const images = attachedImages;
    const docs = attachedDocs;
    const video = attachedVideo;
    if (!text && images.length === 0 && docs.length === 0 && !video) return;
    unmuteAudio(); // new turn → allow Rex's reply to play
    setPendingProposal(null); // any typed message supersedes a pending yes/no

    // Lightweight client fast-path for text input (<10ms instant response)
    if (images.length === 0 && docs.length === 0 && !video) {
      const fastResult = checkClientFastPath(text);
      if (fastResult) {
        if (fastResult.action === "preview") {
          setActiveRightTab("preview");
          setRightPanelCollapsed(false);
        } else if (fastResult.action === "code") {
          setActiveRightTab("code");
          setRightPanelCollapsed(false);
        } else if (fastResult.action === "chat") {
          setActiveRightTab("chat");
        } else if (fastResult.action === "clear") {
          setChatLog([]);
          setTextInput("");
          setNarration("Chat cleared. Ready for your next idea.");
          setTranscript("");
          return;
        } else if (fastResult.action === "stop") {
          handleInterruptVoice();
          setTextInput("");
          return;
        }

        setChatLog((prev) => [
          ...prev,
          { role: "user", text },
          { role: "assistant", text: fastResult.reply },
        ]);
        setTextInput("");
        setTranscript(text);
        setNarration(fastResult.spoken);
        recordAiSpeech(fastResult.spoken);
        setOrbState("speaking");
        playUnifiedVoice(fastResult.spoken, fastResult.emotion || "warm");
        sendMessage({ type: "text.input", payload: { text, fastPath: true } });
        return;
      }
    }

    const chips = [...docs.map((d) => d.name), ...(video ? [`🎬 ${video.name}`] : [])];
    setChatLog((prev) => [
      ...prev,
      { role: "user", text, images: images.length ? images : undefined, docs: chips.length ? chips : undefined },
    ]);
    sendMessage({ type: "text.input", payload: { text, images, documents: docs, video_id: video?.videoId || "" } });
    setTranscript(text);
    setTextInput("");
    setAttachedImages([]);
    setAttachedDocs([]);
    setAttachedVideo(null);
    setOrbState("thinking");
    setActiveRightTab("chat");
  }, [textInput, attachedImages, attachedDocs, attachedVideo, sendMessage, unmuteAudio, recordAiSpeech, handleInterruptVoice, playUnifiedVoice]);

  // Answer a yes/no proposal from Rex (e.g. "implement these fixes?").
  const respondToProposal = useCallback(
    (accept: boolean) => {
      const text = accept ? "yes" : "no";
      unmuteAudio();
      setPendingProposal(null);
      setChatLog((prev) => [...prev, { role: "user", text }]);
      sendMessage({ type: "text.input", payload: { text } });
      setOrbState("thinking");
      setNarration(accept ? "On it — getting started now." : "Okay, leaving it as is.");
    },
    [sendMessage, unmuteAudio]
  );

  // ── Keyboard shortcuts ──────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return; // Don't capture when typing

      if (e.code === "Space") {
        e.preventDefault();
        primeSpeechSynthesis();
        forceActivate();
      }
      if (e.code === "Escape") {
        muteAudio();
        try { window.speechSynthesis.cancel(); } catch {}
        sendMessage({ type: "execution.interrupt", payload: {} });
        setOrbState("idle");
        setNarration("Interrupted. What would you like instead?");
      }
      if (e.code === "KeyB" && e.ctrlKey) {
        e.preventDefault();
        setSidebarCollapsed((p) => !p);
        setRightPanelCollapsed((p) => !p);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [forceActivate, sendMessage, muteAudio]);

  // ── Loading / Auth guard ────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "var(--app-grad-to)" }}>
        <div className="text-[var(--muted2)] text-sm">Loading...</div>
      </div>
    );
  }
  if (!user) return null;

  // ── Home screen (no session) ────────────────────────────────
  if (!activeSession) {
    return (
      <div className="flex h-screen">
        <Sidebar
          sessions={groupedSessions}
          activeSessionId={activeSession ?? undefined}
          collapsed={sidebarCollapsed}
          width={sidebarWidth}
          user={user}
          onSignOut={signOut}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onSessionClick={handleSessionClick}
          onNewSession={createSession}
          onRenameSession={handleRenameSession}
          onDeleteSession={handleDeleteSession}
          onClearCurrentChat={handleClearCurrentChat}
          onDeleteOldChats={handleDeleteOldChats}
          onClearAllHistory={handleClearAllHistory}
        />
        {!sidebarCollapsed && (
          <ResizeHandle onDelta={(dx) => setSidebarWidth((w) => clamp(w + dx, 180, 520))} />
        )}
        <div
          className="flex-1 flex flex-col items-center justify-center relative z-10"
          style={{ background: "radial-gradient(ellipse at center, var(--app-grad-from) 0%, var(--app-grad-to) 65%)" }}
        >
          {/* User profile */}
          <div className="absolute top-4 right-5 flex items-center gap-2.5 z-20">
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border2)] bg-[var(--surface)] text-xs font-medium text-[var(--muted2)] hover:text-red-500 hover:border-red-500/40 hover:bg-red-500/10 transition-all cursor-pointer shadow-sm"
              title="Sign out of your account"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-75 flex-shrink-0">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Sign out</span>
            </button>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-[var(--border2)] bg-[var(--surface)] shadow-sm">
              <div
                className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 shadow-sm"
                style={{ background: "linear-gradient(135deg, #3B5998, #7B93B0)" }}
              >
                {user.user_metadata?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
              </div>
              <span className="text-xs text-[var(--text)] font-medium pr-1">
                {user.user_metadata?.full_name || user.email?.split("@")[0]}
              </span>
            </div>
          </div>

          <Orb state="idle" onClick={createSession} />

          <div className="mt-9 text-center">
            <h2 className="text-[22px] font-semibold text-[var(--text)]">What are we building?</h2>
            <p className="mt-2 text-sm text-[var(--muted2)]">Click the orb or select a session to start</p>
          </div>

          {/* Quick actions */}
          <div className="flex gap-[10px] mt-10">
            {QUICK_ACTIONS.map((action) => (
              <div
                key={action.title}
                onClick={() => runQuickAction(action)}
                className="p-[10px_16px] bg-[var(--card)] border border-[var(--border2)] rounded-[10px] cursor-pointer max-w-[180px] hover:border-[#3B599833] hover:bg-[#3B599808] transition-all"
              >
                <div className="text-[12.5px] text-[var(--text3)] font-medium">{action.title}</div>
                <div className="text-[11px] text-[var(--muted)] mt-[3px] leading-snug">{action.desc}</div>
              </div>
            ))}
          </div>

          {/* Connect project */}
          <button
            onClick={handleConnectProject}
            className="mt-8 flex items-center gap-2 px-[18px] py-2 bg-[#3B599815] border border-[#3B599830] rounded-[10px] text-[var(--ice)] text-[13px] font-medium hover:bg-[#3B599825] hover:border-[#3B599850] transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            Connect a project folder
          </button>

          <a href="/settings" className="mt-4 text-xs text-[var(--muted)] hover:text-[var(--steel)] transition-colors">
            Voice Settings
          </a>

          <div className="absolute bottom-4 right-5 text-[10px] text-[var(--border2)]">Vyrexo v0.1.0</div>
        </div>
      </div>
    );
  }

  // ── Active session ──────────────────────────────────────────
  return (
    <div className="flex h-screen">
      <Sidebar
        sessions={groupedSessions}
        activeSessionId={activeSession}
        collapsed={sidebarCollapsed}
        width={sidebarWidth}
        user={user}
        onSignOut={signOut}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSessionClick={handleSessionClick}
        onNewSession={createSession}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
        onClearCurrentChat={handleClearCurrentChat}
        onDeleteOldChats={handleDeleteOldChats}
        onClearAllHistory={handleClearAllHistory}
      />
      {!sidebarCollapsed && (
        <ResizeHandle onDelta={(dx) => setSidebarWidth((w) => clamp(w + dx, 180, 520))} />
      )}

      <div className="flex-1 flex flex-col relative z-10">
        {/* Toggle left */}
        <div className="absolute top-3 left-3 z-50">
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="w-[30px] h-[30px] rounded-[7px] border border-[var(--border2)] bg-[var(--border)] text-[var(--icon)] flex items-center justify-center hover:border-[var(--steel)] hover:text-[var(--steel)] hover:bg-[var(--steel-dim)] transition-all">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
          </button>
        </div>

        {/* Floating bar */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-[10px] px-[14px] py-[5px] bg-[var(--bar)] backdrop-blur-xl border border-[var(--border2)] rounded-xl">
          <ModeIndicator mode={mode} />
          <button
            onClick={handleConnectProject}
            title={activeProject ? `Working in ${activeProject.path} — click to change` : "Connect a project folder"}
            className={`flex items-center gap-[5px] text-[11px] font-medium px-2 py-[3px] rounded-md border transition-all max-w-[180px] ${
              activeProject
                ? "text-[var(--ice)] border-[#3B599840] bg-[#3B599815] hover:bg-[#3B599825]"
                : "text-[var(--muted)] border-[var(--border2)] bg-[var(--border)] hover:text-[var(--text3)] hover:border-[var(--steel)]"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span className="truncate">{activeProject ? activeProject.name : "Connect project"}</span>
          </button>
          <div className={`w-[6px] h-[6px] rounded-full ${wsStatus === "connected" ? "bg-[#22c55e] shadow-[0_0_6px_#22c55e88]" : wsStatus === "connecting" ? "bg-yellow-500 animate-pulse" : "bg-red-500"}`} />
          <span className="text-[11px] text-[var(--muted2)]">{wsStatus}</span>
          <div className="flex items-center gap-1.5 text-[10.5px] px-2 py-0.5 rounded-md bg-[var(--border)] border border-[var(--border2)] text-[var(--muted2)]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                voiceMode === "active_conversation"
                  ? "bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]"
                  : "bg-[#6888C8]"
              }`}
            />
            <span className="font-mono">
              {voiceMode === "active_conversation" ? "Voice Active" : "Say 'Rex'"}
            </span>
          </div>
          <ThemeToggle />
          <button onClick={handleOpenVSCode} className="w-[30px] h-[30px] rounded-[7px] border border-[var(--border2)] bg-[var(--border)] flex items-center justify-center hover:border-[#1e6fff] hover:bg-[#1e6fff15] transition-all p-0" title="Open in VS Code">
            <svg width="16" height="16" viewBox="0 0 100 100" fill="none">
              <path d="M71.6 99.1l22.8-11.1c3.4-1.7 5.6-5.1 5.6-8.9V20.9c0-3.8-2.2-7.3-5.6-8.9L71.6.9c-4.3-2.1-9.3-.5-11.8 2.8L27.5 33.5 11.3 21.2c-2.4-1.8-5.8-1.6-7.9.5L.6 24.5c-2.4 2.4-.8 6.5 2.5 6.5h.1l20.3 15.8L3.2 62.6h-.1c-3.3 0-4.9 4.1-2.5 6.5l2.8 2.8c2.1 2.1 5.5 2.3 7.9.5L27.5 60l32.3 29.7c1.8 2.4 4.8 3.6 7.8 3.6 1.3 0 2.7-.3 4-1zM71.6 27.8L44.9 46.8l26.7 19v-38z" fill="#007ACC"/>
            </svg>
          </button>
          <a href="/settings" className="w-[30px] h-[30px] rounded-[7px] border border-[var(--border2)] bg-[var(--border)] flex items-center justify-center hover:border-[var(--steel)] hover:bg-[var(--steel-dim)] transition-all" title="Settings">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text4)" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </a>
          <button
            onClick={signOut}
            className="w-[30px] h-[30px] rounded-[7px] border border-[var(--border2)] bg-[var(--border)] text-[var(--icon)] flex items-center justify-center hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-500 transition-all cursor-pointer"
            title="Sign out"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>

        {/* Toggle right */}
        <div className="absolute top-3 right-3 z-50">
          <button onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)} className="w-[30px] h-[30px] rounded-[7px] border border-[var(--border2)] bg-[var(--border)] text-[var(--icon)] flex items-center justify-center hover:border-[var(--steel)] hover:text-[var(--steel)] hover:bg-[var(--steel-dim)] transition-all">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/></svg>
          </button>
        </div>

        {/* Orb center */}
        <div className="flex-1 flex flex-col items-center justify-center" style={{ background: "radial-gradient(ellipse at center, var(--app-grad-from) 0%, var(--app-grad-to) 70%)" }}>
          <Orb state={orbState} transcript={transcript || undefined} onClick={handleOrbClick} />

          {/* Proposal banner — Rex asking to proceed (e.g. implement fixes) */}
          {pendingProposal && (
            <div className="absolute bottom-[100px] left-1/2 -translate-x-1/2 flex items-center gap-3 w-full max-w-[440px] px-4 py-[10px] mx-4 bg-[var(--card)] border border-[#3B599840] rounded-xl shadow-lg">
              <span className="flex-1 text-xs text-[var(--ice)]">{pendingProposal}</span>
              <button
                onClick={() => respondToProposal(true)}
                className="px-3 py-[5px] bg-[var(--midnight)] text-white text-xs font-semibold rounded-md hover:bg-[var(--steel)] transition-all"
              >
                Yes, implement
              </button>
              <button
                onClick={() => respondToProposal(false)}
                className="px-3 py-[5px] bg-transparent text-[var(--muted2)] text-xs font-medium rounded-md border border-[var(--border2)] hover:text-[var(--text3)] hover:border-[var(--steel)] transition-all"
              >
                Not now
              </button>
            </div>
          )}

          {/* Text input + attachments (image / document / video) */}
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex flex-col gap-2 w-full max-w-[460px] px-4">
            {(attachedImages.length > 0 || attachedDocs.length > 0 || attachedVideo || videoUploading) && (
              <div className="flex gap-2 flex-wrap">
                {attachedImages.map((src, i) => (
                  <div key={`img${i}`} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="attachment" className="w-12 h-12 object-cover rounded-md border border-[var(--border2)]" />
                    <button
                      onClick={() => setAttachedImages((p) => p.filter((_, j) => j !== i))}
                      title="Remove"
                      className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] rounded-full bg-[var(--midnight)] text-white text-[11px] leading-none flex items-center justify-center hover:bg-[var(--steel)]"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {attachedDocs.map((d, i) => (
                  <div key={`doc${i}`} className="relative flex items-center gap-1.5 h-12 px-2.5 rounded-md border border-[var(--border2)] bg-[var(--input)] max-w-[150px]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--steel)" strokeWidth="2" className="flex-shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    <span className="text-[10px] text-[var(--text3)] truncate">{d.name}</span>
                    <button
                      onClick={() => setAttachedDocs((p) => p.filter((_, j) => j !== i))}
                      title="Remove"
                      className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] rounded-full bg-[var(--midnight)] text-white text-[11px] leading-none flex items-center justify-center hover:bg-[var(--steel)]"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {videoUploading && (
                  <div className="flex items-center gap-1.5 h-12 px-2.5 rounded-md border border-[var(--border2)] bg-[var(--input)]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--steel)" strokeWidth="2" className="flex-shrink-0 animate-spin"><path d="M21 12a9 9 0 1 1-6.2-8.5" /></svg>
                    <span className="text-[10px] text-[var(--muted2)]">Processing video…</span>
                  </div>
                )}
                {attachedVideo && (
                  <div className="relative flex items-center gap-1.5 h-12 px-2.5 rounded-md border border-[var(--border2)] bg-[var(--input)] max-w-[150px]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--steel)" strokeWidth="2" className="flex-shrink-0"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
                    <span className="text-[10px] text-[var(--text3)] truncate">{attachedVideo.name}</span>
                    <button
                      onClick={() => setAttachedVideo(null)}
                      title="Remove"
                      className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] rounded-full bg-[var(--midnight)] text-white text-[11px] leading-none flex items-center justify-center hover:bg-[var(--steel)]"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* hidden pickers */}
            <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => { if (e.target.files) addImageFiles(e.target.files); e.target.value = ""; }} />
            <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.txt,.md,.csv,.json,.rtf,.py,.js,.ts,.tsx,.html,.css,.java,.go,.rs,.rb,.c,.cpp,.sh,.sql,.yaml,.yml" multiple className="hidden"
              onChange={(e) => { if (e.target.files) addDocFiles(e.target.files); e.target.value = ""; }} />
            <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) addVideoFile(e.target.files[0]); e.target.value = ""; }} />

            <div className="flex items-center gap-2">
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setAttachMenuOpen((o) => !o)}
                  title="Attach"
                  className="w-9 h-9 rounded-lg border border-[var(--border2)] bg-[var(--input)] text-[var(--icon)] flex items-center justify-center hover:border-[var(--steel)] hover:text-[var(--icon-hover)] transition-all"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: attachMenuOpen ? "rotate(45deg)" : "none", transition: "transform .15s" }}><path d="M12 5v14M5 12h14" /></svg>
                </button>
                {attachMenuOpen && (
                  <div className="absolute bottom-11 left-0 w-[150px] bg-[var(--surface)] border border-[var(--border2)] rounded-lg shadow-xl overflow-hidden z-50">
                    {[
                      { label: "Image", ref: imageInputRef, icon: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></> },
                      { label: "Document", ref: docInputRef, icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></> },
                      { label: "Video", ref: videoInputRef, icon: <><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></> },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={() => { setAttachMenuOpen(false); item.ref.current?.click(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-[var(--text3)] hover:bg-[var(--midnight-dim)] hover:text-[var(--ice)] transition-all"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{item.icon}</svg>
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
                onPaste={(e) => { const f = Array.from(e.clipboardData?.files || []); if (f.length) addImageFiles(f); }}
                placeholder="Type a command, attach a file, or say 'Rex'..."
                className="flex-1 bg-[var(--input)] border border-[var(--border2)] rounded-lg py-2 px-3 text-xs text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[#3B599844]"
              />
              <button onClick={handleTextSubmit} className="px-3 py-2 bg-[var(--midnight)] text-white text-xs font-medium rounded-lg hover:bg-[var(--steel)] transition-all flex-shrink-0">
                Send
              </button>
            </div>
          </div>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 text-[11px] text-[var(--border2)]">
            <span><kbd className="bg-[var(--border)] border border-[var(--border2)] rounded px-[6px] py-[1px] text-[10px] text-[var(--muted2)]">Space</kbd> push-to-talk</span>
            <span><kbd className="bg-[var(--border)] border border-[var(--border2)] rounded px-[6px] py-[1px] text-[10px] text-[var(--muted2)]">Esc</kbd> interrupt</span>
          </div>
        </div>
      </div>

      {/* Right panel — 4 tabs: Chat / Code / Task / Preview */}
      {!rightPanelCollapsed && (
        <ResizeHandle onDelta={(dx) => setRightPanelWidth((w) => clamp(w - dx, 280, 760))} />
      )}
      <RightPanel
        collapsed={rightPanelCollapsed}
        width={rightPanelWidth}
        projectPath={activeProject?.path || ""}
        activeTab={activeRightTab}
        onTabChange={setActiveRightTab}
        narration={narration}
        steps={steps}
        chatLog={chatLog}
        codeEvents={codeEvents}
        previewUrl={previewUrl}
        onPreviewUrlChange={setPreviewUrl}
        voiceMode={voiceMode}
        onInterrupt={() => {
          muteAudio();
          try { window.speechSynthesis.cancel(); } catch {}
          sendMessage({ type: "execution.interrupt", payload: {} });
          setOrbState("idle");
          setNarration("Interrupted. What would you like instead?");
        }}
        onConnectProject={handleConnectProject}
        sessionId={activeSession || "default"}
        onClearChat={handleClearCurrentChat}
      />

      {/* VS Code & Desktop IDE Bridge Dialog */}
      {vsCodeModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setVsCodeModalOpen(false)}
        >
          <div
            className="w-[460px] max-w-[95vw] rounded-2xl border border-[var(--border2)] bg-[var(--surface)] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border2)]">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-[#007ACC]/10 border border-[#007ACC]/20">
                  <svg width="20" height="20" viewBox="0 0 100 100" fill="none">
                    <path d="M71.6 99.1l22.8-11.1c3.4-1.7 5.6-5.1 5.6-8.9V20.9c0-3.8-2.2-7.3-5.6-8.9L71.6.9c-4.3-2.1-9.3-.5-11.8 2.8L27.5 33.5 11.3 21.2c-2.4-1.8-5.8-1.6-7.9.5L.6 24.5c-2.4 2.4-.8 6.5 2.5 6.5h.1l20.3 15.8L3.2 62.6h-.1c-3.3 0-4.9 4.1-2.5 6.5l2.8 2.8c2.1 2.1 5.5 2.3 7.9.5L27.5 60l32.3 29.7c1.8 2.4 4.8 3.6 7.8 3.6 1.3 0 2.7-.3 4-1zM71.6 27.8L44.9 46.8l26.7 19v-38z" fill="#007ACC"/>
                  </svg>
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text)]">IDE & Local Editor Sync</h3>
                  <p className="text-[11px] text-[var(--muted2)]">Rex code changes are reflected in real time</p>
                </div>
              </div>
              <button
                onClick={() => setVsCodeModalOpen(false)}
                className="w-7 h-7 rounded-lg border border-[var(--border2)] bg-[var(--surface2)] text-[var(--muted2)] hover:text-[var(--text)] flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-[11px] font-medium text-[var(--muted2)]">Workspace Path</label>
                <div className="mt-1 flex items-center gap-2 p-2 rounded-lg bg-[var(--input)] border border-[var(--border2)] font-mono text-[11px] text-[var(--text)]">
                  <span className="truncate flex-1">{vsCodeDetails.targetPath || activeProject?.path || "Current Workspace"}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(vsCodeDetails.targetPath || activeProject?.path || "");
                      setVsCodeDetails((prev) => ({ ...prev, copied: true }));
                      setTimeout(() => setVsCodeDetails((prev) => ({ ...prev, copied: false })), 2000);
                    }}
                    className="px-2 py-1 bg-[var(--surface2)] hover:bg-[var(--border2)] text-[10px] rounded border border-[var(--border2)] text-[var(--text3)] flex-shrink-0"
                  >
                    {vsCodeDetails.copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-[var(--muted2)]">Launch Directly in Your Editor</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <a
                    href={vsCodeDetails.vscodeUri || `vscode://file/${activeProject?.path || ""}`}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-[var(--border2)] bg-[var(--surface2)] hover:border-[#007ACC] hover:bg-[#007ACC]/10 transition-all text-center group"
                  >
                    <span className="text-xs font-semibold text-[var(--text)] group-hover:text-[#007ACC]">VS Code</span>
                    <span className="text-[9px] text-[var(--muted)] mt-0.5">Desktop app</span>
                  </a>
                  <a
                    href={vsCodeDetails.cursorUri || `cursor://file/${activeProject?.path || ""}`}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-[var(--border2)] bg-[var(--surface2)] hover:border-[#7c3aed] hover:bg-[#7c3aed]/10 transition-all text-center group"
                  >
                    <span className="text-xs font-semibold text-[var(--text)] group-hover:text-[#a78bfa]">Cursor</span>
                    <span className="text-[9px] text-[var(--muted)] mt-0.5">AI Editor</span>
                  </a>
                  <a
                    href={vsCodeDetails.windsurfUri || `windsurf://file/${activeProject?.path || ""}`}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-[var(--border2)] bg-[var(--surface2)] hover:border-[#06b6d4] hover:bg-[#06b6d4]/10 transition-all text-center group"
                  >
                    <span className="text-xs font-semibold text-[var(--text)] group-hover:text-[#22d3ee]">Windsurf</span>
                    <span className="text-[9px] text-[var(--muted)] mt-0.5">Codeium</span>
                  </a>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border2)] text-[11px] text-[var(--muted2)] space-y-1.5 leading-relaxed">
                <div className="flex items-center gap-1.5 font-medium text-[var(--text)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                  Two-Way Real-Time Synchronization
                </div>
                <p>
                  Any files created or edited by Rex in this session are written directly to your connected project files. When opened in VS Code, file changes reload automatically.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setVsCodeModalOpen(false)}
                  className="px-4 py-2 bg-[var(--midnight)] text-white text-xs font-medium rounded-lg hover:bg-[var(--steel)] transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connect Project & Workspace Modal */}
      <ConnectProjectModal
        isOpen={connectProjectModalOpen}
        onClose={() => setConnectProjectModalOpen(false)}
        onSelectProject={handleSelectProjectFromModal}
        onDisconnectProject={handleDisconnectProject}
        currentProjectPath={activeProject?.path}
        sessionId={activeSession || undefined}
      />
    </div>
  );
}
