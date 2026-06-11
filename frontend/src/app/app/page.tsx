"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sidebar, type Session } from "@/components/shared/Sidebar";
import { Orb, type OrbState } from "@/components/voice/Orb";
import { type AgentStep } from "@/components/agents/AgentTimeline";
import { ModeIndicator } from "@/components/shared/ModeIndicator";
import { RightPanel, type RightTab, type CodeEvent } from "@/components/shared/RightPanel";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useVoice } from "@/hooks/useVoice";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useAuth } from "@/lib/auth-context";
import type { ServerMessage } from "@/lib/ws-protocol";

const DEMO_SESSIONS: Record<string, Session[]> = {
  Today: [
    { id: "session-1", name: "New Session", icon: "\u{1F680}", status: "active", time: "now" },
  ],
};

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
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [transcript, setTranscript] = useState("");
  const [mode, setMode] = useState("normal");
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [narration, setNarration] = useState("Say 'Rex' to start, or click the orb");
  const [textInput, setTextInput] = useState("");
  const [chatLog, setChatLog] = useState<Array<{ role: string; text: string }>>([]);

  // Right panel: 4 tabs (Chat / Code / Task / Preview)
  const [activeRightTab, setActiveRightTab] = useState<RightTab>("task");
  const [codeEvents, setCodeEvents] = useState<CodeEvent[]>([]);
  const [previewUrl, setPreviewUrl] = useState("");

  // Connected project — all agent tasks for the session run inside this folder.
  const [activeProject, setActiveProject] = useState<{ path: string; name: string } | null>(null);
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
  const { beginUtterance, pushChunk, endUtterance, stop: stopAudio } = useAudioPlayer();

  // ── WebSocket: handles all server events ────────────────────
  const onServerMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case "voice.transcription.partial":
        setTranscript(msg.payload.text as string);
        break;

      case "voice.transcription.final":
        setTranscript(msg.payload.text as string);
        break;

      case "voice.output.start":
      case "voice.output.started":
        beginUtterance();
        setOrbState("speaking");
        break;

      case "voice.output.end":
      case "voice.output.completed":
        endUtterance();
        break;

      case "agent.narration": {
        // Live "what Rex is doing right now" — shows in the narration box only,
        // NOT in the chat log (chat is reserved for actual conversation turns).
        const narrText = (msg.payload.text as string) || "";
        if (narrText) setNarration(narrText);
        setOrbState("speaking");
        break;
      }

      case "conversation.turn.completed": {
        // This is Rex's reply for the turn. The full (possibly long, markdown)
        // text goes into the Chat tab; the narration box keeps a short line.
        const responseText = (msg.payload.text as string) || "";
        if (responseText.trim()) {
          setChatLog((prev) => [...prev, { role: "assistant", text: responseText }]);
          const isReport = responseText.length > 180 || responseText.includes("\n");
          if (isReport) {
            setNarration("Done — the details are in the Chat tab.");
            setActiveRightTab("chat");
          } else {
            setNarration(responseText);
          }
        }
        setOrbState("speaking");
        // Backend streams the synthesized audio over the WS; no browser TTS fallback.
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
        // A tool the agent ran (file read/write, command, git op) — feeds Code tab.
        setCodeEvents((prev) => [
          ...prev,
          {
            kind: "action",
            agent: msg.payload.agent as string,
            tool: msg.payload.tool as string,
            category: msg.payload.category as string,
            path: msg.payload.path as string,
            command: msg.payload.command as string,
            message: msg.payload.message as string,
          },
        ]);
        break;
      }

      case "execution.output": {
        const out = (msg.payload.output as string) || (msg.payload.text as string) || "";
        if (out) setCodeEvents((prev) => [...prev, { kind: "output", text: out }]);
        break;
      }

      case "project.loaded": {
        if (msg.payload.ok) {
          const name = (msg.payload.name as string) || "project";
          const path = (msg.payload.path as string) || "";
          const files = (msg.payload.files_indexed as number) ?? 0;
          setActiveProject({ path, name });
          setProjectBound(true);
          try {
            localStorage.setItem("vyrexo_project", JSON.stringify({ path, name }));
          } catch {}
          setNarration(`Connected to ${name}${files ? ` — indexed ${files} file${files === 1 ? "" : "s"}` : ""}. Everything I build now happens in this project.`);
        } else {
          setActiveProject(null);
          setProjectBound(false);
          sentProjectPathRef.current = "";
          try { localStorage.removeItem("vyrexo_project"); } catch {}
          setNarration((msg.payload.error as string) || "Couldn't connect that project.");
        }
        break;
      }

      case "mode.changed":
        setMode(msg.payload.to as string);
        break;

      case "error":
        setNarration(`Error: ${msg.payload.message || "Something went wrong"}`);
        setOrbState("idle");
        break;
    }
  }, [beginUtterance, endUtterance]);

  const onAudioMessage = useCallback((data: ArrayBuffer) => {
    // Every binary frame from the backend is an MP3 chunk for the current utterance
    pushChunk(data);
  }, [pushChunk]);

  const { status: wsStatus, connect, disconnect, sendMessage } = useWebSocket({
    sessionId: activeSession || "default",
    onMessage: onServerMessage,
    onAudio: onAudioMessage,
  });

  // Voice synthesis is now driven by the backend (Edge-TTS streamed over WebSocket).
  // The browser SpeechSynthesisUtterance fallback is no longer used; the chosen voice
  // and speed flow from the Settings page through a voice.config WebSocket message.

  // ── Voice: wake word "Rex" + continuous conversation ────────
  const handleVoiceTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      setTranscript(text);
      if (isFinal && text.trim()) {
        const final = text.trim();
        // Barge-in: if Rex is mid-sentence and the user speaks, talking over it
        // means "stop and listen to me" — kill local audio and tell the backend
        // to interrupt before sending the new instruction.
        if (speakingRef.current) {
          stopAudio();
          sendMessage({ type: "execution.interrupt", payload: {} });
        }
        setPendingProposal(null); // a spoken reply answers any pending proposal
        setChatLog((prev) => [...prev, { role: "user", text: final }]);
        sendMessage({ type: "text.input", payload: { text: final } });
        // Optimistic UI: show "thinking" + a placeholder line so the user sees
        // their words landed instantly while the backend round-trip happens.
        setOrbState("thinking");
        setNarration("Thinking...");
        setTranscript("");
      }
    },
    [sendMessage, stopAudio]
  );

  const handleActivated = useCallback(() => {
    setOrbState("listening");
    setNarration("I'm listening...");
    setTranscript("");
  }, []);

  const handleDeactivated = useCallback(() => {
    setOrbState("idle");
    setNarration("Say 'Rex' to start, or click the orb");
  }, []);

  const { mode: voiceMode, hasPermission, startListening, stopListening, forceActivate } =
    useVoice({
      onTranscript: handleVoiceTranscript,
      onActivated: handleActivated,
      onDeactivated: handleDeactivated,
    });

  // ── Session management ──────────────────────────────────────
  const handleSessionClick = useCallback(
    (id: string) => {
      if (activeSession) disconnect();
      setActiveSession(id);
      setSteps([]);
      setNarration("Connecting...");
      setChatLog([]);
      setCodeEvents([]);
      setTranscript("");
    },
    [activeSession, disconnect]
  );

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
      setNarration("Connected! Say 'Rex' to start, or click the orb");

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
              voice: prefs.voice || "american_male",
              rate: rateMap[prefs.speed] || "+0%",
            },
          });
        }
      } catch {
        // Settings not set yet; backend will use default voice
      }
    } else if (wsStatus === "connecting") {
      setNarration("Connecting to Vyrexo...");
    }
  }, [wsStatus, sendMessage]);

  // Restore a previously connected project on load so tasks stay scoped to it.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vyrexo_project");
      if (saved) {
        const p = JSON.parse(saved);
        if (p?.path) setActiveProject({ path: p.path, name: p.name || "project" });
      }
    } catch {}
  }, []);

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
    setChatLog((prev) => [...prev, { role: "user", text }]);
    sendMessage({ type: "text.input", payload: { text } });
    setOrbState("thinking");
    setNarration("On it — let me get started.");
  }, [pendingCmd, wsStatus, projectBound, sendMessage]);

  // ── Project + VS Code ────────────────────────────────────────
  // Browsers cannot expose an absolute filesystem path, so the directory
  // picker is used (when available) only to suggest a folder name; the user
  // confirms the absolute path. The backend validates it, indexes it, and
  // scopes every subsequent task in this session to that folder.
  const handleConnectProject = useCallback(async () => {
    let suggestedName = "";
    try {
      if ("showDirectoryPicker" in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        suggestedName = dirHandle.name || "";
      }
    } catch {
      return; // user dismissed the picker
    }

    let lastBase = "";
    try {
      lastBase = localStorage.getItem("vyrexo_project_base") || "";
    } catch {}

    const def =
      activeProjectRef.current?.path ||
      (lastBase && suggestedName ? `${lastBase}\\${suggestedName}` : suggestedName);

    const entered = prompt("Full path to your project folder (e.g. C:\\Users\\you\\my-app):", def);
    if (!entered || !entered.trim()) return;

    const path = entered.trim();
    const name = path.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || "project";

    // Remember the parent directory to pre-fill the prompt next time.
    try {
      const base = path.replace(/[\\/]+$/, "").slice(0, -name.length).replace(/[\\/]+$/, "");
      if (base) localStorage.setItem("vyrexo_project_base", base);
    } catch {}

    setActiveProject({ path, name });
    setNarration(`Connecting to ${name}...`);
    sentProjectPathRef.current = ""; // force a (re)send of the new path

    if (!activeSession) {
      // Start a session; the WS-connected effect binds the project once open.
      handleSessionClick(`session-${Date.now()}`);
    } else if (wsStatus === "connected") {
      sentProjectPathRef.current = path;
      sendMessage({ type: "project.set", payload: { path } });
    }
  }, [activeSession, wsStatus, sendMessage, handleSessionClick]);

  const handleOpenVSCode = useCallback(async () => {
    try {
      await fetch("http://127.0.0.1:8001/api/projects/vscode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: activeProject?.path || "." }),
      });
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
      if (!activeSession) handleSessionClick(`session-${Date.now()}`);
    },
    [activeSession, handleConnectProject, handleSessionClick]
  );

  // ── Text input ──────────────────────────────────────────────
  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim()) return;
    const text = textInput.trim();
    setPendingProposal(null); // any typed message supersedes a pending yes/no
    setChatLog((prev) => [...prev, { role: "user", text }]);
    sendMessage({ type: "text.input", payload: { text } });
    setTranscript(text);
    setTextInput("");
    setOrbState("thinking");
  }, [textInput, sendMessage]);

  // Answer a yes/no proposal from Rex (e.g. "implement these fixes?").
  const respondToProposal = useCallback(
    (accept: boolean) => {
      const text = accept ? "yes" : "no";
      setPendingProposal(null);
      setChatLog((prev) => [...prev, { role: "user", text }]);
      sendMessage({ type: "text.input", payload: { text } });
      setOrbState("thinking");
      setNarration(accept ? "On it — implementing the fixes now." : "Okay, leaving the code as is.");
    },
    [sendMessage]
  );

  // ── Keyboard shortcuts ──────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return; // Don't capture when typing

      if (e.code === "Space") {
        e.preventDefault();
        forceActivate();
      }
      if (e.code === "Escape") {
        stopAudio();
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
  }, [forceActivate, sendMessage, stopAudio]);

  // ── Loading / Auth guard ────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "#07070a" }}>
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
          sessions={DEMO_SESSIONS}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onSessionClick={handleSessionClick}
          onNewSession={() => handleSessionClick(`session-${Date.now()}`)}
        />
        <div
          className="flex-1 flex flex-col items-center justify-center relative"
          style={{ background: "radial-gradient(ellipse at center, #0a0e1a 0%, #07070a 65%)" }}
        >
          {/* User profile */}
          <div className="absolute top-4 right-5 flex items-center gap-3">
            <button onClick={signOut} className="text-[11px] text-[var(--muted)] hover:text-[var(--text3)] transition-colors">
              Sign out
            </button>
            <div className="flex items-center gap-2 px-3 py-[5px] rounded-full border border-transparent hover:border-[#27272a] hover:bg-[#ffffff08] transition-all">
              <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #3B5998, #7B93B0)" }}>
                {user.user_metadata?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
              </div>
              <span className="text-[13px] text-[var(--text2)] font-medium">
                {user.user_metadata?.full_name || user.email?.split("@")[0]}
              </span>
            </div>
          </div>

          <Orb state="idle" onClick={() => handleSessionClick(`session-${Date.now()}`)} />

          <div className="mt-9 text-center">
            <h2 className="text-[22px] font-semibold text-[#e4e4e7]">What are we building?</h2>
            <p className="mt-2 text-sm text-[var(--muted2)]">Click the orb or select a session to start</p>
          </div>

          {/* Quick actions */}
          <div className="flex gap-[10px] mt-10">
            {QUICK_ACTIONS.map((action) => (
              <div
                key={action.title}
                onClick={() => runQuickAction(action)}
                className="p-[10px_16px] bg-[#0e0e14] border border-[var(--border2)] rounded-[10px] cursor-pointer max-w-[180px] hover:border-[#3B599833] hover:bg-[#3B599808] transition-all"
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

          <div className="absolute bottom-4 right-5 text-[10px] text-[#27272a]">Vyrexo v0.1.0</div>
        </div>
      </div>
    );
  }

  // ── Active session ──────────────────────────────────────────
  return (
    <div className="flex h-screen">
      <Sidebar
        sessions={DEMO_SESSIONS}
        activeSessionId={activeSession}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSessionClick={handleSessionClick}
        onNewSession={() => handleSessionClick(`session-${Date.now()}`)}
      />

      <div className="flex-1 flex flex-col relative">
        {/* Toggle left */}
        <div className="absolute top-3 left-3 z-50">
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="w-[30px] h-[30px] rounded-[7px] border border-[#27272a] bg-[var(--border)] text-[var(--text4)] flex items-center justify-center hover:border-[var(--steel)] hover:text-[var(--steel)] hover:bg-[var(--steel-dim)] transition-all">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>
          </button>
        </div>

        {/* Floating bar */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-[10px] px-[14px] py-[5px] bg-[#0a0a0f99] backdrop-blur-xl border border-[var(--border2)] rounded-xl">
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
          <span className="text-[10px] text-[var(--muted)] px-1.5 py-0.5 rounded bg-[var(--border)] border border-[var(--border2)]">
            {voiceMode === "active_conversation" ? "Voice Active" : voiceMode === "waiting_for_wake" ? "Say 'Rex'" : "Voice Off"}
          </span>
          <button onClick={handleOpenVSCode} className="w-[30px] h-[30px] rounded-[7px] border border-[#27272a] bg-[var(--border)] flex items-center justify-center hover:border-[#1e6fff] hover:bg-[#1e6fff15] transition-all p-0" title="Open in VS Code">
            <svg width="16" height="16" viewBox="0 0 100 100" fill="none">
              <path d="M71.6 99.1l22.8-11.1c3.4-1.7 5.6-5.1 5.6-8.9V20.9c0-3.8-2.2-7.3-5.6-8.9L71.6.9c-4.3-2.1-9.3-.5-11.8 2.8L27.5 33.5 11.3 21.2c-2.4-1.8-5.8-1.6-7.9.5L.6 24.5c-2.4 2.4-.8 6.5 2.5 6.5h.1l20.3 15.8L3.2 62.6h-.1c-3.3 0-4.9 4.1-2.5 6.5l2.8 2.8c2.1 2.1 5.5 2.3 7.9.5L27.5 60l32.3 29.7c1.8 2.4 4.8 3.6 7.8 3.6 1.3 0 2.7-.3 4-1zM71.6 27.8L44.9 46.8l26.7 19v-38z" fill="#007ACC"/>
            </svg>
          </button>
          <a href="/settings" className="w-[30px] h-[30px] rounded-[7px] border border-[#27272a] bg-[var(--border)] flex items-center justify-center hover:border-[var(--steel)] hover:bg-[var(--steel-dim)] transition-all" title="Settings">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text4)" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </a>
        </div>

        {/* Toggle right */}
        <div className="absolute top-3 right-3 z-50">
          <button onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)} className="w-[30px] h-[30px] rounded-[7px] border border-[#27272a] bg-[var(--border)] text-[var(--text4)] flex items-center justify-center hover:border-[var(--steel)] hover:text-[var(--steel)] hover:bg-[var(--steel-dim)] transition-all">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/></svg>
          </button>
        </div>

        {/* Orb center */}
        <div className="flex-1 flex flex-col items-center justify-center" style={{ background: "radial-gradient(ellipse at center, #0a0e1a 0%, #07070a 70%)" }}>
          <Orb state={orbState} transcript={transcript || undefined} onClick={forceActivate} />

          {/* Proposal banner — Rex asking to proceed (e.g. implement fixes) */}
          {pendingProposal && (
            <div className="absolute bottom-[100px] left-1/2 -translate-x-1/2 flex items-center gap-3 w-full max-w-[440px] px-4 py-[10px] mx-4 bg-[#0e0e14] border border-[#3B599840] rounded-xl shadow-lg">
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

          {/* Text input */}
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-2 w-full max-w-[400px] px-4">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
              placeholder="Type a command or say 'Rex'..."
              className="flex-1 bg-[#0f0f14] border border-[var(--border2)] rounded-lg py-2 px-3 text-xs text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[#3B599844]"
            />
            <button onClick={handleTextSubmit} className="px-3 py-2 bg-[var(--midnight)] text-white text-xs font-medium rounded-lg hover:bg-[var(--steel)] transition-all">
              Send
            </button>
          </div>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 text-[11px] text-[#27272a]">
            <span><kbd className="bg-[var(--border)] border border-[var(--border2)] rounded px-[6px] py-[1px] text-[10px] text-[var(--muted2)]">Space</kbd> push-to-talk</span>
            <span><kbd className="bg-[var(--border)] border border-[var(--border2)] rounded px-[6px] py-[1px] text-[10px] text-[var(--muted2)]">Esc</kbd> interrupt</span>
          </div>
        </div>
      </div>

      {/* Right panel — 4 tabs: Chat / Code / Task / Preview */}
      <RightPanel
        collapsed={rightPanelCollapsed}
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
          stopAudio();
          try { window.speechSynthesis.cancel(); } catch {}
          sendMessage({ type: "execution.interrupt", payload: {} });
          setOrbState("idle");
          setNarration("Interrupted. What would you like instead?");
        }}
      />
    </div>
  );
}
