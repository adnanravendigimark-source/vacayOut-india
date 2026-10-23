CREATE TABLE "app_errors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text NOT NULL,
	"message" text NOT NULL,
	"digest" text,
	"path" text
);
--> statement-breakpoint
CREATE INDEX "app_errors_at_idx" ON "app_errors" USING btree ("at");