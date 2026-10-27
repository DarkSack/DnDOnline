-- Escenas: un mapa con su cuadrícula, niebla y paredes. Cada campaña tiene como mucho una activa en la mesa.
CREATE TABLE scenes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   uuid NOT NULL REFERENCES campaigns ON DELETE CASCADE,
  name          text NOT NULL,
  cols          int NOT NULL CHECK (cols BETWEEN 1 AND 100),
  rows          int NOT NULL CHECK (rows BETWEEN 1 AND 100),
  cell_size     int NOT NULL CHECK (cell_size BETWEEN 16 AND 256),
  -- Celdas "col,row". fog: tapadas para los jugadores. walls: bloquean la línea de visión.
  fog           text[] NOT NULL DEFAULT '{}',
  walls         text[] NOT NULL DEFAULT '{}',
  -- 0 = sin imagen; sube con cada imagen nueva para invalidar la caché del navegador.
  image_version int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX scenes_campaign_idx ON scenes (campaign_id);

-- La imagen va aparte para no arrastrarla al leer la escena. Vive en la base para que pg_dump la respalde.
CREATE TABLE scene_images (
  scene_id uuid PRIMARY KEY REFERENCES scenes ON DELETE CASCADE,
  mime     text NOT NULL CHECK (mime IN ('image/png', 'image/jpeg', 'image/webp')),
  data     bytea NOT NULL
);

ALTER TABLE campaigns ADD COLUMN active_scene_id uuid REFERENCES scenes ON DELETE SET NULL;

-- Fichas en el tablero. character_id enlaza un PC con su personaje: su dueño puede moverlo.
CREATE TABLE tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id     uuid NOT NULL REFERENCES scenes ON DELETE CASCADE,
  kind         text NOT NULL CHECK (kind IN ('pc', 'npc', 'monster')),
  name         text NOT NULL,
  col          int NOT NULL,
  "row"        int NOT NULL,
  size         int NOT NULL DEFAULT 1 CHECK (size BETWEEN 1 AND 4),
  hp           int,
  hp_max       int,
  visible      boolean NOT NULL DEFAULT true,
  color        text,
  character_id uuid REFERENCES characters ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tokens_scene_idx ON tokens (scene_id);
