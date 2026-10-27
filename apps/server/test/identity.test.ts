import { describe, expect, it } from "vitest";
import { ORIGIN, as, cookieOf, register, useApp } from "./helpers.ts";

const ctx = useApp();

describe("identidad", () => {
  it("registra, devuelve la sesión y no guarda el token en claro", async () => {
    const u = await register(ctx.app, "Ana");
    const me = (await as(ctx.app, u).get("/api/auth/me")).json();
    expect(me.user).toMatchObject({ id: u.id, displayName: "Ana", emailVerified: false });

    const token = u.cookie.split("=")[1]!;
    const rows = await ctx.sql`SELECT 1 FROM sessions WHERE token_hash::text LIKE ${"%" + token + "%"}`;
    expect(rows).toHaveLength(0);
    const [user] = await ctx.sql`SELECT password_hash FROM users WHERE id = ${u.id}`;
    expect(user!.password_hash).toMatch(/^\$argon2id\$/);
  });

  it("rechaza correo repetido sin importar mayúsculas", async () => {
    const u = await register(ctx.app);
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/auth/register",
      headers: { origin: ORIGIN },
      payload: { email: u.email.toUpperCase(), password: "otra-contraseña", displayName: "Otro" },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: "email_taken" });
  });

  it("valida la entrada", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/api/auth/register",
      headers: { origin: ORIGIN },
      payload: { email: "no-es-correo", password: "corta", displayName: "X" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("login con contraseña mala da el mismo error que con correo inexistente", async () => {
    const u = await register(ctx.app);
    const bad = await ctx.app.inject({ method: "POST", url: "/api/auth/login", headers: { origin: ORIGIN }, payload: { email: u.email, password: "incorrecta-123" } });
    const ghost = await ctx.app.inject({ method: "POST", url: "/api/auth/login", headers: { origin: ORIGIN }, payload: { email: "nadie@test.local", password: "incorrecta-123" } });
    expect(bad.statusCode).toBe(401);
    expect(ghost.json()).toEqual(bad.json());

    const ok = await ctx.app.inject({ method: "POST", url: "/api/auth/login", headers: { origin: ORIGIN }, payload: { email: u.email, password: "contraseña-larga" } });
    expect(ok.statusCode).toBe(200);
  });

  it("logout revoca la sesión en el servidor", async () => {
    const u = await register(ctx.app);
    await as(ctx.app, u).post("/api/auth/logout");
    expect((await as(ctx.app, u).get("/api/auth/me")).json().user).toBeNull();
  });

  it("bloquea peticiones que cambian algo desde otro origen (CSRF)", async () => {
    const u = await register(ctx.app);
    for (const origin of ["https://malo.example", undefined]) {
      const res = await ctx.app.inject({ method: "POST", url: "/api/campaigns", headers: { cookie: u.cookie, ...(origin ? { origin } : {}) }, payload: { name: "x" } });
      expect(res.statusCode).toBe(403);
    }
  });

  it("verifica el correo con el token del enlace, una sola vez", async () => {
    const u = await register(ctx.app);
    const mail = ctx.mails.findLast((m) => m.to === u.email && m.kind === "verify")!;
    const token = mail.link.split("#")[1]!;
    expect((await as(ctx.app, u).post("/api/auth/verify", { token })).statusCode).toBe(200);
    expect((await as(ctx.app, u).get("/api/auth/me")).json().user.emailVerified).toBe(true);
    expect((await as(ctx.app, u).post("/api/auth/verify", { token })).statusCode).toBe(400);
  });

  it("recupera la cuenta y cierra todas las sesiones anteriores", async () => {
    const u = await register(ctx.app);
    const forgot = await ctx.app.inject({ method: "POST", url: "/api/auth/forgot", headers: { origin: ORIGIN }, payload: { email: u.email } });
    expect(forgot.statusCode).toBe(200);
    const token = ctx.mails.findLast((m) => m.to === u.email && m.kind === "reset")!.link.split("#")[1]!;

    const reset = await ctx.app.inject({ method: "POST", url: "/api/auth/reset", headers: { origin: ORIGIN }, payload: { token, password: "nueva-contraseña" } });
    expect(reset.statusCode).toBe(200);
    expect((await as(ctx.app, u).get("/api/auth/me")).json().user).toBeNull();

    const login = await ctx.app.inject({ method: "POST", url: "/api/auth/login", headers: { origin: ORIGIN }, payload: { email: u.email, password: "nueva-contraseña" } });
    expect(login.statusCode).toBe(200);
    expect(cookieOf(login.headers["set-cookie"])).toContain("dndonline_session=");
  });

  it("forgot no revela si el correo existe", async () => {
    const res = await ctx.app.inject({ method: "POST", url: "/api/auth/forgot", headers: { origin: ORIGIN }, payload: { email: "nadie@test.local" } });
    expect(res.json()).toEqual({ ok: true });
  });
});
