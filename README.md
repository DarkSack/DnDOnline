# DnDOnline

Mesa virtual de rol autohospedable: campañas, mesa en tiempo real y herramientas de DM. Reglas iniciales: D&D 5e
(SRD 5.2.1, CC-BY-4.0).

**Estado: etapa 1 en curso.** Funciona contra el servidor propio:
- Cuentas con verificación de correo y recuperación (el envío real por SMTP está pendiente).
- Campañas con roles de DM, co-DM, jugador y espectador, e invitaciones con código.
- Mesa en tiempo real con chat, susurros al DM y dados resueltos en el servidor (públicos, privados o secretos, con
  ventaja y desventaja), en español e inglés.

Personajes, tablero PixiJS y combate existen en la web, pero aún sobre el backend anterior (Supabase, que ya no
existe): solo se ven con `VITE_UI_PREVIEW=true` y datos de ejemplo. Se migran según [docs/PLAN.md](docs/PLAN.md).

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
