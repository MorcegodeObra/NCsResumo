// Aplica db/schema.sql no banco de DATABASE_URL (npm run db:migrar). O schema é idempotente.
import postgres from "postgres";
import { readFileSync } from "node:fs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL (ex.: node --env-file=.env back/scripts/migrar.mjs).");
  process.exit(1);
}
const sql = postgres(url, { max: 1 });
try {
  await sql.unsafe(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
  console.log("Schema aplicado.");
} finally {
  await sql.end();
}
