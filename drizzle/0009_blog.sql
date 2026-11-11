CREATE TYPE "public"."blog_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"status" "blog_status" DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"quick_answer" text DEFAULT '' NOT NULL,
	"read_time" text DEFAULT '' NOT NULL,
	"author" text DEFAULT '' NOT NULL,
	"publish_date" date NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"image_alt" text DEFAULT '' NOT NULL,
	"image_credit" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"recommended_place_id" uuid,
	"cta_heading" text DEFAULT '' NOT NULL,
	"cta_body" text DEFAULT '' NOT NULL,
	"cta_button_text" text DEFAULT '' NOT NULL,
	"cta_button_href" text DEFAULT '' NOT NULL,
	"meta_title" text DEFAULT '' NOT NULL,
	"meta_description" text DEFAULT '' NOT NULL,
	"focus_keyword" text DEFAULT '' NOT NULL,
	"canonical_url" text DEFAULT '' NOT NULL,
	"no_index" boolean DEFAULT false NOT NULL,
	"no_follow" boolean DEFAULT false NOT NULL,
	"og_title" text DEFAULT '' NOT NULL,
	"og_description" text DEFAULT '' NOT NULL,
	"og_image" text DEFAULT '' NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_redirects" (
	"old_slug" text PRIMARY KEY NOT NULL,
	"post_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_recommended_place_id_places_id_fk" FOREIGN KEY ("recommended_place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_redirects" ADD CONSTRAINT "blog_redirects_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_settings" ADD CONSTRAINT "blog_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "blog_posts_slug_idx" ON "blog_posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "blog_posts_status_date_idx" ON "blog_posts" USING btree ("status","publish_date");