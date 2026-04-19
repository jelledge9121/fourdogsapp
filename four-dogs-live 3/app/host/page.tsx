"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  getActiveEvent,
  fetchCheckIns as fetchCIs,
  fetchRewardActions as fetchRAs,
  groupIntoTeams,
} from "@/lib/utils";
import type { EventWithVenue, CheckInWithCustomer, RewardAction, TeamGroup } from "@/lib/types";
import FourDogsLogo from "@/components/FourDogsLogo";
import EventHeader from "@/components/EventHeader";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import TeamCard from "@/components/TeamCard";
import AddTeamModal from "@/components/AddTeamModal";
import OfflineIndicator from "@/components/OfflineIndicator";
import HostAuthGate from "@/components/HostAuthGate";
import EventStatusControl from "@/components/EventStatusControl";
import PlayerSearch from "@/components/PlayerSearch";
import PendingRewards from "@/components/PendingRewards";

type PageState = "loading" | "no-event" | "ready";
type HostPanel = null | "search" | "rewards";

function HostDashboard() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [event, setEvent] = useState<EventWithVenue | null>(null);
  const [checkIns, setCheckIns] = useState<CheckInWithCustomer[]>([]);
  const [rewardActions, setRewardActions] = useState<RewardAction[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<HostPanel>(null);

  const loadCheckIns = useCallback(async (eventId: string) => {
    try {
      const data = await fetchCIs(eventId);
      setCheckIns(data);
    } catch (e) {
      setFetchError(`Check-ins: ${e instanceof Error ? e.message : "failed"}`);
    }
  }, []);

  const loadRewardActions = useCallback(async (eventId: string) => {
    try {
      const data = await fetchRAs(eventId);
      setRewardActions(data);
    } catch (e) {
      setFetchError(`Actions: ${e instanceof Error ? e.message : "failed"}`);
    }
  }, []);

  const venueId = process.env.NEXT_PUBLIC_DEFAULT_VENUE_ID;

  const loadEvent = useCallback(async () => {
    if (!venueId) { setPageState("no-event"); setEvent(null); return; }
    const active = await getActiveEvent(venueId);
    if (!active) {
      setPageState("no-event");
      setEvent(null);
      return;
    }
    setEvent(active);
    await Promise.all([loadCheckIns(active.id), loadRewardActions(active.id)]);
    setPageState("ready");
  }, [loadCheckIns, loadRewardActions]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  // Realtime
  useEffect(() => {
    if (!event) return;
    const ch1 = supabase
      .channel("ci-rt")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "check_ins",
          filter: `event_id=eq.${event.id}`,
        },
        () => loadCheckIns(event.id)
      )
      .subscribe();
    const ch2 = supabase
      .channel("ra-rt")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reward_actions",
          filter: `event_id=eq.${event.id}`,
        },
        () => loadRewardActions(event.id)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [event, loadCheckIns, loadRewardActions]);

  const teams: TeamGroup[] = useMemo(
    () => groupIntoTeams(checkIns, rewardActions),
    [checkIns, rewardActions]
  );
  const totalPlayers = checkIns.length;

  function togglePanel(panel: HostPanel) {
    setActivePanel((prev) => (prev === panel ? null : panel));
  }

  return (
    <main className="min-h-dvh bg-brand-black">
      <OfflineIndicator />

      <header className="sticky top-0 z-40 bg-brand-black/95 backdrop-blur-md border-b border-brand-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <FourDogsLogo size="sm" />
          {event && (
            <div className="flex items-center gap-2">
              {/* Player search toggle */}
              <button
                onClick={() => togglePanel("search")}
                className={`p-2.5 rounded-xl border active:scale-95 transition-all ${
                  activePanel === "search"
                    ? "bg-brand-neon/15 border-brand-neon/40 text-brand-neon"
                    : "bg-brand-dark border-brand-border text-brand-muted hover:text-brand-white"
                }`}
                title="Search Players"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              {/* Pending rewards toggle */}
              <button
                onClick={() => togglePanel("rewards")}
                className={`p-2.5 rounded-xl border active:scale-95 transition-all ${
                  activePanel === "rewards"
                    ? "bg-brand-amber/15 border-brand-amber/40 text-brand-amber"
                    : "bg-brand-dark border-brand-border text-brand-muted hover:text-brand-white"
                }`}
                title="Pending Rewards"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              {/* QR toggle */}
              <button
                onClick={() => setShowQR(!showQR)}
                className="p-2.5 rounded-xl bg-brand-dark border border-brand-border text-brand-muted hover:text-brand-white active:scale-95 transition-all"
                title="QR Code"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM17 17h3v3h-3zM14 14h3v3h-3zM17 14h.01M14 17h.01" />
                </svg>
              </button>
              {/* Add team */}
              <button
                onClick={() => setShowAddTeam(true)}
                className="p-2.5 rounded-xl bg-brand-neon/10 border border-brand-neon/30 text-brand-neon active:scale-95 transition-all"
                title="Add Team"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pb-24">
        {pageState === "loading" && (
          <div className="flex flex-col items-center gap-3 py-20">
            <svg className="w-8 h-8 animate-spin text-brand-neon" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
            </svg>
          </div>
        )}

        {pageState === "no-event" && (
          <div className="flex flex-col items-center text-center py-20">
            <div className="text-5xl mb-4">🐕</div>
            <h2 className="font-display text-3xl tracking-wide text-brand-white mb-2">NO ACTIVE EVENT</h2>
            <p className="font-body text-brand-muted">
              Set an event&apos;s status to <span className="text-brand-neon">live</span> in Supabase.
            </p>
          </div>
        )}

        {pageState === "ready" && event && (
          <>
            {fetchError && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-body text-sm flex items-center justify-between">
                <span>⚠️ {fetchError}</span>
                <button
                  onClick={() => {
                    setFetchError(null);
                    loadCheckIns(event.id);
                    loadRewardActions(event.id);
                  }}
                  className="ml-3 text-red-300 underline text-xs"
                >
                  Retry
                </button>
              </div>
            )}

            <div className="py-5">
              <EventHeader event={event} />
              <div className="mt-3">
                <EventStatusControl event={event} onStatusChange={loadEvent} />
              </div>
            </div>

            {showQR && (
              <div className="flex justify-center pb-5 animate-slide-up">
                <QRCodeDisplay />
              </div>
            )}

            {/* Collapsible panels */}
            {activePanel === "search" && (
              <div className="mb-5 bg-brand-card border border-brand-border rounded-xl p-4 animate-slide-up">
                <h3 className="font-display text-lg tracking-wide text-brand-muted mb-3">
                  PLAYER SEARCH
                </h3>
                <PlayerSearch venueId={event.venue_id} />
              </div>
            )}

            {activePanel === "rewards" && (
              <div className="mb-5 bg-brand-card border border-brand-border rounded-xl p-4 animate-slide-up">
                <h3 className="font-display text-lg tracking-wide text-brand-muted mb-3">
                  PENDING CLAIMS
                </h3>
                <PendingRewards venueId={event.venue_id} />
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <span className="font-display text-lg tracking-wide text-brand-muted">
                TEAMS ({teams.length})
              </span>
              <span className="font-body text-xs text-brand-muted/60">
                {totalPlayers} player{totalPlayers !== 1 ? "s" : ""} checked in
              </span>
            </div>

            {teams.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-brand-border rounded-xl">
                <div className="text-3xl mb-3">📋</div>
                <p className="font-body text-brand-muted text-sm">
                  No teams yet. First check-in will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {teams.map((team) => (
                  <TeamCard
                    key={team.teamName}
                    team={team}
                    event={event}
                    rewardActions={rewardActions}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showAddTeam && event && (
        <AddTeamModal
          eventId={event.id}
          venueId={event.venue_id}
          onClose={() => setShowAddTeam(false)}
        />
      )}
    </main>
  );
}

export default function HostPage() {
  return (
    <HostAuthGate>
      {() => <HostDashboard />}
    </HostAuthGate>
  );
}
