import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll } from "vitest";
import { buildApp } from "../src/app.ts";
import type { Config } from "../src/config.ts";
import { migrate } from "../src/db/migrate.ts";
import { createSql, type Sql } from "../src/db/sql.ts";
import type { Mail } from "../src/modules/identity/mailer.ts";

export const ORIGIN = "http://localhost:5180";

const config: Config = {
  env: "test",
  port: 0,
  host: "127.0.0.1",
  databaseUrl: process.env.TEST_DATABASE_URL ?? "postgres://dndonline:dndonline-dev@127.0.0.1:54329/dndonline_test",
  publicOrigin: ORIGIN,
  cookieSecure: false,
  sessionDays: 30,
  authRateLimit: 10_000,
};

/** Levanta la app contra la base de pruebas; `mails` recoge lo que se habría enviado. */
export function useApp() {
  const ctx = { app: null as unknown as FastifyInstance, sql: null as unknown as Sql, mails: [] as Mail[] };
  beforeAll(async () => {
    ctx.sql = createSql(config.databaseUrl);
    await migrate(ctx.sql);
    ctx.app = await buildApp({ config, sql: ctx.sql, logger: false, mailer: { send: async (m) => void ctx.mails.push(m) } });
  });
  afterAll(async () => {
    await ctx.app.close();
    await ctx.sql.end();
  });
  return ctx;
}

export type Client = { cookie: string; id: string; email: string; displayName: string };

export async function register(app: FastifyInstance, name = "Tester"): Promise<Client> {
  const email = `${randomUUID()}@test.local`;
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/register",
    headers: { origin: ORIGIN },
    payload: { email, password: "contraseña-larga", displayName: name },
  });
  if (res.statusCode !== 201) throw new Error(`registro falló: ${res.statusCode} ${res.body}`);
  return { cookie: cookieOf(res.headers["set-cookie"]), id: res.json().user.id, email, displayName: name };
}

export function cookieOf(setCookie: string | string[] | undefined): string {
  const first = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!first) throw new Error("sin cookie");
  return first.split(";")[0]!;
}

/** Petición autenticada con el origen correcto. */
export function as(app: FastifyInstance, who: Client) {
  const call = (method: "GET" | "POST" | "PATCH" | "DELETE", url: string, payload?: object) =>
    app.inject({ method, url, payload, headers: { origin: ORIGIN, cookie: who.cookie } });
  return {
    get: (url: string) => call("GET", url),
    post: (url: string, payload: object = {}) => call("POST", url, payload),
    patch: (url: string, payload: object) => call("PATCH", url, payload),
    delete: (url: string) => call("DELETE", url),
  };
}

let joins = 0;

/** Campaña con un DM y los jugadores/espectadores pedidos, ya unidos por invitación. */
export async function campaignWith(app: FastifyInstance, extra: { player?: number; spectator?: number } = {}) {
  const dm = await register(app, "DM");
  const { id } = (await as(app, dm).post("/api/campaigns", { name: "Prueba" })).json();
  const join = async (role: "player" | "spectator", n: number) => {
    const out: Client[] = [];
    for (let i = 0; i < n; i++) {
      const c = await register(app, `${role}${i}`);
      const { invite } = (await as(app, dm).post(`/api/campaigns/${id}/invites`, { role })).json();
      // IP propia por aceptación: aceptar invitaciones tiene límite por IP y un archivo de pruebas lo supera.
      const accepted = await app.inject({
        method: "POST",
        url: `/api/invites/${invite.code}/accept`,
        headers: { origin: ORIGIN, cookie: c.cookie },
        remoteAddress: `10.0.${(joins >> 8) & 255}.${joins++ & 255}`,
      });
      if (accepted.statusCode !== 200) throw new Error(`no se pudo unir a ${role}${i}: ${accepted.body}`);
      out.push(c);
    }
    return out;
  };
  return { id: id as string, dm, players: await join("player", extra.player ?? 0), spectators: await join("spectator", extra.spectator ?? 0) };
}
