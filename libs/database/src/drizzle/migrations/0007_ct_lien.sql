CREATE TYPE "public"."lien_status" AS ENUM('active', 'released', 'voided', 'pending_approval');--> statement-breakpoint
CREATE TABLE "liens" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"account_id" varchar(36) NOT NULL,
	"tenant_id" varchar(36) NOT NULL,
	"amount" bigint NOT NULL,
	"reason" text,
	"reference" text,
	"status" "lien_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_by" varchar(36) NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "liens" ADD CONSTRAINT "liens_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liens" ADD CONSTRAINT "liens_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liens" ADD CONSTRAINT "liens_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_liens_tenant_reference_unique" ON "liens" USING btree ("tenant_id","reference");--> statement-breakpoint
CREATE INDEX "idx_liens_tenant_account" ON "liens" USING btree ("tenant_id","account_id");--> statement-breakpoint
CREATE INDEX "idx_liens_tenant_status" ON "liens" USING btree ("tenant_id","status");