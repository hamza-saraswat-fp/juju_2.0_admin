import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client used by serverless functions only. Uses the service-role
 * key (never exposed to the SPA), so it bypasses RLS and can write to
 * `digest_log` reliably.
 *
 * Two env vars (set in Vercel):
 *   - VITE_SUPABASE_URL          (same project URL the SPA uses)
 *   - SUPABASE_SERVICE_ROLE_KEY  (service-role key, NOT the anon key)
 */
export function createServerSupabase(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var",
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
