import type { SongDoc } from "@hpi/shared";
import { integer, jsonb, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";

/**
 * The song is a document: the client holds all of it, edits all of it, and
 * saves all of it in one request. So it is stored as one, with the columns a
 * song list needs alongside for cheap listing. `rev` is the optimistic lock:
 * a save carries the rev it was based on and loses if the row has moved on.
 *
 * Samples are rows because they are listed, soft-deleted and shared between
 * songs independently of any document.
 */
export const songs = pgTable("songs", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  bpm: real("bpm").notNull(),
  rev: integer("rev").notNull().default(0),
  doc: jsonb("doc").$type<SongDoc>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const samples = pgTable("samples", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  storagePath: text("storage_path").notNull(),
  mime: text("mime").notNull(),
  bytes: integer("bytes").notNull(),
  durationSec: real("duration_sec").notNull(),
  sha256: text("sha256").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
