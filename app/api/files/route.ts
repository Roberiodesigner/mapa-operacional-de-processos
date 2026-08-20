import { env } from "cloudflare:workers";
import { MAX_FILES_PER_NODE, sanitizeFileName, validateUpload } from "../../app/file-policy";
import { canAccessMap, canWorkspace, getWorkspaceAccessContext, nodeBelongsToAccessibleMap } from "../_lib/collaboration";

type FileRow = {
  id: string;
  workspace_id: string;
  map_id: string;
  node_id: string;
  object_key: string;
  file_name: string;
  content_type: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
};

async function ensureFileSchema() {
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS node_file_records (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, map_id TEXT NOT NULL, node_id TEXT NOT NULL, object_key TEXT NOT NULL UNIQUE, file_name TEXT NOT NULL, content_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, uploaded_by TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS audit_log_records (id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, actor_email TEXT NOT NULL, action TEXT NOT NULL, resource_type TEXT NOT NULL, resource_id TEXT NOT NULL, details TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS node_files_workspace_node_idx ON node_file_records(workspace_id, node_id)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS node_files_workspace_map_idx ON node_file_records(workspace_id, map_id)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS audit_workspace_created_idx ON audit_log_records(workspace_id, created_at)"),
  ]);
}

async function context() {
  await ensureFileSchema();
  return getWorkspaceAccessContext();
}

function publicFile(row: FileRow) {
  return { id: row.id, mapId: row.map_id, nodeId: row.node_id, name: row.file_name, type: row.content_type, size: row.size_bytes, uploadedBy: row.uploaded_by, createdAt: row.created_at };
}

export async function GET(request: Request) {
  const current = await context();
  if (!current) return Response.json({ error: "Autenticação necessária" }, { status: 401 });
  const url = new URL(request.url);
  const fileId = url.searchParams.get("fileId");
  if (fileId) {
    const row = await env.DB.prepare("SELECT * FROM node_file_records WHERE id = ? AND workspace_id = ? LIMIT 1").bind(fileId, current.workspace.id).first<FileRow>();
    if (!row) return Response.json({ error: "Arquivo não encontrado" }, { status: 404 });
    if (!await canAccessMap(current, row.map_id, "view")) return Response.json({ error: "Sem acesso a este arquivo" }, { status: 403 });
    const object = await env.BUCKET.get(row.object_key);
    if (!object) return Response.json({ error: "Conteúdo do arquivo indisponível" }, { status: 404 });
    const downloadName = row.file_name.replace(/["\r\n]/g, "");
    return new Response(object.body, { headers: { "content-type": row.content_type, "content-length": String(row.size_bytes), "content-disposition": `attachment; filename="${downloadName}"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
  }
  const nodeId = url.searchParams.get("nodeId");
  if (!nodeId) return Response.json({ error: "Etapa não informada" }, { status: 400 });
  const node = await env.DB.prepare("SELECT map_id FROM node_records WHERE workspace_id = ? AND node_id = ? LIMIT 1").bind(current.workspace.id, nodeId).first<{ map_id: string }>();
  if (!node || !await canAccessMap(current, node.map_id, "view")) return Response.json({ error: "Etapa não encontrada ou sem acesso" }, { status: 403 });
  const result = await env.DB.prepare("SELECT * FROM node_file_records WHERE workspace_id = ? AND node_id = ? ORDER BY created_at DESC LIMIT 50").bind(current.workspace.id, nodeId).all<FileRow>();
  return Response.json({ files: result.results.map(publicFile) }, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  const current = await context();
  if (!current) return Response.json({ error: "Autenticação necessária" }, { status: 401 });
  const form = await request.formData();
  const nodeId = String(form.get("nodeId") || "");
  const mapId = String(form.get("mapId") || "");
  const file = form.get("file");
  if (!nodeId || !mapId || !(file instanceof File)) return Response.json({ error: "Arquivo, mapa e etapa são obrigatórios" }, { status: 400 });
  if (!(await nodeBelongsToAccessibleMap(current, nodeId, mapId, "execute"))) return Response.json({ error: "Etapa não encontrada ou sem permissão para enviar arquivos" }, { status: 403 });
  const validationError = validateUpload(file);
  if (validationError) return Response.json({ error: validationError }, { status: 400 });
  const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM node_file_records WHERE workspace_id = ? AND node_id = ?").bind(current.workspace.id, nodeId).first<{ total: number }>();
  if ((count?.total ?? 0) >= MAX_FILES_PER_NODE) return Response.json({ error: `Limite de ${MAX_FILES_PER_NODE} arquivos por etapa atingido` }, { status: 409 });
  const id = crypto.randomUUID();
  const safeName = sanitizeFileName(file.name);
  const objectKey = `${current.workspace.id}/${mapId}/${nodeId}/${id}-${safeName}`;
  await env.BUCKET.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" }, customMetadata: { workspaceId: current.workspace.id, nodeId, uploadedBy: current.user.email } });
  try {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO node_file_records (id, workspace_id, map_id, node_id, object_key, file_name, content_type, size_bytes, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, current.workspace.id, mapId, nodeId, objectKey, file.name.slice(0, 240), file.type || "application/octet-stream", file.size, current.user.email),
      env.DB.prepare("INSERT INTO audit_log_records (id, workspace_id, actor_email, action, resource_type, resource_id, details) VALUES (?, ?, ?, 'file_uploaded', 'node', ?, ?)").bind(crypto.randomUUID(), current.workspace.id, current.user.email, nodeId, JSON.stringify({ fileId: id, fileName: file.name, size: file.size })),
    ]);
  } catch (error) {
    await env.BUCKET.delete(objectKey);
    throw error;
  }
  const row = await env.DB.prepare("SELECT * FROM node_file_records WHERE id = ? AND workspace_id = ?").bind(id, current.workspace.id).first<FileRow>();
  return Response.json({ file: row ? publicFile(row) : null }, { status: 201 });
}

export async function DELETE(request: Request) {
  const current = await context();
  if (!current) return Response.json({ error: "Autenticação necessária" }, { status: 401 });
  const fileId = new URL(request.url).searchParams.get("fileId");
  if (!fileId) return Response.json({ error: "Arquivo não informado" }, { status: 400 });
  const row = await env.DB.prepare("SELECT * FROM node_file_records WHERE id = ? AND workspace_id = ? LIMIT 1").bind(fileId, current.workspace.id).first<FileRow>();
  if (!row) return Response.json({ error: "Arquivo não encontrado" }, { status: 404 });
  if (!await canAccessMap(current, row.map_id, "view") || (row.uploaded_by.toLowerCase() !== current.user.email.toLowerCase() && !canWorkspace(current, "edit"))) return Response.json({ error: "Sem permissão para excluir este arquivo" }, { status: 403 });
  await env.BUCKET.delete(row.object_key);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM node_file_records WHERE id = ? AND workspace_id = ?").bind(fileId, current.workspace.id),
    env.DB.prepare("INSERT INTO audit_log_records (id, workspace_id, actor_email, action, resource_type, resource_id, details) VALUES (?, ?, ?, 'file_deleted', 'node', ?, ?)").bind(crypto.randomUUID(), current.workspace.id, current.user.email, row.node_id, JSON.stringify({ fileId, fileName: row.file_name })),
  ]);
  return Response.json({ ok: true });
}
