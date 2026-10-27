import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import Fastify, { type FastifyServerOptions } from "fastify";
import type { Config } from "./config.ts";
import type { Sql } from "./db/sql.ts";
import { HttpError, sendError } from "./http.ts";
import { campaignRoutes } from "./modules/campaigns/routes.ts";
import { logMailer, type Mailer } from "./modules/identity/mailer.ts";
import { identityRoutes } from "./modules/identity/routes.ts";
import { SESSION_COOKIE, userForToken } from "./modules/identity/sessions.ts";
import { tableRoutes } from "./modules/table/routes.ts";

export type AppDeps = { config: Config; sql: Sql; mailer?: Mailer; logger?: FastifyServerOptions["logger"] };

export async function buildApp({ config, sql, mailer, logger }: AppDeps) {
  const app = Fastify({
    logger: logger ?? {
      level: config.env === "production" ? "info" : "debug",
      // Nunca a los logs: cookies de sesión ni cabeceras de autorización.
      redact: ["req.headers.cookie", "req.headers.authorization", 'res.headers["set-cookie"]'],
    },
    trustProxy: config.env === "production",
    bodyLimit: 64 * 1024,
  });

  app.setErrorHandler(sendError);
  await app.register(cookie);
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });
  await app.register(websocket, { options: { maxPayload: 16 * 1024 } });

  app.decorateRequest("user", null);
  app.addHook("onRequest", async (req) => {
    // CSRF: además de SameSite=Lax, toda petición que cambia algo debe venir de nuestro origen.
    if (req.method !== "GET" && req.method !== "HEAD" && req.headers.origin !== config.publicOrigin) {
      throw new HttpError(403, "bad_origin");
    }
    req.user = await userForToken(sql, req.cookies[SESSION_COOKIE]);
  });

  app.get("/api/health", async () => {
    await sql`SELECT 1`;
    return { ok: true };
  });

  const deps = { sql, config, publicOrigin: config.publicOrigin, mailer: mailer ?? logMailer(app.log, config.env) };
  await app.register(identityRoutes, deps);
  await app.register(campaignRoutes, deps);
  await app.register(tableRoutes, deps);
  return app;
}
