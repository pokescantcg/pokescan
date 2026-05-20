import { db } from "./db";
import { pokemonCards, pokemonCardVariants, cardPricing } from "@shared/schema";
import { runScrydexSync, syncVariantsFromTcgApi } from "./scrydex-scraper";
import type { ScrydexSyncProgress } from "./scrydex-scraper";
import { sql } from "drizzle-orm";

// Enhanced progress tracking
export interface FullResyncProgress extends ScrydexSyncProgress {
  setsAdded: number;
  cardsAdded: number;
  variantsAdded: number;
  pricesAdded: number;
  phase: string;
}

// Track totals across the resync
let resyncStats = {
  setsAdded: 0,
  cardsAdded: 0,
  variantsAdded: 0,
  pricesAdded: 0,
};

export async function runFullResync(
  onProgress?: (p: FullResyncProgress) => void,
) {
  console.log("Starting full resync...");

  // Reset stats at start
  resyncStats = {
    setsAdded: 0,
    cardsAdded: 0,
    variantsAdded: 0,
    pricesAdded: 0,
  };

  // Phase 1: Clear old images
  console.log("[FullResync] Clearing old images...");
  onProgress?.({
    phase: "images",
    setsProcessed: 0,
    setsTotal: 0,
    cardsProcessed: 0,
    setsAdded: 0,
    cardsAdded: 0,
    variantsAdded: 0,
    pricesAdded: 0,
  });

  await db.execute(sql`
    UPDATE pokemon_cards
    SET image_small = NULL,
        image_large = NULL
    WHERE image_small IS NULL
       OR image_small = ''
  `);

  // Phase 2: Main Scrydex sync
  console.log("[FullResync] Starting Scrydex sync...");
  const result = await runScrydexSync((p) => {
    // Update stats from progress
    resyncStats.setsAdded = p.setsProcessed || 0;
    resyncStats.cardsAdded = p.cardsProcessed || 0;

    console.log(
      `[FullResync] ${p.phase} | Sets ${p.setsProcessed}/${p.setsTotal} | Cards ${p.cardsProcessed}`,
    );

    // Send enhanced progress
    onProgress?.({
      ...p,
      setsAdded: resyncStats.setsAdded,
      cardsAdded: resyncStats.cardsAdded,
      variantsAdded: resyncStats.variantsAdded,
      pricesAdded: resyncStats.pricesAdded,
    });
  });

  // Phase 3: TCG API variant sync
  console.log("[FullResync] Starting TCG API variant sync...");
  const sets = await db
    .selectDistinct({ setId: pokemonCards.setId })
    .from(pokemonCards);

  let setCount = 0;
  for (const { setId } of sets) {
    if (!setId) continue;
    try {
      setCount++;
      // Track variant progress
      resyncStats.variantsAdded += 1;

      console.log(
        `[FullResync] Syncing variants for set ${setCount}/${sets.length}`,
      );

      await syncVariantsFromTcgApi(setId, (msg) => {
        console.log(msg);
        onProgress?.({
          phase: "variants",
          setsProcessed: setCount,
          setsTotal: sets.length,
          cardsProcessed: resyncStats.cardsAdded,
          setsAdded: resyncStats.setsAdded,
          cardsAdded: resyncStats.cardsAdded,
          variantsAdded: resyncStats.variantsAdded,
          pricesAdded: resyncStats.pricesAdded,
        });
      });
    } catch (err: any) {
      console.error(
        `[FullResync] TCG variant sync failed for ${setId}:`,
        err.message,
      );
    }
  }

  console.log("[FullResync] Full resync complete");
  console.log(
    `[FullResync] Final stats: Sets=${resyncStats.setsAdded}, Cards=${resyncStats.cardsAdded}, Variants=${resyncStats.variantsAdded}, Prices=${resyncStats.pricesAdded}`,
  );

  // Send final progress
  onProgress?.({
    phase: "complete",
    setsProcessed: resyncStats.setsAdded,
    setsTotal: resyncStats.setsAdded,
    cardsProcessed: resyncStats.cardsAdded,
    setsAdded: resyncStats.setsAdded,
    cardsAdded: resyncStats.cardsAdded,
    variantsAdded: resyncStats.variantsAdded,
    pricesAdded: resyncStats.pricesAdded,
  });

  return result;
}

// Export function to get current stats (for API endpoint)
export function getResyncStats() {
  return resyncStats;
}
