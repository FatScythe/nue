CREATE TABLE "savings_details" (
	"account_id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(36) NOT NULL,
	"target_amount" bigint,
	"target_date" timestamp with time zone,
	"withdrawal_count_this_month" integer DEFAULT 0 NOT NULL,
	"lock_period_end" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "savings_details" ADD CONSTRAINT "savings_details_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_details" ADD CONSTRAINT "savings_details_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_savings_details_tenant" ON "savings_details" USING btree ("tenant_id");