import { z } from "zod";

// ── Shared refinements ──────────────────────────────────
const uuidField = z.string().uuid();
const sanitizedString = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .transform((s) =>
      s
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .pipe(z.string().min(1));

// ── /api/checkin ────────────────────────────────────────
export const CheckinPayload = z.object({
  teamName: sanitizedString(30),
  playerName: sanitizedString(100),
  firstTime: z.boolean().optional().default(false),
  eventId: uuidField,
});
export type CheckinPayload = z.infer<typeof CheckinPayload>;

// ── /api/host/add-team ──────────────────────────────────
export const AddTeamPayload = z.object({
  teamName: sanitizedString(30),
  eventId: uuidField,
  venueId: uuidField,
});
export type AddTeamPayload = z.infer<typeof AddTeamPayload>;

// ── /api/host/bonus ─────────────────────────────────────
const allowedBonusActions = [
  "facebook_tag",
  "referral",
  "first_visit",
  "return_visit",
  "share_post",
  "promo_bonus",
  "manual_adjustment",
] as const;

export const BonusPayload = z.object({
  customerId: uuidField,
  eventId: uuidField,
  venueId: uuidField,
  actionType: z.enum(allowedBonusActions),
  points: z.number().int().min(-100).max(100),
  description: sanitizedString(200),
});
export type BonusPayload = z.infer<typeof BonusPayload>;

// ── /api/host/toggle ────────────────────────────────────
export const TogglePayload = z.object({
  customerId: uuidField,
  eventId: uuidField,
  venueId: uuidField,
  flag: z.enum(["free_square_on", "free_square_off", "extra_card_on", "extra_card_off"]),
  description: sanitizedString(200),
  points: z.number().int().min(0).max(10).optional().default(0),
});
export type TogglePayload = z.infer<typeof TogglePayload>;

// ── /api/host/event-status ──────────────────────────────
export const EventStatusPayload = z.object({
  eventId: uuidField,
  venueId: uuidField,
  status: z.enum(["live", "closed"]),
});
export type EventStatusPayload = z.infer<typeof EventStatusPayload>;

// ── /api/host/rewards/moderate ──────────────────────────
export const ModerateRewardPayload = z.object({
  rewardActionId: uuidField,
  decision: z.enum(["approved", "rejected"]),
});
export type ModerateRewardPayload = z.infer<typeof ModerateRewardPayload>;

// ── /api/host/customers/search ──────────────────────────
export const CustomerSearchPayload = z.object({
  q: sanitizedString(100),
  venueId: uuidField,
});
export type CustomerSearchPayload = z.infer<typeof CustomerSearchPayload>;
