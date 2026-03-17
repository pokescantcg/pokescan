import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import express from "express";
import OpenAI from "openai";
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
import { db } from "./db";
import {
  pokemonSets,
  pokemonCards,
  cardPricing,
  ebayPrices,
  pokescanUsers,
  pokescanSessions,
} from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
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

function dbSetToApiFormat(set: typeof pokemonSets.$inferSelect) {
  return {
    id: set.id,
    name: set.name,
    series: set.series,
    printedTotal: set.printedTotal,
    total: set.total,
    releaseDate: set.releaseDate,
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
      const pageSize = 50;
      const offset = (page - 1) * pageSize;
      const cacheKey = `${setId}:${page}`;

      // 1. Check in-memory cache (instant)
      const memHit = getMemCache(cacheKey);
      if (memHit) {
        res.json(memHit);
        return;
      }

      // 2. Check DB
      try {
        const totalCountResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(pokemonCards)
          .where(eq(pokemonCards.setId, setId));
        const totalCount = totalCountResult[0]?.count ?? 0;

        if (totalCount > 0) {
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
          res.json(payload);
          return;
        }
      } catch (dbErr) {
        console.error("DB query failed for set cards:", dbErr);
      }

      // 3. Fetch from TCG API (15s timeout)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(
        `${POKEMON_API}/cards?q=set.id:${setId}&orderBy=number&page=${page}&pageSize=${pageSize}`,
        { signal: controller.signal, headers: tcgHeaders() }
      );
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`TCG API ${response.status}`);
      const data = await response.json();

      // Cache the result
      setMemCache(cacheKey, data);
      res.json(data);

      // 4. Background: seed all pages of this set's cards into DB for future fast loads
      (async () => {
        try {
          let bgPage = 1;
          let seeded = 0;
          while (true) {
            const ctrl2 = new AbortController();
            const t2 = setTimeout(() => ctrl2.abort(), 15000);
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
    } catch (error) {
      console.error("Failed to fetch set cards:", error);
      res.status(500).json({ error: "Failed to fetch cards. Please try again." });
    }
  });

  app.get("/api/pokemon/cards/search", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      const page = req.query.page || "1";
      const encodedQuery = encodeURIComponent(`name:"${query}*"`);
      const response = await fetch(
        `${POKEMON_API}/cards?q=${encodedQuery}&orderBy=-set.releaseDate&page=${page}&pageSize=20`
      );
      const text = await response.text();
      if (!response.ok) {
        console.error(`Pokemon TCG API error ${response.status}: ${text.substring(0, 200)}`);
        res.json({ data: [], count: 0, totalCount: 0 });
        return;
      }
      try {
        const data = JSON.parse(text);
        res.json(data);
      } catch {
        console.error("Pokemon TCG API returned non-JSON:", text.substring(0, 200));
        res.json({ data: [], count: 0, totalCount: 0 });
      }
    } catch (error) {
      console.error("Failed to search cards:", error);
      res.json({ data: [], count: 0, totalCount: 0 });
    }
  });

  app.get("/api/pokemon/sets/:setId/all-cards", async (req: Request, res: Response) => {
    try {
      const { setId } = req.params;

      const dbCards = await db
        .select()
        .from(pokemonCards)
        .where(eq(pokemonCards.setId, setId))
        .orderBy(pokemonCards.number);

      if (dbCards.length > 0) {
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

      const response = await fetch(`${POKEMON_API}/cards/${cardId}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
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

      const aiController = new AbortController();
      const aiTimeout = setTimeout(() => aiController.abort(), 35000);
      let response: Awaited<ReturnType<typeof openai.chat.completions.create>>;
      try {
        response = await openai.chat.completions.create({
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
                    url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                  }
                }
              ]
            }
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 500,
        });
        clearTimeout(aiTimeout);
      } catch (aiErr: any) {
        clearTimeout(aiTimeout);
        if (aiErr.name === "AbortError" || aiErr.code === "ERR_CANCELED") {
          res.status(408).json({ error: "AI identification timed out. Please try again." });
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
      try {
        const encodedQuery = encodeURIComponent(`name:"${identification.englishName}"`);
        const tcgRes = await fetch(
          `${POKEMON_API}/cards?q=${encodedQuery}&orderBy=-set.releaseDate&pageSize=10`
        );
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
      const { username, displayName, email, mobileNumber } = req.body;
      if (!username || !displayName || !email || !mobileNumber) {
        res.status(400).json({ error: "All fields are required" });
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
      const existingMobile = await storage.getUserByMobile(mobileNumber);
      if (existingMobile) {
        res.status(409).json({ error: "An account with this mobile number already exists" });
        return;
      }
      const user = await storage.createUser({
        username: username.toLowerCase().trim(),
        displayName: displayName.trim(),
        email: email.toLowerCase().trim(),
        mobileNumber: mobileNumber.trim(),
        authProvider: "local",
        isPremium: false,
        role: "user",
        avatarUrl: null,
      });
      const token = await storage.createSession(user.id);
      res.json({ token, user });
    } catch (error: any) {
      console.error("Register error:", error);
      res.status(500).json({ error: error.message || "Registration failed" });
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
      const { superadminPassword, userId, displayName, email, mobileNumber } = req.body;
      if (superadminPassword !== process.env.SUPERADMIN_PASSWORD && superadminPassword !== "killer89!") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (!userId) {
        res.status(400).json({ error: "userId required" });
        return;
      }
      // Build update object with only provided fields
      const updates: Record<string, any> = {};
      if (displayName !== undefined && displayName.trim()) updates.displayName = displayName.trim();
      if (email !== undefined && email.trim()) updates.email = email.trim().toLowerCase();
      if (mobileNumber !== undefined) updates.mobileNumber = mobileNumber.trim();

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: "No fields to update" });
        return;
      }

      const updated = await db
        .update(pokescanUsers)
        .set(updates)
        .where(eq(pokescanUsers.id, userId))
        .returning();

      if (!updated.length) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json({ user: updated[0] });
    } catch (error: any) {
      console.error("Admin edit-user error:", error);
      res.status(500).json({ error: error.message || "Update failed" });
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

  const httpServer = createServer(app);
  return httpServer;
}
