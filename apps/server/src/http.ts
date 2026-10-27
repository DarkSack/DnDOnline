import type { FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";

/** Error con código estable que el cliente traduce; nunca lleva datos internos. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export function parse<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const r = schema.safeParse(value);
  if (!r.success) throw new HttpError(400, "invalid_input");
  return r.data;
}

export function sendError(err: unknown, req: FastifyRequest, reply: FastifyReply) {
  if (err instanceof HttpError) return reply.status(err.status).send({ error: err.code });
  const status = (err as { statusCode?: number }).statusCode;
  if (status && status < 500) {
    const code = status === 429 ? "rate_limited" : status === 413 ? "too_large" : status === 415 ? "invalid_image" : "bad_request";
    return reply.status(status).send({ error: code });
  }
  req.log.error(err);
  return reply.status(500).send({ error: "internal" });
}
