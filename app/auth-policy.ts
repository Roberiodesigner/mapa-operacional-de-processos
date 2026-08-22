export type AuthArea = "customer" | "admin";

export function safeReturnTo(value: unknown, fallback = "/app") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const url = new URL(value, "https://mapa-operacional.local");
    if (url.origin !== "https://mapa-operacional.local") return fallback;
    if (url.pathname.startsWith("/admin") && fallback !== "/admin") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export function validPassword(value: unknown) {
  return typeof value === "string" && value.length >= 8 && value.length <= 128;
}

export function authErrorMessage(area: AuthArea) {
  return area === "admin"
    ? "Não foi possível autorizar este acesso."
    : "E-mail ou senha inválidos.";
}
