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
  fullName: sanitizedString(100),
  phone: z.string().max(20).optional().default(""),
  email: z.string().max(100).optional().default(""),
  teamName: z.string().max(30).optional().default(""),
  firstTime: z.boolean().optional().default(false),
  eventId: uuidField,
  referredByCustomerId: uuidField.optional().nullable(),
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
  flag: z.enum([
    "free_square_on",
    "free_square_off",
    "extra_card_on",
    "extra_card_off",
  ]),
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

// ── /api/rewards/catalog ────────────────────────────────
// (GET, no payload needed)

// ── /api/rewards/redeem ─────────────────────────────────
export const RedeemPayload = z.object({
  customerId: uuidField,
  rewardCatalogId: uuidField,
  venueId: uuidField.optional(),
  eventId: uuidField.optional(),
  colorChoice: z.string().max(20).optional(),
});
export type RedeemPayload = z.infer<typeof RedeemPayload>;

// ── /api/host/redemptions/approve ───────────────────────
export const ApproveRedemptionPayload = z.object({
  redemptionId: uuidField,
});
export type ApproveRedemptionPayload = z.infer<typeof ApproveRedemptionPayload>;

// ── /api/host/redemptions/reject ────────────────────────
export const RejectRedemptionPayload = z.object({
  redemptionId: uuidField,
  reason: z.string().max(200).optional(),
});
export type RejectRedemptionPayload = z.infer<typeof RejectRedemptionPayload>;
