/**
 * Client de base de dades (SQLite integrat a Node, `node:sqlite`).
 * - Un sol fitxer: data/scoutup-demo.db (configurable amb SCOUTUP_DB).
 * - Si la base de dades és buida o d'una versió d'esquema anterior, es crea i es carrega el seed de demo.
 * Sense àlies: també el fa servir scripts/seed.ts.
 */
import "./silence.ts";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { SCHEMA_SQL, SCHEMA_VERSION, TABLES_IN_DROP_ORDER } from "./schema.ts";
import { seedDemo } from "../../../seed/demo-data/index.ts";

export type Row = Record<string, unknown>;
type Param = string | number | bigint | null | Uint8Array;

const g = globalThis as unknown as { __scoutupDb?: DatabaseSync };

export function dbPath(): string {
  return process.env.SCOUTUP_DB || path.join(process.cwd(), "data", "scoutup-demo.db");
}

function open(): DatabaseSync {
  const file = dbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA_SQL);
  const v = db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get() as { value?: string } | undefined;
  const hasData = (db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n > 0;
  if (!hasData || v?.value !== String(SCHEMA_VERSION)) {
    resetDatabase(db);
  }
  return db;
}

export function db(): DatabaseSync {
  if (!g.__scoutupDb) g.__scoutupDb = open();
  return g.__scoutupDb;
}

/** Esborra totes les taules, torna a crear l'esquema i carrega les dades de demostració. */
export function resetDatabase(database: DatabaseSync = db()): { ms: number } {
  const t0 = Date.now();
  database.exec("PRAGMA foreign_keys = OFF;");
  for (const t of TABLES_IN_DROP_ORDER) database.exec(`DROP TABLE IF EXISTS ${t};`);
  database.exec(SCHEMA_SQL);
  database.exec("PRAGMA foreign_keys = OFF;");
  database.exec("BEGIN");
  try {
    seedDemo(database, new Date());
    database.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)").run(String(SCHEMA_VERSION));
    database.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('seeded_at', ?)").run(new Date().toISOString());
    database.exec("COMMIT");
  } catch (e) {
    database.exec("ROLLBACK");
    throw e;
  }
  database.exec("PRAGMA foreign_keys = ON;");
  return { ms: Date.now() - t0 };
}

function clean(params: unknown[]): Param[] {
  return params.map((p) => {
    if (p === undefined) return null;
    if (typeof p === "boolean") return p ? 1 : 0;
    if (p instanceof Date) return p.toISOString();
    if (typeof p === "object" && p !== null && !(p instanceof Uint8Array)) return JSON.stringify(p);
    return p as Param;
  });
}

export function all<T = Row>(sql: string, ...params: unknown[]): T[] {
  return db().prepare(sql).all(...clean(params)).map((r) => ({ ...(r as object) })) as T[];
}
export function get<T = Row>(sql: string, ...params: unknown[]): T | undefined {
  const r = db().prepare(sql).get(...clean(params));
  return r ? ({ ...(r as object) } as T) : undefined;
}
export function run(sql: string, ...params: unknown[]): { changes: number } {
  const r = db().prepare(sql).run(...clean(params));
  return { changes: Number(r.changes) };
}
/** Executa una funció dins d'una transacció. */
let txDepth = 0;
export function tx<T>(fn: () => T): T {
  const d = db();
  if (txDepth > 0) {
    txDepth++;
    try {
      return fn();
    } finally {
      txDepth--;
    }
  }
  d.exec("BEGIN");
  txDepth = 1;
  try {
    const r = fn();
    d.exec("COMMIT");
    return r;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  } finally {
    txDepth = 0;
  }
}

/** Insereix una fila a partir d'un objecte (les claus són columnes). */
export function insert(table: string, row: Record<string, unknown>): void {
  const keys = Object.keys(row);
  run(`INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`, ...keys.map((k) => row[k]));
}
export function update(table: string, id: string, patch: Record<string, unknown>): void {
  const keys = Object.keys(patch);
  if (!keys.length) return;
  run(`UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`, ...keys.map((k) => patch[k]), id);
}

export function uid(prefix = ""): string {
  return prefix + randomUUID().replace(/-/g, "").slice(0, 16);
}
export function nowIso(): string {
  return new Date().toISOString();
}
export function parseJson<T>(v: unknown, fallback: T): T {
  if (typeof v !== "string" || !v) return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}
