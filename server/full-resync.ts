import { db } from "./db";

import {
  pokemonCards,
  pokemonCardVariants,
  cardPricing,
} from "@shared/schema";

import { runScrydexSync } from "./scrydex-scraper";
import type { ScrydexSyncProgress } from "./scrydex-scraper";

import { sql } from "drizzle-orm";

export async function runFullResync(onProgress?: (p: ScrydexSyncProgress) => void) {
  console.log("Starting full resync...");

  console.log("Clearing variants...");
  await db.delete(pokemonCardVariants);

  console.log("Clearing pricing...");
  await db.delete(cardPricing);

  await db.execute(sql`
    UPDATE pokemon_cards
    SET image_small = NULL,
        image_large = NULL
    WHERE image_small IS NULL
       OR image_small = ''
  `);

  const result = await runScrydexSync((p) => {
    console.log(
      `[FullResync] ${p.phase} | Sets ${p.setsProcessed}/${p.setsTotal} | Cards ${p.cardsProcessed}`
    );
    onProgress?.(p);
  });

  console.log("Full resync complete");

  return result;
}