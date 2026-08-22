function firstForwardedValue(value: string | null) {
  return value?.split(",", 1)[0]?.trim() || "";
}

function validHost(value: string) {
  return /^[a-z0-9.-]+(?::\d{1,5})?$/i.test(value);
}

export function publicOrigin(request: Request) {
  const internalUrl = new URL(request.url);
  const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host"));
  const requestHost = firstForwardedValue(request.headers.get("host"));
  const host = [forwardedHost, requestHost, internalUrl.host].find(validHost) || internalUrl.host;
  const forwardedProtocol = firstForwardedValue(request.headers.get("x-forwarded-proto")).toLowerCase();
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : process.env.NODE_ENV === "production" && !/^localhost(?::|$)/i.test(host)
      ? "https"
      : internalUrl.protocol.replace(":", "");
  return `${protocol}://${host}`;
}
