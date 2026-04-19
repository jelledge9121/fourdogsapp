"use client";

import { useEffect, useState, useCallback } from "react";
import FourDogsLogo from "@/components/FourDogsLogo";
import OfflineIndicator from "@/components/OfflineIndicator";
import { supabase } from "@/lib/supabase";
import { sanitize, isValid } from "@/lib/sanitize";

/* ── Types ──────────────────────────────────────────────── */

interface AvailableEvent {
  id: string;
  title: string;
  event_date: string;
  status: string;
  venue_name: string;
}

type PageState = "loading" | "no-event" | "select-event" | "form";
type FormState = "idle" | "submitting" | "success" | "error";

/* ── Helpers ────────────────────────────────────────────── */

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/* ── Component ──────────────────────────────────────────── */

export default function CheckInPage() {
  // Event selection
  const [pageState, setPageState] = useState<PageState>("loading");
  const [events, setEvents] = useState<AvailableEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AvailableEvent | null>(null);

  // Form fields
  const [playerName, setPlayerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [teamName, setTeamName] = useState("");
  const [firstTime, setFirstTime] = useState(false);

  // Form state
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  /* ── Load events from available_events ─────────────── */

  useEffect(() => {
    async function loadEvents() {
      const { data, error } = await supabase
        .from("available_events")
        .select("id, title, event_date, status, venue_name")
        .eq("status", "live");

      if (error || !data || data.length === 0) {
        setPageState("no-event");
        return;
      }

      const available = data as AvailableEvent[];
      setEvents(available);

      // If only one event, auto-select it and skip the picker
      if (available.length === 1) {
        setSelectedEvent(available[0]);
        setPageState("form");
      } else {
        setPageState("select-event");
      }
    }

    loadEvents();
  }, []);

  /* ── Event selection ───────────────────────────────── */

  function handleSelectEvent(ev: AvailableEvent) {
    setSelectedEvent(ev);
    setPageState("form");
  }

  function handleBackToEvents() {
    setSelectedEvent(null);
    setFormState("idle");
    setErrorMsg("");
    setPageState("select-event");
  }

  /* ── Form submission ───────────────────────────────── */

  const canSubmit = isValid(playerName) && formState !== "submitting";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !selectedEvent) return;

    setFormState("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: sanitize(playerName, 100),
          phone: phone ? sanitize(phone, 20) : "",
          email: email ? sanitize(email, 100) : "",
          teamName: teamName ? sanitize(teamName, 30) : "",
          firstTime,
          eventId: selectedEvent.id,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setFormState("error");
        setErrorMsg(json.error || "Check-in failed. Try again.");
        return;
      }

      setFormState("success");
    } catch {
      setFormState("error");
      setErrorMsg("Network error. Try again.");
    }
  }

  /* ── Reset for another check-in ────────────────────── */

  const handleReset = useCallback(() => {
    setPlayerName("");
    setPhone("");
    setEmail("");
    setTeamName("");
    setFirstTime(false);
    setFormState("idle");
    setErrorMsg("");
  }, []);

  /* ── Render ────────────────────────────────────────── */

  return (
    <main className="min-h-dvh bg-brand-black flex flex-col">
      <OfflineIndicator />

      <header className="flex justify-center pt-8 pb-4 px-6">
        <FourDogsLogo size="md" />
      </header>

      <div className="flex-1 flex flex-col justify-center px-6 pb-12 max-w-md mx-auto w-full">

        {/* ── Loading ───────────────────────────────── */}
        {pageState === "loading" && (
          <div className="flex flex-col items-center gap-3 py-16">
            <svg className="w-8 h-8 animate-spin text-brand-neon" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
            </svg>
            <span className="font-body text-brand-muted text-sm">Loading events...</span>
          </div>
        )}

        {/* ── No events ────────────────────────────── */}
        {pageState === "no-event" && (
          <div className="flex flex-col items-center text-center py-16">
            <div className="text-5xl mb-4">🐕</div>
            <h2 className="font-display text-3xl tracking-wide text-brand-white mb-2">
              NO EVENTS AVAILABLE
            </h2>
            <p className="font-body text-brand-muted text-base">
              No live events right now. Please see the host.
            </p>
          </div>
        )}

        {/* ── Event selection ──────────────────────── */}
        {pageState === "select-event" && (
          <div className="animate-slide-up">
            <div className="text-center mb-6">
              <h1 className="font-display text-3xl tracking-wide text-brand-white">
                SELECT YOUR EVENT
              </h1>
              <p className="font-body text-brand-muted text-sm mt-1">
                Tap the event you&apos;re attending tonight
              </p>
            </div>

            <div className="space-y-3">
              {events.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => handleSelectEvent(ev)}
                  className="w-full text-left px-5 py-4 rounded-xl bg-brand-card border border-brand-border
                    hover:border-brand-neon/40 active:scale-[0.98] transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-xl tracking-wide text-brand-white group-hover:text-brand-neon transition-colors truncate">
                        {ev.title}
                      </h3>
                      <p className="font-body text-brand-muted text-sm mt-0.5">
                        {ev.venue_name}
                      </p>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="font-body text-brand-amber text-xs font-semibold">
                        {formatDate(ev.event_date)}
                      </span>
                      <span className="inline-flex items-center gap-1 mt-1">
                        <span className="w-2 h-2 rounded-full bg-brand-neon live-dot" />
                        <span className="font-body text-brand-neon text-xs font-semibold uppercase">
                          {ev.status}
                        </span>
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Check-in form ────────────────────────── */}
        {pageState === "form" && selectedEvent && formState !== "success" && (
          <div className="animate-slide-up">
            {/* Back button (only when multiple events exist) */}
            {events.length > 1 && (
              <button
                onClick={handleBackToEvents}
                className="flex items-center gap-1.5 mb-4 font-body text-brand-muted text-sm
                  hover:text-brand-neon transition-colors active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back to events
              </button>
            )}

            <div className="text-center mb-6">
              <h1 className="font-display text-3xl tracking-wide text-brand-white">CHECK IN</h1>
              <p className="font-body text-brand-muted text-sm mt-1">
                {selectedEvent.title} @ {selectedEvent.venue_name}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 px-1">
              {/* Your Name (required) */}
              <div>
                <label className="block font-display text-lg tracking-wide text-brand-muted mb-1.5">
                  YOUR NAME
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value.slice(0, 50))}
                  placeholder="e.g. Joey"
                  autoComplete="off"
                  autoCorrect="off"
                  className="w-full px-4 py-3.5 rounded-xl bg-brand-dark border border-brand-border
                    text-brand-white font-body text-lg placeholder:text-brand-muted/50
                    focus:outline-none focus:border-brand-neon/50 focus:ring-1 focus:ring-brand-neon/20
                    transition-colors"
                />
              </div>

              {/* Phone (optional) */}
              <div>
                <label className="block font-display text-lg tracking-wide text-brand-muted mb-1.5">
                  PHONE <span className="text-brand-muted/50 text-sm">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.slice(0, 20))}
                  placeholder="e.g. 803-555-1234"
                  autoComplete="tel"
                  className="w-full px-4 py-3.5 rounded-xl bg-brand-dark border border-brand-border
                    text-brand-white font-body text-lg placeholder:text-brand-muted/50
                    focus:outline-none focus:border-brand-neon/50 focus:ring-1 focus:ring-brand-neon/20
                    transition-colors"
                />
              </div>

              {/* Email (optional) */}
              <div>
                <label className="block font-display text-lg tracking-wide text-brand-muted mb-1.5">
                  EMAIL <span className="text-brand-muted/50 text-sm">(optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.slice(0, 100))}
                  placeholder="e.g. joey@email.com"
                  autoComplete="email"
                  className="w-full px-4 py-3.5 rounded-xl bg-brand-dark border border-brand-border
                    text-brand-white font-body text-lg placeholder:text-brand-muted/50
                    focus:outline-none focus:border-brand-neon/50 focus:ring-1 focus:ring-brand-neon/20
                    transition-colors"
                />
              </div>

              {/* Team Name (optional) */}
              <div>
                <label className="block font-display text-lg tracking-wide text-brand-muted mb-1.5">
                  TEAM NAME <span className="text-brand-muted/50 text-sm">(optional)</span>
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value.slice(0, 30))}
                  placeholder="e.g. Quiz Khalifa"
                  autoComplete="off"
                  autoCorrect="off"
                  className="w-full px-4 py-3.5 rounded-xl bg-brand-dark border border-brand-border
                    text-brand-white font-body text-lg placeholder:text-brand-muted/50
                    focus:outline-none focus:border-brand-neon/50 focus:ring-1 focus:ring-brand-neon/20
                    transition-colors"
                />
                <div className="text-right mt-1 text-brand-muted/50 font-body text-xs">
                  {teamName.length}/30
                </div>
              </div>

              {/* First time toggle */}
              <button
                type="button"
                onClick={() => setFirstTime(!firstTime)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border
                  font-body text-base font-semibold transition-all active:scale-[0.98]
                  ${firstTime
                    ? "bg-brand-amber/10 border-brand-amber/40 text-brand-amber"
                    : "bg-brand-dark border-brand-border text-brand-muted"
                  }`}
              >
                <span>⭐ First time here?</span>
                <span className={`w-12 h-7 rounded-full relative transition-colors ${firstTime ? "bg-brand-amber" : "bg-brand-border"}`}>
                  <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform ${firstTime ? "translate-x-5" : "translate-x-0.5"}`} />
                </span>
              </button>

              {/* Error */}
              {formState === "error" && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-body text-sm">
                  {errorMsg}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                className={`w-full py-4 rounded-xl font-display text-2xl tracking-widest transition-all active:scale-[0.97]
                  ${canSubmit
                    ? "bg-brand-neon text-brand-black hover:bg-brand-neon-dim"
                    : "bg-brand-border text-brand-muted cursor-not-allowed"
                  }`}
              >
                {formState === "submitting" ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
                    </svg>
                    CHECKING IN...
                  </span>
                ) : (
                  "CHECK IN"
                )}
              </button>
            </form>
          </div>
        )}

        {/* ── Success ──────────────────────────────── */}
        {pageState === "form" && formState === "success" && (
          <div className="flex flex-col items-center text-center px-6 py-12 animate-burst">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="font-display text-5xl tracking-wide text-brand-neon neon-glow mb-4">
              YOU&apos;RE IN.
            </h2>
            <div className="space-y-3 font-body text-brand-cream text-base max-w-xs">
              <p>
                <span className="text-brand-amber font-semibold">Tag 2 friends</span> on our latest
                post for a bonus tonight.
              </p>
              <p>
                <span className="text-brand-cyan font-semibold">Bring someone next week</span> for a
                bigger reward.
              </p>
            </div>
            <button
              onClick={handleReset}
              className="mt-8 px-6 py-3 rounded-xl bg-brand-card border border-brand-border text-brand-muted font-body text-sm font-semibold active:scale-95 transition-transform"
            >
              Check in another player
            </button>
          </div>
        )}

      </div>

      <footer className="pb-6 text-center">
        <span className="font-body text-brand-muted/40 text-xs">Four Dogs Entertainment</span>
      </footer>
    </main>
  );
}
