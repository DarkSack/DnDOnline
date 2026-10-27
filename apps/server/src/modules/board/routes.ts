import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Sql } from "../../db/sql.ts";
import { HttpError, parse } from "../../http.ts";
import { authorize, can } from "../campaigns/permissions.ts";
import { requireUser } from "../identity/routes.ts";
import { broadcastBoard } from "../table/routes.ts";

const MAX_IMAGE = 5 * 1024 * 1024;
const Id = z.object({ id: z.uuid() });
const SceneInput = z.object({
  name: z.string().trim().min(1).max(60),
  cols: z.number().int().min(1).max(100).default(30),
  rows: z.number().int().min(1).max(100).default(30),
  cellSize: z.number().int().min(16).max(256).default(64),
});
const ScenePatch = z.object({
  name: SceneInput.shape.name.optional(),
  cols: z.number().int().min(1).max(100).optional(),
  rows: z.number().int().min(1).max(100).optional(),
  cellSize: z.number().int().min(16).max(256).optional(),
});

/** Tipo real por los primeros bytes; nunca SVG (puede llevar scripts). */
function sniff(buf: Buffer): string | null {
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 12 && buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  return null;
}

/** Campaña de la escena y si está activa; 404 si no existe. */
async function sceneInfo(sql: Sql, sceneId: string) {
  const [row] = await sql<{ campaignId: string; active: boolean }[]>`
    SELECT s.campaign_id AS "campaignId", c.active_scene_id IS NOT DISTINCT FROM s.id AS active
    FROM scenes s JOIN campaigns c ON c.id = s.campaign_id WHERE s.id = ${sceneId}`;
  if (!row) throw new HttpError(404, "not_found");
  return row;
}

export async function boardRoutes(app: FastifyInstance, { sql }: { sql: Sql }) {
  // Solo en este módulo: el cuerpo de la subida de imagen llega en bruto.
  app.addContentTypeParser(["image/png", "image/jpeg", "image/webp"], { parseAs: "buffer" }, (_req, body, done) => done(null, body));

  app.get("/api/campaigns/:id/scenes", async (req) => {
    const user = requireUser(req);
    const { id } = parse(Id, req.params);
    await authorize(sql, id, user.id, "board.manage");
    const scenes = await sql`
      SELECT s.id, s.name, s.cols, s.rows, s.cell_size AS "cellSize", s.image_version AS "imageVersion",
             c.active_scene_id IS NOT DISTINCT FROM s.id AS active
      FROM scenes s JOIN campaigns c ON c.id = s.campaign_id
      WHERE s.campaign_id = ${id} ORDER BY s.created_at DESC`;
    return { scenes };
  });

  app.post("/api/campaigns/:id/scenes", async (req, reply) => {
    const user = requireUser(req);
    const { id } = parse(Id, req.params);
    await authorize(sql, id, user.id, "board.manage");
    const body = parse(SceneInput, req.body);
    const [scene] = await sql<{ id: string }[]>`
      INSERT INTO scenes (campaign_id, name, cols, rows, cell_size)
      VALUES (${id}, ${body.name}, ${body.cols}, ${body.rows}, ${body.cellSize}) RETURNING id`;
    return reply.status(201).send({ id: scene!.id });
  });

  app.patch("/api/scenes/:id", async (req) => {
    const user = requireUser(req);
    const { id } = parse(Id, req.params);
    const { campaignId, active } = await sceneInfo(sql, id);
    await authorize(sql, campaignId, user.id, "board.manage");
    const body = parse(ScenePatch, req.body);
    await sql.begin(async (tx) => {
      const [scene] = await tx<{ cols: number; rows: number }[]>`
        UPDATE scenes SET
          name = ${body.name ?? tx`name`},
          cols = ${body.cols ?? tx`cols`},
          rows = ${body.rows ?? tx`rows`},
          cell_size = ${body.cellSize ?? tx`cell_size`}
        WHERE id = ${id} RETURNING cols, rows`;
      // Al encoger la cuadrícula, las fichas que quedan fuera se arriman al borde.
      await tx`UPDATE tokens SET col = LEAST(col, ${scene!.cols - 1}), "row" = LEAST("row", ${scene!.rows - 1}) WHERE scene_id = ${id}`;
    });
    if (active) await broadcastBoard(sql, campaignId);
    return { ok: true };
  });

  app.delete("/api/scenes/:id", async (req) => {
    const user = requireUser(req);
    const { id } = parse(Id, req.params);
    const { campaignId, active } = await sceneInfo(sql, id);
    await authorize(sql, campaignId, user.id, "board.manage");
    await sql`DELETE FROM scenes WHERE id = ${id}`;
    if (active) await broadcastBoard(sql, campaignId);
    return { ok: true };
  });

  app.put("/api/scenes/:id/image", { bodyLimit: MAX_IMAGE, config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (req) => {
    const user = requireUser(req);
    const { id } = parse(Id, req.params);
    const { campaignId, active } = await sceneInfo(sql, id);
    await authorize(sql, campaignId, user.id, "board.manage");
    const body = req.body;
    const mime = Buffer.isBuffer(body) ? sniff(body) : null;
    // El tipo declarado y el real tienen que coincidir.
    if (!mime || mime !== req.headers["content-type"]?.split(";")[0]?.trim()) throw new HttpError(400, "invalid_image");
    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO scene_images (scene_id, mime, data) VALUES (${id}, ${mime}, ${body as Buffer})
        ON CONFLICT (scene_id) DO UPDATE SET mime = EXCLUDED.mime, data = EXCLUDED.data`;
      await tx`UPDATE scenes SET image_version = image_version + 1 WHERE id = ${id}`;
    });
    if (active) await broadcastBoard(sql, campaignId);
    return { ok: true };
  });

  app.get("/api/scenes/:id/image", async (req, reply) => {
    const user = requireUser(req);
    const { id } = parse(Id, req.params);
    const { campaignId, active } = await sceneInfo(sql, id);
    const role = await authorize(sql, campaignId, user.id, "campaign.read");
    // Los jugadores solo ven el mapa que está en la mesa, no los que el DM tiene preparados.
    if (!active && !can(role, "board.manage")) throw new HttpError(404, "not_found");
    const [image] = await sql<{ mime: string; data: Buffer }[]>`SELECT mime, data FROM scene_images WHERE scene_id = ${id}`;
    if (!image) throw new HttpError(404, "not_found");
    return reply
      .header("content-type", image.mime)
      .header("x-content-type-options", "nosniff")
      .header("cache-control", "private, max-age=86400")
      .send(image.data);
  });
}
