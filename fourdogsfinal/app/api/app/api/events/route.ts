import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("available_events")
    .select("id, title, event_date, status, venue_name")
    .order("event_date", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not load events." },
      { status: 500 }
    );
  }

  return NextResponse.json({ events: data ?? [] });
}
