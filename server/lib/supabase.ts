import { createClient } from "@supabase/supabase-js";
import { ENV } from "../_core/env";

if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) {
  throw new Error(
    "[Supabase Server] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
  );
}

// Create Supabase client with SERVICE_ROLE_KEY for admin operations
// This allows us to bypass RLS and perform admin operations like creating users
export const supabaseAdmin = createClient(
  ENV.supabaseUrl,
  ENV.supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
