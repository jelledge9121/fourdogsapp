"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import FourDogsLogo from "./FourDogsLogo";
import type { User } from "@supabase/supabase-js";

interface HostAuthGateProps {
  children: (user: User) => React.ReactNode;
}

export default function HostAuthGate({ children }: HostAuthGateProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => { listener.subscription.unsubscribe(); };
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password || submitting) return;
    setSubmitting(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setError(authError.message === "Invalid login credentials"
        ? "Wrong email or password"
        : authError.message);
    }
    setSubmitting(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  if (loading) return null;

  if (user) {
    return (
      <>
        {children(user)}
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg bg-brand-card border border-brand-border text-brand-muted font-body text-xs hover:text-brand-white active:scale-95 transition-all"
          >
            Sign Out
          </button>
        </div>
      </>
    );
  }

  return (
    <main className="min-h-dvh bg-brand-black flex flex-col items-center justify-center px-6">
      <FourDogsLogo size="md" />
      <form onSubmit={handleLogin} className="mt-10 w-full max-w-xs space-y-4">
        <h2 className="font-display text-2xl tracking-wide text-brand-white text-center">
          HOST LOGIN
        </h2>
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          placeholder="Email"
          autoFocus
          autoComplete="email"
          className="w-full px-4 py-3.5 rounded-xl bg-brand-dark border border-brand-border
            text-brand-white font-body text-base placeholder:text-brand-muted/50
            focus:outline-none focus:border-brand-neon/50 transition-colors"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(""); }}
          placeholder="Password"
          autoComplete="current-password"
          className={`w-full px-4 py-3.5 rounded-xl bg-brand-dark border text-brand-white font-body text-base
            placeholder:text-brand-muted/50 focus:outline-none transition-colors
            ${error ? "border-red-500" : "border-brand-border focus:border-brand-neon/50"}`}
        />
        {error && (
          <p className="text-red-400 text-sm font-body text-center">{error}</p>
        )}
        <button
          type="submit"
          disabled={!email || !password || submitting}
          className={`w-full py-3.5 rounded-xl font-display text-xl tracking-widest transition-all active:scale-[0.97] ${
            email && password && !submitting
              ? "bg-brand-neon text-brand-black"
              : "bg-brand-border text-brand-muted cursor-not-allowed"
          }`}
        >
          {submitting ? "SIGNING IN..." : "SIGN IN"}
        </button>
      </form>
      <p className="mt-6 text-brand-muted/40 font-body text-xs text-center max-w-xs">
        Host accounts are created in Supabase Auth.
      </p>
    </main>
  );
}
