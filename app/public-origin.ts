function firstForwardedValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || "";
}

function validHost(value: string) {
  return /^[a-z0-9.-]+(?::\d{1,5})?$/i.test(value);
}

function safeUrlHost(value: string) {
  try {
    return new URL(value).host;
  } catch {
    return "";
  }
}

function safeUrlProtocol(value: string) {
  try {
    return new URL(value).protocol.replace(":", "");
  } catch {
    return "";
  }
}

export function publicOrigin(request: Request) {
  const internalHost = safeUrlHost(request.url);
  const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host"));
  const requestHost = firstForwardedValue(request.headers.get("host"));
  const host = [forwardedHost, requestHost, internalHost].find(validHost) || "localhost:3000";
  const forwardedProtocol = firstForwardedValue(request.headers.get("x-forwarded-proto")).toLowerCase();
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : process.env.NODE_ENV === "production" && !/^localhost(?::|$)/i.test(host)
      ? "https"
      : safeUrlProtocol(request.url) || "http";
  return `${protocol}://${host}`;
}
