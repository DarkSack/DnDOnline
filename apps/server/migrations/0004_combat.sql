-- Combate en curso de una campaña: iniciativa y turnos sobre las fichas de una escena.
-- Como mucho uno por campaña; al terminar, la fila se borra.
CREATE TABLE combats (
  campaign_id      uuid PRIMARY KEY REFERENCES campaigns ON DELETE CASCADE,
  scene_id         uuid NOT NULL REFERENCES scenes ON DELETE CASCADE,
  round            int NOT NULL DEFAULT 1,
  current_turn_idx int NOT NULL DEFAULT 0,
  -- Combatant[] del motor (packages/engine/src/combat/types.ts); entity_id es el id de la ficha.
  combatants       jsonb NOT NULL,
  started_at       timestamptz NOT NULL DEFAULT now()
);
