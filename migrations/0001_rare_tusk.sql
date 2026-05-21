ALTER TABLE "pokemon_cards" RENAME TO "pokescan_cards";--> statement-breakpoint
ALTER TABLE "ebay_prices" DROP CONSTRAINT "ebay_prices_card_id_pokemon_cards_id_fk";
--> statement-breakpoint
ALTER TABLE "pokescan_cards" DROP CONSTRAINT "pokemon_cards_set_id_pokescan_sets_id_fk";
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_banned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned_at" timestamp;--> statement-breakpoint
ALTER TABLE "ebay_prices" ADD CONSTRAINT "ebay_prices_card_id_pokescan_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."pokescan_cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pokescan_cards" ADD CONSTRAINT "pokescan_cards_set_id_pokescan_sets_id_fk" FOREIGN KEY ("set_id") REFERENCES "public"."pokescan_sets"("id") ON DELETE no action ON UPDATE no action;