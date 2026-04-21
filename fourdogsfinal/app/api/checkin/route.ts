import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { CheckinPayload } from "@/lib/schemas";
import { apiLog } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  const rl = await checkRateLimit(`checkin:${ip}`, 10, "checkin");
  if (!rl.allowed) {
    apiLog("warn", "/api/checkin", "rate_limited", { ip });
    return NextResponse.json(
      { error: "Too many check-ins. Wait a moment and try again." },
      { status: 429 }
    );
  }

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

  const {
    fullName,
    phone,
    email,
    teamName,
    firstTime,
    eventId,
    referredByCustomerId,
  } = parsed.data as {
    fullName: string;
    phone?: string;
    email?: string;
    teamName?: string;
    firstTime: boolean;
    eventId: string;
    referredByCustomerId?: string | null;
  };

  const { data: events, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id, venue_id")
    .eq("id", eventId)
    .eq("status", "live")
    .limit(1);

  if (eventError) {
    apiLog("error", "/api/checkin", "event_lookup_error", {
      ip,
      meta: { code: eventError.code, message: eventError.message, eventId },
    });
    return NextResponse.json(
      { error: "Could not validate event. Try again." },
      { status: 500 }
    );
  }

  const event = events?.[0] ?? null;

  if (!event) {
    return NextResponse.json({ error: "No active event." }, { status: 404 });
  }

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
      { error: customerError.message || "Could not process customer. Try again." },
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

  const { data: checkinData, error: checkinError } = await supabaseAdmin.rpc(
    "perform_checkin_v2",
    {
      p_customer_id: customerId,
      p_event_id: event.id,
      p_venue_id: event.venue_id,
      p_team_name: teamName || null,
      p_is_first_visit: firstTime,
    }
  );

 if (
  checkinError.message?.includes("already checked in") ||
  checkinError.message?.includes("already_checked_in")
) {
  return NextResponse.json(
    { error: "You're already checked in!" },
    { status: 409 }
  );
}

return NextResponse.json(
  { error: checkinError.message || "Check-in failed. Try again." },
  { status: 500 }
);

    apiLog("error", "/api/checkin", "create_checkin_error", {
      ip,
      meta: { code: checkinError.code, message: checkinError.message },
    });

    return NextResponse.json(
      { error: checkinError.message || "Check-in failed. Try again." },
      { status: 500 }
    );
  }

  // Handle RPC-level error (returned as JSON, not thrown)
  const checkinResult = checkinData as {
    ok: boolean;
    error?: string;
    check_in_id?: string;
    points_earned?: number;
    total_visits?: number;
    balance?: number;
  };

  if (checkinResult && !checkinResult.ok) {
    if (checkinResult.error === "already_checked_in") {
      return NextResponse.json(
        { error: "You're already checked in!" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Check-in failed. Try again." },
      { status: 500 }
    );
  }

  const checkInId = checkinResult?.check_in_id;

  apiLog("info", "/api/checkin", "checkin_ok", {
    ip,
    meta: {
      customerId,
      checkInId,
      team: teamName,
      referredByCustomerId: referredByCustomerId || null,
    },
  });

  return NextResponse.json({
    ok: true,
    customerId,
    checkInId,
  });
}
