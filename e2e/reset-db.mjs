// Recrea la base de las pruebas E2E antes de levantar su API (que aplica las migraciones al arrancar).
import postgres from "postgres";

const admin = postgres(process.env.E2E_DATABASE_ADMIN_URL ?? "postgres://dndonline:dndonline-dev@127.0.0.1:54329/dndonline", {
  max: 1,
  onnotice: () => {},
});
try {
  await admin.unsafe("DROP DATABASE IF EXISTS dndonline_e2e WITH (FORCE)");
  await admin.unsafe("CREATE DATABASE dndonline_e2e");
} finally {
  await admin.end();
}
