export type ApprovalStatus = "pending" | "approved" | "changes_requested" | "cancelled";

export function completionBlockReason(
  node: { evidenceRequired?: boolean; evidence?: string; approvalRequired?: boolean },
  latestApprovalStatus?: ApprovalStatus,
) {
  if (node.evidenceRequired && !node.evidence?.trim()) return "Anexe uma evidência ou informe um link antes de concluir.";
  if (node.approvalRequired && latestApprovalStatus !== "approved") {
    if (latestApprovalStatus === "pending") return "A etapa está aguardando aprovação.";
    if (latestApprovalStatus === "changes_requested") return "As alterações solicitadas precisam ser resolvidas e reenviadas.";
    return "Solicite e receba a aprovação antes de concluir.";
  }
  return null;
}

export function approvalStatusLabel(status: ApprovalStatus) {
  return { pending: "Aguardando aprovação", approved: "Aprovado", changes_requested: "Alterações solicitadas", cancelled: "Cancelado" }[status];
}
