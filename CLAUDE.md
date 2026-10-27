# DnDOnline: notas para trabajar en el repo

- Responder y documentar en español. Leer `docs/PLAN.md` (qué sigue) y `docs/DECISIONES.md` antes de cambiar algo.
- Monorepo npm: `packages/engine` (TS puro, sin DOM ni red), `apps/server` (Fastify, un módulo por dominio en
  `src/modules/`) y `apps/web` (React, Tailwind 4 y shadcn/ui).
- Permisos: toda ruta llama a `authorize()` o a `requireUser()`; todo mensaje WS revalida el rol contra la base. Todo
  evento visible para otros pasa por `viewFor()` y lleva una prueba de aislamiento en `test/table.test.ts`.
- Errores: lanzar `HttpError(status, "codigo")`. El código se traduce en `apps/web/src/services/i18n.ts` (es y en): añadir
  ambos.
- Migraciones: archivo nuevo `apps/server/migrations/NNNN_nombre.sql`. Nunca editar una ya aplicada.
- Pruebas: `npm run db:up` y después `npm test` (crea `dndonline_test`). Tipos con `npm run typecheck`.
- npm en este equipo: instalar dependencias de ejecución y de desarrollo en **comandos separados** y revisar
  `package.json` después, porque una vez se perdió el bloque `dependencies`.
- Los heredocs con comillas en Git Bash fallan a veces: escribir archivos con la herramienta Write.
- Vista previa: `dndonline-server` y `dndonline-web` en `E:\Dev\.claude\launch.json`.
- Pantallas antiguas (personajes, salas, tablero, combate) usan el stub de Supabase y solo existen con
  `VITE_UI_PREVIEW=true`. No añadir código nuevo contra `services/supabase.ts`: migrar al servidor propio.
- `typescript` va fijado a 6.x en la raíz: con la 7 (sin API de JS) typescript-eslint deja de funcionar.
- Nunca: secretos en el repo, contraseñas o tokens en logs ni en la auditoría, ni contenido de D&D fuera del SRD.
