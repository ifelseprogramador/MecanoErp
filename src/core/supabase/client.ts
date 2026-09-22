import { createBrowserClient } from "@supabase/ssr";
import { requireEnv } from "@/core/env";

/** Cliente Supabase para uso em Client Components (ex.: form de login). */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
