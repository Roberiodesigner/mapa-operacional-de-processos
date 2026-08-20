import assert from "node:assert/strict";
import test from "node:test";
import { MAX_FILE_BYTES, formatFileSize, sanitizeFileName, validateUpload } from "../app/app/file-policy.ts";

test("política aceita formatos operacionais seguros", () => {
  assert.equal(validateUpload({ name: "evidencia.pdf", size: 250_000, type: "application/pdf" }), null);
  assert.equal(validateUpload({ name: "foto execução.JPG", size: 800_000, type: "image/jpeg" }), null);
  assert.equal(sanitizeFileName("Relatório final (aprovado).pdf"), "Relatorio-final-aprovado.pdf");
});

test("política bloqueia extensões perigosas e arquivos grandes", () => {
  assert.match(validateUpload({ name: "programa.exe", size: 100, type: "application/octet-stream" }), /Extensão não permitida/);
  assert.match(validateUpload({ name: "grande.pdf", size: MAX_FILE_BYTES + 1, type: "application/pdf" }), /10 MB/);
  assert.equal(formatFileSize(1024 * 1024), "1.0 MB");
});
