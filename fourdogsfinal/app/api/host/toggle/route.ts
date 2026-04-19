import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthUser } from "@/lib/auth";
import { authorizeHost } from "@/lib/host-authz";
import { checkRateLimit } from "@/lib/rate-limit";
import { TogglePayload } from "@/lib/schemas";
import { apiLog } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(`host-toggle:${user.id}`, 30, "host");
  if (!rl.allowed) {
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

  const parsed = TogglePayload.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { customerId, eventId, venueId, flag, description, points } =
    parsed.data;

  // Venue-based host authorization
  const host = await authorizeHost(user, venueId);
  if (!host) {
    apiLog("warn", "/api/host/toggle", "authz_denied", {
      userId: user.id,
      meta: { venueId },
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabaseAdmin.rpc("apply_host_bonus", {
    p_customer_id: customerId,
    p_event_id: eventId,
    p_venue_id: venueId,
    p_action_type: "promo_bonus",
    p_points: points,
    p_description: description,
  });

  if (error) {
    apiLog("error", "/api/host/toggle", "rpc_error", {
      userId: user.id,
      meta: { code: error.code, message: error.message },
    });
    return NextResponse.json(
      { error: "Failed to toggle" },
      { status: 500 }
    );
  }

  apiLog("info", "/api/host/toggle", "toggled", {
    userId: user.id,
    meta: { flag, customerId },
  });
  return NextResponse.json({ ok: true });
}
