"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "That email and password don't match. Double-check, or sign up if you haven't yet.";
  }
  if (lower.includes("email not confirmed")) {
    return "Your email isn't confirmed yet. Check your inbox (and spam) for the confirmation link.";
  }
  if (lower.includes("user already registered")) {
    return "This email is already registered. Try logging in instead.";
  }
  if (lower.includes("provider is not enabled")) {
    return "That sign-in option isn't configured in this Supabase project yet. Use email signup for now.";
  }
  if (lower.includes("password should be at least")) {
    return "Password must be at least 6 characters.";
  }
  return message;
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!isSupabaseConfigured) {
      setError("Supabase isn't configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to frontend/.env.local.");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Only redirect if a real session came back
        if (data.session) {
          router.push("/app");
        } else {
          setError("Login didn't return a session. If you just signed up, please confirm your email first.");
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        // If email confirmation is on, session will be null and user has identities pending
        if (data.session) {
          router.push("/app");
        } else {
          setInfo(
            `Account created. We sent a confirmation link to ${email}. Click it to verify your email, then come back here and log in.`
          );
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      setError(friendlyAuthError(err?.message || "Something went wrong"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/app` },
    });
    if (error) setError(friendlyAuthError(error.message));
  };

  const handleGithubLogin = async () => {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${window.location.origin}/app` },
    });
    if (error) setError(friendlyAuthError(error.message));
  };

  return (
    <div
      className="flex h-screen items-center justify-center"
      style={{ background: "radial-gradient(ellipse at center, #0a0e1a 0%, #07070a 65%)" }}
    >
      <div className="w-full max-w-[400px] px-6">
        {/* Logo */}
        <div className="text-center mb-10">
          <a href="/" className="inline-block">
            <h1
              className="text-3xl font-bold tracking-tight"
              style={{
                background: "linear-gradient(135deg, #3B5998, #7B93B0, #C0C8D4)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Vyrexo
            </h1>
          </a>
          <p className="mt-2 text-sm text-[var(--muted2)]">
            Voice-first AI coding assistant
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-xl border border-[var(--border2)] bg-[var(--surface)] p-6">
          {/* Toggle */}
          <div className="flex rounded-lg bg-[var(--bg)] p-1 mb-6">
            <button
              onClick={() => { setIsLogin(true); setError(""); setInfo(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                isLogin
                  ? "bg-[var(--midnight)] text-white"
                  : "text-[var(--muted2)] hover:text-[var(--text3)]"
              }`}
            >
              Log in
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(""); setInfo(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                !isLogin
                  ? "bg-[var(--midnight)] text-white"
                  : "text-[var(--muted2)] hover:text-[var(--text3)]"
              }`}
            >
              Sign up
            </button>
          </div>

          {/* OAuth */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={handleGoogleLogin}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[var(--border2)] bg-[var(--bg)] text-sm text-[var(--text3)] hover:border-[var(--muted)] hover:text-[var(--text)] transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            <button
              onClick={handleGithubLogin}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[var(--border2)] bg-[var(--bg)] text-sm text-[var(--text3)] hover:border-[var(--muted)] hover:text-[var(--text)] transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[var(--border2)]" />
            <span className="text-xs text-[var(--muted)]">or</span>
            <div className="flex-1 h-px bg-[var(--border2)]" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs text-[var(--muted2)] mb-1.5">Full name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--border2)] rounded-lg py-2.5 px-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[#3B599866]"
                  placeholder="Your name"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-[var(--muted2)] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border2)] rounded-lg py-2.5 px-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[#3B599866]"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--muted2)] mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border2)] rounded-lg py-2.5 px-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:border-[#3B599866]"
                placeholder="Min 6 characters"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {info && (
              <div className="text-xs text-emerald-300 bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-3 py-2">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[var(--midnight)] text-white text-sm font-medium hover:bg-[var(--steel)] transition-all disabled:opacity-50"
            >
              {loading ? "..." : isLogin ? "Log in" : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[var(--muted)] mt-6">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(""); setInfo(""); }}
            className="text-[var(--steel)] hover:text-[var(--ice)] transition-colors"
          >
            {isLogin ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}
