import postgres from "postgres";

process.env.TZ ||= "UTC";

export type DatabaseRunResult = {
  success: boolean;
  meta: { changes: number; last_row_id: number };
};

type QueryExecutor = postgres.Sql | postgres.TransactionSql;

function databaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) throw new Error("Banco Supabase Postgres não configurado: DATABASE_URL");
  return value;
}

let client: postgres.Sql | null = null;

export function getPostgresClient() {
  if (!client) {
    client = postgres(databaseUrl(), {
      max: Number(process.env.DATABASE_POOL_SIZE || 5),
      idle_timeout: 20,
      connect_timeout: 15,
      prepare: false,
      ssl: "require",
    });
  }
  return client;
}

function postgresPlaceholders(input: string) {
  let index = 0;
  let quoted = false;
  let output = "";

  for (let position = 0; position < input.length; position += 1) {
    const character = input[position];
    if (character === "'" && input[position - 1] !== "\\") {
      if (quoted && input[position + 1] === "'") {
        output += "''";
        position += 1;
        continue;
      }
      quoted = !quoted;
    }
    output += character === "?" && !quoted ? `$${++index}` : character;
  }
  return output;
}

export function translatePostgresCompatibilityQuery(input: string) {
  const trimmed = input.trim();
  if (/^(CREATE\s+(?:TABLE|INDEX)|PRAGMA)\b/i.test(trimmed)) return { sql: trimmed, schemaOnly: true };

  const ignoreConflict = /^INSERT\s+OR\s+IGNORE\s+INTO\b/i.test(trimmed);
  let sql = trimmed
    .replace(/^INSERT\s+OR\s+IGNORE\s+INTO\b/i, "INSERT INTO")
    .replace(/datetime\('now',\s*'-(\d+)\s+minutes?'\)/gi, "(CURRENT_TIMESTAMP - INTERVAL '$1 minutes')")
    .replace(/datetime\('now',\s*'-(\d+)\s+seconds?'\)/gi, "(CURRENT_TIMESTAMP - INTERVAL '$1 seconds')");

  if (ignoreConflict) sql = `${sql.replace(/;$/, "")} ON CONFLICT DO NOTHING`;
  return { sql: postgresPlaceholders(sql), schemaOnly: false };
}

function normalizeRows<T>(rows: T[]) {
  return rows.map(row => {
    if (!row || typeof row !== "object") return row;
    return Object.fromEntries(Object.entries(row).map(([key, value]) => {
      if (value instanceof Date) return [key, value.toISOString()];
      if (typeof value === "bigint") return [key, Number(value)];
      return [key, value];
    })) as T;
  });
}

export class PostgresStatement {
  private values: unknown[] = [];
  private readonly database: PostgresDatabase;
  private readonly source: string;

  constructor(database: PostgresDatabase, source: string) {
    this.database = database;
    this.source = source;
  }

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async all<T = Record<string, unknown>>() {
    const rows = await this.database.execute<T>(this.source, this.values);
    return { results: rows };
  }

  async first<T = Record<string, unknown>>() {
    const rows = await this.database.execute<T>(this.source, this.values);
    return rows[0] ?? null;
  }

  async run() {
    return this.database.executeRun(this.source, this.values);
  }

  executeWith(executor: QueryExecutor) {
    return this.database.executeRun(this.source, this.values, executor);
  }
}

export class PostgresDatabase {
  prepare(sql: string) {
    return new PostgresStatement(this, sql);
  }

  async execute<T>(source: string, values: unknown[], executor: QueryExecutor = getPostgresClient()) {
    const query = translatePostgresCompatibilityQuery(source);
    if (query.schemaOnly) return [] as T[];
    const rows = await executor.unsafe<T[]>(query.sql, values as never[]);
    return normalizeRows(rows as T[]);
  }

  async executeRun(source: string, values: unknown[], executor: QueryExecutor = getPostgresClient()): Promise<DatabaseRunResult> {
    const query = translatePostgresCompatibilityQuery(source);
    if (query.schemaOnly) return { success: true, meta: { changes: 0, last_row_id: 0 } };
    const result = await executor.unsafe(query.sql, values as never[]);
    return { success: true, meta: { changes: result.count ?? 0, last_row_id: 0 } };
  }

  async batch(statements: PostgresStatement[]) {
    return getPostgresClient().begin(async transaction => {
      const results: DatabaseRunResult[] = [];
      for (const statement of statements) results.push(await statement.executeWith(transaction));
      return results;
    });
  }
}

type HostingerEnvironment = {
  DB: PostgresDatabase;
  [key: string]: unknown;
};

const bindings: HostingerEnvironment = { DB: new PostgresDatabase() };

export const env = new Proxy(bindings, {
  get(target, property) {
    if (typeof property !== "string") return Reflect.get(target, property);
    if (property in target) return target[property];
    return process.env[property];
  },
});
