import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const customerId = req.nextUrl.searchParams.get("customerId");

  if (!customerId) {
    return NextResponse.json({ error: "Missing customerId" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("customer_reward_summary")
    .select("*")
    .eq("customer_id", customerId)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not load rewards." },
      { status: 500 }
    );
  }

  return NextResponse.json({ summary: data });
}
