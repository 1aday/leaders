import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

function requireEnvOneOf(names: string[]): string {
  for (const name of names) {
    const v = process.env[name];
    if (v) return v;
  }
  throw new Error(`Missing ${names[0]}`);
}

/**
 * Supabase Admin client (uses Service Role key).
 * - Safe for server-side only (Route Handlers, server actions).
 * - Service role bypasses RLS, so do NOT expose this client to the browser.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  // Accept either private or Next.js public env var for URL; key must remain server-only.
  const url = requireEnvOneOf(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]);
  const serviceRoleKey = requireEnvOneOf(["SUPABASE_SERVICE_ROLE_KEY"]);

  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cached;
}


