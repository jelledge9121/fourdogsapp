import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  try {
    const customerId = req.nextUrl.searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json(
        { error: "Missing customerId." },
        { status: 400 }
      );
    }

    if (!UUID_REGEX.test(customerId)) {
      return NextResponse.json(
        { error: "Invalid customerId format." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("customer_reward_summary")
      .select("*")
      .eq("customer_id", customerId)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Could not load rewards." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Reward summary not found for this customer." },
        { status: 404 }
      );
    }

    return NextResponse.json({ summary: data }, { status: 200 });
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
