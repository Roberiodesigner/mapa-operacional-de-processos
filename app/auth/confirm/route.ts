import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeReturnTo } from "../../auth-policy";
import { createSupabaseServerClient } from "../../supabase/server";

const allowedOtpTypes = new Set<EmailOtpType>(["signup", "recovery", "email", "email_change"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const next = safeReturnTo(url.searchParams.get("next"), "/app");
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.redirect(`${origin}/login?erro=configuracao`);

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  let error: unknown = null;
  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type && allowedOtpTypes.has(type)) {
    ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  } else {
    error = new Error("Invalid confirmation parameters");
  }
  return NextResponse.redirect(error ? `${origin}/login?erro=link-invalido` : `${origin}${next}`);
}
