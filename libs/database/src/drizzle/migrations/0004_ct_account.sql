CREATE TYPE "public"."account_status" AS ENUM('pending', 'active', 'suspended', 'frozen', 'pnc', 'pnd', 'closed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('savings', 'loan');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"customer_id" varchar(36) NOT NULL,
	"tenant_id" varchar(36) NOT NULL,
	"type" "account_type" DEFAULT 'savings' NOT NULL,
	"status" "account_status" DEFAULT 'pending' NOT NULL,
	"account_number" text NOT NULL,
	"account_name" text NOT NULL,
	"reference" text,
	"currency" "currency_type" DEFAULT 'ngn' NOT NULL,
	"balance" bigint DEFAULT 0 NOT NULL,
	"book_balance" bigint DEFAULT 0 NOT NULL,
	"created_by" varchar(36),
	"approved_by" varchar(36),
	"office_id" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_account_number_unique" UNIQUE("account_number")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_accounts_tenant_nuban" ON "accounts" USING btree ("tenant_id",("metadata"->>'nuban'));--> statement-breakpoint
CREATE INDEX "idx_accounts_tenant_customer" ON "accounts" USING btree ("tenant_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_accounts_tenant_status" ON "accounts" USING btree ("tenant_id","status");