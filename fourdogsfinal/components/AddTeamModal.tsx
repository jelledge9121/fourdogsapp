"use client";

import { useState } from "react";
import { authFetch } from "@/lib/supabase";
import { sanitize } from "@/lib/sanitize";

interface AddTeamModalProps {
  eventId: string;
  venueId: string;
  onClose: () => void;
}

export default function AddTeamModal({ eventId, venueId, onClose }: AddTeamModalProps) {
  const [teamName, setTeamName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd() {
    const cleaned = sanitize(teamName, 30);
    if (!cleaned || busy) return;
    setBusy(true);
    setError("");

    const result = await authFetch("/api/host/add-team", {
      teamName: cleaned,
      eventId,
      venueId,
    });

    if (!result.ok) {
      if (result.error === "Team already exists") {
        onClose();
        return;
      }
      setError(result.error || "Failed to add team");
      setBusy(false);
      return;
    }

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-brand-card border border-brand-border rounded-2xl p-5 animate-slide-up">
        <h3 className="font-display text-2xl tracking-wide text-brand-white mb-4">ADD TEAM</h3>
        <input
          type="text"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value.slice(0, 30))}
          placeholder="Team name"
          autoFocus
          autoComplete="off"
          className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-brand-border
            text-brand-white font-body text-lg placeholder:text-brand-muted/50
            focus:outline-none focus:border-brand-neon/50 transition-colors"
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
        />
        {error && <div className="mt-2 text-red-400 text-sm font-body">{error}</div>}
        <div className="flex gap-3 mt-4">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-brand-border text-brand-muted font-body font-semibold active:scale-95 transition-transform">
            Cancel
          </button>
          <button onClick={handleAdd} disabled={!teamName.trim() || busy}
            className={`flex-1 py-3 rounded-xl font-display text-lg tracking-wider active:scale-95 transition-all ${
              teamName.trim() && !busy ? "bg-brand-neon text-brand-black" : "bg-brand-border text-brand-muted cursor-not-allowed"}`}>
            {busy ? "ADDING..." : "ADD"}
          </button>
        </div>
      </div>
    </div>
  );
}
