import { promises as fs } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createPool, type Pool, type PoolConnection, type ResultSetHeader } from "mysql2/promise";

process.env.TZ ||= "UTC";

type QueryExecutor = Pick<Pool | PoolConnection, "execute">;

export type D1RunResult = {
  success: boolean;
  meta: { changes: number; last_row_id: number };
};

function databaseConfig() {
  const required = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"] as const;
  const missing = required.filter(key => !process.env[key]?.trim());
  if (missing.length) throw new Error(`Banco MySQL não configurado: ${missing.join(", ")}`);
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === "true" ? {} : undefined,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true as const,
    charset: "utf8mb4",
    timezone: "Z",
    multipleStatements: true,
  };
}

let pool: Pool | null = null;
let schemaMigration: Promise<void> | null = null;

export function getMysqlPool() {
  if (!pool) pool = createPool(databaseConfig());
  return pool;
}

export function ensureHostingerDatabaseSchema() {
  if (schemaMigration) return schemaMigration;
  schemaMigration = (async () => {
    const migrationPath = path.join(process.cwd(), "mysql", "0000_hostinger.sql");
    const sql = await fs.readFile(migrationPath, "utf8");
    await getMysqlPool().query(sql);
  })().catch(error => {
    schemaMigration = null;
    throw error;
  });
  return schemaMigration;
}

function normalizeParameter(value: unknown) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) {
    return value.replace("T", " ").replace("Z", "");
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
}

export function translateSqliteQuery(input: string) {
  const trimmed = input.trim();
  if (/^(CREATE\s+(?:TABLE|INDEX)|PRAGMA)\b/i.test(trimmed)) return { sql: trimmed, schemaOnly: true };
  let sql = trimmed
    .replace(/^INSERT\s+OR\s+IGNORE\s+INTO\b/i, "INSERT IGNORE INTO")
    .replace(/datetime\('now',\s*'-(\d+)\s+minutes?'\)/gi, "DATE_SUB(CURRENT_TIMESTAMP, INTERVAL $1 MINUTE)")
    .replace(/datetime\('now',\s*'-(\d+)\s+seconds?'\)/gi, "DATE_SUB(CURRENT_TIMESTAMP, INTERVAL $1 SECOND)");

  const conflict = sql.match(/\s+ON\s+CONFLICT\s*\([^)]+\)\s+DO\s+UPDATE\s+SET\s+([\s\S]+)$/i);
  if (conflict) {
    const assignments = conflict[1].replace(/excluded\.([a-z_]+)/gi, "VALUES($1)");
    sql = `${sql.slice(0, conflict.index)} ON DUPLICATE KEY UPDATE ${assignments}`;
  }
  return { sql, schemaOnly: false };
}

export class MysqlD1Statement {
  private values: unknown[] = [];
  private readonly database: MysqlD1Database;
  private readonly source: string;

  constructor(database: MysqlD1Database, source: string) {
    this.database = database;
    this.source = source;
  }

  bind(...values: unknown[]) {
    this.values = values.map(normalizeParameter);
    return this;
  }

  async all<T = Record<string, unknown>>() {
    const rows = await this.database.execute<T[]>(this.source, this.values);
    return { results: rows };
  }

  async first<T = Record<string, unknown>>() {
    const rows = await this.database.execute<T[]>(this.source, this.values);
    return rows[0] ?? null;
  }

  async run() {
    return this.database.executeRun(this.source, this.values);
  }

  executeWith(executor: QueryExecutor) {
    return this.database.executeRun(this.source, this.values, executor);
  }
}

export class MysqlD1Database {
  prepare(sql: string) {
    return new MysqlD1Statement(this, sql);
  }

  async execute<T>(source: string, values: unknown[], executor: QueryExecutor = getMysqlPool()) {
    const query = translateSqliteQuery(source);
    if (query.schemaOnly) return [] as T;
    const [rows] = await executor.execute(query.sql, values);
    return rows as T;
  }

  async executeRun(source: string, values: unknown[], executor: QueryExecutor = getMysqlPool()): Promise<D1RunResult> {
    const query = translateSqliteQuery(source);
    if (query.schemaOnly) return { success: true, meta: { changes: 0, last_row_id: 0 } };
    const [result] = await executor.execute(query.sql, values);
    const header = result as ResultSetHeader;
    return { success: true, meta: { changes: header.affectedRows ?? 0, last_row_id: header.insertId ?? 0 } };
  }

  async batch(statements: MysqlD1Statement[]) {
    const connection = await getMysqlPool().getConnection();
    try {
      await connection.beginTransaction();
      const results: D1RunResult[] = [];
      for (const statement of statements) results.push(await statement.executeWith(connection));
      await connection.commit();
      return results;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

type BucketObject = { body: ArrayBuffer };
type BucketPutOptions = { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> };

export class PrivateFileBucket {
  private basePath() {
    const configured = process.env.PRIVATE_UPLOADS_PATH?.trim();
    if (process.env.NODE_ENV === "production" && !configured) {
      throw new Error("PRIVATE_UPLOADS_PATH precisa apontar para uma pasta privada e persistente");
    }
    return path.resolve(/* turbopackIgnore: true */ configured || ".private-uploads");
  }

  private resolveKey(key: string) {
    if (!key || key.includes("\0") || key.split(/[\\/]/).includes("..")) throw new Error("Chave de arquivo inválida");
    const base = this.basePath();
    const target = path.resolve(base, key.replace(/^[/\\]+/, ""));
    if (target !== base && !target.startsWith(`${base}${path.sep}`)) throw new Error("Chave de arquivo fora da pasta privada");
    return target;
  }

  async get(key: string): Promise<BucketObject | null> {
    try {
      const data = await fs.readFile(this.resolveKey(key));
      return { body: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async put(key: string, body: ReadableStream<Uint8Array>, options?: BucketPutOptions) {
    void options;
    const target = this.resolveKey(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    const file = await fs.open(target, "w");
    await pipeline(Readable.fromWeb(body as never), file.createWriteStream());
  }

  async delete(key: string) {
    try {
      await fs.unlink(this.resolveKey(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}

type HostingerEnvironment = {
  DB: MysqlD1Database;
  BUCKET: PrivateFileBucket;
  [key: string]: unknown;
};

const bindings: HostingerEnvironment = { DB: new MysqlD1Database(), BUCKET: new PrivateFileBucket() };

export const env = new Proxy(bindings, {
  get(target, property) {
    if (typeof property !== "string") return Reflect.get(target, property);
    if (property in target) return target[property];
    return process.env[property];
  },
});
