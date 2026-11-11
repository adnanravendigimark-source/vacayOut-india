CREATE TYPE "public"."build_status" AS ENUM('queued', 'running', 'done', 'failed');--> statement-breakpoint
CREATE TABLE "build_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"state_name" text NOT NULL,
	"state_slug" text NOT NULL,
	"target" text,
	"status" "build_status" DEFAULT 'queued' NOT NULL,
	"progress" jsonb NOT NULL,
	"parts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"report" jsonb,
	"cost_micro_usd" integer DEFAULT 0 NOT NULL,
	"cap_micro_usd" integer NOT NULL,
	"requested_by" uuid,
	"error" text,
	"workflow_run_id" text,
	"heartbeat_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "build_jobs" ADD CONSTRAINT "build_jobs_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "build_jobs_state_idx" ON "build_jobs" USING btree ("state_slug","created_at");--> statement-breakpoint
CREATE INDEX "build_jobs_status_idx" ON "build_jobs" USING btree ("status");