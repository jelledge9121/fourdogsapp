import { supabase } from "./supabase";
import type {
  Event,
  Venue,
  Customer,
  CheckIn,
  RewardAction,
  EventWithVenue,
  CheckInWithCustomer,
  TeamGroup,
} from "./types";

// ── Active event (status = 'live') — READ ONLY ─────────

export async function getActiveEvent(venueId: string): Promise<EventWithVenue | null> {
  // Try join first
  const { data, error } = await supabase
    .from("events")
    .select("*, venues!events_venue_id_fkey(*)")
    .eq("status", "live")
    .eq("venue_id", venueId)
    .limit(1);

  const row = !error && data?.[0] ? (data[0] as Record<string, unknown>) : null;

  if (row) {
    const venue = row.venues as Venue;
    const { venues: _, ...eventFields } = row;
    return { ...(eventFields as unknown as Event), venue };
  }

  // Fallback: separate queries
  const { data: d2arr } = await supabase
    .from("events")
    .select("*")
    .eq("status", "live")
    .eq("venue_id", venueId)
    .limit(1);

  const d2 = d2arr?.[0] ?? null;
  if (!d2) return null;

  const { data: venue } = await supabase
    .from("venues")
    .select("*")
    .eq("id", d2.venue_id)
    .single();

  return {
    ...(d2 as Event),
    venue: (venue as Venue) || {
      id: d2.venue_id, name: "Unknown Venue", slug: "",
      active: true, created_at: "", updated_at: "",
    },
  };
}

// ── Fetch check-ins with customer data — READ ONLY ──────

export async function fetchCheckIns(eventId: string): Promise<CheckInWithCustomer[]> {
  const { data, error } = await supabase
    .from("check_ins")
    .select("*, customers(*)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as Record<string, unknown>[]).map((row) => {
    const { customers: cust, ...ci } = row;
    return {
      ...(ci as unknown as CheckIn),
      customer: cust as Customer,
    };
  });
}

// ── Fetch reward actions — READ ONLY ────────────────────

export async function fetchRewardActions(eventId: string): Promise<RewardAction[]> {
  const { data, error } = await supabase
    .from("reward_actions")
    .select("*")
    .eq("event_id", eventId);

  if (error || !data) return [];
  return data as RewardAction[];
}

// ── Group check-ins into teams (pure function) ──────────

export function groupIntoTeams(
  checkIns: CheckInWithCustomer[],
  rewardActions: RewardAction[]
): TeamGroup[] {
  const teamMap = new Map<string, CheckInWithCustomer[]>();

  for (const ci of checkIns) {
    const key = (ci.team_name || "No Team").toLowerCase().trim();
    if (!teamMap.has(key)) teamMap.set(key, []);
    teamMap.get(key)!.push(ci);
  }

  const teams: TeamGroup[] = [];

  for (const [, players] of Array.from(teamMap)) {
    const teamName = players[0].team_name || "No Team";
    const playerIds = new Set(players.map((p) => p.customer_id));
    const teamActions = rewardActions.filter((ra) => playerIds.has(ra.customer_id));

    const bonusPoints = teamActions
      .filter((ra) =>
        ["facebook_tag", "referral", "share_post", "promo_bonus", "first_visit", "return_visit"].includes(ra.action_type)
      )
      .reduce((sum, ra) => sum + ra.points, 0);

    const hasFreeSq = teamActions.some(
      (ra) => ra.action_type === "promo_bonus" && ra.description?.includes("free_square")
    );
    const hasExtraCard = teamActions.some(
      (ra) => ra.action_type === "promo_bonus" && ra.description?.includes("extra_card")
    );

    const latestActivity = players.reduce(
      (latest, p) => (p.created_at > latest ? p.created_at : latest),
      players[0].created_at
    );

    teams.push({
      teamName, players,
      hasFirstTimer: players.some((p) => p.is_first_visit),
      latestActivity, bonusPoints, hasFreeSq, hasExtraCard,
    });
  }

  teams.sort((a, b) => {
    const timeDiff = new Date(b.latestActivity).getTime() - new Date(a.latestActivity).getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.teamName.localeCompare(b.teamName);
  });

  return teams;
}

// ── Format date ─────────────────────────────────────────

export function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
