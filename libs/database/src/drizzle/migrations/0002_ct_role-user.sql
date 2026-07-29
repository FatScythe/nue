CREATE TYPE "public"."user_api_scope" AS ENUM('office', 'customer', 'account', 'transaction', 'lien', 'loan', 'ledger');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'blocked', 'pending', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('human', 'api');--> statement-breakpoint
CREATE TABLE "roles" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(36),
	"name" text NOT NULL,
	"permissions" jsonb DEFAULT '{"office":{"view":false,"create":false},"customer":{"view":false,"create":false},"account":{"view":false,"create":false},"transaction":{"view":false,"transfer":false,"deposit":false},"lien":{"view":false,"create":false,"release":false},"loan":{"view":false,"disburse":false,"repay":false},"ledger":{"view":false,"create":false}}'::jsonb NOT NULL,
	"created_by" varchar(36),
	"approved_by" varchar(36),
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(36),
	"type" "user_type" NOT NULL,
	"status" "user_status" NOT NULL,
	"email_address" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"other_names" text,
	"secret_key" text,
	"hashed_password" text,
	"ip_address" text[],
	"otp_key" text,
	"is_otp_enabled" boolean DEFAULT false,
	"role_id" varchar(36),
	"scopes" text[],
	"office_id" integer,
	"created_by" varchar(36),
	"approved_by" varchar(36),
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_secret_key_unique" UNIQUE("secret_key")
);
--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_roles_tenant_name_unique" ON "roles" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "idx_roles_tenant" ON "roles" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_tenant_email_unique" ON "users" USING btree ("tenant_id","email_address");--> statement-breakpoint
CREATE INDEX "idx_users_tenant_type" ON "users" USING btree ("tenant_id","type");