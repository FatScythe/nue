CREATE TYPE "public"."user_api_scope" AS ENUM('dashboard', 'team', 'transaction', 'developer', 'customer', 'account', 'lien', 'product', 'loan', 'ledger', 'audit', 'configuration', 'security');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'blocked', 'pending', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('human', 'api');--> statement-breakpoint
CREATE TYPE "public"."customer_gender" AS ENUM('male', 'female', 'n/a');--> statement-breakpoint
CREATE TYPE "public"."customer_status" AS ENUM('pending_verification', 'under_review', 'active', 'suspended', 'frozen', 'deactivated', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."customer_tier" AS ENUM('0', '1', '2', '3');--> statement-breakpoint
CREATE TYPE "public"."customer_type" AS ENUM('individual', 'corporate');--> statement-breakpoint
CREATE TYPE "public"."account_status" AS ENUM('pending', 'active', 'suspended', 'frozen', 'pnc', 'pnd', 'closed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."account_product_status" AS ENUM('active', 'inactive', 'deprecated');--> statement-breakpoint
CREATE TYPE "public"."account_product" AS ENUM('savings', 'current', 'fixed_deposit', 'loan');--> statement-breakpoint
CREATE TYPE "public"."repayment_frequency" AS ENUM('daily', 'weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."loan_schedule_status" AS ENUM('scheduled', 'pending_approval', 'pending', 'paid', 'partially_paid', 'overdue', 'waived');--> statement-breakpoint
CREATE TYPE "public"."transaction_category" AS ENUM('transfer', 'deposit', 'withdrawal', 'fee', 'interest', 'refund', 'reversal');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('successful', 'failed', 'pending', 'processing', 'reversed', 'pending_approval');--> statement-breakpoint
CREATE TYPE "public"."lien_status" AS ENUM('active', 'released', 'voided', 'pending_approval');--> statement-breakpoint
CREATE TYPE "public"."savings_pool_status" AS ENUM('active', 'locked', 'matured', 'closed', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."currency_type" AS ENUM('ngn', 'usd');--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email_address" text NOT NULL,
	"short_name" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "businesses_email_address_unique" UNIQUE("email_address"),
	CONSTRAINT "businesses_short_name_unique" UNIQUE("short_name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
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
	"role_id" uuid,
	"scopes" "user_api_scope"[],
	"office_id" integer,
	"created_by" uuid,
	"approved_by" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_secret_key_unique" UNIQUE("secret_key")
);
--> statement-breakpoint
CREATE TABLE "general_ledgers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"created_by" uuid,
	"approved_by" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
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
	"created_by" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"customer_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" integer NOT NULL,
	"status" "account_status" DEFAULT 'pending' NOT NULL,
	"account_number" text NOT NULL,
	"account_name" text NOT NULL,
	"reference" text,
	"is_pooled" boolean DEFAULT false NOT NULL,
	"pool_id" uuid,
	"currency" "currency_type" DEFAULT 'ngn' NOT NULL,
	"balance" bigint DEFAULT 0,
	"book_balance" bigint DEFAULT 0,
	"created_by" uuid,
	"approved_by" uuid,
	"office_id" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_account_number_unique" UNIQUE("account_number")
);
--> statement-breakpoint
CREATE TABLE "account_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"category" "account_product" NOT NULL,
	"status" "account_product_status" NOT NULL,
	"min_balance" numeric(20, 2) DEFAULT '0.00',
	"gl_account_id" uuid NOT NULL,
	"enable_pooling" boolean DEFAULT false NOT NULL,
	"interest_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"supported_currencies" "currency_type"[] DEFAULT '{"ngn"}' NOT NULL,
	"allow_overdraft" boolean DEFAULT false NOT NULL,
	"overdraft_limit" numeric DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"approved_by" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fixed_deposit_details" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"principal_amount" bigint,
	"maturity_date" timestamp NOT NULL,
	"auto_rollover" boolean DEFAULT false,
	"penalty_rate" numeric NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"transaction_id" uuid,
	"gl_account_id" uuid NOT NULL,
	"debit" bigint DEFAULT 0 NOT NULL,
	"credit" bigint DEFAULT 0 NOT NULL,
	"description" text,
	"created_by" uuid,
	"approved_by" uuid,
	"office_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_details" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"principal_amount" bigint NOT NULL,
	"tenor_months" integer NOT NULL,
	"repayment_frequency" "repayment_frequency" DEFAULT 'monthly' NOT NULL,
	"repayment_day" integer DEFAULT 1 NOT NULL,
	"interest_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"first_payment_date" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "loan_schedules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"tenant_id" uuid,
	"installment_number" integer NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"principal_amount" bigint NOT NULL,
	"interest_amount" bigint NOT NULL,
	"total_installment" bigint NOT NULL,
	"principal_paid" bigint DEFAULT 0 NOT NULL,
	"interest_paid" bigint DEFAULT 0 NOT NULL,
	"total_paid" bigint DEFAULT 0 NOT NULL,
	"penalty_accrued" bigint DEFAULT 0 NOT NULL,
	"status" "loan_schedule_status" DEFAULT 'scheduled' NOT NULL,
	"last_payment_date" timestamp with time zone,
	"comment" text,
	"created_by" uuid,
	"approved_by" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "savings_details" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"target_amount" bigint NOT NULL,
	"target_date" timestamp with time zone,
	"withdrawal_count" integer DEFAULT 0 NOT NULL,
	"lock_period_end" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"name" text NOT NULL,
	"permissions" jsonb DEFAULT '{"dashboard":{"view":false},"security":{"resetStaffPassword":false,"unlockStaffAccount":false,"manageRoles":false,"forceLogout":false},"configuration":{"view":false,"updateConfigurations":false,"updateInterestRates":false,"updateFees":false,"updateKycLimits":false,"toggleMaintenanceMode":false,"authorize":false},"audit":{"view":false,"exportLogs":false,"authorize":false},"transaction":{"view":false,"add":false,"generateStatement":false,"generateReceipt":false,"approve":false,"reverse":false,"authorize":false},"customer":{"view":false,"add":false,"edit":false,"downloadDocuments":false,"deactivate":false,"verifyKyc":false,"authorize":false},"account":{"view":false,"viewBalance":false,"create":false,"freeze":false,"close":false,"updateLimits":false,"authorize":false},"lien":{"view":false,"add":false,"release":false,"void":false,"edit":false,"authorize":false},"product":{"view":false,"add":false,"edit":false,"deactivate":false,"authorize":false},"loan":{"view":false,"add":false,"edit":false,"disburse":false,"writeOff":false,"authorize":false},"ledger":{"view":false,"manualJournalEntry":false,"reconcile":false,"viewGlBalances":false,"authorize":false},"developer":{"view":false,"manageApiKeys":false,"whitelistIp":false,"viewWebhooks":false,"simulateTransactions":false,"authorize":false},"team":{"view":false,"add":false,"activityLog":false,"deactivate":false,"authorize":false}}'::jsonb NOT NULL,
	"created_by" uuid,
	"approved_by" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sender_account_id" uuid,
	"receiver_account_id" uuid,
	"amount" bigint NOT NULL,
	"fee" bigint DEFAULT 0 NOT NULL,
	"currency" "currency_type" DEFAULT 'ngn' NOT NULL,
	"category" "transaction_category",
	"status" "transaction_status" DEFAULT 'pending' NOT NULL,
	"reference" text NOT NULL,
	"narration" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid,
	"approved_by" uuid,
	"office_id" integer,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "account_liens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"reason" text,
	"reference" text,
	"status" "lien_status" NOT NULL,
	"created_by" uuid NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_liens_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "offices" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"is_head_office" boolean DEFAULT false,
	"date_of_incorporation" date,
	"phone_number" text NOT NULL,
	"street" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "savings_pools" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"gl_account_id" uuid NOT NULL,
	"interest_rate" numeric(5, 2) DEFAULT '0.00',
	"created_by" uuid,
	"approved_by" uuid,
	"office_id" integer,
	"status" "savings_pool_status" DEFAULT 'active',
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "general_ledgers" ADD CONSTRAINT "general_ledgers_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "general_ledgers" ADD CONSTRAINT "general_ledgers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "general_ledgers" ADD CONSTRAINT "general_ledgers_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_product_id_account_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."account_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_pool_id_savings_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."savings_pools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_products" ADD CONSTRAINT "account_products_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_products" ADD CONSTRAINT "account_products_gl_account_id_general_ledgers_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."general_ledgers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_products" ADD CONSTRAINT "account_products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_products" ADD CONSTRAINT "account_products_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_deposit_details" ADD CONSTRAINT "fixed_deposit_details_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_deposit_details" ADD CONSTRAINT "fixed_deposit_details_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_gl_account_id_general_ledgers_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."general_ledgers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_details" ADD CONSTRAINT "loan_details_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_details" ADD CONSTRAINT "loan_details_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_schedules" ADD CONSTRAINT "loan_schedules_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_schedules" ADD CONSTRAINT "loan_schedules_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_schedules" ADD CONSTRAINT "loan_schedules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_schedules" ADD CONSTRAINT "loan_schedules_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_details" ADD CONSTRAINT "savings_details_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_details" ADD CONSTRAINT "savings_details_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_sender_account_id_accounts_id_fk" FOREIGN KEY ("sender_account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_receiver_account_id_accounts_id_fk" FOREIGN KEY ("receiver_account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_liens" ADD CONSTRAINT "account_liens_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_liens" ADD CONSTRAINT "account_liens_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_liens" ADD CONSTRAINT "account_liens_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offices" ADD CONSTRAINT "offices_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_pools" ADD CONSTRAINT "savings_pools_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_pools" ADD CONSTRAINT "savings_pools_gl_account_id_general_ledgers_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."general_ledgers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_pools" ADD CONSTRAINT "savings_pools_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_pools" ADD CONSTRAINT "savings_pools_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_pools" ADD CONSTRAINT "savings_pools_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE restrict ON UPDATE no action;