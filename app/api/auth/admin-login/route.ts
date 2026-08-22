import { authErrorMessage, normalizeEmail, validEmail, validPassword } from "../../../auth-policy";
import { isPlatformAdmin } from "../../_lib/commercial";
import { createSupabaseServerClient } from "../../../supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return Response.json({ error: "O login administrativo por e-mail ainda não foi ativado." }, { status: 503 });

  const body = await request.json().catch(() => null) as { email?: unknown; password?: unknown } | null;
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!validEmail(email) || !validPassword(password)) {
    return Response.json({ error: authErrorMessage("admin") }, { status: 401 });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user?.email || !await isPlatformAdmin(data.user.email)) {
    await supabase.auth.signOut({ scope: "local" });
    return Response.json({ error: authErrorMessage("admin") }, { status: 403 });
  }
  return Response.json({ ok: true, redirectTo: "/admin" });
}
