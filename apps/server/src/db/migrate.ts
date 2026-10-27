import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Sql } from "./sql.ts";

export const MIGRATIONS_DIR = join(import.meta.dirname, "../../migrations");

/** Aplica en orden los .sql pendientes, cada uno en su transacción. Devuelve los aplicados. */
export async function migrate(sql: Sql, dir = MIGRATIONS_DIR): Promise<string[]> {
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
  // Evita que dos instancias migren a la vez.
  return sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(727274)`;
    const done = new Set((await tx<{ name: string }[]>`SELECT name FROM schema_migrations`).map((r) => r.name));
    const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
    const applied: string[] = [];
    for (const file of files) {
      if (done.has(file)) continue;
      await tx.unsafe(await readFile(join(dir, file), "utf8"));
      await tx`INSERT INTO schema_migrations (name) VALUES (${file})`;
      applied.push(file);
    }
    return applied;
  });
}
