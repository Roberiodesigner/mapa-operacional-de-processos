import Link from "next/link";
import { isSupabaseAuthConfigured } from "../supabase/server";
import AuthForm from "../auth/auth-form";
import AuthShell from "../auth/auth-shell";

export const dynamic = "force-dynamic";

export default function RecoverPage() {
  return <AuthShell eyebrow="RECUPERAR ACESSO" title="Esqueceu sua senha?" description="Informe seu e-mail. A resposta será sempre discreta para proteger a existência das contas." footer={<Link className="auth-inline-link" href="/login">Voltar para o login</Link>}>
    <AuthForm mode="recover" configured={isSupabaseAuthConfigured()} />
  </AuthShell>;
}
