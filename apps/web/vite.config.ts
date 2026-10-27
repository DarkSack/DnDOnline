import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// En desarrollo la web y la API comparten origen a través del proxy, igual que tras Caddy en producción.
// API_PORT: las pruebas E2E levantan su propia API sin chocar con la de desarrollo.
const api = `127.0.0.1:${process.env.API_PORT ?? 3000}`;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5180,
    strictPort: true,
    proxy: {
      "/api": `http://${api}`,
      "/ws": { target: `ws://${api}`, ws: true },
    },
  },
});
