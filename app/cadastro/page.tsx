import { redirect } from "next/navigation";
import Link from "next/link";
import { getChatGPTUser } from "../chatgpt-auth";
import { isSupabaseAuthConfigured } from "../supabase/server";
import AuthForm from "../auth/auth-form";
import AuthShell from "../auth/auth-shell";

export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const params = await searchParams;
  const user = await getChatGPTUser();
  if (user) redirect(params.plan ? `/conta?plan=${encodeURIComponent(params.plan)}` : "/app");
  return <AuthShell eyebrow="7 DIAS GRÁTIS" title="Crie sua conta" description="Cadastre seus dados, confirme o e-mail e comece o primeiro mapa sem cartão." footer={<>Já possui uma conta? <Link className="auth-inline-link" href="/login">Entrar</Link>.</>}>
    <AuthForm mode="register" plan={params.plan || ""} configured={isSupabaseAuthConfigured()} />
  </AuthShell>;
}
