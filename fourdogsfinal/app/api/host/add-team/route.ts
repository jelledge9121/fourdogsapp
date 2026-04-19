import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthUser } from "@/lib/auth";
import { authorizeHost } from "@/lib/host-authz";
import { AddTeamPayload } from "@/lib/schemas";
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

  const parsed = AddTeamPayload.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { teamName, eventId, venueId } = parsed.data;

  // Venue-based host authorization
  const host = await authorizeHost(user, venueId);
  if (!host) {
    apiLog("warn", "/api/host/add-team", "authz_denied", {
      userId: user.id,
      meta: { venueId },
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Create placeholder customer for host-added team
  const code =
    teamName.replace(/\s+/g, "").slice(0, 6).toUpperCase() +
    Math.random().toString(36).slice(2, 6).toUpperCase();

  const placeholderName = `${teamName} (host-added)`;

  const { data: existing } = await supabaseAdmin
    .from("customers")
    .select("id")
    .ilike("full_name", placeholderName.toLowerCase())
    .limit(1)
    .single();

  let customerId: string;

  if (existing) {
    customerId = existing.id;
  } else {
    const { data: created, error: custErr } = await supabaseAdmin
      .from("customers")
      .insert({
        full_name: placeholderName,
        referral_code: code,
        is_active: true,
      })
      .select("id")
      .single();

    if (custErr || !created) {
      apiLog("error", "/api/host/add-team", "customer_create_failed", {
        userId: user.id,
        meta: { error: custErr?.message },
      });
      return NextResponse.json(
        { error: "Failed to create team" },
        { status: 500 }
      );
    }
    customerId = created.id;
  }

  const { error: ciErr } = await supabaseAdmin.from("check_ins").insert({
    customer_id: customerId,
    event_id: eventId,
    venue_id: venueId,
    team_name: teamName,
    is_first_visit: false,
  });

  if (ciErr) {
    if (ciErr.code === "23505") {
      return NextResponse.json(
        { error: "Team already exists" },
        { status: 409 }
      );
    }
    apiLog("error", "/api/host/add-team", "checkin_insert_failed", {
      userId: user.id,
      meta: { error: ciErr.message },
    });
    return NextResponse.json(
      { error: "Failed to add team" },
      { status: 500 }
    );
  }

  apiLog("info", "/api/host/add-team", "team_added", {
    userId: user.id,
    meta: { teamName, eventId },
  });
  return NextResponse.json({ ok: true });
}
