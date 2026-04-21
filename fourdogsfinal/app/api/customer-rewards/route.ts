import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const customerId = req.nextUrl.searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json(
        { error: "customerId is required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("rewards")
      .select("customer_id, points_balance, visits")
      .eq("customer_id", customerId)
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Could not load rewards." },
        { status: 500 }
      );
    }

    const points = data?.points_balance ?? 0;
    const visits = data?.visits ?? 0;

    const availableRewards =
      Math.floor(points / 10);

    return NextResponse.json(
      {
        summary: {
          customer_id: customerId,
          total_points: points,
          total_visits: visits,
          available_rewards: availableRewards,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          "CDN-Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Unexpected server error loading rewards.",
      },
      { status: 500 }
    );
  }
}
