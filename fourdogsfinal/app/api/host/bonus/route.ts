import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthUser } from "@/lib/auth";
import { authorizeHost } from "@/lib/host-authz";
import { checkRateLimit } from "@/lib/rate-limit";
import { BonusPayload } from "@/lib/schemas";
import { apiLog } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit — 30 actions per minute per host
  const rl = await checkRateLimit(`host-bonus:${user.id}`, 30, "host");
  if (!rl.allowed) {
    apiLog("warn", "/api/host/bonus", "rate_limited", { userId: user.id });
    return NextResponse.json(
      { error: "Too many actions. Slow down." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = BonusPayload.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { customerId, eventId, venueId, actionType, points, description } =
    parsed.data;

  // Venue-based host authorization
  const host = await authorizeHost(user, venueId);
  if (!host) {
    apiLog("warn", "/api/host/bonus", "authz_denied", {
      userId: user.id,
      meta: { venueId },
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Call atomic RPC
  const { error } = await supabaseAdmin.rpc("apply_host_bonus", {
    p_customer_id: customerId,
    p_event_id: eventId,
    p_venue_id: venueId,
    p_action_type: actionType,
    p_points: points,
    p_description: description,
  });

  if (error) {
    if (error.message?.includes("already applied")) {
      return NextResponse.json(
        { error: "Bonus already applied" },
        { status: 409 }
      );
    }
    apiLog("error", "/api/host/bonus", "rpc_error", {
      userId: user.id,
      meta: { code: error.code, message: error.message },
    });
    return NextResponse.json(
      { error: "Failed to apply bonus" },
      { status: 500 }
    );
  }

  apiLog("info", "/api/host/bonus", "bonus_applied", {
    userId: user.id,
    meta: { customerId, actionType, points },
  });
  return NextResponse.json({ ok: true });
}
