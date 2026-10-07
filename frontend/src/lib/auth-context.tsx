"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

// Local dev fallback user. Only used when Supabase env vars are absent, so the
// /app voice interface is reachable without auth during local development.
// As soon as NEXT_PUBLIC_SUPABASE_URL/ANON_KEY are set, real auth takes over.
const DEV_USER = {
  id: "dev-local-user",
  email: "dev@localhost",
  app_metadata: {},
  user_metadata: { name: "Local Dev" },
  aud: "authenticated",
  created_at: new Date().toISOString(),
} as unknown as User;

const GUEST_USER = {
  id: "guest-user",
  email: "guest@vyrexo.local",
  app_metadata: {},
  user_metadata: { name: "Guest User", full_name: "Guest Explorer" },
  aud: "authenticated",
  created_at: new Date().toISOString(),
} as unknown as User;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  continueAsGuest: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const continueAsGuest = () => {
    try {
      localStorage.setItem("vyrexo_guest", "true");
    } catch {}
    setUser(GUEST_USER);
    setLoading(false);
  };

  useEffect(() => {
    // Check if user previously chose guest mode
    try {
      if (localStorage.getItem("vyrexo_guest") === "true") {
        setUser(GUEST_USER);
        setLoading(false);
        return;
      }
    } catch {}

    // Dev fallback: no Supabase configured → log in as a local dev user so the
    // app is usable locally.
    if (!isSupabaseConfigured) {
      setUser(DEV_USER);
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      localStorage.removeItem("vyrexo_guest");
    } catch {}
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch {}
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, continueAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
