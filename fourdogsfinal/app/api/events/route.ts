import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

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
      .from("available_events")
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

    return NextResponse.json(
      { events: sortedEvents },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          "CDN-Cache-Control": "no-store",
        },
      }
    );
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
