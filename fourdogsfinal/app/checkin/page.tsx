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
    setRewardSummary(null);
    setSelectedEvent(null);
    setPageState(
      events.length > 1 ? "select-event" : events.length === 1 ? "form" : "no-event"
    );
  }, [events]);

  return (
    <main className="min-h-dvh bg-brand-black flex flex-col">
      <OfflineIndicator />

      <header className="flex justify-center pt-8 pb-4 px-6">
        <FourDogsLogo size="md" />
      </header>

      <div className="flex-1 flex flex-col justify-center px-6 pb-12 max-w-md mx-auto w-full">
        {pageState === "loading" && (
          <div className="text-center py-16 text-white">Loading events...</div>
        )}

        {pageState === "no-event" && (
          <div className="text-center py-16 text-white">
            <div>No events available</div>
            {errorMsg && <div className="mt-2 text-sm text-red-400">{errorMsg}</div>}
          </div>
        )}

        {pageState === "select-event" && (
          <div>
            <h1 className="text-white text-2xl mb-4 text-center">Select Event</h1>
            <div className="space-y-3">
              {events.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => handleSelectEvent(ev)}
                  className="w-full rounded bg-gray-800 p-4 text-left text-white"
                >
                  <div className="font-semibold">{ev.title}</div>
                  <div className="text-sm opacity-70">
                    {ev.venue_name} • {formatDate(ev.event_date)}
                  </div>
                  <div className="mt-1 text-xs uppercase opacity-60">{ev.status}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {pageState === "form" && selectedEvent && formState !== "success" && (
          <form onSubmit={handleSubmit} className="space-y-4 text-white">
            {events.length > 1 && (
              <button type="button" onClick={handleBackToEvents}>
                ← Back
              </button>
            )}

            <div className="text-lg font-semibold">{selectedEvent.title}</div>
            <div className="text-sm opacity-70">
              {selectedEvent.venue_name} • {formatDate(selectedEvent.event_date)}
            </div>

            <input
              placeholder="Your Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full rounded bg-gray-800 p-3"
            />

            <input
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded bg-gray-800 p-3"
            />

            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded bg-gray-800 p-3"
            />

            <input
              placeholder="Team Name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full rounded bg-gray-800 p-3"
            />

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={firstTime}
                onChange={(e) => setFirstTime(e.target.checked)}
              />
              First time here?
            </label>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded bg-green-500 p-4 disabled:opacity-50"
            >
              {formState === "submitting" ? "Checking in..." : "Check In"}
            </button>

            {formState === "error" && <div className="text-red-400">{errorMsg}</div>}
          </form>
        )}

        {formState === "success" && (
          <div className="space-y-4 py-10 text-center text-white">
            <div className="text-2xl font-bold">You're in!</div>

            {rewardSummary && (
              <div className="space-y-2 rounded bg-gray-800 p-4 text-left">
                <div>
                  <strong>Points:</strong> {rewardSummary.total_points ?? 0}
                </div>
                <div>
                  <strong>Visits:</strong> {rewardSummary.total_visits ?? 0}
                </div>
                {typeof rewardSummary.available_rewards !== "undefined" && (
                  <div>
                    <strong>Available Rewards:</strong>{" "}
                    {rewardSummary.available_rewards ?? 0}
                  </div>
                )}
                <div className="pt-2 text-sm opacity-80">
                  Show this screen to your host to redeem rewards.
                </div>
              </div>
            )}

            {!rewardSummary && (
              <div className="text-sm opacity-80">
                Check-in complete. Show this screen to your host if needed.
              </div>
            )}

            <div className="mt-4">
              <button
                onClick={handleReset}
                className="rounded bg-gray-800 px-4 py-2"
              >
                Check in another player
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function CheckInPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh bg-brand-black flex flex-col">
          <OfflineIndicator />
          <header className="flex justify-center pt-8 pb-4 px-6">
            <FourDogsLogo size="md" />
          </header>
          <div className="flex-1 flex items-center justify-center px-6 pb-12 text-white">
            Loading...
          </div>
        </main>
      }
    >
      <CheckInContent />
    </Suspense>
  );
}
