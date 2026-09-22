CREATE TYPE "public"."billing_status" AS ENUM('em_dia', 'atrasado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."organization_status" AS ENUM('active', 'blocked');--> statement-breakpoint
CREATE TABLE "organization_module_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"module_slug" text NOT NULL,
	"enabled" boolean NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_admins" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "status" "organization_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "billing_status" "billing_status" DEFAULT 'em_dia' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "next_due_date" date;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "billing_notes" text;--> statement-breakpoint
ALTER TABLE "organization_module_settings" ADD CONSTRAINT "organization_module_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "org_module_settings_unique" ON "organization_module_settings" USING btree ("organization_id","module_slug");