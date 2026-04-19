import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthUser } from "@/lib/auth";
import { ModerateRewardPayload } from "@/lib/schemas";
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

  const parsed = ModerateRewardPayload.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { rewardActionId, decision } = parsed.data;

  // Atomic moderation: verifies pending status + host venue access in one transaction
  const { data, error } = await supabaseAdmin.rpc("moderate_reward_action", {
    p_reward_action_id: rewardActionId,
    p_decision: decision,
    p_host_user_id: user.id,
  });

  if (error) {
    apiLog("error", "/api/host/rewards/moderate", "rpc_error", {
      userId: user.id,
      meta: { rewardActionId, error: error.message },
    });
    return NextResponse.json(
      { error: "Failed to moderate claim" },
      { status: 500 }
    );
  }

  const result = data as { ok: boolean; error?: string; points?: number };

  if (!result.ok) {
    const statusMap: Record<string, number> = {
      not_found: 404,
      already_processed: 409,
      forbidden: 403,
      invalid_decision: 400,
    };
    const httpStatus = statusMap[result.error || ""] || 500;
    return NextResponse.json(
      { error: result.error || "Unknown error" },
      { status: httpStatus }
    );
  }

  apiLog("info", "/api/host/rewards/moderate", decision, {
    userId: user.id,
    meta: { rewardActionId, points: result.points },
  });
  return NextResponse.json({ ok: true });
}
