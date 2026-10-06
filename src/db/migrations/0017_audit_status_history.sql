CREATE TABLE "status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"entity_table" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"changed_by" uuid,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "catalog_items" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "catalog_items" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "work_order_items" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "work_order_items" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "work_orders" ADD COLUMN "header_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "status_history_entity_idx" ON "status_history" USING btree ("entity_table","entity_id");