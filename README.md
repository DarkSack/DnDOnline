# dndonline

Virtual Tabletop de D&D en tiempo real. Multiplayer, con mapas, tokens, dados,
combate, chat, fog of war y line of sight.

**Stack:** React 19 · Vite · TypeScript · Tailwind · shadcn/ui · PixiJS +
`@pixi/react` · Supabase (Auth · Postgres · Realtime · Storage).

## Estado del proyecto

Todas las fases del roadmap original operativas end-to-end:

| Fase | Descripción | Estado |
|---|---|---|
| 1 | Authentication (email + Google) | ✅ |
| 2 | Rooms (campañas + salas + join por código) | ✅ |
| 3 | Realtime (presence + postgres_changes) | ✅ |
| 4 | Character Creator (multi-step) | ✅ |
| 5 | Virtual Board (Pixi, drag, spawn, HP, visibility) | ✅ |
| 6 | Dynamic Monster Spawn | ✅ (incluido en 5d) |
| 8 | Dice (server-authoritative) | ✅ |
| 9 | Combat (initiative, turnos, rondas) | ✅ |
| 10 | Advanced Map (mapa fondo + fog + LOS + walls) | ✅ |
| + | Chat de sala | ✅ |

## Arquitectura

```
src/
├─ engine/           motor puro TS (sin React, sin DOM). Testeable en Node.
│  ├─ board/         tipos, coords, catálogo criaturas, LOS/raycast
│  ├─ character/     sheet, atributos, modificadores D&D 5e
│  ├─ combat/        combatientes, turnos
│  └─ dice/          parser, formato, breakdown
├─ realtime/         hooks Supabase realtime (canal por sala, hooks por dominio)
├─ services/         thin wrappers tipados sobre Supabase (CRUD + RPCs)
├─ app/
│  ├─ pages/         páginas de la app (Room, CampaignDetail, ...)
│  └─ components/    UI por dominio (board, chat, combat, dice, room, ...)
└─ components/ui/    primitives shadcn (Button, Card)
```

**Regla dura**: `engine/` no importa React ni el cliente Supabase. Puede
correrse en un Edge Function o en tests sin browser.

## Setup local

```bash
npm install
cp .env.example .env.local
# Rellena VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

Los detalles de la instancia Supabase están en `.env.example`. El schema
está en Supabase migrations aplicadas directamente vía el MCP durante el
desarrollo.

### Scripts

```bash
npm run dev        # Vite dev server
npm run build      # tsc + vite build
npm run preview    # servir el build
npm run lint       # eslint
npm run test       # vitest watch
npm run test:run   # vitest single-shot (para CI)
```

## Deploy a Vercel

1. Crea el repo en GitHub.
2. Sube el código: `git init && git add . && git commit -m "init" && git push`.
3. En Vercel → New Project → importa el repo.
4. Framework preset: Vite. `vercel.json` ya está listo — no toques ajustes.
5. En **Environment Variables** añade:
   - `VITE_SUPABASE_URL` = `https://nrwetrddwjcipcsfwfbv.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = tu key `sb_publishable_...`
6. Deploy.
7. En Supabase → Auth → URL Configuration:
   - Añade la URL de Vercel como Site URL.
   - Añade también en Redirect URLs.

Para el OAuth de Google necesitas configurar Client ID/Secret en Supabase
Auth → Providers → Google, apuntando el callback al dominio de Vercel.

## CI

`.github/workflows/ci.yml` corre en cada PR y push a `main`:
- `npm run lint`
- `npm run test:run`
- `npm run build` (necesita los secrets `VITE_SUPABASE_URL` y
  `VITE_SUPABASE_PUBLISHABLE_KEY` en el repo)

## Testing

95 tests unit del engine puro (dice, coords, character, combat, LOS).
```bash
npm run test:run
```

No hay tests de UI ni e2e todavía. Pendiente: Playwright.

## Modelo de datos

Tablas en `public`:
- `profiles` — 1:1 con `auth.users`
- `campaigns` — DM owns
- `rooms` — join_code, active_map_id, fog jsonb, walls jsonb
- `room_members` — user + role (dm|player) + character_id
- `characters` — owner + sheet jsonb (versionado)
- `maps` — campaign owned, image en Storage bucket `maps`
- `entities` — tokens en el tablero (row, col, hp, visible, character_id)
- `combats` — 1 activo por sala (unique parcial), combatants jsonb
- `dice_rolls` — audit inmutable de tiradas
- `room_messages` — chat inmutable

Schema `internal` (no expuesto por PostgREST):
- `is_room_member(rid)`, `is_room_dm(rid)`, `owns_entity_character(eid)`

RPCs (`public`):
- `join_room(code)`, `roll_dice(...)`, `start_combat(...)`

## Seguridad

- RLS en todas las tablas de public.
- Server-authoritative para dados y iniciativa (RPCs con `random()`).
- Storage bucket `maps` público de lectura; writes solo DM de la campaña.

## Pendiente

- Tests e2e (Playwright)
- Sonido / animaciones
- Upload de avatares
- Modo pantalla completa
- Undo
- Persistencia de viewport
- Import de mapas (Foundry, Dungeondraft)
- Spells con áreas de efecto
- Campañas con `sessions` / notas del DM
