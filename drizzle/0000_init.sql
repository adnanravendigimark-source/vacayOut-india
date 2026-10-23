CREATE TYPE "public"."display_mode" AS ENUM('page', 'parent_section');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."media_kind" AS ENUM('photo', 'ai_generated');--> statement-breakpoint
CREATE TYPE "public"."place_kind" AS ENUM('state', 'region', 'city', 'town', 'attraction', 'temple', 'lake', 'viewpoint', 'trek', 'activity', 'nature', 'museum');--> statement-breakpoint
CREATE TYPE "public"."place_status" AS ENUM('draft', 'in_review', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."relation_type" AS ENUM('nearby', 'day_trip');--> statement-breakpoint
CREATE TYPE "public"."section_key" AS ENUM('overview', 'highlights', 'things_to_do', 'best_time', 'how_to_reach', 'local_transport', 'travel_tips', 'faqs');--> statement-breakpoint
CREATE TYPE "public"."section_status" AS ENUM('draft', 'approved');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'editor');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"details" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_failures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"ip" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"place_id" uuid NOT NULL,
	"url" text NOT NULL,
	"storage_key" text NOT NULL,
	"content_type" text NOT NULL,
	"bytes" integer NOT NULL,
	"alt" text NOT NULL,
	"caption" text,
	"kind" "media_kind" DEFAULT 'photo' NOT NULL,
	"license" text NOT NULL,
	"attribution" text,
	"source_url" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "place_relations" (
	"from_id" uuid NOT NULL,
	"to_id" uuid NOT NULL,
	"type" "relation_type" DEFAULT 'nearby' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "place_relations_from_id_to_id_type_pk" PRIMARY KEY("from_id","to_id","type"),
	CONSTRAINT "place_relations_not_self" CHECK ("place_relations"."from_id" <> "place_relations"."to_id")
);
--> statement-breakpoint
CREATE TABLE "place_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"place_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"published_by" uuid,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "place_kind" NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_id" uuid,
	"state_id" uuid,
	"summary" text,
	"lat" double precision,
	"lng" double precision,
	"wikidata_id" text,
	"seo_title" text,
	"seo_description" text,
	"status" "place_status" DEFAULT 'draft' NOT NULL,
	"display_mode" "display_mode" DEFAULT 'page' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"hero_media_id" uuid,
	"published_version_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publish_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"place_id" uuid,
	"action" text NOT NULL,
	"paths" jsonb NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redirects" (
	"from_path" text PRIMARY KEY NOT NULL,
	"to_path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_documents" (
	"place_id" uuid PRIMARY KEY NOT NULL,
	"version_id" uuid NOT NULL,
	"path" text NOT NULL,
	"name" text NOT NULL,
	"kind" "place_kind" NOT NULL,
	"state_name" text,
	"content" text NOT NULL,
	"tsv" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(state_name, '') || ' ' || content)) STORED NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"place_id" uuid NOT NULL,
	"key" "section_key" NOT NULL,
	"body" jsonb NOT NULL,
	"status" "section_status" DEFAULT 'draft' NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"updated_by" uuid,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'editor' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_relations" ADD CONSTRAINT "place_relations_from_id_places_id_fk" FOREIGN KEY ("from_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_relations" ADD CONSTRAINT "place_relations_to_id_places_id_fk" FOREIGN KEY ("to_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_versions" ADD CONSTRAINT "place_versions_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_versions" ADD CONSTRAINT "place_versions_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_parent_id_places_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."places"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_state_id_places_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."places"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_hero_media_id_media_id_fk" FOREIGN KEY ("hero_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_published_version_id_place_versions_id_fk" FOREIGN KEY ("published_version_id") REFERENCES "public"."place_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_jobs" ADD CONSTRAINT "publish_jobs_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_documents" ADD CONSTRAINT "search_documents_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_documents" ADD CONSTRAINT "search_documents_version_id_place_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."place_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_at_idx" ON "audit_log" USING btree ("at");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "auth_failures_email_at_idx" ON "auth_failures" USING btree ("email","at");--> statement-breakpoint
CREATE INDEX "auth_failures_ip_at_idx" ON "auth_failures" USING btree ("ip","at");--> statement-breakpoint
CREATE INDEX "media_place_idx" ON "media" USING btree ("place_id");--> statement-breakpoint
CREATE UNIQUE INDEX "place_versions_place_version_idx" ON "place_versions" USING btree ("place_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "places_state_slug_idx" ON "places" USING btree ("slug") WHERE "places"."kind" = 'state';--> statement-breakpoint
CREATE UNIQUE INDEX "places_in_state_slug_idx" ON "places" USING btree ("state_id","slug") WHERE "places"."kind" <> 'state';--> statement-breakpoint
CREATE UNIQUE INDEX "places_wikidata_idx" ON "places" USING btree ("wikidata_id") WHERE "places"."wikidata_id" is not null;--> statement-breakpoint
CREATE INDEX "places_parent_idx" ON "places" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "places_status_idx" ON "places" USING btree ("status");--> statement-breakpoint
CREATE INDEX "publish_jobs_status_idx" ON "publish_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "search_documents_tsv_idx" ON "search_documents" USING gin ("tsv");--> statement-breakpoint
CREATE UNIQUE INDEX "sections_place_key_idx" ON "sections" USING btree ("place_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree (lower("email"));