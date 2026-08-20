export const memberRoles = ["admin", "editor", "executor", "commenter", "viewer"] as const;

export type MemberRole = "owner" | (typeof memberRoles)[number];
export type CollaborationAction = "manage_members" | "edit" | "execute" | "comment" | "view" | "approve";

export const roleLabels: Record<MemberRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  editor: "Editor",
  executor: "Executor",
  commenter: "Comentarista",
  viewer: "Visualizador",
};

const capabilities: Record<MemberRole, CollaborationAction[]> = {
  owner: ["manage_members", "edit", "execute", "comment", "view", "approve"],
  admin: ["manage_members", "edit", "execute", "comment", "view", "approve"],
  editor: ["edit", "execute", "comment", "view", "approve"],
  executor: ["execute", "comment", "view"],
  commenter: ["comment", "view", "approve"],
  viewer: ["view"],
};

export function normalizeMemberRole(value: unknown): Exclude<MemberRole, "owner"> {
  return memberRoles.includes(value as Exclude<MemberRole, "owner">)
    ? value as Exclude<MemberRole, "owner">
    : "viewer";
}

export function roleCan(role: MemberRole, action: CollaborationAction) {
  return capabilities[role].includes(action);
}

export function permissionSummary(role: MemberRole) {
  if (role === "owner") return "Controle total do Workspace";
  if (role === "admin") return "Gerencia equipe, mapas e aprovações";
  if (role === "editor") return "Cria e edita mapas autorizados";
  if (role === "executor") return "Executa etapas e envia evidências";
  if (role === "commenter") return "Comenta e participa de revisões";
  return "Apenas visualiza os mapas autorizados";
}

export type ThreadComment = {
  id: string;
  parentId: string | null;
  resolvedAt: string | null;
};

export function groupCommentThreads<T extends ThreadComment>(comments: T[]) {
  const replies = new Map<string, T[]>();
  const roots: T[] = [];
  comments.forEach(comment => {
    if (!comment.parentId) roots.push(comment);
    else replies.set(comment.parentId, [...(replies.get(comment.parentId) ?? []), comment]);
  });
  return { roots, replies };
}

export function mentionedMemberEmails(content: string, members: { name: string; email: string }[]) {
  const normalized = content.toLocaleLowerCase("pt-BR");
  return members
    .filter(member => {
      const emailToken = `@${member.email.toLocaleLowerCase("pt-BR")}`;
      const nameToken = `@${member.name.trim().split(/\s+/)[0]?.toLocaleLowerCase("pt-BR")}`;
      return normalized.includes(emailToken) || (nameToken.length > 1 && normalized.includes(nameToken));
    })
    .map(member => member.email.toLocaleLowerCase("pt-BR"));
}
