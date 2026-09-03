CREATE TABLE "samples" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"storage_path" text NOT NULL,
	"mime" text NOT NULL,
	"bytes" integer NOT NULL,
	"duration_sec" real NOT NULL,
	"sha256" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "songs" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"bpm" real NOT NULL,
	"rev" integer DEFAULT 0 NOT NULL,
	"doc" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
