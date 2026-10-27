# Decisiones

Cada entrada dice qué se decidió, por qué y qué la haría cambiar.

## D1. Servidor propio en lugar de Supabase, dentro del mismo repo
DnDOnline dependía de Supabase alojado (autenticación, Realtime, RLS y Storage). El 2026-10-27 ese proyecto ya no
existía (el DNS de su URL no resuelve) y su esquema nunca estuvo en el repo. Además, el objetivo pide Postgres propio,
WebSockets propios, autohospedaje con Docker y presupuesto cero.

El repo se convirtió en monorepo: el motor pasó a `packages/engine` (99 pruebas), la web a `apps/web` y el servidor
(identidad, campañas, invitaciones y mesa) a `apps/server`. Se prototipó primero aparte, como «SacknD», y se fusionó
aquí. Las pantallas antiguas (tablero PixiJS, creador de personajes, combate) se migraron una a una al servidor propio;
el 2026-10-27 se borró el último código de Supabase junto con el modo preview.

## D2. Monolito modular con Fastify y `postgres` (sin ORM)
- **Fastify 5:** tiene WebSocket, cookies y límite de frecuencia como plugins oficiales, y buen rendimiento.
- **`postgres` (porsager):** SQL parametrizado con plantillas y sin capa de ORM. Las migraciones son archivos `.sql`
  numerados que aplica `src/db/migrate.ts` con un candado de la base (`pg_advisory_xact_lock`).
- **Cambiaría si** el modelo crece tanto que conviene tipar consultas: evaluar Kysely, que también usa SQL explícito.

## D3. Cookie de sesión opaca, no JWT
Revocar una sesión debe surtir efecto al instante, porque el prompt pide revocación de sesiones. Con un token opaco
contra la base, eso sale gratis. El costo es una consulta por petición, aceptable a esta escala.

## D4. WebSocket propio (`@fastify/websocket` / `ws`), no Socket.IO
El protocolo es pequeño: JSON validado con zod y discriminado por `type`. Así se evita una dependencia y un protocolo
extra. La reconexión con espera exponencial está en `apps/web/src/realtime/use-table.ts`.

## D5. Visibilidad por evento, filtrada en un solo sitio
Cada evento de la mesa lleva `visibility` y sale únicamente a través de `viewFor()`. Al agregar un tipo de evento nuevo
(notas del DM, etc.) hay que extender esa función y sus pruebas, no filtrar en otro lado.

El tablero sigue la misma idea con `boardViewFor()` (`modules/board/view.ts`): tras cada cambio, el servidor manda a
cada conectado el tablero entero tal como lo puede ver. A los jugadores no les llegan fichas ocultas, en la niebla o
fuera de la vista de los PC, ni los PG de enemigos y NPC. Mandar el tablero completo en vez de diferencias cuesta algo
más de red, pero así una ficha que sale de la vista no puede quedarse en el cliente por un mensaje perdido. Antes de
difundir, el servidor relee los roles de todos los conectados: un co-DM degradado deja de recibir secretos al instante.

## D6. Interfaz con shadcn/ui y el tema medieval existente
DnDOnline ya usaba shadcn/ui (estilo radix-maia) con el tema pergamino/cripta. Las pantallas nuevas reutilizan `Card`
y `Button` de `components/ui` en lugar de introducir otro sistema.

## D7. Motor del tablero: PixiJS, sin prototipo comparativo
El prompt pedía comparar Canvas 2D y PixiJS antes de elegir. DnDOnline ya tenía el tablero hecho con PixiJS 8 y
`@pixi/react` (capas de cuadrícula, niebla, muros y visibilidad), así que se migró tal cual. **No se midió** el
rendimiento con 200 fichas en un portátil modesto. Si se queda corto, ese prototipo vuelve al plan.

## D10. Imágenes de mapa dentro de Postgres
Las imágenes de escena (PNG, JPEG o WebP de hasta 5 MB, comprobadas por sus primeros bytes) se guardan como `bytea`
en `scene_images`. Así el respaldo con `pg_dump` las incluye y no hace falta un volumen ni un servicio de archivos. Los
jugadores solo pueden descargar la imagen de la escena activa.

**Límite conocido:** la imagen se descarga entera; la niebla la tapa en pantalla, no en el archivo. Un jugador con
las herramientas del navegador puede ver el mapa completo de la escena activa (pasa igual en otros VTT). **Cambiaría
si** las imágenes crecen tanto que engordan la base: moverlas a disco o a un almacenamiento S3 compatible.

## D8. Licencia del núcleo: pendiente de decidir (Sack)
Mientras no se decida, el código está **sin licencia** (todos los derechos reservados): `private: true` y sin
archivo LICENSE.

| | Apache-2.0 | MIT | AGPL-3.0 |
|--|-----------|-----|----------|
| Alguien monta un SaaS con tu código sin compartir cambios | Puede | Puede | **No puede**: debe publicar su código modificado a quien use el servicio |
| Mezclarlo con funciones premium cerradas tuyas | Fácil | Fácil | Posible solo si tú tienes todos los derechos (exige CLA a los colaboradores) o si el premium vive en un servicio aparte |
| Patente explícita | Sí | No | Sí |
| Atractivo para colaboradores y empresas | Alto | Alto | Menor (muchas empresas lo evitan) |

**Recomendación:** AGPL-3.0 para el núcleo autohospedable, con un CLA o DCO más una cesión de derechos que permita
vender la versión alojada y los módulos premium. Así un competidor no puede montar DnDOnline como servicio cerrado.
Apache-2.0 sería la opción si lo que más importa es la adopción.

## D9. Contenido de reglas: SRD 5.2.1 bajo CC-BY-4.0
Wizards of the Coast publicó el SRD 5.2.1 (reglas de 2024) bajo CC-BY-4.0. Exige atribución, enlace a la licencia e
indicar si hubo cambios (fuente: D&D Beyond, «You Can Now Publish Your Own Creations Using the New Core Rules»,
consultado el 2026-10-26).

Todavía no se ha importado nada del SRD. Cuando se haga, el paquete de reglas llevará en su manifiesto la procedencia,
la versión, la licencia y el texto de atribución exacto. **Nada fuera del SRD:** ni libros, ni nombres de producto, ni
la marca D&D como marca propia.

## D11. Combate en el servidor, ligado a la escena activa
El combate es una fila de `combats` por campaña con el estado del motor (`engine/combat`) en JSON. La iniciativa la
tira el servidor con `crypto.randomInt`. El DM y el co-DM lo inician, añaden y quitan fichas y lo terminan; un jugador
solo puede pasar el turno de una ficha suya. Cada «siguiente turno» lleva de quién creía el cliente que era el turno: si
ya cambió, no se avanza otra vez (doble clic, o DM y jugador pulsando a la vez).

- **Visibilidad:** el orden de turnos pasa por `boardViewFor`. Quien no dirige solo ve a los combatientes que ve en el
  tablero, y de enemigos y NPC no ve el d20 ni el bonus. Si le toca a alguien que no ve, el turno aparece como «alguien
  que no ves».
- **Escena:** el combate pertenece a la escena activa. Cambiar de escena lo termina y borrar la escena también; borrar
  una ficha la saca del orden sin cambiar de quién es el turno.
- **Cambiaría si** hace falta preparar un combate en una escena sin activarla, o guardar el historial de combates.
