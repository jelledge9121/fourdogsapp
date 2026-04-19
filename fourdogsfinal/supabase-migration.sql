-- ============================================================
-- Four Dogs Live App — Full Security Migration
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. SCHEMA: Add columns to check_ins
-- ============================================================

ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS team_name TEXT;
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS is_first_visit BOOLEAN NOT NULL DEFAULT false;

-- 2. CONSTRAINTS
-- ============================================================

-- Prevent duplicate check-ins (same customer, same event)
DO $$ BEGIN
  ALTER TABLE check_ins ADD CONSTRAINT check_ins_customer_event_unique
    UNIQUE (customer_id, event_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Prevent duplicate reward actions (same customer, event, action_type, description)
-- This enforces one-use bonuses
DO $$ BEGIN
  ALTER TABLE reward_actions ADD CONSTRAINT reward_actions_unique_bonus
    UNIQUE (customer_id, event_id, action_type, description);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

-- Events: read-only for anon, live events only
DO $$ BEGIN
  CREATE POLICY "anon_read_live_events" ON events FOR SELECT USING (status = 'live');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Venues: read-only for anon, active venues only
DO $$ BEGIN
  CREATE POLICY "anon_read_active_venues" ON venues FOR SELECT USING (active = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Customers: read-only for anon (writes go through service role via API routes)
DO $$ BEGIN
  CREATE POLICY "anon_read_customers" ON customers FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Check-ins: read for live events only (writes via service role)
DO $$ BEGIN
  CREATE POLICY "anon_read_checkins" ON check_ins FOR SELECT
    USING (event_id IN (SELECT id FROM events WHERE status = 'live'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Reward actions: read for live events only (writes via service role)
DO $$ BEGIN
  CREATE POLICY "anon_read_reward_actions" ON reward_actions FOR SELECT
    USING (event_id IN (SELECT id FROM events WHERE status = 'live'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Rewards: read-only for anon
DO $$ BEGIN
  CREATE POLICY "anon_read_rewards" ON rewards FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- NOTE: No INSERT/UPDATE policies for anon on reward_actions, rewards, or customers.
-- All writes go through API routes using the service role key.
-- The anon key can only READ.

-- 4. ATOMIC RPC: Check-in (single transaction)
-- ============================================================

CREATE OR REPLACE FUNCTION perform_checkin(
  p_player_name TEXT,
  p_team_name TEXT,
  p_event_id UUID,
  p_venue_id UUID,
  p_is_first_visit BOOLEAN
)
RETURNS UUID  -- returns customer_id
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id UUID;
  v_referral_code TEXT;
  v_reward_id UUID;
  v_current_visits BIGINT;
  v_current_points BIGINT;
BEGIN
  -- 1. Find or create customer
  SELECT id INTO v_customer_id
  FROM customers
  WHERE lower(full_name) = lower(p_player_name) AND is_active = true
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    v_referral_code := upper(left(replace(p_player_name, ' ', ''), 6))
                       || upper(substr(md5(random()::text), 1, 4));
    INSERT INTO customers (full_name, referral_code, is_active)
    VALUES (p_player_name, v_referral_code, true)
    RETURNING id INTO v_customer_id;
  END IF;

  -- 2. Insert check-in (unique constraint prevents duplicates)
  BEGIN
    INSERT INTO check_ins (customer_id, event_id, venue_id, team_name, is_first_visit)
    VALUES (v_customer_id, p_event_id, p_venue_id, p_team_name, p_is_first_visit);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Player already checked in';
  END;

  -- 3. Log check_in reward action
  INSERT INTO reward_actions (customer_id, venue_id, event_id, action_type, points, description, status, proof_type)
  VALUES (v_customer_id, p_venue_id, p_event_id, 'check_in', 1, 'Check-in: ' || coalesce(p_team_name, 'no team'), 'approved', 'system');

  -- 4. If first visit, log that too
  IF p_is_first_visit THEN
    INSERT INTO reward_actions (customer_id, venue_id, event_id, action_type, points, description, status, proof_type)
    VALUES (v_customer_id, p_venue_id, p_event_id, 'first_visit', 2, 'First visit bonus', 'approved', 'system');
  END IF;

  -- 5. Upsert rewards
  SELECT id, visits, points_balance INTO v_reward_id, v_current_visits, v_current_points
  FROM rewards
  WHERE customer_id = v_customer_id AND venue_id = p_venue_id
  LIMIT 1;

  IF v_reward_id IS NOT NULL THEN
    UPDATE rewards SET
      visits = v_current_visits + 1,
      points_balance = v_current_points + 1 + (CASE WHEN p_is_first_visit THEN 2 ELSE 0 END),
      updated_at = now()
    WHERE id = v_reward_id;
  ELSE
    INSERT INTO rewards (customer_id, venue_id, visits, points_balance)
    VALUES (v_customer_id, p_venue_id, 1, 1 + (CASE WHEN p_is_first_visit THEN 2 ELSE 0 END));
  END IF;

  RETURN v_customer_id;
END;
$$;

-- 5. ATOMIC RPC: Apply host bonus (single transaction)
-- ============================================================

CREATE OR REPLACE FUNCTION apply_host_bonus(
  p_customer_id UUID,
  p_event_id UUID,
  p_venue_id UUID,
  p_action_type TEXT,
  p_points INT,
  p_description TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reward_id UUID;
  v_current_points BIGINT;
BEGIN
  -- Check for duplicate (one-use enforcement)
  IF EXISTS (
    SELECT 1 FROM reward_actions
    WHERE customer_id = p_customer_id
      AND event_id = p_event_id
      AND action_type = p_action_type::reward_action_type_enum
      AND description = p_description
  ) THEN
    RAISE EXCEPTION 'Bonus already applied';
  END IF;

  -- Insert reward action
  INSERT INTO reward_actions (customer_id, venue_id, event_id, action_type, points, description, status, proof_type)
  VALUES (p_customer_id, p_venue_id, p_event_id, p_action_type::reward_action_type_enum, p_points, p_description, 'approved', 'manual');

  -- Update rewards balance
  IF p_points > 0 THEN
    SELECT id, points_balance INTO v_reward_id, v_current_points
    FROM rewards
    WHERE customer_id = p_customer_id AND venue_id = p_venue_id
    LIMIT 1;

    IF v_reward_id IS NOT NULL THEN
      UPDATE rewards SET
        points_balance = v_current_points + p_points,
        updated_at = now()
      WHERE id = v_reward_id;
    ELSE
      INSERT INTO rewards (customer_id, venue_id, visits, points_balance)
      VALUES (p_customer_id, p_venue_id, 0, p_points);
    END IF;
  END IF;
END;
$$;

-- Grant execute to service role only (not anon)
-- The RPCs use SECURITY DEFINER so they run as the owner,
-- but we only call them from API routes using the service role key.
REVOKE EXECUTE ON FUNCTION perform_checkin FROM anon;
REVOKE EXECUTE ON FUNCTION apply_host_bonus FROM anon;
GRANT EXECUTE ON FUNCTION perform_checkin TO service_role;
GRANT EXECUTE ON FUNCTION apply_host_bonus TO service_role;

-- 6. REALTIME
-- ============================================================

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE check_ins;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE reward_actions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. CREATE HOST USER
-- ============================================================
-- Run this ONCE to create your host login.
-- Change the email and password below:
--
-- INSERT INTO auth.users (
--   instance_id, id, aud, role, email, encrypted_password,
--   email_confirmed_at, created_at, updated_at, confirmation_token
-- )
-- VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   gen_random_uuid(),
--   'authenticated',
--   'authenticated',
--   'joey@fourdogsentertainment.com',
--   crypt('YOUR_SECURE_PASSWORD_HERE', gen_salt('bf')),
--   now(), now(), now(), ''
-- );
--
-- Or use the Supabase Dashboard → Authentication → Users → Add User
