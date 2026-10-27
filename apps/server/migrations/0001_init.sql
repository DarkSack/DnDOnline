-- Identidad
CREATE TABLE users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text NOT NULL,
  display_name      text NOT NULL,
  password_hash     text NOT NULL,
  locale            text NOT NULL DEFAULT 'es' CHECK (locale IN ('es', 'en')),
  email_verified_at timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_key ON users (lower(email));

-- Solo se guarda el SHA-256 del token: una copia de la base no sirve para entrar.
CREATE TABLE sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  token_hash   bytea NOT NULL UNIQUE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  revoked_at   timestamptz
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

CREATE TABLE email_tokens (
  token_hash  bytea PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  purpose     text NOT NULL CHECK (purpose IN ('verify', 'reset')),
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz
);

-- Campañas
CREATE TABLE campaigns (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text NOT NULL DEFAULT '',
  owner_id    uuid NOT NULL REFERENCES users,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE campaign_members (
  campaign_id uuid NOT NULL REFERENCES campaigns ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('dm', 'co_dm', 'player', 'spectator')),
  joined_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, user_id)
);
CREATE INDEX campaign_members_user_idx ON campaign_members (user_id);

CREATE TABLE campaign_invites (
  code        text PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES campaigns ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('player', 'spectator')),
  created_by  uuid NOT NULL REFERENCES users,
  expires_at  timestamptz NOT NULL,
  max_uses    int NOT NULL CHECK (max_uses > 0),
  uses        int NOT NULL DEFAULT 0,
  revoked_at  timestamptz
);

-- Mesa: chat y dados. visibility decide quién lo ve (ver modules/table/visibility.ts).
CREATE TABLE chat_messages (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES campaigns ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users,
  body        text NOT NULL,
  visibility  text NOT NULL CHECK (visibility IN ('public', 'private')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_campaign_idx ON chat_messages (campaign_id, id DESC);

CREATE TABLE dice_rolls (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES campaigns ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users,
  formula     text NOT NULL,
  mode        text NOT NULL CHECK (mode IN ('normal', 'advantage', 'disadvantage')),
  results     jsonb NOT NULL,
  discarded   int,
  total       int NOT NULL,
  visibility  text NOT NULL CHECK (visibility IN ('public', 'private', 'blind')),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dice_rolls_campaign_idx ON dice_rolls (campaign_id, id DESC);

-- Auditoría de operaciones sensibles. Nunca guardar contraseñas ni tokens en data.
CREATE TABLE audit_log (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id    uuid REFERENCES users ON DELETE SET NULL,
  action      text NOT NULL,
  target      text,
  data        jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);
