"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import FourDogsLogo from "@/components/FourDogsLogo";
import OfflineIndicator from "@/components/OfflineIndicator";
import { sanitize, isValid } from "@/lib/sanitize";

interface AvailableEvent {
  id: string;
  title: string;
  event_date: string;
  status: string;
  venue_name: string;
}

interface RewardSummary {
  customer_id: string;
  total_points?: number;
  total_visits?: number;
  available_rewards?: number;
}

type PageState = "loading" | "no-event" | "select-event" | "form";
type FormState = "idle" | "submitting" | "success" | "error";

function formatDate(dateStr: string): string {
  const raw = dateStr.slice(0, 10);
  const [year, month, day] = raw.split("-").map(Number);
  const d = new Date(year, month - 1, day);

  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getStatusClasses(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "live") {
    return {
      pill: "border-emerald-400/30 bg-emerald-400/12 text-emerald-300 shadow-[0_0_18px_rgba(34,197,94,0.08)]",
      dot: "bg-emerald-400",
      card: "hover:border-emerald-400/35 hover:shadow-[0_0_0_1px_rgba(34,197,94,0.14),0_18px_40px_rgba(0,0,0,0.38)]",
    };
  }

  return {
    pill: "border-white/10 bg-white/[0.04] text-slate-300",
    dot: "bg-slate-400",
    card: "hover:border-cyan-400/18 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.07),0_18px_40px_rgba(0,0,0,0.34)]",
  };
}

