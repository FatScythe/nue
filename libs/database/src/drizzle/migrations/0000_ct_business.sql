CREATE TYPE "public"."currency_type" AS ENUM('ngn', 'usd');--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email_address" text NOT NULL,
	"short_name" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "businesses_email_address_unique" UNIQUE("email_address"),
	CONSTRAINT "businesses_short_name_unique" UNIQUE("short_name")
);
