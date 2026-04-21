import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("reward_catalog")
      .select("id, name, description, points_cost, category, requires_age_verification, requires_color_choice, color_options, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Could not load rewards." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { rewards: data || [] },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Unexpected error loading rewards.",
      },
      { status: 500 }
    );
  }
}
