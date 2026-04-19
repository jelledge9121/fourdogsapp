// Matches actual Supabase schema

export type EventType = "trivia" | "music_bingo";
export type EventStatus = "upcoming" | "live" | "closed";
export type RewardActionType =
  | "check_in"
  | "first_visit"
  | "return_visit"
  | "referral"
  | "facebook_tag"
  | "share_post"
  | "promo_bonus"
  | "manual_adjustment"
  | "redemption";
export type RewardStatus = "pending" | "approved" | "rejected";
export type ProofType = "system" | "manual" | "referral_code" | "social_claim" | "admin";

export interface Event {
  id: string;
  venue_id: string;
  title: string;
  event_type: EventType;
  event_date: string;
  status: EventStatus;
  start_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface Venue {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  facebook_name: string | null;
  referral_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CheckIn {
  id: string;
  customer_id: string;
  event_id: string;
  venue_id: string;
  team_name: string | null;
  is_first_visit: boolean;
  referred_by_customer_id: string | null;
  created_at: string;
}

export interface RewardAction {
  id: string;
  customer_id: string;
  venue_id: string;
  event_id: string | null;
  action_type: RewardActionType;
  points: number;
  description: string | null;
  status: RewardStatus;
  proof_type: ProofType;
  proof_value: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reward {
  id: string;
  customer_id: string;
  venue_id: string;
  points_balance: number;
  visits: number;
  created_at: string;
  updated_at: string;
}

// Derived types for the host dashboard

export interface TeamGroup {
  teamName: string;
  players: CheckInWithCustomer[];
  hasFirstTimer: boolean;
  latestActivity: string;
  // Trivia bonuses (derived from reward_actions)
  bonusPoints: number;
  // Music bingo flags (derived from reward_actions)
  hasFreeSq: boolean;
  hasExtraCard: boolean;
}

export interface CheckInWithCustomer extends CheckIn {
  customer: Customer;
}

export interface EventWithVenue extends Event {
  venue: Venue;
}
