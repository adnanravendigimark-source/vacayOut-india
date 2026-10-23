ALTER TABLE "places" ADD COLUMN "trip_types" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "suggested_trip_types" text[] DEFAULT '{}'::text[] NOT NULL;