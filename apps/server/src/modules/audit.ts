import type { Sql } from "../db/sql.ts";

/** Registro de operaciones sensibles. Nunca pasar contraseñas, tokens ni secretos de campaña en data. */
export async function audit(sql: Sql, actorId: string | null, action: string, target: string | null, data: Record<string, string | number | boolean> = {}) {
  await sql`INSERT INTO audit_log (actor_id, action, target, data) VALUES (${actorId}, ${action}, ${target}, ${sql.json(data)})`;
}
