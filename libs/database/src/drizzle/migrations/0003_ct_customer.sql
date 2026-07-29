CREATE TYPE "public"."customer_gender" AS ENUM('male', 'female', 'n/a');--> statement-breakpoint
CREATE TYPE "public"."customer_status" AS ENUM('pending_verification', 'under_review', 'active', 'suspended', 'frozen', 'deactivated', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."customer_tier" AS ENUM('0', '1', '2', '3');--> statement-breakpoint
CREATE TYPE "public"."customer_type" AS ENUM('individual', 'corporate');--> statement-breakpoint
CREATE TABLE "customers" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(36) NOT NULL,
	"office_id" integer NOT NULL,
	"external_id" varchar(255),
	"status" "customer_status" DEFAULT 'pending_verification' NOT NULL,
	"tier" "customer_tier" DEFAULT '0' NOT NULL,
	"type" "customer_type" NOT NULL,
	"gender" "customer_gender" DEFAULT 'n/a' NOT NULL,
	"first_name" text,
	"last_name" text,
	"middle_name" text,
	"date_of_birth" date,
	"email_address" text NOT NULL,
	"business_name" text,
	"date_of_incorporation" date,
	"phone_number" varchar(40) NOT NULL,
	"street" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"country" text NOT NULL,
	"documents" jsonb DEFAULT '[]'::jsonb,
	"created_by" varchar(36),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_customers_tenant_external_id_unique" ON "customers" USING btree ("tenant_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_customers_tenant_email_unique" ON "customers" USING btree ("tenant_id","email_address");--> statement-breakpoint
CREATE INDEX "idx_customers_tenant_office" ON "customers" USING btree ("tenant_id","office_id");--> statement-breakpoint
CREATE INDEX "idx_customers_tenant_status" ON "customers" USING btree ("tenant_id","status");