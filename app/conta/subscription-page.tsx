"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type BillingPlan = { code:string; name:string; description:string; price_cents:number; currency:string; billing_interval:"month"|"year"; trial_days:number; highlighted:number };
type BillingData = {
  workspace:{name:string;ownerEmail:string}; canManageBilling:boolean; plans:BillingPlan[];
  license:null|{planCode:string;status:string;provider:string;currentPeriodEndsAt:string|null;cancelAtPeriodEnd:boolean};
  entitlement:{status:string;planCode:string;canEdit:boolean;readOnly:boolean;daysRemaining:number;message:string}; checkoutConfigured:boolean; checkoutProvider:string;
};

const statusLabel:Record<string,string>={trialing:"Teste ativo",active:"Licença ativa",past_due:"Pagamento pendente",canceled:"Cancelada",suspended:"Suspensa",expired:"Expirada",incomplete:"Aguardando pagamento"};
const money=(cents:number)=>(cents/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

export default function AccountPage({user}:{user:{name:string;email:string}}){
  const [data,setData]=useState<BillingData|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState("");
  const load=()=>fetch("/api/billing",{cache:"no-store"}).then(async response=>{const body=await response.json();if(!response.ok)throw new Error(body.error);setData(body)}).catch(reason=>setError(reason instanceof Error?reason.message:"Não foi possível carregar sua conta"));
  useEffect(()=>{load()},[]);
  const openBilling=async(planCode:string)=>{setBusy(planCode);setError("");try{const response=await fetch("/api/billing",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"checkout",planCode})});const body=await response.json();if(!response.ok)throw new Error(body.error||"Não foi possível abrir a cobrança");if(body.url)window.location.assign(body.url)}catch(reason){setError(reason instanceof Error?reason.message:"Não foi possível abrir a cobrança")}finally{setBusy("")}};
  return <main className="account-page"><header className="account-header"><Link className="account-brand" href="/"><span>MO</span><b>Mapa Operacional</b></Link><nav><Link href="/app">← Voltar para a plataforma</Link><a href="/api/auth/logout">Sair</a></nav></header>
    {!data&&!error?<div className="account-loading">Carregando sua assinatura...</div>:<div className="account-shell">
      <section className="account-title"><div><span>CONTA E ASSINATURA</span><h1>Seu plano, sua licença<br/>e seus pagamentos.</h1><p>Administre a continuidade do seu Workspace sem perder mapas ou histórico.</p></div><aside><span>{user.name.slice(0,1).toUpperCase()}</span><div><b>{user.name}</b><small>{user.email}</small></div></aside></section>
      {error&&<div className="account-alert error">{error}</div>}
      {new URLSearchParams(typeof window!=="undefined"?window.location.search:"").get("checkout")==="success"&&<div className="account-alert success">Checkout concluído. O Asaas confirmará o pagamento e a licença será atualizada automaticamente.</div>}
      {data&&<><section className={`license-summary ${data.entitlement.status}`}><div><span>STATUS DA LICENÇA</span><h2>{statusLabel[data.entitlement.status]||data.entitlement.status}</h2><p>{data.entitlement.message}</p></div><div className="license-facts"><span><small>WORKSPACE</small><b>{data.workspace.name}</b></span><span><small>PLANO</small><b>{data.entitlement.planCode==="trial"?"Teste grátis":data.plans.find(plan=>plan.code===data.entitlement.planCode)?.name||data.entitlement.planCode}</b></span><span><small>ACESSO</small><b>{data.entitlement.canEdit?"Edição liberada":"Somente leitura"}</b></span>{data.entitlement.daysRemaining>0&&<span><small>DIAS RESTANTES</small><b>{data.entitlement.daysRemaining}</b></span>}</div></section>
      <section className="account-plans"><header><span>PLANOS DISPONÍVEIS</span><h2>Continue construindo seus processos</h2><p>O teste começa sem cartão. A cobrança recorrente acontece no checkout seguro do Asaas.</p></header><div className="account-plan-grid">{data.plans.map(plan=><article key={plan.code} className={plan.highlighted?"highlighted":""}>{plan.highlighted?<i>RECOMENDADO</i>:null}<span>{plan.name}</span><p>{plan.description}</p><h3>{money(plan.price_cents)}<small>/{plan.billing_interval==="year"?"ano":"mês"}</small></h3><ul><li>Mapas e etapas ilimitados</li><li>Colaboração e aprovações</li><li>Arquivos e histórico preservados</li><li>Links de revisão para clientes</li></ul><button disabled={!data.canManageBilling||!data.checkoutConfigured||Boolean(busy)||data.entitlement.status==="active"&&data.entitlement.planCode===plan.code} onClick={()=>openBilling(plan.code)}>{busy===plan.code?"Abrindo Asaas...":data.entitlement.status==="active"&&data.entitlement.planCode===plan.code?"Plano atual":data.checkoutConfigured?`Assinar ${plan.name}`:"Pagamento em configuração"}</button></article>)}</div>{!data.checkoutConfigured&&<aside className="checkout-notice"><b>Integração Asaas preparada</b><p>O administrador ainda precisa conectar a chave da API e o token do webhook em Configurações → Integrações. A gestão manual de licenças já está disponível no painel administrativo.</p></aside>}</section></>}
    </div>}
  </main>;
}
