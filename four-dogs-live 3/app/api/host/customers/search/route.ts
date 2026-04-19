import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthUser } from "@/lib/auth";
import { authorizeHost } from "@/lib/host-authz";
import { CustomerSearchPayload } from "@/lib/schemas";

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

  const parsed = CustomerSearchPayload.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { q, venueId } = parsed.data;

  const host = await authorizeHost(user, venueId);
  if (!host) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pattern = `%${q}%`;

  // Search by full_name, phone, or facebook_name
  const { data, error } = await supabaseAdmin
    .from("customers")
    .select("id, full_name, phone, facebook_name, referral_code, is_active, created_at")
    .or(`full_name.ilike.${pattern},phone.ilike.${pattern},facebook_name.ilike.${pattern}`)
    .eq("is_active", true)
    .order("full_name")
    .limit(20);

  if (error) {
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ results: data || [] });
}
