import { db } from "./db";
import {
  pokemonCards,
  pokemonCardVariants,
  cardPricing,
} from "@shared/schema";
import { runScrydexSync, syncVariantsFromTcgApi } from "./scrydex-scraper";
import type { ScrydexSyncProgress } from "./scrydex-scraper";
import { sql } from "drizzle-orm";

export async function runFullResync(onProgress?: (p: ScrydexSyncProgress) => void) {
  console.log("Starting full resync...");

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

  console.log("[FullResync] Starting TCG API variant sync...");
  const sets = await db
    .selectDistinct({ setId: pokemonCards.setId })
    .from(pokemonCards);

  for (const { setId } of sets) {
    if (!setId) continue;
    try {
      await syncVariantsFromTcgApi(setId, (msg) => console.log(msg));
    } catch (err: any) {
      console.error(`[FullResync] TCG variant sync failed for ${setId}:`, err.message);
    }
  }

  console.log("[FullResync] Full resync complete");
  return result;
}
