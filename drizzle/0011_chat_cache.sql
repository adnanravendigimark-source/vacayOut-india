CREATE TABLE "chat_anon_threads" (
	"visitor" text PRIMARY KEY NOT NULL,
	"chat_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_answer_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"blocks" jsonb NOT NULL,
	"summary" text NOT NULL,
	"memory" jsonb,
	"hits" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "chat_answer_cache_expires_idx" ON "chat_answer_cache" USING btree ("expires_at");