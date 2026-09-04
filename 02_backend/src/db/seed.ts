import { demoSong } from "@hpi/shared";
import { isNull } from "drizzle-orm";

import { db } from "./client.ts";
import { songs } from "./schema.ts";

/** An empty database gets the demo song, so the first open plays something. */
export async function seed(): Promise<void> {
  const existing = await db.select({ id: songs.id }).from(songs).where(isNull(songs.deletedAt)).limit(1);
  if (existing.length > 0) return;
  const doc = demoSong();
  await db.insert(songs).values({ id: doc.id, title: doc.meta.title, bpm: doc.meta.bpm, rev: 0, doc }).onConflictDoNothing();
  console.log(`seeded demo song "${doc.meta.title}"`);
}
