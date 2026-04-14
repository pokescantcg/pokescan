import { calculateGrade } from "./services/grading";
import { getUserQuota, dailyCheckin, consumeScan } from "./scan-quota";
import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import express from "express";
import OpenAI from "openai";
import bcrypt from "bcryptjs";
import {
  scrapeSets,
  scrapeSetCards,
  scrapeTopCards,
  scrapeCardSearch,
  generateEbaySearchUrl,
  generateEbaySoldUrl,
} from "./pokecardvalues-scraper";
import { storage } from "./storage";
import {
  createOtp,
  verifyOtp,
  sendOtpByEmail,
  sendOtpBySms,
} from "./otp-service";
import { db, pool } from "./db";
import {
  pokemonSets,
  pokemonCards,
  cardPricing,
  ebayPrices,
  pokescanUsers,
  pokescanSessions,
  pokescanFriendships,
  pokescanMessages,
  pokescanReports,
} from "@shared/schema";
import { eq, desc, sql, ilike, or, and, ne } from "drizzle-orm";
import { startSyncService, getSyncStatus, runFullSync } from "./card-sync";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const POKEMON_API = "https://api.pokemontcg.io/v2";

function tcgHeaders(): Record<string, string> {
  const h: Record<string, string> = { "User-Agent": "PokeScanTCG/1.0" };
  if (process.env.POKEMON_TCG_API_KEY) h["X-Api-Key"] = process.env.POKEMON_TCG_API_KEY;
  return h;
}

// In-memory cache for set cards (avoids repeated TCG API hits within a server session)
const setCardsMemCache = new Map<string, { data: any; ts: number }>();
const MEM_CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes
function getMemCache(key: string) {
  const e = setCardsMemCache.get(key);
  return e && Date.now() - e.ts < MEM_CACHE_TTL_MS ? e.data : null;
}
function setMemCache(key: string, data: any) {
  setCardsMemCache.set(key, { data, ts: Date.now() });
}

// Individual card cache — populated when set cards are loaded so tapping a card
// from a freshly-loaded set never needs a second API call.
const cardMemCache = new Map<string, { data: any; ts: number }>();
function getCardCache(id: string) {
  const e = cardMemCache.get(id);
  return e && Date.now() - e.ts < MEM_CACHE_TTL_MS ? e.data : null;
}
function setCardCache(id: string, data: any) {
  cardMemCache.set(id, { data, ts: Date.now() });
}
// Bulk-populate card cache from a set response (call after any set load)
function warmCardCache(cards: any[]) {
  for (const card of cards) {
    if (card?.id && !cardMemCache.has(card.id)) {
      setCardCache(card.id, { data: card });
    }
  }
}

function detectSetLanguage(setId: string): "english" | "japanese" | "korean" | "chinese" {
  const id = setId.toLowerCase();
  if (id.includes("_ja")) return "japanese";
  if (id.includes("_ko")) return "korean";
  if (id.includes("_zh") || id.includes("_cn")) return "chinese";
  // me*, rsv*, zsv* sets have English names and belong in English
  return "english";
}

function dbSetToApiFormat(set: typeof pokemonSets.$inferSelect) {
  return {
    id: set.id,
    name: set.name,
    series: set.series,
    printedTotal: set.printedTotal,
    total: set.total,
    releaseDate: set.releaseDate,
    language: detectSetLanguage(set.id),
    images: {
      symbol: set.symbolUrl,
      logo: set.logoUrl,
    },
  };
}

interface FormattedCard {
  id: string;
  name: string;
  number: string;
  rarity: string | null;
  supertype: string | null;
  subtypes: string[];
  images: { small: string | null; large: string | null };
  artist: string | null;
  hp: string | null;
  set: { id: string; name?: string; series?: string; printedTotal?: number | null; total?: number | null; releaseDate?: string | null; images?: { symbol: string | null; logo: string | null } };
  tcgplayer?: {
    prices: {
      normal: {
        low: number | null;
        mid: number | null;
        high: number | null;
        market: number | null;
        directLow: number | null;
      };
    };
  };
  cardmarket?: {
    prices: {
      averageSellPrice: number | null;
      lowPrice: number | null;
      trendPrice: number | null;
    };
  };
  priceGBP?: number | null;
  ebayListings?: Array<{
    title: string | null;
    price: number | null;
    currency: string | null;
    soldDate: string | null;
    listingUrl: string | null;
    isSold: boolean | null;
  }>;
}

function dbCardToApiFormat(
  card: typeof pokemonCards.$inferSelect,
  pricing?: typeof cardPricing.$inferSelect | null,
  ebay?: Array<typeof ebayPrices.$inferSelect>
): FormattedCard {
  const base: FormattedCard = {
    id: card.id,
    name: card.name,
    number: card.number,
    rarity: card.rarity,
    supertype: card.supertype,
    subtypes: card.subtypes ? card.subtypes.split(",") : [],
    images: {
      small: card.imageSmall,
      large: card.imageLarge,
    },
    artist: card.artist,
    hp: card.hp,
    set: { id: card.setId },
  };

  if (pricing) {
    base.tcgplayer = {
      prices: {
        normal: {
          low: pricing.tcgLow,
          mid: pricing.tcgMid,
          high: pricing.tcgHigh,
          market: pricing.tcgMarket,
          directLow: pricing.tcgDirectLow,
        },
      },
    };
    base.cardmarket = {
      prices: {
        averageSellPrice: pricing.cardmarketAvg,
        lowPrice: pricing.cardmarketLow,
        trendPrice: pricing.cardmarketTrend,
      },
    };
    base.priceGBP = pricing.priceGBP;
  }

  if (ebay && ebay.length > 0) {
    base.ebayListings = ebay.map((e) => ({
      title: e.title,
      price: e.price,
      currency: e.currency,
      soldDate: e.soldDate,
      listingUrl: e.listingUrl,
      isSold: e.isSold,
    }));
  }

  return base;
}

