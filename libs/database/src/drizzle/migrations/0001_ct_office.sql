CREATE TABLE "offices" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(36) NOT NULL,
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
ALTER TABLE "offices" ADD CONSTRAINT "offices_tenant_id_businesses_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."businesses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_offices_tenant_code_unique" ON "offices" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "idx_offices_tenant" ON "offices" USING btree ("tenant_id");