"use client";

import { useState, useEffect } from "react";
import { authFetch } from "@/lib/supabase";

interface ProfileData {
  customer: {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
    facebook_name: string | null;
    referral_code: string;
    created_at: string;
  };
  reward: { points_balance: number; visits: number };
  recentActions: {
    id: string;
    action_type: string;
    points: number;
    description: string | null;
    status: string;
    created_at: string;
  }[];
  recentCheckins: {
    id: string;
    team_name: string | null;
    is_first_visit: boolean;
    created_at: string;
  }[];
}

interface Props {
  customerId: string;
  venueId: string;
  onBack: () => void;
}

export default function CustomerProfilePanel({ customerId, venueId, onBack }: Props) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await authFetch("/api/host/customers/profile", {
        customerId,
        venueId,
      });
      if (res.ok && res.data) {
        setData(res.data as ProfileData);
      } else {
        setError(res.error || "Failed to load profile");
      }
      setLoading(false);
    }
    load();
  }, [customerId, venueId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <svg
          className="w-6 h-6 animate-spin text-brand-neon"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            className="opacity-25"
          />
          <path
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            fill="currentColor"
            className="opacity-75"
          />
        </svg>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-6">
        <p className="text-red-400 font-body text-sm mb-3">{error}</p>
        <button
          onClick={onBack}
          className="text-brand-neon font-body text-sm underline"
        >
          ← Back to search
        </button>
      </div>
    );
  }

  const { customer, reward, recentActions, recentCheckins } = data;

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="text-brand-neon font-body text-xs flex items-center gap-1 hover:underline"
      >
        <svg
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back
      </button>

      {/* Header */}
      <div className="bg-brand-dark border border-brand-border rounded-xl p-4">
        <h3 className="font-display text-xl tracking-wide text-brand-white">
          {customer.full_name}
        </h3>
        <div className="mt-2 space-y-1 font-body text-xs text-brand-muted">
          {customer.phone && <p>📱 {customer.phone}</p>}
          {customer.email && <p>✉️ {customer.email}</p>}
          {customer.facebook_name && <p>👤 {customer.facebook_name}</p>}
          <p>🎟️ Code: {customer.referral_code}</p>
          <p>📅 Since {fmtDate(customer.created_at)}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-brand-dark border border-brand-border rounded-xl p-3 text-center">
          <div className="font-display text-2xl text-brand-neon">
            {reward.points_balance}
          </div>
          <div className="font-body text-xs text-brand-muted">Points</div>
        </div>
        <div className="bg-brand-dark border border-brand-border rounded-xl p-3 text-center">
          <div className="font-display text-2xl text-brand-cyan">
            {reward.visits}
          </div>
          <div className="font-body text-xs text-brand-muted">Visits</div>
        </div>
      </div>

      {/* Recent Check-ins */}
      {recentCheckins.length > 0 && (
        <div>
          <h4 className="font-display text-sm tracking-wide text-brand-muted mb-2">
            RECENT CHECK-INS
          </h4>
          <div className="space-y-1">
            {recentCheckins.map((ci) => (
              <div
                key={ci.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-brand-dark text-xs font-body"
              >
                <span className="text-brand-white">
                  {ci.team_name || "—"}
                  {ci.is_first_visit && (
                    <span className="text-brand-amber ml-1">★</span>
                  )}
                </span>
                <span className="text-brand-muted">{fmtDate(ci.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Actions */}
      {recentActions.length > 0 && (
        <div>
          <h4 className="font-display text-sm tracking-wide text-brand-muted mb-2">
            REWARD HISTORY
          </h4>
          <div className="space-y-1">
            {recentActions.map((ra) => (
              <div
                key={ra.id}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-brand-dark text-xs font-body"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-brand-white">
                    {ra.action_type.replace(/_/g, " ")}
                  </span>
                  <span
                    className={`ml-2 ${
                      ra.points > 0
                        ? "text-brand-neon"
                        : ra.points < 0
                        ? "text-red-400"
                        : "text-brand-muted"
                    }`}
                  >
                    {ra.points > 0 ? "+" : ""}
                    {ra.points}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      ra.status === "approved"
                        ? "bg-brand-neon/10 text-brand-neon"
                        : ra.status === "rejected"
                        ? "bg-red-500/10 text-red-400"
                        : "bg-brand-amber/10 text-brand-amber"
                    }`}
                  >
                    {ra.status}
                  </span>
                  <span className="text-brand-muted">
                    {fmtDate(ra.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
