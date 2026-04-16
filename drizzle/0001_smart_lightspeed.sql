CREATE TYPE "public"."deal_doc_type" AS ENUM('window_sticker', 'invoice');--> statement-breakpoint
CREATE TYPE "public"."deal_status" AS ENUM('draft', 'sent');--> statement-breakpoint
CREATE TABLE "deal_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"doc_type" "deal_doc_type" NOT NULL,
	"filename" varchar(255) NOT NULL,
	"file_data" "bytea" NOT NULL,
	"mime_type" varchar(100),
	"file_size" integer NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_number" varchar(20),
	"vehicle_year" integer,
	"vehicle_make" varchar(100),
	"vehicle_model" varchar(100),
	"vehicle_trim" varchar(100),
	"body_style" varchar(50),
	"exterior_color" varchar(100),
	"interior_color" varchar(100),
	"engine" varchar(200),
	"vin" varchar(17),
	"msrp" numeric(12, 2),
	"buying_price" numeric(12, 2),
	"hst" numeric(12, 2),
	"selling_price" numeric(12, 2),
	"currency" varchar(3) DEFAULT 'USD',
	"commission_amount" numeric(12, 2),
	"commission_for" varchar(100),
	"delivery_destination" varchar(200),
	"warehouse_address" text,
	"client_name" varchar(255),
	"client_address" text,
	"client_phone" varchar(50),
	"client_email" varchar(255),
	"notes" text,
	"email_subject" text,
	"email_body" text,
	"status" "deal_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deal_documents" ADD CONSTRAINT "deal_documents_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;