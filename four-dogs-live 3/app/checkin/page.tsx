"use client";

import { useEffect, useState } from "react";
import FourDogsLogo from "@/components/FourDogsLogo";
import CheckInForm from "@/components/CheckInForm";
import OfflineIndicator from "@/components/OfflineIndicator";
import { getActiveEvent } from "@/lib/utils";
import type { EventWithVenue } from "@/lib/types";

type PageState = "loading" | "no-event" | "ready";

export default function CheckInPage() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [event, setEvent] = useState<EventWithVenue | null>(null);

  const venueId = process.env.NEXT_PUBLIC_DEFAULT_VENUE_ID;

  useEffect(() => {
    async function load() {
      if (!venueId) { setPageState("no-event"); return; }
      const active = await getActiveEvent(venueId);
      if (active) {
        setEvent(active);
        setPageState("ready");
      } else {
        setPageState("no-event");
      }
    }
    load();
  }, []);

  const typeLabel =
    event?.event_type === "trivia"
      ? "Trivia"
      : event?.event_type === "music_bingo"
      ? "Music Bingo"
      : "";

  return (
    <main className="min-h-dvh bg-brand-black flex flex-col">
      <OfflineIndicator />

      <header className="flex justify-center pt-8 pb-4 px-6">
        <FourDogsLogo size="md" />
      </header>

      <div className="flex-1 flex flex-col justify-center px-6 pb-12 max-w-md mx-auto w-full">
        {pageState === "loading" && (
          <div className="flex flex-col items-center gap-3 py-16">
            <svg className="w-8 h-8 animate-spin text-brand-neon" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
            </svg>
            <span className="font-body text-brand-muted text-sm">Loading event...</span>
          </div>
        )}

        {pageState === "no-event" && (
          <div className="flex flex-col items-center text-center py-16">
            <div className="text-5xl mb-4">🐕</div>
            <h2 className="font-display text-3xl tracking-wide text-brand-white mb-2">
              NO ACTIVE EVENT
            </h2>
            <p className="font-body text-brand-muted text-base">Please see host.</p>
          </div>
        )}

        {pageState === "ready" && event && (
          <>
            <div className="text-center mb-6">
              <h1 className="font-display text-3xl tracking-wide text-brand-white">CHECK IN</h1>
              <p className="font-body text-brand-muted text-sm mt-1">
                {typeLabel} @ {event.venue?.name || ""}
              </p>
            </div>
            <CheckInForm event={event} />
          </>
        )}
      </div>

      <footer className="pb-6 text-center">
        <span className="font-body text-brand-muted/40 text-xs">Four Dogs Entertainment</span>
      </footer>
    </main>
  );
}
