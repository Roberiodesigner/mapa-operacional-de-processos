"use client";

import { useCallback, useEffect, useState } from "react";

export type ReviewMarker = {
  id: string;
  reviewLinkId: string;
  commentId: string;
  nodeId: string;
  pinType: "node" | "canvas";
  x: number;
  y: number;
  number: number;
  authorName: string;
  content: string;
  createdAt: string;
};
type ReviewLink = {
  id: string;
  mapId: string;
  rootNodeId: string | null;
  label: string;
  status: string;
  allowComments: boolean;
  expiresAt: string | null;
  createdAt: string;
  lastAccessedAt: string | null;
  usable: boolean;
};

export function ReviewLinksPanel({ map, nodes, suggestedRootNodeId, onClose, onMarkersChange }: {
  map: { id: string; title: string };
  nodes: { id: string; title: string; parentId: string | null }[];
  suggestedRootNodeId: string | null;
  onClose: () => void;
  onMarkersChange: (markers: ReviewMarker[]) => void;
}) {
  const [links, setLinks] = useState<ReviewLink[]>([]);
  const [scope, setScope] = useState<"map" | "branch">(suggestedRootNodeId ? "branch" : "map");
  const [rootNodeId, setRootNodeId] = useState(suggestedRootNodeId || nodes.find(node => !node.parentId)?.id || "");
  const [label, setLabel] = useState("Revisão do cliente");
  const [duration, setDuration] = useState(30);
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/review-links?mapId=" + encodeURIComponent(map.id), { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Não foi possível carregar os links");
    setLinks(body.links || []);
    onMarkersChange(body.markers || []);
  }, [map.id, onMarkersChange]);

  useEffect(() => {
    const timer=window.setTimeout(()=>void load().catch(reason => setMessage(reason instanceof Error ? reason.message : "Erro ao carregar links")).finally(() => setLoading(false)),0);
    return()=>window.clearTimeout(timer);
  }, [load]);

  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); setMessage("Link copiado. Envie diretamente ao cliente."); }
    catch { window.prompt("Copie o link de revisão", value); }
  };

  const makeUrl = (token: string) => new URL("/review/" + token, window.location.origin).toString();

  const create = async () => {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/review-links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create", mapId: map.id, rootNodeId: scope === "branch" ? rootNodeId : null, label, expiresInDays: duration }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível gerar o link");
      const url = makeUrl(body.token);
      setGeneratedUrl(url);
      await copy(url);
      await load();
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Erro ao gerar link"); }
    finally { setBusy(false); }
  };

  const renew = async (link: ReviewLink) => {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/review-links", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "renew", id: link.id, expiresInDays: duration }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível renovar o link");
      const url = makeUrl(body.token);
      setGeneratedUrl(url);
      await copy(url);
      await load();
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Erro ao renovar link"); }
    finally { setBusy(false); }
  };

  const revoke = async (link: ReviewLink) => {
    if (!window.confirm("Desativar este link? O cliente perderá o acesso imediatamente.")) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/review-links", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: link.id, action: "revoke" }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível desativar o link");
      setMessage("Link desativado com segurança.");
      await load();
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Erro ao desativar link"); }
    finally { setBusy(false); }
  };

  return <div className="review-links-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="review-links-panel" role="dialog" aria-modal="true" aria-label="Compartilhar revisão com cliente" onMouseDown={event => event.stopPropagation()}>
      <header><div><span>↗</span><div><small>LINK PARA O CLIENTE</small><h2>Compartilhar revisão</h2><p>{map.title}</p></div></div><button onClick={onClose} aria-label="Fechar">×</button></header>
      <div className="review-link-security"><span>🔒</span><div><b>O cliente não precisa fazer login</b><p>Ele somente visualiza o conteúdo liberado, marca pontos e comenta. Não poderá mover ou editar nada.</p></div></div>
      <div className="review-link-form">
        <label>Identificação do link<input value={label} maxLength={160} onChange={event => setLabel(event.target.value)} placeholder="Ex.: Revisão da campanha de agosto"/></label>
        <div className="review-scope-choice">
          <button className={scope === "map" ? "active" : ""} onClick={() => setScope("map")}><b>Mapa completo</b><small>Exibe todas as etapas deste mapa</small></button>
          <button className={scope === "branch" ? "active" : ""} onClick={() => setScope("branch")}><b>Somente um ramo</b><small>Exibe a etapa escolhida e seus filhos</small></button>
        </div>
        {scope === "branch" && <label>Etapa inicial<select value={rootNodeId} onChange={event => setRootNodeId(event.target.value)}>{nodes.map(node => <option value={node.id} key={node.id}>{node.title}</option>)}</select></label>}
        <label>Validade<select value={duration} onChange={event => setDuration(Number(event.target.value))}><option value={7}>7 dias</option><option value={30}>30 dias</option><option value={90}>90 dias</option></select></label>
        <button className="generate-review-link" disabled={busy || !label.trim() || (scope === "branch" && !rootNodeId)} onClick={() => void create()}>{busy ? "Preparando link..." : "Gerar e copiar link seguro"}</button>
      </div>
      {generatedUrl && <div className="generated-review-link"><div><b>Link pronto</b><small>Este endereço completo aparece somente agora. Guarde-o com segurança.</small></div><input readOnly value={generatedUrl}/><button onClick={() => void copy(generatedUrl)}>Copiar novamente</button></div>}
      <section className="review-link-history"><header><div><h3>Links deste mapa</h3><p>Renove para gerar um novo endereço ou desative o acesso imediatamente.</p></div><span>{links.length}</span></header>
        {loading && <p className="review-link-empty">Carregando links...</p>}
        {!loading && links.length === 0 && <p className="review-link-empty">Nenhum link de revisão criado para este mapa.</p>}
        {links.map(link => {
          const expired = link.status === "active" && !link.usable;
          const active = link.usable;
          return <article key={link.id}><span className={"review-link-status " + (active ? "active" : "inactive")}>{active ? "ATIVO" : expired ? "EXPIRADO" : "DESATIVADO"}</span><div><b>{link.label}</b><p>{link.rootNodeId ? "Ramo específico" : "Mapa completo"} · validade até {link.expiresAt ? new Date(link.expiresAt).toLocaleDateString("pt-BR") : "sem prazo"}</p><small>{link.lastAccessedAt ? "Último acesso " + new Date(link.lastAccessedAt).toLocaleString("pt-BR") : "Ainda não acessado"}</small></div><div><button disabled={busy} onClick={() => void renew(link)}>Gerar novo link</button>{active && <button className="revoke-review-link" disabled={busy} onClick={() => void revoke(link)}>Desativar</button>}</div></article>;
        })}
      </section>
      {message && <p className="review-link-message">{message}</p>}
      <footer><span>Links não revelam outros mapas, arquivos ou informações internas.</span><button onClick={onClose}>Concluir</button></footer>
    </section>
  </div>;
}
