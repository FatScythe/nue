CREATE TYPE "public"."journal_entry_status" AS ENUM('posted', 'pending', 'reversed');--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(36) NOT NULL,
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
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_office_id_offices_id_fk" FOREIGN KEY ("office_id") REFERENCES "public"."offices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_journal_entry_id_journal_entries_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_gl_account_id_general_ledgers_id_fk" FOREIGN KEY ("gl_account_id") REFERENCES "public"."general_ledgers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_journal_entries_tenant_date" ON "journal_entries" USING btree ("tenant_id","entry_date");--> statement-breakpoint
CREATE INDEX "idx_journal_entries_transaction" ON "journal_entries" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_journal_lines_gl_account" ON "journal_entry_lines" USING btree ("gl_account_id");--> statement-breakpoint
CREATE INDEX "idx_journal_lines_entry" ON "journal_entry_lines" USING btree ("journal_entry_id");