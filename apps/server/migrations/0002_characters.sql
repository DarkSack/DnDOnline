-- Personajes. La ficha es el CharacterSheet versionado del motor (packages/engine/src/character/types.ts),
-- validada en modules/characters/sheet.ts antes de guardarse.
CREATE TABLE characters (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  -- Campaña donde juega; su DM y co-DM pueden ver la ficha. Se vacía al salir o ser expulsado.
  campaign_id uuid REFERENCES campaigns ON DELETE SET NULL,
  name        text NOT NULL,
  sheet       jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX characters_owner_idx ON characters (owner_id);
CREATE INDEX characters_campaign_idx ON characters (campaign_id) WHERE campaign_id IS NOT NULL;
