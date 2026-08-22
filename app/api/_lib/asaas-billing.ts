import { asaasEnvironment, runtimeValue } from "./commercial";

type AsaasRequestOptions = { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: Record<string, unknown> };

export function asaasBaseUrl() {
  return asaasEnvironment() === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
}

export async function asaasRequest<T extends Record<string, unknown>>(path: string, options: AsaasRequestOptions = {}) {
  const apiKey = runtimeValue("ASAAS_API_KEY");
  if (!apiKey) throw new Error("A chave da API Asaas ainda não foi configurada");
  const response = await fetch(`${asaasBaseUrl()}${path}`, {
    method: options.method || "GET",
    headers: {
      "content-type": "application/json",
      "user-agent": `MapaOperacional/1.0 (${asaasEnvironment()})`,
      access_token: apiKey,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => ({})) as T & { errors?: Array<{ description?: string }>; message?: string };
  if (!response.ok) throw new Error(data.errors?.map(item => item.description).filter(Boolean).join("; ") || data.message || "O Asaas não aceitou a solicitação");
  return data;
}

export function asaasCheckoutUrl(id: string) {
  return `https://asaas.com/checkoutSession/show?id=${encodeURIComponent(id)}`;
}

export function asaasExternalReference(workspaceId: string, planCode: string) {
  return `mo:${workspaceId}:${planCode}`;
}

export function parseAsaasExternalReference(value: unknown) {
  const match = /^mo:([0-9a-f-]{20,80}):([a-z0-9-]{2,40})$/i.exec(String(value || ""));
  return match ? { workspaceId: match[1], planCode: match[2].toLowerCase() } : null;
}

export function safeTokenEqual(received: string, expected: string) {
  if (!received || received.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= received.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
}

export function periodEnd(interval: string, from = new Date()) {
  const end = new Date(from);
  if (interval === "year") end.setUTCFullYear(end.getUTCFullYear() + 1);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  return end.toISOString();
}
