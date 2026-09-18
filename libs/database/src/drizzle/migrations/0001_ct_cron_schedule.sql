CREATE TABLE "cron_schedules" (
	"id" "smallserial" PRIMARY KEY NOT NULL,
	"job_name" text NOT NULL,
	"cron" text NOT NULL,
	"payload" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cron_schedules_name_unique" ON "cron_schedules" USING btree ("job_name");--> statement-breakpoint
CREATE INDEX "idx_cron_schedules_active" ON "cron_schedules" USING btree ("is_active");