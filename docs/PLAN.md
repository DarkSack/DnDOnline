# Plan de implementación

Cada tarea entra en «hecho» solo si cumple cinco condiciones: persiste, maneja errores, respeta permisos, tiene pruebas
y tiene interfaz funcional.

## Etapa 1: base funcional

| # | Tarea | Estado |
|---|-------|--------|
| 1.1 | Monorepo, TypeScript estricto, CI (tipos, pruebas con Postgres real, build, `npm audit`) | ✅ en verde en GitHub. El paso E2E se añadió el 2026-10-27 y aún no ha corrido allí |
| 1.2 | Identidad: registro, login, logout, logout global, verificación de correo, recuperación | ✅ excepto el **envío real de correo (SMTP)** |
| 1.3 | Campañas: crear, listar, roles, invitaciones con usos y caducidad, revocar, expulsar, cambiar rol | ✅ |
| 1.4 | Mesa en tiempo real: chat público y susurro al DM, dados públicos, privados y secretos con ventaja/desventaja, presencia, historial filtrado | ✅ |
| 1.5 | i18n es/en desde el inicio | ✅ en las pantallas nuevas (diccionarios en `apps/web/src/services/i18n.ts`); las antiguas siguen solo en español |
| 1.6 | Docker (servidor + Caddy con HTTPS) y compose de producción | escrito; sin construir ni desplegar desde la fusión |
| 1.7 | **Personajes básicos**: ficha 5e (atributos, competencias, PG, CA, nivel), CRUD con dueño y visibilidad para DM | ✅ salvo **competencias** (la ficha aún no las tiene). Creador y ficha solo en español |
| 1.8 | **Prototipo del tablero**: Canvas 2D frente a PixiJS con 200 tokens, niebla y LOS en un portátil modesto; medir FPS y memoria | descartado: se quedó PixiJS, que ya funcionaba (D7). Sin medir rendimiento con 200 fichas |
| 1.9 | **Escenas y tokens**: mapa, cuadrícula, tokens con dueño, movimiento autorizado por mensaje, tokens ocultos (por `viewFor`) | ✅ (imagen del mapa en la base, ver D10). La niebla y las paredes se pintan casilla a casilla |
| 1.10 | **Combate**: iniciativa, turnos, PG; reutilizar `engine/combat` | ✅ La iniciativa se tira en el servidor (1d20 + bonus; un PC sin bonus usa el de su ficha). Los PG van en las fichas del tablero (1.9). Ver D11 |
| 1.11 | E2E con Playwright: registro → campaña → invitación → personaje → sesión con dos navegadores | ✅ `npm run e2e` (`e2e/sesion.spec.ts`), del registro al combate. En local usa el Edge instalado; en CI, Chromium |

## Etapa 2: fiabilidad
- Paquete de reglas SRD 5.2.1 con manifiesto (versión, procedencia, licencia, atribución) y validación de fichas.
- Permisos por recurso y excepciones temporales.
- Exportación e importación de campañas con manifiesto y validación.
- Comandos de respaldo y restauración probados (hoy solo están documentados con `pg_dump`).
- Dados verificables (commit-reveal con semilla del servidor revelada al final de la sesión) y su documentación.
- Pruebas de carga del WebSocket. Redis pub/sub si hace falta más de una instancia.
- PWA y edición offline de personajes con cola de operaciones idempotentes.

## Etapa 3: diferenciadores
Editor avanzado de mapas, generación procedural, DM asistido por IA con proveedores locales (Ollama/LM Studio) y
herramientas con esquemas validados, voz (evaluar LiveKit autohospedado), TTS, comunidades, biblioteca pública y
mercado.

## Decisiones que esperan a Sack
1. Licencia del núcleo (D8 en DECISIONES.md).
2. Dominio y VPS para el primer despliegue.
3. Proveedor SMTP (por ejemplo, el mismo que necesita LevelUp).
