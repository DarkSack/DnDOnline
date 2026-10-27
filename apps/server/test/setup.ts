import postgres from "postgres";

const ADMIN_URL = process.env.TEST_DATABASE_ADMIN_URL ?? "postgres://dndonline:dndonline-dev@127.0.0.1:54329/dndonline";
export const TEST_DB = "dndonline_test";

/** Recrea la base de pruebas desde cero antes de toda la suite. */
export default async function setup() {
  const admin = postgres(ADMIN_URL, { max: 1, onnotice: () => {} });
  try {
    await admin.unsafe(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
    await admin.unsafe(`CREATE DATABASE ${TEST_DB}`);
  } finally {
    await admin.end();
  }
}
