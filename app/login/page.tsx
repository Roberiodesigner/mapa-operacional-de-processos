import { redirect } from "next/navigation";
import { getChatGPTUser } from "../chatgpt-auth";
import { safeReturnTo } from "../auth-policy";
import { isSupabaseAuthConfigured } from "../supabase/server";
import AuthForm from "../auth/auth-form";
import AuthShell from "../auth/auth-shell";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ return_to?: string; cadastro?: string; erro?: string }> }) {
  const params = await searchParams;
  const destination = safeReturnTo(params.return_to, "/app");
  const user = await getChatGPTUser();
  if (user) redirect(destination);
  const configured = isSupabaseAuthConfigured();
  return <AuthShell eyebrow="BEM-VINDO" title="Entre no Mapa Operacional" description="Use o e-mail e a senha da sua conta para acessar somente o seu Workspace." footer={<>Ainda não tem uma conta? <Link className="auth-inline-link" href="/cadastro">Comece o teste grátis</Link>.</>}>
    {params.cadastro === "confirmar-email" && <p className="auth-feedback success">Abra o e-mail de confirmação para ativar a conta.</p>}
    {params.erro && <p className="auth-feedback error">Este link não é mais válido. Solicite um novo acesso.</p>}
    <AuthForm mode="login" returnTo={destination} configured={configured} />
    {!configured && <><div className="auth-divider">acesso atual</div><a className="auth-current-access" href={`/signin-with-chatgpt?return_to=${encodeURIComponent(destination)}`}>Continuar com ChatGPT</a></>}
  </AuthShell>;
}
