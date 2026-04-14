import { db } from "./db";
import {
  pokemonSets,
  pokemonCards,
  cardPricing,
  ebayPrices,
  syncStatus,
} from "@shared/schema";
import { eq, inArray, sql, and } from "drizzle-orm";
import { scrapeCardSearch, generateEbaySearchUrl, generateEbaySoldUrl } from "./pokecardvalues-scraper";
import * as cheerio from "cheerio";

const POKEMON_API = "https://api.pokemontcg.io/v2";
const PRICE_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const EBAY_THROTTLE_MS = 2000;
const GBP_THROTTLE_MS = 1000;
const TCG_REQUEST_DELAY_MS = 200;

let syncRunning = false;
let priceRefreshTimer: ReturnType<typeof setInterval> | null = null;

interface TcgPriceTier {
  low?: number | null;
  mid?: number | null;
  high?: number | null;
  market?: number | null;
  directLow?: number | null;
}

interface TcgPlayerPrices {
  normal?: TcgPriceTier;
  holofoil?: TcgPriceTier;
  "1stEditionNormal"?: TcgPriceTier;
  "1stEditionHolofoil"?: TcgPriceTier;
}

interface CardmarketPrices {
  averageSellPrice?: number | null;
  avg1?: number | null;
  lowPrice?: number | null;
  trendPrice?: number | null;
}

interface PokemonTcgCard {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  supertype?: string;
  subtypes?: string[];
  images?: { small?: string; large?: string };
  artist?: string;
  hp?: string;
  nationalPokedexNumbers?: number[];
  set?: {
    id: string;
    name?: string;
    series?: string;
    printedTotal?: number;
    total?: number;
    releaseDate?: string;
    images?: { symbol?: string; logo?: string };
  };
  tcgplayer?: { prices?: TcgPlayerPrices };
  cardmarket?: { prices?: CardmarketPrices };
}

interface PokemonTcgSet {
  id: string;
  name: string;
  series: string;
  printedTotal?: number;
  total?: number;
  releaseDate?: string;
  images?: { symbol?: string; logo?: string };
}

interface EbayListing {
  title: string;
  price: number;
  currency: string;
  soldDate: string;
  listingUrl: string;
  isSold: boolean;
}

const SYNC_STATUS_ID = 1;

async function getOrCreateSyncStatus() {
  const rows = await db.select().from(syncStatus).where(eq(syncStatus.id, SYNC_STATUS_ID)).limit(1);
  if (rows.length === 0) {
    const inserted = await db
      .insert(syncStatus)
      .values({ id: SYNC_STATUS_ID, totalSets: 0, syncedSets: 0, totalCards: 0, syncedCards: 0, isRunning: false })
      .onConflictDoNothing()
      .returning();
    if (inserted.length > 0) return inserted[0];
    const refetched = await db.select().from(syncStatus).where(eq(syncStatus.id, SYNC_STATUS_ID)).limit(1);
    return refetched[0];
  }
  return rows[0];
}

async function updateSyncStatus(patch: Partial<typeof syncStatus.$inferInsert>) {
  await db
    .insert(syncStatus)
    .values({ id: SYNC_STATUS_ID, ...patch })
    .onConflictDoUpdate({
      target: syncStatus.id,
      set: { ...patch, updatedAt: new Date() },
    });
}

function buildTcgHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "User-Agent": "PokeScanTCG/1.0" };
  const key = process.env.POKEMON_TCG_API_KEY;
  if (key) headers["X-Api-Key"] = key;
  return headers;
}

