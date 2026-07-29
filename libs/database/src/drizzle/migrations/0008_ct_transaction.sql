CREATE TYPE "public"."transaction_category" AS ENUM('transfer', 'deposit', 'withdrawal', 'fee', 'interest', 'refund', 'reversal');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('successful', 'failed', 'pending', 'processing', 'reversed', 'pending_approval');--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(36) NOT NULL,
	"sender_account_id" varchar(36),
	"receiver_account_id" varchar(36),
	"amount" bigint NOT NULL,
	"fee" bigint DEFAULT 0 NOT NULL,
	"currency" "currency_type" DEFAULT 'ngn' NOT NULL,
	"category" "transaction_category",
	"status" "transaction_status" DEFAULT 'pending' NOT NULL,
	"reference" text NOT NULL,
	"narration" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" varchar(36),
	"approved_by" varchar(36),
	"office_id" integer,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_transactions_at_least_one_account" CHECK ("transactions"."sender_account_id" IS NOT NULL OR "transactions"."receiver_account_id" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_sender_account_id_accounts_id_fk" FOREIGN KEY ("sender_account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_receiver_account_id_accounts_id_fk" FOREIGN KEY ("receiver_account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_transactions_tenant_reference_unique" ON "transactions" USING btree ("tenant_id","reference");--> statement-breakpoint
CREATE INDEX "idx_transactions_sender" ON "transactions" USING btree ("sender_account_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_receiver" ON "transactions" USING btree ("receiver_account_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_tenant_status" ON "transactions" USING btree ("tenant_id","status");