"use client";

import { useState } from "react";
import type { EventWithVenue, TeamGroup, RewardAction } from "@/lib/types";
import ActionButtons from "./ActionButtons";

interface TeamCardProps {
  team: TeamGroup;
  event: EventWithVenue;
  rewardActions: RewardAction[];
}

export default function TeamCard({ team, event, rewardActions }: TeamCardProps) {
  const [expanded, setExpanded] = useState(false);

  const playerCount = team.players.length;
  const isTrivia = event.event_type === "trivia";

  return (
    <div
      className={`bg-brand-card border border-brand-border rounded-xl overflow-hidden transition-all duration-200 ${
        expanded ? "neon-border" : ""
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-brand-border/30 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display text-2xl tracking-wide text-brand-white truncate">
              {team.teamName}
            </span>
            {team.hasFirstTimer && (
              <span className="shrink-0 text-xs bg-brand-amber/15 text-brand-amber px-1.5 py-0.5 rounded font-body font-semibold">
                NEW
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-brand-muted font-body text-xs">
            <span>
              {playerCount} player{playerCount !== 1 ? "s" : ""}
            </span>
            {isTrivia && team.bonusPoints > 0 && (
              <>
                <span>•</span>
                <span className="text-brand-neon font-semibold">+{team.bonusPoints} pts</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isTrivia && team.hasFreeSq && <span className="text-lg">🟩</span>}
          {!isTrivia && team.hasExtraCard && <span className="text-lg">🃏</span>}
          <svg
            className={`w-5 h-5 text-brand-muted transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-brand-border/50 animate-slide-up">
          <ActionButtons team={team} event={event} rewardActions={rewardActions} />

          {team.players.length > 0 && (
            <div className="mt-3 pt-3 border-t border-brand-border/30">
              <div className="text-brand-muted font-body text-xs mb-1.5">Players:</div>
              <div className="flex flex-wrap gap-1.5">
                {team.players.map((ci) => (
                  <span
                    key={ci.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-brand-dark text-brand-white font-body text-xs"
                  >
                    {ci.customer?.full_name || "Unknown"}
                    {ci.is_first_visit && <span className="text-brand-amber">★</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
