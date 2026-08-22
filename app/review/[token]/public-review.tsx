"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ReviewNode = {
  id: string;
  mapId: string;
  parentId: string | null;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  assignee: string;
  due: string;
  progress: number;
  x: number;
  y: number;
  variant: string;
};
type ReviewComment = {
  id: string;
  nodeId: string;
  parentId: string | null;
  authorName: string;
  content: string;
  createdAt: string;
  resolvedAt: string | null;
  marker: null | { pinType: "node" | "canvas"; x: number; y: number; number: number };
};
type ReviewData = {
  review: { label: string; expiresAt: string | null; allowComments: boolean; scope: "map" | "branch" };
  workspaceName: string;
  map: { id: string; title: string };
  rootNodeId: string;
  nodes: ReviewNode[];
  dependencies: { id: string; nodeId: string; dependsOnId: string }[];
  comments: ReviewComment[];
};
type DraftPin = { nodeId: string; pinType: "node" | "canvas"; x: number; y: number };

const CARD_WIDTH = 240, CARD_HEIGHT = 132;
const statusLabels: Record<string, string> = { not_started: "Não iniciado", in_progress: "Em andamento", done: "Concluído", blocked: "Bloqueado" };

function initials(name: string) {
  return name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
}

export default function PublicReview({ token }: { token: string }) {
  const [data, setData] = useState<ReviewData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pinMode, setPinMode] = useState(false);
  const [draft, setDraft] = useState<DraftPin | null>(null);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [zoom, setZoom] = useState(.85);
  const [pan, setPan] = useState({ x: 24, y: 30 });
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number; moved: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/public-review?token=" + encodeURIComponent(token), { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível abrir a revisão");
      setData(body);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível abrir a revisão");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer); }, [load]);
  useEffect(() => {
    const timer=window.setTimeout(()=>{try { setName(localStorage.getItem("mo-review-name") || ""); } catch {}},0);
    return()=>window.clearTimeout(timer);
  }, []);

  const roots = useMemo(() => data?.comments.filter(comment => !comment.parentId) || [], [data]);
  const replies = useMemo(() => {
    const groups = new Map<string, ReviewComment[]>();
    data?.comments.filter(comment => comment.parentId).forEach(comment => groups.set(comment.parentId!, [...(groups.get(comment.parentId!) || []), comment]));
    return groups;
  }, [data]);
  const markers = roots.filter(comment => comment.marker);
  const activeComment = roots.find(comment => comment.id === activeCommentId) || null;
  const byId = useMemo(() => new Map(data?.nodes.map(node => [node.id, node]) || []), [data]);

  const markerPosition = (comment: ReviewComment) => {
    if (!comment.marker) return null;
    if (comment.marker.pinType === "canvas") return { left: comment.marker.x, top: comment.marker.y };
    const node = byId.get(comment.nodeId);
    if (!node) return null;
    return { left: node.x + comment.marker.x * CARD_WIDTH, top: node.y + comment.marker.y * CARD_HEIGHT };
  };

  const fitMap = useCallback(() => {
    if (!data || !canvasRef.current || data.nodes.length === 0) return;
    const bounds = data.nodes.reduce((value, node) => ({
      minX: Math.min(value.minX, node.x),
      minY: Math.min(value.minY, node.y),
      maxX: Math.max(value.maxX, node.x + CARD_WIDTH),
      maxY: Math.max(value.maxY, node.y + CARD_HEIGHT),
    }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
    const rect = canvasRef.current.getBoundingClientRect();
    const nextZoom = Math.max(.35, Math.min(1.25, Math.min((rect.width - 80) / Math.max(1, bounds.maxX - bounds.minX), (rect.height - 80) / Math.max(1, bounds.maxY - bounds.minY))));
    setZoom(nextZoom);
    setPan({ x: (rect.width - (bounds.maxX - bounds.minX) * nextZoom) / 2 - bounds.minX * nextZoom, y: (rect.height - (bounds.maxY - bounds.minY) * nextZoom) / 2 - bounds.minY * nextZoom });
  }, [data]);

  useEffect(() => {
    if (!data) return;
    const timer = window.setTimeout(fitMap, 50);
    return () => window.clearTimeout(timer);
  }, [data, fitMap]);

  const openMarker = (comment: ReviewComment) => {
    setActiveCommentId(comment.id);
    setDraft(null);
    const position = markerPosition(comment);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (position && rect) setPan({ x: rect.width / 2 - position.left * zoom, y: rect.height / 2 - position.top * zoom });
  };

  const markNode = (event: React.MouseEvent<HTMLElement>, node: ReviewNode) => {
    event.stopPropagation();
    if (!pinMode) {
      const related = roots.find(comment => comment.nodeId === node.id);
      if (related) openMarker(related);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setDraft({ nodeId: node.id, pinType: "node", x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height });
    setActiveCommentId(null);
    setPinMode(false);
  };

  const markCanvas = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!pinMode || !data || event.target !== event.currentTarget) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    setDraft({ nodeId: data.rootNodeId, pinType: "canvas", x: (event.clientX - rect.left - pan.x) / zoom, y: (event.clientY - rect.top - pan.y) / zoom });
    setActiveCommentId(null);
    setPinMode(false);
  };

  const submit = async (parentId: string | null = null) => {
    if (!draft && !parentId) return;
    setSending(true);
    try {
      const response = await fetch("/api/public-review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, name, content, parentId, nodeId: draft?.nodeId, pinType: draft?.pinType, x: draft?.x, y: draft?.y }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível publicar o comentário");
      try { localStorage.setItem("mo-review-name", name.trim()); } catch {}
      setContent("");
      setDraft(null);
      await load();
      setActiveCommentId(body.comment.parentId || body.comment.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível publicar o comentário");
    } finally {
      setSending(false);
    }
  };

  const startPan = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pinMode) return;
    dragRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const movePan = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = event.clientX - dragRef.current.x, dy = event.clientY - dragRef.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) dragRef.current.moved = true;
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
  };
  const endPan = () => { dragRef.current = null; };
  const wheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      setPan(current => ({ ...current, y: current.y - event.deltaY }));
      return;
    }
    if (event.shiftKey) {
      setPan(current => ({ ...current, x: current.x - event.deltaY }));
      return;
    }
    const next = Math.max(.3, Math.min(1.8, zoom * Math.exp(-event.deltaY * .001)));
    const rect = event.currentTarget.getBoundingClientRect(), pointerX = event.clientX - rect.left, pointerY = event.clientY - rect.top;
    setPan(current => ({ x: pointerX - (pointerX - current.x) * (next / zoom), y: pointerY - (pointerY - current.y) * (next / zoom) }));
    setZoom(next);
  };

  if (loading) return <main className="public-review-state"><span>MO</span><h1>Abrindo revisão segura...</h1></main>;
  if (!data) return <main className="public-review-state error"><span>!</span><h1>Link indisponível</h1><p>{error}</p></main>;

  const progress = Math.round(data.nodes.reduce((sum, node) => sum + node.progress, 0) / Math.max(1, data.nodes.length));
  return <main className="public-review-shell">
    <header className="public-review-header">
      <div><span className="public-review-logo">MO</span><div><small>{data.workspaceName} · REVISÃO DO CLIENTE</small><h1>{data.map.title}</h1></div></div>
      <div className="public-review-security"><span>🔒</span><div><b>Somente visualização e comentários</b><small>Nenhuma alteração direta no projeto é permitida.</small></div></div>
    </header>
    <section className="public-review-summary">
      <div><span>ESCOPO</span><b>{data.review.scope === "branch" ? "Etapa e seus filhos" : "Mapa completo"}</b></div>
      <div><span>PROGRESSO</span><b>{progress}%</b></div>
      <div><span>MARCAÇÕES</span><b>{markers.length}</b></div>
      <p>{data.review.label}</p>
    </section>
    <div className="public-review-layout">
      <section className={"public-review-canvas " + (pinMode ? "pin-mode" : "")} ref={canvasRef} onPointerDown={startPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan} onWheel={wheel}>
        <div className="public-review-world" style={{ transform: "translate(" + pan.x + "px," + pan.y + "px) scale(" + zoom + ")" }} onClick={markCanvas}>
          <svg width="2600" height="1800" aria-hidden="true">
            {data.nodes.filter(node => node.parentId).map(node => {
              const parent = byId.get(node.parentId!);
              if (!parent) return null;
              const fromX = parent.x + CARD_WIDTH / 2, fromY = parent.y + CARD_HEIGHT / 2, toX = node.x + CARD_WIDTH / 2, toY = node.y + CARD_HEIGHT / 2, midX = (fromX + toX) / 2;
              return <path key={"tree-" + node.id} d={"M " + fromX + " " + fromY + " C " + midX + " " + fromY + ", " + midX + " " + toY + ", " + toX + " " + toY} />;
            })}
            {data.dependencies.map(item => {
              const from = byId.get(item.dependsOnId), to = byId.get(item.nodeId);
              if (!from || !to) return null;
              return <path className="review-dependency" key={"dep-" + item.id} d={"M " + (from.x + CARD_WIDTH / 2) + " " + (from.y + CARD_HEIGHT) + " C " + (from.x + CARD_WIDTH / 2) + " " + (from.y + CARD_HEIGHT + 45) + ", " + (to.x + CARD_WIDTH / 2) + " " + (to.y - 45) + ", " + (to.x + CARD_WIDTH / 2) + " " + to.y} />;
            })}
          </svg>
          {data.nodes.map(node => <article key={node.id} className={"public-review-node status-" + node.status} style={{ left: node.x, top: node.y }} onClick={event => markNode(event, node)}>
            <header><span>{node.type.toUpperCase()}</span><em>{statusLabels[node.status] || node.status}</em></header>
            <h2>{node.title}</h2>
            {node.description && <p>{node.description}</p>}
            <footer><span>{node.assignee ? <i>{initials(node.assignee)}</i> : null}{node.assignee || "Sem responsável"}</span><b>{node.progress}%</b></footer>
            <div><i style={{ width: node.progress + "%" }} /></div>
          </article>)}
          {markers.map(comment => {
            const position = markerPosition(comment);
            if (!position) return null;
            return <button key={comment.id} className={"public-review-pin " + (comment.id === activeCommentId ? "active" : "")} style={position} onClick={event => { event.stopPropagation(); openMarker(comment); }} aria-label={"Abrir marcação " + comment.marker!.number}>{comment.marker!.number}</button>;
          })}
          {draft && (() => {
            const node = byId.get(draft.nodeId);
            const position = draft.pinType === "canvas" ? { left: draft.x, top: draft.y } : node ? { left: node.x + draft.x * CARD_WIDTH, top: node.y + draft.y * CARD_HEIGHT } : null;
            return position ? <span className="public-review-pin draft" style={position}>＋</span> : null;
          })()}
        </div>
        <div className="public-review-tools">
          <button onClick={() => setZoom(value => Math.max(.3, value - .1))}>−</button><span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom(value => Math.min(1.8, value + .1))}>＋</button><button onClick={fitMap}>Enquadrar</button>
        </div>
        <button className={"mark-point-button " + (pinMode ? "active" : "")} onClick={() => { setPinMode(value => !value); setDraft(null); }}>{pinMode ? "Clique no ponto desejado…" : "⌖ Marcar ponto"}</button>
        {pinMode && <div className="pin-instruction">Clique sobre um card ou em qualquer ponto do mapa.</div>}
      </section>
      <aside className="public-review-comments">
        <header><div><small>COMENTÁRIOS</small><h2>Marcações do cliente</h2></div><span>{markers.length}</span></header>
        {draft && <section className="new-review-comment">
          <b>Nova marcação</b><p>Explique claramente o que deseja alterar neste ponto.</p>
          <label>Seu nome<input value={name} onChange={event => setName(event.target.value)} maxLength={80} placeholder="Como devemos identificar você?"/></label>
          <label>Comentário<textarea value={content} onChange={event => setContent(event.target.value)} maxLength={3000} placeholder="Descreva a alteração, dúvida ou observação..."/></label>
          <div><button onClick={() => { setDraft(null); setContent(""); }}>Cancelar</button><button disabled={sending || name.trim().length < 2 || !content.trim()} onClick={() => void submit()}>{sending ? "Enviando..." : "Publicar marcação"}</button></div>
        </section>}
        {!draft && markers.length === 0 && <div className="review-comments-empty"><span>⌖</span><h3>Nenhuma marcação</h3><p>Clique em “Marcar ponto” e indique exatamente onde deseja comentar.</p></div>}
        {!draft && <div className="review-comment-list">{roots.map(comment => <article key={comment.id} className={comment.id === activeCommentId ? "active" : ""} onClick={() => openMarker(comment)}>
          <header><span>{comment.marker?.number || "•"}</span><div><b>{comment.authorName}</b><small>{new Date(comment.createdAt).toLocaleString("pt-BR")}</small></div>{comment.resolvedAt && <em>Resolvido</em>}</header>
          <p>{comment.content}</p>
          {(replies.get(comment.id) || []).map(reply => <div className="review-reply" key={reply.id}><b>{reply.authorName}</b><p>{reply.content}</p></div>)}
        </article>)}</div>}
        {activeComment && !draft && <section className="review-reply-box">
          <b>Responder à marcação #{activeComment.marker?.number}</b>
          <label>Seu nome<input value={name} onChange={event => setName(event.target.value)} maxLength={80}/></label>
          <textarea value={content} onChange={event => setContent(event.target.value)} maxLength={3000} placeholder="Escreva uma resposta..."/>
          <button disabled={sending || name.trim().length < 2 || !content.trim()} onClick={() => void submit(activeComment.id)}>{sending ? "Enviando..." : "Responder"}</button>
        </section>}
        {error && <p className="review-inline-error">{error}</p>}
        <footer><span>🔒 Link individual e rastreável</span><small>Você não pode alterar o mapa diretamente.</small></footer>
      </aside>
    </div>
  </main>;
}
