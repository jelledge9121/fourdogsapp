import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const customerId = String(body.customerId || "").trim();
    const rewardId = String(body.rewardId || "").trim();
    const eventId = String(body.eventId || "").trim();

    if (!customerId || !rewardId || !eventId) {
      return NextResponse.json(
        { error: "customerId, rewardId, and eventId are required." },
        { status: 400 }
      );
    }

    const { data: reward, error: rewardError } = await supabaseAdmin
      .from("rewards")
      .select("id, name, points_cost, is_active")
      .eq("id", rewardId)
      .single();

    if (rewardError || !reward || !reward.is_active) {
      return NextResponse.json(
        { error: "Reward not found." },
        { status: 404 }
      );
    }

    const { data: summaryData, error: summaryError } = await supabaseAdmin
      .from("customer_rewards")
      .select("total_points")
      .eq("customer_id", customerId)
      .maybeSingle();

    if (summaryError) {
      return NextResponse.json(
        { error: summaryError.message || "Could not check reward balance." },
        { status: 500 }
      );
    }

    const totalPoints = Number(summaryData?.total_points ?? 0);

    if (totalPoints < reward.points_cost) {
      return NextResponse.json(
        { error: "Not enough points." },
        { status: 400 }
      );
    }

    const { error: insertError } = await supabaseAdmin
      .from("reward_redemptions")
      .insert({
        customer_id: customerId,
        reward_id: rewardId,
        event_id: eventId,
        status: "pending",
      });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message || "Could not submit redemption." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Could not submit redemption." },
      { status: 500 }
    );
  }
}
