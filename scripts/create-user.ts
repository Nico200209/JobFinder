/**
 * One-time script to create the initial user account.
 *
 * Usage:
 *   npx tsx scripts/create-user.ts
 *
 * Prerequisites:
 *   Populate .env.local with real Supabase credentials before running.
 *
 * Security:
 *   After running successfully, clear USER_PASSWORD below (replace with empty string).
 *   Never commit a real password in this file.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local"
  );
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ── Configure before running ──────────────────────────────────────────────────
const USER_EMAIL = "nicogarciapaetz@gmail.com";
const USER_PASSWORD = ""; // Set a strong password here before running, then clear it after
// ─────────────────────────────────────────────────────────────────────────────

async function createUser() {
  if (!USER_PASSWORD) {
    console.error("Error: Set USER_PASSWORD in this script before running.");
    process.exit(1);
  }

  console.log(`Creating user: ${USER_EMAIL}`);

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: USER_EMAIL,
    password: USER_PASSWORD,
    email_confirm: true, // Skip confirmation email — mark as already confirmed
  });

  if (error) {
    console.error("Failed to create user:", error.message);
    process.exit(1);
  }

  console.log("User created successfully:");
  console.log(`  ID:         ${data.user.id}`);
  console.log(`  Email:      ${data.user.email}`);
  console.log(`  Created at: ${data.user.created_at}`);
  console.log("\nYou can now sign in at /login.");
  console.log("Remember to clear USER_PASSWORD from this file.");
}

createUser();
