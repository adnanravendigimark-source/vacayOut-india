CREATE TYPE "public"."candidate_status" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."claim_type" AS ENUM('general', 'price', 'schedule', 'opening_hours', 'distance', 'rule', 'contact');--> statement-breakpoint
CREATE TYPE "public"."finding_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."finding_verification" AS ENUM('unsupported', 'single_source', 'corroborated', 'conflicting');--> statement-breakpoint
CREATE TYPE "public"."research_kind" AS ENUM('place_facts', 'discover_places');--> statement-breakpoint
CREATE TYPE "public"."research_status" AS ENUM('queued', 'running', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."source_authority" AS ENUM('government', 'reference', 'media', 'travel_platform', 'other');--> statement-breakpoint
CREATE TYPE "public"."support_result" AS ENUM('not_checked', 'supports', 'partial', 'does_not_support', 'contradicts', 'quote_not_found', 'unreachable');--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finding_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"finding_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"quote" text NOT NULL,
	"source_date" text,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"support" "support_result" DEFAULT 'not_checked' NOT NULL,
	"support_note" text,
	"checked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "place_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"parent_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "place_kind" NOT NULL,
	"reason" text NOT NULL,
	"evidence" jsonb NOT NULL,
	"matched_place_id" uuid,
	"created_place_id" uuid,
	"status" "candidate_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"place_id" uuid NOT NULL,
	"section_key" "section_key",
	"topic" text NOT NULL,
	"claim" text NOT NULL,
	"original_claim" text,
	"claim_type" "claim_type" DEFAULT 'general' NOT NULL,
	"conflict_note" text,
	"verification" "finding_verification" DEFAULT 'unsupported' NOT NULL,
	"status" "finding_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "research_kind" NOT NULL,
	"place_id" uuid NOT NULL,
	"status" "research_status" DEFAULT 'queued' NOT NULL,
	"focus" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model" text NOT NULL,
	"requested_by" uuid,
	"reserved_micro_usd" integer DEFAULT 0 NOT NULL,
	"cost_micro_usd" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"search_calls" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"error" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"host" text NOT NULL,
	"site" text NOT NULL,
	"title" text,
	"authority" "source_authority" DEFAULT 'other' NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sources_url_unique" UNIQUE("url")
);
--> statement-breakpoint
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_evidence" ADD CONSTRAINT "finding_evidence_finding_id_research_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."research_findings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_evidence" ADD CONSTRAINT "finding_evidence_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_candidates" ADD CONSTRAINT "place_candidates_run_id_research_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."research_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_candidates" ADD CONSTRAINT "place_candidates_parent_id_places_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_candidates" ADD CONSTRAINT "place_candidates_matched_place_id_places_id_fk" FOREIGN KEY ("matched_place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_candidates" ADD CONSTRAINT "place_candidates_created_place_id_places_id_fk" FOREIGN KEY ("created_place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_candidates" ADD CONSTRAINT "place_candidates_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_findings" ADD CONSTRAINT "research_findings_run_id_research_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."research_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_findings" ADD CONSTRAINT "research_findings_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_findings" ADD CONSTRAINT "research_findings_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_runs" ADD CONSTRAINT "research_runs_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_runs" ADD CONSTRAINT "research_runs_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "finding_evidence_finding_idx" ON "finding_evidence" USING btree ("finding_id");--> statement-breakpoint
CREATE INDEX "place_candidates_parent_idx" ON "place_candidates" USING btree ("parent_id","status");--> statement-breakpoint
CREATE INDEX "research_findings_place_idx" ON "research_findings" USING btree ("place_id","status");--> statement-breakpoint
CREATE INDEX "research_findings_run_idx" ON "research_findings" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "research_runs_place_idx" ON "research_runs" USING btree ("place_id","created_at");--> statement-breakpoint
CREATE INDEX "research_runs_status_idx" ON "research_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "research_runs_created_idx" ON "research_runs" USING btree ("created_at");