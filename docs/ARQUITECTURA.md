# Arquitectura de DnDOnline

Estado al 2026-10-27: etapa 1 en curso. Este documento describe lo que **existe**; lo planeado está en [PLAN.md](PLAN.md).

## Vista general

```
navegador (React + Vite)          Caddy (HTTPS, estáticos)            servidor Node (Fastify)              PostgreSQL
  /            ───────────────►   /srv (web compilada)
  /api/*  fetch + cookie  ─────►  reverse_proxy  ──────────────────►  módulos HTTP           ─────────►  fuente de verdad
  /ws/*   WebSocket       ─────►  reverse_proxy  ──────────────────►  mesa en tiempo real
```

En desarrollo, el proxy de Vite (`apps/web/vite.config.ts`) cumple el papel de Caddy: web, API y WebSocket comparten
origen. Eso es lo que permite la cookie `SameSite=Lax` y la comprobación de `Origin`.

## Monorepo

| Paquete | Qué contiene |
|---------|--------------|
| `packages/engine` | Motor puro en TypeScript, sin DOM ni red: dados (incluye ventaja/desventaja), tablero (coordenadas, línea de visión), personaje (modificadores 5e) y combate (iniciativa, turnos). Antes vivía en `src/engine`; lo usan el servidor y la web. |
| `apps/server` | Monolito modular. Un módulo por dominio en `src/modules/`. |
| `apps/web` | SPA en React 19, Tailwind 4, shadcn/ui (tema pergamino/cripta) y react-router. |

### Pantallas antiguas (sin migrar)
Personajes, salas, tablero PixiJS y combate siguen escritos contra Supabase (`services/*.ts`, `realtime/use-live-*`).
Ese proyecto de Supabase ya no existe, así que `services/supabase.ts` devuelve siempre el stub de `services/preview.ts`
y esas rutas solo se registran con `VITE_UI_PREVIEW=true`. Cada una se migra al servidor propio en su tarea del plan.

## Módulos del servidor

| Módulo | Responsabilidad | Contrato que expone a otros módulos |
|--------|-----------------|-------------------------------------|
| `identity` | Registro, sesiones, verificación de correo, recuperación, revocación | `requireUser(req)`, `req.user` |
| `campaigns` | Campañas, miembros, roles, invitaciones | `authorize(sql, campaignId, userId, action)`, `can(role, action)` |
| `table` | Sala en tiempo real: chat, dados, presencia | eventos `TableEvent` y la función `viewFor` |
| `audit` | Registro de operaciones sensibles | `audit(sql, actor, action, target, data)` |

Los módulos de personajes, reglas, tablero (escenas y tokens), comunidad, biblioteca, IA y administración todavía no
existen. Se crean cuando tengan código, siguiendo el mismo patrón: `routes.ts`, más un archivo de permisos o
repositorio cuando haga falta.

## Reglas de seguridad que ya están en el código

- **Autorización en el servidor en cada operación.** `authorize()` consulta la base en cada petición HTTP y en cada
  mensaje de WebSocket, así que una expulsión o un cambio de rol cuentan al instante. A quien no es miembro se le
  responde 404 para no revelar que la campaña existe.
- **Matriz de permisos** en `campaigns/permissions.ts`, con los roles DM, co-DM, jugador y espectador. El co-DM gestiona
  la campaña, pero no cambia roles. Nadie puede degradar ni expulsar al propietario.
- **Secretos de la mesa.** Todo evento pasa por `viewFor(evento, espectador)` antes de salir, tanto en el historial como
  en vivo. En una tirada secreta, quien tira recibe `total: null`. Hay pruebas de aislamiento entre DM, jugador y
  espectador en `test/table.test.ts`.
- **Sesiones.** El token tiene 256 bits y solo se guarda su SHA-256. La cookie es `httpOnly` y `SameSite=Lax`, con
  `Secure` en https. Hay cierre de sesión individual y global, y cambiar la contraseña cierra todas las sesiones.
- **Contraseñas.** Se guardan con argon2id (`@node-rs/argon2`). El login gasta el mismo tiempo exista o no el correo, y
  `forgot` no revela si el correo está registrado.
- **CSRF y secuestro de WebSocket.** Toda petición que no sea GET, y todo upgrade a WebSocket, exige que el `Origin` sea
  `PUBLIC_ORIGIN`.
- **Límites.**
  - Global de 300 peticiones/min por IP.
  - Autenticación: 10/min por IP, configurable con `AUTH_RATE_LIMIT`.
  - WebSocket: bolsa de 10 mensajes por conexión, que recarga 2 por segundo, con mensajes de 16 KB como máximo.
  - Cuerpo HTTP de 64 KB como máximo.
- **Logs.** Se omiten la cookie, la cabecera `authorization` y `set-cookie`. Los enlaces de correo no se registran en
  producción. La auditoría nunca guarda tokens.
- **Dados.** Las tiradas se resuelven en el servidor con `crypto.randomInt` y quedan guardadas. Aún **no** son
  verificables criptográficamente (commit-reveal); está pendiente en el plan.

## Limitaciones conocidas (marcadas con `shortcut:` en el código)

- Las salas de tiempo real viven en la memoria del proceso, así que solo puede haber **una instancia** del servidor.
  Para escalar hace falta Redis pub/sub (`modules/table/routes.ts`).
- **No se envían correos.** En desarrollo el enlace sale en el log; en producción se descarta
  (`modules/identity/mailer.ts`). Antes de abrir el registro al público hace falta SMTP.
- El contenedor ejecuta TypeScript con `tsx`, sin compilar.
