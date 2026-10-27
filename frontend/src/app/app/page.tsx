"use client";

export const dynamic = "force-dynamic";

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
import { useAudioPlayer, unlockAudioPlayback } from "@/hooks/useAudioPlayer";
import { useAuth } from "@/lib/auth-context";
import type { ServerMessage } from "@/lib/ws-protocol";
import { primeSpeechSynthesis, speakHumanizedText, playActiveListeningHum } from "@/lib/voice-synthesizer";
import { detectEmotionFromContext, getEmotionStateMeta, type EmotionTone } from "@/lib/emotion-detector";
import {
  isPlaceholderOrBadSessionName,
  resolveSemanticSessionName,
  isBuildTerminationCommand,
  formatBuildTerminationMessage,
  isBareSilenceCommand,
  extractUserInterruptFromBuffer,
} from "@/lib/project-spec";
import {
  syncSessionFilesToLocalDisk,
  saveSessionFilesToCache,
  getSessionFilesFromCache,
} from "@/lib/local-fs-sync";
import {
  loadUserProfile,
  saveUserProfile,
  getCanonicalUserKey,
  getVoiceStorageKey,
  personalizeGreetingWithUsername,
  DEFAULT_USER_PROFILE,
  type UserProfile,
} from "@/lib/user-profile";
import { normalizeSpokenTranscript } from "@/lib/speech-normalizer";

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
const STOP_SINGLE = ["stop", "wait", "cancel", "pause", "quiet", "enough", "shush", "hush", "silence", "withdraw", "abort", "terminate"];
const STOP_PHRASES = [
  "stop rex",
  "pause rex",
  "rex stop",
  "rex pause",
  "wait rex",
  "rex wait",
  "hold on rex",
  "stop it",
  "stop building",
  "stop coding",
  "stop working",
  "stop talking",
  "stop speaking",
  "stop listening",
  "terminate the build",
  "terminate building",
  "hold on",
  "hang on",
  "shut up",
  "be quiet",
  "never mind",
  "nevermind",
  "knock it off",
  "that's enough",
  "thats enough",
  "don't build",
  "do not build",
  "don't want to work on",
  "do not want to work on",
  "cancel that",
  "cancel the build",
  "withdraw that",
  "withdraw the request",
  "i have something else to add",
  "let me add",
  "but i think",
  "but i want",
  "actually i",
  "instead of that",
];
function isStopPhrase(lower: string): boolean {
  const trimmed = lower.trim();
  if (!trimmed) return false;
  if (isBareSilenceCommand(trimmed) || isBuildTerminationCommand(trimmed, true)) return true;
  if (extractUserInterruptFromBuffer(trimmed).matched) return true;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length <= 8 && words.some((w) => STOP_SINGLE.includes(w))) return true;
  if (STOP_PHRASES.some((p) => trimmed.includes(p))) return true;
  if (/^(?:(?:hey\s+rex|hi\s+rex|rex|ok|okay|no|please)\s*,?\s*)*(stop|pause|wait|hold\s+on|hang\s+on|cancel|never\s*mind|terminate|don'?t\s+build|withdraw|shut\s+up|be\s+quiet)\b/i.test(trimmed)) {
    return true;
  }
  return false;
}

function isPureBareStop(lower: string): boolean {
  return isBareSilenceCommand(lower);
}

interface FastPathResponse {
  reply: string;
  spoken: string;
  action?: "preview" | "code" | "chat" | "clear" | "stop";
  emotion?: "warm" | "upbeat" | "calm" | "empathetic";
}

