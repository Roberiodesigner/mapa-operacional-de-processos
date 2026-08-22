import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import mysql from "mysql2/promise";

const required = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];
const missing = required.filter(key => !process.env[key]?.trim());
if (missing.length) {
  console.error(`Banco MySQL não configurado: ${missing.join(", ")}`);
  process.exit(1);
}

const directory = path.dirname(fileURLToPath(import.meta.url));
const sql = await readFile(path.join(directory, "..", "mysql", "0000_hostinger.sql"), "utf8");
const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === "true" ? {} : undefined,
  multipleStatements: true,
  charset: "utf8mb4",
  timezone: "Z",
});

try {
  await connection.query(sql);
  console.log("Migração MySQL concluída.");
} finally {
  await connection.end();
}
