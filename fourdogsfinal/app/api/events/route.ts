import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("available_events")
      .select("id, title, event_date, status, venue_name");

    if (error) {
      return NextResponse.json(
        { error: error.message || "Could not load events." },
        { status: 500 }
      );
    }

    const sortedEvents = (data ?? []).sort(
      (a, b) =>
        new Date(a.event_date).getTime() -
        new Date(b.event_date).getTime()
    );

    return NextResponse.json({ events: sortedEvents });
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
