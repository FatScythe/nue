CREATE TYPE "public"."gl_category" AS ENUM('asset', 'liability', 'equity', 'income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."normal_balance" AS ENUM('debit', 'credit');--> statement-breakpoint
CREATE TABLE "general_ledgers" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(36) NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" "gl_category" NOT NULL,
	"normal_balance" "normal_balance" NOT NULL,
	"parent_id" varchar(36),
	"allow_direct_booking" boolean DEFAULT true NOT NULL,
	"created_by" varchar(36),
	"approved_by" varchar(36),
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "general_ledgers" ADD CONSTRAINT "general_ledgers_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "general_ledgers" ADD CONSTRAINT "general_ledgers_parent_id_general_ledgers_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."general_ledgers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "general_ledgers" ADD CONSTRAINT "general_ledgers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "general_ledgers" ADD CONSTRAINT "general_ledgers_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_gl_tenant_code_unique" ON "general_ledgers" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "idx_gl_tenant_category" ON "general_ledgers" USING btree ("tenant_id","category");