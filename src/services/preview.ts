/* ══════════════════════════════════════════════════════════════
   MODO PREVIEW DE UI — sólo desarrollo.

   Activar con VITE_UI_PREVIEW=true en .env.local. Sustituye el cliente
   de Supabase por un stub con datos de ejemplo y da por autenticado a
   un usuario ficticio, para poder trabajar el diseño de las pantallas
   que viven detrás del login sin levantar un backend.

   Nada de esto se ejecuta salvo que la variable esté puesta: en
   cualquier build normal `isPreviewMode` es false y el módulo queda
   fuera por tree-shaking.
   ══════════════════════════════════════════════════════════════ */

import type { CharacterSheet } from "@/engine/character/types";

export const isPreviewMode = import.meta.env.VITE_UI_PREVIEW === "true";

export const PREVIEW_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "dm@taberna.local",
  user_metadata: { name: "Maestro del Calabozo" },
  app_metadata: {},
  aud: "authenticated",
  created_at: new Date("2026-01-15").toISOString(),
} as const;

const NOW = new Date("2026-08-20T21:00:00Z").toISOString();

function sheet(over: Partial<CharacterSheet["identity"]> & {
  abilities?: Partial<CharacterSheet["abilities"]>;
  combat?: Partial<CharacterSheet["combat"]>;
}): CharacterSheet {
  const { abilities, combat, ...identity } = over;
  return {
    version: 1,
    identity: {
      race: "Humano", className: "Guerrero", level: 3,
      background: "Soldado", alignment: "true-neutral", avatarUrl: "",
      ...identity,
    },
    abilities: { str: 14, dex: 12, con: 14, int: 10, wis: 11, cha: 9, ...abilities },
    combat: { hp: 24, hpMax: 28, ac: 16, speed: 30, ...combat },
    story: {
      backstory: "Marchó al norte cuando las minas callaron.",
      description: "Cicatriz sobre la ceja izquierda.",
      personality: "Habla poco, observa mucho.",
      ideals: "Una deuda se paga.",
      bonds: "La compañía que sobrevivió al paso.",
      flaws: "No sabe retirarse a tiempo.",
    },
  };
}

const CAMPAIGN_ID = "c0000000-0000-4000-8000-000000000001";
const ROOM_ID = "r0000000-0000-4000-8000-000000000001";
const MAP_ID = "m0000000-0000-4000-8000-000000000001";

