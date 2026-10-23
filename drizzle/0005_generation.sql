ALTER TYPE "public"."research_kind" ADD VALUE 'generate';--> statement-breakpoint
ALTER TYPE "public"."research_kind" ADD VALUE 'image';--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "license_url" text;--> statement-breakpoint
ALTER TABLE "research_runs" ADD COLUMN "parent_run_id" uuid;--> statement-breakpoint
ALTER TABLE "research_runs" ADD COLUMN "step_key" text;--> statement-breakpoint
ALTER TABLE "research_runs" ADD COLUMN "lease_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "research_runs" ADD COLUMN "openai_response_id" text;--> statement-breakpoint
ALTER TABLE "research_runs" ADD COLUMN "billed_responses" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "research_runs" ADD COLUMN "progress" jsonb;--> statement-breakpoint
ALTER TABLE "research_runs" ADD COLUMN "workflow_run_id" text;--> statement-breakpoint
ALTER TABLE "research_runs" ADD COLUMN "heartbeat_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sections" ADD COLUMN "finding_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "research_runs" ADD CONSTRAINT "research_runs_parent_run_id_research_runs_id_fk" FOREIGN KEY ("parent_run_id") REFERENCES "public"."research_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "research_runs_parent_step_idx" ON "research_runs" USING btree ("parent_run_id","step_key") WHERE "research_runs"."parent_run_id" is not null;