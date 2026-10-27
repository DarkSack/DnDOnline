import type { Sql } from "../../db/sql.ts";
import { hashToken, newToken } from "./tokens.ts";

export const SESSION_COOKIE = "dndonline_session";

export type SessionUser = { id: string; email: string; displayName: string; locale: string; emailVerified: boolean };

export async function createSession(sql: Sql, userId: string, days: number): Promise<{ token: string; expires: Date }> {
  const token = newToken();
  const expires = new Date(Date.now() + days * 86_400_000);
  await sql`INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (${userId}, ${hashToken(token)}, ${expires})`;
  return { token, expires };
}

export async function userForToken(sql: Sql, token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const [row] = await sql<{ id: string; email: string; display_name: string; locale: string; email_verified_at: Date | null }[]>`
    SELECT u.id, u.email, u.display_name, u.locale, u.email_verified_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${hashToken(token)} AND s.revoked_at IS NULL AND s.expires_at > now()`;
  return row
    ? { id: row.id, email: row.email, displayName: row.display_name, locale: row.locale, emailVerified: row.email_verified_at !== null }
    : null;
}

export async function revokeSession(sql: Sql, token: string) {
  await sql`UPDATE sessions SET revoked_at = now() WHERE token_hash = ${hashToken(token)} AND revoked_at IS NULL`;
}

export async function revokeAllSessions(sql: Sql, userId: string) {
  await sql`UPDATE sessions SET revoked_at = now() WHERE user_id = ${userId} AND revoked_at IS NULL`;
}
