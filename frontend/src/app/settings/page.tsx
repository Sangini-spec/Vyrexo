"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { VyrexoLogo } from "@/components/shared/VyrexoLogo";
import {
  type VoiceSettings,
  speakHumanizedText,
  cancelHumanizedSpeech,
} from "@/lib/voice-synthesizer";
import {
  type UserProfile,
  loadUserProfile,
  saveUserProfile,
  getCanonicalUserKey,
  getVoiceStorageKey,
  personalizeGreetingWithUsername,
} from "@/lib/user-profile";

// Curated voices (3 male, 3 female)
const VOICE_OPTIONS = [
  // Male Voices
  {
    id: "adam",
    name: "Adam",
    accent: "American",
    gender: "Male",
    vibe: "Deep, articulate & conversational tone with natural warmth",
    previewText: "Hey there! I'm Adam. I'm ready to design architectures, review code, and build software with you.",
  },
  {
    id: "brian",
    name: "Brian",
    accent: "British",
    gender: "Male",
    vibe: "Calm, thoughtful & narrative British cadence for deep engineering sessions",
    previewText: "Hello there. I'm Brian. Let's take a calm, methodical look at your application architecture.",
  },
  {
    id: "george",
    name: "George",
    accent: "American",
    gender: "Male",
    vibe: "Warm, raspy & expressive conversational voice with lively inflection",
    previewText: "Hey! George here. Ready to dive into the codebase and make some great progress today.",
  },

  // Female Voices
  {
    id: "rachel",
    name: "Rachel",
    accent: "American",
    gender: "Female",
    vibe: "Calm, compassionate & deeply empathetic tone for attentive problem-solving",
    previewText: "Hi, I'm Rachel. I'm here to listen, solve tough problems, and work through every detail with you.",
  },
  {
    id: "charlotte",
    name: "Charlotte",
    accent: "British",
    gender: "Female",
    vibe: "Crisp, elegant & articulate British cadence with natural pacing",
    previewText: "Hello! I'm Charlotte. Let's build something extraordinary and keep our code pristine.",
  },
  {
    id: "nicole",
    name: "Nicole",
    accent: "American",
    gender: "Female",
    vibe: "Soft, gentle & caring conversational voice with natural micro-pauses",
    previewText: "Hey, I'm Nicole. Take your time—we're in this together, and I'm ready whenever you are.",
  },
];

const SPEED_OPTIONS = [
  { value: "slow", label: "Slow", rate: "-15%" },
  { value: "normal", label: "Normal", rate: "+0%" },
  { value: "fast", label: "Fast", rate: "+15%" },
];

const OCCUPATION_PRESETS = [
  "Student",
  "Computer Science Student",
  "Software Engineer",
  "Full-Stack Developer",
  "Frontend Engineer",
  "Product Designer",
  "Data Scientist",
  "Founder",
];

const GENDER_OPTIONS = [
  "",
  "Female",
  "Male",
  "Non-binary",
  "Prefer not to say",
];

const ABOUT_USER_SNIPPETS = [
  "I'm a student working on full-stack web projects and learning system design.",
  "I primarily code in TypeScript, React, Next.js, and Python.",
  "I'm building production SaaS applications and value clean, maintainable code.",
  "I love learning the 'why' behind architectural decisions and best practices.",
];

const RESPONSE_STYLE_SNIPPETS = [
  "Be warm, encouraging, and talk like a collaborative teammate.",
  "Keep explanations clear and concise, and lead with working code examples.",
  "When debugging, explain the root cause briefly before fixing it.",
  "Tailor explanations to my background and avoid unnecessary jargon.",
];

