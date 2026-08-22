import { normalizeEmail, validEmail } from "../../../auth-policy";
import { createSupabaseServerClient } from "../../../supabase/server";
import { publicOrigin } from "../../../public-origin";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return Response.json({ error: "A recuperação por e-mail ainda não foi ativada." }, { status: 503 });

  const body = await request.json().catch(() => null) as { email?: unknown } | null;
  const email = normalizeEmail(body?.email);
  if (validEmail(email)) {
    const origin = publicOrigin(request);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/confirm?next=${encodeURIComponent("/redefinir-senha")}`,
    });
  }
  // Always return the same response to avoid exposing which emails are registered.
  return Response.json({ ok: true, message: "Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação." });
}
