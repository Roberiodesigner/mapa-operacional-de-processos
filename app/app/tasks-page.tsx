"use client";

import { useMemo, useState } from "react";
import { isOperationalTask, taskMatchesFilter, tasksForUser, todayKey, type OperationalTask, type TaskFilter } from "./task-policy";

type TaskMap = { id: string; title: string; archived: boolean };

const filterLabels: Record<TaskFilter, string> = { open: "Em aberto", today: "Hoje", overdue: "Atrasadas", blocked: "Bloqueadas", done: "Concluídas" };

function dateLabel(value: string) {
  if (!value) return "Sem prazo";
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function TasksPage<T extends OperationalTask>({ nodes, maps, user, canManage, canExecute, onOpen, onUpdate }: { nodes: T[]; maps: TaskMap[]; user: { name: string; email: string }; canManage: boolean; canExecute: boolean; onOpen: (task: T) => void; onUpdate: (task: T, progress: number) => void }) {
  const [scope,setScope]=useState<"mine"|"team">("mine"),[filter,setFilter]=useState<TaskFilter>("open"),[search,setSearch]=useState("");
  const today=todayKey();
  const operational=useMemo(()=>nodes.filter(isOperationalTask),[nodes]);
  const mine=useMemo(()=>tasksForUser(nodes,user),[nodes,user]);
  const scoped=scope==="team"&&canManage?operational:mine;
  const visible=scoped.filter(task=>taskMatchesFilter(task,filter,today)&&(!search.trim()||`${task.title} ${task.assignee}`.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")))).sort((a,b)=>Number(b.status==="blocked")-Number(a.status==="blocked")||a.due.localeCompare(b.due));
  const counts=Object.fromEntries((Object.keys(filterLabels) as TaskFilter[]).map(key=>[key,scoped.filter(task=>taskMatchesFilter(task,key,today)).length])) as Record<TaskFilter,number>;
  const dueToday=mine.filter(task=>taskMatchesFilter(task,"today",today)).length,overdue=mine.filter(task=>taskMatchesFilter(task,"overdue",today)).length,blocked=mine.filter(task=>taskMatchesFilter(task,"blocked",today)).length;
  return <main className="tasks-page"><header><div><span>MINHA EXECUÇÃO</span><h1>Minhas tarefas</h1><p>Prioridades, prazos e bloqueios reunidos em uma única central diária.</p></div>{canManage&&<div className="task-scope"><button className={scope==="mine"?"active":""} onClick={()=>setScope("mine")}>Minhas</button><button className={scope==="team"?"active":""} onClick={()=>setScope("team")}>Equipe</button></div>}</header><section className="task-overview"><article><span>◷</span><div><b>{dueToday}</b><small>para hoje</small></div></article><article className={overdue?"danger":""}><span>!</span><div><b>{overdue}</b><small>atrasadas</small></div></article><article className={blocked?"blocked":""}><span>◆</span><div><b>{blocked}</b><small>bloqueadas</small></div></article><aside><b>Foco inteligente</b><p>{overdue?"Comece pelas atrasadas de maior prioridade.":blocked?"Remova os bloqueios antes de iniciar novas tarefas.":dueToday?"Conclua primeiro o que vence hoje.":"Seu fluxo está sob controle. Antecipe a próxima prioridade."}</p></aside></section><section className="task-board"><header><nav>{(Object.keys(filterLabels) as TaskFilter[]).map(key=><button className={filter===key?"active":""} key={key} onClick={()=>setFilter(key)}>{filterLabels[key]} <b>{counts[key]}</b></button>)}</nav><label>⌕<input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar tarefa ou responsável"/></label></header><div className="task-list">{visible.length===0&&<div className="task-empty"><span>✓</span><h3>Nenhuma tarefa aqui</h3><p>Altere o filtro ou verifique as atribuições das etapas.</p></div>}{visible.map(task=>{const map=maps.find(item=>item.id===task.mapId);const late=task.status!=="done"&&Boolean(task.due)&&task.due<today;return <article className={`task-row ${task.status}`} key={task.id} onClick={()=>onOpen(task)}><span className={`task-check ${task.status}`}>{task.status==="done"?"✓":task.status==="blocked"?"!":""}</span><div className="task-main"><div><small>{map?.title||"Mapa"}</small><h3>{task.title}</h3></div><div className="task-tags"><span className={`priority ${task.priority.toLocaleLowerCase("pt-BR")}`}>{task.priority}</span><span>{task.assignee||"Sem responsável"}</span><span className={late?"late":""}>{late?"Atrasada · ":""}{dateLabel(task.due)}</span></div></div><div className="task-progress"><b>{task.progress}%</b><i><em style={{width:`${task.progress}%`}}/></i>{canExecute&&task.status!=="done"&&<div>{[25,50,75,100].map(value=><button key={value} title={`Marcar ${value}%`} onClick={event=>{event.stopPropagation();onUpdate(task,value)}}>{value===100?"✓":value}</button>)}</div>}</div><button className="task-open" onClick={event=>{event.stopPropagation();onOpen(task)}}>Abrir etapa →</button></article>})}</div></section></main>;
}
