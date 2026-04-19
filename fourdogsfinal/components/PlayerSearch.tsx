"use client";

import { useState, useCallback } from "react";
import { authFetch } from "@/lib/supabase";
import CustomerProfilePanel from "./CustomerProfilePanel";

interface SearchResult {
  id: string;
  full_name: string;
  phone: string | null;
  facebook_name: string | null;
  referral_code: string;
}

export default function PlayerSearch({ venueId }: { venueId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const doSearch = useCallback(async () => {
    const q = query.trim();
    if (!q || q.length < 2) return;
    setSearching(true);
    setSearched(true);
    setSelectedId(null);

    const res = await authFetch("/api/host/customers/search", { q, venueId });
    if (res.ok && res.data) {
      setResults(
        (res.data as { results: SearchResult[] }).results || []
      );
    } else {
      setResults([]);
    }
    setSearching(false);
  }, [query]);

  if (selectedId) {
    return (
      <CustomerProfilePanel
        customerId={selectedId}
        venueId={venueId}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") doSearch();
          }}
          placeholder="Name, phone, or Facebook name"
          className="flex-1 px-3 py-2.5 rounded-xl bg-brand-dark border border-brand-border
            text-brand-white font-body text-sm placeholder:text-brand-muted/50
            focus:outline-none focus:border-brand-neon/50 transition-colors"
        />
        <button
          onClick={doSearch}
          disabled={searching || query.trim().length < 2}
          className="px-4 py-2.5 rounded-xl bg-brand-neon/10 border border-brand-neon/30
            text-brand-neon font-body text-sm font-semibold active:scale-95 transition-all
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {searching ? "..." : "Search"}
        </button>
      </div>

      {searched && !searching && results.length === 0 && (
        <p className="text-brand-muted font-body text-xs text-center py-3">
          No customers found.
        </p>
      )}

      {results.length > 0 && (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {results.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg
                bg-brand-dark border border-brand-border text-left
                hover:border-brand-neon/30 active:scale-[0.99] transition-all"
            >
              <div className="min-w-0">
                <span className="font-body text-sm text-brand-white block truncate">
                  {c.full_name}
                </span>
                <span className="font-body text-xs text-brand-muted block truncate">
                  {[c.phone, c.facebook_name].filter(Boolean).join(" · ") ||
                    c.referral_code}
                </span>
              </div>
              <svg
                className="w-4 h-4 text-brand-muted shrink-0 ml-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
