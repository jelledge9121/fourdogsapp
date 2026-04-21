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

// ── Reward Catalog & Redemptions ────────────────────────

export type RedemptionStatus = "pending" | "approved" | "rejected" | "expired";

export type LedgerType =
  | "check_in"
  | "first_visit_bonus"
  | "milestone_bonus"
  | "redemption_debit"
  | "redemption_refund"
  | "manual_adjustment";

export interface RewardCatalogItem {
  id: string;
  name: string;
  description: string;
  points_cost: number;
  category: string;
  requires_age_verification: boolean;
  requires_color_choice: boolean;
  color_options: string[] | null;
  active: boolean;
  sort_order: number;
}

export interface RewardRedemption {
  id: string;
  customer_id: string;
  venue_id: string;
  event_id: string | null;
  reward_catalog_id: string;
  points_cost: number;
  status: RedemptionStatus;
  color_choice: string | null;
  notes: string | null;
  moderated_by: string | null;
  created_at: string;
  moderated_at: string | null;
  updated_at: string;
}

export interface RewardRedemptionWithDetails extends RewardRedemption {
  customer_name: string;
  reward_name: string;
  requires_age_verification: boolean;
}

export interface LedgerEntry {
  id: string;
  customer_id: string;
  venue_id: string;
  event_id: string | null;
  entry_type: LedgerType;
  points: number;
  balance_after: number;
  reference_id: string | null;
  description: string | null;
  created_at: string;
}

// ── API Payloads ────────────────────────────────────────

export interface RedeemPayload {
  customerId: string;
  rewardCatalogId: string;
  venueId: string;
  eventId?: string;
  colorChoice?: string;
}

export interface RedeemResponse {
  ok: boolean;
  error?: string;
  redemption_id?: string;
  reward_name?: string;
  points_cost?: number;
  balance?: number;
  cost?: number;
}

export interface ApproveRedemptionPayload {
  redemptionId: string;
}

export interface RejectRedemptionPayload {
  redemptionId: string;
  reason?: string;
}
