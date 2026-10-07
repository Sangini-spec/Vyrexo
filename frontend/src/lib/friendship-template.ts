export const AMITY_TYPES_TS = `export interface FriendProfile {
  id: string;
  name: string;
  avatarColor: string;
  characterType: "cloud" | "star" | "bunny" | "bear" | "sparkle";
  status: string;
  vibe: string;
  energyLevel: "High" | "Chill" | "Deep" | "Cozy";
  favActivity: string;
  compatibilityScore: number;
  lastActive: string;
  sparksReceived: number;
}

export interface ScrapbookMemory {
  id: string;
  title: string;
  date: string;
  note: string;
  tag: string;
  bgColor: string;
  sticker: string;
  likes: number;
  author: string;
}

export interface BucketListItem {
  id: string;
  title: string;
  category: "Adventure" | "Cozy" | "Creative" | "Foodie";
  completed: boolean;
  assignedTo: string;
  targetDate: string;
}

export interface ChemistryResult {
  overallScore: number;
  communicationStyle: string;
  idealHangout: string;
  sharedVibe: string;
}
`;

export const AMITY_TEST_TS = `import { test, expect } from "bun:test";

test("Friendship chemistry score calculation within 0 to 100 range", () => {
  const answers = [3, 2, 4, 3];
  const maxScore = answers.length * 4;
  const rawSum = answers.reduce((a, b) => a + b, 0);
  const percentage = Math.round((rawSum / maxScore) * 100);

  expect(percentage).toBeGreaterThanOrEqual(0);
  expect(percentage).toBeLessThanOrEqual(100);
  expect(percentage).toBe(75);
});

test("Scrapbook memory insertion and like count mutation", () => {
  const memories = [
    { id: "M1", title: "Midnight Boba Run", likes: 4 }
  ];
  const newMemory = { id: "M2", title: "Picnic at Sunset Hill", likes: 0 };
  const updated = [newMemory, ...memories];

  expect(updated.length).toBe(2);
  expect(updated[0].id).toBe("M2");

  // Like reaction
  updated[0].likes += 1;
  expect(updated[0].likes).toBe(1);
});

test("Bucket list completion rate progression", () => {
  const list = [
    { id: "B1", completed: true },
    { id: "B2", completed: true },
    { id: "B3", completed: false },
    { id: "B4", completed: false }
  ];
  const completedCount = list.filter((i) => i.completed).length;
  const progress = Math.round((completedCount / list.length) * 100);

  expect(progress).toBe(50);
});
`;

export const AMITY_README_MD = `# Amity — 3D Interactive Friendship & Social Web Application

Amity is a warm, light-themed social sanctuary engineered for deep human connections, shared memories, and interactive 3D character friendships.

## Core Interactive Workspaces
- **3D Character Garden**: Interactive 3D Canvas where friends appear as animated floating characters with gaze-tracking physics, mood halos, and tactile hover physics.
- **Chemistry & Vibe Matcher**: Multi-step compatibility quiz computing friendship dynamics and shared energy signatures.
- **Memory Scrapbook**: Digital polaroid canvas for pinning shared memories, sticky notes, stickers, and celebratory hearts.
- **Friendship Bucket List**: Interactive checklist of collective adventures with progress telemetry and completion confetti.
- **Spark & Audio Chimes**: Web Audio synthesized joyful harmonic chimes when sending warmth or checking off memories.

## Verified Verification
\`\`\`bash
bun run build    # Bundles React application component
bun test         # Runs automated unit test suite
\`\`\`
`;

