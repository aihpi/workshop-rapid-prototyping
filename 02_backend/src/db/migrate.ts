import { existsSync } from "node:fs";

import { migrate } from "drizzle-orm/postgres-js/migrator";

import { db, sql } from "./client.ts";
import { seed } from "./seed.ts";

// Runs as a one-shot compose service before the API starts.
const folder = new URL("../../drizzle", import.meta.url).pathname;

if (!existsSync(folder)) {
  console.log("no migrations folder yet, nothing to apply");
} else {
  await migrate(db, { migrationsFolder: folder });
  console.log("migrations applied");
  await seed();
}

await sql.end();
