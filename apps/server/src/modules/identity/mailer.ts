import type { FastifyBaseLogger } from "fastify";

export type Mail = { to: string; kind: "verify" | "reset"; link: string };
export type Mailer = { send(mail: Mail): Promise<void> };

/**
 * shortcut: no hay envío real de correo. En desarrollo el enlace sale en el log; en producción
 * se descarta, porque un enlace en los logs es una credencial. Añadir un transporte SMTP antes
 * de abrir el registro al público.
 */
export function logMailer(log: FastifyBaseLogger, env: string): Mailer {
  return {
    async send(mail) {
      if (env === "production") log.warn({ kind: mail.kind }, "correo descartado: no hay transporte configurado");
      else log.info({ kind: mail.kind, link: mail.link }, "correo (solo desarrollo)");
    },
  };
}
