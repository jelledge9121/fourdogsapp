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

  const { fullName, phone, email, teamName, firstTime, eventId } = parsed.data;

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

  // 2. Find or create customer
  const { data: customerData, error: customerError } = await supabaseAdmin.rpc(
    "find_or_create_customer",
    {
      p_full_name: fullName,
      p_phone: phone || null,
      p_email: email || null,
    }
  );

  if (customerError) {
    apiLog("error", "/api/checkin", "find_or_create_customer_error", {
      ip,
      meta: { code: customerError.code, message: customerError.message },
    });
    return NextResponse.json(
      { error: "Could not process customer. Try again." },
      { status: 500 }
    );
  }

  const customerId = customerData?.customer_id;

  if (!customerId) {
    apiLog("error", "/api/checkin", "no_customer_id_returned", {
      ip,
      meta: { customerData },
    });
    return NextResponse.json(
      { error: "Could not process customer. Try again." },
      { status: 500 }
    );
  }

  // 3. Create check-in (venue_id is derived internally by the function)
  const { data: checkinData, error: checkinError } = await supabaseAdmin.rpc(
    "create_checkin",
    {
      p_customer_id: customerId,
      p_event_id: event.id,
      p_team_name: teamName || null,
      p_referred_by_customer_id: null,
      p_is_first_visit: firstTime,
    }
  );

  if (checkinError) {
    if (
      checkinError.message?.includes("already checked in") ||
      checkinError.code === "23505"
    ) {
      return NextResponse.json(
        { error: "You're already checked in!" },
        { status: 409 }
      );
    }
    apiLog("error", "/api/checkin", "create_checkin_error", {
      ip,
      meta: { code: checkinError.code, message: checkinError.message },
    });
    return NextResponse.json(
      { error: "Check-in failed. Try again." },
      { status: 500 }
    );
  }

  const checkInId = checkinData?.check_in_id;

  apiLog("info", "/api/checkin", "checkin_ok", {
    ip,
    meta: { customerId, checkInId, team: teamName },
  });
  return NextResponse.json({ ok: true, customerId, checkInId });
}
