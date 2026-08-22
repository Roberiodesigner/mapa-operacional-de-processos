"use client";

import { useMemo, useState } from "react";
import { groupCommentThreads, memberRoles, mentionedMemberEmails, permissionSummary, roleLabels, type MemberRole } from "./collaboration-policy";

export type CollaborationMember = {
  id: string;
  email: string;
  name: string;
  role: MemberRole;
  roleLabel: string;
  permissionSummary: string;
  status: "pending" | "active";
  allMaps: boolean;
  mapIds: string[];
  invitedAt: string;
  joinedAt: string | null;
  lastActiveAt: string | null;
};

export type CollaborationData = {
  currentUser: { email: string; name: string; role: MemberRole };
  capabilities: { manageMembers: boolean; edit: boolean; execute: boolean; comment: boolean; approve: boolean };
  members: CollaborationMember[];
  maps: { id: string; title: string; archived: boolean }[];
};

export type RichComment = {
  id: string;
  mapId: string;
  nodeId: string;
  parentId: string | null;
  authorName: string;
  authorEmail: string;
  content: string;
  createdAt: string;
  editedAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string;
  reviewPinNumber?: number | null;
  reactions: { emoji: string; count: number; reactedByMe: boolean }[];
};

export type AppNotification = { id: string; kind: string; actorEmail: string; mapId: string; nodeId: string; commentId: string; message: string; readAt: string | null; createdAt: string };

type MemberInput = { email: string; name: string; role: Exclude<MemberRole, "owner">; allMaps: boolean; mapIds: string[] };

