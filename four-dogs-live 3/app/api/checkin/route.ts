import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { CheckinPayload } from "@/lib/schemas";
import { apiLog } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Rate limit by IP — 10 check-ins per minute per IP
  const rl = await checkRateLimit(`checkin:${ip}`, 10, "checkin");
  if (!rl.allowed) {
    apiLog("warn", "/api/checkin", "rate_limited", { ip });
    return NextResponse.json(
      { error: "Too many check-ins. Wait a moment and try again." },
      { status: 429 }
    );
  }

  // Parse + validate
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = CheckinPayload.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { teamName, playerName, firstTime, eventId } = parsed.data;

  // 1. Get event by ID — only if it's currently live. Derive venue_id server-side.
  const { data: events } = await supabaseAdmin
    .from("events")
    .select("id, venue_id")
    .eq("id", eventId)
    .eq("status", "live")
    .limit(1);

  const event = events?.[0] ?? null;

  if (!event) {
    return NextResponse.json({ error: "No active event." }, { status: 404 });
  }

  // 2. Call atomic RPC
  const { data, error } = await supabaseAdmin.rpc("perform_checkin", {
    p_player_name: playerName,
    p_team_name: teamName,
    p_event_id: event.id,
    p_venue_id: event.venue_id,
    p_is_first_visit: firstTime,
  });

  if (error) {
    if (
      error.message?.includes("already checked in") ||
      error.code === "23505"
    ) {
      return NextResponse.json(
        { error: "You're already checked in!" },
        { status: 409 }
      );
    }
    apiLog("error", "/api/checkin", "rpc_error", {
      ip,
      meta: { code: error.code, message: error.message },
    });
    return NextResponse.json(
      { error: "Check-in failed. Try again." },
      { status: 500 }
    );
  }

  apiLog("info", "/api/checkin", "checkin_ok", {
    ip,
    meta: { customerId: data, team: teamName },
  });
  return NextResponse.json({ ok: true, customerId: data });
}
