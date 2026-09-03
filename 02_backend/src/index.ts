import Fastify from "fastify";

import { config } from "./config.ts";
import { sql } from "./db/client.ts";

const app = Fastify({ logger: true });

app.get("/api/health", async () => {
  let dbStatus = "ok";
  try {
    await sql`select 1`;
  } catch {
    dbStatus = "unreachable";
  }
  return { status: "ok", db: dbStatus };
});

app.addHook("onClose", async () => {
  await sql.end();
});

await app.listen({ port: config.port, host: config.host });
