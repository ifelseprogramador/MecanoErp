CREATE TYPE "public"."customer_address_kind" AS ENUM('principal', 'cobranca', 'entrega');--> statement-breakpoint
CREATE TYPE "public"."customer_ie_indicator" AS ENUM('contribuinte', 'isento', 'nao_contribuinte');--> statement-breakpoint
CREATE TABLE "customer_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"kind" "customer_address_kind" DEFAULT 'principal' NOT NULL,
	"zip" text,
	"street" text,
	"number" text,
	"complement" text,
	"district" text,
	"city" text,
	"state" text,
	"ibge_code" text,
	"country_code" text DEFAULT '1058' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "legal_name" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "trade_name" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "ie_indicator" "customer_ie_indicator" DEFAULT 'nao_contribuinte' NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "ie" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "im" text;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_addresses_organization_id_idx" ON "customer_addresses" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "customer_addresses_customer_id_idx" ON "customer_addresses" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_addresses_principal_uq" ON "customer_addresses" USING btree ("customer_id") WHERE "customer_addresses"."kind" = 'principal';