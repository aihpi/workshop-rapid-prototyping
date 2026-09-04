import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { desc, eq, isNull } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";

import { config } from "../config.ts";
import { db } from "../db/client.ts";
import { samples } from "../db/schema.ts";

const MAX_BYTES = 50 * 1024 * 1024;

/**
 * Recorded one-shots. The browser does the audio work (trim, normalise,
 * encode to WAV) and uploads a finished file, so the server needs no audio
 * libraries at all: it stores bytes on the volume and a row in the table.
 * nginx serves /uploads straight from the volume in production; Fastify's
 * static handler covers development.
 */
export const sampleRoutes: FastifyPluginAsync = async (app) => {
  await mkdir(config.samplesDir, { recursive: true });

  app.get("/api/samples", async () => {
    const rows = await db.select().from(samples).where(isNull(samples.deletedAt)).orderBy(desc(samples.createdAt));
    return rows.map(publicSample);
  });

  app.post("/api/samples", async (req, reply) => {
    const part = await req.file({ limits: { fileSize: MAX_BYTES } });
    if (!part) return reply.code(400).send({ error: "multipart file field required" });
    const buffer = await part.toBuffer();
    if (part.file.truncated) return reply.code(413).send({ error: "sample exceeds 50 MB" });
    if (part.mimetype !== "audio/wav" && part.mimetype !== "audio/x-wav" && part.mimetype !== "audio/wave") {
      return reply.code(415).send({ error: "upload WAV; the browser encodes it before sending" });
    }
    const field = (name: string): string | undefined => {
      const f = part.fields[name];
      return f && "value" in f ? String(f.value) : undefined;
    };
    const durationSec = Number(field("durationSec") ?? 0);
    if (!Number.isFinite(durationSec) || durationSec <= 0) return reply.code(400).send({ error: "durationSec field required" });

    const id = crypto.randomUUID();
    const storagePath = path.join(config.samplesDir, `${id}.wav`);
    await writeFile(storagePath, buffer);
    const [row] = await db
      .insert(samples)
      .values({
        id,
        name: (field("name") ?? "Sample").slice(0, 80),
        storagePath,
        mime: "audio/wav",
        bytes: buffer.byteLength,
        durationSec,
        sha256: createHash("sha256").update(buffer).digest("hex"),
      })
      .returning();
    return reply.code(201).send(publicSample(row!));
  });

  /** Soft delete. The file stays on the volume; undo in the client only ever tombstones the reference. */
  app.delete<{ Params: { id: string } }>("/api/samples/:id", async (req, reply) => {
    await db.update(samples).set({ deletedAt: new Date() }).where(eq(samples.id, req.params.id));
    return reply.code(204).send();
  });
};

function publicSample(row: typeof samples.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    url: `/uploads/${path.basename(row.storagePath)}`,
    bytes: row.bytes,
    durationSec: row.durationSec,
    createdAt: row.createdAt,
  };
}
