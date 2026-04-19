"use client";

import { useState } from "react";
import type { EventWithVenue } from "@/lib/types";
import { sanitize, isValid } from "@/lib/sanitize";

interface CheckInFormProps {
  event: EventWithVenue;
}

type FormState = "idle" | "submitting" | "success" | "error";

export default function CheckInForm({ event }: CheckInFormProps) {
  const [teamName, setTeamName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [firstTime, setFirstTime] = useState(false);
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit = isValid(teamName) && isValid(playerName) && state !== "submitting";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setState("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName: sanitize(teamName, 30),
          playerName: sanitize(playerName, 100),
          firstTime,
          eventId: event.id,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setState("error");
        setErrorMsg(json.error || "Check-in failed. Try again.");
        return;
      }

      setState("success");
    } catch {
      setState("error");
      setErrorMsg("Network error. Try again.");
    }
  }

  function handleReset() {
    setTeamName("");
    setPlayerName("");
    setFirstTime(false);
    setState("idle");
    setErrorMsg("");
  }

  if (state === "success") {
    return (
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
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 px-1">
      <div>
        <label className="block font-display text-lg tracking-wide text-brand-muted mb-1.5">
          TEAM NAME
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

      <button
        type="button"
        onClick={() => setFirstTime(!firstTime)}
        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border
          font-body text-base font-semibold transition-all active:scale-[0.98]
          ${firstTime ? "bg-brand-amber/10 border-brand-amber/40 text-brand-amber" : "bg-brand-dark border-brand-border text-brand-muted"}`}
      >
        <span>⭐ First time here?</span>
        <span className={`w-12 h-7 rounded-full relative transition-colors ${firstTime ? "bg-brand-amber" : "bg-brand-border"}`}>
          <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform ${firstTime ? "translate-x-5" : "translate-x-0.5"}`} />
        </span>
      </button>

      {state === "error" && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-body text-sm">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className={`w-full py-4 rounded-xl font-display text-2xl tracking-widest transition-all active:scale-[0.97]
          ${canSubmit ? "bg-brand-neon text-brand-black hover:bg-brand-neon-dim" : "bg-brand-border text-brand-muted cursor-not-allowed"}`}
      >
        {state === "submitting" ? (
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
  );
}
