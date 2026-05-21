DROP TABLE "users" CASCADE;--> statement-breakpoint
ALTER TABLE "pokescan_users" ADD COLUMN "is_banned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pokescan_users" ADD COLUMN "banned_reason" text;--> statement-breakpoint
ALTER TABLE "pokescan_users" ADD COLUMN "banned_at" timestamp with time zone;