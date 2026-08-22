import AuthForm from "../auth/auth-form";
import AuthShell from "../auth/auth-shell";
import { isSupabaseAuthConfigured } from "../supabase/server";

export const dynamic = "force-dynamic";

export default function UpdatePasswordPage() {
  return <AuthShell eyebrow="NOVA SENHA" title="Proteja sua conta" description="Crie uma nova senha de 8 a 128 caracteres para concluir a recuperação.">
    <AuthForm mode="updatePassword" configured={isSupabaseAuthConfigured()} />
  </AuthShell>;
}
