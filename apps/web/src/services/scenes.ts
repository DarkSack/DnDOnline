import { api, ApiError } from "./api";

/** Escena tal como la lista el servidor a DM y co-DM (apps/server/src/modules/board/routes.ts). */
export type SceneSummary = { id: string; name: string; cols: number; rows: number; cellSize: number; imageVersion: number; active: boolean };

export const MAX_SCENE_IMAGE = 5 * 1024 * 1024;
export const SCENE_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export const listScenes = (campaignId: string) =>
  api<{ scenes: SceneSummary[] }>(`/api/campaigns/${campaignId}/scenes`).then((r) => r.scenes);

export const createScene = (campaignId: string, input: { name: string; cols: number; rows: number; cellSize: number }) =>
  api<{ id: string }>(`/api/campaigns/${campaignId}/scenes`, { body: input });

export const deleteScene = (id: string) => api(`/api/scenes/${id}`, { method: "DELETE" });

export const sceneImageUrl = (s: SceneSummary) => (s.imageVersion > 0 ? `/api/scenes/${s.id}/image?v=${s.imageVersion}` : null);

/** La imagen viaja en bruto; el servidor comprueba que el tipo declarado sea el real. */
export async function uploadSceneImage(id: string, file: File) {
  const res = await fetch(`/api/scenes/${id}/image`, { method: "PUT", headers: { "content-type": file.type }, body: file, credentials: "same-origin" });
  if (!res.ok) throw new ApiError(res.status, ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "internal");
}
