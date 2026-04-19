import { supabaseAdmin } from "./supabase-admin";
import type { User } from "@supabase/supabase-js";

export interface HostProfile {
  user_id: string;
  venue_id: string;
  role: string;
  active: boolean;
}

/**
 * Verify that an authenticated user is an active host for the given venue.
 * Returns the host profile row or null.
 */
export async function authorizeHost(
  user: User,
  venueId: string
): Promise<HostProfile | null> {
  const { data, error } = await supabaseAdmin
    .from("host_profiles")
    .select("user_id, venue_id, role, active")
    .eq("user_id", user.id)
    .eq("venue_id", venueId)
    .eq("active", true)
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as HostProfile;
}

/**
 * Return all active venue IDs a user is authorized for.
 * Used only when a route genuinely cannot scope to one venue
 * (e.g. customer search across the host's venues).
 */
export async function getHostVenueIds(user: User): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("host_profiles")
    .select("venue_id")
    .eq("user_id", user.id)
    .eq("active", true);

  if (error || !data) return [];
  return data.map((row) => row.venue_id);
}
