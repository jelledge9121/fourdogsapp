"use client";

import { useState, useCallback } from "react";
import { authFetch } from "@/lib/supabase";
import type { EventWithVenue, TeamGroup, RewardAction, RewardActionType } from "@/lib/types";

interface ActionButtonsProps {
  team: TeamGroup;
  event: EventWithVenue;
  rewardActions: RewardAction[];
}

export default function ActionButtons({ team, event, rewardActions }: ActionButtonsProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [flashed, setFlashed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const playerIds = team.players.map((p) => p.customer_id);
  const teamActions = rewardActions.filter((ra) => playerIds.includes(ra.customer_id));

  const hasTeamAction = (actionType: RewardActionType, descKey?: string) =>
    teamActions.some(
      (ra) => ra.action_type === actionType && (!descKey || ra.description?.includes(descKey))
    );

  const primaryCustomerId = team.players[0]?.customer_id;

  const applyBonus = useCallback(
    async (actionType: RewardActionType, points: number, description: string) => {
      if (busy || !primaryCustomerId) return;
      setBusy(description);
      setError(null);

      const result = await authFetch("/api/host/bonus", {
        customerId: primaryCustomerId,
        eventId: event.id,
        venueId: event.venue_id,
        actionType,
        points,
        description,
      });

      if (!result.ok) {
        setError(result.error || "Failed");
      } else {
        setFlashed(description);
        setTimeout(() => setFlashed(null), 600);
      }

      setTimeout(() => setBusy(null), 300);
    },
    [busy, primaryCustomerId, event.id, event.venue_id]
  );

  if (event.event_type === "trivia") {
    const bonuses = [
      { label: "Tag Friends", actionType: "facebook_tag" as RewardActionType, points: 1, icon: "🏷️", desc: "facebook_tag_bonus" },
      { label: "Brought New", actionType: "referral" as RewardActionType, points: 2, icon: "🤝", desc: "brought_new_player" },
      { label: "First Time", actionType: "first_visit" as RewardActionType, points: 2, icon: "⭐", desc: "first_time_team_bonus" },
    ];

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {bonuses.map((b) => {
            const used = hasTeamAction(b.actionType, b.desc);
            const isBusy = busy === b.desc;
            const didFlash = flashed === b.desc;
            return (
              <button
                key={b.desc}
                disabled={used || isBusy}
                onClick={() => applyBonus(b.actionType, b.points, b.desc)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-body text-sm font-semibold
                  transition-all duration-150 active:scale-95
                  ${used ? "bg-brand-border/50 text-brand-muted cursor-not-allowed opacity-50"
                    : didFlash ? "bg-brand-neon/30 text-brand-neon border border-brand-neon"
                    : "bg-brand-neon/10 text-brand-neon border border-brand-neon/30 hover:bg-brand-neon/20"}`}
              >
                <span>{b.icon}</span>
                <span>{used ? `${b.label} ✓` : `${b.label} +${b.points}`}</span>
              </button>
            );
          })}
        </div>
        {error && <div className="text-red-400 text-xs font-body px-1">{error}</div>}
      </div>
    );
  }

  // Music Bingo
  const toggleBingoFlag = async (flag: "free_square" | "extra_card", currentlyOn: boolean) => {
    if (busy || !primaryCustomerId) return;
    const desc = currentlyOn ? `${flag}_off` : `${flag}_on`;
    setBusy(desc);
    setError(null);

    const result = await authFetch("/api/host/toggle", {
      customerId: primaryCustomerId,
      eventId: event.id,
      venueId: event.venue_id,
      flag: desc,
      description: desc,
      points: currentlyOn ? 0 : 1,
    });

    if (!result.ok) {
      setError(result.error || "Failed");
    } else {
      setFlashed(desc);
      setTimeout(() => setFlashed(null), 600);
    }
    setTimeout(() => setBusy(null), 300);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <ToggleButton label="Free Square" icon="🟩" active={team.hasFreeSq} busy={busy} flashed={flashed}
          onToggle={() => toggleBingoFlag("free_square", team.hasFreeSq)}
          actionKey={team.hasFreeSq ? "free_square_off" : "free_square_on"} />
        <ToggleButton label="Extra Card" icon="🃏" active={team.hasExtraCard} busy={busy} flashed={flashed}
          onToggle={() => toggleBingoFlag("extra_card", team.hasExtraCard)}
          actionKey={team.hasExtraCard ? "extra_card_off" : "extra_card_on"} />
      </div>
      {error && <div className="text-red-400 text-xs font-body px-1">{error}</div>}
    </div>
  );
}

function ToggleButton({ label, icon, active, busy, flashed, onToggle, actionKey }: {
  label: string; icon: string; active: boolean; busy: string | null;
  flashed: string | null; onToggle: () => void; actionKey: string;
}) {
  const isBusy = busy === actionKey;
  const didFlash = flashed === actionKey;
  return (
    <button disabled={isBusy} onClick={onToggle}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-body text-sm font-semibold
        transition-all duration-150 active:scale-95
        ${didFlash ? "bg-brand-neon/30 text-brand-neon border border-brand-neon"
          : active ? "bg-brand-amber/15 text-brand-amber border border-brand-amber/40"
          : "bg-brand-border/50 text-brand-muted border border-brand-border hover:bg-brand-border"}`}>
      <span>{icon}</span>
      <span>{label} {active ? "ON" : "OFF"}</span>
    </button>
  );
}
