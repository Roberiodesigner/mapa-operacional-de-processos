"use client";

import Link from "next/link";
import { useState } from "react";

type Mode = "login" | "register" | "recover" | "updatePassword" | "admin";

const endpointByMode: Record<Mode, string> = {
  login: "/api/auth/login",
  register: "/api/auth/register",
  recover: "/api/auth/recover",
  updatePassword: "/api/auth/update-password",
  admin: "/api/auth/admin-login",
};

export default function AuthForm({ mode, returnTo = "/app", plan = "", configured = true }: { mode: Mode; returnTo?: string; plan?: string; configured?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) {
      setError("O acesso por e-mail está sendo ativado. Use o acesso atual disponível abaixo.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch(endpointByMode[mode], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...payload, returnTo, plan }),
    });
    const body = await response.json().catch(() => ({})) as { error?: string; message?: string; redirectTo?: string; requiresConfirmation?: boolean };
    if (!response.ok) {
      setError(body.error || "Não foi possível concluir. Tente novamente.");
      setBusy(false);
      return;
    }
    if (mode === "recover") {
      setMessage(body.message || "Verifique seu e-mail.");
      setBusy(false);
      return;
    }
    if (mode === "register" && body.requiresConfirmation) {
      setMessage("Cadastro recebido. Abra o e-mail de confirmação para ativar sua conta.");
      setBusy(false);
      return;
    }
    window.location.assign(body.redirectTo || (mode === "admin" ? "/admin" : "/app"));
  }

  const isPasswordMode = mode === "login" || mode === "register" || mode === "admin";
  return <form className="auth-form" onSubmit={submit}>
    {mode === "register" && <label>Nome completo<input name="fullName" autoComplete="name" minLength={2} maxLength={120} required placeholder="Como devemos chamar você?" /></label>}
    {mode !== "updatePassword" && <label>E-mail<input name="email" type="email" autoComplete="email" maxLength={254} required placeholder={mode === "admin" ? "E-mail administrativo" : "voce@empresa.com"} /></label>}
    {isPasswordMode && <label>Senha<input name="password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={8} maxLength={128} required placeholder="Mínimo de 8 caracteres" /></label>}
    {(mode === "register" || mode === "updatePassword") && <>
      {mode === "updatePassword" && <label>Nova senha<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required placeholder="Mínimo de 8 caracteres" /></label>}
      <label>Confirmar senha<input name="passwordConfirmation" type="password" autoComplete="new-password" minLength={8} maxLength={128} required placeholder="Digite a mesma senha" /></label>
    </>}
    {mode === "login" && <div className="auth-form-links"><Link href="/recuperar-senha">Esqueci minha senha</Link></div>}
    {error && <p className="auth-feedback error" role="alert">{error}</p>}
    {message && <p className="auth-feedback success" role="status">{message}</p>}
    <button className="auth-submit" disabled={busy} type="submit">
      {busy ? "Aguarde..." : mode === "login" ? "Entrar na plataforma" : mode === "register" ? "Criar conta e iniciar teste" : mode === "recover" ? "Enviar instruções" : mode === "updatePassword" ? "Salvar nova senha" : "Entrar na administração"}
      {!busy && <span>→</span>}
    </button>
  </form>;
}
