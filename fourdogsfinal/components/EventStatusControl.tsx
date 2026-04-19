"use client";

import { useState } from "react";
import { authFetch } from "@/lib/supabase";
import type { EventWithVenue } from "@/lib/types";

interface EventStatusControlProps {
  event: EventWithVenue;
  onStatusChange: () => void;
}

export default function EventStatusControl({
  event,
  onStatusChange,
}: EventStatusControlProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isLive = event.status === "live";
  const nextStatus = isLive ? "closed" : "live";

  async function handleToggle() {
    if (busy) return;
    if (
      isLive &&
      !confirm("Close this event? Players won't be able to check in.")
    )
      return;

    setBusy(true);
    setError("");

    const result = await authFetch("/api/host/event-status", {
      eventId: event.id,
      venueId: event.venue_id,
      status: nextStatus,
    });

    if (!result.ok) {
      setError(result.error || "Failed");
    } else {
      onStatusChange();
    }
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleToggle}
        disabled={busy}
        className={`px-4 py-2 rounded-xl font-display text-sm tracking-wider active:scale-95 transition-all ${
          isLive
            ? "bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25"
            : "bg-brand-neon/15 border border-brand-neon/40 text-brand-neon hover:bg-brand-neon/25"
        }`}
      >
        {busy
          ? "UPDATING..."
          : isLive
          ? "CLOSE EVENT"
          : "SET LIVE"}
      </button>
      {error && (
        <span className="text-red-400 text-xs font-body">{error}</span>
      )}
    </div>
  );
}