/** Filas por tabla. Las claves coinciden con `.from(<tabla>)`. */
const TABLES: Record<string, unknown[]> = {
  profiles: [
    { id: PREVIEW_USER.id, username: "Maestro del Calabozo", created_at: NOW },
    { id: "u2", username: "Brann", created_at: NOW },
    { id: "u3", username: "Lyra", created_at: NOW },
  ],

  campaigns: [
    {
      id: CAMPAIGN_ID, dm_id: PREVIEW_USER.id,
      name: "La Maldición de Cuervoscuro",
      description: "Las brumas se cerraron sobre el valle y ya nadie recuerda el camino de vuelta.",
      created_at: NOW,
    },
    {
      id: "c2", dm_id: PREVIEW_USER.id,
      name: "Las Minas de Phandelver",
      description: "Un encargo sencillo: escoltar un carro hasta Valbrisa.",
      created_at: NOW,
    },
  ],

  rooms: [
    {
      id: ROOM_ID, campaign_id: CAMPAIGN_ID, name: "Sesión 7 · La cripta",
      join_code: "CRIPTA", active: true, created_at: NOW,
      active_map_id: MAP_ID, fog: null, walls: null,
      campaigns: { id: CAMPAIGN_ID, name: "La Maldición de Cuervoscuro", dm_id: PREVIEW_USER.id },
    },
  ],

  room_members: [
    {
      room_id: ROOM_ID, user_id: PREVIEW_USER.id, role: "dm",
      character_id: null, joined_at: NOW,
      profiles: { id: PREVIEW_USER.id, username: "Maestro del Calabozo" },
      rooms: {
        id: ROOM_ID, campaign_id: CAMPAIGN_ID, name: "Sesión 7 · La cripta",
        join_code: "CRIPTA", active: true, created_at: NOW,
        active_map_id: MAP_ID, fog: null, walls: null,
        campaigns: { id: CAMPAIGN_ID, name: "La Maldición de Cuervoscuro", dm_id: PREVIEW_USER.id },
      },
    },
    {
      room_id: ROOM_ID, user_id: "u2", role: "player",
      character_id: "ch1", joined_at: NOW,
      profiles: { id: "u2", username: "Brann" },
    },
    {
      room_id: ROOM_ID, user_id: "u3", role: "player",
      character_id: "ch2", joined_at: NOW,
      profiles: { id: "u3", username: "Lyra" },
    },
  ],

  characters: [
    {
      id: "ch1", owner_id: PREVIEW_USER.id, name: "Brann Martillo de Hierro",
      created_at: NOW, updated_at: NOW,
      sheet: sheet({ race: "Enano", className: "Clérigo", level: 4, background: "Acólito",
        abilities: { str: 13, dex: 10, con: 16, int: 11, wis: 17, cha: 12 },
        combat: { hp: 31, hpMax: 34, ac: 18, speed: 25 } }),
    },
    {
      id: "ch2", owner_id: PREVIEW_USER.id, name: "Lyra Vientoveloz",
      created_at: NOW, updated_at: NOW,
      sheet: sheet({ race: "Elfa", className: "Exploradora", level: 4, background: "Forastera",
        abilities: { str: 11, dex: 18, con: 13, int: 12, wis: 15, cha: 10 },
        combat: { hp: 27, hpMax: 30, ac: 15, speed: 35 } }),
    },
    {
      id: "ch3", owner_id: PREVIEW_USER.id, name: "Sombra",
      created_at: NOW, updated_at: NOW,
      sheet: sheet({ race: "Tiefling", className: "Pícaro", level: 3, background: "Criminal",
        abilities: { str: 9, dex: 17, con: 12, int: 14, wis: 11, cha: 15 },
        combat: { hp: 19, hpMax: 22, ac: 14, speed: 30 } }),
    },
  ],

  maps: [
    {
      id: MAP_ID, campaign_id: CAMPAIGN_ID, name: "Cripta de los Reyes",
      background_path: null, cols: 30, rows: 20, cell_size: 48, created_at: NOW,
    },
    {
      id: "m2", campaign_id: CAMPAIGN_ID, name: "Taberna del Jabalí",
      background_path: null, cols: 20, rows: 14, cell_size: 48, created_at: NOW,
    },
  ],

  entities: [
    { id: "e1", room_id: ROOM_ID, kind: "pc", name: "Brann", col: 6, row: 8, size: 1,
      hp: 31, hp_max: 34, visible: true, character_id: "ch1", color: "#c9a227",
      created_at: NOW, updated_at: NOW },
    { id: "e2", room_id: ROOM_ID, kind: "pc", name: "Lyra", col: 7, row: 9, size: 1,
      hp: 27, hp_max: 30, visible: true, character_id: "ch2", color: "#4f9d69",
      created_at: NOW, updated_at: NOW },
    { id: "e3", room_id: ROOM_ID, kind: "npc", name: "Guardián de hueso", col: 12, row: 7,
      size: 2, hp: 45, hp_max: 60, visible: true, character_id: null, color: "#8b1a1a",
      created_at: NOW, updated_at: NOW },
    { id: "e4", room_id: ROOM_ID, kind: "npc", name: "Rata gigante", col: 14, row: 11,
      size: 1, hp: 7, hp_max: 12, visible: true, character_id: null, color: "#6b4f3a",
      created_at: NOW, updated_at: NOW },
  ],

  // `profiles` anidado: los hydrate de messages/dice esperan el join.
  room_messages: [
    { id: "msg1", room_id: ROOM_ID, actor_id: PREVIEW_USER.id, created_at: NOW,
      body: "La puerta de piedra cede con un gemido. Detrás, el aire huele a moneda vieja.",
      profiles: { id: PREVIEW_USER.id, username: "Maestro del Calabozo" } },
    { id: "msg2", room_id: ROOM_ID, actor_id: "u2", created_at: NOW,
      body: "Brann levanta el escudo y avanza primero.",
      profiles: { id: "u2", username: "Brann" } },
    { id: "msg3", room_id: ROOM_ID, actor_id: "u3", created_at: NOW,
      body: "¿Puedo tirar Percepción para buscar trampas en el umbral?",
      profiles: { id: "u3", username: "Lyra" } },
    { id: "msg4", room_id: ROOM_ID, actor_id: PREVIEW_USER.id, created_at: NOW,
      body: "Adelante. CD 14.",
      profiles: { id: PREVIEW_USER.id, username: "Maestro del Calabozo" } },
  ],

  // `results` es RolledGroup[]: [{ count, sides, values }].
  dice_rolls: [
    { id: "d1", room_id: ROOM_ID, actor_id: "u3", formula: "1d20+5",
      results: [{ count: 1, sides: 20, values: [17] }], total: 22, created_at: NOW,
      profiles: { id: "u3", username: "Lyra" } },
    { id: "d2", room_id: ROOM_ID, actor_id: "u2", formula: "1d8+3",
      results: [{ count: 1, sides: 8, values: [6] }], total: 9, created_at: NOW,
      profiles: { id: "u2", username: "Brann" } },
    { id: "d3", room_id: ROOM_ID, actor_id: "u2", formula: "2d6",
      results: [{ count: 2, sides: 6, values: [3, 5] }], total: 8, created_at: NOW,
      profiles: { id: "u2", username: "Brann" } },
  ],

  combats: [
    {
      id: "cb1", room_id: ROOM_ID, active: true, round: 2, current_turn_idx: 1,
      created_at: NOW, ended_at: null,
      combatants: [
        { id: "e2", name: "Lyra", initiative: 21, entity_id: "e2" },
        { id: "e3", name: "Guardián de hueso", initiative: 14, entity_id: "e3" },
        { id: "e1", name: "Brann", initiative: 12, entity_id: "e1" },
        { id: "e4", name: "Rata gigante", initiative: 7, entity_id: "e4" },
      ],
    },
  ],
};

