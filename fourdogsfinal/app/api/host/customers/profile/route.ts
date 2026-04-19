import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthUser } from "@/lib/auth";
import { authorizeHost } from "@/lib/host-authz";
import { z } from "zod";

const ProfilePayload = z.object({
  customerId: z.string().uuid(),
  venueId: z.string().uuid(),
});

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

  const parsed = ProfilePayload.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { customerId, venueId } = parsed.data;

  const host = await authorizeHost(user, venueId);
  if (!host) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch customer
  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .single();

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Fetch reward summary for host's venue
  const { data: reward } = await supabaseAdmin
    .from("rewards")
    .select("points_balance, visits")
    .eq("customer_id", customerId)
    .eq("venue_id", host.venue_id)
    .single();

  // Fetch recent reward actions
  const { data: recentActions } = await supabaseAdmin
    .from("reward_actions")
    .select("id, action_type, points, description, status, created_at")
    .eq("customer_id", customerId)
    .eq("venue_id", host.venue_id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Fetch recent check-ins
  const { data: recentCheckins } = await supabaseAdmin
    .from("check_ins")
    .select("id, event_id, team_name, is_first_visit, created_at")
    .eq("customer_id", customerId)
    .eq("venue_id", host.venue_id)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    customer,
    reward: reward || { points_balance: 0, visits: 0 },
    recentActions: recentActions || [],
    recentCheckins: recentCheckins || [],
  });
}
