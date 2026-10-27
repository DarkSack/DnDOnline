import { z } from "zod";

const Env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(3000),
  HOST: z.string().default("127.0.0.1"),
  DATABASE_URL: z.string().url(),
  /** Origen público de la web, p. ej. https://dndonline.example.com. Se usa contra CSRF y WebSocket hijacking. */
  PUBLIC_ORIGIN: z.string().url(),
  /** Si se omite, se infiere de PUBLIC_ORIGIN (https → cookie Secure). */
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  SESSION_DAYS: z.coerce.number().int().positive().default(30),
  /** Peticiones por minuto e IP a registro, login y recuperación. */
  AUTH_RATE_LIMIT: z.coerce.number().int().positive().default(10),
});

export type Config = {
  env: "development" | "test" | "production";
  port: number;
  host: string;
  databaseUrl: string;
  publicOrigin: string;
  cookieSecure: boolean;
  sessionDays: number;
  authRateLimit: number;
};

export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const e = Env.parse(source);
  return {
    env: e.NODE_ENV,
    port: e.PORT,
    host: e.HOST,
    databaseUrl: e.DATABASE_URL,
    publicOrigin: new URL(e.PUBLIC_ORIGIN).origin,
    cookieSecure: e.COOKIE_SECURE ? e.COOKIE_SECURE === "true" : e.PUBLIC_ORIGIN.startsWith("https:"),
    sessionDays: e.SESSION_DAYS,
    authRateLimit: e.AUTH_RATE_LIMIT,
  };
}
