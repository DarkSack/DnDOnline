# Dos imágenes desde el mismo contexto: `--target server` (API + WebSockets) y `--target web` (Caddy con la web).
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build -w @dndonline/web

# Solo lo que el servidor necesita en ejecución: sin Vite, Playwright ni TypeScript.
FROM node:24-alpine AS server-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev -w @dndonline/server

FROM node:24-alpine AS server
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=server-deps /app/node_modules node_modules
COPY package.json ./
COPY packages/engine packages/engine
COPY apps/server apps/server
USER node
EXPOSE 3000
HEALTHCHECK CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
# shortcut: se ejecuta TypeScript con tsx en vez de compilar a JS; empaquetar con esbuild si el arranque o la memoria pesan.
CMD ["node_modules/.bin/tsx", "apps/server/src/main.ts"]

FROM caddy:2 AS web
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/dist /srv
