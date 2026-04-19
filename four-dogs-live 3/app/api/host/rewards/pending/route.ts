import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthUser } from "@/lib/auth";
import { authorizeHost } from "@/lib/host-authz";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const venueId = req.nextUrl.searchParams.get("venueId");
  if (!venueId) {
    return NextResponse.json({ error: "venueId required" }, { status: 400 });
  }

  const host = await authorizeHost(user, venueId);
  if (!host) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("reward_actions")
    .select("id, customer_id, action_type, points, description, status, proof_type, proof_value, created_at, customers(full_name)")
    .eq("venue_id", host.venue_id)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch pending claims" },
      { status: 500 }
    );
  }

  // Flatten customer name
  const results = (data || []).map((row: Record<string, unknown>) => {
    const { customers, ...rest } = row;
    return {
      ...rest,
      customer_name: (customers as { full_name: string } | null)?.full_name || "Unknown",
    };
  });

  return NextResponse.json({ pending: results });
}
