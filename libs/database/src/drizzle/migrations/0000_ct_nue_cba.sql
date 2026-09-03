CREATE TYPE "public"."currency_type" AS ENUM('ngn', 'usd');--> statement-breakpoint
CREATE TYPE "public"."user_api_scope" AS ENUM('office', 'customer', 'account', 'transaction', 'lien', 'loan', 'ledger');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'blocked', 'pending', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('human', 'api');--> statement-breakpoint
CREATE TYPE "public"."customer_gender" AS ENUM('male', 'female', 'n/a');--> statement-breakpoint
CREATE TYPE "public"."customer_status" AS ENUM('pending_verification', 'under_review', 'active', 'suspended', 'frozen', 'deactivated', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."customer_tier" AS ENUM('0', '1', '2', '3');--> statement-breakpoint
CREATE TYPE "public"."customer_type" AS ENUM('individual', 'corporate');--> statement-breakpoint
CREATE TYPE "public"."account_status" AS ENUM('pending', 'active', 'suspended', 'frozen', 'pnc', 'pnd', 'closed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('savings', 'loan');--> statement-breakpoint
CREATE TYPE "public"."loan_status" AS ENUM('active', 'pending', 'disbursed', 'paid_off', 'defaulted', 'written_off');--> statement-breakpoint
CREATE TYPE "public"."moratorium_type" AS ENUM('none', 'principal_only', 'principal_and_interest');--> statement-breakpoint
CREATE TYPE "public"."repayment_frequency" AS ENUM('daily', 'weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."lien_status" AS ENUM('active', 'released', 'voided', 'pending_approval');--> statement-breakpoint
CREATE TYPE "public"."transaction_category" AS ENUM('transfer', 'deposit', 'withdrawal', 'fee', 'interest', 'refund', 'reversal');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('successful', 'failed', 'pending', 'processing', 'reversed', 'pending_approval');--> statement-breakpoint
CREATE TYPE "public"."gl_category" AS ENUM('asset', 'liability', 'equity', 'income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."normal_balance" AS ENUM('debit', 'credit');--> statement-breakpoint
CREATE TYPE "public"."journal_entry_status" AS ENUM('posted', 'pending', 'reversed');--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email_address" text NOT NULL,
	"short_name" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "businesses_email_address_unique" UNIQUE("email_address"),
	CONSTRAINT "businesses_short_name_unique" UNIQUE("short_name")
);
--> statement-breakpoint
CREATE TABLE "offices" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"is_head_office" boolean DEFAULT false,
	"parent_id" varchar(36),
	"date_of_incorporation" date,
	"phone_number" text NOT NULL,
	"address_line1" text NOT NULL,
	"address_line2" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" integer,
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
	"tenant_id" integer,
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
CREATE TABLE "customers" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
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
CREATE TABLE "accounts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"customer_id" varchar(36) NOT NULL,
	"tenant_id" integer NOT NULL,
	"type" "account_type" DEFAULT 'savings' NOT NULL,
	"product_id" varchar(36),
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
CREATE TABLE "savings_details" (
	"account_id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"target_amount" bigint,
	"target_date" timestamp with time zone,
	"withdrawal_count_this_month" integer DEFAULT 0 NOT NULL,
	"lock_period_end" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "loan_details" (
	"account_id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
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
CREATE TABLE "liens" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"account_id" varchar(36) NOT NULL,
	"tenant_id" integer NOT NULL,
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
CREATE TABLE "transactions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
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
CREATE TABLE "general_ledgers" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
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
CREATE TABLE "journal_entries" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"transaction_id" varchar(36),
	"entry_date" timestamp with time zone NOT NULL,
	"description" text NOT NULL,
	"status" "journal_entry_status" DEFAULT 'posted' NOT NULL,
	"created_by" varchar(36),
	"approved_by" varchar(36),
	"office_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entry_lines" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"journal_entry_id" varchar(36) NOT NULL,
	"gl_account_id" varchar(36) NOT NULL,
	"debit" bigint DEFAULT 0 NOT NULL,
	"credit" bigint DEFAULT 0 NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_debit_xor_credit" CHECK (("journal_entry_lines"."debit" > 0 AND "journal_entry_lines"."credit" = 0) OR ("journal_entry_lines"."credit" > 0 AND "journal_entry_lines"."debit" = 0))
);
--> statement-breakpoint
ALTER TABLE "offices" ADD CONSTRAINT "offices_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_details" ADD CONSTRAINT "savings_details_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_details" ADD CONSTRAINT "savings_details_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_details" ADD CONSTRAINT "loan_details_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_details" ADD CONSTRAINT "loan_details_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liens" ADD CONSTRAINT "liens_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liens" ADD CONSTRAINT "liens_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liens" ADD CONSTRAINT "liens_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_sender_account_id_accounts_id_fk" FOREIGN KEY ("sender_account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_receiver_account_id_accounts_id_fk" FOREIGN KEY ("receiver_account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "general_ledgers" ADD CONSTRAINT "general_ledgers_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "general_ledgers" ADD CONSTRAINT "general_ledgers_parent_id_general_ledgers_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."general_ledgers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "general_ledgers" ADD CONSTRAINT "general_ledgers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "general_ledgers" ADD CONSTRAINT "general_ledgers_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_gl_account_id_general_ledgers_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."general_ledgers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_offices_tenant_code_unique" ON "offices" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "idx_offices_tenant" ON "offices" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_roles_tenant_name_unique" ON "roles" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "idx_roles_tenant" ON "roles" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_tenant_email_unique" ON "users" USING btree ("tenant_id","email_address");--> statement-breakpoint
CREATE INDEX "idx_users_tenant_type" ON "users" USING btree ("tenant_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_customers_tenant_external_id_unique" ON "customers" USING btree ("tenant_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_customers_tenant_email_unique" ON "customers" USING btree ("tenant_id","email_address");--> statement-breakpoint
CREATE INDEX "idx_customers_tenant_office" ON "customers" USING btree ("tenant_id","office_id");--> statement-breakpoint
CREATE INDEX "idx_customers_tenant_status" ON "customers" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_accounts_tenant_nuban" ON "accounts" USING btree ("tenant_id",("metadata"->>'nuban'));--> statement-breakpoint
CREATE INDEX "idx_accounts_tenant_customer" ON "accounts" USING btree ("tenant_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_accounts_tenant_status" ON "accounts" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_savings_details_tenant" ON "savings_details" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_loan_details_tenant" ON "loan_details" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_liens_tenant_reference_unique" ON "liens" USING btree ("tenant_id","reference");--> statement-breakpoint
CREATE INDEX "idx_liens_tenant_account" ON "liens" USING btree ("tenant_id","account_id");--> statement-breakpoint
CREATE INDEX "idx_liens_tenant_status" ON "liens" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_transactions_tenant_reference_unique" ON "transactions" USING btree ("tenant_id","reference");--> statement-breakpoint
CREATE INDEX "idx_transactions_sender" ON "transactions" USING btree ("sender_account_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_receiver" ON "transactions" USING btree ("receiver_account_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_tenant_status" ON "transactions" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_gl_tenant_code_unique" ON "general_ledgers" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "idx_gl_tenant_category" ON "general_ledgers" USING btree ("tenant_id","category");--> statement-breakpoint
CREATE INDEX "idx_journal_entries_tenant_date" ON "journal_entries" USING btree ("tenant_id","entry_date");--> statement-breakpoint
CREATE INDEX "idx_journal_entries_transaction" ON "journal_entries" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_journal_lines_gl_account" ON "journal_entry_lines" USING btree ("gl_account_id");--> statement-breakpoint
CREATE INDEX "idx_journal_lines_entry" ON "journal_entry_lines" USING btree ("journal_entry_id");