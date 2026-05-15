/**
 * Scrydex Scraper — https://scrydex.com
 *
 * Scrapes Pokémon set and card data from scrydex.com and uses it to:
 *   1. Add sets that are not yet in the database (e.g. TCG Pocket, some Chinese sets)
 *   2. Add missing cards within existing sets
 *   3. Fill in missing image URLs for cards that have none
 *
 * IMPORTANT: This scraper is NOT triggered automatically on startup.
 * It must be invoked explicitly via POST /api/admin/scrydex-sync.
 *
 * Deduplication rules:
 *   - Sets:  skip if pokemon_sets.id already exists
 *   - Cards: skip if pokemon_cards.id already exists AND image_small is populated
 *            update image_small/image_large if the card exists but images are null
 */

import { db } from "./db";
import {
  pokemonSets,
  pokemonCards,
  pokemonCardVariants,
  cardPricing,
} from "@shared/schema";
import { count, inArray, isNull, eq, or, and } from "drizzle-orm";
import {
  normalizeFinishType,
  normalizeEdition,
  createVariantId,
} from "./utils/card-normalizers";


const BASE_URL = "https://scrydex.com";
const IMAGE_BASE = "https://images.scrydex.com/pokemon";

const DELAY_MS = 150; // polite delay between page requests

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScrydexSet {
  id: string;
  slug: string;
  name: string;
  series: string;
  releaseDate: string;
  total: number;
  logoUrl: string;
  symbolUrl: string;
}

  export interface ScrydexCard {
    id: string;
    setId: string;
    name: string;
    number: string;

    finishType: string;
    editionType: string;
    language: string;

    variantId: string;

    imageSmall: string;
    imageLarge: string;

    priceUsd: number | null;
  }


