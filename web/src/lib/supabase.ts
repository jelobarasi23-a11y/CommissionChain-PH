import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client. This app never talks to Supabase from the
 * browser — every database read/write goes through this app's own
 * /api/referrals/* routes, which is what makes it safe to use the
 * full-access key here rather than a row-level-security-scoped one.
 *
 * The key you want is whichever one bypasses Row Level Security:
 *   - On newer Supabase projects: Settings -> API Keys -> Secret keys
 *     (starts with `sb_secret_...`).
 *   - On older projects still on the legacy key system: Settings -> API
 *     Keys -> Legacy API Keys -> the `service_role` key (a long JWT).
 * Both work identically for this app's purposes — use whichever one your
 * project actually shows you.
 *
 * Never import this file from a "use client" component, and never expose
 * SUPABASE_SECRET_KEY through a NEXT_PUBLIC_ variable — it has full
 * read/write access to every table, with RLS ignored entirely.
 */
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SECRET_KEY. Check your .env against .env.example."
  );
}

export const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    // Server-side usage only — there's no browser session to persist or
    // refresh, and this app doesn't use Supabase Auth at all (identity
    // here is "whichever Stellar wallet signed the transaction").
    persistSession: false,
    autoRefreshToken: false,
  },
});
