import Link from "next/link";
import type { ReactNode } from "react";
import "./auth.css";

export default function AuthShell({ area = "customer", eyebrow, title, description, children, footer }: { area?: "customer" | "admin"; eyebrow: string; title: ReactNode; description: string; children: ReactNode; footer?: ReactNode }) {
  const admin = area === "admin";
  return <main className={`auth-page ${admin ? "auth-admin" : ""}`}>
    <section className="auth-story">
      <Link className="auth-brand" href="/"><span>MO</span><b>Mapa Operacional</b></Link>
      <div>
        <span className="auth-kicker">{admin ? "ACESSO INTERNO RESTRITO" : "ACESSO SEGURO"}</span>
        <h1>{admin ? <>Administração da<br/><em>plataforma.</em></> : <>Seus processos.<br/><em>Seu Workspace.</em></>}</h1>
        <p>{admin ? "Área comercial separada da aplicação dos clientes, protegida por identidade e autorização administrativa no servidor." : "Mapas, arquivos, comentários e histórico protegidos por conta individual e permissões do Workspace."}</p>
      </div>
      <ul>
        <li><i>✓</i><span><b>{admin ? "Autorização em duas camadas" : "Workspace isolado"}</b>{admin ? "Login válido e função administrativa obrigatória." : "Os dados de cada empresa permanecem separados."}</span></li>
        <li><i>✓</i><span><b>{admin ? "Sem atalho no cliente" : "Permissões reais"}</b>{admin ? "A plataforma do cliente não exibe acesso administrativo." : "Acesso controlado por função e por mapa."}</span></li>
        <li><i>✓</i><span><b>{admin ? "Auditoria comercial" : "Senha protegida"}</b>{admin ? "Operações sensíveis permanecem restritas ao proprietário." : "A plataforma não armazena sua senha diretamente."}</span></li>
      </ul>
    </section>
    <section className="auth-panel">
      <div className="auth-card">
        <span className="auth-card-icon">{admin ? "ADM" : "MO"}</span>
        <small>{eyebrow}</small>
        <h2>{title}</h2>
        <p>{description}</p>
        {children}
        {footer && <footer>{footer}</footer>}
      </div>
      <Link className="auth-back" href="/">← Voltar para a página inicial</Link>
    </section>
  </main>;
}
