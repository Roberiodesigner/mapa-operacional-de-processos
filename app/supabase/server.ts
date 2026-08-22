import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function authEnvironmentValue(key: string) {
  return process.env[key]?.trim() || "";
}

export function supabaseAuthConfig() {
  const url = authEnvironmentValue("NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey = authEnvironmentValue("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  return url && publishableKey ? { url, publishableKey } : null;
}

export function isSupabaseAuthConfigured() {
  return Boolean(supabaseAuthConfig());
}

export async function createSupabaseServerClient() {
  const config = supabaseAuthConfig();
  if (!config) return null;
  const cookieStore = await cookies();
  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot mutate cookies. The root proxy refreshes them.
        }
      },
    },
  });
}