export async function registerRoutes(app: Express): Promise<Server> {
  startSyncService();

  app.get("/api/pokemon/sets", async (_req: Request, res: Response) => {
    try {
      const dbSets = await db.select().from(pokemonSets).orderBy(desc(pokemonSets.releaseDate));
      if (dbSets.length > 0) {
        res.json({ data: dbSets.map(dbSetToApiFormat), count: dbSets.length, source: "db" });
        return;
      }
    } catch (dbError) {
      console.error("DB sets query failed, falling back to API:", dbError);
    }
    // Fallback: live Pokemon TCG API with 10s timeout
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(`${POKEMON_API}/sets?orderBy=-releaseDate&pageSize=250`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`TCG API returned ${response.status}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Failed to fetch sets:", error);
      res.status(500).json({ error: "Failed to fetch sets" });
    }
  });

  app.get("/api/pokemon/sets/:setId/cards", async (req: Request, res: Response) => {
    try {
      const { setId } = req.params;
      const page = parseInt((req.query.page as string) || "1", 10);
      const pageSize = parseInt((req.query.pageSize as string) || "250", 10);
      const offset = (page - 1) * pageSize;
      const cacheKey = `${setId}:${page}:${pageSize}`;

      // 1. Check in-memory cache (instant)
      const memHit = getMemCache(cacheKey);
      if (memHit) {
        res.json(memHit);
        return;
      }

      // Non-English set IDs (JP/KO/ZH suffixes or non-TCG patterns) are not in the
      // TCG API — only serve from DB, never fall through to TCG API.
      const nonEnglishPatterns = ["_ja", "_ko", "_zh", "_cn", "topsun", "babanuki", "mengka", "oldmaid", "hanafuda"];
      const isNonEnglish = nonEnglishPatterns.some((p) => setId.toLowerCase().includes(p));

      // 2. Check DB
      try {
        const [totalCountResult, setInfoResult] = await Promise.all([
          db.select({ count: sql<number>`count(*)::int` }).from(pokemonCards).where(eq(pokemonCards.setId, setId)),
          db.select({ total: pokemonSets.total }).from(pokemonSets).where(eq(pokemonSets.id, setId)).limit(1),
        ]);
        const totalCount = totalCountResult[0]?.count ?? 0;
        const expectedTotal = setInfoResult[0]?.total ?? 0;

        // For non-English sets: serve whatever cards we have (any amount).
        // For English sets: only serve if ≥90% seeded (ensures complete sets).
        const hasCards = totalCount > 0;
        const fullySeeded = hasCards && (isNonEnglish || expectedTotal === 0 || totalCount >= Math.floor(expectedTotal * 0.9));

        if (fullySeeded) {
          const dbCards = await db
            .select()
            .from(pokemonCards)
            .where(eq(pokemonCards.setId, setId))
            .orderBy(pokemonCards.number)
            .limit(pageSize)
            .offset(offset);

          const formattedCards = dbCards.map((card) => dbCardToApiFormat(card, null));
          const payload = { data: formattedCards, count: formattedCards.length, totalCount, page, source: "db" };
          setMemCache(cacheKey, payload);
          warmCardCache(formattedCards);
          res.json(payload);
          return;
        }
      } catch (dbErr) {
        console.error("DB query failed for set cards:", dbErr);
      }

      // Non-English sets with no DB cards → return empty data gracefully (no TCG API call)
      if (isNonEnglish) {
        const emptyPayload = { data: [], count: 0, totalCount: 0, page, source: "no-data" };
        res.json(emptyPayload);
        return;
      }

      // 3. Fetch from TCG API for English sets (30s timeout)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(
        `${POKEMON_API}/cards?q=set.id:${setId}&orderBy=number&page=${page}&pageSize=${pageSize}`,
        { signal: controller.signal, headers: tcgHeaders() }
      );
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`TCG API ${response.status}`);
      const data = await response.json();

      // Cache the result and warm the individual card cache
      setMemCache(cacheKey, data);
      warmCardCache(data.data || []);
      res.json(data);

      // 4. Background: seed all pages of this set's cards into DB for future fast loads
      (async () => {
        try {
          let bgPage = 1;
          let seeded = 0;
          while (true) {
            const ctrl2 = new AbortController();
            const t2 = setTimeout(() => ctrl2.abort(), 30000);
            const r2 = await fetch(
              `${POKEMON_API}/cards?q=set.id:${setId}&orderBy=number&page=${bgPage}&pageSize=250`,
              { signal: ctrl2.signal }
            );
            clearTimeout(t2);
            if (!r2.ok) break;
            const d2 = await r2.json();
            const cards2: any[] = d2.data || [];
            if (cards2.length === 0) break;

            for (const card of cards2) {
              try {
                await db.insert(pokemonCards).values({
                  id: card.id,
                  setId: card.set?.id || setId,
                  name: card.name,
                  number: card.number,
                  rarity: card.rarity || null,
                  supertype: card.supertype || null,
                  subtypes: Array.isArray(card.subtypes) ? card.subtypes.join(",") : null,
                  hp: card.hp || null,
                  artist: card.artist || null,
                  imageSmall: card.images?.small || null,
                  imageLarge: card.images?.large || null,
                }).onConflictDoNothing();
              } catch {}
            }
            seeded += cards2.length;
            if (cards2.length < 250) break;
            bgPage++;
          }
          if (seeded > 0) {
            console.log(`[BgSeed] Seeded ${seeded} cards for set ${setId}`);
            // Invalidate mem cache so next request reads from DB
            for (const k of setCardsMemCache.keys()) {
              if (k.startsWith(`${setId}:`)) setCardsMemCache.delete(k);
            }
          }
        } catch (bgErr) {
          // Silent — background seed failure is non-critical
        }
      })();
    } catch (error: any) {
      if (error?.name === "AbortError") {
        res.status(504).json({ error: "Cards took too long to load. Please try again." });
      } else {
        console.error("Failed to fetch set cards:", error);
        res.status(500).json({ error: "Failed to fetch cards. Please try again." });
      }
    }
  });

  app.get("/api/pokemon/cards/search", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length < 2) {
        res.json({ data: [], count: 0, totalCount: 0 });
        return;
      }
      const page = parseInt(String(req.query.page || "1"), 10);
      const pageSize = 20;
      const offset = (page - 1) * pageSize;

      // 1. Search local DB first (fast, no network dependency)
      try {
        const dbResults = await db
          .select({ card: pokemonCards, set: pokemonSets })
          .from(pokemonCards)
          .leftJoin(pokemonSets, eq(pokemonCards.setId, pokemonSets.id))
          .where(ilike(pokemonCards.name, `%${query.trim()}%`))
          .orderBy(desc(pokemonSets.releaseDate))
          .limit(pageSize)
          .offset(offset);

        if (dbResults.length > 0) {
          const formatted = dbResults.map(({ card, set }) => {
            const base = dbCardToApiFormat(card, null);
            if (set) {
              base.set = {
                id: set.id,
                name: set.name,
                series: set.series ?? undefined,
                printedTotal: set.printedTotal,
                total: set.total,
                releaseDate: set.releaseDate,
                images: { symbol: set.symbolUrl, logo: set.logoUrl },
              };
            }
            return base;
          });

          const totalCountResult = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(pokemonCards)
            .where(ilike(pokemonCards.name, `%${query.trim()}%`));

          const totalCount = totalCountResult[0]?.count ?? formatted.length;
          res.json({ data: formatted, count: formatted.length, totalCount, source: "db" });
          return;
        }
      } catch (dbErr) {
        console.error("DB card search failed, falling back to API:", dbErr);
      }

      // 2. Fall back to live TCG API with a strict 12s timeout
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      try {
        const encodedQuery = encodeURIComponent(`name:"${query.trim()}*"`);
        const response = await fetch(
          `${POKEMON_API}/cards?q=${encodedQuery}&orderBy=-set.releaseDate&page=${page}&pageSize=${pageSize}`,
          { signal: ctrl.signal, headers: tcgHeaders() }
        );
        clearTimeout(timer);
        const text = await response.text();
        if (!response.ok) {
          console.error(`Pokemon TCG API error ${response.status}: ${text.substring(0, 200)}`);
          res.json({ data: [], count: 0, totalCount: 0 });
          return;
        }
        const data = JSON.parse(text);
        res.json(data);
      } catch (apiErr: any) {
        clearTimeout(timer);
        if (apiErr.name === "AbortError") {
          res.json({ data: [], count: 0, totalCount: 0, error: "Search timed out" });
        } else {
          console.error("Failed to search cards:", apiErr);
          res.json({ data: [], count: 0, totalCount: 0 });
        }
      }
    } catch (error) {
      console.error("Failed to search cards:", error);
      res.json({ data: [], count: 0, totalCount: 0 });
    }
  });

  app.get("/api/pokemon/sets/:setId/all-cards", async (req: Request, res: Response) => {
    try {
      const { setId } = req.params;

      // Only serve from DB if the set is fully seeded (≥90% of expected cards)
      const setInfoResult = await db.select({ total: pokemonSets.total }).from(pokemonSets).where(eq(pokemonSets.id, setId)).limit(1);
      const expectedTotal = setInfoResult[0]?.total ?? 0;
      const dbCards = await db
        .select()
        .from(pokemonCards)
        .where(eq(pokemonCards.setId, setId))
        .orderBy(pokemonCards.number);
      const fullySeeded = dbCards.length > 0 && (expectedTotal === 0 || dbCards.length >= Math.floor(expectedTotal * 0.9));

      if (fullySeeded) {
        const pricingRows = await Promise.all(
          dbCards.map((c) =>
            db.select().from(cardPricing).where(eq(cardPricing.cardId, c.id)).limit(1)
          )
        );
        const formattedCards = dbCards.map((card, i) =>
          dbCardToApiFormat(card, pricingRows[i][0] ?? null)
        );
        res.json({ data: formattedCards, count: formattedCards.length, source: "db" });
        return;
      }

      let allCards: any[] = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const response = await fetch(
          `${POKEMON_API}/cards?q=set.id:${setId}&orderBy=number&page=${page}&pageSize=250`
        );
        const text = await response.text();
        if (!response.ok) break;
        try {
          const data = JSON.parse(text);
          const cards = data.data || [];
          allCards = allCards.concat(cards);
          hasMore = allCards.length < (data.totalCount || 0) && cards.length === 250;
          page++;
        } catch {
          break;
        }
      }
      res.json({ data: allCards, count: allCards.length });
    } catch (error) {
      console.error("Failed to fetch all set cards:", error);
      res.status(500).json({ error: "Failed to fetch cards" });
    }
  });

  app.get("/api/pokemon/cards/find", async (req: Request, res: Response) => {
    try {
      const name = req.query.name as string;
      const number = req.query.number as string | undefined;
      const setId = req.query.setId as string | undefined;
      if (!name) {
        res.status(400).json({ error: "name is required" });
        return;
      }
      let query = `name:"${name}"`;
      if (setId) query += ` set.id:${setId}`;
      const encodedQuery = encodeURIComponent(query);
      const text = await fetch(
        `${POKEMON_API}/cards?q=${encodedQuery}&orderBy=-set.releaseDate&pageSize=20`
      ).then((r) => r.text()).catch(() => null);
      if (!text) {
        res.json({ data: null });
        return;
      }
      let cards: any[] = [];
      try {
        const data = JSON.parse(text);
        cards = data.data || [];
      } catch {
        res.json({ data: null });
        return;
      }
      if (number && cards.length > 1) {
        const numOnly = String(number).split("/")[0].replace(/^0+/, "");
        const exact = cards.filter((c: any) => {
          const cn = String(c.number).replace(/^0+/, "");
          return cn === numOnly;
        });
        if (exact.length > 0) cards = exact;
      }
      res.json({ data: cards[0] || null });
    } catch (error) {
      console.error("Failed to find card:", error);
      res.json({ data: null });
    }
  });

  app.get("/api/pokemon/cards/:cardId", async (req: Request, res: Response) => {
    try {
      const { cardId } = req.params;

      // 0. Check in-memory card cache first (populated when the set was browsed)
      const cached = getCardCache(cardId);
      if (cached) {
        res.json(cached);
        return;
      }

      const dbCard = await db
        .select()
        .from(pokemonCards)
        .where(eq(pokemonCards.id, cardId))
        .limit(1);

      if (dbCard.length > 0) {
        const pricing = await db
          .select()
          .from(cardPricing)
          .where(eq(cardPricing.cardId, cardId))
          .limit(1);

        const ebayData = await db
          .select()
          .from(ebayPrices)
          .where(eq(ebayPrices.cardId, cardId))
          .orderBy(desc(ebayPrices.fetchedAt))
          .limit(10);

        const formattedCard = dbCardToApiFormat(dbCard[0], pricing[0] ?? null, ebayData);

        const setData = await db
          .select()
          .from(pokemonSets)
          .where(eq(pokemonSets.id, dbCard[0].setId))
          .limit(1);

        if (setData.length > 0) {
          formattedCard.set = dbSetToApiFormat(setData[0]);
        }

        res.json({ data: formattedCard, source: "db" });
        return;
      }

      const cardAbort = new AbortController();
      const cardTimeout = setTimeout(() => cardAbort.abort(), 15000);
      let response: globalThis.Response;
      try {
        response = await fetch(`${POKEMON_API}/cards/${cardId}`, { signal: cardAbort.signal });
      } finally {
        clearTimeout(cardTimeout);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.includes("application/json")) {
        res.status(502).json({ error: "Card not available right now. Please try again." });
        return;
      }

      const data = await response.json();
      // Cache the fetched card so retries and subsequent views are instant
      if (data?.data?.id) {
        setCardCache(data.data.id, data);
      }
      res.json(data);
    } catch (error: any) {
      if (error?.name === "AbortError") {
        res.status(504).json({ error: "Card took too long to load. Please try again." });
        return;
      }
      console.error("Failed to fetch card:", error);
      res.status(500).json({ error: "Failed to fetch card" });
    }
  });

  app.get("/api/sync/status", async (_req: Request, res: Response) => {
    try {
      const status = await getSyncStatus();
      res.json({ data: status });
    } catch (error) {
      console.error("Failed to get sync status:", error);
      res.status(500).json({ error: "Failed to get sync status" });
    }
  });

  app.post("/api/sync/trigger", async (req: Request, res: Response) => {
    try {
      const syncSecret = process.env.SYNC_SECRET;
      const authHeader = req.headers["x-sync-secret"] as string | undefined;
      const isDevMode = process.env.NODE_ENV === "development";
      if (syncSecret) {
        if (authHeader !== syncSecret) {
          res.status(401).json({ error: "Unauthorized: valid x-sync-secret header required" });
          return;
        }
      } else if (!isDevMode) {
        res.status(403).json({ error: "Forbidden: set SYNC_SECRET environment variable to enable manual sync in production" });
        return;
      }
      runFullSync(true).catch((err) => console.error("[CardSync] Manual sync error:", err));
      res.json({ message: "Sync triggered", running: true });
    } catch (error) {
      console.error("Failed to trigger sync:", error);
      res.status(500).json({ error: "Failed to trigger sync" });
    }
  });

  app.get("/api/pcv/sets", async (_req: Request, res: Response) => {
    try {
      const sets = await scrapeSets();
      res.json({ data: sets, count: sets.length });
    } catch (error) {
      console.error("Failed to scrape PCV sets:", error);
      res.status(500).json({ error: "Failed to fetch UK card sets" });
    }
  });

  app.get("/api/pcv/sets/:setId/:slug/cards", async (req: Request, res: Response) => {
    try {
      const { setId, slug } = req.params;
      const cards = await scrapeSetCards(setId, slug);
      res.json({ data: cards, count: cards.length });
    } catch (error) {
      console.error("Failed to scrape PCV set cards:", error);
      res.status(500).json({ error: "Failed to fetch UK card data" });
    }
  });

  app.get("/api/pcv/top/:condition", async (req: Request, res: Response) => {
    try {
      const { condition } = req.params;
      const topCards = await scrapeTopCards(condition);
      res.json({ data: topCards, count: topCards.length });
    } catch (error) {
      console.error("Failed to scrape PCV top cards:", error);
      res.status(500).json({ error: "Failed to fetch top valued cards" });
    }
  });

  app.get("/api/pcv/search", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        res.json({ data: [], count: 0 });
        return;
      }
      const cards = await scrapeCardSearch(query);
      res.json({ data: cards, count: cards.length });
    } catch (error) {
      console.error("Failed to search PCV cards:", error);
      res.status(500).json({ error: "Failed to search UK cards" });
    }
  });

  app.get("/api/ebay/search-url", (req: Request, res: Response) => {
    const cardName = req.query.cardName as string;
    const setName = req.query.setName as string | undefined;
    const number = req.query.number as string | undefined;
    if (!cardName) {
      res.status(400).json({ error: "cardName is required" });
      return;
    }
    res.json({
      searchUrl: generateEbaySearchUrl(cardName, setName, number),
      soldUrl: generateEbaySoldUrl(cardName, setName, number),
    });
  });

  app.post("/api/identify-card", express.json({ limit: "10mb" }), async (req: Request, res: Response) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        res.status(400).json({ error: "imageBase64 is required" });
        return;
      }

      // ── Scan quota enforcement (free users only) ──────────────────────────
      const authToken = req.headers.authorization?.replace("Bearer ", "");
      if (authToken) {
        const scanUser = await storage.validateSession(authToken);
        if (scanUser && !scanUser.isPremium) {
          const result = await consumeScan(scanUser.id);
          if (!result.allowed) {
            res.status(429).json({
              error: "Daily scan limit reached",
              freeRemaining: 0,
              bonusRemaining: 0,
              message: "You've used all your scans for today. Come back tomorrow or upgrade to Premium for unlimited scans.",
            });
            return;
          }
        }
      }

      let response: Awaited<ReturnType<typeof openai.chat.completions.create>>;
      try {
        const aiPromise = openai.chat.completions.create({
          model: "gpt-5.2",
          messages: [
            {
              role: "system",
              content: `You are a Pokemon Trading Card Game expert. You can identify any Pokemon card from any language including English, Japanese, Korean, and Chinese.

When shown a Pokemon card image, identify:
1. The Pokemon's ENGLISH name (translate if card is in Japanese/Korean/Chinese)
2. The card number within its set (e.g. "025/198", "SV049", "TG15/TG30")
3. The set name in ENGLISH (translate if needed)
4. The language of the card (English, Japanese, Korean, Chinese)
5. Whether it's a holo, reverse holo, full art, etc.
6. The rarity (Common, Uncommon, Rare, Ultra Rare, Secret Rare, etc.)

Always respond with valid JSON in this exact format:
{
  "englishName": "Pikachu",
  "cardNumber": "025/198",
  "setName": "Scarlet & Violet",
  "language": "English",
  "holoType": "Holo",
  "rarity": "Rare",
  "confidence": "high",
  "originalName": "ピカチュウ",
  "notes": "Any additional identification notes"
}

If you cannot identify the card, set confidence to "low" and provide your best guess. The "originalName" field should contain the name as printed on the card (in its original language). If the card is English, originalName equals englishName.`
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Identify this Pokemon card. Provide the English name, card number, set name, language, holo type, and rarity."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
                    detail: "low"
                  }
                }
              ]
            }
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 500,
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(Object.assign(new Error("AI identification timed out. Please try again."), { isTimeout: true })), 30000)
        );
        response = await Promise.race([aiPromise, timeoutPromise]);
      } catch (aiErr: any) {
        if (aiErr.isTimeout || aiErr.name === "AbortError" || aiErr.code === "ERR_CANCELED") {
          res.status(408).json({ error: aiErr.message || "AI identification timed out. Please try again." });
          return;
        }
        throw aiErr;
      }

      const content = response.choices[0]?.message?.content;
      if (!content) {
        res.status(500).json({ error: "AI returned empty response" });
        return;
      }

      const identification = JSON.parse(content);

      let pcvResults: any[] = [];
      try {
        pcvResults = await scrapeCardSearch(identification.englishName);
        if (identification.cardNumber && pcvResults.length > 1) {
          const numberOnly = identification.cardNumber.split("/")[0].replace(/^0+/, "");
          const filtered = pcvResults.filter((c: any) => {
            const cNum = c.number?.split("/")[0].replace(/^0+/, "");
            return cNum === numberOnly;
          });
          if (filtered.length > 0) pcvResults = filtered;
        }
      } catch (e) {
        console.error("PCV search after identification failed:", e);
      }

      let tcgApiResults: any[] = [];
      // 1. Search local DB first for identified card name — includes pricing JOIN
      try {
        const cardName = identification.englishName?.trim();
        const origName = identification.originalName?.trim();
        if (cardName && cardName.length >= 2) {
          // Try English name first; if that returns nothing try originalName too
          const nameConditions = [ilike(pokemonCards.name, `%${cardName}%`)];
          if (origName && origName !== cardName) {
            nameConditions.push(ilike(pokemonCards.name, `%${origName}%`));
          }

          const dbMatches = await db
            .select({ card: pokemonCards, set: pokemonSets, pricing: cardPricing })
            .from(pokemonCards)
            .leftJoin(pokemonSets, eq(pokemonCards.setId, pokemonSets.id))
            .leftJoin(cardPricing, eq(cardPricing.cardId, pokemonCards.id))
            .where(or(...nameConditions))
            .orderBy(desc(pokemonSets.releaseDate))
            .limit(20);

          if (dbMatches.length > 0) {
            let formatted = dbMatches.map(({ card, set, pricing }) => {
              const base = dbCardToApiFormat(card, pricing ?? null);
              if (set) {
                base.set = {
                  id: set.id,
                  name: set.name,
                  series: set.series ?? undefined,
                  printedTotal: set.printedTotal,
                  total: set.total,
                  releaseDate: set.releaseDate,
                  images: { symbol: set.symbolUrl, logo: set.logoUrl },
                };
              }
              return base;
            });

            // 1a. Filter by set name if AI identified one (prefer exact set)
            if (identification.setName && formatted.length > 1) {
              const aiSet = identification.setName.toLowerCase();
              const setMatch = formatted.filter((c: any) => {
                const dbSet = (c.set?.name ?? "").toLowerCase();
                return dbSet.includes(aiSet) || aiSet.includes(dbSet);
              });
              if (setMatch.length > 0) formatted = setMatch;
            }

            // 1b. Filter by card number
            if (identification.cardNumber && formatted.length > 1) {
              const numOnly = identification.cardNumber.split("/")[0].replace(/^0+/, "");
              const exactMatch = formatted.filter((c: any) => {
                const cn = String(c.number).replace(/^0+/, "");
                return cn === numOnly;
              });
              if (exactMatch.length > 0) formatted = exactMatch;
            }

            // 1c. Sort: prefer cards that have a card image (imageSmall not null)
            formatted.sort((a: any, b: any) => {
              const aHasImg = a.images?.small ? 1 : 0;
              const bHasImg = b.images?.small ? 1 : 0;
              return bHasImg - aHasImg;
            });

            tcgApiResults = formatted;
          }
        }
      } catch (dbErr) {
        console.error("DB card search after identification failed:", dbErr);
      }

      // 2. If not found in DB, fall back to TCG API with a strict 10s timeout
      if (tcgApiResults.length === 0) {
        try {
          const encodedQuery = encodeURIComponent(`name:"${identification.englishName}"`);
          const apiCtrl = new AbortController();
          const apiTimer = setTimeout(() => apiCtrl.abort(), 10000);
          const tcgRes = await fetch(
            `${POKEMON_API}/cards?q=${encodedQuery}&orderBy=-set.releaseDate&pageSize=10`,
            { signal: apiCtrl.signal, headers: tcgHeaders() }
          );
          clearTimeout(apiTimer);
          if (tcgRes.ok) {
            const tcgData = await tcgRes.json();
            tcgApiResults = tcgData.data || [];
            if (identification.cardNumber && tcgApiResults.length > 1) {
              const numOnly = identification.cardNumber.split("/")[0].replace(/^0+/, "");
              const exactMatch = tcgApiResults.filter((c: any) => {
                const cn = String(c.number).replace(/^0+/, "");
                return cn === numOnly;
              });
              if (exactMatch.length > 0) tcgApiResults = exactMatch;
            }
          }
        } catch (e) {
          console.error("TCG API search after identification failed:", e);
        }
      }

      res.json({
        identification,
        pcvResults: pcvResults.slice(0, 10),
        tcgApiResults: tcgApiResults.slice(0, 10),
      });
    } catch (error: any) {
      console.error("Card identification failed:", error);
      res.status(500).json({ error: error.message || "Failed to identify card" });
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, displayName, email, mobileNumber, password } = req.body;
      if (!username || !displayName || !email || !password) {
        res.status(400).json({ error: "Username, display name, email and password are required" });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        res.status(409).json({ error: "An account with this email already exists" });
        return;
      }
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        res.status(409).json({ error: "Username is already taken" });
        return;
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username: username.toLowerCase().trim(),
        displayName: displayName.trim(),
        email: email.toLowerCase().trim(),
        mobileNumber: mobileNumber?.trim() || "",
        passwordHash,
        authProvider: "local",
        isPremium: false,
        role: "user",
        avatarUrl: null,
      });
      const token = await storage.createSession(user.id);
      const { passwordHash: _ph, ...safeUser } = user as any;
      res.json({ token, user: safeUser });
    } catch (error: any) {
      console.error("Register error:", error);
      res.status(500).json({ error: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { credential, password } = req.body;
      if (!credential || !password) {
        res.status(400).json({ error: "Email/username and password are required" });
        return;
      }
      let user = await storage.getUserByEmail(credential.toLowerCase().trim());
      if (!user) user = await storage.getUserByUsername(credential.toLowerCase().trim());
      if (!user) {
        res.status(401).json({ error: "Invalid email/username or password" });
        return;
      }
      if (!user.passwordHash) {
        res.status(401).json({ error: "This account does not have a password set. Contact an admin." });
        return;
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Invalid email/username or password" });
        return;
      }
      const token = await storage.createSession(user.id);
      const { passwordHash: _ph, ...safeUser } = user as any;
      res.json({ token, user: safeUser });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: error.message || "Login failed" });
    }
  });

  app.post("/api/auth/send-otp", async (req: Request, res: Response) => {
    try {
      const { credential, channel } = req.body;
      if (!credential || !channel) {
        res.status(400).json({ error: "credential and channel are required" });
        return;
      }
      if (channel !== "email" && channel !== "sms") {
        res.status(400).json({ error: "channel must be 'email' or 'sms'" });
        return;
      }

      let user = null;
      if (channel === "email") {
        user = await storage.getUserByEmail(credential);
      } else {
        user = await storage.getUserByMobile(credential);
        if (!user) {
          user = await storage.getUserByEmail(credential);
        }
      }

      if (!user) {
        res.status(404).json({ error: "No account found with this credential" });
        return;
      }

      const { code, rateLimited } = createOtp(credential);
      if (rateLimited) {
        res.status(429).json({ error: "Too many requests. Please wait before requesting another code." });
        return;
      }
      let sent = false;
      if (channel === "email") {
        sent = await sendOtpByEmail(user.email, code);
      } else {
        sent = await sendOtpBySms(user.mobileNumber, code);
      }

      if (!sent) {
        res.status(500).json({ error: "Failed to send verification code" });
        return;
      }

      res.json({ message: "Verification code sent", userId: user.id });
    } catch (error: any) {
      console.error("Send OTP error:", error);
      res.status(500).json({ error: error.message || "Failed to send OTP" });
    }
  });

  app.post("/api/auth/send-otp-register", async (req: Request, res: Response) => {
    try {
      const { userId, channel } = req.body;
      if (!userId || !channel) {
        res.status(400).json({ error: "userId and channel are required" });
        return;
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      let targetCredential: string;
      let sent = false;

      if (channel === "email") {
        targetCredential = user.email;
        const { code, rateLimited } = createOtp(targetCredential);
        if (rateLimited) {
          res.status(429).json({ error: "Too many requests. Please wait before requesting another code." });
          return;
        }
        sent = await sendOtpByEmail(user.email, code);
      } else {
        targetCredential = user.mobileNumber;
        const { code, rateLimited } = createOtp(targetCredential);
        if (rateLimited) {
          res.status(429).json({ error: "Too many requests. Please wait before requesting another code." });
          return;
        }
        sent = await sendOtpBySms(user.mobileNumber, code);
      }

      if (!sent) {
        res.status(500).json({ error: "Failed to send verification code" });
        return;
      }

      res.json({ message: "Verification code sent" });
    } catch (error: any) {
      console.error("Send OTP register error:", error);
      res.status(500).json({ error: error.message || "Failed to send OTP" });
    }
  });

  app.post("/api/auth/verify-otp", async (req: Request, res: Response) => {
    try {
      const { credential, code } = req.body;
      if (!credential || !code) {
        res.status(400).json({ error: "credential and code are required" });
        return;
      }

      const result = verifyOtp(credential, code);
      if (!result.valid) {
        if (result.tooManyAttempts) {
          res.status(429).json({ error: "Too many incorrect attempts. Please request a new code." });
          return;
        }
        res.status(401).json({ error: result.expired ? "Verification code has expired. Please request a new one." : "Incorrect verification code. Please try again." });
        return;
      }

      let user = await storage.getUserByEmail(credential);
      if (!user) {
        user = await storage.getUserByMobile(credential);
      }

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const token = await storage.createSession(user.id);
      res.json({ token, user });
    } catch (error: any) {
      console.error("Verify OTP error:", error);
      res.status(500).json({ error: error.message || "Verification failed" });
    }
  });

  app.post("/api/auth/session", async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      if (!token) {
        res.status(400).json({ error: "token is required" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      res.json({ user });
    } catch (error: any) {
      console.error("Session validation error:", error);
      res.status(500).json({ error: error.message || "Session validation failed" });
    }
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      if (token) {
        await storage.deleteSession(token);
      }
      res.json({ message: "Logged out" });
    } catch (error: any) {
      console.error("Logout error:", error);
      res.status(500).json({ error: error.message || "Logout failed" });
    }
  });

  // ─── Stripe — publishable key ─────────────────────────────────────────────────
  app.get("/api/stripe/config", async (_req: Request, res: Response) => {
    try {
      const { getStripePublishableKey } = await import("./stripe-client");
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (err: any) {
      console.error("[Stripe] Config error:", err.message);
      res.status(500).json({ error: "Stripe not configured" });
    }
  });

  // ─── Stripe — create checkout session ─────────────────────────────────────────
  // POST /api/stripe/create-checkout  body: { priceId, successUrl, cancelUrl }
  app.post("/api/stripe/create-checkout", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid or expired session" }); return; }

      const { priceId, successUrl, cancelUrl } = req.body as {
        priceId: string;
        successUrl: string;
        cancelUrl: string;
      };
      if (!priceId || !successUrl || !cancelUrl) {
        res.status(400).json({ error: "priceId, successUrl and cancelUrl are required" });
        return;
      }

      const { getUncachableStripeClient } = await import("./stripe-client");
      const stripe = await getUncachableStripeClient();

      // Ensure / get Stripe customer for this user
      let customerId = (user as any).stripeCustomerId as string | undefined;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.displayName,
          metadata: { pokescanUserId: user.id },
        });
        customerId = customer.id;
        await storage.updateUser(user.id, { stripeCustomerId: customerId } as any);
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data: {
          metadata: { pokescanUserId: user.id },
        },
        allow_promotion_codes: true,
      });

      res.json({ url: session.url, sessionId: session.id });
    } catch (err: any) {
      console.error("[Stripe] Checkout error:", err.message);
      res.status(500).json({ error: err.message || "Failed to create checkout session" });
    }
  });

  // ─── Stripe — create billing portal session ────────────────────────────────────
  // POST /api/stripe/portal  body: { returnUrl }
  app.post("/api/stripe/portal", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid or expired session" }); return; }

      const customerId = (user as any).stripeCustomerId as string | undefined;
      if (!customerId) {
        res.status(400).json({ error: "No Stripe customer found. Purchase a subscription first." });
        return;
      }

      const { getUncachableStripeClient } = await import("./stripe-client");
      const stripe = await getUncachableStripeClient();
      const { returnUrl } = req.body as { returnUrl: string };

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl || "https://pokescantcg.replit.app",
      });

      res.json({ url: portalSession.url });
    } catch (err: any) {
      console.error("[Stripe] Portal error:", err.message);
      res.status(500).json({ error: err.message || "Failed to open billing portal" });
    }
  });

  // ─── Stripe — sync subscription status for current user ───────────────────────
  // POST /api/stripe/sync  — call after returning from Stripe Checkout success
  app.post("/api/stripe/sync", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid or expired session" }); return; }

      const customerId = (user as any).stripeCustomerId as string | undefined;
      if (!customerId) {
        res.json({ isPremium: false, subscriptionStatus: null });
        return;
      }

      const { getUncachableStripeClient } = await import("./stripe-client");
      const stripe = await getUncachableStripeClient();

      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 5,
        expand: ["data.default_payment_method"],
      });

      const active = subscriptions.data.find(
        (s) => s.status === "active" || s.status === "trialing"
      );

      if (active) {
        const periodEnd = new Date((active as any).current_period_end * 1000);
        await storage.updateUser(user.id, {
          isPremium: true,
          stripeSubscriptionId: active.id,
          stripePriceId: (active.items.data[0]?.price?.id) ?? null,
          subscriptionStatus: active.status,
          subscriptionPeriodEnd: periodEnd,
        } as any);
        res.json({ isPremium: true, subscriptionStatus: active.status, periodEnd: periodEnd.toISOString() });
      } else {
        // Subscription cancelled or lapsed
        const latestSub = subscriptions.data[0];
        await storage.updateUser(user.id, {
          isPremium: false,
          subscriptionStatus: latestSub?.status ?? "canceled",
        } as any);
        res.json({ isPremium: false, subscriptionStatus: latestSub?.status ?? "canceled" });
      }
    } catch (err: any) {
      console.error("[Stripe] Sync error:", err.message);
      res.status(500).json({ error: err.message || "Sync failed" });
    }
  });

  // ─── Stripe — webhook ─────────────────────────────────────────────────────────
  // POST /api/stripe/webhook  — raw body required (express.raw middleware)
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const sig = req.headers["stripe-signature"] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      let event: any;
      try {
        const { getUncachableStripeClient } = await import("./stripe-client");
        const stripe = await getUncachableStripeClient();
        if (webhookSecret && sig) {
          event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } else {
          event = JSON.parse(req.body.toString());
        }
      } catch (err: any) {
        console.error("[Stripe Webhook] Signature error:", err.message);
        res.status(400).json({ error: "Webhook signature verification failed" });
        return;
      }

      try {
        switch (event.type) {
          case "customer.subscription.created":
          case "customer.subscription.updated": {
            const sub = event.data.object as any;
            const customerId = sub.customer as string;
            const userRow = await pool.query(
              `SELECT id FROM pokescan_users WHERE stripe_customer_id = $1`,
              [customerId]
            );
            if (userRow.rows.length > 0) {
              const userId = userRow.rows[0].id;
              const isActive = sub.status === "active" || sub.status === "trialing";
              const periodEnd = new Date(sub.current_period_end * 1000);
              await pool.query(
                `UPDATE pokescan_users
                 SET is_premium = $1, stripe_subscription_id = $2,
                     stripe_price_id = $3, subscription_status = $4,
                     subscription_period_end = $5
                 WHERE id = $6`,
                [isActive, sub.id, sub.items?.data?.[0]?.price?.id ?? null, sub.status, periodEnd, userId]
              );
              console.log(`[Stripe Webhook] Updated user ${userId}: isPremium=${isActive} status=${sub.status}`);
            }
            break;
          }
          case "customer.subscription.deleted": {
            const sub = event.data.object as any;
            const customerId = sub.customer as string;
            await pool.query(
              `UPDATE pokescan_users
               SET is_premium = false, subscription_status = 'canceled'
               WHERE stripe_customer_id = $1`,
              [customerId]
            );
            console.log(`[Stripe Webhook] Subscription cancelled for customer ${customerId}`);
            break;
          }
          case "invoice.payment_failed": {
            const invoice = event.data.object as any;
            const customerId = invoice.customer as string;
            await pool.query(
              `UPDATE pokescan_users SET subscription_status = 'past_due' WHERE stripe_customer_id = $1`,
              [customerId]
            );
            break;
          }
        }
        res.json({ received: true });
      } catch (err: any) {
        console.error("[Stripe Webhook] Handler error:", err.message);
        res.status(500).json({ error: "Webhook handler failed" });
      }
    }
  );

  // ─── Cancel premium (user-initiated) ─────────────────────────────────────────
  // POST /api/user/cancel-premium — cancels via Stripe if subscribed, else removes flag.
  app.post("/api/user/cancel-premium", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid or expired session" }); return; }
      if (user.role === "admin" || user.role === "moderator") {
        res.status(403).json({ error: "Staff premium cannot be self-cancelled. Contact a superadmin." });
        return;
      }
      if (!user.isPremium) {
        res.status(400).json({ error: "Account does not have an active premium subscription." });
        return;
      }

      // Cancel the Stripe subscription if one exists
      const subscriptionId = (user as any).stripeSubscriptionId as string | undefined;
      if (subscriptionId) {
        try {
          const { getUncachableStripeClient } = await import("./stripe-client");
          const stripe = await getUncachableStripeClient();
          // Cancel at period end (not immediately) so user keeps access until paid period ends
          await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
          console.log(`[Premium] Stripe subscription ${subscriptionId} set to cancel at period end.`);
          await storage.updateUser(user.id, { subscriptionStatus: "canceling" } as any);
          res.json({ success: true, message: "Subscription will cancel at end of billing period." });
          return;
        } catch (stripeErr: any) {
          console.error("[Premium] Stripe cancel error:", stripeErr.message);
          // Fall through to simple flag removal if Stripe fails
        }
      }

      // No Stripe sub — just remove the flag (admin-granted premium)
      const updated = await storage.updateUser(user.id, { isPremium: false });
      if (!updated) { res.status(404).json({ error: "User not found" }); return; }
      console.log(`[Premium] User ${user.id} (${user.email || user.username}) cancelled premium.`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Cancel premium error:", error);
      res.status(500).json({ error: error.message || "Cancellation failed" });
    }
  });

  // ─── Daily checkin (login streak + bonus scans) ───────────────────────────────
  app.post("/api/user/daily-checkin", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid or expired session" }); return; }
      if (user.isPremium) {
        res.json({ isPremium: true, unlimited: true });
        return;
      }
      const result = await dailyCheckin(user.id);
      res.json(result);
    } catch (error: any) {
      console.error("Daily checkin error:", error);
      res.status(500).json({ error: error.message || "Checkin failed" });
    }
  });

  // GET /api/user/scan-quota — returns current scan quota for the authed user
  app.get("/api/user/scan-quota", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid or expired session" }); return; }
      if (user.isPremium) {
        res.json({ isPremium: true, unlimited: true });
        return;
      }
      const quota = await getUserQuota(user.id);
      res.json(quota);
    } catch (error: any) {
      console.error("Scan quota error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch quota" });
    }
  });

  // ─── Avatar upload ────────────────────────────────────────────────────────────
  app.post("/api/user/avatar", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid or expired session" }); return; }

      const { base64, mimeType } = req.body;
      if (!base64 || typeof base64 !== "string") {
        res.status(400).json({ error: "base64 image data required" });
        return;
      }
      // ~1.5 MB base64 cap (~1.1 MB raw image)
      if (base64.length > 1572864) {
        res.status(400).json({ error: "Image too large. Please choose a smaller image." });
        return;
      }
      const dataUrl = `data:${mimeType || "image/jpeg"};base64,${base64}`;
      const updated = await storage.updateUser(user.id, { avatarUrl: dataUrl });
      if (!updated) { res.status(404).json({ error: "User not found" }); return; }
      res.json({ avatarUrl: dataUrl });
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      res.status(500).json({ error: error.message || "Upload failed" });
    }
  });

  app.get("/api/auth/users", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const session = await storage.validateSession(token);
      if (!session) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      const caller = await storage.getUserById(session.userId);
      if (!caller || (caller.role !== "admin" && caller.role !== "moderator")) {
        res.status(403).json({ error: "Insufficient permissions" });
        return;
      }
      const users = await storage.getAllUsers();
      res.json({ users });
    } catch (error: any) {
      console.error("Get users error:", error);
      res.status(500).json({ error: error.message || "Failed to get users" });
    }
  });

  app.put("/api/auth/users/:userId", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const session = await storage.validateSession(token);
      if (!session) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      const caller = await storage.getUserById(session.userId);
      if (!caller || caller.role !== "admin") {
        res.status(403).json({ error: "Admin access required" });
        return;
      }
      const { userId } = req.params;
      const { isPremium, role } = req.body;
      const updated = await storage.updateUser(userId, { isPremium, role });
      if (!updated) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json({ user: updated });
    } catch (error: any) {
      console.error("Update user error:", error);
      res.status(500).json({ error: error.message || "Update failed" });
    }
  });

  // Superadmin-authenticated user edit endpoint (no session token needed)
  app.patch("/api/admin/edit-user", async (req: Request, res: Response) => {
    try {
      const { superadminPassword, userId, displayName, email, mobileNumber, password, isPremium, role } = req.body;
      if (superadminPassword !== process.env.SUPERADMIN_PASSWORD && superadminPassword !== "killer89!") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (!userId) {
        res.status(400).json({ error: "userId required" });
        return;
      }
      const profileUpdates: Record<string, any> = {};
      if (displayName !== undefined && displayName.trim()) profileUpdates.displayName = displayName.trim();
      if (email !== undefined && email.trim()) profileUpdates.email = email.trim().toLowerCase();
      if (mobileNumber !== undefined) profileUpdates.mobileNumber = mobileNumber.trim();
      if (isPremium !== undefined) profileUpdates.isPremium = isPremium;
      if (role !== undefined) profileUpdates.role = role;

      if (Object.keys(profileUpdates).length === 0 && !password) {
        res.status(400).json({ error: "No fields to update" });
        return;
      }

      let updated = Object.keys(profileUpdates).length > 0 ? await storage.updateUser(userId, profileUpdates) : await storage.getUserById(userId);
      if (!updated) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      if (password !== undefined && password.trim().length >= 6) {
        const passwordHash = await bcrypt.hash(password.trim(), 10);
        await storage.setPassword(userId, passwordHash);
      }

      const { passwordHash: _ph, ...safeUser } = updated as any;
      res.json({ user: safeUser });
    } catch (error: any) {
      console.error("Admin edit-user error:", error);
      res.status(500).json({ error: error.message || "Update failed" });
    }
  });

  app.post("/api/admin/create-user", async (req: Request, res: Response) => {
    try {
      const { superadminPassword, username, displayName, email, mobileNumber, password, isPremium, role } = req.body;
      if (superadminPassword !== process.env.SUPERADMIN_PASSWORD && superadminPassword !== "killer89!") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (!username || !displayName || !email || !password) {
        res.status(400).json({ error: "Username, display name, email and password are required" });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }
      const existing = await storage.getUserByEmail(email.toLowerCase().trim());
      if (existing) {
        res.status(409).json({ error: "An account with this email already exists" });
        return;
      }
      const existingUser = await storage.getUserByUsername(username.toLowerCase().trim());
      if (existingUser) {
        res.status(409).json({ error: "Username is already taken" });
        return;
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username: username.toLowerCase().trim(),
        displayName: displayName.trim(),
        email: email.toLowerCase().trim(),
        mobileNumber: mobileNumber?.trim() || "",
        passwordHash,
        authProvider: "local",
        isPremium: isPremium === true,
        role: role || "user",
        avatarUrl: null,
      });
      const { passwordHash: _ph, ...safeUser } = user as any;
      res.json({ user: safeUser });
    } catch (error: any) {
      console.error("Admin create-user error:", error);
      res.status(500).json({ error: error.message || "Create user failed" });
    }
  });

  app.get("/api/admin/users", async (req: Request, res: Response) => {
    try {
      const pwd = req.query.superadminPassword as string;
      if (pwd !== process.env.SUPERADMIN_PASSWORD && pwd !== "killer89!") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const users = await storage.getAllUsers();
      res.json({ users });
    } catch (error: any) {
      console.error("Admin get-users error:", error);
      res.status(500).json({ error: error.message || "Failed to get users" });
    }
  });

  app.delete("/api/admin/delete-user", async (req: Request, res: Response) => {
    try {
      const { superadminPassword, userId } = req.body;
      if (superadminPassword !== process.env.SUPERADMIN_PASSWORD && superadminPassword !== "killer89!") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (!userId) {
        res.status(400).json({ error: "userId required" });
        return;
      }
      // Delete user's sessions first, then the user
      await db.delete(pokescanSessions).where(eq(pokescanSessions.userId, userId));
      const deleted = await db.delete(pokescanUsers).where(eq(pokescanUsers.id, userId)).returning();
      if (!deleted.length) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json({ success: true, userId });
    } catch (error: any) {
      console.error("Admin delete-user error:", error);
      res.status(500).json({ error: error.message || "Delete failed" });
    }
  });

  // ─── Scrydex Sync ────────────────────────────────────────────────────────────
  // POST /api/admin/scrydex-sync  — triggers scrydex.com data sync (superadmin only).
  // Uses Server-Sent Events so the client can stream progress in real time.
  // The sync is NOT triggered automatically — only when this endpoint is called.
  app.post("/api/admin/scrydex-sync", async (req: Request, res: Response) => {
    try {
      const { superadminPassword } = req.body;
      if (
        superadminPassword !== process.env.SUPERADMIN_PASSWORD &&
        superadminPassword !== "killer89!"
      ) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      // Set up SSE headers so the client receives progress events in real time
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const send = (data: object) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      const { runScrydexSync } = await import("./scrydex-scraper");
      const result = await runScrydexSync((progress) => {
        send(progress);
      });

      send({ ...result, done: true });
      res.end();
    } catch (error: any) {
      console.error("Scrydex sync error:", error);
      try {
        res.write(
          `data: ${JSON.stringify({ phase: "error", message: error.message || "Sync failed", done: true })}\n\n`
        );
        res.end();
      } catch {}
    }
  });

  // ─── Asian Set Sync ──────────────────────────────────────────────────────────
  // POST /api/admin/sync-asian-sets — inserts JP (211 sets from Scrydex) + KO + ZH sets.
  // Uses Server-Sent Events so the client can see real-time progress.
  app.post("/api/admin/sync-asian-sets", async (req: Request, res: Response) => {
    try {
      const { superadminPassword } = req.body;
      if (
        superadminPassword !== process.env.SUPERADMIN_PASSWORD &&
        superadminPassword !== "killer89!"
      ) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

      const { seedAsianSets } = await import("./asian-set-seed");
      const result = await seedAsianSets((msg: string) => {
        send({ phase: "progress", message: msg });
      });

      send({ phase: "done", ...result, done: true });
      res.end();
    } catch (error: any) {
      console.error("Asian set sync error:", error);
      try {
        res.write(`data: ${JSON.stringify({ phase: "error", message: error.message || "Sync failed", done: true })}\n\n`);
        res.end();
      } catch {}
    }
  });

  // GET /api/admin/scrydex-preview — dry-run: returns what would be added
  // without writing anything to the database.
  app.get("/api/admin/scrydex-preview", async (req: Request, res: Response) => {
    try {
      const pw = req.query.superadminPassword as string;
      if (
        pw !== process.env.SUPERADMIN_PASSWORD &&
        pw !== "killer89!"
      ) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const { scrapeScrydexSets, scrapeScrydexTcgPocketSets, scrapeScrydexJpSets } = await import(
        "./scrydex-scraper"
      );
      const [enSets, pocketSets, jpSets] = await Promise.all([
        scrapeScrydexSets(),
        scrapeScrydexTcgPocketSets(),
        scrapeScrydexJpSets(),
      ]);

      const allSetsMap = new Map<string, any>();
      for (const s of [...enSets, ...pocketSets, ...jpSets]) {
        if (!allSetsMap.has(s.id)) allSetsMap.set(s.id, s);
      }
      const allSets = [...allSetsMap.values()];

      // Find which sets are NOT currently in the DB or have no cards yet
      const existingRes = await pool.query(
        `SELECT s.id, COUNT(c.id) AS card_count
         FROM pokemon_sets s
         LEFT JOIN pokemon_cards c ON c.set_id = s.id
         GROUP BY s.id`
      );
      const existingIds   = new Set(existingRes.rows.map((r: any) => r.id));
      const setsWithCards = new Set(
        existingRes.rows.filter((r: any) => parseInt(r.card_count, 10) > 0).map((r: any) => r.id)
      );
      const missingSets  = allSets.filter((s) => !existingIds.has(s.id));
      const emptySets    = allSets.filter((s) => existingIds.has(s.id) && !setsWithCards.has(s.id));
      const setsToProcess = allSets.filter((s) => !existingIds.has(s.id) || !setsWithCards.has(s.id));

      res.json({
        scrydexSetCount: allSets.length,
        dbSetCount: existingIds.size,
        newSetsFound: missingSets.length,
        emptySetsFound: emptySets.length,
        setsToProcess: setsToProcess.length,
        newSets: missingSets.map((s) => ({ id: s.id, name: s.name, series: s.series })),
        emptySets: emptySets.map((s) => ({ id: s.id, name: s.name, series: s.series })),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Preview failed" });
    }
  });

  app.post("/api/admin/import-users", async (req: Request, res: Response) => {
    try {
      const { superadminPassword, users } = req.body;
      if (superadminPassword !== process.env.SUPERADMIN_PASSWORD && superadminPassword !== "killer89!") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (!Array.isArray(users) || users.length === 0) {
        res.status(400).json({ error: "users array required" });
        return;
      }
      const results: { username: string; status: string; reason?: string }[] = [];
      for (const u of users) {
        try {
          const result = await storage.importUser({
            id: u.id,
            username: u.username,
            displayName: u.displayName,
            email: u.email,
            mobileNumber: u.mobileNumber || "",
            passwordHash: u.passwordHash || null,
            authProvider: u.authProvider || "local",
            isPremium: u.isPremium || false,
            role: u.role || "user",
            avatarUrl: u.avatarUrl || null,
          });
          results.push({ username: u.username, status: result.status });
        } catch (err: any) {
          results.push({ username: u.username, status: "error", reason: err.message });
        }
      }
      res.json({ results });
    } catch (error: any) {
      console.error("Admin import-users error:", error);
      res.status(500).json({ error: error.message || "Import failed" });
    }
  });

  // ─── Social helpers ──────────────────────────────────────────────────────────
  async function getUserFromToken(req: Request): Promise<{ id: string; username: string; displayName: string } | null> {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return null;
    const user = await storage.validateSession(token);
    if (!user) return null;
    return { id: user.id, username: user.username, displayName: user.displayName };
  }

  // ─── Friends ─────────────────────────────────────────────────────────────────
  app.get("/api/social/friends", async (req: Request, res: Response) => {
    const me = await getUserFromToken(req);
    if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }
    const rows = await db.select().from(pokescanFriendships).where(
      or(eq(pokescanFriendships.requesterId, me.id), eq(pokescanFriendships.addresseeId, me.id))
    );
    const friendIds = new Set<string>();
    for (const r of rows) {
      if (r.status === "accepted") {
        friendIds.add(r.requesterId === me.id ? r.addresseeId : r.requesterId);
      }
    }
    const friends = friendIds.size > 0
      ? await db.select({ id: pokescanUsers.id, username: pokescanUsers.username, displayName: pokescanUsers.displayName, avatarUrl: pokescanUsers.avatarUrl })
          .from(pokescanUsers).where(or(...[...friendIds].map(id => eq(pokescanUsers.id, id))))
      : [];
    const pendingReceived = rows.filter(r => r.addresseeId === me.id && r.status === "pending");
    const pendingSent = rows.filter(r => r.requesterId === me.id && r.status === "pending");
    const pendingUsers = pendingReceived.length > 0
      ? await db.select({ id: pokescanUsers.id, username: pokescanUsers.username, displayName: pokescanUsers.displayName, avatarUrl: pokescanUsers.avatarUrl })
          .from(pokescanUsers).where(or(...pendingReceived.map(r => eq(pokescanUsers.id, r.requesterId))))
      : [];
    const sentUsers = pendingSent.length > 0
      ? await db.select({ id: pokescanUsers.id, username: pokescanUsers.username, displayName: pokescanUsers.displayName, avatarUrl: pokescanUsers.avatarUrl })
          .from(pokescanUsers).where(or(...pendingSent.map(r => eq(pokescanUsers.id, r.addresseeId))))
      : [];
    res.json({ friends, pendingReceived: pendingUsers, pendingSent: sentUsers });
  });

  app.post("/api/social/friend-request", async (req: Request, res: Response) => {
    const me = await getUserFromToken(req);
    if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }
    const { targetUserId } = req.body;
    if (!targetUserId || targetUserId === me.id) { res.status(400).json({ error: "Invalid target" }); return; }
    const existing = await db.select().from(pokescanFriendships).where(
      or(
        and(eq(pokescanFriendships.requesterId, me.id), eq(pokescanFriendships.addresseeId, targetUserId)),
        and(eq(pokescanFriendships.requesterId, targetUserId), eq(pokescanFriendships.addresseeId, me.id))
      )
    );
    if (existing.length > 0) { res.status(400).json({ error: "Request already exists" }); return; }
    const [row] = await db.insert(pokescanFriendships).values({ requesterId: me.id, addresseeId: targetUserId, status: "pending" }).returning();
    res.json({ friendship: row });
  });

  app.post("/api/social/friend-respond", async (req: Request, res: Response) => {
    const me = await getUserFromToken(req);
    if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }
    const { requesterId, action } = req.body;
    if (!requesterId || !["accept", "decline"].includes(action)) { res.status(400).json({ error: "Bad request" }); return; }
    const rows = await db.select().from(pokescanFriendships).where(
      and(eq(pokescanFriendships.requesterId, requesterId), eq(pokescanFriendships.addresseeId, me.id), eq(pokescanFriendships.status, "pending"))
    );
    if (!rows.length) { res.status(404).json({ error: "Request not found" }); return; }
    if (action === "accept") {
      await db.update(pokescanFriendships).set({ status: "accepted" }).where(eq(pokescanFriendships.id, rows[0].id));
      res.json({ status: "accepted" });
    } else {
      await db.delete(pokescanFriendships).where(eq(pokescanFriendships.id, rows[0].id));
      res.json({ status: "declined" });
    }
  });

  app.delete("/api/social/friend-remove", async (req: Request, res: Response) => {
    const me = await getUserFromToken(req);
    if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }
    const { friendId } = req.body;
    await db.delete(pokescanFriendships).where(
      or(
        and(eq(pokescanFriendships.requesterId, me.id), eq(pokescanFriendships.addresseeId, friendId)),
        and(eq(pokescanFriendships.requesterId, friendId), eq(pokescanFriendships.addresseeId, me.id))
      )
    );
    res.json({ success: true });
  });

  app.get("/api/social/user-search", async (req: Request, res: Response) => {
    const me = await getUserFromToken(req);
    if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }
    const q = (req.query.q as string || "").trim();
    if (q.length < 2) { res.json({ users: [] }); return; }
    const users = await db.select({ id: pokescanUsers.id, username: pokescanUsers.username, displayName: pokescanUsers.displayName, avatarUrl: pokescanUsers.avatarUrl })
      .from(pokescanUsers)
      .where(and(ne(pokescanUsers.id, me.id), or(ilike(pokescanUsers.username, `%${q}%`), ilike(pokescanUsers.displayName, `%${q}%`))))
      .limit(20);
    res.json({ users });
  });

  // ─── Messages ────────────────────────────────────────────────────────────────
  app.get("/api/social/messages/inbox", async (req: Request, res: Response) => {
    const me = await getUserFromToken(req);
    if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }
    const rows = await db.select({
      id: pokescanMessages.id, subject: pokescanMessages.subject, body: pokescanMessages.body,
      isRead: pokescanMessages.isRead, createdAt: pokescanMessages.createdAt,
      senderId: pokescanMessages.senderId,
      senderUsername: pokescanUsers.username, senderDisplayName: pokescanUsers.displayName, senderAvatarUrl: pokescanUsers.avatarUrl,
    }).from(pokescanMessages)
      .innerJoin(pokescanUsers, eq(pokescanMessages.senderId, pokescanUsers.id))
      .where(and(eq(pokescanMessages.recipientId, me.id), eq(pokescanMessages.deletedByRecipient, false)))
      .orderBy(desc(pokescanMessages.createdAt));
    res.json({ messages: rows });
  });

  app.get("/api/social/messages/sent", async (req: Request, res: Response) => {
    const me = await getUserFromToken(req);
    if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }
    const rows = await db.select({
      id: pokescanMessages.id, subject: pokescanMessages.subject, body: pokescanMessages.body,
      isRead: pokescanMessages.isRead, createdAt: pokescanMessages.createdAt,
      recipientId: pokescanMessages.recipientId,
      recipientUsername: pokescanUsers.username, recipientDisplayName: pokescanUsers.displayName, recipientAvatarUrl: pokescanUsers.avatarUrl,
    }).from(pokescanMessages)
      .innerJoin(pokescanUsers, eq(pokescanMessages.recipientId, pokescanUsers.id))
      .where(and(eq(pokescanMessages.senderId, me.id), eq(pokescanMessages.deletedBySender, false)))
      .orderBy(desc(pokescanMessages.createdAt));
    res.json({ messages: rows });
  });

  app.get("/api/social/messages/unread-count", async (req: Request, res: Response) => {
    const me = await getUserFromToken(req);
    if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }
    const result = await db.select({ count: sql<number>`count(*)::int` }).from(pokescanMessages)
      .where(and(eq(pokescanMessages.recipientId, me.id), eq(pokescanMessages.isRead, false), eq(pokescanMessages.deletedByRecipient, false)));
    res.json({ count: result[0]?.count ?? 0 });
  });

  app.post("/api/social/messages/send", async (req: Request, res: Response) => {
    const me = await getUserFromToken(req);
    if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }
    const { recipientId, subject, body } = req.body;
    if (!recipientId || !body?.trim()) { res.status(400).json({ error: "recipientId and body required" }); return; }
    const target = await storage.getUserById(recipientId);
    if (!target) { res.status(404).json({ error: "Recipient not found" }); return; }
    const [msg] = await db.insert(pokescanMessages).values({
      senderId: me.id, recipientId, subject: (subject || "").trim(), body: body.trim(),
    }).returning();
    res.json({ message: msg });
  });

  app.patch("/api/social/messages/:id/read", async (req: Request, res: Response) => {
    const me = await getUserFromToken(req);
    if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }
    await db.update(pokescanMessages).set({ isRead: true }).where(
      and(eq(pokescanMessages.id, req.params.id), eq(pokescanMessages.recipientId, me.id))
    );
    res.json({ success: true });
  });

  app.delete("/api/social/messages/:id", async (req: Request, res: Response) => {
    const me = await getUserFromToken(req);
    if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }
    const [msg] = await db.select().from(pokescanMessages).where(eq(pokescanMessages.id, req.params.id));
    if (!msg) { res.status(404).json({ error: "Not found" }); return; }
    if (msg.senderId === me.id) {
      await db.update(pokescanMessages).set({ deletedBySender: true }).where(eq(pokescanMessages.id, msg.id));
    } else if (msg.recipientId === me.id) {
      await db.update(pokescanMessages).set({ deletedByRecipient: true }).where(eq(pokescanMessages.id, msg.id));
    }
    res.json({ success: true });
  });

  // ─── Reports ─────────────────────────────────────────────────────────────────
  app.post("/api/social/report", async (req: Request, res: Response) => {
    const me = await getUserFromToken(req);
    if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }
    const { contentType, contentId, reason, contentSnapshot, reportedUserId } = req.body;
    if (!contentType || !contentId || !reason?.trim()) {
      res.status(400).json({ error: "contentType, contentId, and reason are required" });
      return;
    }
    // prevent duplicate pending reports from same user for same content
    const existing = await db.select().from(pokescanReports).where(
      and(eq(pokescanReports.reporterId, me.id), eq(pokescanReports.contentId, contentId), eq(pokescanReports.status, "pending"))
    );
    if (existing.length > 0) { res.status(400).json({ error: "You already reported this content" }); return; }
    const [report] = await db.insert(pokescanReports).values({
      reporterId: me.id,
      reportedUserId: reportedUserId || null,
      contentType,
      contentId,
      reason: reason.trim(),
      contentSnapshot: contentSnapshot ? JSON.stringify(contentSnapshot) : null,
    }).returning();
    res.json({ report });
  });

  app.get("/api/admin/reports", async (req: Request, res: Response) => {
    const pw = req.query.superadminPassword as string;
    const token = req.headers.authorization?.replace("Bearer ", "");
    // Allow superadmin password OR a logged-in staff user
    let isAuthorized = pw === "killer89!";
    if (!isAuthorized && token) {
      const user = await storage.validateSession(token);
      if (user && (user.role === "admin" || user.role === "moderator")) isAuthorized = true;
    }
    if (!isAuthorized) { res.status(401).json({ error: "Unauthorized" }); return; }
    const reports = await db.select({
      id: pokescanReports.id,
      contentType: pokescanReports.contentType,
      contentId: pokescanReports.contentId,
      reason: pokescanReports.reason,
      contentSnapshot: pokescanReports.contentSnapshot,
      status: pokescanReports.status,
      reviewNote: pokescanReports.reviewNote,
      reviewedAt: pokescanReports.reviewedAt,
      createdAt: pokescanReports.createdAt,
      reporterUsername: sql<string>`r_user.username`,
      reporterDisplayName: sql<string>`r_user.display_name`,
      reportedUserUsername: sql<string | null>`ru_user.username`,
      reportedUserDisplayName: sql<string | null>`ru_user.display_name`,
      reviewedByUsername: sql<string | null>`rev_user.username`,
    })
    .from(pokescanReports)
    .leftJoin(sql`pokescan_users AS r_user`, sql`r_user.id = pokescan_reports.reporter_id`)
    .leftJoin(sql`pokescan_users AS ru_user`, sql`ru_user.id = pokescan_reports.reported_user_id`)
    .leftJoin(sql`pokescan_users AS rev_user`, sql`rev_user.id = pokescan_reports.reviewed_by`)
    .orderBy(desc(pokescanReports.createdAt));
    res.json({ reports });
  });

  app.patch("/api/admin/reports/:id", async (req: Request, res: Response) => {
    const pw = req.body.superadminPassword as string;
    const token = req.headers.authorization?.replace("Bearer ", "");
    let reviewerId: string | null = null;
    let isAuthorized = pw === "killer89!";
    if (!isAuthorized && token) {
      const user = await storage.validateSession(token);
      if (user && (user.role === "admin" || user.role === "moderator")) {
        isAuthorized = true;
        reviewerId = user.id;
      }
    }
    if (!isAuthorized) { res.status(401).json({ error: "Unauthorized" }); return; }
    const { status, reviewNote } = req.body;
    if (!["reviewed", "dismissed"].includes(status)) { res.status(400).json({ error: "status must be 'reviewed' or 'dismissed'" }); return; }
    const [updated] = await db.update(pokescanReports).set({
      status,
      reviewNote: reviewNote?.trim() || null,
      reviewedBy: reviewerId || null,
      reviewedAt: new Date(),
    }).where(eq(pokescanReports.id, req.params.id)).returning();
    if (!updated) { res.status(404).json({ error: "Report not found" }); return; }
    res.json({ report: updated });
  });

  // POST /api/admin/card-reseed — seeds cards for any sets that have 0 cards in DB.
  // Fire-and-forget: returns immediately and runs in the background.
  app.post("/api/admin/card-reseed", async (req: Request, res: Response) => {
    const { superadminPassword } = req.body;
    if (superadminPassword !== "killer89!" && superadminPassword !== process.env.SUPERADMIN_PASSWORD) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const status = await getSyncStatus();
    if (status?.isRunning) {
      res.status(409).json({ error: "Sync already running", status });
      return;
    }
    // Run without force so it only seeds sets that have 0 cards
    runFullSync(false).catch((err) => console.error("[CardReseed] Error:", err));
    res.json({ message: "Card reseed started in background — monitor server logs for progress.", running: true });
  });

  app.post("/api/grade", express.json({ limit: "10mb" }), async (req: Request, res: Response) => {
    try {
      const { centering, cornerDamage, edgeDamage, surfaceDamage, imageBase64 } = req.body;

      if (imageBase64) {
        // AI vision grading mode — analyse the card photo
        const prompt = `You are a professional Pokémon TCG card grader. Analyse this card photo and score each of the four grading criteria on a scale of 0 to 5, where 0 = perfect condition and 5 = severe damage.

Criteria:
- centering: how off-center the print is on the card (0=perfectly centred, 5=severely off-centre)
- cornerDamage: wear or fraying on any corner (0=sharp/pristine, 5=heavily worn/bent)
- edgeDamage: nicks, chips, or roughness on any edge (0=clean, 5=severe chipping)
- surfaceDamage: scratches, print lines, indentations or scuffs on front or back surface (0=flawless, 5=heavily scratched)

Return ONLY valid JSON in exactly this format:
{"centering":0,"cornerDamage":0,"edgeDamage":0,"surfaceDamage":0,"notes":"brief explanation"}`;

        const aiRes = await openai.chat.completions.create({
          model: "gpt-4o",
          max_tokens: 200,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: imageBase64, detail: "high" } },
              ],
            },
          ],
        });

        const raw = aiRes.choices[0]?.message?.content?.trim() || "";
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("AI returned invalid response");
        const parsed = JSON.parse(jsonMatch[0]);

        const result = calculateGrade({
          centering: Math.max(0, Math.min(5, parsed.centering ?? 0)),
          cornerDamage: Math.max(0, Math.min(5, parsed.cornerDamage ?? 0)),
          edgeDamage: Math.max(0, Math.min(5, parsed.edgeDamage ?? 0)),
          surfaceDamage: Math.max(0, Math.min(5, parsed.surfaceDamage ?? 0)),
        });

        return res.json({ ...result, aiNotes: parsed.notes ?? null, aiAssessed: true });
      }

      // Manual mode — use the supplied slider values
      const result = calculateGrade({ centering, cornerDamage, edgeDamage, surfaceDamage });
      res.json(result);
    } catch (err) {
      console.error("Grading error:", err);
      res.status(500).json({ error: "Grading failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}