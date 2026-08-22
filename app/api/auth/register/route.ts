import { normalizeEmail, validEmail, validPassword } from "../../../auth-policy";
import { createSupabaseServerClient } from "../../../supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return Response.json({ error: "O cadastro por e-mail ainda não foi ativado." }, { status: 503 });

  const body = await request.json().catch(() => null) as { fullName?: unknown; email?: unknown; password?: unknown; passwordConfirmation?: unknown; plan?: unknown } | null;
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim().slice(0, 120) : "";
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  const passwordConfirmation = typeof body?.passwordConfirmation === "string" ? body.passwordConfirmation : "";
  if (fullName.length < 2 || !validEmail(email) || !validPassword(password) || password !== passwordConfirmation) {
    return Response.json({ error: "Revise seu nome, e-mail e a senha de pelo menos 8 caracteres." }, { status: 400 });
  }

  const plan = typeof body?.plan === "string" && /^[a-z0-9-]{2,40}$/.test(body.plan) ? body.plan : "";
  const destination = plan ? `/conta?plan=${encodeURIComponent(plan)}` : "/app";
  const origin = new URL(request.url).origin;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(destination)}`,
    },
  });
  if (error) return Response.json({ error: "Não foi possível concluir o cadastro. Tente novamente em alguns minutos." }, { status: 400 });
  return Response.json({
    ok: true,
    requiresConfirmation: !data.session,
    redirectTo: data.session ? destination : "/login?cadastro=confirmar-email",
  });
}
