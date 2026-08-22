import { env } from "cloudflare:workers";
import { reviewLinkIsUsable } from "../../app/review-policy";

export type ReviewLinkRow = {
  id: string;
  workspace_id: string;
  map_id: string;
  root_node_id: string;
  label: string;
  token_hash: string;
  status: string;
  allow_comments: number;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  last_accessed_at: string | null;
  revoked_at: string | null;
};

export async function ensureReviewSchema() {
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS review_link_records (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, map_id TEXT NOT NULL, root_node_id TEXT NOT NULL DEFAULT '', label TEXT NOT NULL DEFAULT '', token_hash TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'active', allow_comments INTEGER NOT NULL DEFAULT 1, expires_at TEXT, created_by TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_accessed_at TEXT, revoked_at TEXT)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS review_links_workspace_map_idx ON review_link_records(workspace_id, map_id, status, created_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS review_links_token_hash_idx ON review_link_records(token_hash)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS review_comment_markers (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, review_link_id TEXT NOT NULL REFERENCES review_link_records(id) ON DELETE CASCADE, comment_id TEXT NOT NULL UNIQUE, map_id TEXT NOT NULL, node_id TEXT NOT NULL DEFAULT '', pin_type TEXT NOT NULL DEFAULT 'node', pin_x REAL NOT NULL DEFAULT 0.5, pin_y REAL NOT NULL DEFAULT 0.5, pin_number INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS review_markers_link_idx ON review_comment_markers(review_link_id, pin_number)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS review_markers_workspace_map_idx ON review_comment_markers(workspace_id, map_id, created_at)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS review_rate_limit_records (rate_key TEXT PRIMARY KEY NOT NULL, window_started_at TEXT NOT NULL, request_count INTEGER NOT NULL DEFAULT 0)"),
  ]);
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

export function createReviewToken() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashReviewToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return bytesToHex(new Uint8Array(digest));
}

export function validReviewToken(token: string) {
  return /^[a-f0-9]{64}$/.test(token);
}

export async function reviewLinkForToken(token: string) {
  if (!validReviewToken(token)) return null;
  await ensureReviewSchema();
  const tokenHash = await hashReviewToken(token);
  const link = await env.DB.prepare("SELECT * FROM review_link_records WHERE token_hash = ? LIMIT 1")
    .bind(tokenHash).first<ReviewLinkRow>();
  if (!link) return null;
  return { link, usable: reviewLinkIsUsable(link.status, link.expires_at) };
}

export async function enforceReviewRateLimit(tokenHash: string, request: Request) {
  const address = request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || "anonymous";
  const rateKey = await hashReviewToken(`${tokenHash}:${address}`);
  const existing = await env.DB.prepare("SELECT window_started_at, request_count FROM review_rate_limit_records WHERE rate_key = ? LIMIT 1")
    .bind(rateKey).first<{ window_started_at: string; request_count: number }>();
  const now = new Date(), windowMs = 10 * 60 * 1000;
  if (!existing || now.getTime() - new Date(existing.window_started_at).getTime() >= windowMs) {
    await env.DB.prepare("INSERT INTO review_rate_limit_records (rate_key, window_started_at, request_count) VALUES (?, ?, 1) ON CONFLICT(rate_key) DO UPDATE SET window_started_at = excluded.window_started_at, request_count = 1")
      .bind(rateKey, now.toISOString()).run();
    return true;
  }
  if (existing.request_count >= 20) return false;
  await env.DB.prepare("UPDATE review_rate_limit_records SET request_count = request_count + 1 WHERE rate_key = ?")
    .bind(rateKey).run();
  return true;
}
