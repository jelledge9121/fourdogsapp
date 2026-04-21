import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("rewards")
      .select("id, name, description, points_cost, is_active")
      .eq("is_active", true)
      .order("points_cost", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Could not load rewards." },
        { status: 500 }
      );
    }

    return NextResponse.json({ rewards: data ?? [] });
  } catch {
    return NextResponse.json(
      { error: "Could not load rewards." },
      { status: 500 }
    );
  }
}
