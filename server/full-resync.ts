import { db } from "./db";

import {
  pokemonCards,
  pokemonCardVariants,
  cardPricing,
} from "@shared/schema";

import { runScrydexSync } from "./scrydex-scraper";

import { sql } from "drizzle-orm";

export async function runFullResync() {
  console.log("Starting full resync...");

  // Optional cleanup
  console.log("Clearing variants...");
  await db.delete(pokemonCardVariants);

  console.log("Clearing pricing...");
  await db.delete(cardPricing);

  // Reset missing images if desired
  await db.execute(sql`
    UPDATE pokemon_cards
    SET image_small = NULL,
        image_large = NULL
    WHERE image_small IS NULL
       OR image_small = ''
  `);

  // Run scraper sync
  const result = await runScrydexSync((p) => {
    console.log(
      `[FullResync] ${p.phase} | Sets ${p.setsProcessed}/${p.setsTotal} | Cards ${p.cardsProcessed}`
    );
  });

  console.log("Full resync complete");

  return result;
}