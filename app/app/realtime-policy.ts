export type RemoteSyncDecision = "noop" | "refresh" | "defer";

export function remoteSyncDecision(localVersion: number, remoteVersion: number, dirty: boolean, hasConflict: boolean): RemoteSyncDecision {
  if (!Number.isFinite(remoteVersion) || remoteVersion <= localVersion) return "noop";
  if (dirty || hasConflict) return "defer";
  return "refresh";
}

export function presenceIsActive(lastSeenAt: string, now = Date.now(), ttlMs = 45_000) {
  const seen = new Date(lastSeenAt).getTime();
  return Number.isFinite(seen) && now - seen <= ttlMs;
}