function CheckInContent() {
  const searchParams = useSearchParams();
  const referrerId = searchParams.get("ref");

  const [pageState, setPageState] = useState<PageState>("loading");
  const [events, setEvents] = useState<AvailableEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AvailableEvent | null>(null);

  const [playerName, setPlayerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [teamName, setTeamName] = useState("");
  const [firstTime, setFirstTime] = useState(false);

  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [rewardSummary, setRewardSummary] = useState<RewardSummary | null>(null);

  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch("/api/events", { cache: "no-store" });
        const json = await res.json();

        if (!res.ok) {
          setErrorMsg(json.error || "Could not load events.");
          setPageState("no-event");
          return;
        }

        const available = (json.events ?? []) as AvailableEvent[];

        if (available.length === 0) {
          setErrorMsg("");
          setPageState("no-event");
          return;
        }

        setEvents(available);

        const storedCustomerId = localStorage.getItem("customerId");

        if (storedCustomerId) {
          try {
            const rewardRes = await fetch(
              `/api/customer-rewards?customerId=${storedCustomerId}`,
              { cache: "no-store" }
            );

            const rewardJson = await rewardRes.json();

            if (rewardRes.ok) {
              setRewardSummary(rewardJson.summary);
            }
          } catch {
            // Keep page usable even if rewards summary fails to load
          }
        }

        if (available.length === 1) {
          setSelectedEvent(available[0]);
          setPageState("form");
        } else {
          setPageState("select-event");
        }
      } catch {
        setErrorMsg("Could not load events.");
        setPageState("no-event");
      }
    }

    loadEvents();
  }, []);

  function handleSelectEvent(ev: AvailableEvent) {
    setSelectedEvent(ev);
    setPageState("form");
  }

  function handleBackToEvents() {
    setSelectedEvent(null);
    setFormState("idle");
    setErrorMsg("");
    setRewardSummary(null);
    setPageState("select-event");
  }

  const canSubmit = isValid(playerName) && formState !== "submitting";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !selectedEvent) return;

    setFormState("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: sanitize(playerName, 100),
          phone: phone ? sanitize(phone, 20) : "",
          email: email ? sanitize(email, 100) : "",
          teamName: teamName ? sanitize(teamName, 30) : "",
          firstTime,
          eventId: selectedEvent.id,
          referredByCustomerId: referrerId || null,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setFormState("error");
        setErrorMsg(json.error || "Check-in failed. Try again.");
        return;
      }

      setFormState("success");

      if (json.customerId) {
        localStorage.setItem("customerId", json.customerId);

        try {
          const rewardRes = await fetch(
            `/api/customer-rewards?customerId=${json.customerId}`,
            { cache: "no-store" }
          );

          const rewardJson = await rewardRes.json();

          if (rewardRes.ok) {
            setRewardSummary(rewardJson.summary);
          }
        } catch {
          // Keep success screen even if rewards summary fails to load
        }
      }
    } catch {
      setFormState("error");
      setErrorMsg("Network error. Try again.");
    }
  }

  const handleReset = useCallback(() => {
    setPlayerName("");
    setPhone("");
    setEmail("");
    setTeamName("");
    setFirstTime(false);
    setFormState("idle");
    setErrorMsg("");
    setSelectedEvent(null);
    setPageState(
      events.length > 1 ? "select-event" : events.length === 1 ? "form" : "no-event"
    );
  }, [events]);

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.10),_transparent_18%),radial-gradient(circle_at_top,_rgba(8,145,178,0.12),_transparent_42%),linear-gradient(180deg,_#020817_0%,_#04101f_28%,_#071425_58%,_#020817_100%)] text-white">
      <OfflineIndicator />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-10 pt-5 sm:px-6 sm:pb-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-cyan-400/[0.05] to-transparent" />
        <div className="pointer-events-none absolute inset-x-10 top-10 h-24 rounded-full bg-emerald-400/[0.05] blur-3xl" />

        <header className="relative pb-5">
          <div className="mx-auto w-full rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,18,34,0.92),rgba(5,12,24,0.82))] px-5 py-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/25 to-transparent" />
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <div className="absolute inset-0 scale-110 rounded-full bg-cyan-400/10 blur-2xl" />
                <div className="relative">
                  <FourDogsLogo size="md" />
                </div>
              </div>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Four Dogs Check-In
              </div>

              <h1 className="mt-4 text-[2rem] font-semibold tracking-[-0.03em] text-white">
                {pageState === "form" && selectedEvent ? "Enter the Event" : "Select Your Event"}
              </h1>

              <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">
                Fast mobile check-in built for live trivia, music bingo, and premium event nights.
              </p>
            </div>
          </div>
        </header>

        <div className="relative flex-1">
          {pageState === "loading" && (
            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,18,34,0.9),rgba(5,12,24,0.84))] px-6 py-12 text-center shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-emerald-400" />
              <div className="text-base font-medium text-white">Loading events...</div>
              <div className="mt-2 text-sm text-slate-400">
                Getting everything ready for tonight
              </div>
            </div>
          )}

          {pageState === "no-event" && (
            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,18,34,0.9),rgba(5,12,24,0.84))] px-6 py-12 text-center shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-2xl">
                🎟️
              </div>
              <div className="text-xl font-semibold text-white">No events available</div>
              <div className="mt-2 text-sm text-slate-400">
                There are no active check-ins right now.
              </div>
              {errorMsg && <div className="mt-4 text-sm text-red-400">{errorMsg}</div>}
            </div>
          )}

          {pageState === "select-event" && (
            <section className="space-y-3">
              {events.map((ev) => {
                const statusStyles = getStatusClasses(ev.status);
                const isLive = ev.status.toLowerCase() === "live";

                return (
                  <button
                    key={ev.id}
                    onClick={() => handleSelectEvent(ev)}
                    className={[
                      "group relative w-full overflow-hidden rounded-[24px] border bg-[linear-gradient(180deg,rgba(17,28,48,0.96),rgba(12,22,38,0.98))] p-5 text-left transition-all duration-200",
                      "border-white/10 shadow-[0_18px_40px_rgba(0,0,0,0.34)]",
                      "active:scale-[0.99]",
                      statusStyles.card,
                    ].join(" ")}
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                    <div
                      className={`pointer-events-none absolute left-0 top-4 bottom-4 w-[3px] rounded-full ${
                        isLive ? "bg-emerald-400/90" : "bg-cyan-400/20"
                      }`}
                    />

                    <div className="pl-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[1.35rem] font-semibold leading-tight tracking-[-0.02em] text-white">
                            {ev.title}
                          </div>

                          <div className="mt-2 text-sm text-slate-400">
                            {ev.venue_name} • {formatDate(ev.event_date)}
                          </div>
                        </div>

                        <div
                          className={[
                            "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]",
                            statusStyles.pill,
                          ].join(" ")}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${statusStyles.dot} ${
                                isLive ? "animate-pulse" : ""
                              }`}
                            />
                            {ev.status}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          Tap to continue
                        </div>
                        <div className="text-sm font-medium text-emerald-300 transition-transform duration-200 group-hover:translate-x-1">
                          Enter →
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </section>
          )}

          {pageState === "form" && selectedEvent && formState !== "success" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {events.length > 1 && (
                <button
                  type="button"
                  onClick={handleBackToEvents}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.07]"
                >
                  <span aria-hidden="true">←</span>
                  Back to events
                </button>
              )}

              <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,18,34,0.95),rgba(5,12,24,0.88))] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/25 to-transparent" />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
                      Selected Event
                    </div>
                    <div className="mt-2 text-[1.6rem] font-semibold leading-tight tracking-[-0.03em] text-white">
                      {selectedEvent.title}
                    </div>
                    <div className="mt-2 text-sm text-slate-400">
                      {selectedEvent.venue_name} • {formatDate(selectedEvent.event_date)}
                    </div>
                  </div>

                  <div className="shrink-0 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-right">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-300">
                      Status
                    </div>
                    <div className="mt-1 text-sm font-semibold text-white">
                      {selectedEvent.status}
                    </div>
                  </div>
                </div>
              </div>

              {rewardSummary && (
                <div className="rounded-[28px] border border-emerald-400/20 bg-[linear-gradient(180deg,rgba(10,24,26,0.98),rgba(6,16,22,0.98))] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.32)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
                        VIP Loyalty
                      </div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        Your rewards snapshot
                      </div>
                    </div>

                    <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                      Active
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                        Points
                      </div>
                      <div className="mt-2 text-2xl font-bold text-emerald-300">
                        {rewardSummary.total_points ?? 0}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                        Visits
                      </div>
                      <div className="mt-2 text-2xl font-bold text-white">
                        {rewardSummary.total_visits ?? 0}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                        Rewards
                      </div>
                      <div className="mt-2 text-2xl font-bold text-white">
                        {rewardSummary.available_rewards ?? 0}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,18,34,0.95),rgba(5,12,24,0.88))] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                <div className="mb-5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Player Details
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    Quick check-in
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="playerName"
                      className="text-sm font-medium text-slate-200"
                    >
                      Your Name
                    </label>
                    <input
                      id="playerName"
                      placeholder="Enter your name"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="h-14 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-base text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="phone"
                      className="text-sm font-medium text-slate-200"
                    >
                      Phone
                    </label>
                    <input
                      id="phone"
                      placeholder="Optional"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-14 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-base text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="email"
                      className="text-sm font-medium text-slate-200"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      placeholder="Optional"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-14 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-base text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="teamName"
                      className="text-sm font-medium text-slate-200"
                    >
                      Team Name
                    </label>
                    <input
                      id="teamName"
                      placeholder="Optional"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="h-14 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-base text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                    />
                  </div>

                  <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 transition hover:border-emerald-400/25">
                    <input
                      type="checkbox"
                      checked={firstTime}
                      onChange={(e) => setFirstTime(e.target.checked)}
                      className="h-5 w-5 rounded border-white/20 bg-slate-950 text-emerald-500 focus:ring-emerald-400/30"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white">
                        First time here?
                      </div>
                      <div className="text-xs text-slate-400">
                        Let us know if this is your first visit.
                      </div>
                    </div>
                  </label>

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="mt-2 flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-400 px-5 text-base font-bold text-slate-950 shadow-[0_16px_35px_rgba(34,197,94,0.28)] transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {formState === "submitting" ? "Checking in..." : "Check In"}
                  </button>

                  {formState === "error" && (
                    <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      {errorMsg}
                    </div>
                  )}
                </div>
              </div>
            </form>
          )}

          {formState === "success" && (
            <div className="space-y-4 py-2">
              <div className="rounded-[28px] border border-emerald-400/20 bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.18),_transparent_40%),linear-gradient(180deg,rgba(9,18,34,0.96),rgba(6,16,22,0.96))] p-6 text-center shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-3xl shadow-[0_0_24px_rgba(34,197,94,0.18)]">
                  ✓
                </div>
                <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
                  Check-In Complete
                </div>
                <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-white">
                  You&apos;re in!
                </div>
                <div className="mt-2 text-sm text-slate-300">
                  You’re checked in and ready to play.
                </div>
              </div>

              {rewardSummary && (
                <div className="space-y-4 rounded-[28px] border border-emerald-400/20 bg-[linear-gradient(180deg,rgba(10,24,26,0.98),rgba(6,16,22,0.98))] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.32)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
                        Loyalty Status
                      </div>
                      <div className="mt-2 text-lg font-semibold text-white">
                        Your VIP summary
                      </div>
                    </div>

                    <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                      Updated
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                        Points
                      </div>
                      <div className="mt-2 text-2xl font-bold text-emerald-300">
                        {rewardSummary.total_points ?? 0}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                        Visits
                      </div>
                      <div className="mt-2 text-2xl font-bold text-white">
                        {rewardSummary.total_visits ?? 0}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                        Rewards
                      </div>
                      <div className="mt-2 text-2xl font-bold text-white">
                        {rewardSummary.available_rewards ?? 0}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
                    Show this screen to your host to redeem rewards.
                  </div>
                </div>
              )}

              {!rewardSummary && (
                <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-slate-300 shadow-[0_14px_35px_rgba(0,0,0,0.24)]">
                  Check-in complete. Show this screen to your host if needed.
                </div>
              )}

              <button
                onClick={handleReset}
                className="flex h-14 w-full items-center justify-center rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(17,28,48,0.96),rgba(12,22,38,0.98))] px-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-slate-900"
              >
                Check in another player
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function CheckInPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh overflow-x-hidden bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.10),_transparent_18%),radial-gradient(circle_at_top,_rgba(8,145,178,0.12),_transparent_42%),linear-gradient(180deg,_#020817_0%,_#04101f_28%,_#071425_58%,_#020817_100%)] text-white">
          <OfflineIndicator />
          <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-10 pt-5 sm:px-6 sm:pb-12">
            <header className="pb-5">
              <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,18,34,0.92),rgba(5,12,24,0.82))] px-5 py-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                <div className="flex flex-col items-center text-center">
                  <FourDogsLogo size="md" />
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Four Dogs Check-In
                  </div>
                  <h1 className="mt-4 text-[2rem] font-semibold tracking-[-0.03em] text-white">
                    Loading
                  </h1>
                </div>
              </div>
            </header>

            <div className="flex flex-1 items-start">
              <div className="w-full rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,18,34,0.9),rgba(5,12,24,0.84))] px-6 py-12 text-center shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-emerald-400" />
                <div className="text-base font-medium text-white">Loading...</div>
              </div>
            </div>
          </div>
        </main>
      }
    >
      <CheckInContent />
    </Suspense>
  );
}
