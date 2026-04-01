import { createClient } from "@supabase/supabase-js";

// IMPORTANT: This client uses the service role key which bypasses RLS entirely.
// NEVER import this file in any client component or any file that could be bundled client-side.
// Use ONLY in: scripts/, server-side API routes, and server actions that require admin access.

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is not set. Admin client cannot be initialized."
  );
}

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
