ALTER TYPE "public"."section_key" ADD VALUE 'visit_info';--> statement-breakpoint
ALTER TYPE "public"."section_key" ADD VALUE 'where_to_stay';--> statement-breakpoint
ALTER TYPE "public"."section_key" ADD VALUE 'food';--> statement-breakpoint
ALTER TYPE "public"."section_key" ADD VALUE 'culture_etiquette';--> statement-breakpoint
ALTER TYPE "public"."section_key" ADD VALUE 'practical_info';--> statement-breakpoint
ALTER TYPE "public"."section_key" ADD VALUE 'safety_health';--> statement-breakpoint
CREATE TABLE "itineraries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"place_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"duration_days" integer NOT NULL,
	"trip_types" text[] DEFAULT '{}'::text[] NOT NULL,
	"plan" jsonb NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"hero_media_id" uuid,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"finding_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "place_status" DEFAULT 'draft' NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"published_snapshot" jsonb,
	"published_at" timestamp with time zone,
	"published_by" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "itineraries_days_range" CHECK ("itineraries"."duration_days" between 1 and 21)
);
--> statement-breakpoint
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_hero_media_id_media_id_fk" FOREIGN KEY ("hero_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "itineraries_slug_idx" ON "itineraries" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "itineraries_place_idx" ON "itineraries" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "itineraries_status_idx" ON "itineraries" USING btree ("status");