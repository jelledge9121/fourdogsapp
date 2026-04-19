import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

/**
 * Get the current session access token for authenticated API calls.
 */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

/**
 * Make an authenticated fetch to an API route.
 */
export async function authFetch(
  url: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; error?: string; data?: unknown }> {
  const token = await getAccessToken();
  if (!token) return { ok: false, error: "Not authenticated" };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) return { ok: false, error: json.error || "Request failed" };
  return { ok: true, data: json };
}
