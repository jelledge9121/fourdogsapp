"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch, getAccessToken } from "@/lib/supabase";

interface PendingClaim {
  id: string;
  customer_id: string;
  customer_name: string;
  action_type: string;
  points: number;
  description: string | null;
  proof_type: string;
  proof_value: string | null;
  created_at: string;
}

export default function PendingRewards({ venueId }: { venueId: string }) {
  const [claims, setClaims] = useState<PendingClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadClaims = useCallback(async () => {
    setLoading(true);
    const token = await getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    const res = await fetch(`/api/host/rewards/pending?venueId=${encodeURIComponent(venueId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      setClaims(json.pending || []);
    }
    setLoading(false);
  }, [venueId]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  async function moderate(
    rewardActionId: string,
    decision: "approved" | "rejected"
  ) {
    setBusyId(rewardActionId);
    setError("");

    const res = await authFetch("/api/host/rewards/moderate", {
      rewardActionId,
      decision,
    });

    if (!res.ok) {
      setError(res.error || "Failed");
    } else {
      setClaims((prev) => prev.filter((c) => c.id !== rewardActionId));
    }
    setBusyId(null);
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <p className="text-brand-muted font-body text-xs text-center py-4">
        Loading...
      </p>
    );
  }

  if (claims.length === 0) {
    return (
      <p className="text-brand-muted font-body text-xs text-center py-4">
        No pending claims.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-red-400 font-body text-xs px-1">{error}</p>
      )}
      {claims.map((claim) => {
        const isBusy = busyId === claim.id;
        return (
          <div
            key={claim.id}
            className="bg-brand-dark border border-brand-border rounded-xl p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="font-body text-sm text-brand-white block truncate">
                  {claim.customer_name}
                </span>
                <span className="font-body text-xs text-brand-muted block">
                  {claim.action_type.replace(/_/g, " ")} ·{" "}
                  <span className="text-brand-neon">+{claim.points}</span>
                </span>
                {claim.description && (
                  <span className="font-body text-[11px] text-brand-muted/70 block truncate mt-0.5">
                    {claim.description}
                  </span>
                )}
                <span className="font-body text-[10px] text-brand-muted/50 block mt-1">
                  {fmtDate(claim.created_at)}
                </span>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  disabled={isBusy}
                  onClick={() => moderate(claim.id, "approved")}
                  className="px-3 py-1.5 rounded-lg bg-brand-neon/10 border border-brand-neon/30
                    text-brand-neon font-body text-xs font-semibold
                    active:scale-95 transition-all disabled:opacity-40"
                >
                  ✓
                </button>
                <button
                  disabled={isBusy}
                  onClick={() => moderate(claim.id, "rejected")}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30
                    text-red-400 font-body text-xs font-semibold
                    active:scale-95 transition-all disabled:opacity-40"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
