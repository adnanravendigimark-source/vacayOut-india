CREATE TYPE "public"."web_research_review" AS ENUM('new', 'reviewed', 'dismissed');--> statement-breakpoint
CREATE TABLE "chat_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"visitor" text NOT NULL,
	"traveller_id" uuid,
	"outcome" text NOT NULL,
	"destination" text,
	"used_guides" boolean DEFAULT false NOT NULL,
	"researched" boolean DEFAULT false NOT NULL,
	"research_cache_hit" boolean DEFAULT false NOT NULL,
	"cost_micro_usd" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"traveller_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"purpose" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "travellers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text,
	"email_verified_at" timestamp with time zone,
	"google_sub" text,
	"active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_counters" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "usage_counters_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
CREATE TABLE "web_research" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cache_key" text NOT NULL,
	"destination" text NOT NULL,
	"topic" text NOT NULL,
	"place_id" uuid,
	"facts" jsonb NOT NULL,
	"notes" text,
	"model" text NOT NULL,
	"cost_micro_usd" integer DEFAULT 0 NOT NULL,
	"hits" integer DEFAULT 1 NOT NULL,
	"review" "web_research_review" DEFAULT 'new' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "web_research_cache_key_unique" UNIQUE("cache_key")
);
--> statement-breakpoint
ALTER TABLE "chat_requests" ADD CONSTRAINT "chat_requests_traveller_id_travellers_id_fk" FOREIGN KEY ("traveller_id") REFERENCES "public"."travellers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_tokens" ADD CONSTRAINT "email_tokens_traveller_id_travellers_id_fk" FOREIGN KEY ("traveller_id") REFERENCES "public"."travellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_research" ADD CONSTRAINT "web_research_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_research" ADD CONSTRAINT "web_research_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_requests_at_idx" ON "chat_requests" USING btree ("at");--> statement-breakpoint
CREATE INDEX "email_tokens_traveller_idx" ON "email_tokens" USING btree ("traveller_id");--> statement-breakpoint
CREATE UNIQUE INDEX "travellers_email_idx" ON "travellers" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "travellers_google_idx" ON "travellers" USING btree ("google_sub") WHERE "travellers"."google_sub" is not null;--> statement-breakpoint
CREATE INDEX "usage_counters_expires_idx" ON "usage_counters" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "web_research_review_idx" ON "web_research" USING btree ("review","retrieved_at");