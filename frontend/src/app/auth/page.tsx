"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AtSign, ArrowLeft, Lock, User } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "That email and password don't match. Double-check, or sign up if you haven't yet.";
  }
  if (lower.includes("email not confirmed")) {
    return "Your email isn't confirmed yet. Check your inbox (and spam) for the link.";
  }
  if (lower.includes("user already registered")) {
    return "This email is already registered. Try signing in instead.";
  }
  if (lower.includes("provider is not enabled")) {
    return "That sign-in option isn't enabled in this Supabase project yet. Turn it on under Authentication → Providers.";
  }
  if (lower.includes("password should be at least")) {
    return "Password must be at least 6 characters.";
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many attempts in a short time. Give it a minute, then try again.";
  }
  return message;
}

type Mode = "signin" | "signup";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState<null | "email" | "google" | "github">(null);
  const router = useRouter();

  const requireSupabase = () => {
    if (!isSupabaseConfigured) {
      setError("Supabase isn't configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to frontend/.env.local.");
      return false;
    }
    return true;
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setInfo("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!requireSupabase()) return;
    setLoading("email");
    try {
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        if (data.session) {
          router.push("/app");
        } else {
          setError("Login didn't return a session. If you just signed up, confirm your email first.");
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: username.trim() }, emailRedirectTo: `${window.location.origin}/app` },
        });
        if (error) throw error;
        if (data.session) {
          router.push("/app");
        } else {
          setInfo(`Account created. We sent a confirmation link to ${email} — click it, then come back and sign in.`);
          setMode("signin");
        }
      }
    } catch (err: any) {
      setError(friendlyAuthError(err?.message || "Something went wrong"));
    } finally {
      setLoading(null);
    }
  };

  const oauth = async (provider: "google" | "github") => {
    setError("");
    setInfo("");
    if (!requireSupabase()) return;
    setLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/app` },
    });
    if (error) {
      setError(friendlyAuthError(error.message));
      setLoading(null);
    }
    // On success the browser redirects to the provider, so nothing more here.
  };

  const isSignup = mode === "signup";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      {/* ── Left: branding panel (rich, always-dark for a premium split look) ── */}
      <div className="relative hidden lg:flex w-1/2 flex-col justify-between overflow-hidden p-12 text-white"
        style={{ background: "linear-gradient(155deg, #0b1224 0%, #1b2c52 48%, #090d18 100%)" }}>
        <svg className="auth-lines pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 600 800" fill="none" aria-hidden>
          {Array.from({ length: 9 }).map((_, i) => (
            <path
              key={i}
              d={`M-50 ${260 + i * 26} C 150 ${180 + i * 26}, 360 ${420 + i * 22}, 680 ${240 + i * 30}`}
              stroke="white"
              strokeWidth="1"
              strokeOpacity={0.05 + i * 0.012}
            />
          ))}
        </svg>

        <a href="/" className="relative z-10 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, #3B5998, #7B93B0)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>
          </span>
          <span className="text-xl font-semibold tracking-tight">Vyrexo</span>
        </a>

        <blockquote className="relative z-10 max-w-md">
          <p className="text-2xl font-light leading-snug text-white/90">
            &ldquo;It feels less like running tools and more like having a teammate who just gets it done — by voice, while I think out loud.&rdquo;
          </p>
          <footer className="mt-4 font-mono text-sm text-white/60">~ built with Rex</footer>
        </blockquote>
      </div>

      {/* ── Right: auth form (theme-aware) ── */}
      <div className="relative flex w-full flex-col lg:w-1/2">
        <div className="flex items-center justify-between px-6 py-5 sm:px-10">
          <a href="/" className="flex items-center gap-1.5 text-sm text-[var(--muted2)] transition-colors hover:text-[var(--text)]">
            <ArrowLeft size={16} /> Home
          </a>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-10 sm:px-10">
          <div className="w-full max-w-[400px]">
            <a href="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, #3B5998, #7B93B0)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>
              </span>
              <span className="text-lg font-semibold tracking-tight">Vyrexo</span>
            </a>

            <h1 className="text-3xl font-bold tracking-tight">{isSignup ? "Create your account" : "Sign In or Join Now!"}</h1>
            <p className="mt-2 text-sm text-[var(--muted2)]">
              {isSignup ? "Join Vyrexo — it only takes a few seconds." : "Log in or create your Vyrexo account."}
            </p>

            {/* Social — direct sign in / sign up */}
            <div className="mt-7 space-y-3">
              <button
                onClick={() => oauth("google")}
                disabled={loading !== null}
                className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-[var(--border2)] bg-[var(--surface2)] py-3 text-sm font-medium text-[var(--text)] transition-all hover:border-[var(--steel)] disabled:opacity-50"
              >
                <svg width="17" height="17" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                {loading === "google" ? "Redirecting…" : "Continue with Google"}
              </button>
              <button
                onClick={() => oauth("github")}
                disabled={loading !== null}
                className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-[var(--border2)] bg-[var(--surface2)] py-3 text-sm font-medium text-[var(--text)] transition-all hover:border-[var(--steel)] disabled:opacity-50"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                {loading === "github" ? "Redirecting…" : "Continue with GitHub"}
              </button>
            </div>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--border2)]" />
              <span className="text-xs font-medium text-[var(--muted)]">OR</span>
              <div className="h-px flex-1 bg-[var(--border2)]" />
            </div>

            {/* Email + password (and username when signing up) */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {isSignup && (
                <div className="relative">
                  <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    required
                    className="w-full rounded-lg border border-[var(--border2)] bg-[var(--input)] py-3 pl-9 pr-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-colors focus:border-[var(--steel)]"
                  />
                </div>
              )}
              <div className="relative">
                <AtSign size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  className="w-full rounded-lg border border-[var(--border2)] bg-[var(--input)] py-3 pl-9 pr-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-colors focus:border-[var(--steel)]"
                />
              </div>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignup ? "Create a password (min 6 characters)" : "Password"}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-[var(--border2)] bg-[var(--input)] py-3 pl-9 pr-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-colors focus:border-[var(--steel)]"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-400">{error}</div>
              )}
              {info && (
                <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300">{info}</div>
              )}

              <button
                type="submit"
                disabled={loading !== null}
                className="w-full rounded-lg bg-[var(--midnight)] py-3 text-sm font-semibold text-white transition-all hover:bg-[var(--steel)] disabled:opacity-50"
              >
                {loading === "email" ? (isSignup ? "Creating account…" : "Signing in…") : isSignup ? "Create Account" : "Continue With Email"}
              </button>
            </form>

            {/* Toggle between sign in / sign up (a word, not a button) */}
            <p className="mt-5 text-center text-sm text-[var(--muted2)]">
              {isSignup ? "Already have an account? " : "Don't have an account? "}
              <button
                onClick={() => switchMode(isSignup ? "signin" : "signup")}
                className="font-medium text-[var(--steel)] transition-colors hover:text-[var(--ice)] hover:underline"
              >
                {isSignup ? "Sign in" : "Sign up"}
              </button>
            </p>

            <p className="mt-6 text-xs leading-relaxed text-[var(--muted)]">
              By clicking continue, you agree to our{" "}
              <a href="/" className="text-[var(--steel)] underline-offset-2 hover:underline">Terms of Service</a> and{" "}
              <a href="/" className="text-[var(--steel)] underline-offset-2 hover:underline">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
