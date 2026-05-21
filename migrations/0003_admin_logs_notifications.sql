CREATE TABLE "admin_logs" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
	"action" text NOT NULL,
	"details" text,
	"actor_id" varchar(36),
	"target_id" varchar(36),
	"created_at" timestamp with time zone DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_actor_id_pokescan_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."pokescan_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_target_id_pokescan_users_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."pokescan_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
	"user_id" varchar(36) NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"link" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_pokescan_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pokescan_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint