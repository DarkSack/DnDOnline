import { createHash, randomBytes } from "node:crypto";

/** 256 bits aleatorios: con eso basta un SHA-256 simple para guardarlos (no son adivinables como una contraseña). */
export const newToken = () => randomBytes(32).toString("base64url");
export const hashToken = (token: string) => createHash("sha256").update(token).digest();
