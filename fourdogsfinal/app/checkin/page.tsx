"use client";

import { useEffect, useState, useCallback } from "react";
import FourDogsLogo from "@/components/FourDogsLogo";
import OfflineIndicator from "@/components/OfflineIndicator";
import { supabase } from "@/lib/supabase";
import { sanitize, isValid } from "@/lib/sanitize";

interface AvailableEvent {
  id: string;
  title: string;
  event_date: string;
  status: string;
  venue_name: string;
}

type PageState = "loading" | "no-event" | "select-event" | "form";
type FormState = "idle" | "submitting" | "success" | "error";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function CheckInPage() {
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

  useEffect(() => {
    async function loadEvents() {
      const { data, error } = await supabase
        .from("available_events")
        .select("id, title, event_date, status, venue_name");

      if (error || !data || data.length === 0) {
        setPageState("no-event");
        return;
      }

      const available = data as AvailableEvent[];
      setEvents(available);

      if (available.length === 1) {
        setSelectedEvent(available[0]);
        setPageState("form");
      } else {
        setPageState("select-event");
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
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setFormState("error");
        setErrorMsg(json.error || "Check-in failed. Try again.");
        return;
      }

      setFormState("success");
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
  }, []);

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
            No events available
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
                  className="w-full p-4 bg-gray-800 text-white rounded"
                >
                  <div>{ev.title}</div>
                  <div className="text-sm opacity-70">
                    {ev.venue_name} • {formatDate(ev.event_date)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {pageState === "form" && selectedEvent && formState !== "success" && (
          <form onSubmit={handleSubmit} className="space-y-4 text-white">

            <button type="button" onClick={handleBackToEvents}>
              ← Back
            </button>

            <div>{selectedEvent.title}</div>

            <input
              placeholder="Your Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full p-3 bg-gray-800 rounded"
            />

            <input
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3 bg-gray-800 rounded"
            />

            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-gray-800 rounded"
            />

            <input
              placeholder="Team Name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full p-3 bg-gray-800 rounded"
            />

            <button type="submit" className="w-full p-4 bg-green-500 rounded">
              {formState === "submitting" ? "Checking in..." : "Check In"}
            </button>

            {formState === "error" && <div>{errorMsg}</div>}
          </form>
        )}

        {formState === "success" && (
          <div className="text-center text-white py-10">
            You're in!
          </div>
        )}

      </div>
    </main>
  );
}