export default function SettingsPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"profile" | "voice">("profile");

  // Profile state
  const [profile, setProfile] = useState<UserProfile>({
    username: "",
    fullName: "",
    occupation: "",
    age: "",
    dateOfBirth: "",
    gender: "",
    aboutUserInstructions: "",
    responseStyleInstructions: "",
  });
  const [profileSaved, setProfileSaved] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [testingGreeting, setTestingGreeting] = useState(false);

  // Voice state
  const [selectedVoice, setSelectedVoice] = useState("adam");
  const [speed, setSpeed] = useState<"slow" | "normal" | "fast">("normal");
  const [voiceFilter, setVoiceFilter] = useState<"all" | "male" | "female">("all");
  const [voiceSaved, setVoiceSaved] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  const cancelPreviewRef = useRef<(() => void) | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "voice") {
        setActiveTab("voice");
      } else if (tabParam === "profile") {
        setActiveTab("profile");
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const canonicalKey = getCanonicalUserKey(user, user.email);
    const localProf = loadUserProfile(canonicalKey || user.id, user);
    setProfile(localProf);

    const emailQuery = user.email ? `&email=${encodeURIComponent(user.email.toLowerCase())}` : "";
    fetch(`/api/profile?user_id=${encodeURIComponent(canonicalKey || user.id)}${emailQuery}`, {
      headers: {
        "x-user-id": canonicalKey || user.id,
        ...(user.email ? { "x-user-email": user.email.toLowerCase() } : {}),
      },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data.profile) {
          const srv = data.profile as Partial<UserProfile>;
          const srvOwner = (srv.ownerEmail || "").trim().toLowerCase();
          if (srvOwner && canonicalKey && canonicalKey.includes("@") && srvOwner !== canonicalKey) {
            return;
          }
          if (
            canonicalKey === "sanginitripathi8@gmail.com" &&
            typeof srv.username === "string" &&
            srv.username.trim().toLowerCase() === "babe"
          ) {
            return;
          }
          const localTs = localProf.updatedAt ? new Date(localProf.updatedAt).getTime() : 0;
          const srvTs = srv.updatedAt ? new Date(srv.updatedAt).getTime() : 0;
          const localHasData = Boolean(
            localProf.username ||
              localProf.fullName ||
              localProf.occupation ||
              localProf.aboutUserInstructions ||
              localProf.responseStyleInstructions
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
            const rawSrvFullName = (srv.fullName || localProf.fullName || "").trim();
            const cleanFullName =
              rawSrvFullName && rawSrvFullName.toLowerCase() !== emailPrefix.toLowerCase()
                ? rawSrvFullName
                : "";
            const merged: UserProfile = {
              username: srv.username || localProf.username || "",
              fullName: cleanFullName,
              occupation: srv.occupation || localProf.occupation || "",
              age: srv.age || localProf.age || "",
              dateOfBirth: srv.dateOfBirth || localProf.dateOfBirth || "",
              gender: srv.gender || localProf.gender || "",
              aboutUserInstructions:
                srv.aboutUserInstructions || localProf.aboutUserInstructions || "",
              responseStyleInstructions:
                srv.responseStyleInstructions || localProf.responseStyleInstructions || "",
              ownerEmail: canonicalKey || undefined,
            };
            setProfile(merged);
            saveUserProfile(merged, canonicalKey || user.id, user.email);
          }
        }
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const voiceKey = getVoiceStorageKey(user, user.email);
    const stored = localStorage.getItem(voiceKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.voice) {
          if (parsed.voice === "ava") setSelectedVoice("rachel");
          else if (parsed.voice === "ryan") setSelectedVoice("brian");
          else if (parsed.voice === "sonia") setSelectedVoice("charlotte");
          else setSelectedVoice(parsed.voice);
        }
        if (parsed.speed) setSpeed(parsed.speed);
      } catch {}
    } else {
      setSelectedVoice("adam");
      setSpeed("normal");
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      cancelPreviewRef.current?.();
      cancelHumanizedSpeech();
    };
  }, []);

  const handleDateOfBirthChange = (dob: string) => {
    let computedAge = profile.age;
    if (dob) {
      const birthDate = new Date(dob);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let years = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          years--;
        }
        if (years >= 1 && years <= 120) {
          computedAge = String(years);
        }
      }
    }
    setProfile((prev) => ({
      ...prev,
      dateOfBirth: dob,
      age: computedAge,
    }));
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const canonicalKey = getCanonicalUserKey(user, user.email);
    const savedLocal = saveUserProfile(profile, canonicalKey || user.id, user.email);
    setProfile(savedLocal);

    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": canonicalKey || user.id,
          ...(user.email ? { "x-user-email": user.email.toLowerCase() } : {}),
        },
        body: JSON.stringify({
          user_id: canonicalKey || user.id,
          email: user.email ? user.email.toLowerCase() : undefined,
          profile: savedLocal,
        }),
      });
    } catch {}

    setSavingProfile(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const previewCacheRef = useRef<Map<string, Blob>>(new Map());

  // Pre-warm the active voice greeting on mount so "Test Greeting" plays near-instantaneously
  useEffect(() => {
    if (!user) return;
    const sample = personalizeGreetingWithUsername(
      "Hey! Great to see you. How's everything going with you today?",
      "Hey, great to see you! How's everything going with you today?",
      profile.username
    );
    const cacheKey = `${selectedVoice}:${speed}:${sample.spoken}`;
    if (previewCacheRef.current.has(cacheKey)) return;

    const timer = setTimeout(() => {
      fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sample.spoken,
          voice: selectedVoice,
          emotion: "warm",
          speed,
        }),
      })
        .then(async (res) => {
          if (res.ok && res.headers.get("Content-Type")?.includes("audio")) {
            const blob = await res.blob();
            if (blob.size > 200) {
              previewCacheRef.current.set(cacheKey, blob);
            }
          }
        })
        .catch(() => {});
    }, 150);

    return () => clearTimeout(timer);
  }, [user, selectedVoice, speed, profile.username]);

  const handleTestGreeting = async () => {
    const sample = personalizeGreetingWithUsername(
      "Hey! Great to see you. How's everything going with you today?",
      "Hey, great to see you! How's everything going with you today?",
      profile.username
    );
    setTestingGreeting(true);
    await handlePreview(selectedVoice, sample.spoken);
    setTestingGreeting(false);
  };

  const handlePreview = async (voiceId: string, previewScript: string) => {
    if (previewingVoice === voiceId) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      cancelPreviewRef.current?.();
      cancelHumanizedSpeech();
      setPreviewingVoice(null);
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    cancelPreviewRef.current?.();
    cancelHumanizedSpeech();
    setPreviewingVoice(voiceId);

    const cacheKey = `${voiceId}:${speed}:${previewScript}`;

    try {
      let blob = previewCacheRef.current.get(cacheKey) || null;
      if (!blob) {
        const res = await fetch("/api/voice/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: previewScript,
            voice: voiceId,
            emotion: "warm",
            speed,
          }),
        });

        if (res.ok && res.headers.get("Content-Type")?.includes("audio")) {
          const fetchedBlob = await res.blob();
          if (fetchedBlob.size > 200) {
            blob = fetchedBlob;
            previewCacheRef.current.set(cacheKey, fetchedBlob);
          }
        }
      }

      if (blob) {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        currentAudioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(url);
          currentAudioRef.current = null;
          setPreviewingVoice(null);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          currentAudioRef.current = null;
          setPreviewingVoice(null);
        };

        await audio.play();
        return;
      }
    } catch {}

    const settings: VoiceSettings = {
      voice: voiceId,
      speed,
      emotion: "warm",
    };

    cancelPreviewRef.current = speakHumanizedText(previewScript, settings, {
      onEnd: () => setPreviewingVoice(null),
      onError: () => setPreviewingVoice(null),
    });
  };

  const handleSaveVoice = () => {
    const voiceKey = getVoiceStorageKey(user, user?.email);
    localStorage.setItem(
      voiceKey,
      JSON.stringify({ voice: selectedVoice, speed, emotion: "auto" })
    );
    setVoiceSaved(true);
    setTimeout(() => setVoiceSaved(false), 3000);
  };

  if (loading || !user) return null;

  const emailPrefix = user.email?.split("@")[0]?.trim() || "";
  const cleanFullName =
    profile.fullName && profile.fullName.toLowerCase() !== emailPrefix.toLowerCase()
      ? profile.fullName
      : "";
  const displayFullName =
    profile.username || cleanFullName || user.user_metadata?.username || user.email || "User";
  const signOutIdentifier =
    profile.username?.trim() || cleanFullName || user.email || "";
  const avatarInitial =
    (profile.username || cleanFullName || user.email || "U")[0]?.toUpperCase() || "U";

  return (
    <div
      className="min-h-screen"
      style={{
        background: "radial-gradient(ellipse at center, var(--app-grad-from) 0%, var(--app-grad-to) 65%)",
      }}
    >
      {/* Top Navigation Header */}
      <div className="w-full flex items-center justify-between px-6 sm:px-10 py-4 border-b border-[var(--border)] bg-[var(--surface)]/70 backdrop-blur-xl sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <a
            href="/app"
            onClick={() => {
              if (user) saveUserProfile(profile, getCanonicalUserKey(user, user.email) || user.id, user.email);
            }}
            className="flex items-center group"
          >
            <VyrexoLogo size="md" />
          </a>
          <span className="text-[var(--muted)] text-sm">/</span>
          <span className="text-sm font-medium text-[var(--text3)]">Settings</span>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border2)] bg-[var(--surface)] text-xs font-medium text-[var(--muted2)] hover:text-red-500 hover:border-red-500/40 hover:bg-red-500/10 transition-all cursor-pointer shadow-sm"
            title={signOutIdentifier ? `Sign out (${signOutIdentifier})` : "Sign out of your account"}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="opacity-75 flex-shrink-0"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign out</span>
            {signOutIdentifier && (
              <span className="text-[11px] text-[var(--muted)] ml-1 pl-1.5 border-l border-[var(--border2)] max-w-[140px] truncate">
                {signOutIdentifier}
              </span>
            )}
          </button>
          <ThemeToggle />
          <a
            href="/app"
            onClick={() => {
              if (user) saveUserProfile(profile, getCanonicalUserKey(user, user.email) || user.id, user.email);
            }}
            className="px-3 py-1.5 rounded-lg border border-[var(--border2)] bg-[var(--surface)] text-xs font-medium text-[var(--text)] hover:border-[var(--steel)] transition-colors shadow-sm"
          >
            Back to app
          </a>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Segmented Tab Bar */}
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border2)] mb-8 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "profile"
                ? "bg-[var(--midnight)] text-white shadow-sm"
                : "text-[var(--muted2)] hover:text-[var(--text)]"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>Profile</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("voice")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "voice"
                ? "bg-[var(--midnight)] text-white shadow-sm"
                : "text-[var(--muted2)] hover:text-[var(--text)]"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            <span>Voice Settings</span>
          </button>
        </div>

        {activeTab === "profile" ? (
          <div className="space-y-6">
            {/* Page Heading */}
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)]">Profile</h1>
              <p className="text-sm text-[var(--muted2)] mt-1">
                Manage your profile details, preferred name, and custom preferences for Rex.
              </p>
            </div>

            {/* Compact User Summary Card */}
            <div className="p-4 rounded-2xl border border-[var(--border2)] bg-[var(--surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0 shadow-sm"
                  style={{ background: "linear-gradient(135deg, #3B5998, #7B93B0)" }}
                >
                  {avatarInitial}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-[var(--text)]">{displayFullName}</h2>
                    {profile.username && (
                      <span className="text-xs text-[var(--ice)] font-medium">
                        @{profile.username}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--muted2)] mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{user.email}</span>
                    {profile.occupation && (
                      <>
                        <span>·</span>
                        <span className="text-[var(--text3)]">{profile.occupation}</span>
                      </>
                    )}
                    {profile.age && (
                      <>
                        <span>·</span>
                        <span>{profile.age} yrs</span>
                      </>
                    )}
                    {profile.gender && (
                      <>
                        <span>·</span>
                        <span>{profile.gender}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestGreeting}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#3B599844] bg-[#3B599818] hover:bg-[#3B599828] text-xs font-medium text-[var(--ice)] transition-all cursor-pointer flex-shrink-0 w-fit"
              >
                <span>{testingGreeting || previewingVoice ? "⏹️" : "🔊"}</span>
                <span>{testingGreeting || previewingVoice ? "Stop Preview" : "Test Greeting"}</span>
              </button>
            </div>

            {/* Section 1: Identification & Username */}
            <div className="p-6 rounded-2xl border border-[var(--border2)] bg-[var(--surface)] space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text)]">Identification</h3>
                  <p className="text-xs text-[var(--muted2)] mt-0.5">
                    Set the username Rex will use to address you and display in the sidebar.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {profileSaved && (
                    <span className="text-xs font-medium text-emerald-400">
                      Saved!
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="px-4 py-1.5 bg-[var(--midnight)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--steel)] transition-all cursor-pointer shadow-sm disabled:opacity-60"
                  >
                    {savingProfile ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text3)] mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    value={profile.username}
                    onChange={(e) => {
                      const nextVal = e.target.value;
                      setProfile((prev) => {
                        const updated = { ...prev, username: nextVal };
                        if (user) saveUserProfile(updated, user.id);
                        return updated;
                      });
                    }}
                    placeholder="e.g. Sangini"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border2)] bg-[var(--input)] text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--steel)] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text3)] mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profile.fullName}
                    onChange={(e) => {
                      const nextVal = e.target.value;
                      setProfile((prev) => {
                        const updated = { ...prev, fullName: nextVal };
                        if (user) saveUserProfile(updated, user.id);
                        return updated;
                      });
                    }}
                    placeholder="e.g. Sangini Tripathi"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border2)] bg-[var(--input)] text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--steel)] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Role, Occupation & Personal Details */}
            <div className="p-6 rounded-2xl border border-[var(--border2)] bg-[var(--surface)] space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text)]">Role & Personal Details</h3>
                <p className="text-xs text-[var(--muted2)] mt-0.5">
                  Add what you do and optional personal details.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text3)] mb-1.5">
                  Occupation / Role
                </label>
                <input
                  type="text"
                  value={profile.occupation}
                  onChange={(e) => setProfile((prev) => ({ ...prev, occupation: e.target.value }))}
                  placeholder="e.g. Student, Software Engineer, Product Designer..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border2)] bg-[var(--input)] text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--steel)] transition-colors"
                />
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {OCCUPATION_PRESETS.map((preset) => {
                    const active = profile.occupation.toLowerCase() === preset.toLowerCase();
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setProfile((prev) => ({ ...prev, occupation: preset }))}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                          active
                            ? "bg-[var(--steel)] text-white shadow-sm"
                            : "bg-[var(--border)] border border-[var(--border2)] text-[var(--muted2)] hover:text-[var(--text)] hover:border-[var(--steel)]"
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text3)] mb-1.5">
                    Date of Birth <span className="text-[var(--muted)] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={profile.dateOfBirth}
                    onChange={(e) => handleDateOfBirthChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border2)] bg-[var(--input)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--steel)] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text3)] mb-1.5">
                    Age <span className="text-[var(--muted)] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={profile.age}
                    onChange={(e) => setProfile((prev) => ({ ...prev, age: e.target.value }))}
                    placeholder="e.g. 21"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border2)] bg-[var(--input)] text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--steel)] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text3)] mb-1.5">
                    Gender <span className="text-[var(--muted)] font-normal">(Optional)</span>
                  </label>
                  <select
                    value={
                      GENDER_OPTIONS.includes(profile.gender) ? profile.gender : profile.gender ? "Custom" : ""
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val !== "Custom") {
                        setProfile((prev) => ({ ...prev, gender: val }));
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border2)] bg-[var(--input)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--steel)] transition-colors"
                  >
                    <option value="">Select gender</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Custom Instructions */}
            <div className="p-6 rounded-2xl border border-[var(--border2)] bg-[var(--surface)] space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text)]">Custom Instructions</h3>
                <p className="text-xs text-[var(--muted2)] mt-0.5">
                  Customize how Rex interacts with you and what context it should keep in mind.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text3)] mb-1.5">
                  What would you like Rex to know about you?
                </label>
                <textarea
                  rows={3}
                  value={profile.aboutUserInstructions}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, aboutUserInstructions: e.target.value }))
                  }
                  placeholder="e.g. I'm a computer science student building full-stack projects with Next.js and TypeScript..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border2)] bg-[var(--input)] text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--steel)] transition-colors resize-y"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {ABOUT_USER_SNIPPETS.map((snippet) => (
                    <button
                      key={snippet}
                      type="button"
                      onClick={() =>
                        setProfile((prev) => ({
                          ...prev,
                          aboutUserInstructions: prev.aboutUserInstructions
                            ? `${prev.aboutUserInstructions.trim()} ${snippet}`
                            : snippet,
                        }))
                      }
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--border)] border border-[var(--border2)] text-[var(--muted2)] hover:text-[var(--text)] hover:border-[var(--steel)] transition-all cursor-pointer text-left"
                    >
                      + {snippet}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text3)] mb-1.5">
                  How would you like Rex to respond?
                </label>
                <textarea
                  rows={3}
                  value={profile.responseStyleInstructions}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, responseStyleInstructions: e.target.value }))
                  }
                  placeholder="e.g. Keep your tone friendly and collaborative, give concise explanations, and lead with working code..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border2)] bg-[var(--input)] text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--steel)] transition-colors resize-y"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {RESPONSE_STYLE_SNIPPETS.map((snippet) => (
                    <button
                      key={snippet}
                      type="button"
                      onClick={() =>
                        setProfile((prev) => ({
                          ...prev,
                          responseStyleInstructions: prev.responseStyleInstructions
                            ? `${prev.responseStyleInstructions.trim()} ${snippet}`
                            : snippet,
                        }))
                      }
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--border)] border border-[var(--border2)] text-[var(--muted2)] hover:text-[var(--text)] hover:border-[var(--steel)] transition-all cursor-pointer text-left"
                    >
                      + {snippet}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Save Profile Button */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="px-6 py-2.5 bg-[var(--midnight)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--steel)] transition-all cursor-pointer shadow-sm disabled:opacity-60"
              >
                {savingProfile ? "Saving..." : "Save Profile"}
              </button>
              {profileSaved && (
                <span className="text-xs font-medium text-emerald-400">
                  Profile saved!
                </span>
              )}
            </div>
          </div>
        ) : (
          <div>
            {/* Top Header for Voice Settings */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text)]">Voice Settings</h1>
                <p className="text-sm text-[var(--muted2)] mt-1">
                  Choose Rex&apos;s vocal identity and speaking cadence.
                </p>
              </div>
              <span className="px-3 py-1 rounded-lg border border-[var(--border2)] bg-[var(--surface)] text-[var(--text3)] text-xs font-medium flex-shrink-0">
                Autonomous Voice Engine
              </span>
            </div>

            {/* ── VOICE LIBRARY (6 VOICES) ── */}
            <div className="mt-7">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--text3)] uppercase tracking-wider">
                  Voice Library
                </label>
                <span className="text-xs text-[var(--muted)]">6 curated voices</span>
              </div>

              {/* Filters */}
              <div className="flex gap-2 mt-3 mb-4">
                {(
                  [
                    { id: "all", label: "All Voices (6)" },
                    { id: "male", label: "Male (3)" },
                    { id: "female", label: "Female (3)" },
                  ] as const
                ).map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setVoiceFilter(filter.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      voiceFilter === filter.id
                        ? "bg-[var(--steel)] text-white shadow-sm"
                        : "bg-[var(--surface)] border border-[var(--border2)] text-[var(--muted2)] hover:border-[var(--muted)]"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* Voice Cards */}
              <div className="flex flex-col gap-3">
                {VOICE_OPTIONS.filter((voice) => {
                  if (voiceFilter === "male") return voice.gender === "Male";
                  if (voiceFilter === "female") return voice.gender === "Female";
                  return true;
                }).map((voice) => {
                  const isSelected = selectedVoice === voice.id;
                  const isPlaying = previewingVoice === voice.id;

                  return (
                    <div
                      key={voice.id}
                      onClick={() => setSelectedVoice(voice.id)}
                      className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "border-[var(--steel)] bg-[#3B59981A] ring-1 ring-[var(--steel)]"
                          : "border-[var(--border2)] bg-[var(--surface)] hover:border-[var(--muted)]"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        {/* Audio preview button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(voice.id, voice.previewText);
                          }}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
                            isPlaying
                              ? "bg-[var(--steel)] text-white shadow-md"
                              : "bg-[var(--border)] border border-[var(--border2)] text-[var(--muted2)] hover:text-[var(--steel)] hover:border-[var(--steel)]"
                          }`}
                          title={`Listen to ${voice.name}`}
                        >
                          {isPlaying ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <rect x="6" y="5" width="4" height="14" rx="1" />
                              <rect x="14" y="5" width="4" height="14" rx="1" />
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <polygon points="6 4 20 12 6 20 6 4" />
                            </svg>
                          )}
                        </button>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[var(--text)]">{voice.name}</span>
                            <span className="text-xs text-[var(--muted2)]">
                              {voice.gender} · {voice.accent}
                            </span>
                          </div>
                          <div className="text-xs text-[var(--muted)] mt-0.5">{voice.vibe}</div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--steel)] flex-shrink-0 font-medium">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>Selected</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── SPEAKING CADENCE (SPEED) ── */}
            <div className="mt-8">
              <label className="text-xs font-medium text-[var(--text3)] uppercase tracking-wider block mb-2">
                Speaking Cadence
              </label>
              <div className="flex gap-2">
                {SPEED_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSpeed(s.value as any)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      speed === s.value
                        ? "bg-[var(--midnight)] text-white shadow-sm"
                        : "bg-[var(--surface)] border border-[var(--border2)] text-[var(--muted2)] hover:border-[var(--muted)]"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── SAVE BUTTON ── */}
            <div className="mt-8 flex items-center gap-3">
              <button
                onClick={handleSaveVoice}
                className="px-6 py-2.5 bg-[var(--midnight)] text-white text-sm font-medium rounded-lg hover:bg-[var(--steel)] transition-all cursor-pointer shadow-sm"
              >
                Save Voice Settings
              </button>
              {voiceSaved && (
                <span className="text-xs text-[#4ade80]">
                  Voice settings saved!
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
