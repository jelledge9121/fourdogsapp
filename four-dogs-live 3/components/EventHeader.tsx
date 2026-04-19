import type { EventWithVenue } from "@/lib/types";
import { formatEventDate } from "@/lib/utils";

export default function EventHeader({ event }: { event: EventWithVenue }) {
  const isTrivia = event.event_type === "trivia";
  const typeColor = isTrivia ? "text-brand-cyan" : "text-brand-amber";
  const typeBg = isTrivia
    ? "bg-brand-cyan/10 border-brand-cyan/30"
    : "bg-brand-amber/10 border-brand-amber/30";
  const typeLabel = isTrivia ? "TRIVIA" : "MUSIC BINGO";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-semibold font-body ${typeBg} ${typeColor}`}
        >
          <span className="w-2 h-2 rounded-full bg-brand-neon live-dot" />
          LIVE
        </span>
        <span className={`font-display text-2xl tracking-wide ${typeColor}`}>
          {typeLabel}
        </span>
      </div>
      <h2 className="font-display text-xl tracking-wide text-brand-white">
        {event.title}
      </h2>
      <div className="flex items-center gap-3 text-brand-muted font-body text-sm">
        <span>📍 {event.venue?.name || "Unknown Venue"}</span>
        <span>•</span>
        <span>{formatEventDate(event.event_date)}</span>
        {event.start_time && (
          <>
            <span>•</span>
            <span>{event.start_time}</span>
          </>
        )}
      </div>
    </div>
  );
}
