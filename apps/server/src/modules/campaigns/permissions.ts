import type { Sql } from "../../db/sql.ts";
import { HttpError } from "../../http.ts";

export const ROLES = ["dm", "co_dm", "player", "spectator"] as const;
export type Role = (typeof ROLES)[number];

export type Action =
  | "campaign.read"
  | "campaign.manage" // invitaciones, expulsiones
  | "campaign.change_roles"
  | "table.chat"
  | "table.roll"
  | "table.see_private"; // tiradas privadas y secretas de otros, susurros al DM

const MATRIX: Record<Role, ReadonlySet<Action>> = {
  dm: new Set(["campaign.read", "campaign.manage", "campaign.change_roles", "table.chat", "table.roll", "table.see_private"]),
  co_dm: new Set(["campaign.read", "campaign.manage", "table.chat", "table.roll", "table.see_private"]),
  player: new Set(["campaign.read", "table.chat", "table.roll"]),
  spectator: new Set(["campaign.read", "table.chat"]),
};

export const can = (role: Role | null, action: Action) => role !== null && MATRIX[role].has(action);

export async function roleIn(sql: Sql, campaignId: string, userId: string): Promise<Role | null> {
  const [row] = await sql<{ role: Role }[]>`SELECT role FROM campaign_members WHERE campaign_id = ${campaignId} AND user_id = ${userId}`;
  return row?.role ?? null;
}

/**
 * Comprueba en la base (no en caché) que el usuario puede hacer la acción.
 * Quien no es miembro recibe 404, para no revelar que la campaña existe.
 */
export async function authorize(sql: Sql, campaignId: string, userId: string, action: Action): Promise<Role> {
  const role = await roleIn(sql, campaignId, userId);
  if (role === null) throw new HttpError(404, "not_found");
  if (!can(role, action)) throw new HttpError(403, "forbidden");
  return role;
}