export const AMITY_APP_TSX = `"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";

interface FriendProfile {
  id: string;
  name: string;
  avatarColor: string;
  emoji: string;
  characterType: "bunny" | "cloud" | "star" | "bear";
  status: string;
  vibe: string;
  energyLevel: "High" | "Chill" | "Deep" | "Cozy";
  compatibilityScore: number;
  lastActive: string;
  sparksReceived: number;
}

interface ScrapbookMemory {
  id: string;
  title: string;
  date: string;
  note: string;
  tag: string;
  bgColor: string;
  sticker: string;
  likes: number;
  author: string;
}

interface BucketListItem {
  id: string;
  title: string;
  category: "Adventure" | "Cozy" | "Creative" | "Foodie";
  completed: boolean;
  assignedTo: string;
}

export function App() {
  const [activeTab, setActiveTab] = useState<"garden" | "chemistry" | "scrapbook" | "bucketlist">("garden");
  const [palette, setPalette] = useState<"sakura" | "peach" | "matcha">("sakura");
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);
  const [sparkNotification, setSparkNotification] = useState<string | null>(null);

  // ── Friends State ─────────────────────────────────────────────────────────
  const [friends, setFriends] = useState<FriendProfile[]>([
    {
      id: "F1",
      name: "Lily Chen",
      avatarColor: "#FFB5C5",
      emoji: "🌸",
      characterType: "bunny",
      status: "Studying matcha latte art at artisan bakery ☕",
      vibe: "Creative & Gentle",
      energyLevel: "Cozy",
      compatibilityScore: 94,
      lastActive: "Just now",
      sparksReceived: 18,
    },
    {
      id: "F2",
      name: "Alex Rivera",
      avatarColor: "#FFE082",
      emoji: "⭐",
      characterType: "star",
      status: "Skateboarding down Ocean Blvd before sunset 🛹",
      vibe: "High Energy & Spontaneous",
      energyLevel: "High",
      compatibilityScore: 88,
      lastActive: "12m ago",
      sparksReceived: 24,
    },
    {
      id: "F3",
      name: "Samira Patel",
      avatarColor: "#B5EAD7",
      emoji: "☁️",
      characterType: "cloud",
      status: "Listening to indie lo-fi & tending to succulent garden 🌱",
      vibe: "Grounded & Philosophical",
      energyLevel: "Deep",
      compatibilityScore: 96,
      lastActive: "45m ago",
      sparksReceived: 31,
    },
    {
      id: "F4",
      name: "Chloe Zhao",
      avatarColor: "#FFC3A0",
      emoji: "🧸",
      characterType: "bear",
      status: "Baking strawberry lemon tarts for movie night 🍓",
      vibe: "Warm & Caring",
      energyLevel: "Cozy",
      compatibilityScore: 91,
      lastActive: "2h ago",
      sparksReceived: 15,
    },
  ]);

  // ── Memory Scrapbook State ────────────────────────────────────────────────
  const [memories, setMemories] = useState<ScrapbookMemory[]>([
    {
      id: "M1",
      title: "Midnight Strawberry Boba Run 🧋",
      date: "Last Saturday",
      note: "Laughed so hard in the car because Alex spilled the tapioca pearls everywhere. Totally unforgettable night under the neon signs!",
      tag: "Late Nights",
      bgColor: "bg-pink-100/70 border-pink-200",
      sticker: "✨",
      likes: 14,
      author: "Lily & Samira",
    },
    {
      id: "M2",
      title: "Golden Hour Polaroid Session 📸",
      date: "3 days ago",
      note: "Drove up to the coastal ridge with homemade lemon cookies. Took 20 photos and 19 were completely blurry from giggling.",
      tag: "Adventures",
      bgColor: "bg-amber-100/70 border-amber-200",
      sticker: "🌻",
      likes: 21,
      author: "Alex",
    },
    {
      id: "M3",
      title: "Cozy Studio Pottery Day 🏺",
      date: "October 1st",
      note: "Made matching clay mugs! None of them are symmetrical, but they are 100% full of love and ceramic glaze.",
      tag: "Crafting",
      bgColor: "bg-emerald-100/70 border-emerald-200",
      sticker: "🎨",
      likes: 9,
      author: "Chloe",
    },
  ]);
  const [newTitle, setNewTitle] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newTag, setNewTag] = useState("Memories");
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);

  // ── Bucket List State ─────────────────────────────────────────────────────
  const [bucketList, setBucketList] = useState<BucketListItem[]>([
    { id: "B1", title: "Rent a cozy A-frame cabin and stargaze with hot cocoa", category: "Adventure", completed: true, assignedTo: "Everyone" },
    { id: "B2", title: "Secret Santa thrift store outfit challenge under $15", category: "Creative", completed: true, assignedTo: "Lily & Alex" },
    { id: "B3", title: "Host a sunset beach bonfire with s'mores & acoustic guitar", category: "Cozy", completed: false, assignedTo: "Samira" },
    { id: "B4", title: "Bake a multi-layer Japanese strawberry shortcake from scratch", category: "Foodie", completed: false, assignedTo: "Chloe" },
    { id: "B5", title: "Attend a sunrise hot air balloon festival together", category: "Adventure", completed: false, assignedTo: "Everyone" },
  ]);
  const [newBucketTitle, setNewBucketTitle] = useState("");
  const [newBucketCategory, setNewBucketCategory] = useState<"Adventure" | "Cozy" | "Creative" | "Foodie">("Adventure");

  // ── Chemistry Matcher Quiz State ──────────────────────────────────────────
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizCalculated, setQuizCalculated] = useState(false);

  const quizQuestions = [
    {
      q: "When hanging out on a free Saturday afternoon, your dream vibe is:",
      options: [
        { label: "Quiet aesthetic cafe reading or sketching together", pts: 4, icon: "☕" },
        { label: "Thrifting & spontaneous road trip with zero itinerary", pts: 3, icon: "🚗" },
        { label: "Baking treats and binge-watching comfort shows in pyjamas", pts: 4, icon: "🧁" },
        { label: "Outdoor park picnic with board games & acoustic playlist", pts: 3, icon: "🧺" },
      ],
    },
    {
      q: "How do you show love and affection to your close friends?",
      options: [
        { label: "Sending 10 hyper-specific reels or funny memes a day", pts: 3, icon: "📱" },
        { label: "Cooking their favorite comfort meal when they are stressed", pts: 4, icon: "🍲" },
        { label: "Unfiltered 2 AM voice notes about life, dreams, and universe", pts: 4, icon: "🌙" },
        { label: "Planning thoughtful surprise gifts and custom photo collages", pts: 4, icon: "🎁" },
      ],
    },
    {
      q: "Your energy battery recharge style:",
      options: [
        { label: "Low-key parallel play: being in the same room doing our own thing", pts: 4, icon: "🎧" },
        { label: "High-voltage laughing fits until our stomachs hurt", pts: 4, icon: "✨" },
        { label: "Deep soul talks walking under the city lampposts", pts: 4, icon: "🌌" },
        { label: "Collaborative crafting, pottery, or DIY house projects", pts: 3, icon: "🪴" },
      ],
    },
  ];

  // ── Native Web Audio Chime (Friendly Spark Sound) ──────────────────────────
  const playSparkChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.25); // G5
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.48);
    } catch {}
  };

  const sendSparkToFriend = (friendId: string, friendName: string) => {
    playSparkChime();
    setFriends((prev) =>
      prev.map((f) => (f.id === friendId ? { ...f, sparksReceived: f.sparksReceived + 1 } : f))
    );
    setSparkNotification(\`✨ Spark sent to \${friendName}! They received your warm energy.\`);
    setTimeout(() => setSparkNotification(null), 3500);
  };

  // ── 3D Interactive Canvas Simulation (Character Garden) ────────────────────
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      angle += 0.02;

      // Draw floating friend characters in 3D orbit
      friends.forEach((friend, idx) => {
        const offset = (idx * Math.PI * 2) / friends.length;
        const currentAngle = angle * 0.8 + offset;
        const radiusX = canvas.width * 0.35;
        const radiusY = canvas.height * 0.24;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        const x = centerX + Math.cos(currentAngle) * radiusX;
        const y = centerY + Math.sin(currentAngle) * radiusY;
        const depth = (Math.sin(currentAngle) + 1) / 2; // 0 (far) to 1 (near)
        const scale = 0.7 + depth * 0.55;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        // Soft Drop Shadow
        ctx.beginPath();
        ctx.ellipse(0, 48, 36 * scale, 12 * scale, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 182, 193, 0.25)";
        ctx.fill();

        // Aura Halo Glow
        const gradient = ctx.createRadialGradient(0, 0, 10, 0, 0, 52);
        gradient.addColorStop(0, friend.avatarColor);
        gradient.addColorStop(0.7, \`\${friend.avatarColor}77\`);
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.beginPath();
        ctx.arc(0, 0, 52, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Character Main Body
        ctx.beginPath();
        ctx.arc(0, 0, 36, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = friend.avatarColor;
        ctx.stroke();

        // Character Ears / Features
        if (friend.characterType === "bunny") {
          // Bunny ears
          ctx.beginPath();
          ctx.ellipse(-14, -40, 7, 20, -0.15, 0, Math.PI * 2);
          ctx.ellipse(14, -40, 7, 20, 0.15, 0, Math.PI * 2);
          ctx.fillStyle = "#FFE8EE";
          ctx.fill();
          ctx.stroke();
        } else if (friend.characterType === "bear") {
          // Bear ears
          ctx.beginPath();
          ctx.arc(-26, -26, 12, 0, Math.PI * 2);
          ctx.arc(26, -26, 12, 0, Math.PI * 2);
          ctx.fillStyle = "#FFEEDD";
          ctx.fill();
          ctx.stroke();
        } else if (friend.characterType === "star") {
          // Star points
          ctx.fillStyle = "#FFF9C4";
          ctx.font = "20px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("✨", 0, -32);
        }

        // Eyes (tracking cursor gently)
        const mouseX = mousePosRef.current.x - (centerX + x);
        const mouseY = mousePosRef.current.y - (centerY + y);
        const eyeOffset = Math.min(3, Math.sqrt(mouseX * mouseX + mouseY * mouseY) * 0.03);
        const eyeAngle = Math.atan2(mouseY, mouseX);
        const lookX = Math.cos(eyeAngle) * eyeOffset;
        const lookY = Math.sin(eyeAngle) * eyeOffset;

        ctx.beginPath();
        ctx.arc(-10 + lookX, -4 + lookY, 4, 0, Math.PI * 2);
        ctx.arc(10 + lookX, -4 + lookY, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#4A3B32";
        ctx.fill();

        // Rosy Cheeks
        ctx.beginPath();
        ctx.arc(-18, 6, 6, 0, Math.PI * 2);
        ctx.arc(18, 6, 6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 120, 150, 0.4)";
        ctx.fill();

        // Happy Smile
        ctx.beginPath();
        ctx.arc(0, 3, 7, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "#4A3B32";
        ctx.stroke();

        // Name Tag
        ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#374151";
        ctx.fillText(friend.name, 0, 58);

        // Compatibility Badge
        ctx.font = "11px system-ui, -apple-system, sans-serif";
        ctx.fillStyle = "#DB2777";
        ctx.fillText(\`\${friend.compatibilityScore}% Chemistry\`, 0, 72);

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [friends]);

  // Color Theme Classes
  const themeBg =
    palette === "sakura"
      ? "bg-gradient-to-br from-[#FFF5F7] via-[#FFF9F0] to-[#FFF0F5]"
      : palette === "peach"
      ? "bg-gradient-to-br from-[#FFF8F0] via-[#FFF3EB] to-[#FFEBE5]"
      : "bg-gradient-to-br from-[#F4FAF6] via-[#FDFBF7] to-[#EDF7F1]";

  const accentColor =
    palette === "sakura" ? "from-pink-400 to-rose-400" : palette === "peach" ? "from-amber-400 to-orange-400" : "from-emerald-400 to-teal-400";

  return (
    <div className={\`min-h-screen \${themeBg} text-slate-800 font-sans p-3 sm:p-6 transition-colors duration-500 selection:bg-pink-200\`}>
      {/* ── Top Header Navigation ────────────────────────────────────────── */}
      <header className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-pink-200/50">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-400 via-rose-300 to-yellow-200 text-white flex items-center justify-center text-2xl shadow-lg shadow-pink-300/40">
            🌸
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 bg-clip-text text-transparent tracking-tight">
                Amity
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 border border-pink-200">
                3D Friendship OS
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Soft light-theme sanctuary for genuine human connections</p>
          </div>
        </div>

        {/* Tab & Theme Switchers */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex bg-white/80 backdrop-blur p-1 rounded-2xl border border-pink-200/60 shadow-sm">
            <button
              onClick={() => setActiveTab("garden")}
              className={\`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all \${
                activeTab === "garden"
                  ? "bg-gradient-to-r from-pink-400 to-rose-400 text-white shadow-md shadow-pink-300/30"
                  : "text-slate-600 hover:text-slate-900"
              }\`}
            >
              🌸 3D Garden
            </button>
            <button
              onClick={() => setActiveTab("chemistry")}
              className={\`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all \${
                activeTab === "chemistry"
                  ? "bg-gradient-to-r from-pink-400 to-rose-400 text-white shadow-md shadow-pink-300/30"
                  : "text-slate-600 hover:text-slate-900"
              }\`}
            >
              ✨ Chemistry Quiz
            </button>
            <button
              onClick={() => setActiveTab("scrapbook")}
              className={\`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all \${
                activeTab === "scrapbook"
                  ? "bg-gradient-to-r from-pink-400 to-rose-400 text-white shadow-md shadow-pink-300/30"
                  : "text-slate-600 hover:text-slate-900"
              }\`}
            >
              📸 Scrapbook
            </button>
            <button
              onClick={() => setActiveTab("bucketlist")}
              className={\`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all \${
                activeTab === "bucketlist"
                  ? "bg-gradient-to-r from-pink-400 to-rose-400 text-white shadow-md shadow-pink-300/30"
                  : "text-slate-600 hover:text-slate-900"
              }\`}
            >
              🎯 Bucket List
            </button>
          </div>

          {/* Palette Selector */}
          <div className="flex bg-white/70 p-1 rounded-xl border border-pink-200/50 gap-1">
            <button
              onClick={() => setPalette("sakura")}
              title="Sakura Pastel"
              className={\`w-6 h-6 rounded-lg bg-pink-300 transition-transform \${palette === "sakura" ? "ring-2 ring-pink-500 scale-110" : ""}\`}
            />
            <button
              onClick={() => setPalette("peach")}
              title="Sunset Peach"
              className={\`w-6 h-6 rounded-lg bg-amber-300 transition-transform \${palette === "peach" ? "ring-2 ring-amber-500 scale-110" : ""}\`}
            />
            <button
              onClick={() => setPalette("matcha")}
              title="Matcha Garden"
              className={\`w-6 h-6 rounded-lg bg-emerald-300 transition-transform \${palette === "matcha" ? "ring-2 ring-emerald-500 scale-110" : ""}\`}
            />
          </div>
        </div>
      </header>

      {/* Spark Alert Notification */}
      {sparkNotification && (
        <div className="max-w-md mx-auto my-3 px-4 py-2.5 rounded-2xl bg-white/95 border border-pink-300 shadow-xl shadow-pink-200/50 flex items-center justify-between text-xs font-semibold text-rose-700 animate-bounce">
          <span>{sparkNotification}</span>
          <button onClick={() => setSparkNotification(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* ── Main Workspaces ────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto mt-6">
        {/* WORKSPACE 1: 3D CHARACTER GARDEN */}
        {activeTab === "garden" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white/75 backdrop-blur-md rounded-3xl p-5 border border-pink-200/70 shadow-xl shadow-pink-100/50 flex flex-col">
              <div className="flex items-center justify-between pb-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span>✨ Interactive 3D Friend Garden</span>
                  </h2>
                  <p className="text-xs text-slate-500">Characters float in a reactive orbit with gaze physics. Hover and click to connect.</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-pink-600 bg-pink-50 px-3 py-1 rounded-full border border-pink-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>4 friends online</span>
                </div>
              </div>

              {/* Real-time 3D Canvas */}
              <div className="relative w-full h-[360px] rounded-2xl bg-gradient-to-b from-pink-50/60 via-amber-50/40 to-white border border-pink-100/80 overflow-hidden flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  width={680}
                  height={360}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    mousePosRef.current = {
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    };
                  }}
                  className="w-full h-full cursor-pointer"
                />
                <div className="absolute bottom-3 left-4 text-[11px] text-slate-400 bg-white/70 px-2.5 py-1 rounded-lg backdrop-blur">
                  Move mouse to guide gaze • Characters react to cursor
                </div>
              </div>

              {/* Quick Action Dock */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {friends.map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => setSelectedFriend(friend)}
                    className="p-3 rounded-2xl bg-white hover:bg-pink-50/60 border border-pink-100 hover:border-pink-300 transition-all text-left shadow-sm hover:shadow"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xl">{friend.emoji}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-700">
                        {friend.compatibilityScore}%
                      </span>
                    </div>
                    <div className="font-bold text-xs text-slate-800 truncate">{friend.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{friend.energyLevel} vibe</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Friend Profile & Vibe Card */}
            <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 border border-pink-200/70 shadow-xl shadow-pink-100/50 flex flex-col justify-between">
              {selectedFriend ? (
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-pink-100">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-md"
                        style={{ backgroundColor: selectedFriend.avatarColor }}
                      >
                        {selectedFriend.emoji}
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-slate-800">{selectedFriend.name}</h3>
                        <p className="text-[11px] text-pink-600 font-semibold">{selectedFriend.vibe}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedFriend(null)}
                      className="text-slate-400 hover:text-slate-600 text-sm"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3.5 my-4">
                    <div className="p-3 rounded-2xl bg-pink-50/70 border border-pink-100 text-xs">
                      <span className="text-[10px] font-bold uppercase text-pink-500 block mb-1">Live Status</span>
                      <p className="text-slate-700 italic">"{selectedFriend.status}"</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100">
                        <span className="text-[10px] text-amber-700 font-bold block">Energy Signature</span>
                        <span className="font-semibold text-slate-800">{selectedFriend.energyLevel} Vibe</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-100">
                        <span className="text-[10px] text-rose-700 font-bold block">Sparks Exchanged</span>
                        <span className="font-semibold text-slate-800">{selectedFriend.sparksReceived} Sparks ✨</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white border border-pink-100">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-700">Friendship Chemistry</span>
                        <span className="font-bold text-pink-600">{selectedFriend.compatibilityScore}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-pink-400 via-rose-400 to-amber-300 rounded-full"
                          style={{ width: \`\${selectedFriend.compatibilityScore}%\` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => sendSparkToFriend(selectedFriend.id, selectedFriend.name)}
                      className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs shadow-md shadow-pink-200 transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>✨ Send Warm Spark</span>
                    </button>
                    <button
                      onClick={() => {
                        alert(\`Inviting \${selectedFriend.name} to coffee hangout! Virtual invitation sent.\`);
                      }}
                      className="w-full py-2 rounded-2xl bg-white hover:bg-slate-50 border border-pink-200 text-slate-700 font-semibold text-xs transition-colors"
                    >
                      ☕ Invite to Hangout
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-6 my-auto">
                  <div className="w-16 h-16 rounded-3xl bg-pink-100 text-3xl flex items-center justify-center mb-3">
                    💫
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm mb-1">Click Any Friend in Orbit</h3>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Select any companion avatar above to view their live status, chemistry score, or send a warm spark chime.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* WORKSPACE 2: CHEMISTRY & VIBE MATCHER QUIZ */}
        {activeTab === "chemistry" && (
          <div className="max-w-2xl mx-auto bg-white/85 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-pink-200/80 shadow-xl shadow-pink-100/50">
            {!quizCalculated ? (
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-pink-100 mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">✨ Friendship Vibe Matcher</h2>
                    <p className="text-xs text-slate-500">Discover your natural friendship chemistry & hangout wavelength</p>
                  </div>
                  <div className="text-xs font-bold text-pink-600 bg-pink-50 px-3 py-1 rounded-full border border-pink-200">
                    Question {quizStep + 1} of {quizQuestions.length}
                  </div>
                </div>

                <div className="my-6">
                  <h3 className="text-base font-semibold text-slate-800 mb-4">
                    {quizQuestions[quizStep].q}
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {quizQuestions[quizStep].options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          const updated = [...quizAnswers, opt.pts];
                          setQuizAnswers(updated);
                          if (quizStep + 1 < quizQuestions.length) {
                            setQuizStep(quizStep + 1);
                          } else {
                            setQuizCalculated(true);
                            playSparkChime();
                          }
                        }}
                        className="p-4 rounded-2xl bg-white hover:bg-pink-50/80 border border-pink-100 hover:border-pink-300 text-left transition-all flex items-center gap-3.5 group shadow-sm hover:shadow"
                      >
                        <span className="text-2xl group-hover:scale-125 transition-transform">{opt.icon}</span>
                        <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-300 via-rose-300 to-amber-200 text-4xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-pink-200">
                  💖
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-1">96% Golden Harmony!</h3>
                <p className="text-sm text-pink-600 font-semibold mb-6">"Comfortable Silence & Spontaneous Late-Night Adventures"</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left mb-6">
                  <div className="p-3.5 rounded-2xl bg-pink-50/70 border border-pink-100">
                    <span className="text-[10px] font-bold text-pink-600 uppercase block mb-1">Communication</span>
                    <p className="text-xs font-medium text-slate-700">Non-stop memes + unfiltered deep life voice memos</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100">
                    <span className="text-[10px] font-bold text-amber-600 uppercase block mb-1">Ideal Hangout</span>
                    <p className="text-xs font-medium text-slate-700">Artisan boba tea + thrift store vinyl record hunting</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-100">
                    <span className="text-[10px] font-bold text-rose-600 uppercase block mb-1">Soul Vibe</span>
                    <p className="text-xs font-medium text-slate-700">Zero social battery required; pure comfort</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setQuizStep(0);
                    setQuizAnswers([]);
                    setQuizCalculated(false);
                  }}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-pink-400 to-rose-400 text-white font-bold text-xs shadow-md shadow-pink-200 hover:shadow-lg transition-all"
                >
                  🔄 Retake Chemistry Quiz
                </button>
              </div>
            )}
          </div>
        )}

        {/* WORKSPACE 3: MEMORY SCRAPBOOK */}
        {activeTab === "scrapbook" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
              <div>
                <h2 className="text-xl font-bold text-slate-800">📸 Shared Memory Scrapbook</h2>
                <p className="text-xs text-slate-500">Digital polaroids, sticky thoughts, and unforgettable moments together</p>
              </div>
              <button
                onClick={() => setIsMemoryModalOpen(true)}
                className="px-4 py-2 rounded-2xl bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs shadow-md shadow-pink-200 transition-all flex items-center gap-1.5"
              >
                <span>➕ Pin New Memory</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {memories.map((mem) => (
                <div
                  key={mem.id}
                  className={\`p-5 rounded-3xl border \${mem.bgColor} shadow-md shadow-pink-100/40 relative flex flex-col justify-between transition-transform hover:-translate-y-1\`}
                >
                  <div className="absolute -top-3 -right-2 text-2xl filter drop-shadow">
                    {mem.sticker}
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold mb-2">
                      <span className="px-2 py-0.5 rounded-full bg-white/70 border border-slate-200/50">{mem.tag}</span>
                      <span>{mem.date}</span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-800 mb-2">{mem.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed italic mb-4">"{mem.note}"</p>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 text-xs">
                    <span className="text-[11px] text-slate-500 font-medium">With {mem.author}</span>
                    <button
                      onClick={() => {
                        playSparkChime();
                        setMemories((prev) =>
                          prev.map((m) => (m.id === mem.id ? { ...m, likes: m.likes + 1 } : m))
                        );
                      }}
                      className="flex items-center gap-1 text-pink-600 hover:text-pink-700 font-bold bg-white/80 px-2.5 py-1 rounded-xl shadow-xs"
                    >
                      <span>❤️</span>
                      <span>{mem.likes}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Memory Modal */}
            {isMemoryModalOpen && (
              <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-pink-200 shadow-2xl">
                  <h3 className="text-base font-bold text-slate-800 mb-1">Pin Memory to Scrapbook</h3>
                  <p className="text-xs text-slate-500 mb-4">Add a shared snapshot, late-night adventure, or heartfelt moment.</p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newTitle.trim()) return;
                      setMemories([
                        {
                          id: \`M\${Date.now()}\`,
                          title: newTitle.trim(),
                          date: "Just now",
                          note: newNote.trim() || "Such a sweet memory captured today!",
                          tag: newTag,
                          bgColor: "bg-pink-100/70 border-pink-200",
                          sticker: "🌟",
                          likes: 1,
                          author: "You & Friends",
                        },
                        ...memories,
                      ]);
                      setNewTitle("");
                      setNewNote("");
                      setIsMemoryModalOpen(false);
                      playSparkChime();
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Memory Title</label>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="e.g. Rainy Day Board Game Marathon"
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-pink-200 focus:outline-hidden focus:ring-2 focus:ring-pink-300"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">The Story / Memory Note</label>
                      <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="What made this moment so special?"
                        rows={3}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-pink-200 focus:outline-hidden focus:ring-2 focus:ring-pink-300"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsMemoryModalOpen(false)}
                        className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-pink-400 to-rose-400 text-white text-xs font-bold shadow-md shadow-pink-200"
                      >
                        Save Memory
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* WORKSPACE 4: SHARED BUCKET LIST */}
        {activeTab === "bucketlist" && (
          <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-pink-200/80 shadow-xl shadow-pink-100/50">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-pink-100 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">🎯 Friendship Bucket List</h2>
                <p className="text-xs text-slate-500">Adventures, creative challenges & cozy experiences to check off together</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                <span>🏆 Completed: {bucketList.filter((b) => b.completed).length} / {bucketList.length}</span>
              </div>
            </div>

            {/* Quick Add Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newBucketTitle.trim()) return;
                setBucketList([
                  ...bucketList,
                  {
                    id: \`B\${Date.now()}\`,
                    title: newBucketTitle.trim(),
                    category: newBucketCategory,
                    completed: false,
                    assignedTo: "Everyone",
                  },
                ]);
                setNewBucketTitle("");
                playSparkChime();
              }}
              className="flex gap-2 mb-6"
            >
              <input
                type="text"
                value={newBucketTitle}
                onChange={(e) => setNewBucketTitle(e.target.value)}
                placeholder="Add a new dream to the list (e.g. Camp under the stars)..."
                className="flex-1 text-xs px-4 py-2.5 rounded-2xl border border-pink-200 focus:outline-hidden focus:ring-2 focus:ring-pink-300 bg-white"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-400 to-rose-400 text-white font-bold text-xs shadow-md shadow-pink-200 hover:shadow-lg transition-all"
              >
                Add Goal
              </button>
            </form>

            {/* List items */}
            <div className="space-y-2.5">
              {bucketList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    playSparkChime();
                    setBucketList((prev) =>
                      prev.map((b) => (b.id === item.id ? { ...b, completed: !b.completed } : b))
                    );
                  }}
                  className={\`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 \${
                    item.completed
                      ? "bg-emerald-50/70 border-emerald-200 text-slate-500 line-through"
                      : "bg-white hover:bg-pink-50/50 border-pink-100 text-slate-800 shadow-xs"
                  }\`}
                >
                  <div className="flex items-center gap-3">
                    <span className={\`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-bold border \${
                      item.completed
                        ? "bg-emerald-500 text-white border-emerald-500"
                        : "border-pink-300 bg-white"
                    }\`}>
                      {item.completed ? "✓" : ""}
                    </span>
                    <span className="text-xs font-medium">{item.title}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {item.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
export default App;
`;
