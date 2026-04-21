import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const customerId = String(body.customerId || "").trim();
    const rewardId = String(body.rewardId || "").trim();
    const eventId = String(body.eventId || "").trim();

    if (!customerId || !rewardId) {
      return NextResponse.json(
        { error: "customerId and rewardId are required." },
        { status: 400 }
      );
    }

    const { data: rewardItem, error: rewardError } = await supabaseAdmin
      .from("reward_catalog")
      .select("id, name, description, points_cost, is_active")
      .eq("id", rewardId)
      .single();

    if (rewardError || !rewardItem || !rewardItem.is_active) {
      return NextResponse.json(
        { error: "Reward not found." },
        { status: 404 }
      );
    }

    const { data: rewardBalance, error: balanceError } = await supabaseAdmin
      .from("rewards")
      .select("points_balance")
      .eq("customer_id", customerId)
      .maybeSingle();

    if (balanceError) {
      return NextResponse.json(
        { error: balanceError.message || "Could not check point balance." },
        { status: 500 }
      );
    }

    const pointsBalance = Number(rewardBalance?.points_balance ?? 0);

    if (pointsBalance < rewardItem.points_cost) {
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
        event_id: eventId || null,
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
