import { buildApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { migrate } from "./db/migrate.ts";
import { createSql } from "./db/sql.ts";

const config = loadConfig();
const sql = createSql(config.databaseUrl);
const applied = await migrate(sql);
const app = await buildApp({ config, sql });
if (applied.length) app.log.info({ applied }, "migraciones aplicadas");

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, async () => {
    await app.close();
    await sql.end();
    process.exit(0);
  });
}

await app.listen({ port: config.port, host: config.host });
