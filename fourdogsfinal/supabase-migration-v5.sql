-- ============================================================
-- Four Dogs Live — v5 Migration: Host Profiles & Authorization
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. HOST PROFILES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS host_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'host',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for venue lookups (authz checks filter by user_id + venue_id + active)
CREATE INDEX IF NOT EXISTS idx_host_profiles_venue_active
  ON host_profiles (venue_id, active);

-- 2. RLS FOR HOST_PROFILES
-- ============================================================

ALTER TABLE host_profiles ENABLE ROW LEVEL SECURITY;

-- Hosts can read their own profile (for client-side awareness only — authz is server-side)
DO $$ BEGIN
  CREATE POLICY "authenticated_read_own_host_profile" ON host_profiles
    FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- No INSERT/UPDATE/DELETE for authenticated — managed via service role / SQL editor only

-- 3. INDEX FOR CUSTOMER SEARCH
-- ============================================================

-- Trigram index for ILIKE searches on customers
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_customers_full_name_trgm
  ON customers USING gin (full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_customers_phone_trgm
  ON customers USING gin (phone gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_customers_facebook_name_trgm
  ON customers USING gin (facebook_name gin_trgm_ops);

-- 4. INDEX FOR PENDING REWARD ACTIONS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_reward_actions_venue_status
  ON reward_actions (venue_id, status)
  WHERE status = 'pending';

-- 5. SEED HOST PROFILE (update UUIDs to match your data)
-- ============================================================
-- Find your user's UUID:
--   SELECT id FROM auth.users WHERE email = 'joey@fourdogsentertainment.com';
-- Find your venue's UUID:
--   SELECT id FROM venues WHERE slug = 'your-venue-slug';
--
-- Then run:
-- INSERT INTO host_profiles (user_id, venue_id, role, active)
-- VALUES ('YOUR_USER_UUID', 'YOUR_VENUE_UUID', 'host', true);
