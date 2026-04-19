-- ============================================================
-- Four Dogs Live — v6 Migration: Multi-Venue Host PK + Atomic Moderation
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. FIX host_profiles PRIMARY KEY: (user_id) → (user_id, venue_id)
-- ============================================================
-- This allows a single user to be a host at multiple venues.

ALTER TABLE host_profiles DROP CONSTRAINT IF EXISTS host_profiles_pkey;
ALTER TABLE host_profiles ADD PRIMARY KEY (user_id, venue_id);

-- Ensure fast lookup by (user_id, venue_id, active) for authz checks
CREATE INDEX IF NOT EXISTS idx_host_profiles_user_venue_active
  ON host_profiles (user_id, venue_id, active);

-- 2. ATOMIC REWARD MODERATION RPC
-- ============================================================
-- Replaces the SELECT-then-UPDATE pattern in /api/host/rewards/moderate.
-- Uses SELECT … FOR UPDATE to prevent concurrent moderation of the same claim.

CREATE OR REPLACE FUNCTION moderate_reward_action(
  p_reward_action_id UUID,
  p_decision        TEXT,
  p_host_user_id    UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action   RECORD;
  v_venue_id UUID;
  v_host_ok  BOOLEAN;
  v_reward   RECORD;
BEGIN
  -- Validate decision value
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_decision');
  END IF;

  -- Lock the row and verify it is still pending
  SELECT id, customer_id, venue_id, points, status
    INTO v_action
    FROM reward_actions
   WHERE id = p_reward_action_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_action.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_processed');
  END IF;

  v_venue_id := v_action.venue_id;

  -- Verify host has access to this venue
  SELECT TRUE INTO v_host_ok
    FROM host_profiles
   WHERE user_id  = p_host_user_id
     AND venue_id = v_venue_id
     AND active   = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  -- Apply the decision
  UPDATE reward_actions
     SET status      = p_decision,
         updated_at  = now(),
         approved_at = CASE WHEN p_decision = 'approved' THEN now() ELSE approved_at END
   WHERE id = p_reward_action_id;

  -- If approved, credit points
  IF p_decision = 'approved' AND v_action.points > 0 THEN
    SELECT id, points_balance
      INTO v_reward
      FROM rewards
     WHERE customer_id = v_action.customer_id
       AND venue_id    = v_venue_id;

    IF FOUND THEN
      UPDATE rewards
         SET points_balance = v_reward.points_balance + v_action.points,
             updated_at     = now()
       WHERE id = v_reward.id;
    ELSE
      INSERT INTO rewards (customer_id, venue_id, visits, points_balance)
      VALUES (v_action.customer_id, v_venue_id, 0, v_action.points);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok',     true,
    'points', v_action.points,
    'customer_id', v_action.customer_id
  );
END;
$$;
