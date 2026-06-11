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

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Dev fallback: no Supabase configured → log in as a local dev user so the
    // app is usable locally. Remove env vars are added → this branch is skipped.
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
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
