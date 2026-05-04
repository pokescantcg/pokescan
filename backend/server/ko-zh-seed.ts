/**
 * Korean & Chinese Card Seeder
 *
 * Korean (_ko) and Chinese (_zh / _cn) TCG editions share identical artwork
 * with their Japanese (_ja) counterparts. This seeder mirrors the JP card rows
 * into KO and ZH sets so every set has card images and data.
 *
 * Mapping rules:
 *   sv1s_ko  →  sv1s_ja  (replace trailing _ko with _ja)
 *   sv1s_zh  →  sv1s_ja  (replace trailing _zh with _ja)
 *   sv1s_cn  →  sv1s_ja  (replace trailing _cn with _ja)
 *
 * Card IDs follow the same rule:
 *   sv1s_ja-1  →  sv1s_ko-1  /  sv1s_zh-1
 *
 * Image URLs from Scrydex remain pointing at the JP card images — the artwork
 * is exactly the same regardless of the language printed on the card.
 *
 * Auto-invoked by card-sync.ts on startup.
 */

import { pool } from "./db";

const BATCH_PAUSE_MS = 5;          // tiny pause between sets to avoid DB overload
const CARDS_PER_INSERT_BATCH = 50; // insert in chunks of 50

export interface KoZhSeedResult {
  inserted: number;
  skipped: number;
  setsProcessed: number;
  errors: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Replace the language suffix to get the JP set ID */
function toJpSetId(setId: string): string | null {
  if (setId.endsWith("_ko")) return setId.slice(0, -3) + "_ja";
  if (setId.endsWith("_zh")) return setId.slice(0, -3) + "_ja";
  if (setId.endsWith("_cn")) return setId.slice(0, -3) + "_ja";
  return null;
}

/** The 2-letter suffix used in card IDs: "ko", "zh", or "cn" */
function langSuffix(setId: string): string {
  if (setId.endsWith("_ko")) return "ko";
  if (setId.endsWith("_zh")) return "zh";
  return "cn";
}

/** Convert a JP card ID to the target language card ID */
function toTargetCardId(jpCardId: string, suffix: string): string {
  // "sv1s_ja-1" → "sv1s_ko-1"
  return jpCardId.replace(`_ja-`, `_${suffix}-`);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function seedKoZhCards(
  onProgress?: (msg: string) => void
): Promise<KoZhSeedResult> {
  const log = (msg: string) => {
    console.log(`[KoZhSeed] ${msg}`);
    onProgress?.(msg);
  };

  // ── 1. Find KO/ZH sets that have no cards yet ──────────────────────────────
  const emptyRes = await pool.query<{ id: string; name: string }>(`
    SELECT s.id, s.name
    FROM   pokescan_sets s
    WHERE  (s.id LIKE '%\_ko' ESCAPE '\\'
         OR s.id LIKE '%\_zh' ESCAPE '\\'
         OR s.id LIKE '%\_cn' ESCAPE '\\')
    AND    NOT EXISTS (
             SELECT 1 FROM pokescan_cards c WHERE c.set_id = s.id
           )
    ORDER  BY s.id
  `);

  const emptySets = emptyRes.rows;

  if (emptySets.length === 0) {
    log("All KO/ZH sets already have cards — nothing to do.");
    return { inserted: 0, skipped: 0, setsProcessed: 0, errors: 0 };
  }

  log(
    `Found ${emptySets.length} KO/ZH sets with no cards — mirroring from JP…`
  );

  let inserted = 0;
  let skipped  = 0;
  let errors   = 0;
  let setsProcessed = 0;

  // ── 2. Process each empty set ──────────────────────────────────────────────
  for (const set of emptySets) {
    const setId  = set.id;
    const jpId   = toJpSetId(setId);
    const suffix = langSuffix(setId);

    if (!jpId) {
      skipped++;
      continue;
    }

    // Fetch the JP card rows for this set
    const jpRes = await pool.query<{
      id: string;
      name: string;
      number: string;
      rarity: string | null;
      supertype: string | null;
      subtypes: string | null;
      hp: string | null;
      image_small: string | null;
      image_large: string | null;
      artist: string | null;
      national_pokedex_numbers: string | null;
    }>(
      `SELECT id, name, number, rarity, supertype, subtypes, hp,
              image_small, image_large, artist, national_pokedex_numbers
       FROM   pokescan_cards
       WHERE  set_id = $1
       ORDER  BY id`,
      [jpId]
    );

    if (jpRes.rows.length === 0) {
      // JP equivalent not seeded yet — skip silently (will catch next restart)
      skipped++;
      continue;
    }

    // ── 3. Batch-insert target language cards ─────────────────────────────
    let setInserted = 0;

    // Process in chunks to avoid huge single queries
    const chunks: typeof jpRes.rows[] = [];
    for (let i = 0; i < jpRes.rows.length; i += CARDS_PER_INSERT_BATCH) {
      chunks.push(jpRes.rows.slice(i, i + CARDS_PER_INSERT_BATCH));
    }

    for (const chunk of chunks) {
      // Build a multi-row INSERT VALUES string
      const valueClauses: string[] = [];
      const params: unknown[] = [];
      let p = 1;

      for (const jp of chunk) {
        const newId = toTargetCardId(jp.id, suffix);
        valueClauses.push(
          `($${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++})`
        );
        params.push(
          newId,
          setId,
          jp.name,
          jp.number,
          jp.rarity,
          jp.supertype,
          jp.subtypes,
          jp.hp,
          jp.image_small,  // same artwork as JP
          jp.image_large,
          jp.artist
        );
      }

      try {
        const res = await pool.query(
          `INSERT INTO pokescan_cards
             (id, set_id, name, number, rarity, supertype, subtypes, hp,
              image_small, image_large, artist)
           VALUES ${valueClauses.join(",")}
           ON CONFLICT (id) DO NOTHING`,
          params
        );
        const count = res.rowCount ?? 0;
        setInserted += count;
        inserted    += count;
      } catch (err: any) {
        console.error(
          `[KoZhSeed] Batch insert error for ${setId}:`,
          err.message
        );
        errors++;
      }
    }

    // ── 4. Update set printed_total if it is missing ─────────────────────
    if (setInserted > 0) {
      await pool.query(
        `UPDATE pokescan_sets
         SET    printed_total = CASE WHEN printed_total IS NULL OR printed_total = 0
                                     THEN $1 ELSE printed_total END,
                total         = CASE WHEN total IS NULL OR total = 0
                                     THEN $1 ELSE total END
         WHERE  id = $2`,
        [jpRes.rows.length, setId]
      );
    }

    setsProcessed++;

    if (setInserted > 0) {
      log(`  ✓ ${setId}: ${setInserted} cards (from ${jpId})`);
    } else if (jpRes.rows.length > 0) {
      log(`  ~ ${setId}: all ${jpRes.rows.length} cards already present`);
    }

    await delay(BATCH_PAUSE_MS);
  }

  log(
    `Done — ${setsProcessed} sets processed, ${inserted} cards inserted, ` +
    `${skipped} skipped (no JP source), ${errors} errors`
  );

  return { inserted, skipped, setsProcessed, errors };
}

// ─── Fix specific empty JP sets (swsh5s_ja, swsh6l_ja) ───────────────────────
// These are legitimate SWSH-era Japanese sets. We seed them using their known
// card structures by scraping directly from the Scrydex JP expansion page.

export async function fixEmptyJpSets(
  onProgress?: (msg: string) => void
): Promise<{ inserted: number; errors: number }> {
  const log = (msg: string) => {
    console.log(`[JpFix] ${msg}`);
    onProgress?.(msg);
  };

  // The 2 empty SWSH Japanese sets with their Scrydex slugs
  const targets = [
    { setId: "swsh5s_ja", slug: "single-strike-master", cards: 70 },
    { setId: "swsh6l_ja", slug: "silver-lance",         cards: 70 },
  ] as const;

  let inserted = 0;
  let errors   = 0;

  for (const target of targets) {
    // Skip if already has cards
    const countRes = await pool.query(
      `SELECT COUNT(*) AS n FROM pokescan_cards WHERE set_id = $1`,
      [target.setId]
    );
    if (parseInt((countRes.rows[0] as any).n, 10) > 0) {
      log(`${target.setId} already has cards — skipping`);
      continue;
    }

    log(`Seeding ${target.setId} (${target.cards} cards via Scrydex pattern)…`);

    // Try to scrape from Scrydex using the known slug + setId
    try {
      const { scrapeScrydexSetCards } = await import("./scrydex-scraper");
      const cards = await scrapeScrydexSetCards(target.slug, target.setId);

      if (cards.length > 0) {
        for (const card of cards) {
          try {
            await pool.query(
              `INSERT INTO pokescan_cards (id, set_id, name, number, image_small, image_large)
               VALUES ($1,$2,$3,$4,$5,$6)
               ON CONFLICT (id) DO NOTHING`,
              [card.id, target.setId, card.name, card.number, card.imageSmall, card.imageLarge]
            );
            inserted++;
          } catch {
            errors++;
          }
        }
        log(`  ✓ ${target.setId}: ${cards.length} cards scraped from Scrydex`);
        continue;
      }
    } catch (err: any) {
      log(`  Scrydex scrape failed for ${target.setId}: ${err.message} — using URL pattern fallback`);
    }

    // Fallback: construct cards using known Scrydex URL pattern
    // Images exist at images.scrydex.com/pokemon/{setId}-{n}/medium
    for (let n = 1; n <= target.cards; n++) {
      const cardId    = `${target.setId}-${n}`;
      const imgSmall  = `https://images.scrydex.com/pokemon/${cardId}/medium`;
      const imgLarge  = `https://images.scrydex.com/pokemon/${cardId}/large`;
      try {
        await pool.query(
          `INSERT INTO pokescan_cards (id, set_id, name, number, image_small, image_large)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (id) DO NOTHING`,
          [cardId, target.setId, `Card #${n}`, String(n), imgSmall, imgLarge]
        );
        inserted++;
      } catch {
        errors++;
      }
    }

    log(`  ✓ ${target.setId}: ${target.cards} cards inserted (URL-pattern fallback)`);
  }

  return { inserted, errors };
}
