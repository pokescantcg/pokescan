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

import { pool } from "./db";

const BASE_URL = "https://scrydex.com";
const IMAGE_BASE = "https://images.scrydex.com/pokemon";

const DELAY_MS = 400; // polite delay between page requests

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
  id: string;       // e.g. "sv10-3" — matches pokemon_cards.id
  setId: string;    // e.g. "sv10"
  name: string;
  number: string;
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

function parseCardsFromSetHtml(html: string, setId: string): ScrydexCard[] {
  const cards: ScrydexCard[] = [];
  const seen = new Set<string>();

  /**
   * Each card on the listing page looks like:
   *   <a href="/pokemon/cards/yanmega-ex/sv10-3?variant=holofoil">
   *     <div data-id="sv10-3">
   *       <img src="https://images.scrydex.com/pokemon/sv10-3/medium" />
   *       <span>Yanmega ex #3</span>
   *       <span>$1.23</span>
   *     </div>
   *   </a>
   */
  const cardRe =
    /href="\/pokemon\/cards\/([^/]+)\/([^?"\s]+)\?variant=([^"]+)"[\s\S]*?data-id="([^"]+)"[\s\S]*?src="(https:\/\/images\.scrydex\.com\/pokemon\/[^"]+\/medium)"[\s\S]*?<span[^>]*>([^<]+)<\/span>[\s\S]*?<span[^>]*>([^<]*)<\/span>[\s\S]*?<span[^>]*>\$([\d.]+)<\/span>/g;

  let m: RegExpExecArray | null;
  while ((m = cardRe.exec(html)) !== null) {
    const cardSlug = m[1];
    const scrydexId = m[2]; // e.g. "sv10-3"
    const imgMedium = m[5];
    const nameWithNum = m[6].trim(); // e.g. "Yanmega ex #3"
    const priceStr = m[8];

    if (seen.has(scrydexId)) continue;
    seen.add(scrydexId);

    // Parse name and number from "Yanmega ex #3"
    const nameNumM = nameWithNum.match(/^(.+?)\s*#(\S+)$/);
    const name = nameNumM
      ? htmlDecode(nameNumM[1].trim())
      : htmlDecode(slugToName(cardSlug));
    const number = nameNumM ? nameNumM[2] : scrydexId.replace(`${setId}-`, "");

    const imageLarge = imgMedium.replace("/medium", "/large");
    const priceUsd = priceStr ? parseFloat(priceStr) : null;

    cards.push({
      id: scrydexId,
      setId,
      name,
      number,
      imageSmall: imgMedium,
      imageLarge,
      priceUsd,
    });
  }

  // Fallback: simpler pattern when the rich block doesn't match
  if (cards.length === 0) {
    const linkRe =
      /href="\/pokemon\/cards\/([^/]+)\/([^?"\s]+)\?variant=[^"]+"/g;
    while ((m = linkRe.exec(html)) !== null) {
      const cardSlug = m[1];
      const scrydexId = m[2];
      if (seen.has(scrydexId)) continue;
      seen.add(scrydexId);

      const numberM = scrydexId.match(new RegExp(`^${setId}-(.+)$`));
      const number = numberM ? numberM[1] : scrydexId;
      const imgSmall = `${IMAGE_BASE}/${scrydexId}/medium`;
      const imgLarge = `${IMAGE_BASE}/${scrydexId}/large`;
      const name = htmlDecode(slugToName(cardSlug));

      cards.push({
        id: scrydexId,
        setId,
        name,
        number,
        imageSmall: imgSmall,
        imageLarge: imgLarge,
        priceUsd: null,
      });
    }
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
  if (/^me\d/.test(lower)) return "Chinese Mega Evolution";
  if (lower.startsWith("rsv") || lower.startsWith("zsv")) return "Chinese Scarlet & Violet";
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

    const [enSets, pocketSets] = await Promise.all([
      scrapeScrydexSets(),
      scrapeScrydexTcgPocketSets(),
    ]);

    // Merge and deduplicate by ID
    const allSetsMap = new Map<string, ScrydexSet>();
    for (const s of [...enSets, ...pocketSets]) {
      if (!allSetsMap.has(s.id)) allSetsMap.set(s.id, s);
    }
    const allSets = [...allSetsMap.values()];
    report({ setsTotal: allSets.length, message: `Found ${allSets.length} sets on scrydex.com` });

    // ── Phase 2: Get existing set IDs from DB ─────────────────────────────
    const existingSetRows = await pool.query(
      "SELECT id FROM pokemon_sets"
    );
    const existingSetIds = new Set<string>(
      existingSetRows.rows.map((r: any) => r.id)
    );

    // ── Phase 3: Process each set ─────────────────────────────────────────
    report({ phase: "cards" });

    for (const set of allSets) {
      report({ currentSet: set.name, setsProcessed: progress.setsProcessed });

      let setId = set.id;

      // Insert the set if it's missing from our DB
      if (!existingSetIds.has(setId)) {
        try {
          // Fetch detailed info for the set (accurate name, series, release date)
          await delay(DELAY_MS);
          const detail = await scrapeScrydexSetDetail(set.slug, set.id);

          await pool.query(
            `INSERT INTO pokemon_sets (id, name, series, printed_total, total, release_date, logo_url, symbol_url, image_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO NOTHING`,
            [
              detail.id,
              detail.name,
              detail.series,
              detail.total,
              detail.total,
              detail.releaseDate || null,
              detail.logoUrl,
              detail.symbolUrl,
              detail.logoUrl, // image_url falls back to logo
            ]
          );
          existingSetIds.add(setId);
          report({ setsAdded: progress.setsAdded + 1 });
        } catch (err: any) {
          console.error(`[Scrydex] Failed to insert set ${setId}:`, err.message);
        }
      }

      // Fetch cards for this set
      try {
        await delay(DELAY_MS);
        const cards = await scrapeScrydexSetCards(set.slug, setId);

        if (cards.length === 0) {
          report({ setsProcessed: progress.setsProcessed + 1 });
          continue;
        }

        // Batch-check which cards already exist and what images they have
        const cardIds = cards.map((c) => c.id);
        const existingCardsRes = await pool.query(
          `SELECT id, image_small FROM pokemon_cards WHERE id = ANY($1)`,
          [cardIds]
        );
        const existingCards = new Map<string, string | null>(
          existingCardsRes.rows.map((r: any) => [r.id, r.image_small])
        );

        for (const card of cards) {
          progress.cardsProcessed++;

          if (!existingCards.has(card.id)) {
            // Card doesn't exist — insert it if its set is in the DB
            if (!existingSetIds.has(setId)) continue; // set failed to insert
            try {
              await pool.query(
                `INSERT INTO pokemon_cards (id, set_id, name, number, image_small, image_large)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (id) DO NOTHING`,
                [
                  card.id,
                  card.setId,
                  card.name,
                  card.number,
                  card.imageSmall,
                  card.imageLarge,
                ]
              );
              progress.cardsAdded++;
            } catch (err: any) {
              // ignore individual card errors (e.g. FK violation)
            }
          } else {
            // Card exists — update images if they're missing
            const existingImg = existingCards.get(card.id);
            if (!existingImg || existingImg === "") {
              try {
                await pool.query(
                  `UPDATE pokemon_cards
                   SET image_small = $1, image_large = $2
                   WHERE id = $3 AND (image_small IS NULL OR image_small = '')`,
                  [card.imageSmall, card.imageLarge, card.id]
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
        console.error(
          `[Scrydex] Failed to process cards for ${setId}:`,
          err.message
        );
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
