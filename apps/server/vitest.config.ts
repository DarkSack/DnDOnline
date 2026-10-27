import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    globalSetup: ["test/setup.ts"],
    // Comparten la base de pruebas; los datos no chocan (correos aleatorios), pero así los logs se leen.
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
