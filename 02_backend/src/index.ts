import fastifyMultipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";

import { config } from "./config.ts";
import { sql } from "./db/client.ts";
import { sampleRoutes } from "./routes/samples.ts";
import { songRoutes } from "./routes/songs.ts";

const app = Fastify({ logger: true, bodyLimit: 20 * 1024 * 1024 });

await app.register(fastifyMultipart);
await app.register(fastifyStatic, { root: config.samplesDir, prefix: "/uploads/", decorateReply: false });
await app.register(songRoutes);
await app.register(sampleRoutes);

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
