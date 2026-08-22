"use client";

export type LivePresence = {
  email: string;
  name: string;
  mapId: string;
  nodeId: string;
  lastSeenAt: string;
};

function initials(name: string) {
  return name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
}

export function PresenceStrip({ people, currentEmail }: { people: LivePresence[]; currentEmail: string }) {
  const ordered = [...people].sort((a, b) => Number(a.email.toLowerCase() !== currentEmail.toLowerCase()) - Number(b.email.toLowerCase() !== currentEmail.toLowerCase()));
  return <div className="live-presence" title={`${ordered.length} pessoa(s) neste mapa`}><span className="live-label"><i/>AO VIVO</span><div className="presence-avatars">{ordered.slice(0, 5).map(person=><span className={person.email.toLowerCase()===currentEmail.toLowerCase()?"me":""} key={person.email} title={`${person.name}${person.nodeId?" está em uma etapa":" está neste mapa"}`}>{initials(person.name)}</span>)}{ordered.length>5&&<b>+{ordered.length-5}</b>}</div><small>{ordered.length===0?"Conectando...":ordered.length===1?"Só você":`${ordered.length} no mapa`}</small></div>;
}

export function SyncConflictBanner({ onLoadRemote, onKeepLocal, busy }: { onLoadRemote: () => void; onKeepLocal: () => void; busy: boolean }) {
  return <aside className="sync-conflict" role="alert"><span>⇄</span><div><b>Duas pessoas alteraram este mapa</b><p>Seu trabalho ficou preservado neste navegador. Escolha qual versão deve continuar.</p></div><button disabled={busy} onClick={onLoadRemote}>Usar versão da equipe</button><button className="keep-local" disabled={busy} onClick={onKeepLocal}>{busy?"Sincronizando...":"Manter minhas alterações"}</button></aside>;
}
