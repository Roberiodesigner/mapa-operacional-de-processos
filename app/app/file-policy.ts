export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FILES_PER_NODE = 25;

const allowedExtensions = new Set(["pdf", "doc", "docx", "xls", "xlsx", "csv", "txt", "png", "jpg", "jpeg", "webp", "zip"]);
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/zip",
  "application/x-zip-compressed",
]);

export function fileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function sanitizeFileName(fileName: string) {
  const normalized = fileName.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const safe = normalized.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/-\./g, ".").replace(/^-|-$/g, "");
  return (safe || "arquivo").slice(-140);
}

export function validateUpload(file: { name: string; size: number; type: string }) {
  if (!file.name.trim()) return "O arquivo precisa ter um nome.";
  if (file.size <= 0) return "O arquivo está vazio.";
  if (file.size > MAX_FILE_BYTES) return "O arquivo excede o limite de 10 MB.";
  const extension = fileExtension(file.name);
  if (!allowedExtensions.has(extension)) return "Extensão não permitida. Use PDF, Office, CSV, TXT, PNG, JPG, WEBP ou ZIP.";
  if (file.type && !allowedMimeTypes.has(file.type)) return "O tipo deste arquivo não é permitido.";
  return null;
}

export function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;
  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}
