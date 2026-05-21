import { Router } from "express";
import { db } from "../db"; // Your Drizzle client
import {
  pokemonCards,
  pokemonCardVariants,
  pokemonSets,
} from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { ALL_SETS, getSymbolUrl } from "../../lib/set-database"; // Your existing set database

const router = Router();

/**
 * POST /api/sync/card-on-scan
 * Called when scanner finds a card in TCG API but not in DB.
 * Inserts: set (if missing) → card → standard variants
 * Returns: { success, cardId, variantIds }
 */
router.post("/card-on-scan", async (req, res) => {
  try {
    const { tcgApiCard, tcgApiSet } = req.body;

    if (!tcgApiCard || !tcgApiSet) {
      return res.status(400).json({ error: "Missing tcgApiCard or tcgApiSet" });
    }

    const result = await db.transaction(async (tx) => {
      // 1. Ensure set exists
      const existingSet = await tx
        .select()
        .from(pokemonSets)
        .where(eq(pokemonSets.id, tcgApiSet.id))
        .limit(1);

      let setId = tcgApiSet.id;

      if (!existingSet.length) {
        // Insert new set
        const symbolUrl = getPokeSymbolUrlForSet(tcgApiSet.id);

        await tx.insert(pokemonSets).values({
          id: tcgApiSet.id,
          name: tcgApiSet.name,
          series: tcgApiSet.series,
          printedTotal: tcgApiSet.printedTotal,
          total: tcgApiSet.total,
          releaseDate: tcgApiSet.releaseDate,
          logoUrl: tcgApiSet.logoUrl,
          symbolUrl: symbolUrl || tcgApiSet.symbolUrl,
          imageUrl: tcgApiSet.images?.logo,
        });
      }

      // 2. Insert card (skip if exists)
      await tx
        .insert(pokemonCards)
        .values({
          id: tcgApiCard.id,
          setId: setId,
          name: tcgApiCard.name,
          number: tcgApiCard.number,
          rarity: tcgApiCard.rarity || null,
          supertype: tcgApiCard.supertype,
          subtypes: JSON.stringify(tcgApiCard.subtypes || []),
          imageSmall: tcgApiCard.images?.small,
          imageLarge: tcgApiCard.images?.large,
          artist: tcgApiCard.artist || null,
          hp: tcgApiCard.hp || null,
          nationalPokedexNumbers: JSON.stringify(
            tcgApiCard.nationalPokedexNumbers || []
          ),
          description: tcgApiCard.flavorText || null,
        })
        .onConflictDoNothing();

      // 3. Generate and insert standard variants
      const variants = generateStandardVariants(
        tcgApiCard.id,
        tcgApiCard.images?.large
      );
      const variantIds = [];

      for (const variant of variants) {
        // Skip if variant exists
        const existing = await tx
          .select()
          .from(pokemonCardVariants)
          .where(eq(pokemonCardVariants.id, variant.id))
          .limit(1);

        if (!existing.length) {
          await tx.insert(pokemonCardVariants).values(variant);
          variantIds.push(variant.id);
        }
      }

      return { cardId: tcgApiCard.id, variantIds, setId };
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error("[sync/card-on-scan]", error);
    res.status(500).json({ error: String(error) });
  }
});

/**
 * POST /api/sync/set/:setId
 * Bulk imports all cards for a given set from TCG API.
 * Inserts cards and generates standard variants.
 * Returns: { success, cardsInserted, variantsInserted }
 */
router.post("/set/:setId", async (req, res) => {
  try {
    const { setId } = req.params;

    // Fetch the set from TCG API
    const tcgSet = await fetchTcgSet(setId);
    if (!tcgSet) {
      return res.status(404).json({ error: "Set not found in TCG API" });
    }

    // Fetch all cards in the set from TCG API
    const tcgCards = await fetchTcgSetCards(setId);
    if (!tcgCards || tcgCards.length === 0) {
      return res.status(404).json({ error: "No cards found for this set" });
    }

    const result = await db.transaction(async (tx) => {
      // Ensure set exists
      const existingSet = await tx
        .select()
        .from(pokemonSets)
        .where(eq(pokemonSets.id, setId))
        .limit(1);

      if (!existingSet.length) {
        const symbolUrl = getPokeSymbolUrlForSet(setId);
        await tx.insert(pokemonSets).values({
          id: tcgSet.id,
          name: tcgSet.name,
          series: tcgSet.series,
          printedTotal: tcgSet.printedTotal,
          total: tcgSet.total,
          releaseDate: tcgSet.releaseDate,
          logoUrl: tcgSet.logoUrl,
          symbolUrl: symbolUrl || tcgSet.symbolUrl,
          imageUrl: tcgSet.images?.logo,
        });
      }

      let cardsInserted = 0;
      let variantsInserted = 0;

      for (const tcgCard of tcgCards) {
        // Insert card (ON CONFLICT DO NOTHING)
        const cardResult = await tx
          .insert(pokemonCards)
          .values({
            id: tcgCard.id,
            setId: setId,
            name: tcgCard.name,
            number: tcgCard.number,
            rarity: tcgCard.rarity || null,
            supertype: tcgCard.supertype,
            subtypes: JSON.stringify(tcgCard.subtypes || []),
            imageSmall: tcgCard.images?.small,
            imageLarge: tcgCard.images?.large,
            artist: tcgCard.artist || null,
            hp: tcgCard.hp || null,
            nationalPokedexNumbers: JSON.stringify(
              tcgCard.nationalPokedexNumbers || []
            ),
            description: tcgCard.flavorText || null,
          })
          .onConflictDoNothing();

        if (cardResult.rowCount > 0) {
          cardsInserted++;
        }

        // Generate and insert variants
        const variants = generateStandardVariants(
          tcgCard.id,
          tcgCard.images?.large
        );

        for (const variant of variants) {
          const variantResult = await tx
            .insert(pokemonCardVariants)
            .values(variant)
            .onConflictDoNothing();

          if (variantResult.rowCount > 0) {
            variantsInserted++;
          }
        }
      }

      return { cardsInserted, variantsInserted, totalCards: tcgCards.length };
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error("[sync/set]", error);
    res.status(500).json({ error: String(error) });
  }
});

router.post("/symbol-urls", async (req, res) => {
  try {
    const sets = await db.select().from(pokemonSets);

    let updated = 0;

    for (const set of sets) {
      const pokeSymbolUrl = getPokeSymbolUrlForSet(set.id);

      if (pokeSymbolUrl && pokeSymbolUrl !== set.symbolUrl) {
        await db
          .update(pokemonSets)
          .set({ symbolUrl: pokeSymbolUrl })
          .where(eq(pokemonSets.id, set.id));

        updated++;
      }
    }

    res.json({ success: true, updated, total: sets.length });
  } catch (error) {
    console.error("[sync/symbol-urls]", error);
    res.status(500).json({ error: String(error) });
  }
});

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate standard variants for a card (normal, reverse holo, 1st edition, etc.)
 * Adjust based on your set era rules.
 */
function generateStandardVariants(
  cardId: string,
  imageLarge?: string
): (typeof pokemonCardVariants.$inferInsert)[] {
  const variants = [];

  // Standard variant combinations (adjust per set era)
  const finishes = ["normal", "holofoil", "reverseHolofoil"];
  const editions = ["unlimited", "1st"];
  const languages = ["english", "japanese"];

  for (const finish of finishes) {
    for (const edition of editions) {
      for (const language of languages) {
        const variantId = `${cardId}-${finish}-${edition}-${language}`;

        variants.push({
          id: variantId,
          cardId,
          finishType: finish,
          editionType: edition,
          language,
          imageUrl: imageLarge,
          variantLabel: `${finish} ${edition} ${language}`,
          isPromo: false,
          isStamped: false,
        });
      }
    }
  }

  return variants;
}

/**
 * Get pokesymbols.com symbol URL for a set using existing set database.
 * Returns PNG URL from pokesymbols.com/images/tcg/sets/symbols/{slug}.png
 */
function getPokeSymbolUrlForSet(setId: string): string | null {
  const set = ALL_SETS.find((s) => s.apiId === setId);
  if (!set) return null;
  return getSymbolUrl(set.slug);
}

/**
 * Fetch a single set from TCG API.
 */
async function fetchTcgSet(setId: string) {
  try {
    const response = await fetch(
      `https://api.pokemontcg.io/v2/sets/${setId}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error(`[fetchTcgSet] Error fetching set ${setId}:`, error);
    return null;
  }
}

/**
 * Fetch all cards for a set from TCG API (with pagination).
 */
async function fetchTcgSetCards(
  setId: string
): Promise<any[] | null> {
  try {
    const cards = [];
    let page = 1;
    const pageSize = 250;

    while (true) {
      const response = await fetch(
        `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&pageSize=${pageSize}&page=${page}`
      );

      if (!response.ok) break;

      const data = await response.json();
      if (!data.data || data.data.length === 0) break;

      cards.push(...data.data);

      // Stop if we've fetched all pages
      if (page * pageSize >= data.totalCount) break;

      page++;
    }

    return cards;
  } catch (error) {
    console.error(`[fetchTcgSetCards] Error fetching cards for set ${setId}:`, error);
    return null;
  }
}

export default router;
