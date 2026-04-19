import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthUser } from "@/lib/auth";
import { authorizeHost } from "@/lib/host-authz";
import { EventStatusPayload } from "@/lib/schemas";
import { apiLog } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = EventStatusPayload.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { eventId, venueId, status } = parsed.data;

  // Venue-specific host authorization
  const host = await authorizeHost(user, venueId);
  if (!host) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify event belongs to the authorized venue
  const { data: event } = await supabaseAdmin
    .from("events")
    .select("id, venue_id")
    .eq("id", eventId)
    .eq("venue_id", host.venue_id)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("events")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", eventId)
    .eq("venue_id", host.venue_id);

  if (error) {
    apiLog("error", "/api/host/event-status", "update_failed", {
      userId: user.id,
      meta: { eventId, status, error: error.message },
    });
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }

  apiLog("info", "/api/host/event-status", "status_changed", {
    userId: user.id,
    meta: { eventId, status },
  });
  return NextResponse.json({ ok: true });
}
