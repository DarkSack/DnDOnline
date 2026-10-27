import { loadConfig } from "../config.ts";
import { migrate } from "./migrate.ts";
import { createSql } from "./sql.ts";

const sql = createSql(loadConfig().databaseUrl);
try {
  const applied = await migrate(sql);
  console.log(applied.length ? `Migraciones aplicadas: ${applied.join(", ")}` : "La base ya estaba al día.");
} finally {
  await sql.end();
}
