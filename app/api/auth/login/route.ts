import { authErrorMessage, normalizeEmail, safeReturnTo, validEmail, validPassword } from "../../../auth-policy";
import { createSupabaseServerClient } from "../../../supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return Response.json({ error: "O login por e-mail ainda não foi ativado." }, { status: 503 });

  const body = await request.json().catch(() => null) as { email?: unknown; password?: unknown; returnTo?: unknown } | null;
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!validEmail(email) || !validPassword(password)) {
    return Response.json({ error: authErrorMessage("customer") }, { status: 401 });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return Response.json({ error: authErrorMessage("customer") }, { status: 401 });
  return Response.json({ ok: true, redirectTo: safeReturnTo(body?.returnTo, "/app") });
}
