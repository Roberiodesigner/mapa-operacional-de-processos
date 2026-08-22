import { validPassword } from "../../../auth-policy";
import { createSupabaseServerClient } from "../../../supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return Response.json({ error: "Recuperação indisponível." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "O link expirou. Solicite uma nova recuperação." }, { status: 401 });

  const body = await request.json().catch(() => null) as { password?: unknown; passwordConfirmation?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  const confirmation = typeof body?.passwordConfirmation === "string" ? body.passwordConfirmation : "";
  if (!validPassword(password) || password !== confirmation) {
    return Response.json({ error: "Use uma senha de 8 a 128 caracteres e confirme corretamente." }, { status: 400 });
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return Response.json({ error: "Não foi possível atualizar a senha." }, { status: 400 });
  return Response.json({ ok: true, redirectTo: "/app" });
}