function checkClientFastPath(rawText: string, username?: string): FastPathResponse | null {
  const normalizedInput = normalizeSpokenTranscript(rawText, { isInterim: false });
  const t = normalizedInput.trim().toLowerCase().replace(/[,!?;:.]/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return null;

  // Instant greetings ("Rex", "Hey Rex", "Hi", "Hey", "Hello", "Good morning", etc.)
  if (
    /^(rex|he|hey|hi|hello|yo|howdy|good morning|good afternoon|good evening)$/i.test(t) ||
    /^(he|hey|hi|hello|yo|ok|okay|oh|sup|dear|good morning|good afternoon|good evening)\s+(rex|there|friend|mate|buddy)$/i.test(t)
  ) {
    const personalized = personalizeGreetingWithUsername(
      "Hi! I am good, what about you?",
      "Hi! I am good, what about you?",
      username
    );
    return {
      reply: personalized.reply,
      spoken: personalized.spoken,
      emotion: "warm",
    };
  }

  // "What's up" / "What are you doing" / "Wassup"
  if (
    /^(hey|hi|hello|yo)?\s*(rex\s+)?(what('s|s)?\s+up|whats\s+up|sup|wassup|what('s|s)?\s+good|what\s+are\s+you\s+doing|what\s+you\s+doing)\s*(rex|today|right now)?$/i.test(
      t
    )
  ) {
    const personalized = personalizeGreetingWithUsername(
      "Hi! I am good, just right here and ready to chat or build with you. What about you?",
      "Hi! I am good, just right here and ready to chat or build with you. What about you?",
      username
    );
    return {
      reply: personalized.reply,
      spoken: personalized.spoken,
      emotion: "warm",
    };
  }

  // "How are you" / "How's it going"
  if (
    /^(hey|hi|hello|yo)?\s*(rex\s+)?(how\s+are\s+you|how\s+are\s+you\s+doing|how('s|s)\s+it\s+going|how\s+is\s+it\s+going|how('s|s)\s+your\s+day|how\s+are\s+things)\s*(rex|today)?$/i.test(
      t
    )
  ) {
    const personalized = personalizeGreetingWithUsername(
      "Hi! I am good, thank you for asking! What about you? How's everything going with you today?",
      "Hi! I am good, thank you for asking! What about you? How's everything going with you today?",
      username
    );
    return {
      reply: personalized.reply,
      spoken: personalized.spoken,
      emotion: "warm",
    };
  }

  // Quick user status replies ("I'm good", "Doing great", "Not much")
  if (
    /^(i'm\s+good|i\s+am\s+good|doing\s+good|i'm\s+doing\s+good|doing\s+great|i'm\s+great|pretty\s+good|all\s+good|not\s+much|nothing\s+much)(\s+thanks|\s+thank\s+you|\s+too)?$/i.test(
      t
    )
  ) {
    const personalized = personalizeGreetingWithUsername(
      "Glad to hear that! What's on your mind today?",
      "Glad to hear that! What's on your mind today?",
      username
    );
    return {
      reply: personalized.reply,
      spoken: personalized.spoken,
      emotion: "upbeat",
    };
  }

  // Status / Health check
  if (/^(status|system status|health|are you ready|ping)$/i.test(t)) {
    return {
      reply: "All systems active and fully responsive. Ready whenever you are!",
      spoken: "All systems active and fully responsive. Ready whenever you are!",
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

  // Never intercept build termination commands in fast-path so useWebSocket handles them with full build abort & confirmation
  if (isBuildTerminationCommand(t, false)) {
    return null;
  }

  if (isBareSilenceCommand(t)) {
    return {
      reply: "Stopped active execution.",
      spoken: "",
      action: "stop",
      emotion: "calm",
    };
  }

  return null;
}

/**
 * Detects if a captured microphone transcript is an acoustic echo of Rex's
 * own voice output that was picked up by the user's microphone.
 * Uses contiguous phrase / n-gram matching (never unordered bag-of-words) and
 * never suppresses explicit user interruption, stop, or build-termination commands.
 */
function checkIsSelfEcho(
  userText: string,
  recentAiUtterances: Array<{ text: string; time: number }>,
  isRexSpeakingNow = false
): boolean {
  if (!userText.trim()) return false;
  const cleanInput = userText.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleanInput) return false;

  // Never block an explicit stop, pause, build-termination, continuation, redirect, or wake-word greeting
  if (
    isStopPhrase(cleanInput) ||
    /^(?:hey|hi|hello|yo|ok|okay|oh|sup|dear)?\s*rex$/i.test(cleanInput)
  ) {
    return false;
  }

  const inputWords = cleanInput.split(/\s+/).filter((w) => w.length > 1);
  if (inputWords.length === 0) return false;

  // Only exempt specific conversational user request/barge-in openers (never general words like "as", "well", "but", "we", "i actually" that Rex speaks in his own replies)
  const startsWithExplicitUserOpener =
    /^(can\s+you|could\s+you|would\s+you|will\s+you|what\s+if|what\s+about|how\s+can|how\s+do|tell\s+me|show\s+me|let\s+me|i\s+want|i\s+need|i\s+don'?t|i\s+do\s+not|no\s+i|no\s+rex|wait\s+a|hold\s+on)\b/i.test(
      cleanInput
    );
  if (startsWithExplicitUserOpener && inputWords.length < 4) {
    return false;
  }

  const now = Date.now();
  const maxAgeMs = isRexSpeakingNow ? 60000 : 25000;

  // Words that a user legitimately says as a 1-word reply or wake command (never treat as echo unless Rex is mid-sentence)
  const legitimateSingleWordUserReplies = new Set([
    "rex",
    "hey",
    "hi",
    "hello",
    "stop",
    "pause",
    "wait",
    "cancel",
    "yes",
    "yeah",
    "yep",
    "no",
    "nope",
    "okay",
    "ok",
    "sure",
  ]);

  for (const { text: aiText, time } of recentAiUtterances) {
    const ageMs = now - time;
    if (ageMs > maxAgeMs) continue;
    const cleanAi = aiText.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
    if (!cleanAi) continue;
    const aiWordsSet = new Set(cleanAi.split(/\s+/).filter((w) => w.length > 1));

    // 0. 1-word or 2-word speaker echo check (e.g. "Looking", "Absolutely", "into today" picked up from Rex's own speech):
    // Only match 2-word fragments when they appear as a contiguous phrase in Rex's speech (never unordered bag-of-words,
    // which previously misclassified the first 2 words of a user's barge-in sentence as echo!).
    if ((isRexSpeakingNow || ageMs < 10000) && inputWords.length <= 2 && !startsWithExplicitUserOpener) {
      if (inputWords.length === 1) {
        const w = inputWords[0];
        if (!legitimateSingleWordUserReplies.has(w) && aiWordsSet.has(w) && w.length >= 4) {
          return true;
        }
        if (aiWordsSet.has(w) && (isRexSpeakingNow || ageMs < 6000) && w.length >= 6) {
          return true;
        }
      } else if (inputWords.length === 2) {
        if (cleanAi.includes(cleanInput)) {
          return true;
        }
      }
    }

    // 1. Direct contiguous substring check:
    if (isRexSpeakingNow && !startsWithExplicitUserOpener && inputWords.length >= 2 && cleanInput.length >= 6 && cleanAi.includes(cleanInput)) {
      return true;
    }
    if (
      (inputWords.length >= 3 || (inputWords.length >= 2 && !startsWithExplicitUserOpener && cleanInput.length >= 8)) &&
      cleanAi.includes(cleanInput)
    ) {
      return true;
    }

    // 2. Contiguous 2-word bigram overlap check (catches phonetic ASR mishearings like "Typing into today" from Rex's "diving into today"):
    if (inputWords.length >= 3 && !startsWithExplicitUserOpener) {
      let matchingBigrams = 0;
      const totalBigrams = inputWords.length - 1;
      for (let i = 0; i < totalBigrams; i++) {
        const bigram = `${inputWords[i]} ${inputWords[i + 1]}`;
        if (cleanAi.includes(bigram)) {
          matchingBigrams++;
        }
      }
      if (
        matchingBigrams / totalBigrams >= 0.65 ||
        ((isRexSpeakingNow || ageMs < 8000) && inputWords.length <= 4 && matchingBigrams >= 1)
      ) {
        return true;
      }

      // 3. High-confidence word-level overlap check for 3-5 word fragments during Rex's speech:
      if ((isRexSpeakingNow || ageMs < 8000) && inputWords.length <= 5) {
        let matchingWords = 0;
        for (const w of inputWords) {
          if (aiWordsSet.has(w)) matchingWords++;
        }
        if (matchingWords / inputWords.length >= 0.8) {
          return true;
        }
      }
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
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [rightPanelWidth, setRightPanelWidth] = useState(420);

  const handleResizeRightPanel = useCallback(
    (dx: number) => {
      setRightPanelWidth((w) => {
        const windowW = typeof window !== "undefined" ? window.innerWidth : 1280;
        const currentSidebarW = sidebarCollapsed ? 0 : sidebarWidth;
        // Never allow right panel to crush center column below 360px
        const maxAllowed = Math.max(280, Math.min(720, windowW - currentSidebarW - 360));
        return clamp(w - dx, 280, maxAllowed);
      });
    },
    [sidebarCollapsed, sidebarWidth]
  );

  useEffect(() => {
    try {
      const s = localStorage.getItem("vyrexo_sidebar_w");
      const r = localStorage.getItem("vyrexo_rightpanel_w");
      const windowW = typeof window !== "undefined" ? window.innerWidth : 1280;
      if (s) setSidebarWidth(clamp(parseInt(s), 180, 520));
      if (r) {
        const maxAllowed = Math.max(280, Math.min(720, windowW - 260 - 360));
        setRightPanelWidth(clamp(parseInt(r), 280, maxAllowed));
      }
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
  const [activeEmotion, setActiveEmotion] = useState<EmotionTone>("warm");
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
    vscodeInsidersUri?: string;
    workspaceUri?: string;
    cursorWorkspaceUri?: string;
    windsurfWorkspaceUri?: string;
    copied?: boolean;
    source?: string;
    message?: string;
    projectName?: string;
    filesCount?: number;
    files?: Array<{ path: string; content: string; size?: number }>;
    requiresLocalSync?: boolean;
    syncPackageUrl?: string;
    downloadUrl?: string;
    vscodeServerUrl?: string;
    savedLocally?: string;
    localFolderName?: string;
    projectSlug?: string;
    bridgeConnected?: boolean;
    bridgeCmdCopied?: boolean;
  }>({});
  const [launchingIde, setLaunchingIde] = useState<string | null>(null);
  const [savingLocalFolder, setSavingLocalFolder] = useState(false);
  const [ideTargetPathInput, setIdeTargetPathInput] = useState<string>("");
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  // ── User Profile & Rex Personalization ──────────────────────
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const canonicalUserKey = useMemo(
    () => getCanonicalUserKey(user, user?.email) || user?.id || "",
    [user]
  );

  useEffect(() => {
    if (!user) return;
    const canonical = getCanonicalUserKey(user, user.email) || user.id;
    const loaded = loadUserProfile(canonical, user);
    setUserProfile(loaded);

    const emailQuery = user.email ? `&email=${encodeURIComponent(user.email.toLowerCase())}` : "";
    fetch(`/api/profile?user_id=${encodeURIComponent(canonical)}${emailQuery}`, {
      headers: {
        "x-user-id": canonical,
        ...(user.email ? { "x-user-email": user.email.toLowerCase() } : {}),
      },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && d.profile) {
          const srv = d.profile as Partial<UserProfile>;
          const srvOwner = (srv.ownerEmail || "").trim().toLowerCase();
          if (srvOwner && canonical.includes("@") && srvOwner !== canonical) {
            return;
          }
          if (
            canonical === "sanginitripathi8@gmail.com" &&
            typeof srv.username === "string" &&
            srv.username.trim().toLowerCase() === "babe"
          ) {
            return;
          }
          const localTs = loaded.updatedAt ? new Date(loaded.updatedAt).getTime() : 0;
          const srvTs = srv.updatedAt ? new Date(srv.updatedAt).getTime() : 0;
          const localHasData = Boolean(
            loaded.username ||
              loaded.fullName ||
              loaded.occupation ||
              loaded.aboutUserInstructions ||
              loaded.responseStyleInstructions
          );
          if (localHasData && localTs >= srvTs) {
            return;
          }
          if (
            srv.username ||
            srv.fullName ||
            srv.occupation ||
            srv.aboutUserInstructions ||
            srv.responseStyleInstructions ||
            srv.age ||
            srv.dateOfBirth ||
            srv.gender
          ) {
            const emailPrefix = user.email ? user.email.split("@")[0].trim() : "";
            const rawSrvFullName = (srv.fullName || loaded.fullName || "").trim();
            const cleanFullName =
              rawSrvFullName && rawSrvFullName.toLowerCase() !== emailPrefix.toLowerCase()
                ? rawSrvFullName
                : "";
            const merged = saveUserProfile(
              {
                username: srv.username || loaded.username || "",
                fullName: cleanFullName,
                occupation: srv.occupation || loaded.occupation || "",
                age: srv.age || loaded.age || "",
                dateOfBirth: srv.dateOfBirth || loaded.dateOfBirth || "",
                gender: srv.gender || loaded.gender || "",
                aboutUserInstructions:
                  srv.aboutUserInstructions || loaded.aboutUserInstructions || "",
                responseStyleInstructions:
                  srv.responseStyleInstructions || loaded.responseStyleInstructions || "",
                ownerEmail: canonical.includes("@") ? canonical : undefined,
              },
              canonical,
              user.email
            );
            setUserProfile(merged);
          }
        }
      })
      .catch(() => {});

    const onProfileUpdated = () => {
      setUserProfile(loadUserProfile(canonical, user));
    };
    window.addEventListener("vyrexo-profile-updated", onProfileUpdated);
    window.addEventListener("storage", onProfileUpdated);
    return () => {
      window.removeEventListener("vyrexo-profile-updated", onProfileUpdated);
      window.removeEventListener("storage", onProfileUpdated);
    };
  }, [user]);

  // ── Sessions (persisted + renamable, strictly scoped per user email primary key) ──────────────
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const loadedUserIdRef = useRef<string | null>(null);

  const isBlockedSessionId = useCallback((id?: string | null): boolean => {
    if (!id) return true;
    const trimmed = id.trim();
    return (
      !trimmed ||
      trimmed === "default" ||
      trimmed === "session-default-1" ||
      trimmed === "session-default-2" ||
      trimmed === "session-1790005321834"
    );
  }, []);

  const userStorageKeys = useMemo(() => {
    const uid = canonicalUserKey;
    return {
      sessions: uid ? `vyrexo_sessions_${uid}` : "",
      activeSession: uid ? `vyrexo_active_session_${uid}` : "",
      sessionProjects: uid ? `vyrexo_session_projects_${uid}` : "",
      chatHistory: (sessionId: string) => (uid ? `vyrexo_chat_history_${uid}_${sessionId}` : ""),
    };
  }, [canonicalUserKey]);

  // Reset all in-memory state when the authenticated user changes or signs out,
  // and purge legacy unscoped keys so one user's sessions never leak to another user.
  useEffect(() => {
    try {
      localStorage.removeItem("vyrexo_sessions");
      localStorage.removeItem("vyrexo_active_session");
      localStorage.removeItem("vyrexo_session_projects");
      localStorage.removeItem("vyrexo_chat_history_session-1790005321834");
      localStorage.removeItem("vyrexo_chat_history_session-default-1");
      localStorage.removeItem("vyrexo_chat_history_session-default-2");
    } catch {}

    const currentUid = canonicalUserKey || null;
    if (loadedUserIdRef.current !== currentUid) {
      loadedUserIdRef.current = currentUid;
      setSessions([]);
      setSessionsLoaded(false);
      setActiveSession(null);
      setActiveProject(null);
      activeProjectRef.current = null;
      setProjectBound(false);
      sentProjectPathRef.current = "";
      setChatLog([]);
      setCodeEvents([]);
      setPreviewUrl("");
      sessionPreviewsRef.current = {};
      sessionProjectsRef.current = {};
    }
  }, [canonicalUserKey]);

  // Load the sidebar list from the DB (strictly scoped to the logged-in user's canonical email primary key).
  // For a brand-new user with no created sessions, the sidebar remains completely empty.
  useEffect(() => {
    if (!canonicalUserKey || sessionsLoaded) return;
    let cancelled = false;
    const uid = canonicalUserKey;
    const rawUserId = user?.id || uid;
    const userEmail = user?.email ? user.email.toLowerCase() : "";
    const sessionsKey = `vyrexo_sessions_${uid}`;
    const legacySessionsKey = rawUserId !== uid ? `vyrexo_sessions_${rawUserId}` : "";
    const projectsKey = `vyrexo_session_projects_${uid}`;

    const isSameOwner = (ownerId?: string): boolean => {
      if (!ownerId) return true;
      const lower = ownerId.toLowerCase();
      if (lower === uid.toLowerCase() || lower === rawUserId.toLowerCase()) return true;
      if (
        uid === "sanginitripathi8@gmail.com" &&
        lower === "b636edec-74a0-4961-8521-887fd8a90c69"
      ) {
        return true;
      }
      return false;
    };

    const readLocal = (): StoredSession[] => {
      try {
        const rawPrimary = localStorage.getItem(sessionsKey);
        const rawLegacy = legacySessionsKey ? localStorage.getItem(legacySessionsKey) : null;
        const p1 = rawPrimary ? JSON.parse(rawPrimary) : [];
        const p2 = rawLegacy ? JSON.parse(rawLegacy) : [];
        const combined = [
          ...(Array.isArray(p1) ? p1 : []),
          ...(Array.isArray(p2) ? p2 : []),
        ];
        const seen = new Set<string>();
        return combined.filter((item) => {
          if (!item?.id || seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
      } catch {
        return [];
      }
    };
    const healSessionRecord = (s: { id: string; name?: string; icon?: string; createdAt?: number }): StoredSession => {
      let localProjTitle: string | undefined;
      let localTurns: Array<{ role?: string; text?: string; content?: string }> = [];
      try {
        const projMap = JSON.parse(localStorage.getItem(projectsKey) || "{}");
        if (projMap[s.id]?.name && projMap[s.id].name !== "vyrexo-workspace") {
          localProjTitle = projMap[s.id].name;
        }
      } catch {}
      try {
        const rawTurns =
          localStorage.getItem(`vyrexo_chat_history_${uid}_${s.id}`) ||
          (rawUserId !== uid ? localStorage.getItem(`vyrexo_chat_history_${rawUserId}_${s.id}`) : null);
        if (rawTurns) {
          const parsed = JSON.parse(rawTurns);
          if (Array.isArray(parsed)) localTurns = parsed;
        }
      } catch {}

      const rawName = s.name || "New Session";
      const semanticName =
        rawName === "New Session" && !localProjTitle && localTurns.length <= 1
          ? "New Session"
          : resolveSemanticSessionName(rawName, s.id, localProjTitle, localTurns);
      const icon =
        /rail|train/i.test(semanticName) && (!s.icon || s.icon === SESSION_ICONS[0])
          ? "🚆"
          : s.icon || SESSION_ICONS[0];
      return {
        id: s.id,
        name: semanticName,
        icon,
        createdAt: getSessionTimestamp(s),
      };
    };

    (async () => {
      const local = readLocal()
        .filter((s) => s?.id && !isBlockedSessionId(s.id) && (!("user_id" in s) || isSameOwner((s as any).user_id)))
        .map((s) => healSessionRecord(s));
      let dbList: StoredSession[] | null = null;
      const emailParam = userEmail ? `&email=${encodeURIComponent(userEmail)}` : "";
      const reqHeaders: Record<string, string> = {
        "x-user-id": uid,
        ...(userEmail ? { "x-user-email": userEmail } : {}),
      };
      try {
        const r = await fetch(`/api/sessions?user_id=${encodeURIComponent(uid)}${emailParam}`, {
          headers: reqHeaders,
        });
        const d = await r.json();
        if (d?.ok && Array.isArray(d.sessions)) {
          dbList = d.sessions
            .filter(
              (s: { id: string; user_id?: string }) =>
                s?.id && !isBlockedSessionId(s.id) && isSameOwner(s.user_id)
            )
            .map((s: { id: string; name?: string; icon?: string; createdAt?: number }) => healSessionRecord(s));
        }
      } catch {
        /* DB down — fall back below */
      }
      if (cancelled) return;

      if (dbList === null) {
        setSessions(local);
        setSessionsLoaded(true);
        return;
      }

      // Sync only sessions explicitly stored under this user's scoped key
      const dbMap = new Map(dbList.map((s) => [s.id, s]));
      const toMigrate: StoredSession[] = [];
      for (const s of local) {
        const existingDb = dbMap.get(s.id);
        if (!existingDb) {
          try {
            const res = await fetch("/api/sessions", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...reqHeaders },
              body: JSON.stringify({
                id: s.id,
                user_id: uid,
                email: userEmail || undefined,
                name: s.name,
                icon: s.icon,
                createdAt: s.createdAt,
                forceRename: true,
              }),
            });
            if (res.ok) {
              toMigrate.push(s);
            }
          } catch {}
        } else if (isPlaceholderOrBadSessionName(existingDb.name) && !isPlaceholderOrBadSessionName(s.name)) {
          dbMap.set(s.id, { ...existingDb, name: s.name, icon: s.icon });
          try {
            await fetch("/api/sessions", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...reqHeaders },
              body: JSON.stringify({
                id: s.id,
                user_id: uid,
                email: userEmail || undefined,
                name: s.name,
                icon: s.icon,
                createdAt: s.createdAt,
                forceRename: true,
              }),
            });
          } catch {}
        }
      }
      const merged = [...toMigrate, ...Array.from(dbMap.values())].sort(
        (a, b) => getSessionTimestamp(b) - getSessionTimestamp(a)
      );
      if (cancelled) return;
      setSessions(merged);
      setSessionsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [canonicalUserKey, user?.id, user?.email, sessionsLoaded, isBlockedSessionId]);

  useEffect(() => {
    if (sessionsLoaded && userStorageKeys.sessions) {
      try {
        localStorage.setItem(userStorageKeys.sessions, JSON.stringify(sessions));
      } catch {}
    }
  }, [sessions, sessionsLoaded, userStorageKeys.sessions]);

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
  const activeProjectRef = useRef<{
    path: string;
    name: string;
    summary?: string;
    filesCount?: number;
    techStack?: string[];
    source?: string;
  } | null>(null);
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
  const lastBuildInterruptedTimeRef = useRef(0);
  const isSynthesizingVoiceRef = useRef(false);
  const recordAiSpeech = useCallback((text: string) => {
    if (!text || !text.trim()) return;
    recentAiSpeechRef.current = [
      { text: text.trim(), time: Date.now() },
      ...recentAiSpeechRef.current.filter((item) => Date.now() - item.time < 60000),
    ].slice(0, 15);
  }, []);

  // The orb must reflect REALITY: drive it off actual playback.
  // When audio stops, drop back to the resting state (thinking if active build, listening if mic live, otherwise idle).
  const wasPlayingRef = useRef(false);
  // Mirrors "is the mic live" (voiceMode is declared further down, so a ref keeps
  // this effect independent of declaration order).
  const voiceListeningRef = useRef(false);
  const lastSpokenBargeInTimeRef = useRef(0);
  useEffect(() => {
    if (audioIsPlaying && !audioMutedRef.current) {
      wasPlayingRef.current = true;
      lastSpokenBargeInTimeRef.current = 0;
      if (recentAiSpeechRef.current.length > 0) {
        recentAiSpeechRef.current[0].time = Date.now();
      }
      setOrbState("speaking");
      return;
    }
    if (!wasPlayingRef.current) return; // never started; nothing to reset
    const t = setTimeout(() => {
      if (isPlayingRef.current || isSynthesizingVoiceRef.current) return; // next utterance already started or preparing
      wasPlayingRef.current = false;
      if (voiceListeningRef.current && Date.now() - lastSpokenBargeInTimeRef.current < 5000) {
        // User barged in — stay in LISTENING mode so we capture their entire spoken response!
        setOrbState("listening");
        return;
      }
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
  const unifiedVoiceAbortRef = useRef<AbortController | null>(null);
  const pauseToWakeWordRef = useRef<() => void>(() => {});
  const muteAudio = useCallback(() => {
    audioMutedRef.current = true;
    if (unifiedVoiceAbortRef.current) {
      try {
        unifiedVoiceAbortRef.current.abort();
      } catch {}
      unifiedVoiceAbortRef.current = null;
    }
    isSynthesizingVoiceRef.current = false;
    wasPlayingRef.current = false;
    isPlayingRef.current = false;
    speakingRef.current = false;
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
    if (isBuildingRef.current || isSynthesizingVoiceRef.current) {
      setOrbState("thinking");
    } else if (!isPlayingRef.current) {
      setOrbState((prev) => (prev === "thinking" ? (voiceListeningRef.current ? "listening" : "idle") : prev));
    }
    if (!isBuildingRef.current) {
      const isLongText = text.length > 180 || text.includes("\n");
      if (isLongText) {
        const firstLine = text.replace(/^[#*>\-\s]+/, "").split("\n")[0].slice(0, 140);
        setNarration(firstLine || "Speaking...");
        setActiveRightTab("chat");
      } else {
        setNarration(text);
      }
    }
  }, []);

  const clearPendingRex = useCallback(() => {
    if (pendingRexTimerRef.current) {
      clearTimeout(pendingRexTimerRef.current);
      pendingRexTimerRef.current = null;
    }
    pendingRexRef.current = null;
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
    // Strictly isolate events to the session they belong to so background builds or replies
    // from a previous session can NEVER leak into a newly opened chat session!
    if (
      msg.session_id &&
      activeSessionRef.current &&
      msg.session_id !== activeSessionRef.current &&
      msg.type !== "session.renamed"
    ) {
      return;
    }

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

      case "voice.output.preparing":
        isSynthesizingVoiceRef.current = true;
        if (msg.payload?.emotion) {
          setActiveEmotion(msg.payload.emotion as EmotionTone);
        }
        break;

      case "voice.output.start":
      case "voice.output.started": {
        isSynthesizingVoiceRef.current = false;
        unmuteAudio();
        const fallbackSpokenText = (msg.payload?.text as string) || pendingRexRef.current || "";
        const fallbackEmotion = (msg.payload?.emotion as EmotionTone) || "warm";
        const isBrowserFallback = Boolean(msg.payload?.browserFallback);
        if (!isBrowserFallback) {
          beginUtterance(() => {
            if (fallbackSpokenText && !audioMutedRef.current) {
              setOrbState("speaking");
              speakHumanizedText(
                fallbackSpokenText,
                { voice: "adam", speed: "normal", emotion: fallbackEmotion },
                {
                  onStart: () => setOrbState("speaking"),
                  onEnd: () => {
                    lastRexSpeechEndTimeRef.current = Date.now();
                    setOrbState(
                      isBuildingRef.current
                        ? "thinking"
                        : voiceListeningRef.current
                        ? "listening"
                        : "idle"
                    );
                  },
                }
              );
            }
          });
        }
        flushPendingRex(); // reveal Rex's text exactly as his voice begins
        setOrbState("speaking");
        if (msg.payload?.emotion) {
          setActiveEmotion(msg.payload.emotion as EmotionTone);
        }
        break;
      }

      case "voice.output.end":
      case "voice.output.completed":
        isSynthesizingVoiceRef.current = false;
        if (msg.payload?.browserFallback) {
          lastRexSpeechEndTimeRef.current = Date.now();
          setOrbState((prev) => {
            if (isBuildingRef.current) return "thinking";
            return prev === "speaking" ? (voiceListeningRef.current ? "listening" : "idle") : prev;
          });
        } else {
          endUtterance();
        }
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
        // if no audio stream arrives within 3.5s. Full text → Chat tab.
        const responseText = (msg.payload.text as string) || "";
        if (responseText.trim()) {
          recordAiSpeech(responseText);
          flushPendingRex(); // show any earlier pending reply first
          pendingRexRef.current = responseText;
          pendingRexTimerRef.current = setTimeout(flushPendingRex, 3500);
        }
        break;
      }

      case "session.renamed": {
        const newName = (msg.payload.name as string)?.trim();
        const targetId = (msg.payload.id as string) || activeSession;
        if (newName && targetId && !isPlaceholderOrBadSessionName(newName)) {
          setSessions((prev) =>
            prev.map((s) => {
              if (s.id === targetId) {
                // Only keep existing name if it is already a valid semantic name
                if (s.name && !isPlaceholderOrBadSessionName(s.name)) {
                  return s;
                }
                return { ...s, name: newName };
              }
              return s;
            })
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
            status: (s.status === "completed" || s.status === "running" ? s.status : "pending") as "pending" | "running" | "completed",
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
        const filePath = msg.payload.path as string | undefined;
        const fileContent = msg.payload.content as string | undefined;
        queueCodeEvent({
          kind: "action",
          agent: msg.payload.agent as string,
          tool: msg.payload.tool as string,
          category: msg.payload.category as string,
          path: filePath,
          command: msg.payload.command as string,
          message: msg.payload.message as string,
          content: fileContent,
          oldContent: msg.payload.old_content as string,
        });

        // Real-time local disk write-back & client cache persistence
        if (filePath && typeof fileContent === "string" && typeof window !== "undefined") {
          const curSess = activeSessionRef.current || "default";
          const proj = activeProjectRef.current;
          const folderName =
            proj?.path?.replace(/[\\/]+$/, "").split(/[\\/]/).pop() ||
            proj?.name ||
            "amaze";
          saveSessionFilesToCache(
            curSess,
            [{ path: filePath, content: fileContent }],
            {
              projectName: proj?.name,
              localFolderName: folderName,
              targetPath: proj?.path,
            }
          );
          syncSessionFilesToLocalDisk({
            sessionId: curSess,
            folderName,
            targetPath: proj?.path || `C:\\Users\\hp\\OneDrive\\Desktop\\${folderName}`,
            files: [{ path: filePath, content: fileContent }],
            promptIfMissing: false,
          }).catch(() => {});
        }
        break;
      }

      case "execution.output": {
        const out = (msg.payload.output as string) || (msg.payload.text as string) || "";
        if (out) queueCodeEvent({ kind: "output", text: out });
        break;
      }

      case "project.loaded": {
        if (msg.payload.ok !== false) {
          const prevProj = activeProjectRef.current;
          const incomingName = (msg.payload.name as string) || "";
          const validIncomingName =
            incomingName &&
            incomingName !== "project" &&
            incomingName !== "vyrexo-workspace" &&
            !/^session-\d+$/i.test(incomingName)
              ? incomingName
              : "";
          const name = validIncomingName || prevProj?.name || "Project Workspace";
          const rawPath = (msg.payload.path as string) || "";
          const isBadContainerPath =
            !rawPath ||
            rawPath === "." ||
            rawPath.startsWith("/app/applet") ||
            rawPath.startsWith("/workspaces/") ||
            rawPath.startsWith("/local/");
          const prevCleanPath =
            prevProj?.path &&
            prevProj.path !== "." &&
            !prevProj.path.startsWith("/app/applet") &&
            !prevProj.path.startsWith("/workspaces/") &&
            !prevProj.path.startsWith("/local/")
              ? prevProj.path
              : "";
          const slug =
            name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "") || "vyrexo-project";
          const path = !isBadContainerPath
            ? rawPath
            : prevCleanPath || `~/VyrexoWorkspaces/${slug}`;
          const files =
            (msg.payload.files_indexed as number) ??
            (msg.payload.files_count as number) ??
            prevProj?.filesCount ??
            0;
          const proj = {
            ...prevProj,
            path,
            name,
            filesCount: files,
          };
          setActiveProject(proj);
          activeProjectRef.current = proj;
          setProjectBound(true);
          if (activeSession && userStorageKeys.sessionProjects) {
            sessionProjectsRef.current[activeSession] = proj;
            try {
              const map = JSON.parse(localStorage.getItem(userStorageKeys.sessionProjects) || "{}");
              map[activeSession] = proj;
              localStorage.setItem(userStorageKeys.sessionProjects, JSON.stringify(map));
            } catch {}
          }
        } else {
          setActiveProject(null);
          activeProjectRef.current = null;
          setProjectBound(false);
          sentProjectPathRef.current = "";
          if (activeSession && userStorageKeys.sessionProjects) {
            sessionProjectsRef.current[activeSession] = null;
            try {
              const map = JSON.parse(localStorage.getItem(userStorageKeys.sessionProjects) || "{}");
              delete map[activeSession];
              localStorage.setItem(userStorageKeys.sessionProjects, JSON.stringify(map));
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
  }, [beginUtterance, endUtterance, unmuteAudio, flushPendingRex, activeSession, recordAiSpeech, queueCodeEvent, userStorageKeys.sessionProjects]);

  const onAudioMessage = useCallback((data: ArrayBuffer) => {
    if (audioMutedRef.current) return; // discard audio that arrives after an interrupt
    // Every binary frame from the backend is an MP3 chunk for the current utterance
    pushChunk(data);
  }, [pushChunk]);

  const fallbackSessionId = useMemo(
    () => `s_live_${(canonicalUserKey || "workspace").replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [canonicalUserKey]
  );

  const { status: wsStatus, connect, disconnect, sendMessage } = useWebSocket({
    sessionId: activeSession || fallbackSessionId,
    userId: canonicalUserKey || user?.id,
    onMessage: onServerMessage,
    onAudio: onAudioMessage,
  });

  const handleInterruptVoice = useCallback(
    (fromManualClick = false) => {
      muteAudio();
      clearPendingRex();
      if (isBuildingRef.current) {
        lastBuildInterruptedTimeRef.current = Date.now();
        setSteps((prev) =>
          prev.map((s) => (s.status === "running" ? { ...s, status: "pending" as const } : s))
        );
      }
      isBuildingRef.current = false;
      isSynthesizingVoiceRef.current = false;
      try {
        window.speechSynthesis.cancel();
      } catch {}
      sendMessage({ type: "execution.interrupt", payload: {} });

      if (fromManualClick) {
        setOrbState(voiceListeningRef.current ? "listening" : "idle");
        setNarration("Stopped — I'm all ears! Tell me what you'd like instead.");
        setTranscript("");
      } else {
        // Triggered by spoken barge-in: immediately enter LISTENING mode and keep transcript intact!
        lastSpokenBargeInTimeRef.current = Date.now();
        voiceListeningRef.current = true;
        setOrbState("listening");
        setNarration("Mmm-hmm, I'm listening — go ahead...");
      }
    },
    [muteAudio, clearPendingRex, sendMessage]
  );

  // Unified voice synthesis: keeps Rex's voice 100% consistent across all turns
  const playUnifiedVoice = useCallback(
    async (spokenText: string, emotion: string = "warm", userPrompt?: string) => {
      let currentVoice = "adam";
      let currentSpeed: "slow" | "normal" | "fast" = "normal";
      if (typeof window !== "undefined") {
        try {
          const voiceKey = getVoiceStorageKey(user, user?.email);
          const stored = localStorage.getItem(voiceKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.voice) currentVoice = parsed.voice;
            if (parsed.speed) currentSpeed = parsed.speed;
          }
        } catch {}
      }

      const effectiveEmotion: EmotionTone =
        (emotion as EmotionTone) || detectEmotionFromContext(userPrompt || spokenText, spokenText);
      setActiveEmotion(effectiveEmotion);
      isSynthesizingVoiceRef.current = true;

      const triggerBrowserFallback = () => {
        if (audioMutedRef.current) return;
        setOrbState("speaking");
        speakHumanizedText(
          spokenText,
          { voice: currentVoice, speed: currentSpeed, emotion: effectiveEmotion },
          {
            onStart: () => {
              if (!audioMutedRef.current) setOrbState("speaking");
            },
            onEnd: () => {
              if (
                audioMutedRef.current ||
                Date.now() - lastSpokenBargeInTimeRef.current < 5000
              ) {
                setOrbState("listening");
                return;
              }
              lastRexSpeechEndTimeRef.current = Date.now();
              setOrbState(voiceListeningRef.current ? "listening" : "idle");
            },
          }
        );
      };

      if (unifiedVoiceAbortRef.current) {
        try {
          unifiedVoiceAbortRef.current.abort();
        } catch {}
      }
      const abortController = new AbortController();
      unifiedVoiceAbortRef.current = abortController;

      try {
        const res = await fetch("/api/voice/speak", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: spokenText,
            voice: currentVoice,
            emotion,
            speed: currentSpeed,
            userPrompt,
          }),
          signal: abortController.signal,
        });
        if (abortController.signal.aborted || audioMutedRef.current) {
          isSynthesizingVoiceRef.current = false;
          return;
        }
        if (res.ok && res.headers.get("Content-Type")?.includes("audio")) {
          const buffer = await res.arrayBuffer();
          if (abortController.signal.aborted || audioMutedRef.current) {
            isSynthesizingVoiceRef.current = false;
            return;
          }
          if (buffer.byteLength > 100 && !audioMutedRef.current) {
            isSynthesizingVoiceRef.current = false;
            unmuteAudio();
            setOrbState("speaking");
            beginUtterance(triggerBrowserFallback);
            pushChunk(buffer);
            endUtterance();
            return;
          }
        }
      } catch {
        if (abortController.signal.aborted || audioMutedRef.current) {
          isSynthesizingVoiceRef.current = false;
          return;
        }
      }

      isSynthesizingVoiceRef.current = false;
      triggerBrowserFallback();
    },
    [unmuteAudio, beginUtterance, pushChunk, endUtterance, user]
  );

  // Voice synthesis is now driven by the backend (Edge-TTS streamed over WebSocket).
  // The browser SpeechSynthesisUtterance fallback is no longer used; the chosen voice
  // and speed flow from the Settings page through a voice.config WebSocket message.

  const lastHumTimeRef = useRef<number>(0);

  const triggerListeningHum = useCallback(() => {
    const now = Date.now();
    if (now - lastHumTimeRef.current < 2400) return;
    lastHumTimeRef.current = now;
    playActiveListeningHum();
  }, []);

  const handleCheckSelfEcho = useCallback((candidateText: string) => {
    const speakingOrRecent =
      isPlayingRef.current ||
      speakingRef.current ||
      wasPlayingRef.current ||
      isSynthesizingVoiceRef.current ||
      Date.now() - lastRexSpeechEndTimeRef.current < 3000;
    return checkIsSelfEcho(candidateText, recentAiSpeechRef.current, speakingOrRecent);
  }, []);

  // ── Voice: wake word "Rex" + continuous conversation + phrase-independent barge-in ────────
  const handleVoiceTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      const normalizedLive = normalizeSpokenTranscript(text, { isInterim: !isFinal });
      setTranscript(normalizedLive);
      const raw = normalizedLive.trim();
      if (!raw) return;

      const rexSpeakingNow =
        audioIsPlaying ||
        isPlayingRef.current ||
        speakingRef.current ||
        wasPlayingRef.current ||
        isSynthesizingVoiceRef.current;
      const inRecentEchoWindow = rexSpeakingNow || Date.now() - lastRexSpeechEndTimeRef.current < 2500;

      // Only extract a user interrupt from a speaker-bleed buffer when Rex is actively speaking or in echo window,
      // OR when the entire phrase is a bare stop/pause command — NEVER slice a user's normal multi-sentence conversation!
      const extracted = extractUserInterruptFromBuffer(raw);
      const shouldUseExtracted =
        extracted.matched &&
        (extracted.isBareSilence ||
          inRecentEchoWindow ||
          checkIsSelfEcho(
            raw.slice(0, Math.max(0, raw.toLowerCase().lastIndexOf(extracted.extractedText.toLowerCase()))),
            recentAiSpeechRef.current,
            true
          ));
      const effectiveRaw = shouldUseExtracted ? extracted.extractedText : raw;
      const lower = effectiveRaw.toLowerCase().replace(/[.!?,]/g, "").trim();
      const isStop = shouldUseExtracted || isStopPhrase(lower);
      const isBareStop = isPureBareStop(lower);
      const wasBuildingRecently =
        isBuildingRef.current || Date.now() - lastBuildInterruptedTimeRef.current < 6000;
      const isBuildTermination = isBuildTerminationCommand(effectiveRaw, wasBuildingRecently);

      const isEcho =
        !isBareStop &&
        !isBuildTermination &&
        checkIsSelfEcho(effectiveRaw, recentAiSpeechRef.current, inRecentEchoWindow);
      const spokenWordCount = lower.split(/\s+/).filter((w) => w.length > 1).length;

      const rexTalkingOrWorking = rexSpeakingNow || isBuildingRef.current;

      const startsWithExplicitUserBargeLead =
        /^(no\b|nope\b|nah\b|wait\b|hold\b|stop\b|pause\b|please\b|listen\b|hey\b|hi\b|hello\b|ok\b|okay\b|rex\b|actually\b|but\b|so\b|well\b|can\s+you\b|could\s+you\b|would\s+you\b|what\b|why\b|how\b|tell\s+me\b|let\s+me\b|i\s+want\b|i\s+need\b|i\s+think\b|i\s+have\b|i\s+don'?t\b|never\s*mind\b)/i.test(
          lower
        );

      // Smooth instant barge-in: 3+ non-echo words, or 2+ words starting with a conversational opener, or any stop/pause phrase
      const isNaturalUserBargeIn =
        !isEcho &&
        (isStop ||
          isBareStop ||
          isBuildTermination ||
          spokenWordCount >= 3 ||
          (spokenWordCount >= 2 && startsWithExplicitUserBargeLead));

      // ── BARGE-IN (Interim) ────────────────────────────────────────────────
      if (!isFinal) {
        if ((rexTalkingOrWorking || isBareStop) && isNaturalUserBargeIn) {
          muteAudio();
          clearPendingRex();
          if (isBuildingRef.current && (isStop || isBuildTermination)) {
            lastBuildInterruptedTimeRef.current = Date.now();
            setSteps((prev) =>
              prev.map((s) => (s.status === "running" ? { ...s, status: "pending" as const } : s))
            );
            isBuildingRef.current = false;
          }
          isSynthesizingVoiceRef.current = false;
          try { window.speechSynthesis.cancel(); } catch {}
          sendMessage({ type: "execution.interrupt", payload: {} });
          if (!isBareStop) {
            lastSpokenBargeInTimeRef.current = Date.now();
            voiceListeningRef.current = true;
            setOrbState("listening");
            setNarration("I'm listening — go ahead...");
          } else {
            pauseToWakeWordRef.current();
            voiceListeningRef.current = false;
            lastSpokenBargeInTimeRef.current = 0;
            setOrbState("idle");
            setNarration("Paused — say 'Rex' or click the orb when you're ready.");
            setTranscript("");
          }
        }
        return; // wait for the final transcript to act on the complete sentence
      }

      // ── FINAL transcript ──────────────────────────────────────────────────
      // 1. Explicit or semantic stop, silence, build termination, withdrawal, or conversational barge-in
      if (isStop || isBareStop || isBuildTermination || (rexSpeakingNow && isNaturalUserBargeIn)) {
        muteAudio();
        clearPendingRex();
        if (isBuildingRef.current && (isStop || isBuildTermination)) {
          lastBuildInterruptedTimeRef.current = Date.now();
          setSteps((prev) =>
            prev.map((s) => (s.status === "running" ? { ...s, status: "pending" as const } : s))
          );
          isBuildingRef.current = false;
        }
        isSynthesizingVoiceRef.current = false;
        try { window.speechSynthesis.cancel(); } catch {}
        sendMessage({ type: "execution.interrupt", payload: {} });

        // If the user said a bare stop/pause command ("Stop Rex", "Pause Rex", "Please stop", "Please pause", "Pause", "Stop")
        // AND no build was being terminated, transition Rex into PAUSED / READY (wake-word) mode!
        if (isBareStop && !wasBuildingRecently && !isBuildTermination) {
          pauseToWakeWordRef.current();
          voiceListeningRef.current = false;
          lastSpokenBargeInTimeRef.current = 0;
          setOrbState("idle");
          setNarration("Paused — say 'Rex' or click the orb when you're ready.");
          setTranscript("");
          return;
        }
      }

      // 2. Contiguous self-echo check: Did the mic pick up Rex's own speech?
      if (isEcho) {
        console.debug("[voice] Suppressing self-echo transcript matching Rex's recent speech:", effectiveRaw);
        setTranscript("");
        return;
      }

      // 3. Suppress single-word noise fragments in the 1800ms post-speech hardware drain window
      const now = Date.now();
      const timeSinceRexSpoke = now - lastRexSpeechEndTimeRef.current;
      const hasExplicitWake = /\b(hey|hello|hi|ok|okay)\s+rex\b/i.test(effectiveRaw) || /\brex\b/i.test(effectiveRaw);
      if (timeSinceRexSpoke < 1800 && !hasExplicitWake && !isStop && !isBuildTermination && spokenWordCount < 2) {
        console.debug("[voice] Suppressing 1-word fragment in echo cooldown:", effectiveRaw);
        setTranscript("");
        return;
      }

      // 5. Genuine user request -> send to Rex with instant zero-lag responsiveness!
      lastSpokenBargeInTimeRef.current = 0;
      unlockAudioPlayback();
      primeSpeechSynthesis();
      unmuteAudio(); // new turn → allow Rex's reply to play
      setPendingProposal(null);
      setOrbState("thinking");
      setNarration("Thinking...");

      const cleanText = normalizeSpokenTranscript(effectiveRaw, { isInterim: false });
      const effectiveUsername =
        userProfile.username || loadUserProfile(canonicalUserKey, user).username;

      // Check lightweight client fast-path for simple greetings or common commands (<10ms instant response)
      const fastResult = !wasBuildingRecently && !isBuildTermination ? checkClientFastPath(cleanText, effectiveUsername) : null;
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
          handleInterruptVoice(true);
          pauseToWakeWordRef.current();
          voiceListeningRef.current = false;
          lastSpokenBargeInTimeRef.current = 0;
          setOrbState("idle");
          setNarration("Paused — say 'Rex' or click the orb when you're ready.");
          setTranscript("");
          return;
        }

        setChatLog((prev) => [
          ...prev,
          { role: "user", text: cleanText },
          { role: "assistant", text: fastResult.reply },
        ]);
        setNarration(fastResult.spoken);
        recordAiSpeech(fastResult.spoken);
        playUnifiedVoice(fastResult.spoken, fastResult.emotion || "warm", cleanText);
        sendMessage({ type: "text.input", payload: { text: cleanText, fastPath: true } });
        setTranscript("");
        return;
      }

      setChatLog((prev) => [...prev, { role: "user", text: cleanText }]);
      sendMessage({ type: "text.input", payload: { text: cleanText } });
      setTranscript("");
    },
    [sendMessage, muteAudio, unmuteAudio, clearPendingRex, recordAiSpeech, handleInterruptVoice, playUnifiedVoice, triggerListeningHum, userProfile.username, canonicalUserKey, user, audioIsPlaying]
  );

  const createSessionRef = useRef<() => string>(() => "");

  const handleActivated = useCallback(() => {
    unlockAudioPlayback();
    primeSpeechSynthesis();
    voiceListeningRef.current = true;
    if (!activeSessionRef.current && createSessionRef.current) {
      createSessionRef.current();
    }
    setOrbState("listening");
    if (Date.now() - lastSpokenBargeInTimeRef.current < 3000) {
      // Activated via spoken barge-in: keep the user's live barge-in transcript visible!
      setNarration("Mmm-hmm, I'm listening — go ahead...");
      return;
    }
    setNarration("I'm listening...");
    setTranscript("");
  }, []);

  const handleDeactivated = useCallback(() => {
    voiceListeningRef.current = false;
    setOrbState("idle");
    setNarration("Say 'Rex' to start, or click the orb");
  }, []);

  const handleSpokenInterrupt = useCallback(() => {
    handleInterruptVoice(false);
  }, [handleInterruptVoice]);

  const handleBackchannel = useCallback(
    (reason: "barge_in" | "listening_hum") => {
      triggerListeningHum();
      if (reason === "barge_in") {
        lastSpokenBargeInTimeRef.current = Date.now();
        voiceListeningRef.current = true;
        setOrbState("listening");
        setNarration("Mmm-hmm, I'm listening — go ahead...");
      }
    },
    [triggerListeningHum]
  );

  const {
    mode: voiceMode,
    audioLevel,
    startListening,
    stopListening,
    pauseToWakeWord,
    forceActivate,
  } = useVoice({
    onTranscript: handleVoiceTranscript,
    onActivated: handleActivated,
    onDeactivated: handleDeactivated,
    onInterrupt: handleSpokenInterrupt,
    onBackchannel: handleBackchannel,
    isSelfEcho: handleCheckSelfEcho,
    isAiSpeaking:
      !audioMutedRef.current &&
      (audioIsPlaying ||
        isPlayingRef.current ||
        orbState === "speaking" ||
        wasPlayingRef.current ||
        isSynthesizingVoiceRef.current),
  });

  useEffect(() => {
    pauseToWakeWordRef.current = pauseToWakeWord;
  }, [pauseToWakeWord]);

  // Keep the mic-live mirror in sync for the orb-reset effect above.
  useEffect(() => {
    voiceListeningRef.current = voiceMode === "active_conversation";
  }, [voiceMode]);

  // Clicking the orb: while Rex is talking or working, it's a STOP button —
  // silence + halt immediately and switch to push-to-talk listening.
  const handleOrbClick = useCallback(() => {
    unlockAudioPlayback();
    primeSpeechSynthesis();
    if (isPlayingRef.current || isBuildingRef.current || orbState === "speaking" || orbState === "thinking") {
      handleInterruptVoice(true);
      forceActivate();
      return;
    }
    forceActivate();
  }, [orbState, handleInterruptVoice, forceActivate]);

  // ── Session management ──────────────────────────────────────
  // Tracks the most recently opened session so a slow history fetch from an
  // earlier click can't populate the chat of the session we're now on.
  const historyReqRef = useRef<string>("");

  // ── Auto-persist active session chat log to localStorage & backend ────────
  useEffect(() => {
    if (!activeSession || !canonicalUserKey || chatLog.length === 0) return;
    const chatKey = userStorageKeys.chatHistory(activeSession);
    if (chatKey) {
      try {
        localStorage.setItem(chatKey, JSON.stringify(chatLog));
      } catch {}
    }

    const timer = setTimeout(() => {
      fetch(`/api/sessions/${encodeURIComponent(activeSession)}/history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": canonicalUserKey,
          ...(user?.email ? { "x-user-email": user.email.toLowerCase() } : {}),
        },
        body: JSON.stringify({
          user_id: canonicalUserKey,
          email: user?.email ? user.email.toLowerCase() : undefined,
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
  }, [activeSession, chatLog, canonicalUserKey, user?.email, userStorageKeys]);

  const handleSessionClick = useCallback(
    (id: string) => {
      if (isBlockedSessionId(id)) return;
      if (activeSession && activeSession !== id) {
        muteAudio();
        clearPendingRex();
        isBuildingRef.current = false;
        isSynthesizingVoiceRef.current = false;
        try { window.speechSynthesis.cancel(); } catch {}
        disconnect();
      }
      activeSessionRef.current = id;
      setActiveSession(id);
      if (userStorageKeys.activeSession) {
        try {
          localStorage.setItem(userStorageKeys.activeSession, id);
        } catch {}
      }
      setSteps([]);
      setOrbState(voiceListeningRef.current ? "listening" : "idle");
      setNarration(
        voiceListeningRef.current ? "I'm listening..." : "Say 'Rex' to start, or click the orb"
      );

      // Instantly restore this session's saved conversation from user-scoped localStorage
      let initialTurns: Array<{ role: string; text: string; images?: string[]; docs?: string[] }> = [];
      const chatKey = userStorageKeys.chatHistory(id);
      if (chatKey) {
        try {
          const raw =
            localStorage.getItem(chatKey) ||
            (user?.id && user.id !== canonicalUserKey
              ? localStorage.getItem(`vyrexo_chat_history_${user.id}_${id}`)
              : null);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) initialTurns = parsed;
          }
        } catch {}
      }
      setChatLog(initialTurns);

      // Helper to detect if a session's user turns built an application (e.g. shoe e-commerce)
      // and self-heal any TaskFlow poisoning or container-restart preview loss
      const extractSessionBuildInfo = (turnsList: Array<{ role: string; text: string }>) => {
        const userPrompts = turnsList
          .filter((t) => t?.role === "user")
          .map((t) => (t?.text || "").trim())
          .filter(Boolean);
        const combinedUserText = userPrompts.join(" ");
        const askedForTodo =
          /\b(todo|to-do|to\s+do\s+(?:list|app|application|board|tracker|manager)|checklist|task\s+list|task\s+manager|taskflow)\b/i.test(
            combinedUserText
          );
        const buildTurn = userPrompts.find((txt) =>
          /\b(build|create|make|develop|code|work\s+on|ecommerce|e-commerce|shoe|shoes|sneaker|sneakers|footwear|kicks|clothing|clothes|fashion|store|shop|website|app|application|platform|flight|train|railgo|food|restaurant|calculator|crypto|dashboard|timer|pomodoro|flowstate|amity)\b/i.test(
            txt
          )
        );
        const assistantBuiltTurn = turnsList.some(
          (t) =>
            t?.role === "assistant" &&
            /\b(built|created|scaffolded|live\s+preview|preview\s+tab|src\/components\/App\.tsx|compiled)\b/i.test(
              t?.text || ""
            )
        );
        return {
          combinedUserText,
          askedForTodo,
          buildPrompt: buildTurn || (assistantBuiltTurn ? combinedUserText : ""),
          hasBuildInHistory: Boolean(buildTurn || assistantBuiltTurn),
        };
      };

      const initialBuildInfo = extractSessionBuildInfo(initialTurns);
      const isPoisonedTaskFlow = (nameOrTitle?: string | null) =>
        Boolean(
          nameOrTitle &&
            /\b(taskflow|to-do|todo)\b/i.test(nameOrTitle) &&
            initialBuildInfo.hasBuildInHistory &&
            !initialBuildInfo.askedForTodo
        );

      const initialCached = getSessionFilesFromCache(id);
      const cachedIsPoisoned =
        isPoisonedTaskFlow(initialCached?.projectName) ||
        Boolean(
          initialCached?.files?.some((f) => /\bTaskFlow\b/i.test(f?.content || "")) &&
            initialBuildInfo.hasBuildInHistory &&
            !initialBuildInfo.askedForTodo
        );

      if (initialCached?.files && initialCached.files.length > 0 && !cachedIsPoisoned) {
        const cachedEvents: CodeEvent[] = initialCached.files
          .filter((f) => f?.path && typeof f.content === "string" && !String(f.path).endsWith(".code-workspace"))
          .map((f) => ({
            kind: "action" as const,
            agent: "coder",
            tool: "file_writer",
            category: "file_write",
            path: String(f.path).replace(/^\/+/, ""),
            content: String(f.content),
            message: `Restored ${f.path}`,
          }));
        setCodeEvents(cachedEvents);
      } else {
        setCodeEvents([]);
      }
      setTranscript("");

      let sessProj = sessionProjectsRef.current[id] || null;
      if (
        sessProj &&
        (sessProj.path === "." ||
          sessProj.name === "vyrexo-workspace" ||
          /^session-\d+$/i.test(sessProj.name || "") ||
          isPoisonedTaskFlow(sessProj.name))
      ) {
        sessProj = null;
      }
      if (!sessProj && userStorageKeys.sessionProjects) {
        try {
          const map = JSON.parse(localStorage.getItem(userStorageKeys.sessionProjects) || "{}");
          if (
            map[id] &&
            map[id].path !== "." &&
            map[id].name !== "vyrexo-workspace" &&
            !/^session-\d+$/i.test(map[id].name || "") &&
            !isPoisonedTaskFlow(map[id].name)
          ) {
            if (
              typeof map[id].path === "string" &&
              (map[id].path.startsWith("/app/applet") || map[id].path.startsWith("/workspaces/"))
            ) {
              const slug =
                String(map[id].name || "project")
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-|-$/g, "") || "project";
              map[id].path = `~/VyrexoWorkspaces/${slug}`;
            }
            sessProj = map[id];
          }
        } catch {}
      }

      // If the session had a build in its history (e.g. shoe e-commerce) or cached files, ensure previewUrl is immediately active!
      let sessionUrl = sessionPreviewsRef.current[id] || "";
      if ((!sessionUrl || cachedIsPoisoned) && initialBuildInfo.hasBuildInHistory && initialBuildInfo.buildPrompt) {
        sessionUrl = `/api/preview?session=${encodeURIComponent(id)}&topic=${encodeURIComponent(
          initialBuildInfo.buildPrompt.slice(0, 300)
        )}`;
        sessionPreviewsRef.current[id] = sessionUrl;
      } else if (!sessionUrl && initialCached?.files && initialCached.files.length > 0) {
        sessionUrl = `/api/preview?session=${encodeURIComponent(id)}`;
        sessionPreviewsRef.current[id] = sessionUrl;
      }
      setPreviewUrl(sessionUrl);

      // Self-heal session sidebar title immediately if it was poisoned with "TaskFlow Todo App"
      if (initialBuildInfo.hasBuildInHistory && !initialBuildInfo.askedForTodo) {
        const healedTitle = resolveSemanticSessionName(null, id, sessProj?.name || null, initialTurns);
        if (healedTitle && !isPlaceholderOrBadSessionName(healedTitle)) {
          setSessions((prev) =>
            prev.map((s) =>
              s.id === id && (isPlaceholderOrBadSessionName(s.name) || isPoisonedTaskFlow(s.name))
                ? { ...s, name: healedTitle }
                : s
            )
          );
        }
      }

      setActiveProject(sessProj);
      activeProjectRef.current = sessProj;
      sentProjectPathRef.current = sessProj ? sessProj.path : "";
      setProjectBound(!!sessProj);

      const uidParam = canonicalUserKey ? `&user_id=${encodeURIComponent(canonicalUserKey)}` : "";
      const headers: Record<string, string> = canonicalUserKey
        ? {
            "x-user-id": canonicalUserKey,
            ...(user?.email ? { "x-user-email": user.email.toLowerCase() } : {}),
          }
        : {};

      // Verify with backend for this specific user + session and load all session files into Files tab
      fetch(`/api/projects?sessionId=${encodeURIComponent(id)}${uidParam}`, { headers })
        .then((r) => r.json())
        .then((d) => {
          const serverProjName = d?.project?.name || "";
          const serverPoisoned = isPoisonedTaskFlow(serverProjName);

          if (d?.ok && d.connected && d.project && !serverPoisoned) {
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

            // Populate codeEvents immediately so the Files tab and VS Code modal have all session files ready
            const serverFiles = Array.isArray(d.project.files) ? d.project.files : [];
            const cachedSession = getSessionFilesFromCache(id);
            const effectiveFiles =
              serverFiles.length > 0 ? serverFiles : !cachedIsPoisoned ? cachedSession?.files || [] : [];
            if (effectiveFiles.length > 0 && activeSessionRef.current === id) {
              saveSessionFilesToCache(id, effectiveFiles, {
                projectName: p.name,
                localFolderName: p.path?.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || p.name,
                targetPath: p.path,
              });
              const restoredFileEvents: CodeEvent[] = effectiveFiles
                .filter((f: any) => f?.path && typeof f.content === "string" && !String(f.path).endsWith(".code-workspace"))
                .map((f: any) => ({
                  kind: "action" as const,
                  agent: "coder",
                  tool: "file_writer",
                  category: "file_write",
                  path: String(f.path).replace(/^\/+/, ""),
                  content: String(f.content),
                  message: `Restored ${f.path}`,
                }));
              if (restoredFileEvents.length > 0) {
                setCodeEvents(restoredFileEvents);
              }
              const folderLabel =
                p.path?.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || p.name || "amaze";
              syncSessionFilesToLocalDisk({
                sessionId: id,
                folderName: folderLabel,
                targetPath: p.path || `C:\\Users\\hp\\OneDrive\\Desktop\\${folderLabel}`,
                files: effectiveFiles,
                promptIfMissing: false,
              }).catch(() => {});
            }

            if (!sessionPreviewsRef.current[id] && (d.project.filesCount > 0 || (d.project.files && d.project.files.length > 0))) {
              const restoredPreviewUrl = `/api/preview?session=${encodeURIComponent(id)}`;
              sessionPreviewsRef.current[id] = restoredPreviewUrl;
              setPreviewUrl(restoredPreviewUrl);
            }
            if (p.name && !isPlaceholderOrBadSessionName(p.name)) {
              const cleanTitle = resolveSemanticSessionName(null, id, p.name, initialTurns);
              if (cleanTitle && !isPlaceholderOrBadSessionName(cleanTitle)) {
                setSessions((prev) =>
                  prev.map((s) =>
                    s.id === id && (isPlaceholderOrBadSessionName(s.name) || isPoisonedTaskFlow(s.name))
                      ? { ...s, name: cleanTitle }
                      : s
                  )
                );
              }
            }
            if (userStorageKeys.sessionProjects) {
              try {
                const map = JSON.parse(localStorage.getItem(userStorageKeys.sessionProjects) || "{}");
                map[id] = p;
                localStorage.setItem(userStorageKeys.sessionProjects, JSON.stringify(map));
              } catch {}
            }
          } else if (initialBuildInfo.hasBuildInHistory && initialBuildInfo.buildPrompt) {
            // Server restarted or had a poisoned TaskFlow workspace -> trigger preview self-heal & reload project metadata!
            const healPreviewUrl = `/api/preview?session=${encodeURIComponent(id)}&topic=${encodeURIComponent(
              initialBuildInfo.buildPrompt.slice(0, 300)
            )}&t=${Date.now()}`;
            sessionPreviewsRef.current[id] = healPreviewUrl;
            setPreviewUrl(healPreviewUrl);

            fetch(healPreviewUrl)
              .then(() => fetch(`/api/projects?sessionId=${encodeURIComponent(id)}${uidParam}`, { headers }))
              .then((r) => r.json())
              .then((healed) => {
                if (healed?.ok && healed.connected && healed.project && activeSessionRef.current === id) {
                  const hp = {
                    path: healed.project.path,
                    name: healed.project.name,
                    summary: healed.project.summary,
                    techStack: healed.project.techStack,
                    filesCount: healed.project.filesCount,
                    source: healed.project.source,
                  };
                  setActiveProject(hp);
                  activeProjectRef.current = hp;
                  sessionProjectsRef.current[id] = hp;
                  if (Array.isArray(healed.project.files) && healed.project.files.length > 0) {
                    saveSessionFilesToCache(id, healed.project.files, {
                      projectName: hp.name,
                      localFolderName: hp.name,
                      targetPath: hp.path,
                    });
                    setCodeEvents(
                      healed.project.files
                        .filter((f: any) => f?.path && typeof f.content === "string")
                        .map((f: any) => ({
                          kind: "action" as const,
                          agent: "coder",
                          tool: "file_writer",
                          category: "file_write",
                          path: String(f.path).replace(/^\/+/, ""),
                          content: String(f.content),
                          message: `Restored ${f.path}`,
                        }))
                    );
                  }
                  const healedSidebarName = resolveSemanticSessionName(null, id, hp.name, initialTurns);
                  if (healedSidebarName && !isPlaceholderOrBadSessionName(healedSidebarName)) {
                    setSessions((prev) =>
                      prev.map((s) => (s.id === id ? { ...s, name: healedSidebarName } : s))
                    );
                  }
                  if (userStorageKeys.sessionProjects) {
                    try {
                      const map = JSON.parse(localStorage.getItem(userStorageKeys.sessionProjects) || "{}");
                      map[id] = hp;
                      localStorage.setItem(userStorageKeys.sessionProjects, JSON.stringify(map));
                    } catch {}
                  }
                }
              })
              .catch(() => {});
          }
        })
        .catch(() => {});

      // Restore and synchronize this session's saved conversation with the backend
      historyReqRef.current = id;
      fetch(
        `/api/sessions/${encodeURIComponent(id)}/history${canonicalUserKey ? `?user_id=${encodeURIComponent(canonicalUserKey)}` : ""}`,
        { headers }
      )
        .then((r) => r.json())
        .then((d) => {
          if (historyReqRef.current !== id) return;
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
            if (chatKey) {
              try {
                localStorage.setItem(chatKey, JSON.stringify(mapped));
              } catch {}
            }
            const fetchedBuildInfo = extractSessionBuildInfo(mapped);
            if (fetchedBuildInfo.hasBuildInHistory && fetchedBuildInfo.buildPrompt) {
              const healedName = resolveSemanticSessionName(null, id, null, mapped);
              if (healedName && !isPlaceholderOrBadSessionName(healedName)) {
                setSessions((prev) =>
                  prev.map((s) =>
                    s.id === id && (isPlaceholderOrBadSessionName(s.name) || /\b(taskflow|to-do|todo)\b/i.test(s.name) && !fetchedBuildInfo.askedForTodo)
                      ? { ...s, name: healedName }
                      : s
                  )
                );
              }
              if (!sessionPreviewsRef.current[id]) {
                const urlFromHistory = `/api/preview?session=${encodeURIComponent(id)}&topic=${encodeURIComponent(
                  fetchedBuildInfo.buildPrompt.slice(0, 300)
                )}`;
                sessionPreviewsRef.current[id] = urlFromHistory;
                setPreviewUrl(urlFromHistory);
              }
            }
          }
        })
        .catch(() => {});
    },
    [activeSession, disconnect, isBlockedSessionId, canonicalUserKey, user?.id, user?.email, userStorageKeys, muteAudio, clearPendingRex]
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
    const personalizedInit = personalizeGreetingWithUsername(
      "Hey! Rex here. What would you like to explore, discuss, or build together?",
      "Hey, Rex here! What would you like to explore, discuss, or build together?",
      userProfile.username
    );
    const initialGreeting = [
      {
        role: "assistant",
        text: personalizedInit.reply,
      },
    ];
    setChatLog(initialGreeting);
    const chatKey = userStorageKeys.chatHistory(id);
    if (chatKey) {
      try {
        localStorage.setItem(chatKey, JSON.stringify(initialGreeting));
      } catch {}
    }

    const now = Date.now();
    setSessions((prev) => [{ id, name: "New Session", icon, createdAt: now }, ...prev]);
    if (canonicalUserKey) {
      fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": canonicalUserKey,
          ...(user?.email ? { "x-user-email": user.email.toLowerCase() } : {}),
        },
        body: JSON.stringify({
          id,
          user_id: canonicalUserKey,
          email: user?.email ? user.email.toLowerCase() : undefined,
          name: "New Session",
          icon,
          createdAt: now,
        }),
      }).catch(() => {});
    }
    handleSessionClick(id);
    return id;
  }, [handleSessionClick, canonicalUserKey, user?.email, sessions.length, userStorageKeys, userProfile.username]);

  useEffect(() => {
    createSessionRef.current = createSession;
  }, [createSession]);

  const handleRenameSession = useCallback(
    (id: string, name: string) => {
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
      if (!canonicalUserKey) return;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-user-id": canonicalUserKey,
        ...(user?.email ? { "x-user-email": user.email.toLowerCase() } : {}),
      };
      fetch("/api/sessions", {
        method: "POST",
        headers,
        body: JSON.stringify({ id, user_id: canonicalUserKey, name, forceRename: true }),
      }).catch(() => {});
      fetch(`/api/sessions/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ name, user_id: canonicalUserKey }),
      }).catch(() => {});
    },
    [canonicalUserKey, user?.email]
  );

  const handleDeleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      const uidQuery = canonicalUserKey ? `&user_id=${encodeURIComponent(canonicalUserKey)}` : "";
      const uidFirstQuery = canonicalUserKey ? `?user_id=${encodeURIComponent(canonicalUserKey)}` : "";
      const headers: Record<string, string> = canonicalUserKey
        ? {
            "x-user-id": canonicalUserKey,
            ...(user?.email ? { "x-user-email": user.email.toLowerCase() } : {}),
          }
        : {};
      fetch(`/api/sessions/${encodeURIComponent(id)}${uidFirstQuery}`, { method: "DELETE", headers }).catch(() => {});
      fetch(`/api/projects?sessionId=${encodeURIComponent(id)}${uidQuery}`, { method: "DELETE", headers }).catch(() => {});
      fetch(`/api/sessions/${encodeURIComponent(id)}/history${uidFirstQuery}`, { method: "DELETE", headers }).catch(() => {});
      delete sessionProjectsRef.current[id];
      delete sessionPreviewsRef.current[id];
      try {
        const chatKey = userStorageKeys.chatHistory(id);
        if (chatKey) localStorage.removeItem(chatKey);
        if (userStorageKeys.sessionProjects) {
          const map = JSON.parse(localStorage.getItem(userStorageKeys.sessionProjects) || "{}");
          delete map[id];
          localStorage.setItem(userStorageKeys.sessionProjects, JSON.stringify(map));
        }
      } catch {}
      if (id === activeSession) {
        disconnect();
        setActiveSession(null);
        if (userStorageKeys.activeSession) {
          try {
            localStorage.removeItem(userStorageKeys.activeSession);
          } catch {}
        }
        setActiveProject(null);
        activeProjectRef.current = null;
        setProjectBound(false);
        sentProjectPathRef.current = "";
        setChatLog([]);
      }
    },
    [activeSession, disconnect, canonicalUserKey, user?.email, userStorageKeys]
  );

  const handleClearCurrentChat = useCallback(() => {
    if (!activeSession) return;
    setChatLog([]);
    try {
      const chatKey = userStorageKeys.chatHistory(activeSession);
      if (chatKey) localStorage.removeItem(chatKey);
    } catch {}
    const uidFirstQuery = canonicalUserKey ? `?user_id=${encodeURIComponent(canonicalUserKey)}` : "";
    fetch(`/api/sessions/${encodeURIComponent(activeSession)}/history${uidFirstQuery}`, {
      method: "DELETE",
      headers: canonicalUserKey
        ? {
            "x-user-id": canonicalUserKey,
            ...(user?.email ? { "x-user-email": user.email.toLowerCase() } : {}),
          }
        : undefined,
    }).catch(() => {});
  }, [activeSession, canonicalUserKey, user?.email, userStorageKeys]);

  const handleDeleteOldChats = useCallback(
    async (days: number) => {
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      const toRemove = sessions.filter((s) => getSessionTimestamp(s) < cutoff);
      for (const s of toRemove) {
        try {
          const chatKey = userStorageKeys.chatHistory(s.id);
          if (chatKey) localStorage.removeItem(chatKey);
        } catch {}
      }
      setSessions((prev) => prev.filter((s) => getSessionTimestamp(s) >= cutoff));
      if (activeSession && toRemove.some((s) => s.id === activeSession)) {
        disconnect();
        setActiveSession(null);
        setActiveProject(null);
        setChatLog([]);
      }
      if (!canonicalUserKey) return;
      try {
        await fetch(
          `/api/sessions?older_than_days=${days}&user_id=${encodeURIComponent(canonicalUserKey)}`,
          {
            method: "DELETE",
            headers: {
              "x-user-id": canonicalUserKey,
              ...(user?.email ? { "x-user-email": user.email.toLowerCase() } : {}),
            },
          }
        );
      } catch {}
    },
    [sessions, activeSession, disconnect, canonicalUserKey, user?.email, userStorageKeys]
  );

  const handleClearAllHistory = useCallback(async () => {
    for (const s of sessions) {
      try {
        const chatKey = userStorageKeys.chatHistory(s.id);
        if (chatKey) localStorage.removeItem(chatKey);
      } catch {}
    }
    setChatLog([]);
    setSessions([]);
    disconnect();
    setActiveSession(null);
    setActiveProject(null);
    if (userStorageKeys.activeSession) {
      try {
        localStorage.removeItem(userStorageKeys.activeSession);
      } catch {}
    }
    if (canonicalUserKey) {
      try {
        await fetch(
          `/api/sessions?clear_all=true&user_id=${encodeURIComponent(canonicalUserKey)}`,
          {
            method: "DELETE",
            headers: {
              "x-user-id": canonicalUserKey,
              ...(user?.email ? { "x-user-email": user.email.toLowerCase() } : {}),
            },
          }
        );
      } catch {}
    }
  }, [sessions, disconnect, canonicalUserKey, user?.email, userStorageKeys]);

  // Start hands-free wake-word listener once when user is authenticated in workspace
  useEffect(() => {
    if (!user) return;
    startListening();
    return () => {
      stopListening();
    };
  }, [user, startListening, stopListening]);

  // Connect WS when session is selected
  useEffect(() => {
    if (activeSession) {
      connect();
      return () => {
        disconnect();
      };
    }
  }, [activeSession, connect, disconnect]);

  // Update narration when WS connects and push voice config to the backend
  useEffect(() => {
    if (wsStatus === "connected") {
      if (!voiceListeningRef.current && !isPlayingRef.current && !isBuildingRef.current) {
        setNarration("Say 'Rex' to start, or click the orb");
      }

      // Push the user's saved voice preference so backend TTS uses the right voice
      try {
        const voiceKey = getVoiceStorageKey(user, user?.email);
        const saved = localStorage.getItem(voiceKey);
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
  }, [wsStatus, sendMessage, user]);

  // Auto-restore active session on startup ONLY if the user already has sessions
  useEffect(() => {
    if (!sessionsLoaded || sessions.length === 0 || activeSession) return;
    let targetId = "";
    if (userStorageKeys.activeSession) {
      try {
        const savedId = localStorage.getItem(userStorageKeys.activeSession);
        if (savedId && sessions.some((s) => s.id === savedId)) {
          targetId = savedId;
        }
      } catch {}
    }
    if (!targetId) {
      const namedSession = sessions.find((s) => s.name && s.name !== "New Session");
      targetId = namedSession ? namedSession.id : sessions[0].id;
    }
    if (targetId) {
      handleSessionClick(targetId);
    }
  }, [sessionsLoaded, sessions, activeSession, handleSessionClick, userStorageKeys.activeSession]);

  // Restore user-scoped projects map on initial load
  useEffect(() => {
    if (!userStorageKeys.sessionProjects) return;
    try {
      const saved = localStorage.getItem(userStorageKeys.sessionProjects);
      if (saved) {
        const map = JSON.parse(saved);
        let modified = false;
        for (const k of Object.keys(map)) {
          if (
            map[k]?.path === "." ||
            map[k]?.name === "vyrexo-workspace" ||
            /^session-\d+$/i.test(map[k]?.name || "")
          ) {
            delete map[k];
            modified = true;
          } else if (
            typeof map[k]?.path === "string" &&
            (map[k].path.startsWith("/app/applet") ||
              map[k].path.startsWith("/workspaces/") ||
              map[k].path.startsWith("~/") ||
              map[k].path.startsWith("~\\"))
          ) {
            const folderTail = map[k].path.startsWith("~")
              ? map[k].path.replace(/^~[\\/]+(?:Desktop|VyrexoWorkspaces)?[\\/]?/i, "")
              : "";
            const slug =
              folderTail ||
              map[k]?.localFolderName ||
              String(map[k].name || "amaze")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "") ||
              "amaze";
            map[k].path = `C:\\Users\\hp\\OneDrive\\Desktop\\${slug}`;
            modified = true;
          }
        }
        if (modified) {
          localStorage.setItem(userStorageKeys.sessionProjects, JSON.stringify(map));
        }
        sessionProjectsRef.current = map;
        if (activeSession && map[activeSession]) {
          setActiveProject(map[activeSession]);
        }
      }
    } catch {}
  }, [activeSession, userStorageKeys.sessionProjects]);

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
      sendMessage({
        type: "project.set",
        payload: { path: activeProject.path, name: activeProject.name },
      });
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
  const handleConnectProject = useCallback(() => {
    setConnectProjectModalOpen(true);
  }, []);

  const handleSelectProjectFromModal = useCallback(
    (project: {
      id?: string;
      sessionId?: string;
      name: string;
      path: string;
      summary?: string;
      filesCount?: number;
      techStack?: string[];
      source?: string;
      files?: Array<{ path: string; content: string; size?: number }>;
    }) => {
      // If user clicked an existing project from the Workspaces tab that belongs to another session,
      // switch directly to that project's session!
      if (
        project.sessionId &&
        project.sessionId !== activeSession &&
        project.source !== "local_folder"
      ) {
        handleSessionClick(project.sessionId);
        return;
      }

      const currentSessionId = project.sessionId || activeSession || createSession();
      if (currentSessionId !== activeSession) {
        setActiveSession(currentSessionId);
      }

      setActiveProject(project);
      activeProjectRef.current = project;
      sentProjectPathRef.current = "";

      // Update session name in sidebar if it was still "New Session"
      if (project.name && project.name !== "New Session") {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === currentSessionId && (!s.name || s.name === "New Session")
              ? { ...s, name: project.name, icon: project.source === "local_folder" ? "📁" : s.icon }
              : s
          )
        );
      }

      // If uploaded local folder contains files, populate the Code tab immediately
      if (Array.isArray(project.files) && project.files.length > 0) {
        const uploadedEvents: CodeEvent[] = project.files.map((f) => ({
          kind: "action",
          agent: "Workspace Sync",
          tool: "read_file",
          category: "file",
          path: f.path,
          content: f.content,
          message: `Loaded ${f.path} from local folder ${project.name}`,
        }));
        setCodeEvents(uploadedEvents);
        setActiveRightTab("code");
        setRightPanelCollapsed(false);
      }

      // Manage feedback for both empty local folders (0 files) and populated folders
      if (project.source === "local_folder" && (project.filesCount === 0 || !project.filesCount)) {
        const msg = `Connected to your empty local folder "${project.name}". Tell me what application you'd like to build, and I'll generate the entire file structure inside this workspace so you can open and sync it in VS Code.`;
        setNarration(msg);
        setChatLog((prev) => [...prev, { role: "assistant", text: msg }]);
      } else {
        setNarration(
          `Connected to ${project.name}${
            project.filesCount ? ` (${project.filesCount} files)` : ""
          }.`
        );
      }

      sessionProjectsRef.current[currentSessionId] = project;
      if (userStorageKeys.sessionProjects) {
        try {
          const map = JSON.parse(localStorage.getItem(userStorageKeys.sessionProjects) || "{}");
          map[currentSessionId] = project;
          localStorage.setItem(userStorageKeys.sessionProjects, JSON.stringify(map));
        } catch {}
      }

      if (wsStatus === "connected") {
        sentProjectPathRef.current = project.path;
        sendMessage({ type: "project.set", payload: { path: project.path } });
      }
    },
    [activeSession, wsStatus, sendMessage, createSession, handleSessionClick, userStorageKeys.sessionProjects]
  );

  const handleDisconnectProject = useCallback(async () => {
    if (!activeSession) return;
    try {
      const uidQuery = user?.id ? `&user_id=${encodeURIComponent(user.id)}` : "";
      await fetch(`/api/projects?sessionId=${encodeURIComponent(activeSession)}${uidQuery}`, {
        method: "DELETE",
        headers: user?.id ? { "x-user-id": user.id } : undefined,
      });
    } catch {}
    setActiveProject(null);
    activeProjectRef.current = null;
    setProjectBound(false);
    sentProjectPathRef.current = "";
    sessionProjectsRef.current[activeSession] = null;
    if (userStorageKeys.sessionProjects) {
      try {
        const map = JSON.parse(localStorage.getItem(userStorageKeys.sessionProjects) || "{}");
        delete map[activeSession];
        localStorage.setItem(userStorageKeys.sessionProjects, JSON.stringify(map));
      } catch {}
    }
    setNarration("Project disconnected from this session.");
    setConnectProjectModalOpen(false);
  }, [activeSession, user?.id, userStorageKeys.sessionProjects]);

  const handleOpenVSCode = useCallback(async () => {
    try {
      const eventFiles = codeEvents
        .filter((e) => e.kind === "action" && e.path && typeof e.content === "string" && !e.path.endsWith(".code-workspace"))
        .map((e) => ({ path: e.path!, content: e.content! }));
      const cached = getSessionFilesFromCache(activeSession || "");
      const currentFiles = eventFiles.length > 0 ? eventFiles : cached?.files || [];
      const rawActivePath = activeProject?.path || cached?.targetPath || "";
      const safeProjectPath =
        rawActivePath &&
        rawActivePath !== "." &&
        !rawActivePath.startsWith("/app/applet") &&
        !rawActivePath.startsWith("/workspaces/") &&
        !rawActivePath.startsWith("/local/")
          ? rawActivePath
          : undefined;
      const rawTitle =
        activeProject?.name ||
        cached?.projectName ||
        sessions.find((s) => s.id === activeSession)?.name ||
        undefined;
      const sessionTitle =
        rawTitle && rawTitle !== "New Session" && !/^session-\d+$/i.test(rawTitle)
          ? rawTitle
          : undefined;

      const res = await fetch("/api/projects/vscode", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(user?.id ? { "x-user-id": user.id } : {}) },
        body: JSON.stringify({
          path: safeProjectPath,
          sessionId: activeSession || "",
          user_id: user?.id,
          title: sessionTitle,
          files: currentFiles.length > 0 ? currentFiles : undefined,
          localAgentUrl: "http://127.0.0.1:4040",
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        const folderLabel =
          data.localFolderName ||
          sessions.find((s) => s.id === activeSession)?.name ||
          data.projectSlug ||
          "amaze";
        let resolvedLocalPath =
          data.targetPath ||
          safeProjectPath ||
          `C:\\Users\\hp\\OneDrive\\Desktop\\${folderLabel}`;
        if (resolvedLocalPath.startsWith("~/") || resolvedLocalPath.startsWith("~\\")) {
          const tail =
            resolvedLocalPath.replace(/^~[\\/]+(?:Desktop|VyrexoWorkspaces)?[\\/]?/i, "") ||
            folderLabel;
          resolvedLocalPath = `C:\\Users\\hp\\OneDrive\\Desktop\\${tail}`;
        }
        const resolvedFiles =
          Array.isArray(data.files) && data.files.length > 0 ? data.files : currentFiles;

        if (activeSession && resolvedFiles.length > 0) {
          saveSessionFilesToCache(activeSession, resolvedFiles, {
            projectName: data.projectName || sessionTitle,
            localFolderName: folderLabel,
            targetPath: resolvedLocalPath,
          });
        }

        let bridgeConnected = false;

        // 1. Background sync via FileSystemDirectoryHandle if already granted in IndexedDB/memory
        try {
          const fsSync = await syncSessionFilesToLocalDisk({
            sessionId: activeSession || "default",
            folderName: folderLabel,
            targetPath: resolvedLocalPath,
            files: resolvedFiles,
            promptIfMissing: false,
          });
          if (fsSync.synced) {
            resolvedLocalPath = fsSync.actualTargetPath;
            bridgeConnected = true;
          }
        } catch {}

        // 2. Proactively check if Local Desktop Bridge (127.0.0.1:4040) is running and auto-sync all session files to disk
        try {
          const syncRes = await fetch("http://127.0.0.1:4040/api/vscode/open", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path: resolvedLocalPath,
              localFolderName: folderLabel,
              projectSlug: data.projectSlug,
              projectName: data.projectName,
              sessionId: activeSession || "default",
              files: resolvedFiles,
              openIde: false,
            }),
            signal: AbortSignal.timeout(1200),
          });
          if (syncRes.ok) {
            const syncData = await syncRes.json().catch(() => null);
            if (syncData?.ok && syncData.targetPath) {
              resolvedLocalPath = syncData.targetPath;
              bridgeConnected = true;
            }
          }
        } catch {}

        setVsCodeDetails({
          targetPath: resolvedLocalPath,
          vscodeUri: data.vscodeUri,
          cursorUri: data.cursorUri,
          windsurfUri: data.windsurfUri,
          vscodeInsidersUri: data.vscodeInsidersUri,
          source: data.source,
          message: data.message,
          projectName: data.projectName,
          projectSlug: data.projectSlug,
          localFolderName: folderLabel,
          filesCount: resolvedFiles.filter((f: any) => !String(f.path).endsWith(".code-workspace")).length || data.filesCount,
          files: resolvedFiles,
          downloadUrl: data.downloadUrl,
          vscodeServerUrl:
            data.vscodeServerUrl ||
            `/vscode?sessionId=${encodeURIComponent(activeSession || "")}${user?.id ? `&user_id=${encodeURIComponent(user.id)}` : ""}`,
          bridgeConnected,
        });
        setIdeTargetPathInput(resolvedLocalPath);
        setVsCodeModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to prepare IDE workspace launch:", err);
      setVsCodeModalOpen(true);
    }
  }, [activeProject, activeSession, codeEvents, sessions, user?.id]);

  // Poll Local Desktop Bridge (127.0.0.1:4040) while the VS Code modal is open so if the user starts the bridge,
  // it immediately syncs all session files into their local folder (e.g. "amaze") and opens VS Code automatically!
  useEffect(() => {
    if (!vsCodeModalOpen || vsCodeDetails.bridgeConnected) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const health = await fetch("http://127.0.0.1:4040/health", {
          signal: AbortSignal.timeout(1000),
        });
        if (!health.ok || cancelled) return;
        const filesToSync = vsCodeDetails.files || [];
        const syncRes = await fetch("http://127.0.0.1:4040/api/vscode/open", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: ideTargetPathInput || vsCodeDetails.targetPath,
            localFolderName:
              vsCodeDetails.localFolderName ||
              sessions.find((s) => s.id === activeSession)?.name,
            projectSlug: vsCodeDetails.projectSlug,
            projectName: vsCodeDetails.projectName,
            sessionId: activeSession || "default",
            files: filesToSync,
            openIde: true,
            ide: "vscode",
          }),
          signal: AbortSignal.timeout(2500),
        });
        if (syncRes.ok && !cancelled) {
          const syncData = await syncRes.json().catch(() => null);
          if (syncData?.ok) {
            const realDiskPath = syncData.targetPath || syncData.path;
            if (realDiskPath) setIdeTargetPathInput(realDiskPath);
            setVsCodeDetails((prev) => ({
              ...prev,
              bridgeConnected: true,
              targetPath: realDiskPath || prev.targetPath,
              savedLocally: `Desktop Bridge Connected! Synced all ${filesToSync.length} files to "${realDiskPath}" and launched VS Code.`,
            }));
          }
        }
      } catch {}
    }, 1800);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [vsCodeModalOpen, vsCodeDetails, ideTargetPathInput, activeSession, sessions]);

  const handleSaveToLocalFolder = useCallback(async () => {
    setSavingLocalFolder(true);
    try {
      const currentFiles = codeEvents
        .filter((e) => e.kind === "action" && e.path && typeof e.content === "string" && !e.path.endsWith(".code-workspace"))
        .map((e) => ({ path: e.path!, content: e.content! }));
      const rawTitle =
        activeProject?.name ||
        vsCodeDetails.projectName ||
        sessions.find((s) => s.id === activeSession)?.name ||
        "vyrexo-project";
      const sessionTitle =
        rawTitle !== "New Session" && !/^session-\d+$/i.test(rawTitle) ? rawTitle : undefined;

      const res = await fetch("/api/projects/vscode", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(user?.id ? { "x-user-id": user.id } : {}) },
        body: JSON.stringify({
          path: ideTargetPathInput || undefined,
          sessionId: activeSession || "",
          user_id: user?.id,
          title: sessionTitle,
          files: currentFiles.length > 0 ? currentFiles : undefined,
        }),
      });
      const data = await res.json();
      const filesToSave: Array<{ path: string; content: string }> =
        data?.files || vsCodeDetails.files || currentFiles || [];

      // 1. Try Local Desktop Bridge (127.0.0.1:4040) first — writes directly to real disk folder without any browser security restrictions
      try {
        const agentRes = await fetch("http://127.0.0.1:4040/api/vscode/open", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: ideTargetPathInput || data?.targetPath,
            localFolderName:
              data?.localFolderName ||
              vsCodeDetails.localFolderName ||
              sessions.find((s) => s.id === activeSession)?.name,
            projectSlug: data?.projectSlug || vsCodeDetails.projectSlug,
            projectName: data?.projectName || sessionTitle,
            sessionId: activeSession || "default",
            files: filesToSave,
            openIde: false,
          }),
          signal: AbortSignal.timeout(2000),
        });
        if (agentRes.ok) {
          const agentData = await agentRes.json().catch(() => null);
          if (agentData?.ok && agentData.targetPath) {
            setIdeTargetPathInput(agentData.targetPath);
            setVsCodeDetails((prev) => ({
              ...prev,
              bridgeConnected: true,
              targetPath: agentData.targetPath,
              savedLocally: `Saved all ${filesToSave.length} files directly into "${agentData.targetPath}"!`,
            }));
            setNarration(`Saved all ${filesToSave.length} project files into "${agentData.targetPath}".`);
            return;
          }
        }
      } catch {}

      // 2. Try File System Access API (existing handle or showDirectoryPicker)
      if (typeof window !== "undefined" && "showDirectoryPicker" in window) {
        try {
          const curSess = activeSession || "default";
          let rootHandle = (window as any).__localDirHandles?.[curSess];
          if (!rootHandle) {
            rootHandle = await (window as any).showDirectoryPicker({
              mode: "readwrite",
            });
            (window as any).__localDirHandles = (window as any).__localDirHandles || {};
            (window as any).__localDirHandles[curSess] = rootHandle;
          }
          for (const file of filesToSave) {
            const cleanRel = String(file.path || "")
              .replace(/\\/g, "/")
              .replace(/^\/+/, "");
            if (!cleanRel || cleanRel.includes("..")) continue;
            const parts = cleanRel.split("/").filter(Boolean);
            const fileName = parts.pop()!;
            let dirHandle = rootHandle;
            for (const part of parts) {
              dirHandle = await dirHandle.getDirectoryHandle(part, { create: true });
            }
            const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(file.content ?? "");
            await writable.close();
          }
          setVsCodeDetails((prev) => ({
            ...prev,
            savedLocally: `Saved ${filesToSave.length} files to local folder "${rootHandle.name}"!`,
          }));
          setNarration(
            `Saved all ${filesToSave.length} project files into your local folder "${rootHandle.name}".`
          );
          return;
        } catch (pickerErr: any) {
          if (pickerErr?.name === "AbortError") {
            return;
          }
          // SecurityError inside cross-origin preview iframe -> fall through to ZIP download
        }
      }

      // 3. Fallback: trigger full workspace ZIP download
      const uidQuery = user?.id ? `&user_id=${encodeURIComponent(user.id)}` : "";
      const downloadUrl =
        data?.downloadUrl ||
        vsCodeDetails.downloadUrl ||
        `/api/projects/download?sessionId=${encodeURIComponent(activeSession || "default")}${uidQuery}`;
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${data?.projectSlug || "vyrexo-workspace"}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setVsCodeDetails((prev) => ({
        ...prev,
        savedLocally: `Downloaded full project archive (${filesToSave.length} files). Extract into your local folder or run the 1-Click Desktop Sync command below!`,
      }));
    } catch (err: any) {
      console.warn("Local folder save error:", err);
    } finally {
      setSavingLocalFolder(false);
    }
  }, [activeProject, activeSession, codeEvents, ideTargetPathInput, sessions, user?.id, vsCodeDetails]);

  const handleLaunchIDE = useCallback(
    async (ide: "vscode" | "cursor" | "windsurf" | "vscode-insiders") => {
      setLaunchingIde(ide);
      const ideDisplayName =
        ide === "cursor"
          ? "Cursor"
          : ide === "windsurf"
          ? "Windsurf"
          : ide === "vscode-insiders"
          ? "VS Code Insiders"
          : "VS Code";
      const rawTarget = (ideTargetPathInput || vsCodeDetails.targetPath || activeProject?.path || "").trim();
      const targetPath =
        rawTarget === "." || rawTarget.startsWith("/app/applet") || rawTarget.startsWith("/workspaces/")
          ? ""
          : rawTarget;
      const eventFiles = codeEvents
        .filter((e) => e.kind === "action" && e.path && typeof e.content === "string" && !e.path.endsWith(".code-workspace"))
        .map((e) => ({ path: e.path!, content: e.content! }));
      const cached = getSessionFilesFromCache(activeSession || "");
      const currentFiles =
        (vsCodeDetails.files && vsCodeDetails.files.length > 0
          ? vsCodeDetails.files
          : eventFiles.length > 0
          ? eventFiles
          : cached?.files) || [];
      const rawTitle =
        activeProject?.name ||
        vsCodeDetails.projectName ||
        cached?.projectName ||
        sessions.find((s) => s.id === activeSession)?.name ||
        undefined;
      const sessionTitle =
        rawTitle && rawTitle !== "New Session" && !/^session-\d+$/i.test(rawTitle)
          ? rawTitle
          : undefined;

      const initialFolderName =
        targetPath.replace(/[\\/]+$/, "").split(/[\\/]/).pop() ||
        vsCodeDetails.localFolderName ||
        sessions.find((s) => s.id === activeSession)?.name ||
        vsCodeDetails.projectSlug ||
        "amaze";
      let resolvedFolderPath = (
        targetPath ||
        vsCodeDetails.targetPath ||
        `C:\\Users\\hp\\OneDrive\\Desktop\\${initialFolderName}`
      ).trim();

      try {
        // 1. Immediately sync files to local folder on user's disk while user-gesture activation is fresh!
        // This handles BOTH existing empty local folders (e.g. "amaze") AND cloud-generated projects that don't exist locally yet.
        const initialSync = await syncSessionFilesToLocalDisk({
          sessionId: activeSession || "default",
          folderName: initialFolderName,
          targetPath: resolvedFolderPath,
          files: currentFiles,
          promptIfMissing: true,
        });
        if (initialSync.actualTargetPath) {
          resolvedFolderPath = initialSync.actualTargetPath;
          setIdeTargetPathInput(resolvedFolderPath);
        }

        // 2. Fetch full materialized file tree from backend (includes package.json, tsconfig.json, README.md, tests, etc.)
        const res = await fetch("/api/projects/vscode", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(user?.id ? { "x-user-id": user.id } : {}) },
          body: JSON.stringify({
            path: resolvedFolderPath || undefined,
            sessionId: activeSession || "",
            user_id: user?.id,
            title: sessionTitle,
            files: currentFiles.length > 0 ? currentFiles : undefined,
            ide,
            localAgentUrl: "http://127.0.0.1:4040",
          }),
        });
        const data = await res.json();
        const filesToSync =
          (Array.isArray(data?.files) && data.files.length > 0 ? data.files : currentFiles) || [];
        const projectName = data?.projectName || vsCodeDetails.projectName || sessionTitle || "Project Workspace";
        const localFolderName =
          initialSync.actualFolderName ||
          data?.localFolderName ||
          vsCodeDetails.localFolderName ||
          sessions.find((s) => s.id === activeSession)?.name ||
          data?.projectSlug ||
          "amaze";

        if (activeSession && filesToSync.length > 0) {
          saveSessionFilesToCache(activeSession, filesToSync, {
            projectName,
            localFolderName,
            targetPath: resolvedFolderPath,
          });
        }

        // Ensure any additional scaffold files returned by the backend (tsconfig.json, README.md, package.json) are also written to the local folder handle
        if (filesToSync.length > 0) {
          const finalSync = await syncSessionFilesToLocalDisk({
            sessionId: activeSession || "default",
            folderName: localFolderName,
            targetPath: resolvedFolderPath,
            files: filesToSync,
            promptIfMissing: false,
          });
          if (finalSync.actualTargetPath) {
            resolvedFolderPath = finalSync.actualTargetPath;
            setIdeTargetPathInput(resolvedFolderPath);
          }
        }

        // 3. Also attempt Local Desktop Bridge (127.0.0.1:4040) if running
        try {
          const agentRes = await fetch("http://127.0.0.1:4040/api/vscode/open", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path: resolvedFolderPath || data?.targetPath,
              localFolderName,
              projectSlug: data?.projectSlug || vsCodeDetails.projectSlug,
              sessionId: activeSession || "default",
              ide,
              projectName,
              files: filesToSync,
              reuseWindow: false,
              openIde: true,
            }),
            signal: AbortSignal.timeout(1500),
          });
          if (agentRes.ok) {
            const agentData = await agentRes.json().catch(() => null);
            if (agentData?.ok) {
              const syncedLocalPath = agentData.targetPath || agentData.path;
              if (syncedLocalPath) {
                setIdeTargetPathInput(syncedLocalPath);
              }
              if (agentData.cliLaunched === false && agentData.vscodeUri && typeof window !== "undefined") {
                const anchor = document.createElement("a");
                anchor.href = agentData.vscodeUri;
                anchor.style.display = "none";
                document.body.appendChild(anchor);
                anchor.click();
                setTimeout(() => {
                  try { document.body.removeChild(anchor); } catch {}
                }, 300);
              }
              setVsCodeDetails((prev) => ({
                ...prev,
                bridgeConnected: true,
                targetPath: syncedLocalPath || prev.targetPath,
              }));
              setNarration(
                `Opened ${projectName} (${filesToSync.length} files) in ${ideDisplayName}.`
              );
              return;
            }
          }
        } catch {}

        // 4. Trigger native desktop IDE URI scheme to open the populated folder directly
        const triggerDesktopUriScheme = (uriToOpen: string) => {
          if (typeof document === "undefined") return;
          const anchor = document.createElement("a");
          anchor.href = uriToOpen;
          anchor.style.display = "none";
          document.body.appendChild(anchor);
          anchor.click();
          setTimeout(() => {
            try {
              document.body.removeChild(anchor);
            } catch {}
          }, 300);
        };

        const schemeName = ide === "vscode-insiders" ? "vscode-insiders" : ide;
        if (
          !resolvedFolderPath ||
          resolvedFolderPath.startsWith("~/") ||
          resolvedFolderPath.startsWith("~\\") ||
          resolvedFolderPath.startsWith("/app/applet") ||
          resolvedFolderPath.startsWith("/workspaces/")
        ) {
          const tail = resolvedFolderPath.startsWith("~")
            ? resolvedFolderPath.replace(/^~[\\/]+(?:Desktop|VyrexoWorkspaces)?[\\/]?/i, "")
            : "";
          resolvedFolderPath = `C:\\Users\\hp\\OneDrive\\Desktop\\${tail || localFolderName}`;
        }

        setIdeTargetPathInput(resolvedFolderPath);

        const normalizedLocal = resolvedFolderPath.replace(/\\/g, "/").replace(/\/+$/, "");
        const formattedPath = normalizedLocal.startsWith("/") ? normalizedLocal : `/${normalizedLocal}`;
        const fullFolderUri = `${schemeName}://file${formattedPath}`;
        triggerDesktopUriScheme(fullFolderUri);

        setVsCodeDetails((prev) => ({
          ...prev,
          targetPath: resolvedFolderPath,
          bridgeConnected: initialSync.synced || prev.bridgeConnected,
        }));
        setNarration(`Opened "${resolvedFolderPath}" in ${ideDisplayName}.`);
      } catch (err) {
        console.error("Failed to launch IDE:", err);
      } finally {
        setTimeout(() => setLaunchingIde(null), 900);
      }
    },
    [ideTargetPathInput, vsCodeDetails, activeProject, activeSession, codeEvents, sessions, user?.id]
  );

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
      const fastResult = checkClientFastPath(text, userProfile.username);
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
        unlockAudioPlayback();
        primeSpeechSynthesis();
        setOrbState("thinking");
        playUnifiedVoice(fastResult.spoken, fastResult.emotion || "warm", text);
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
  }, [textInput, attachedImages, attachedDocs, attachedVideo, sendMessage, unmuteAudio, recordAiSpeech, handleInterruptVoice, playUnifiedVoice, userProfile.username]);

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
          userProfile={userProfile}
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
            <a
              href="/settings?tab=profile"
              className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-[var(--border2)] bg-[var(--surface)] hover:border-[var(--steel)] hover:bg-[#3B599812] transition-all cursor-pointer shadow-sm group"
              title="Open Profile & Rex Personalization Settings"
            >
              <div
                className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 shadow-sm"
                style={{ background: "linear-gradient(135deg, #3B5998, #7B93B0)" }}
              >
                {(
                  userProfile.username?.[0] ||
                  userProfile.fullName?.[0] ||
                  user.user_metadata?.username?.[0] ||
                  user.user_metadata?.full_name?.[0] ||
                  user.email?.[0] ||
                  "U"
                ).toUpperCase()}
              </div>
              <span className="text-xs text-[var(--text)] font-medium pr-1 group-hover:text-[var(--ice)] transition-colors">
                {userProfile.username ||
                  userProfile.fullName ||
                  user.user_metadata?.username ||
                  user.user_metadata?.full_name ||
                  user.email}
              </span>
            </a>
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
            Settings
          </a>

          <div className="absolute bottom-4 right-5 text-[10px] text-[var(--border2)]">Vyrexo v0.1.0</div>
        </div>
        <ConnectProjectModal
          isOpen={connectProjectModalOpen}
          onClose={() => setConnectProjectModalOpen(false)}
          onSelectProject={handleSelectProjectFromModal}
          onSwitchSession={handleSessionClick}
          onEnsureSession={createSession}
          onDisconnectProject={handleDisconnectProject}
          currentProjectPath={activeProject?.path}
          sessionId={activeSession || undefined}
          userId={user?.id}
        />
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
        userProfile={userProfile}
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

      <div className="flex-1 flex flex-col min-w-[340px] relative overflow-hidden">
        {/* Top Navigation Bar - strictly contained within center area, cannot collide or submerge into right sidebar */}
        <header className="h-12 flex-shrink-0 flex items-center justify-between px-3 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-xl z-20 overflow-hidden min-w-0">
          {/* Left: Sidebar toggle + Mode + Connect project */}
          <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-[30px] h-[30px] rounded-[7px] border border-[var(--border2)] bg-[var(--border)] text-[var(--icon)] flex items-center justify-center hover:border-[var(--steel)] hover:text-[var(--steel)] hover:bg-[var(--steel-dim)] transition-all flex-shrink-0 cursor-pointer"
              title="Toggle sidebar"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18" />
              </svg>
            </button>

            <ModeIndicator mode={mode} />

            <button
              onClick={handleConnectProject}
              title={activeProject ? `Working in ${activeProject.path} — click to change` : "Connect a project folder"}
              className={`flex items-center gap-[5px] text-[11px] font-medium px-2.5 py-[4px] rounded-md border transition-all max-w-[170px] truncate cursor-pointer ${
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
          </div>

          {/* Right: Status + Voice + Theme + Actions + Right panel toggle */}
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
            {/* WS Connection dot */}
            <div className="hidden 2xl:flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--border)] text-[11px] text-[var(--muted2)]">
              <div className={`w-[6px] h-[6px] rounded-full ${wsStatus === "connected" ? "bg-[#22c55e] shadow-[0_0_6px_#22c55e88]" : wsStatus === "connecting" ? "bg-yellow-500 animate-pulse" : "bg-red-500"}`} />
              <span className="capitalize">{wsStatus}</span>
            </div>

            {/* Wake Word indicator */}
            <div className="hidden 2xl:flex items-center gap-1.5 text-[10.5px] px-2 py-1 rounded-md bg-[var(--border)] border border-[var(--border2)] text-[var(--muted2)]">
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

            <a
              href="/settings"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-[7px] border border-[#3B599833] bg-[#3B599812] hover:bg-[#3B599825] text-[11px] font-medium text-[var(--ice)] transition-all flex-shrink-0"
              title={`Rex Voice Identity: ${getEmotionStateMeta(activeEmotion).label}`}
            >
              <span>🎙️</span>
              <span className="hidden xl:inline font-mono">
                {orbState === "speaking" ? getEmotionStateMeta(activeEmotion).badge : "Voice"}
              </span>
              {orbState === "speaking" && (
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ backgroundColor: getEmotionStateMeta(activeEmotion).auraColor }}
                />
              )}
            </a>

            <button onClick={handleOpenVSCode} className="hidden sm:flex w-[30px] h-[30px] rounded-[7px] border border-[var(--border2)] bg-[var(--border)] items-center justify-center hover:border-[#1e6fff] hover:bg-[#1e6fff15] transition-all p-0 flex-shrink-0 cursor-pointer" title="Open in VS Code">
              <svg width="16" height="16" viewBox="0 0 100 100" fill="none">
                <path d="M71.6 99.1l22.8-11.1c3.4-1.7 5.6-5.1 5.6-8.9V20.9c0-3.8-2.2-7.3-5.6-8.9L71.6.9c-4.3-2.1-9.3-.5-11.8 2.8L27.5 33.5 11.3 21.2c-2.4-1.8-5.8-1.6-7.9.5L.6 24.5c-2.4 2.4-.8 6.5 2.5 6.5h.1l20.3 15.8L3.2 62.6h-.1c-3.3 0-4.9 4.1-2.5 6.5l2.8 2.8c2.1 2.1 5.5 2.3 7.9.5L27.5 60l32.3 29.7c1.8 2.4 4.8 3.6 7.8 3.6 1.3 0 2.7-.3 4-1zM71.6 27.8L44.9 46.8l26.7 19v-38z" fill="#007ACC"/>
              </svg>
            </button>

            <a href="/settings" className="w-[30px] h-[30px] rounded-[7px] border border-[var(--border2)] bg-[var(--border)] flex items-center justify-center hover:border-[var(--steel)] hover:bg-[var(--steel-dim)] transition-all flex-shrink-0 cursor-pointer" title="Settings">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text4)" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </a>

            <button
              onClick={signOut}
              className="w-[30px] h-[30px] rounded-[7px] border border-[var(--border2)] bg-[var(--border)] text-[var(--icon)] flex items-center justify-center hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-500 transition-all cursor-pointer flex-shrink-0"
              title="Sign out"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>

            {/* Toggle Right Panel Button */}
            <button
              onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
              className={`w-[30px] h-[30px] rounded-[7px] border transition-all flex items-center justify-center flex-shrink-0 cursor-pointer ${
                rightPanelCollapsed
                  ? "border-[var(--border2)] bg-[var(--border)] text-[var(--icon)] hover:border-[var(--steel)] hover:text-[var(--steel)]"
                  : "border-[var(--steel)] bg-[#3B59981A] text-[var(--steel)]"
              }`}
              title={rightPanelCollapsed ? "Open right panel" : "Collapse right panel"}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M15 3v18" />
              </svg>
            </button>
          </div>
        </header>

        {/* Orb center */}
        <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden" style={{ background: "radial-gradient(ellipse at center, var(--app-grad-from) 0%, var(--app-grad-to) 70%)" }}>
          <Orb state={orbState} transcript={transcript || undefined} onClick={handleOrbClick} />

          {orbState === "speaking" && (
            <div className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface)]/80 backdrop-blur-md border border-[var(--border2)] text-xs font-medium shadow-sm transition-all animate-fadeIn">
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: getEmotionStateMeta(activeEmotion).auraColor }}
              />
              <span className="text-[var(--text2)] font-mono text-[11px]">
                {getEmotionStateMeta(activeEmotion).label}
              </span>
            </div>
          )}

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
        <ResizeHandle onDelta={handleResizeRightPanel} />
      )}
      <RightPanel
        collapsed={rightPanelCollapsed}
        width={rightPanelWidth}
        projectPath={activeProject?.path && activeProject.path !== "." ? activeProject.path : ""}
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
        hasProjectFiles={
          Boolean(activeProject) ||
          codeEvents.some((e) => e.kind === "action" && e.path) ||
          Boolean(
            activeSession &&
              sessions.find((s) => s.id === activeSession)?.name &&
              sessions.find((s) => s.id === activeSession)?.name !== "New Session"
          )
        }
        projectTitle={
          activeProject?.name ||
          (activeSession ? sessions.find((s) => s.id === activeSession)?.name : undefined)
        }
      />

      {/* VS Code & Desktop IDE Bridge Dialog — Compact */}
      {vsCodeModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setVsCodeModalOpen(false)}
        >
          <div
            className="w-[440px] max-w-[92vw] rounded-2xl border border-[var(--border2)] bg-[var(--surface)] p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border2)]">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-xl bg-[#007ACC]/10 border border-[#007ACC]/20 text-[#007ACC]">
                  <svg width="18" height="18" viewBox="0 0 100 100" fill="none">
                    <path d="M71.6 99.1l22.8-11.1c3.4-1.7 5.6-5.1 5.6-8.9V20.9c0-3.8-2.2-7.3-5.6-8.9L71.6.9c-4.3-2.1-9.3-.5-11.8 2.8L27.5 33.5 11.3 21.2c-2.4-1.8-5.8-1.6-7.9.5L.6 24.5c-2.4 2.4-.8 6.5 2.5 6.5h.1l20.3 15.8L3.2 62.6h-.1c-3.3 0-4.9 4.1-2.5 6.5l2.8 2.8c2.1 2.1 5.5 2.3 7.9.5L27.5 60l32.3 29.7c1.8 2.4 4.8 3.6 7.8 3.6 1.3 0 2.7-.3 4-1zM71.6 27.8L44.9 46.8l26.7 19v-38z" fill="#007ACC"/>
                  </svg>
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-[var(--text)]">Open in IDE</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e6fff18] text-[#1e6fff] border border-[#1e6fff30] font-medium">
                      {vsCodeDetails.filesCount || (vsCodeDetails.files?.length || 0)} files
                    </span>
                  </div>
                  <p className="text-[10.5px] text-[var(--muted2)]">
                    Session: <span className="text-[var(--text2)] font-mono">{sessions.find(s => s.id === activeSession)?.name || activeSession || "Current"}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVsCodeModalOpen(false)}
                className="w-6 h-6 rounded-lg border border-[var(--border2)] bg-[var(--surface2)] text-[var(--muted2)] hover:text-[var(--text)] flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[10.5px] font-medium text-[var(--muted2)]">Local Folder Path</label>
                </div>
                <div className="mt-1 flex items-center gap-2 p-1.5 rounded-lg bg-[var(--input)] border border-[var(--border2)] font-mono text-[11px] text-[var(--text)]">
                  <input
                    type="text"
                    value={ideTargetPathInput}
                    onChange={(e) => setIdeTargetPathInput(e.target.value)}
                    placeholder="C:\Users\hp\OneDrive\Desktop\amaze"
                    className="flex-1 bg-transparent border-none outline-none text-[11px] font-mono text-[var(--text)]"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(ideTargetPathInput || vsCodeDetails.targetPath || activeProject?.path || "");
                      setVsCodeDetails((prev) => ({ ...prev, copied: true }));
                      setTimeout(() => setVsCodeDetails((prev) => ({ ...prev, copied: false })), 2000);
                    }}
                    className="px-2 py-0.5 bg-[var(--surface2)] hover:bg-[var(--border2)] text-[10px] rounded border border-[var(--border2)] text-[var(--text3)] flex-shrink-0 cursor-pointer"
                  >
                    {vsCodeDetails.copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10.5px] font-medium text-[var(--muted2)]">
                  Select IDE
                </label>
                <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* VS Code */}
                  <button
                    type="button"
                    onClick={() => handleLaunchIDE("vscode")}
                    disabled={launchingIde !== null}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-[var(--border2)] bg-[var(--surface2)] hover:border-[#007ACC] hover:bg-[#007ACC]/10 transition-all text-center group cursor-pointer disabled:opacity-50"
                  >
                    <span className="text-xs font-semibold text-[var(--text)] group-hover:text-[#007ACC] flex items-center gap-1">
                      {launchingIde === "vscode" && <span className="animate-spin inline-block w-2.5 h-2.5 border border-[#007ACC] border-t-transparent rounded-full" />}
                      VS Code
                    </span>
                    <span className="text-[9px] text-[var(--muted)] mt-0.5">
                      {launchingIde === "vscode" ? "Opening..." : "Full Workspace"}
                    </span>
                  </button>

                  {/* Cursor */}
                  <button
                    type="button"
                    onClick={() => handleLaunchIDE("cursor")}
                    disabled={launchingIde !== null}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-[var(--border2)] bg-[var(--surface2)] hover:border-[#7c3aed] hover:bg-[#7c3aed]/10 transition-all text-center group cursor-pointer disabled:opacity-50"
                  >
                    <span className="text-xs font-semibold text-[var(--text)] group-hover:text-[#a78bfa] flex items-center gap-1">
                      {launchingIde === "cursor" && <span className="animate-spin inline-block w-2.5 h-2.5 border border-[#a78bfa] border-t-transparent rounded-full" />}
                      Cursor
                    </span>
                    <span className="text-[9px] text-[var(--muted)] mt-0.5">
                      {launchingIde === "cursor" ? "Opening..." : "AI Editor"}
                    </span>
                  </button>

                  {/* Windsurf */}
                  <button
                    type="button"
                    onClick={() => handleLaunchIDE("windsurf")}
                    disabled={launchingIde !== null}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-[var(--border2)] bg-[var(--surface2)] hover:border-[#06b6d4] hover:bg-[#06b6d4]/10 transition-all text-center group cursor-pointer disabled:opacity-50"
                  >
                    <span className="text-xs font-semibold text-[var(--text)] group-hover:text-[#22d3ee] flex items-center gap-1">
                      {launchingIde === "windsurf" && <span className="animate-spin inline-block w-2.5 h-2.5 border border-[#22d3ee] border-t-transparent rounded-full" />}
                      Windsurf
                    </span>
                    <span className="text-[9px] text-[var(--muted)] mt-0.5">
                      {launchingIde === "windsurf" ? "Opening..." : "Codeium"}
                    </span>
                  </button>

                  {/* VS Code Insiders */}
                  <button
                    type="button"
                    onClick={() => handleLaunchIDE("vscode-insiders")}
                    disabled={launchingIde !== null}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-[var(--border2)] bg-[var(--surface2)] hover:border-[#10b981] hover:bg-[#10b981]/10 transition-all text-center group cursor-pointer disabled:opacity-50"
                  >
                    <span className="text-xs font-semibold text-[var(--text)] group-hover:text-[#10b981] flex items-center gap-1">
                      {launchingIde === "vscode-insiders" && <span className="animate-spin inline-block w-2.5 h-2.5 border border-[#10b981] border-t-transparent rounded-full" />}
                      Insiders
                    </span>
                    <span className="text-[9px] text-[var(--muted)] mt-0.5">
                      {launchingIde === "vscode-insiders" ? "Opening..." : "Pre-release"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <a
                  href={
                    vsCodeDetails.vscodeServerUrl ||
                    `/vscode?sessionId=${encodeURIComponent(activeSession || "")}${user?.id ? `&user_id=${encodeURIComponent(user.id)}` : ""}`
                  }
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-[#007ACC]/50 bg-[#007ACC]/20 hover:bg-[#007ACC]/30 text-xs text-[#38bdf8] font-semibold transition-all"
                >
                  VS Code Server ({vsCodeDetails.filesCount || vsCodeDetails.files?.length || 0} files)
                </a>
                <button
                  onClick={() => setVsCodeModalOpen(false)}
                  className="px-4 py-2 bg-[var(--midnight)] text-white text-xs font-medium rounded-xl hover:bg-[var(--steel)] transition-all cursor-pointer"
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
        onSwitchSession={handleSessionClick}
        onEnsureSession={createSession}
        onDisconnectProject={handleDisconnectProject}
        currentProjectPath={activeProject?.path}
        sessionId={activeSession || undefined}
        userId={canonicalUserKey || user?.id}
      />
    </div>
  );
}
