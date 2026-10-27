# Instalación

## Desarrollo (Windows, macOS o Linux)
Requisitos: Node 24 o superior, y Docker (solo para Postgres).

```bash
npm install
cp .env.example .env
npm run db:up        # Postgres 18 en 127.0.0.1:54329
npm run dev:server   # API y WebSocket en :3000; aplica las migraciones al arrancar
npm run dev:web      # web en http://localhost:5180
```

Pruebas: `npm test`. Las del servidor crean y destruyen la base `dndonline_test` en el mismo Postgres.

Pruebas de extremo a extremo: `npm run e2e`. Levantan su propia API (:3100) y web (:5190) contra la base
`dndonline_e2e`, que recrean en cada ejecución, así que no chocan con los servidores de desarrollo. En local usan el
Microsoft Edge instalado; en otro equipo sin Edge, `npx playwright install chromium` y `CI=1 npm run e2e`.

Sin SMTP, los enlaces de verificación y recuperación aparecen en el log del servidor (`"correo (solo desarrollo)"`).

## Producción con Docker Compose (VPS)

1. Apunta el DNS del dominio al VPS y abre los puertos 80 y 443.
2. Crea `.env.prod`, que nunca se sube al repo:
   ```env
   POSTGRES_PASSWORD=<aleatoria larga>
   PUBLIC_ORIGIN=https://dndonline.tudominio.com
   DNDONLINE_DOMAIN=dndonline.tudominio.com
   ```
3. Arranca:
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
   ```
   Caddy obtiene el certificado HTTPS automáticamente. Las migraciones se aplican al arrancar el servidor, dentro de
   una transacción y con candado.

> Sin SMTP configurado, el registro funciona, pero el correo de verificación y la recuperación de contraseña **no
> llegan**. No abras el registro al público hasta tenerlo.

## Respaldo y restauración (manual)
No hay respaldo automático. Para crear un respaldo:
```bash
docker compose -f docker-compose.prod.yml exec -T db pg_dump -U dndonline -Fc dndonline > dndonline-$(date +%F).dump
```
Para verificar que el archivo se puede leer:
```bash
pg_restore --list dndonline-AAAA-MM-DD.dump > /dev/null && echo OK
```
Para restaurar, con el servidor detenido:
```bash
docker compose -f docker-compose.prod.yml stop server
docker compose -f docker-compose.prod.yml exec -T db pg_restore -U dndonline -d dndonline --clean --if-exists < dndonline-AAAA-MM-DD.dump
docker compose -f docker-compose.prod.yml start server
```
Haz un respaldo y verifícalo **antes de cada actualización**: las migraciones no se revierten solas.

## Linux sin Docker
1. Instala PostgreSQL 16 o superior y crea la base y el usuario `dndonline`.
2. Instala Node 24.
3. Ejecuta `npm ci`, define las variables de `.env.example` y arranca el servidor con `npm start -w @dndonline/server` bajo
   systemd.
4. Compila la web con `npm run build -w @dndonline/web` y sírvela, con `/api` y `/ws` redirigidos a :3000 (usa
   `deploy/Caddyfile` como referencia). Esta ruta no se ha probado todavía.
