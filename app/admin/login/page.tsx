import { redirect } from "next/navigation";
import { getChatGPTUser, chatGPTSignInPath } from "../../chatgpt-auth";
import { isPlatformAdmin } from "../../api/_lib/commercial";
import { isSupabaseAuthConfigured } from "../../supabase/server";
import AuthForm from "../../auth/auth-form";
import AuthShell from "../../auth/auth-shell";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const user = await getChatGPTUser();
  if (user) {
    if (await isPlatformAdmin(user.email)) redirect("/admin");
    redirect("/app");
  }
  const configured = isSupabaseAuthConfigured();
  return <AuthShell area="admin" eyebrow="SUPER ADMIN" title="Acesso administrativo" description="Esta entrada é exclusiva do proprietário autorizado da plataforma.">
    <AuthForm mode="admin" configured={configured} />
    {!configured && <><div className="auth-divider">contingência do proprietário</div><a className="auth-current-access" href={chatGPTSignInPath("/admin")}>Usar acesso atual protegido</a></>}
  </AuthShell>;
}
