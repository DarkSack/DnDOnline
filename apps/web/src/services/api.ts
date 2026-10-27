// Cliente de la API propia (apps/server). Mismo origen: la sesión viaja en una cookie httpOnly.

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: init.method ?? (init.body === undefined ? "GET" : "POST"),
    headers: init.body === undefined ? {} : { "content-type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? "internal");
  return data as T;
}

export type User = { id: string; email: string; displayName: string; locale: "es" | "en"; emailVerified: boolean };
export type Role = "dm" | "co_dm" | "player" | "spectator";
export type CampaignSummary = { id: string; name: string; description: string; role: Role };
export type Member = { id: string; displayName: string; role: Role };
export type Invite = { code: string; role: Role; expiresAt: string; maxUses: number; uses?: number };
export type CampaignDetail = {
  campaign: { id: string; name: string; description: string; ownerId: string };
  role: Role;
  members: Member[];
};