/* ── Stub del cliente ────────────────────────────────────────
   supabase-js encadena (.select().eq().order()…) y el resultado final
   es "thenable". Reproducimos ese contrato: cada método devuelve el
   mismo builder y al await-earlo entrega las filas.

   Los filtros de igualdad sí se aplican de verdad. No es un capricho:
   varias consultas dependen de ellos para no mezclar filas de formas
   distintas — p.ej. `room_members` filtrado por role="player" espera
   sólo filas con `rooms` anidado, y devolver también las del DM
   rompía el render. El resto de operadores de PostgREST se ignoran.  */

type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;

function builder(table: string) {
  const filters: Filter[] = [];
  let single = false;
  let limit: number | null = null;
  let sortKey: string | null = null;
  let sortAsc = true;

  const resolveRows = (): Row[] => {
    let out = ((TABLES[table] ?? []) as Row[]).filter((r) => filters.every((f) => f(r)));
    if (sortKey) {
      const k = sortKey;
      out = [...out].sort((a, b) => {
        const av = String(a[k] ?? ""), bv = String(b[k] ?? "");
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    if (limit != null) out = out.slice(0, limit);
    return out;
  };

  const chain: Record<string, unknown> = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    upsert: () => chain,
    delete: () => chain,

    eq: (col: string, val: unknown) => {
      filters.push((r) => r[col] === val);
      return chain;
    },
    neq: (col: string, val: unknown) => {
      filters.push((r) => r[col] !== val);
      return chain;
    },
    in: (col: string, vals: unknown[]) => {
      filters.push((r) => vals.includes(r[col]));
      return chain;
    },
    is: (col: string, val: unknown) => {
      filters.push((r) => (val === null ? r[col] == null : r[col] === val));
      return chain;
    },

    // Operadores que no afectan a la maqueta.
    not: () => chain,
    or: () => chain,
    gte: () => chain,
    lte: () => chain,
    range: () => chain,

    order: (col: string, opts?: { ascending?: boolean }) => {
      sortKey = col;
      sortAsc = opts?.ascending ?? true;
      return chain;
    },
    limit: (n: number) => { limit = n; return chain; },

    single: () => { single = true; return chain; },
    maybeSingle: () => { single = true; return chain; },

    then: (resolve: (v: { data: unknown; error: null }) => unknown) => {
      const rows = resolveRows();
      return resolve({ data: single ? (rows[0] ?? null) : rows, error: null });
    },
  };
  return chain;
}

/** Canal de realtime inerte: se suscribe, nunca emite. */
function channelStub() {
  const ch: Record<string, unknown> = {
    on: () => ch,
    subscribe: () => ch,
    unsubscribe: () => Promise.resolve("ok"),
    send: () => Promise.resolve("ok"),
  };
  return ch;
}

export function createPreviewClient() {
  return {
    from: (table: string) => builder(table),

    rpc: (fn: string) => {
      // join_room devuelve la sala; el resto, algo inocuo.
      const data = fn === "join_room" ? TABLES.rooms?.[0] ?? null : null;
      return { then: (r: (v: { data: unknown; error: null }) => unknown) => r({ data, error: null }) };
    },

    channel: () => channelStub(),
    removeChannel: () => Promise.resolve("ok"),

    auth: {
      getSession: () => Promise.resolve({
        data: { session: { user: PREVIEW_USER, access_token: "preview" } },
        error: null,
      }),
      getUser: () => Promise.resolve({ data: { user: PREVIEW_USER }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signInWithPassword: () => Promise.resolve({ data: {}, error: null }),
      signUp: () => Promise.resolve({ data: {}, error: null }),
      signInWithOAuth: () => Promise.resolve({ data: {}, error: null }),
      signOut: () => Promise.resolve({ error: null }),
    },

    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: { path: "preview/map.png" }, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
        remove: () => Promise.resolve({ data: null, error: null }),
      }),
    },
  };
}
