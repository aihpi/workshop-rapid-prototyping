import { integrityIssues, migrateSong, ops } from "@hpi/shared";
import type { SongDoc } from "@hpi/shared";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { db } from "../db/client.ts";
import { songs } from "../db/schema.ts";

const saveBody = z.object({ doc: z.unknown(), rev: z.number().int().min(0) });
const createBody = z.object({ doc: z.unknown().optional() });

/** Parse, migrate, validate references and sweep orphaned patterns, or explain why not. */
function accept(raw: unknown): { doc: SongDoc } | { error: string; issues: string[] } {
  let doc: SongDoc;
  try {
    doc = migrateSong(raw);
  } catch (e) {
    return { error: "invalid song document", issues: [String(e instanceof Error ? e.message : e)] };
  }
  const issues = integrityIssues(doc);
  if (issues.length) return { error: "song document has dangling references", issues };
  ops.removeOrphanPatterns(doc);
  return { doc };
}

export const songRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/songs", async () => {
    return db
      .select({ id: songs.id, title: songs.title, bpm: songs.bpm, rev: songs.rev, updatedAt: songs.updatedAt })
      .from(songs)
      .where(isNull(songs.deletedAt))
      .orderBy(desc(songs.updatedAt));
  });

  app.get<{ Params: { id: string } }>("/api/songs/:id", async (req, reply) => {
    const [row] = await db.select().from(songs).where(and(eq(songs.id, req.params.id), isNull(songs.deletedAt)));
    if (!row) return reply.code(404).send({ error: "song not found" });
    return { doc: { ...migrateSong(row.doc), rev: row.rev }, rev: row.rev };
  });

  app.post("/api/songs", async (req, reply) => {
    const body = createBody.safeParse(req.body ?? {});
    if (!body.success) return reply.code(400).send({ error: "bad request" });
    const result = accept(body.data.doc);
    if ("error" in result) return reply.code(400).send(result);
    const { doc } = result;
    await db.insert(songs).values({ id: doc.id, title: doc.meta.title, bpm: doc.meta.bpm, rev: 0, doc: { ...doc, rev: 0 } });
    return reply.code(201).send({ id: doc.id, rev: 0 });
  });

  app.put<{ Params: { id: string } }>("/api/songs/:id", async (req, reply) => {
    const body = saveBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "body must be { doc, rev }" });
    const result = accept(body.data.doc);
    if ("error" in result) return reply.code(400).send(result);
    const { doc } = result;
    if (doc.id !== req.params.id) return reply.code(400).send({ error: "document id does not match the URL" });

    // Whole document, one transaction, and the row is locked while we compare revs.
    return db.transaction(async (tx) => {
      const [row] = await tx.select({ rev: songs.rev }).from(songs).where(and(eq(songs.id, doc.id), isNull(songs.deletedAt))).for("update");
      if (!row) return reply.code(404).send({ error: "song not found" });
      if (row.rev !== body.data.rev) return reply.code(409).send({ error: "song was saved elsewhere", rev: row.rev });
      const rev = row.rev + 1;
      await tx
        .update(songs)
        .set({ title: doc.meta.title, bpm: doc.meta.bpm, rev, doc: { ...doc, rev }, updatedAt: new Date() })
        .where(eq(songs.id, doc.id));
      return { rev };
    });
  });

  app.delete<{ Params: { id: string } }>("/api/songs/:id", async (req, reply) => {
    await db.update(songs).set({ deletedAt: new Date() }).where(eq(songs.id, req.params.id));
    return reply.code(204).send();
  });
};