export function TeamPage({data,loading,onInvite,onUpdate,onRemove,onCopyInvite}:{data:CollaborationData|null;loading:boolean;onInvite:(input:MemberInput)=>Promise<void>;onUpdate:(id:string,input:Omit<MemberInput,"email">)=>Promise<void>;onRemove:(member:CollaborationMember)=>Promise<void>;onCopyInvite:(member:CollaborationMember)=>void}) {
  const maps=data?.maps.filter(map=>!map.archived)??[];
  const [email,setEmail]=useState("");
  const [name,setName]=useState("");
  const [role,setRole]=useState<Exclude<MemberRole,"owner">>("editor");
  const [allMaps,setAllMaps]=useState(false);
  const [mapIds,setMapIds]=useState<string[]>([]);
  const [sending,setSending]=useState(false);
  const toggleMap=(id:string)=>setMapIds(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
  const submit=async()=>{setSending(true);try{await onInvite({email,name,role,allMaps,mapIds});setEmail("");setName("");setRole("editor");setAllMaps(false);setMapIds([])}finally{setSending(false)}};
  return <main className="team-page"><header><div><span>EQUIPE E ACESSOS</span><h1>Colaboração com controle</h1><p>Convide pessoas, defina o papel de cada uma e libere somente os mapas necessários.</p></div><div className="team-security"><b>🔒 Permissões no servidor</b><small>Cada acesso é validado pelo Workspace e pelo mapa.</small></div></header>
    {data?.capabilities.manageMembers&&<section className="invite-card"><div><span className="invite-icon">＋</span><div><h2>Convidar uma pessoa</h2><p>O acesso será ativado quando ela entrar com o e-mail informado.</p></div></div><div className="invite-form"><label>Nome<input value={name} onChange={event=>setName(event.target.value)} placeholder="Nome da pessoa"/></label><label>E-mail<input type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="pessoa@empresa.com"/></label><label>Papel<select value={role} onChange={event=>{const next=event.target.value as Exclude<MemberRole,"owner">;setRole(next);if(next==="admin")setAllMaps(true)}}>{memberRoles.map(item=><option value={item} key={item}>{roleLabels[item]}</option>)}</select><small>{permissionSummary(role)}</small></label></div><div className="map-access-selector"><label className="all-maps-toggle"><input type="checkbox" checked={allMaps} disabled={role==="admin"} onChange={event=>setAllMaps(event.target.checked)}/><span><b>Todos os mapas</b><small>Inclui mapas criados futuramente</small></span></label>{!allMaps&&<div className="map-checks">{maps.map(map=><label key={map.id}><input type="checkbox" checked={mapIds.includes(map.id)} onChange={()=>toggleMap(map.id)}/><span>{map.title}</span></label>)}</div>}</div><footer><span>{allMaps?"Acesso geral ao Workspace":`${mapIds.length} mapa(s) selecionado(s)`}</span><button disabled={sending||!email.trim()||(!allMaps&&mapIds.length===0)} onClick={submit}>{sending?"Preparando acesso...":"Preparar acesso"}</button></footer></section>}
    <section className="members-section"><header><div><h2>Pessoas no Workspace</h2><p>{data?.members.length??0} pessoas entre ativas e convidadas</p></div><span>{data?.members.filter(member=>member.status==="active").length??0} ativas</span></header>{loading&&<div className="team-empty">Carregando equipe...</div>}{!loading&&data?.members.map(member=><MemberCard key={member.id} member={member} maps={maps} canManage={Boolean(data.capabilities.manageMembers)&&member.role!=="owner"} onSave={input=>onUpdate(member.id,input)} onRemove={()=>onRemove(member)} onCopy={()=>onCopyInvite(member)}/>)}</section>
  </main>;
}

function MemberCard({member,maps,canManage,onSave,onRemove,onCopy}:{member:CollaborationMember;maps:{id:string;title:string}[];canManage:boolean;onSave:(input:Omit<MemberInput,"email">)=>Promise<void>;onRemove:()=>Promise<void>;onCopy:()=>void}) {
  const [editing,setEditing]=useState(false),[saving,setSaving]=useState(false);
  const [name,setName]=useState(member.name),[role,setRole]=useState<Exclude<MemberRole,"owner">>(member.role==="owner"?"admin":member.role),[allMaps,setAllMaps]=useState(member.allMaps),[mapIds,setMapIds]=useState(member.mapIds);
  const save=async()=>{setSaving(true);try{await onSave({name,role,allMaps:role==="admin"?true:allMaps,mapIds});setEditing(false)}finally{setSaving(false)}};
  const accessNames=member.allMaps?["Todos os mapas"]:maps.filter(map=>member.mapIds.includes(map.id)).map(map=>map.title);
  return <article className={`member-card ${member.status}`}><span className="member-avatar">{member.name.split(" ").map(part=>part[0]).join("").slice(0,2).toUpperCase()}</span><div className="member-main"><div><h3>{member.name}</h3><span className={`member-status ${member.status}`}>{member.status==="active"?"Ativo":"Convite pendente"}</span></div><p>{member.email}</p><div className="member-tags"><b>{roleLabels[member.role]}</b>{accessNames.slice(0,3).map(item=><span key={item}>{item}</span>)}{accessNames.length>3&&<span>＋{accessNames.length-3}</span>}</div></div><div className="member-actions">{member.status==="pending"&&<button onClick={onCopy}>Copiar convite</button>}{canManage&&<button onClick={()=>setEditing(value=>!value)}>{editing?"Cancelar":"Editar acesso"}</button>}</div>{editing&&<div className="member-editor"><label>Nome<input value={name} onChange={event=>setName(event.target.value)}/></label><label>Papel<select value={role} onChange={event=>{const next=event.target.value as Exclude<MemberRole,"owner">;setRole(next);if(next==="admin")setAllMaps(true)}}>{memberRoles.map(item=><option value={item} key={item}>{roleLabels[item]}</option>)}</select></label><label className="editor-all-maps"><input type="checkbox" checked={allMaps} disabled={role==="admin"} onChange={event=>setAllMaps(event.target.checked)}/> Todos os mapas</label>{!allMaps&&<div className="member-map-grid">{maps.map(map=><label key={map.id}><input type="checkbox" checked={mapIds.includes(map.id)} onChange={()=>setMapIds(current=>current.includes(map.id)?current.filter(item=>item!==map.id):[...current,map.id])}/>{map.title}</label>)}</div>}<footer><button className="remove-member" onClick={onRemove}>Remover</button><button className="save-member" disabled={saving||(!allMaps&&mapIds.length===0)} onClick={save}>{saving?"Salvando...":"Salvar permissões"}</button></footer></div>}</article>;
}

export function CommentsThread({comments,members,currentEmail,canComment,canResolve,loading,onCreate,onReact,onResolve,onDelete}:{comments:RichComment[];members:CollaborationMember[];currentEmail:string;canComment:boolean;canResolve:boolean;loading:boolean;onCreate:(content:string,parentId:string|null,mentions:string[])=>Promise<void>;onReact:(id:string,emoji:string)=>Promise<void>;onResolve:(id:string,resolved:boolean)=>Promise<void>;onDelete:(id:string)=>Promise<void>}) {
  const [text,setText]=useState(""),[replyTo,setReplyTo]=useState<RichComment|null>(null),[sending,setSending]=useState(false);
  const {roots,replies}=useMemo(()=>groupCommentThreads(comments),[comments]);
  const mentionable=members.filter(member=>member.email.toLowerCase()!==currentEmail.toLowerCase());
  const submit=async()=>{if(!text.trim())return;setSending(true);try{await onCreate(text.trim(),replyTo?.id||null,mentionedMemberEmails(text,mentionable));setText("");setReplyTo(null)}finally{setSending(false)}};
  const insertMention=(member:CollaborationMember)=>setText(current=>`${current}${current&& !current.endsWith(" ")?" ":""}@${member.name.split(" ")[0]} `);
  return <section className="threaded-comments"><header><div><b>Conversas da etapa</b><span>{comments.length}</span></div><small>Respostas, menções e decisões ficam registradas.</small></header>{loading&&<p className="comments-loading">Carregando conversas...</p>}{!loading&&roots.length===0&&<div className="comments-empty"><span>◌</span><p>Nenhuma conversa ainda. Registre uma decisão, dúvida ou atualização.</p></div>}<div className="comment-threads">{roots.map(comment=><div className={`comment-thread ${comment.resolvedAt?"resolved":""}`} key={comment.id}><CommentCard comment={comment} currentEmail={currentEmail} canResolve={canResolve} onReply={()=>setReplyTo(comment)} onReact={onReact} onResolve={onResolve} onDelete={onDelete}/>{(replies.get(comment.id)||[]).map(reply=><div className="comment-reply" key={reply.id}><CommentCard comment={reply} currentEmail={currentEmail} canResolve={canResolve} onReply={()=>setReplyTo(comment)} onReact={onReact} onResolve={onResolve} onDelete={onDelete}/></div>)}</div>)}</div>{canComment?<div className="rich-comment-box">{replyTo&&<div className="replying-to"><span>Respondendo a <b>{replyTo.authorName}</b></span><button onClick={()=>setReplyTo(null)}>×</button></div>}<textarea value={text} onChange={event=>setText(event.target.value)} placeholder={replyTo?"Escreva sua resposta...":"Escreva um comentário ou mencione alguém com @..."}/>{mentionable.length>0&&<div className="mention-people"><small>Mencionar:</small>{mentionable.slice(0,6).map(member=><button key={member.id} onClick={()=>insertMention(member)}>@{member.name.split(" ")[0]}</button>)}</div>}<footer><span>{text.length}/4000</span><button disabled={sending||!text.trim()} onClick={submit}>{sending?"Enviando...":replyTo?"Responder":"Comentar"}</button></footer></div>:<div className="comment-readonly">Seu perfil pode acompanhar as conversas, mas não pode comentar.</div>}</section>;
}

function CommentCard({comment,currentEmail,canResolve,onReply,onReact,onResolve,onDelete}:{comment:RichComment;currentEmail:string;canResolve:boolean;onReply:()=>void;onReact:(id:string,emoji:string)=>Promise<void>;onResolve:(id:string,resolved:boolean)=>Promise<void>;onDelete:(id:string)=>Promise<void>}) {
  const own=comment.authorEmail.toLowerCase()===currentEmail.toLowerCase();
  const reaction=(emoji:string)=>comment.reactions.find(item=>item.emoji===emoji);
  return <article className="rich-comment"><span className="comment-avatar">{comment.authorName.split(" ").map(part=>part[0]).join("").slice(0,2).toUpperCase()}</span><div><header><b>{comment.authorName}</b><small>{new Date(comment.createdAt).toLocaleString("pt-BR")}{comment.editedAt?" · editado":""}</small>{comment.reviewPinNumber&&<em className="review-pin-label">⌖ Marcação #{comment.reviewPinNumber}</em>}{comment.resolvedAt&&<em>✓ Resolvido</em>}</header><p>{comment.content}</p><div className="comment-toolbar"><button onClick={onReply}>↩ Responder</button>{["👍","✅","👀","💡"].map(emoji=>{const item=reaction(emoji);return <button className={item?.reactedByMe?"active":""} key={emoji} onClick={()=>onReact(comment.id,emoji)}>{emoji}{item&&item.count>0?` ${item.count}`:""}</button>})}{(canResolve||own)&&<button onClick={()=>onResolve(comment.id,!comment.resolvedAt)}>{comment.resolvedAt?"Reabrir":"Resolver"}</button>}{(canResolve||own)&&<button className="comment-delete" onClick={()=>onDelete(comment.id)}>Excluir</button>}</div></div></article>;
}

export function NotificationsPanel({items,loading,onOpen,onReadAll,onClose}:{items:AppNotification[];loading:boolean;onOpen:(item:AppNotification)=>void;onReadAll:()=>void;onClose:()=>void}) {
  return <aside className="notifications-panel"><header><div><b>Notificações</b><span>{items.filter(item=>!item.readAt).length} novas</span></div><button onClick={onClose}>×</button></header><button className="read-all" onClick={onReadAll}>Marcar todas como lidas</button><div>{loading&&<p className="notification-empty">Atualizando...</p>}{!loading&&items.length===0&&<p className="notification-empty">Nenhuma notificação por enquanto.</p>}{items.map(item=><button className={`notification-item ${item.readAt?"":"unread"}`} key={item.id} onClick={()=>onOpen(item)}><span>{item.kind==="mention"?"@":item.kind==="comment_reply"?"↩":"✦"}</span><div><b>{item.message}</b><small>{new Date(item.createdAt).toLocaleString("pt-BR")}</small></div></button>)}</div></aside>;
}
