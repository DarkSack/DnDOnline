# DnDOnline

Mesa virtual de rol autohospedable: campañas, mesa en tiempo real y herramientas de DM. Reglas iniciales: D&D 5e
(SRD 5.2.1, CC-BY-4.0).

**Estado: etapa 1 en curso.** Funciona contra el servidor propio:
- Cuentas con verificación de correo y recuperación (el envío real por SMTP está pendiente).
- Campañas con roles de DM, co-DM, jugador y espectador, e invitaciones con código.
- Mesa en tiempo real con chat, susurros al DM y dados resueltos en el servidor (públicos, privados o secretos, con
  ventaja y desventaja), en español e inglés.
- Personajes con ficha 5e (creador por pasos); el DM ve las fichas de los personajes de su campaña.
- Tablero en la mesa (PixiJS): escenas con mapa, niebla, paredes con línea de visión y fichas. Cada jugador mueve las
  de su personaje y solo recibe lo que puede ver.

Falta el combate (iniciativa y turnos), que se migra según [docs/PLAN.md](docs/PLAN.md).

- [Instalación (desarrollo, Docker, respaldo)](docs/INSTALACION.md)
- [Arquitectura y seguridad](docs/ARQUITECTURA.md)
- [Decisiones](docs/DECISIONES.md)

```bash
npm install && cp .env.example .env && npm run db:up
npm run dev:server   # :3000
npm run dev:web      # http://localhost:5180
npm test             # motor + servidor (necesita el Postgres de db:up)
```

## Licencia
Pendiente de decidir (ver D8 en [docs/DECISIONES.md](docs/DECISIONES.md)). Mientras tanto, todos los derechos
reservados.
