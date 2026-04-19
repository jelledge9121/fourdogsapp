# Four Dogs Entertainment — Live Event App

Production PWA for hosting trivia and music bingo events.

## Setup

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Configure .env.local

Get your **service role key** from Supabase Dashboard → Settings → API → `service_role` (the secret one, not the anon key). Add it to `.env.local`:

```
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-actual-key
```

**Never expose this key in client code or commit it to git.**

### 3. Run the Supabase migration

Open `supabase-migration.sql` in Supabase Dashboard → SQL Editor and run it. This creates:

- `team_name` and `is_first_visit` columns on `check_ins`
- Unique constraints preventing duplicate check-ins and duplicate bonuses
- RLS policies (anon can only READ, all writes go through service role)
- Two atomic RPC functions (`perform_checkin`, `apply_host_bonus`)
- Realtime publication on `check_ins` and `reward_actions`

### 4. Create a host user

In Supabase Dashboard → Authentication → Users → **Add User**. Use email/password. This is the login for `/host`.

### 5. Set an event to live

```sql
UPDATE events SET status = 'live' WHERE id = 'your-event-uuid';
```

### 6. Run

```bash
npm run dev
```

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Add these environment variables in Vercel project settings:

| Variable | Value | Exposed to browser? |
|----------|-------|---------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | **No** (server only) |

## Security Architecture

### Authentication
- `/checkin` — public, no auth required (QR code target)
- `/host` — requires Supabase Auth login (email/password)
- Host actions (bonus, toggle, add-team) require a valid auth session token

### Write path (all server-side)
- Player check-in → `POST /api/checkin` → `perform_checkin()` RPC
- Host bonus → `POST /api/host/bonus` → `apply_host_bonus()` RPC
- Host toggle → `POST /api/host/toggle` → `apply_host_bonus()` RPC
- Host add team → `POST /api/host/add-team` → service role insert

All writes use the **service role key** on the server. The browser anon key can only read.

### Database constraints
- `check_ins(customer_id, event_id)` — UNIQUE, prevents duplicate check-ins
- `reward_actions(customer_id, event_id, action_type, description)` — UNIQUE, enforces one-use bonuses
- Both RPCs check for duplicates inside the transaction before inserting

### RLS policies
- `events`: anon can SELECT where `status = 'live'`
- `venues`: anon can SELECT where `active = true`
- `customers`: anon can SELECT (no insert/update)
- `check_ins`: anon can SELECT for live events (no insert)
- `reward_actions`: anon can SELECT for live events (no insert)
- `rewards`: anon can SELECT (no insert/update)

### Rate limiting
- Check-in: 10 per minute per IP
- Host actions: 30 per minute per host user
- In-memory sliding window (resets on deploy)

### Atomic operations
- `perform_checkin()` — single transaction: find/create customer → insert check-in → log reward actions → upsert rewards
- `apply_host_bonus()` — single transaction: duplicate check → insert reward action → update rewards balance