export interface ScrydexSyncProgress {
  phase: "sets" | "cards" | "done" | "error";
  currentSet?: string;
  setsProcessed: number;
  setsTotal: number;
  setsAdded: number;
  cardsProcessed: number;
  cardsAdded: number;
  cardsUpdated: number;
  message?: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function fetchPage(path: string): Promise<string> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

function htmlDecode(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/** Convert a URL slug like "ethans-pinsir" into "Ethan's Pinsir" */
function slugToName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── Parse sets from /pokemon/expansions ─────────────────────────────────────

export async function scrapeScrydexSets(): Promise<ScrydexSet[]> {
  const html = await fetchPage("/pokemon/expansions");
  return parseSetsFromHtml(html);
}

export async function scrapeScrydexTcgPocketSets(): Promise<ScrydexSet[]> {
  const html = await fetchPage("/pokemon/tcg-pocket/expansions");
  return parseSetsFromHtml(html);
}

/** Fetches all Japanese expansion sets from the Scrydex JP page */
export async function scrapeScrydexJpSets(): Promise<ScrydexSet[]> {
  const html = await fetchPage("/pokemon/jp/expansions");
  return parseSetsFromHtml(html);
}

function parseSetsFromHtml(html: string): ScrydexSet[] {
  const sets: ScrydexSet[] = [];
  const seen = new Set<string>();

  // Each expansion link: /pokemon/expansions/{slug}/{setId}
  const linkRe =
    /href="\/pokemon\/expansions\/([^"/]+)\/([^"/?\s]+)"/g;
  let m: RegExpExecArray | null;

  while ((m = linkRe.exec(html)) !== null) {
    const slug = m[1];
    const id = m[2];
    if (seen.has(id)) continue;
    seen.add(id);

    // Find the block around this link to extract set data
    const start = m.index;
    const block = html.substring(start, start + 2000);

    // Set name — look for the h1 or strong with the set name near this link
    // The name appears in the link's aria-label or nearby text
    // We'll parse it from the expansion detail page later if needed
    // For now, convert slug to title case
    const name = slugToName(slug);

    // Series — infer from set ID prefix (same logic as PCV scraper)
    const series = inferSeries(id);

    // Release date from nearby text
    const dateM = block.match(/(\d{4}\/\d{2}\/\d{2}|\d{4}-\d{2}-\d{2})/);
    const releaseDate = dateM ? dateM[1].replace(/\//g, "-") : "";

    // Card count
    const countM = block.match(/(\d+)\s*cards?/i);
    const total = countM ? parseInt(countM[1], 10) : 0;

    // Logo and symbol
    const logoUrl = `${IMAGE_BASE}/${id}-logo/logo`;
    const symbolUrl = `${IMAGE_BASE}/${id}-symbol/symbol`;

    sets.push({ id, slug, name, series, releaseDate, total, logoUrl, symbolUrl });
  }

  return sets;
}

/** Fetches an individual expansion page to get accurate name, series, date, total */
export async function scrapeScrydexSetDetail(
  slug: string,
  id: string
): Promise<ScrydexSet> {
  const html = await fetchPage(`/pokemon/expansions/${slug}/${id}`);

  // Set name from h1 with text-heading-32
  const nameM = html.match(
    /<h1[^>]*class="[^"]*text-heading-32[^"]*"[^>]*>([^<]+)<\/h1>/
  );
  const name = nameM ? htmlDecode(nameM[1].trim()) : slugToName(slug);

  // Series and total from the badge row (series • total)
  const seriesM = html.match(
    /<span[^>]*text-heading-16[^>]*>([^<]+)<\/span>[^<]*<span[^>]*text-mono-2[^>]*>[^<]*<\/span>[^<]*<span[^>]*text-heading-16[^>]*>(\d+)\s*cards?<\/span>/
  );
  const series = seriesM ? htmlDecode(seriesM[1].trim()) : inferSeries(id);
  const total = seriesM ? parseInt(seriesM[2], 10) : 0;

  // Release date
  const dateM = html.match(/(\d{4}\/\d{2}\/\d{2})/);
  const releaseDate = dateM ? dateM[1].replace(/\//g, "-") : "";

  const logoUrl = `${IMAGE_BASE}/${id}-logo/logo`;
  const symbolUrl = `${IMAGE_BASE}/${id}-symbol/symbol`;

  return { id, slug, name, series, releaseDate, total, logoUrl, symbolUrl };
}

// ─── Parse cards from a set's expansion page ──────────────────────────────────

export async function scrapeScrydexSetCards(
  slug: string,
  setId: string
): Promise<ScrydexCard[]> {
  const html = await fetchPage(`/pokemon/expansions/${slug}/${setId}`);
  return parseCardsFromSetHtml(html, setId);
}

function parseCardsFromSetHtml(
  html: string,
  setId: string
): ScrydexCard[] {
  const cards: ScrydexCard[] = [];
  const seen = new Set<string>();

  const linkRe =
    /href="\/pokemon\/cards\/([^/]+)\/([^?"]+)\?variant=([^"]+)"/g;

  let m: RegExpExecArray | null;

  while ((m = linkRe.exec(html)) !== null) {
    const cardSlug = m[1];
    const cardId = m[2];
    const rawVariant = m[3] || "normal";

    // Prevent cross-set pollution
    if (!cardId.startsWith(`${setId}-`)) {
      continue;
    }

    // Normalize variant metadata
    const finishType = normalizeFinishType(rawVariant);
    const editionType = normalizeEdition(rawVariant);

    const language = setId.includes("_ja")
      ? "japanese"
      : setId.includes("_ko")
      ? "korean"
      : setId.includes("_zh")
      ? "chinese"
      : "english";

    const variantId = createVariantId(
      cardId,
      finishType,
      editionType,
      language
    );

    const uniqueKey = `${cardId}:${variantId}`;

    // Skip duplicate variants
    if (seen.has(uniqueKey)) {
      continue;
    }

    seen.add(uniqueKey);

    // Local HTML chunk
    const block = html.substring(m.index, m.index + 1500);

    // ─────────────────────────────────────────────────────────
    // Images
    // ─────────────────────────────────────────────────────────

    const imgM = block.match(
      /src="(https:\/\/images\.scrydex\.com\/pokemon\/[^"]+\/medium)"/
    );

    const imageSmall = imgM
      ? imgM[1]
      : `${IMAGE_BASE}/${cardId}/medium`;

    const imageLarge = imageSmall.replace(
      "/medium",
      "/large"
    );

    // ─────────────────────────────────────────────────────────
    // Name + number
    // ─────────────────────────────────────────────────────────

    let name = htmlDecode(slugToName(cardSlug));

    let number = cardId.replace(`${setId}-`, "");

    const nameM = block.match(
      /class="[^"]*text-body-12[^"]*text-white[^"]*"[^>]*>([^<]+)<\/span>/
    );

    if (nameM) {
      const raw = htmlDecode(nameM[1].trim());

      const numMatch = raw.match(/^(.+?)\s*#(\S+)$/);

      if (numMatch) {
        name = numMatch[1].trim();
        number = numMatch[2];
      } else {
        name = raw;
      }
    }

    // ─────────────────────────────────────────────────────────
    // Price
    // ─────────────────────────────────────────────────────────

    const priceM = block.match(/\$(\d+\.\d+)/);

    const priceUsd = priceM
      ? parseFloat(priceM[1])
      : null;

    // ─────────────────────────────────────────────────────────
    // Push card
    // ─────────────────────────────────────────────────────────

    cards.push({
      id: cardId,
      setId,

      name,
      number,

      finishType,
      editionType,
      language,

      variantId,

      imageSmall,
      imageLarge,

      priceUsd,
    });
  }

  return cards;
}

// ─── Series inference (mirrors PCV scraper logic) ─────────────────────────────

function inferSeries(id: string): string {
  const lower = id.toLowerCase();
  // Language-specific suffixes take priority
  if (lower.includes("_ja")) return "Japanese";
  if (lower.includes("_ko")) return "Korean";
  if (lower.includes("_zh") || lower.includes("_cn")) return "Chinese";
  if (lower.startsWith("tcgp")) return "TCG Pocket";
  if (lower.startsWith("sv")) return "Scarlet & Violet";
  if (lower.startsWith("swsh")) return "Sword & Shield";
  if (lower.startsWith("sm")) return "Sun & Moon";
  if (lower.startsWith("xy")) return "XY";
  if (lower.startsWith("bw")) return "Black & White";
  if (/^me\d/.test(lower)) return "Mega Evolution";
  if (lower.startsWith("rsv") || lower.startsWith("zsv")) return "Scarlet & Violet";
  if (lower.startsWith("me")) return "Mega Evolution";
  if (lower.startsWith("neo")) return "Neo";
  if (lower.startsWith("ecard")) return "E-Card";
  if (lower.startsWith("ex")) return "EX";
  if (lower.startsWith("dp")) return "Diamond & Pearl";
  if (lower.startsWith("pl")) return "Platinum";
  if (lower.startsWith("hgss")) return "HeartGold & SoulSilver";
  if (lower.startsWith("col")) return "Call of Legends";
  if (lower.startsWith("gym")) return "Gym";
  if (lower.startsWith("base")) return "Base";
  if (lower.startsWith("pop")) return "POP Series";
  if (lower.startsWith("wc")) return "World Championships";
  if (lower.startsWith("np")) return "Neo";
  if (lower.startsWith("cel")) return "Sword & Shield";
  return "Other";
}

// ─── Main sync function ───────────────────────────────────────────────────────

/**
 * Runs the full Scrydex sync.
 *
 * For each set on scrydex.com:
 *   - If the set is NOT in pokemon_sets → insert it
 *   - Then fetch all cards for that set from scrydex
 *     - If a card is NOT in pokemon_cards → insert it
 *     - If a card IS in pokemon_cards but image_small is NULL → update images
 *
 * onProgress is called with status updates throughout the run.
 */
export async function runScrydexSync(
  onProgress?: (p: ScrydexSyncProgress) => void
): Promise<ScrydexSyncProgress> {
  const progress: ScrydexSyncProgress = {
    phase: "sets",
    setsProcessed: 0,
    setsTotal: 0,
    setsAdded: 0,
    cardsProcessed: 0,
    cardsAdded: 0,
    cardsUpdated: 0,
  };

  const report = (patch: Partial<ScrydexSyncProgress>) => {
    Object.assign(progress, patch);
    onProgress?.(progress);
  };

  try {
    // ── Phase 1: Fetch all sets from Scrydex ──────────────────────────────
    report({ phase: "sets", message: "Fetching set list from scrydex.com..." });

    const [enSets, pocketSets, jpSets] = await Promise.all([
      scrapeScrydexSets(),
      scrapeScrydexTcgPocketSets(),
      scrapeScrydexJpSets(),
    ]);

    // Merge and deduplicate by ID (JP sets are added last so EN names win for shared IDs)
    const allSetsMap = new Map<string, ScrydexSet>();
    for (const s of [...enSets, ...pocketSets, ...jpSets]) {
      if (!allSetsMap.has(s.id)) allSetsMap.set(s.id, s);
    }
    const allSets = [...allSetsMap.values()];
    report({ setsTotal: allSets.length, message: `Found ${allSets.length} sets on scrydex.com (EN + TCG Pocket + JP)` });

    // ── Phase 2: Get existing sets and their card counts from DB ─────────
    const existingSetRows = await db
      .select({ id: pokemonSets.id, cardCount: count(pokemonCards.id) })
      .from(pokemonSets)
      .leftJoin(pokemonCards, eq(pokemonCards.setId, pokemonSets.id))
      .groupBy(pokemonSets.id);
    const existingSetIds    = new Set<string>();
    const setsWithCards     = new Set<string>(); // sets that already have cards
    for (const row of existingSetRows) {
      existingSetIds.add(row.id);
      if (row.cardCount > 0) setsWithCards.add(row.id);
    }

    // Only process sets that are either new OR have no cards yet.
    // Skip sets that already have cards — the TCG API seeder already covered those.
    const setsToProcess = allSets;

    report({
      setsTotal: setsToProcess.length,
      message: `Found ${allSets.length} sets on Scrydex — ${setsToProcess.length} need processing (new or empty).`,
    });

    // ── Phase 3: Process each set ─────────────────────────────────────────
    report({ phase: "cards" });

    for (const set of setsToProcess) {
      report({ currentSet: set.name, setsProcessed: progress.setsProcessed });

      const setId = set.id;

      // Insert the set if it's missing from our DB
      if (!existingSetIds.has(setId)) {
        try {
          await delay(DELAY_MS);
          const detail = await scrapeScrydexSetDetail(set.slug, set.id);

          await db.insert(pokemonSets).values({
            id: detail.id,
            name: detail.name,
            series: detail.series,
            printedTotal: detail.total,
            total: detail.total,
            releaseDate: detail.releaseDate || null,
            logoUrl: detail.logoUrl,
            symbolUrl: detail.symbolUrl,
            imageUrl: detail.logoUrl,
          }).onConflictDoNothing();
          existingSetIds.add(setId);
          report({ setsAdded: progress.setsAdded + 1 });
        } catch (err: any) {
          console.error(`[Scrydex] Failed to insert set ${setId}:`, err.message);
        }
      }

      // Fetch cards for this set from Scrydex
      try {
        await delay(DELAY_MS);
        const cards = await scrapeScrydexSetCards(set.slug, setId);

        if (cards.length === 0) {
          report({ setsProcessed: progress.setsProcessed + 1 });
          continue;
        }

        // Batch-check which cards already exist and what images they have
        const cardIds = cards.map((c) => c.id);
        const existingCardsRes = await db
          .select({ id: pokemonCards.id, imageSmall: pokemonCards.imageSmall })
          .from(pokemonCards)
          .where(inArray(pokemonCards.id, cardIds));
        const existingCards = new Map<string, string | null>(
          existingCardsRes.map((r) => [r.id, r.imageSmall])
        );

        for (const card of cards) {
          if (card.priceUsd !== null) {
            const convertedValue =
              Math.round(card.priceUsd * 0.79 * 100) / 100;

            try {
              await db.insert(cardPricing)
                .values({
                  cardId: card.id,
                  priceGBP: convertedValue,
                  updatedAt: new Date(),
                })
                .onConflictDoNothing();
            } catch (err) {
              console.error(
                `[Scrydex] Failed pricing sync for ${card.id}`,
                err
              );
            }
          }

          progress.cardsProcessed++;

          if (!existingCards.has(card.id)) {
            // New card — insert if its set is in the DB
            if (!existingSetIds.has(setId)) continue;
            try {
              await db.insert(pokemonCards).values({
                id: card.id,
                setId: card.setId,
                name: card.name,
                number: card.number,
                imageSmall: card.imageSmall,
                imageLarge: card.imageLarge,
              }).onConflictDoNothing();
              if (card.priceUsd !== null) {
                const convertedValue =
                  Math.round(card.priceUsd * 0.79 * 100) / 100;

                try {
                      await db.insert(cardPricing)
                      .values({
                        cardId: card.id,
                        priceGBP: convertedValue,
                        updatedAt: new Date(),
                      })
                      .onConflictDoNothing();
                      } catch (err) {
                  console.error(
                    `[Scrydex] Price insert failed for ${card.id}`,
                    err
                  );
                }
              }

              try {
                await db.insert(pokemonCardVariants)
                  .values({
                    id: card.variantId,

                    cardId: card.id,

                    finishType: card.finishType,

                    editionType: card.editionType,

                    language: card.language,

                    imageUrl: card.imageLarge,

                    variantLabel:
                      `${card.finishType} ${card.editionType}`,
                  })
                  .onConflictDoNothing();
              } catch (err) {
                console.error("Variant insert failed", err);
              }

              progress.cardsAdded++;
            } catch (err: any) {
              // ignore FK violations etc.
            }
          } else {
            // Card exists — fill in missing images only
            const existingImg = existingCards.get(card.id);
            if (!existingImg || existingImg === "") {
              try {
                await db.update(pokemonCards)
                  .set({ imageSmall: card.imageSmall, imageLarge: card.imageLarge })
                  .where(
                    and(
                      eq(pokemonCards.id, card.id),
                      or(isNull(pokemonCards.imageSmall), eq(pokemonCards.imageSmall, ""))
                    )
                  );
                progress.cardsUpdated++;
              } catch (err: any) {
                // ignore
              }
            }
          }
        }

        report({ setsProcessed: progress.setsProcessed + 1 });
      } catch (err: any) {
        console.error(`[Scrydex] Failed to process cards for ${setId}:`, err.message);
        report({ setsProcessed: progress.setsProcessed + 1 });
      }
    }

    report({
      phase: "done",
      message: `Sync complete. ${progress.setsAdded} sets added, ${progress.cardsAdded} cards added, ${progress.cardsUpdated} card images updated.`,
    });
  } catch (err: any) {
    report({ phase: "error", message: err.message || "Sync failed" });
  }

  return progress;
}
