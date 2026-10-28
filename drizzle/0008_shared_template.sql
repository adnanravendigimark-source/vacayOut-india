ALTER TYPE "public"."section_key" ADD VALUE 'key_facts';--> statement-breakpoint
ALTER TYPE "public"."section_key" ADD VALUE 'regions';--> statement-breakpoint
ALTER TYPE "public"."section_key" ADD VALUE 'neighbourhoods';--> statement-breakpoint
ALTER TYPE "public"."section_key" ADD VALUE 'who_its_for';--> statement-breakpoint
ALTER TYPE "public"."section_key" ADD VALUE 'shopping';--> statement-breakpoint
ALTER TYPE "public"."section_key" ADD VALUE 'accessibility';--> statement-breakpoint
ALTER TYPE "public"."section_key" ADD VALUE 'common_mistakes';--> statement-breakpoint
CREATE TABLE "travel_guide_places" (
	"guide_id" uuid NOT NULL,
	"place_id" uuid NOT NULL,
	CONSTRAINT "travel_guide_places_guide_id_place_id_pk" PRIMARY KEY("guide_id","place_id")
);
--> statement-breakpoint
CREATE TABLE "travel_guides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"place_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"body" jsonb NOT NULL,
	"trip_types" text[] DEFAULT '{}'::text[] NOT NULL,
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "travel_guide_places" ADD CONSTRAINT "travel_guide_places_guide_id_travel_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."travel_guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_guide_places" ADD CONSTRAINT "travel_guide_places_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_guides" ADD CONSTRAINT "travel_guides_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_guides" ADD CONSTRAINT "travel_guides_hero_media_id_media_id_fk" FOREIGN KEY ("hero_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_guides" ADD CONSTRAINT "travel_guides_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_guides" ADD CONSTRAINT "travel_guides_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "travel_guide_places_place_idx" ON "travel_guide_places" USING btree ("place_id");--> statement-breakpoint
CREATE UNIQUE INDEX "travel_guides_slug_idx" ON "travel_guides" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "travel_guides_place_idx" ON "travel_guides" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "travel_guides_status_idx" ON "travel_guides" USING btree ("status");