CREATE TYPE "public"."loan_status" AS ENUM('active', 'pending', 'disbursed', 'paid_off', 'defaulted', 'written_off');--> statement-breakpoint
CREATE TYPE "public"."moratorium_type" AS ENUM('none', 'principal_only', 'principal_and_interest');--> statement-breakpoint
CREATE TYPE "public"."repayment_frequency" AS ENUM('daily', 'weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TABLE "loan_details" (
	"account_id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(36) NOT NULL,
	"principal_amount" bigint NOT NULL,
	"outstanding_balance" bigint NOT NULL,
	"tenor" integer NOT NULL,
	"repayment_frequency" "repayment_frequency" DEFAULT 'monthly' NOT NULL,
	"interest_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"status" "loan_status" DEFAULT 'active' NOT NULL,
	"processing_fee" bigint DEFAULT 0 NOT NULL,
	"moratorium_type" "moratorium_type" DEFAULT 'none' NOT NULL,
	"moratorium_period" integer DEFAULT 0 NOT NULL,
	"repayment_start_date" timestamp with time zone NOT NULL,
	"disbursed_at" timestamp with time zone,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "loan_details" ADD CONSTRAINT "loan_details_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_details" ADD CONSTRAINT "loan_details_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_loan_details_tenant" ON "loan_details" USING btree ("tenant_id");