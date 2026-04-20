import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type AvailableEvent = {
  id: string;
  title: string;
  event_date: string;
  status: string;
  venue_name: string | null;
};

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("available_events") // ✅ FIXED (no "public.")
      .select("id, title, event_date, status, venue_name");

    if (error) {
      return NextResponse.json(
        { error: error.message || "Could not load events." },
        { status: 500 }
      );
    }

    const sortedEvents = ((data ?? []) as AvailableEvent[]).sort(
      (a, b) =>
        new Date(a.event_date).getTime() -
        new Date(b.event_date).getTime()
    );

    return NextResponse.json({ events: sortedEvents }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Unexpected server error loading events.",
      },
      { status: 500 }
    );
  }
}
