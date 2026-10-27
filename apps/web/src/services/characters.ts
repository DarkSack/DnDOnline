import type { CharacterSheet } from "@dndonline/engine/character";
import { api } from "./api";

/** Fila de listado (apps/server/src/modules/characters/routes.ts). */
export type CharacterSummary = {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  campaignId: string | null;
  campaignName: string | null;
  race: string;
  className: string;
  level: number;
};

export type Character = {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  campaignId: string | null;
  campaignName: string | null;
  sheet: CharacterSheet;
  updatedAt: string;
};

export const listMyCharacters = () => api<{ characters: CharacterSummary[] }>("/api/characters").then((r) => r.characters);

export const listCampaignCharacters = (campaignId: string) =>
  api<{ characters: CharacterSummary[] }>(`/api/campaigns/${campaignId}/characters`).then((r) => r.characters);

/** `canEdit` solo es true para el dueño; el DM de la campaña la ve en modo lectura. */
export const getCharacter = (id: string) => api<{ character: Character; canEdit: boolean }>(`/api/characters/${id}`);

export const createCharacter = (input: { name: string; sheet: CharacterSheet; campaignId: string | null }) =>
  api<{ id: string }>("/api/characters", { body: input });

export const updateCharacter = (id: string, patch: { name?: string; sheet?: CharacterSheet; campaignId?: string | null }) =>
  api(`/api/characters/${id}`, { method: "PATCH", body: patch });

export const deleteCharacter = (id: string) => api(`/api/characters/${id}`, { method: "DELETE" });
