export type BillingInterval = "month" | "year";
export type CommercialStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "suspended"
  | "expired"
  | "incomplete";

export type CommercialPlan = {
  code: string;
  name: string;
  priceCents: number;
  interval: BillingInterval;
  description: string;
};

export const DEFAULT_COMMERCIAL_PLANS: CommercialPlan[] = [
  {
    code: "monthly",
    name: "Mensal",
    priceCents: 500,
    interval: "month",
    description: "Flexibilidade para organizar e executar sem fidelidade.",
  },
  {
    code: "annual",
    name: "Anual",
    priceCents: 4900,
    interval: "year",
    description: "Um ano completo com o melhor custo-benefício.",
  },
];

export type EntitlementInput = {
  workspacePlan: string;
  trialEndsAt: string;
  licenseStatus?: string | null;
  currentPeriodEndsAt?: string | null;
  now?: Date;
};

export type WorkspaceEntitlement = {
  status: CommercialStatus;
  planCode: string;
  canEdit: boolean;
  readOnly: boolean;
  daysRemaining: number;
  message: string;
};

function validFutureDate(value: string | null | undefined, now: Date) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time > now.getTime() ? time : null;
}

export function deriveWorkspaceEntitlement(input: EntitlementInput): WorkspaceEntitlement {
  const now = input.now ?? new Date();
  const planCode = input.workspacePlan || "trial";
  const status = (input.licenseStatus || (planCode === "trial" ? "trialing" : "active")) as CommercialStatus;
  const trialEnd = validFutureDate(input.trialEndsAt, now);
  const periodEnd = validFutureDate(input.currentPeriodEndsAt, now);

  if (status === "trialing" && trialEnd) {
    return {
      status,
      planCode: "trial",
      canEdit: true,
      readOnly: false,
      daysRemaining: Math.max(1, Math.ceil((trialEnd - now.getTime()) / 86_400_000)),
      message: "Período de teste ativo.",
    };
  }

  if (status === "active" && (!input.currentPeriodEndsAt || periodEnd)) {
    return {
      status,
      planCode,
      canEdit: true,
      readOnly: false,
      daysRemaining: periodEnd ? Math.max(1, Math.ceil((periodEnd - now.getTime()) / 86_400_000)) : 0,
      message: "Licença ativa.",
    };
  }

  const normalizedStatus: CommercialStatus = status === "trialing" || (status === "active" && input.currentPeriodEndsAt)
    ? "expired"
    : status;
  const messages: Record<CommercialStatus, string> = {
    trialing: "Período de teste ativo.",
    active: "Licença ativa.",
    past_due: "Pagamento pendente. Os dados permanecem disponíveis para leitura.",
    canceled: "Assinatura cancelada. Os dados permanecem disponíveis para leitura.",
    suspended: "Licença suspensa pelo administrador da plataforma.",
    expired: "Período encerrado. Escolha um plano para voltar a editar.",
    incomplete: "Assinatura aguardando confirmação do pagamento.",
  };

  return {
    status: normalizedStatus,
    planCode,
    canEdit: false,
    readOnly: true,
    daysRemaining: 0,
    message: messages[normalizedStatus],
  };
}

export function formatPlanPrice(priceCents: number) {
  return (Math.max(0, priceCents) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function normalizeCommercialStatus(value: unknown): CommercialStatus | null {
  const allowed: CommercialStatus[] = ["trialing", "active", "past_due", "canceled", "suspended", "expired", "incomplete"];
  return typeof value === "string" && allowed.includes(value as CommercialStatus)
    ? value as CommercialStatus
    : null;
}