async function fetchJson(url: string, retries = 2): Promise<unknown> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(url, { headers: buildTcgHeaders(), signal: controller.signal });
      clearTimeout(timer);
      if (res.status === 429 || res.status === 503 || res.status === 504) {
        // Rate limited or server error — wait and retry
        if (attempt < retries) {
          await sleep(10000 * (attempt + 1));
          continue;
        }
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return res.json();
    } catch (err: any) {
      clearTimeout(timer);
      if (attempt < retries && (err.name === "AbortError" || err.message?.includes("fetch"))) {
        await sleep(5000 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`fetchJson exhausted retries for ${url}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function syncAllSets(): Promise<void> {
  console.log("[CardSync] Fetching all sets from Pokemon TCG API...");
  const responseData = await fetchJson(`${POKEMON_API}/sets?orderBy=-releaseDate&pageSize=250`);
  const sets = (responseData as { data?: PokemonTcgSet[] }).data ?? [];
  console.log(`[CardSync] Got ${sets.length} sets.`);

  await updateSyncStatus({ totalSets: sets.length });

  for (const set of sets) {
    try {
      await db
        .insert(pokemonSets)
        .values({
          id: set.id,
          name: set.name,
          series: set.series ?? "",
          printedTotal: set.printedTotal ?? null,
          total: set.total ?? null,
          releaseDate: set.releaseDate ?? null,
          logoUrl: set.images?.logo ?? null,
          symbolUrl: set.images?.symbol ?? null,
          imageUrl: set.images?.logo ?? null,
          syncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: pokemonSets.id,
          set: {
            name: set.name,
            series: set.series ?? "",
            printedTotal: set.printedTotal ?? null,
            total: set.total ?? null,
            releaseDate: set.releaseDate ?? null,
            logoUrl: set.images?.logo ?? null,
            symbolUrl: set.images?.symbol ?? null,
            imageUrl: set.images?.logo ?? null,
            syncedAt: new Date(),
          },
        });
    } catch (err) {
      console.error(`[CardSync] Failed to upsert set ${set.id}:`, err);
    }
  }
}

async function syncCardsForSet(setId: string, setName: string, force = false): Promise<number> {
  let allCards: PokemonTcgCard[] = [];
  let page = 1;

  while (true) {
    const data = await fetchJson(
      `${POKEMON_API}/cards?q=set.id:${setId}&orderBy=number&page=${page}&pageSize=250`
    );
    const typed = data as { data?: PokemonTcgCard[]; totalCount?: number };
    const cards = typed.data ?? [];
    allCards = allCards.concat(cards);
    if (allCards.length >= (typed.totalCount ?? 0) || cards.length < 250) break;
    page++;
  }

  let existingIds = new Set<string>();
  if (!force && allCards.length > 0) {
    const ids = allCards.map((c) => c.id);
    const existing = await db
      .select({ id: pokemonCards.id })
      .from(pokemonCards)
      .where(inArray(pokemonCards.id, ids));
    existingIds = new Set(existing.map((r) => r.id));
  }

  let inserted = 0;
  for (const card of allCards) {
    const alreadySynced = !force && existingIds.has(card.id);
    try {
      await db
        .insert(pokemonCards)
        .values({
          id: card.id,
          setId: card.set?.id ?? setId,
          name: card.name,
          number: card.number,
          rarity: card.rarity ?? null,
          supertype: card.supertype ?? null,
          subtypes: card.subtypes ? card.subtypes.join(",") : null,
          imageSmall: card.images?.small ?? null,
          imageLarge: card.images?.large ?? null,
          artist: card.artist ?? null,
          hp: card.hp ?? null,
          nationalPokedexNumbers: card.nationalPokedexNumbers
            ? card.nationalPokedexNumbers.join(",")
            : null,
          syncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: pokemonCards.id,
          set: {
            name: card.name,
            number: card.number,
            rarity: card.rarity ?? null,
            supertype: card.supertype ?? null,
            subtypes: card.subtypes ? card.subtypes.join(",") : null,
            imageSmall: card.images?.small ?? null,
            imageLarge: card.images?.large ?? null,
            artist: card.artist ?? null,
            hp: card.hp ?? null,
            nationalPokedexNumbers: card.nationalPokedexNumbers
              ? card.nationalPokedexNumbers.join(",")
              : null,
            syncedAt: new Date(),
          },
        });

      if (!alreadySynced || force) {
        await syncPricingForCard(card);

        await sleep(GBP_THROTTLE_MS);
        await syncGbpPricingForCard(card.id, card.name, card.number);

        await sleep(EBAY_THROTTLE_MS);
        await syncEbayPricesForCard(card.id, card.name, setName, card.number);
      }

      inserted++;
    } catch (err) {
      console.error(`[CardSync] Failed to upsert card ${card.id}:`, err);
    }
  }

  return inserted;
}

async function syncPricingForCard(card: PokemonTcgCard): Promise<void> {
  const tcgp = card.tcgplayer?.prices;
  const cm = card.cardmarket?.prices;

  const tcgNormal: TcgPriceTier | null =
    tcgp?.normal ??
    tcgp?.holofoil ??
    tcgp?.["1stEditionNormal"] ??
    tcgp?.["1stEditionHolofoil"] ??
    null;

  const tcgLow = tcgNormal?.low ?? null;
  const tcgMid = tcgNormal?.mid ?? null;
  const tcgHigh = tcgNormal?.high ?? null;
  const tcgMarket = tcgNormal?.market ?? null;
  const tcgDirectLow = tcgNormal?.directLow ?? null;

  const cardmarketAvg = cm?.averageSellPrice ?? cm?.avg1 ?? null;
  const cardmarketLow = cm?.lowPrice ?? null;
  const cardmarketTrend = cm?.trendPrice ?? null;

  try {
    await db
      .insert(cardPricing)
      .values({
        cardId: card.id,
        tcgLow,
        tcgMid,
        tcgHigh,
        tcgMarket,
        tcgDirectLow,
        cardmarketAvg,
        cardmarketLow,
        cardmarketTrend,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: cardPricing.cardId,
        set: {
          tcgLow,
          tcgMid,
          tcgHigh,
          tcgMarket,
          tcgDirectLow,
          cardmarketAvg,
          cardmarketLow,
          cardmarketTrend,
          updatedAt: new Date(),
        },
      });
  } catch (err) {
    console.error(`[CardSync] Failed to upsert pricing for card ${card.id}:`, err);
  }
}

async function syncGbpPricingForCard(cardId: string, cardName: string, cardNumber: string): Promise<void> {
  try {
    const results = await scrapeCardSearch(cardName);
    if (!results || results.length === 0) return;

    const numOnly = String(cardNumber).split("/")[0].replace(/^0+/, "");
    const match =
      results.find((c) => {
        const cNum = String(c.number).split("/")[0].replace(/^0+/, "");
        return cNum === numOnly;
      }) ?? results[0];

    if (!match || match.priceGBP === null) return;

    await db
      .insert(cardPricing)
      .values({ cardId, priceGBP: match.priceGBP, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: cardPricing.cardId,
        set: { priceGBP: match.priceGBP, updatedAt: new Date() },
      });
  } catch (err) {
    console.error(`[CardSync] GBP price sync failed for card ${cardId}:`, err);
  }
}

async function scrapeEbayListings(url: string, isSold: boolean): Promise<EbayListing[]> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-GB,en;q=0.9",
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const listings: EbayListing[] = [];

    $(".s-item").each((_, el) => {
      const $el = $(el);
      const title = $el.find(".s-item__title").text().trim();
      if (!title || title === "Shop on eBay") return;

      const priceText = $el.find(".s-item__price").text().trim();
      const priceMatch = priceText.match(/[£$€]([\d,]+\.?\d*)/);
      if (!priceMatch) return;
      const price = parseFloat(priceMatch[1].replace(",", ""));
      const currency = priceText.startsWith("£")
        ? "GBP"
        : priceText.startsWith("$")
        ? "USD"
        : "EUR";

      const soldDate = $el
        .find(".s-item__caption--row, .POSITIVE, .s-item__endedDate")
        .first()
        .text()
        .trim();
      const listingUrl = $el.find("a.s-item__link").attr("href") ?? "";

      listings.push({ title, price, currency, soldDate, listingUrl, isSold });
    });

    return listings;
  } catch (err) {
    console.error("[CardSync] eBay scrape error:", err);
    return [];
  }
}

async function syncEbayPricesForCard(
  cardId: string,
  cardName: string,
  setName?: string,
  cardNumber?: string
): Promise<void> {
  try {
    const soldUrl = generateEbaySoldUrl(cardName, setName, cardNumber);
    const activeUrl = generateEbaySearchUrl(cardName, setName, cardNumber);

    const [soldListings, activeListings] = await Promise.all([
      scrapeEbayListings(soldUrl, true),
      scrapeEbayListings(activeUrl, false),
    ]);

    const allListings = [...soldListings.slice(0, 10), ...activeListings.slice(0, 5)];
    if (allListings.length === 0) return;

    const existingRows = await db
      .select({ listingUrl: ebayPrices.listingUrl, isSold: ebayPrices.isSold })
      .from(ebayPrices)
      .where(eq(ebayPrices.cardId, cardId));
    const existingKeys = new Set(
      existingRows.map((r) => `${r.listingUrl ?? ""}|${r.isSold ? "1" : "0"}`)
    );

    for (const listing of allListings) {
      const key = `${listing.listingUrl}|${listing.isSold ? "1" : "0"}`;
      if (existingKeys.has(key)) continue;

      await db.insert(ebayPrices).values({
        cardId,
        title: listing.title,
        price: listing.price,
        currency: listing.currency,
        soldDate: listing.soldDate || null,
        listingUrl: listing.listingUrl,
        isSold: listing.isSold,
        fetchedAt: new Date(),
      });
      existingKeys.add(key);
    }
  } catch (err) {
    console.error(`[CardSync] eBay sync failed for card ${cardId}:`, err);
  }
}

export async function runFullSync(force = false): Promise<void> {
  if (syncRunning) {
    console.log("[CardSync] Sync already in progress, skipping.");
    return;
  }
  syncRunning = true;
  await updateSyncStatus({ isRunning: true, lastError: null });
  console.log("[CardSync] Starting full card sync...");

  try {
    await syncAllSets();

    const sets = await db.select().from(pokemonSets);
    await updateSyncStatus({ totalSets: sets.length, syncedSets: 0 });

    let totalSynced = 0;
    let syncedSetsCount = 0;

    for (const set of sets) {
      try {
        const count = await syncCardsForSet(set.id, set.name, force);
        totalSynced += count;
        syncedSetsCount++;
        await updateSyncStatus({ syncedSets: syncedSetsCount, syncedCards: totalSynced });
        console.log(`[CardSync] Set ${set.id} (${set.name}): ${count} cards synced.`);
      } catch (err) {
        console.error(`[CardSync] Error syncing set ${set.id}:`, err);
      }
    }

    await updateSyncStatus({
      isRunning: false,
      lastCardSyncAt: new Date(),
      totalCards: totalSynced,
      syncedCards: totalSynced,
    });
    console.log(`[CardSync] Full sync complete. ${totalSynced} cards across ${syncedSetsCount} sets.`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[CardSync] Sync failed:", err);
    await updateSyncStatus({ isRunning: false, lastError: msg });
  } finally {
    syncRunning = false;
  }
}

export async function runPriceRefresh(): Promise<void> {
  console.log("[CardSync] Starting pricing refresh...");
  try {
    const allSets = await db.select({ id: pokemonSets.id, name: pokemonSets.name }).from(pokemonSets);

    for (const set of allSets) {
      const cards = await db
        .select({
          id: pokemonCards.id,
          name: pokemonCards.name,
          number: pokemonCards.number,
          rarity: pokemonCards.rarity,
          setId: pokemonCards.setId,
        })
        .from(pokemonCards)
        .where(eq(pokemonCards.setId, set.id));

      for (const card of cards) {
        try {
          const apiData = await fetchJson(`${POKEMON_API}/cards/${card.id}`);
          const typed = apiData as { data?: PokemonTcgCard };
          if (typed.data) {
            await syncPricingForCard(typed.data);
          }
          await sleep(TCG_REQUEST_DELAY_MS);

          await sleep(GBP_THROTTLE_MS);
          await syncGbpPricingForCard(card.id, card.name, card.number);

          await sleep(EBAY_THROTTLE_MS);
          await syncEbayPricesForCard(card.id, card.name, set.name, card.number);
        } catch (err) {
          console.error(`[CardSync] Price refresh failed for ${card.id}:`, err);
        }
      }
    }

    await updateSyncStatus({ lastPriceSyncAt: new Date() });
    console.log("[CardSync] Pricing refresh complete.");
  } catch (err) {
    console.error("[CardSync] Pricing refresh error:", err);
  }
}

// Fast card seed — basic data only, no pricing/eBay, runs in background
async function runFastCardSeed(): Promise<void> {
  console.log("[CardSync] Starting fast card seed (basic data, no pricing)...");
  const allSets = await db.select({ id: pokemonSets.id, name: pokemonSets.name }).from(pokemonSets);

  // Find which sets already have cards seeded so we can resume mid-seed
  const alreadySeededRows = await db
    .select({ setId: pokemonCards.setId })
    .from(pokemonCards)
    .groupBy(pokemonCards.setId);
  const alreadySeeded = new Set(alreadySeededRows.map((r) => r.setId));
  const sets = allSets.filter((s) => !alreadySeeded.has(s.id));
  console.log(`[CardSync] ${alreadySeeded.size} sets already seeded, ${sets.length} remaining...`);

  let totalInserted = 0;

  // Sets known to have no cards in the TCG API
  // Note: me*, zsv*, rsv* sets DO have cards — they are not skipped
  const NO_CARD_PREFIXES: string[] = [];

  for (const set of sets) {
    // Skip regional sets with no TCG API card data immediately
    if (NO_CARD_PREFIXES.some((p) => set.id.startsWith(p))) {
      console.log(`[CardSync] Skipped set ${set.id} (regional set, no TCG API cards)`);
      await sleep(200);
      continue;
    }

    try {
      let allCards: PokemonTcgCard[] = [];
      let page = 1;
      while (true) {
        let pageData: { data?: PokemonTcgCard[]; totalCount?: number } | null = null;
        // Single attempt per page — fail fast, no retry (saves API quota for user requests)
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 12000); // 12s timeout — fail fast
        try {
          const res = await fetch(
            `${POKEMON_API}/cards?q=set.id:${set.id}&orderBy=number&page=${page}&pageSize=250`,
            { headers: buildTcgHeaders(), signal: ctrl.signal }
          );
          clearTimeout(timer);
          if (res.status === 429) {
            // Rate limited — back off and let user requests through
            console.log(`[CardSync] Rate limited for ${set.id}, waiting 20s...`);
            await sleep(20000);
            // don't retry this set — skip it
          } else if (res.ok) {
            const ct = res.headers.get("content-type") || "";
            if (ct.includes("application/json")) {
              pageData = await res.json();
            }
          }
          // Any non-ok, non-429 status: leave pageData null → skip set
        } catch (fetchErr: any) {
          clearTimeout(timer);
          // Timeout or network error — skip this set immediately
          if (fetchErr.name === "AbortError") {
            console.log(`[CardSync] Timeout for ${set.id} page ${page}, skipping set`);
          }
        }
        if (!pageData) break; // couldn't fetch this page — skip set
        const cards = pageData.data ?? [];
        allCards = allCards.concat(cards);
        if (allCards.length >= (pageData.totalCount ?? 0) || cards.length < 250) break;
        page++;
        await sleep(1500); // pause between pages to avoid rate limiting
      }

      for (const card of allCards) {
        try {
          await db.insert(pokemonCards).values({
            id: card.id,
            setId: card.set?.id ?? set.id,
            name: card.name,
            number: card.number,
            rarity: card.rarity ?? null,
            supertype: card.supertype ?? null,
            subtypes: card.subtypes ? card.subtypes.join(",") : null,
            imageSmall: card.images?.small ?? null,
            imageLarge: card.images?.large ?? null,
            artist: card.artist ?? null,
            hp: card.hp ?? null,
            nationalPokedexNumbers: card.nationalPokedexNumbers
              ? card.nationalPokedexNumbers.join(",")
              : null,
            syncedAt: new Date(),
          }).onConflictDoNothing();
          totalInserted++;
        } catch {}
      }

      if (allCards.length > 0) {
        console.log(`[CardSync] Fast seeded ${allCards.length} cards for set ${set.id} (${set.name})`);
      } else {
        console.log(`[CardSync] Skipped set ${set.id} (no cards available)`);
      }
      await sleep(5000); // Be polite to the TCG API — 5s gap protects user request quota
    } catch (err) {
      console.error(`[CardSync] Fast seed error for set ${set.id}:`, err);
      await sleep(1000);
    }
  }

  await updateSyncStatus({ totalCards: totalInserted, syncedCards: totalInserted, lastCardSyncAt: new Date() });
  console.log(`[CardSync] Fast card seed complete — ${totalInserted} cards in DB.`);
}

/** After TCG API seeding, fill any still-empty sets from Scrydex (Japanese, TCG Pocket, etc.) */
async function runScrydexStartupSync(): Promise<void> {
  try {
    // Quick DB check before hitting Scrydex — skip if no sets are missing cards
    const emptyRes = await db.execute(
      sql`SELECT COUNT(*) AS cnt FROM pokemon_sets s
          WHERE NOT EXISTS (SELECT 1 FROM pokemon_cards c WHERE c.set_id = s.id)`
    );
    const emptySets = parseInt((emptyRes.rows[0] as any)?.cnt ?? "0", 10);
    if (emptySets === 0) {
      console.log("[Scrydex] All sets have cards — skipping startup Scrydex sync.");
      return;
    }
    console.log(`[Scrydex] ${emptySets} empty sets found — running Scrydex startup sync...`);
    const { runScrydexSync } = await import("./scrydex-scraper");
    const result = await runScrydexSync((p) => {
      if (p.currentSet) {
        console.log(`[Scrydex] [${p.setsProcessed}/${p.setsTotal}] ${p.currentSet} — +${p.cardsAdded} cards`);
      }
    });
    console.log(`[Scrydex] Startup sync done — ${result.setsAdded} sets added, ${result.cardsAdded} cards added, ${result.cardsUpdated} images updated.`);
  } catch (err: any) {
    console.error("[Scrydex] Startup sync error:", err.message);
  }
}

export async function startSyncService(): Promise<void> {
  console.log("[CardSync] Sync service starting...");

  if (priceRefreshTimer) clearInterval(priceRefreshTimer);
  priceRefreshTimer = setInterval(() => {
    runPriceRefresh().catch((err) =>
      console.error("[CardSync] Price refresh interval error:", err)
    );
  }, PRICE_REFRESH_INTERVAL_MS);

  // Check DB state and seed if needed
  setTimeout(async () => {
    try {
      const [totalSetRows, seededSetRows] = await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(pokemonSets),
        db.select({ count: sql<number>`count(distinct set_id)::int` }).from(pokemonCards),
      ]);
      const totalSets = totalSetRows[0]?.count ?? 0;
      const seededSets = seededSetRows[0]?.count ?? 0;

      // Always seed Asian sets (JP/KO/ZH) in background — fast insert, skips existing
      import("./asian-set-seed").then(({ seedAsianSets }) => {
        seedAsianSets().then(r =>
          console.log(`[AsianSeed] Done — inserted ${r.inserted}, skipped ${r.skipped}, errors ${r.errors}`)
        ).catch(console.error);
      }).catch(console.error);

      // Always seed Non-TCG sets (Babanuki, Mengka, etc.) in background
      import("./non-tcg-seed").then(({ seedNonTcgSets }) => {
        seedNonTcgSets().then(r =>
          console.log(`[NonTcgSeed] Done — inserted ${r.inserted}, skipped ${r.skipped}, errors ${r.errors}`)
        ).catch(console.error);
      }).catch(console.error);

      if (totalSets === 0) {
        console.log("[CardSync] DB empty — seeding sets first...");
        await syncAllSets();
        console.log("[CardSync] Sets seeded. Starting fast card seed in background...");
        await runFastCardSeed();
        // After TCG API seeding, fill remaining empty sets from Scrydex
        runScrydexStartupSync().catch(console.error);
      } else if (seededSets < totalSets) {
        // Some sets still have 0 cards — seed from TCG API first, then Scrydex
        console.log(`[CardSync] ${seededSets}/${totalSets} sets have cards — seeding ${totalSets - seededSets} missing sets...`);
        await runFastCardSeed();
        // After TCG API seeding, fill any that are still empty (non-TCG-API sets)
        runScrydexStartupSync().catch(console.error);
      } else {
        console.log(`[CardSync] DB fully seeded: ${seededSets}/${totalSets} sets with cards — OK.`);
        // Still run Scrydex sync in background to catch any new/empty sets
        runScrydexStartupSync().catch(console.error);
      }
    } catch (err) {
      console.error("[CardSync] Auto-seed check failed:", err);
    }
  }, 5000);
}

export async function getSyncStatus() {
  return getOrCreateSyncStatus();
}

export { syncRunning };
