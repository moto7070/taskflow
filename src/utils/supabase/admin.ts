import { createClient } from "@supabase/supabase-js";

import { getSupabaseServiceRoleConfig } from "@/lib/env";

export function createAdminClient() {
  const { url, serviceRoleKey } = getSupabaseServiceRoleConfig();
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
