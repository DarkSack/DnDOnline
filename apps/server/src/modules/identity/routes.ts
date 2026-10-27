import { hash, verify } from "@node-rs/argon2";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Config } from "../../config.ts";
import type { Sql } from "../../db/sql.ts";
import { HttpError, parse } from "../../http.ts";
import { audit } from "../audit.ts";
import type { Mailer } from "./mailer.ts";
import { SESSION_COOKIE, createSession, revokeAllSessions, revokeSession, userForToken, type SessionUser } from "./sessions.ts";
import { hashToken, newToken } from "./tokens.ts";

declare module "fastify" {
  interface FastifyRequest {
    user: SessionUser | null;
  }
}

const Email = z.string().trim().toLowerCase().pipe(z.email()).pipe(z.string().max(254));
const Password = z.string().min(10).max(256);
const Register = z.object({
  email: Email,
  password: Password,
  displayName: z.string().trim().min(2).max(40),
  locale: z.enum(["es", "en"]).default("es"),
});
const Login = z.object({ email: Email, password: z.string().max(256) });
const Token = z.string().min(1).max(100);

// Se verifica contra este hash cuando el correo no existe, para que el tiempo de respuesta no lo delate.
const DUMMY_HASH = hash("dndonline-dummy-password");

export function requireUser(req: FastifyRequest): SessionUser {
  if (!req.user) throw new HttpError(401, "unauthenticated");
  return req.user;
}

export async function identityRoutes(app: FastifyInstance, { sql, config, mailer }: { sql: Sql; config: Config; mailer: Mailer }) {
  const setCookie = (reply: FastifyReply, token: string, expires: Date) =>
    reply.setCookie(SESSION_COOKIE, token, { path: "/", httpOnly: true, sameSite: "lax", secure: config.cookieSecure, expires });

  const sendEmailToken = async (userId: string, email: string, purpose: "verify" | "reset") => {
    const token = newToken();
    const hours = purpose === "verify" ? 48 : 1;
    await sql`INSERT INTO email_tokens (token_hash, user_id, purpose, expires_at)
              VALUES (${hashToken(token)}, ${userId}, ${purpose}, now() + make_interval(hours => ${hours}))`;
    // El token va en el fragmento (#) para que no llegue a logs de proxies ni a Referer.
    await mailer.send({ to: email, kind: purpose, link: `${config.publicOrigin}/${purpose}#${token}` });
  };

  const consumeEmailToken = async (token: string, purpose: "verify" | "reset") => {
    const [row] = await sql<{ user_id: string }[]>`
      UPDATE email_tokens SET used_at = now()
      WHERE token_hash = ${hashToken(token)} AND purpose = ${purpose} AND used_at IS NULL AND expires_at > now()
      RETURNING user_id`;
    if (!row) throw new HttpError(400, "invalid_token");
    return row.user_id;
  };

  const authLimit = { config: { rateLimit: { max: config.authRateLimit, timeWindow: "1 minute" } } };

  app.post("/api/auth/register", authLimit, async (req, reply) => {
    const body = parse(Register, req.body);
    const passwordHash = await hash(body.password);
    const [user] = await sql<{ id: string }[]>`
      INSERT INTO users (email, display_name, password_hash, locale)
      VALUES (${body.email}, ${body.displayName}, ${passwordHash}, ${body.locale})
      ON CONFLICT DO NOTHING RETURNING id`;
    if (!user) throw new HttpError(409, "email_taken");
    await audit(sql, user.id, "user.register", user.id);
    await sendEmailToken(user.id, body.email, "verify");
    const { token, expires } = await createSession(sql, user.id, config.sessionDays);
    setCookie(reply, token, expires);
    return reply.status(201).send({ user: await userForToken(sql, token) });
  });

  app.post("/api/auth/login", authLimit, async (req, reply) => {
    const body = parse(Login, req.body);
    const [row] = await sql<{ id: string; password_hash: string }[]>`
      SELECT id, password_hash FROM users WHERE lower(email) = ${body.email}`;
    const ok = await verify(row?.password_hash ?? (await DUMMY_HASH), body.password);
    if (!row || !ok) {
      if (row) await audit(sql, row.id, "user.login_failed", row.id);
      throw new HttpError(401, "bad_credentials");
    }
    const { token, expires } = await createSession(sql, row.id, config.sessionDays);
    setCookie(reply, token, expires);
    return { user: await userForToken(sql, token) };
  });

  app.post("/api/auth/logout", async (req, reply) => {
    const token = req.cookies[SESSION_COOKIE];
    if (token) await revokeSession(sql, token);
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return { ok: true };
  });

  app.post("/api/auth/logout-all", async (req, reply) => {
    const user = requireUser(req);
    await revokeAllSessions(sql, user.id);
    await audit(sql, user.id, "user.logout_all", user.id);
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return { ok: true };
  });

  app.get("/api/auth/me", async (req) => ({ user: req.user }));

  app.post("/api/auth/verify", authLimit, async (req) => {
    const { token } = parse(z.object({ token: Token }), req.body);
    const userId = await consumeEmailToken(token, "verify");
    await sql`UPDATE users SET email_verified_at = coalesce(email_verified_at, now()) WHERE id = ${userId}`;
    return { ok: true };
  });

  app.post("/api/auth/resend-verification", authLimit, async (req) => {
    const user = requireUser(req);
    if (!user.emailVerified) await sendEmailToken(user.id, user.email, "verify");
    return { ok: true };
  });

  // Siempre responde ok para no revelar qué correos están registrados.
  app.post("/api/auth/forgot", authLimit, async (req) => {
    const { email } = parse(z.object({ email: Email }), req.body);
    const [row] = await sql<{ id: string; email: string }[]>`SELECT id, email FROM users WHERE lower(email) = ${email}`;
    if (row) await sendEmailToken(row.id, row.email, "reset");
    return { ok: true };
  });

  app.post("/api/auth/reset", authLimit, async (req) => {
    const body = parse(z.object({ token: Token, password: Password }), req.body);
    const userId = await consumeEmailToken(body.token, "reset");
    await sql`UPDATE users SET password_hash = ${await hash(body.password)} WHERE id = ${userId}`;
    await revokeAllSessions(sql, userId);
    await audit(sql, userId, "user.password_reset", userId);
    return { ok: true };
  });
}
