import * as cheerio from "cheerio";
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
import { randomBytes } from "crypto";
import { db, pool } from "./db";
import {
  pokemonCardVariants,
  pokemonSets,
  pokemonCards,
  cardPricing,
  ebayPrices,
  pokescanUsers,
  pokescanSessions,
  pokescanFriendships,
  pokescanMessages,
  pokescanReports,
  pokescanChatroomMessages,
  pokescanAdminActivityLog,
  pokescanScanHistory,
  pokescanBlockedCredentials,
} from "@shared/schema";
import { eq, desc, sql, ilike, or, and, ne, exists, lt, gt, inArray, isNull, isNotNull } from "drizzle-orm";
import { startSyncService, getSyncStatus, runFullSync } from "./card-sync";
import { runFullResync } from "./full-resync";
import type { ScrydexSyncProgress } from "./scrydex-scraper";

let resyncState: {
  running: boolean;
  progress: ScrydexSyncProgress | null;
  error: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
} = { running: false, progress: null, error: null, startedAt: null, finishedAt: null };

async function cleanupOldChatroomMessages() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = await db.delete(pokescanChatroomMessages)
      .where(lt(pokescanChatroomMessages.createdAt, sevenDaysAgo));
    console.log("[Chatroom] Cleaned up old messages");
  } catch (e) {
    console.error("[Chatroom] Cleanup error:", e);
  }
}

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

// ── Set reference cache — built from DB, injected into AI prompt ────────────
let _setRefCache: string | null = null;
let _setRefCacheAt = 0;
const SET_REF_TTL_MS = 60 * 60 * 1000; // rebuild once per hour

async function buildSetReferencePrompt(): Promise<string> {
  const now = Date.now();
  if (_setRefCache && now - _setRefCacheAt < SET_REF_TTL_MS) return _setRefCache;

  try {
    const sets = await db
      .select({
        id: pokemonSets.id,
        name: pokemonSets.name,
        printedTotal: pokemonSets.printedTotal,
        total: pokemonSets.total,
        releaseDate: pokemonSets.releaseDate,
      })
      .from(pokemonSets)
      .where(isNull(pokemonSets.deletedAt))
      .orderBy(pokemonSets.releaseDate);

    const byLang: Record<string, Array<{ id: string; name: string; printedTotal: number | null; total: number | null; releaseDate: string | null }>> = {
      english: [], japanese: [], korean: [], chinese: [],
    };
    for (const s of sets) byLang[detectSetLanguage(s.id)].push(s);

    const fmt = (s: { id: string; name: string; printedTotal: number | null; total: number | null; releaseDate: string | null }) => {
      const year = s.releaseDate?.substring(0, 4) ?? "?";
      const count = s.printedTotal ?? s.total ?? "?";
      return `${s.id}|${s.name}|${count}|${year}`;
    };

    const lines: string[] = [
      "KNOWN SETS DATABASE (use this to identify the exact set from what you read on the card):",
      "Format: setCode|setName|printedTotal|year",
      "",
      "MATCHING PRIORITY — use this order:",
      "1. SET CODE on card: Many cards print a short set code in the bottom-left corner right before or alongside the collector number (e.g. 'A5C', 'A3a', 'SV09', 'SWSH', 'XY'). Read it carefully — it matches the setCode column exactly. This is the most reliable identifier.",
      "2. COLLECTOR NUMBER DENOMINATOR: The number after the slash (e.g. 217 in '276/217') usually matches printedTotal exactly. Find the set where printedTotal equals this number.",
      "3. SET SYMBOL + VISUAL CUES: Use the set symbol icon and card design era as a secondary confirmation only.",
      "IMPORTANT: Never guess based on card art alone. If you can read a set code like 'A5C', 'A3a', 'B3a', 'SV09' on the card, look it up in the database below and use that set. Do not override a clearly read set code with a guess based on aesthetics.",
      "",
      "[ENGLISH]",
      ...byLang.english.map(fmt),
      "",
      "[JAPANESE]",
      ...byLang.japanese.map(fmt),
      "",
      "[KOREAN]",
      ...byLang.korean.map(fmt),
      "",
      "[CHINESE]",
      ...byLang.chinese.map(fmt),
      "",
      "When reporting setName, use the human-readable name column (not the code). Match by set code first, then by collector number denominator, then by visual cues.",
    ];

    _setRefCache = lines.join("\n");
    _setRefCacheAt = now;
    console.log(`[SetRef] Built set reference prompt: ${sets.length} sets, ${_setRefCache.length} chars`);
    return _setRefCache;
  } catch (e) {
    console.error("[SetRef] Failed to build set reference:", e);
    return "";
  }
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

function dbVariantToApiFormat(
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

// ---------- Superadmin auth helpers ----------
function getSuperadminEmail(): string {
  const email = process.env.SUPERADMIN_EMAIL;
  if (!email) {
    console.warn("[superadmin] SUPERADMIN_EMAIL env var is not set. Superadmin features will be unavailable.");
    return "";
  }
  return email.toLowerCase().trim();
}

const SUPERADMIN_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const superadminTokens = new Map<string, number>(); // token -> expiresAt

function issueSuperadminToken(): string {
  const token = randomBytes(32).toString("hex");
  superadminTokens.set(token, Date.now() + SUPERADMIN_TOKEN_TTL_MS);
  return token;
}

// Strict superadmin-only check: requires a valid session token AND
// the authenticated user must match the designated superadmin email
// (set via the SUPERADMIN_EMAIL env var).
async function isSuperadminSessionOnly(req: Request): Promise<boolean> {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return false;
  const token = auth.slice(7).trim();
  try {
    const user = await storage.validateSession(token);
    const superadminEmail = getSuperadminEmail();
    if (!superadminEmail) return false;
    return !!(user && user.role === "admin" && user.email?.toLowerCase() === superadminEmail);
  } catch {
    return false;
  }
}

async function isSuperadminAuthorized(req: Request): Promise<boolean> {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    // 1. Regular user session token of an admin user (DB-backed)
    try {
      const user = await storage.validateSession(token);
      if (user && user.role === "admin") return true;
    } catch {}
    // 2. Legacy bearer token from old OTP flow (kept for backwards compat)
    const exp = superadminTokens.get(token);
    if (exp && exp > Date.now()) return true;
    if (exp && exp <= Date.now()) superadminTokens.delete(token);
  }
  // 3. Legacy SUPERADMIN_PASSWORD env-var fallback (external admin web panel)
  const legacyPw = process.env.SUPERADMIN_PASSWORD;
  if (legacyPw) {
    const provided =
      (req.body && (req.body.superadminPassword as string)) ||
      (req.query.superadminPassword as string) ||
      "";
    if (provided && provided === legacyPw) return true;
  }
  return false;
}

async function seedSuperadmin(): Promise<void> {
  try {
    const email = getSuperadminEmail();
    const initialPassword = process.env.SUPERADMIN_INITIAL_PASSWORD || process.env.SUPERADMIN_PASSWORD;
    const existing = await storage.getUserByEmail(email);
    if (!existing) {
      if (!initialPassword) {
        console.warn("[seedSuperadmin] SUPERADMIN_INITIAL_PASSWORD env var not set — cannot create initial superadmin.");
        return;
      }
      const passwordHash = await bcrypt.hash(initialPassword, 10);
      await storage.createUser({
        username: "superadmin",
        displayName: "Super Admin",
        email,
        mobileNumber: "",
        passwordHash,
        authProvider: "local",
        isPremium: true,
        role: "admin",
      } as any);
      console.log("[seedSuperadmin] Created superadmin user:", email);
    } else {
      const updates: any = {};
      if (existing.role !== "admin") updates.role = "admin";
      if (!existing.isPremium) updates.isPremium = true;
      if (Object.keys(updates).length > 0) {
        await storage.updateUser(existing.id, updates);
      }
      if (initialPassword) {
        const hash = await bcrypt.hash(initialPassword, 10);
        await storage.setPassword(existing.id, hash);
        console.log("[seedSuperadmin] Synced password for superadmin:", email);
      }
      if (Object.keys(updates).length > 0) {
        console.log("[seedSuperadmin] Updated superadmin user:", email, Object.keys(updates));
      }
    }
  } catch (err) {
    console.error("[seedSuperadmin] error:", err);
  }
}

// ---------- Runtime app config (toggled from external admin panel) ----------
let appConfig = {
  maintenanceMode: false,
  scannerEnabled: true,
};

async function runSchemaMigrations(): Promise<void> {
  try {
    await pool.query(`
      ALTER TABLE pokescan_collections ADD COLUMN IF NOT EXISTS grading_company VARCHAR(32);
      ALTER TABLE pokescan_collections ADD COLUMN IF NOT EXISTS grade VARCHAR(16);
      ALTER TABLE pokescan_collections ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE pokescan_collections ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE pokescan_collections ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
      ALTER TABLE pokescan_users ADD COLUMN IF NOT EXISTS is_verified_collector BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE pokemon_cards ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE pokemon_cards ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
      ALTER TABLE pokemon_sets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
      CREATE TABLE IF NOT EXISTS pokescan_collector_verifications (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        user_id VARCHAR(36) NOT NULL REFERENCES pokescan_users(id) ON DELETE CASCADE,
        card_id TEXT NOT NULL,
        card_name TEXT NOT NULL,
        card_image TEXT NOT NULL,
        front_photo TEXT NOT NULL,
        back_photo TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        reviewed_by VARCHAR(36) REFERENCES pokescan_users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS pokescan_scan_history (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        user_id VARCHAR(36) NOT NULL REFERENCES pokescan_users(id) ON DELETE CASCADE,
        card_name TEXT NOT NULL,
        set_name TEXT NOT NULL,
        card_number TEXT NOT NULL DEFAULT '',
        language TEXT NOT NULL DEFAULT 'english',
        thumbnail TEXT,
        price_gbp REAL,
        identification TEXT NOT NULL DEFAULT '{}',
        tcg_api_results TEXT NOT NULL DEFAULT '[]',
        pcv_results TEXT NOT NULL DEFAULT '[]',
        scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE pokescan_users ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ;
      ALTER TABLE pokescan_users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
      ALTER TABLE pokescan_users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;
      ALTER TABLE pokescan_users ADD COLUMN IF NOT EXISTS banned_by VARCHAR(36);
      ALTER TABLE pokescan_users ADD COLUMN IF NOT EXISTS is_trial_used BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE pokescan_admin_activity_log ADD COLUMN IF NOT EXISTS target_user_id VARCHAR(36);
      ALTER TABLE pokescan_admin_activity_log ADD COLUMN IF NOT EXISTS target_username TEXT;
      CREATE TABLE IF NOT EXISTS pokescan_blocked_credentials (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        email TEXT,
        mobile_number TEXT,
        reason TEXT NOT NULL DEFAULT 'deleted',
        blocked_by VARCHAR(36),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_blocked_creds_email ON pokescan_blocked_credentials(LOWER(email));
      CREATE INDEX IF NOT EXISTS idx_blocked_creds_mobile ON pokescan_blocked_credentials(mobile_number);
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS variant_id TEXT;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'scrydex';
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'GBP';
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS tcg_low REAL;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS tcg_mid REAL;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS tcg_high REAL;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS tcg_market REAL;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS tcg_direct_low REAL;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS cardmarket_avg REAL;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS cardmarket_low REAL;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS cardmarket_trend REAL;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS ebay_sold_average REAL;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS psa10_price REAL;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS psa9_price REAL;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS raw_price REAL;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS price_gbp REAL;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS confidence_score REAL DEFAULT 1;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      CREATE UNIQUE INDEX IF NOT EXISTS idx_card_pricing_variant_id ON card_pricing(variant_id) WHERE variant_id IS NOT NULL;
      ALTER TABLE ebay_prices ADD COLUMN IF NOT EXISTS variant_id TEXT;
      ALTER TABLE ebay_prices ADD COLUMN IF NOT EXISTS card_id VARCHAR REFERENCES pokemon_cards(id);
      ALTER TABLE ebay_prices ADD COLUMN IF NOT EXISTS title TEXT;
      ALTER TABLE ebay_prices ADD COLUMN IF NOT EXISTS price REAL;
      ALTER TABLE ebay_prices ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'GBP';
      ALTER TABLE ebay_prices ADD COLUMN IF NOT EXISTS sold_date TEXT;
      ALTER TABLE ebay_prices ADD COLUMN IF NOT EXISTS listing_url TEXT;
      ALTER TABLE ebay_prices ADD COLUMN IF NOT EXISTS is_sold BOOLEAN DEFAULT TRUE;
      ALTER TABLE ebay_prices ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ DEFAULT NOW();
      CREATE UNIQUE INDEX IF NOT EXISTS idx_ebay_prices_variant_id ON ebay_prices(variant_id) WHERE variant_id IS NOT NULL;
      CREATE TABLE IF NOT EXISTS card_price_history (
        id SERIAL PRIMARY KEY,
        variant_id TEXT NOT NULL REFERENCES pokemon_card_variants(id) ON DELETE CASCADE,
        source TEXT NOT NULL,
        price REAL,
        currency TEXT DEFAULT 'GBP',
        fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_card_price_history_variant_id ON card_price_history(variant_id);
      ALTER TABLE card_pricing ALTER COLUMN "variantId" DROP NOT NULL;
    `);
    console.log("[Migration] Schema migrations applied");
  } catch (err) {
    console.error("[Migration] Failed:", err);
  }
}

// ─── Moderation helpers ───────────────────────────────────────────────────────
async function logModAction(opts: {
  action: string;
  performedBy: string;
  targetUserId?: string | null;
  targetUsername?: string | null;
  listingId?: string | null;
  listingName?: string | null;
  note?: string | null;
}): Promise<void> {
  try {
    await db.insert(pokescanAdminActivityLog).values({
      action: opts.action,
      performedBy: opts.performedBy,
      targetUserId: opts.targetUserId ?? null,
      targetUsername: opts.targetUsername ?? null,
      listingId: opts.listingId ?? null,
      listingName: opts.listingName ?? null,
      note: opts.note ?? null,
    });
  } catch (e) {
    console.warn("[ActivityLog] write failed:", (e as any)?.message);
  }
}

async function cancelStripeForUser(userId: string, immediate: boolean = true): Promise<void> {
  try {
    const u = await storage.getUserById(userId);
    if (!u) return;
    const subId = (u as any).stripeSubscriptionId as string | undefined;
    if (subId) {
      try {
        const { getUncachableStripeClient } = await import("./stripe-client");
        const stripe = await getUncachableStripeClient();
        if (immediate) {
          await stripe.subscriptions.cancel(subId);
        } else {
          await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
        }
        console.log(`[Mod] Cancelled Stripe sub ${subId} for user ${userId} (immediate=${immediate})`);
      } catch (e: any) {
        console.error(`[Mod] Stripe cancel failed for ${userId}:`, e?.message);
      }
    }
    await storage.updateUser(userId, {
      isPremium: false,
      subscriptionStatus: "canceled",
      stripeSubscriptionId: null,
    } as any);
  } catch (e) {
    console.warn("[Mod] cancelStripeForUser error:", (e as any)?.message);
  }
}

async function isCredentialBlocked(email?: string | null, mobile?: string | null): Promise<boolean> {
  if (!email && !mobile) return false;
  const conds: string[] = [];
  const params: any[] = [];
  if (email) { params.push(email.toLowerCase().trim()); conds.push(`LOWER(email) = $${params.length}`); }
  if (mobile) { params.push(mobile.trim()); conds.push(`mobile_number = $${params.length}`); }
  const r = await pool.query(
    `SELECT 1 FROM pokescan_blocked_credentials WHERE ${conds.join(" OR ")} LIMIT 1`,
    params
  );
  return r.rows.length > 0;
}

async function addBlockedCredential(email: string | null, mobile: string | null, reason: string, blockedBy: string | null): Promise<void> {
  if (!email && !mobile) return;
  try {
    await pool.query(
      `INSERT INTO pokescan_blocked_credentials (email, mobile_number, reason, blocked_by) VALUES ($1, $2, $3, $4)`,
      [email ? email.toLowerCase().trim() : null, mobile ? mobile.trim() : null, reason, blockedBy]
    );
  } catch (e) {
    console.warn("[Mod] addBlockedCredential failed:", (e as any)?.message);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  startSyncService();
  seedSuperadmin().catch((e) => console.error("[seedSuperadmin] failed:", e));
  runSchemaMigrations().catch((e) => console.error("[Migration] failed:", e));

  app.get("/api/config", (_req: Request, res: Response) => {
    res.json(appConfig);
  });

  app.patch("/api/admin/config", async (req: Request, res: Response) => {
    if (!await isSuperadminAuthorized(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const updates = req.body ?? {};
    if (typeof updates.maintenanceMode === "boolean") {
      appConfig.maintenanceMode = updates.maintenanceMode;
    }
    if (typeof updates.scannerEnabled === "boolean") {
      appConfig.scannerEnabled = updates.scannerEnabled;
    }
    res.json({ success: true, config: appConfig });
  });

  app.get("/api/pokemon/sets", async (_req: Request, res: Response) => {
    try {
      const dbSets = await db
        .select()
        .from(pokemonSets)
        .where(
          and(
            isNull(pokemonSets.deletedAt),
            exists(
              db
                .select({ id: pokemonCards.id })
                .from(pokemonCards)
                .where(and(eq(pokemonCards.setId, pokemonSets.id), isNull(pokemonCards.deletedAt)))
            ),
            or(eq(pokemonSets.hidden, false), sql`${pokemonSets.hidden} IS NULL`)
          )
        )
        .orderBy(desc(pokemonSets.releaseDate));
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
      const nonEnglishPatterns = ["_ja", "_ko", "_zh", "_cn", "topsun", "babanuki", "mengka",  "oldmaid","hanafuda","_pocket"];
      const isNonEnglish = nonEnglishPatterns.some((p) => setId.toLowerCase().includes(p));

      // 2. Check DB
      try {
        const [totalCountResult, setInfoResult] = await Promise.all([
          db.select({ count: sql<number>`count(*)::int` }).from(pokemonCards).where(and(eq(pokemonCards.setId, setId), isNull(pokemonCards.deletedAt))),
          db.select().from(pokemonSets).where(and(eq(pokemonSets.id, setId), isNull(pokemonSets.deletedAt))).limit(1),
        ]);
        const totalCount = totalCountResult[0]?.count ?? 0;
        const setRow = setInfoResult[0] ?? null;
        const expectedTotal = setRow?.total ?? 0;

        // For non-English sets: serve whatever cards we have (any amount).
        // For English sets: only serve if ≥90% seeded (ensures complete sets).
        const hasCards = totalCount > 0;
        const fullySeeded = hasCards && (isNonEnglish || expectedTotal === 0 || totalCount >= Math.floor(expectedTotal * 0.9));

        const dbCards = await db
        .select({
          variant: pokemonCardVariants,
          card: pokemonCards,
        })
        .from(pokemonCardVariants)
        .leftJoin(
          pokemonCards,
          eq(pokemonCardVariants.cardId, pokemonCards.id)
        )
        .where(eq(pokemonCards.setId, setId))
        .orderBy(pokemonCards.number)
        .limit(pageSize)
        .offset(offset);

        const formattedCards = dbCards.map(({ variant, card }) => {
          const f = dbCardToApiFormat(card, null);

          f.id = variant.id;
          f.variantId = variant.id;
          f.finishType = variant.finishType;
          f.editionType = variant.editionType;
          f.variantLabel = variant.variantLabel;
          f.isStamped = variant.isStamped;
          f.language = variant.language;

          if (variant.imageUrl) {
            f.images = {
              small: variant.imageUrl,
              large: variant.imageUrl,
            };
          }

          if (setRow) {
            f.set = dbSetToApiFormat(setRow);
          }

          return f;
        });
          const payload = { data: formattedCards, count: formattedCards.length, totalCount, page, source: "db" };
          setMemCache(cacheKey, payload);
          warmCardCache(formattedCards);
          res.json(payload);
          return;
        }
       catch (dbErr) {
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
          .where(and(ilike(pokemonCards.name, `%${query.trim()}%`), isNull(pokemonCards.deletedAt)))
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
            .where(and(ilike(pokemonCards.name, `%${query.trim()}%`), isNull(pokemonCards.deletedAt)));

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
      const setInfoResult = await db.select({ total: pokemonSets.total }).from(pokemonSets).where(and(eq(pokemonSets.id, setId), isNull(pokemonSets.deletedAt))).limit(1);
      const expectedTotal = setInfoResult[0]?.total ?? 0;
      const dbCards = await db
      .select({
        variant: pokemonCardVariants,
        card: pokemonCards,
      })
      .from(pokemonCardVariants)
      .leftJoin(
        pokemonCards,
        eq(pokemonCardVariants.cardId, pokemonCards.id)
      )
      .where(eq(pokemonCards.setId, setId))
      .orderBy(pokemonCards.number)
      .limit(pageSize)
      .offset(offset);
      const fullySeeded = dbCards.length > 0 && (expectedTotal === 0 || dbCards.length >= Math.floor(expectedTotal * 0.9));

      if (fullySeeded && dbCards.length > 0) {
        const dbCards = await db
        .select({
          variant: pokemonCardVariants,
          card: pokemonCards,
        })
        .from(pokemonCardVariants)
        .leftJoin(
          pokemonCards,
          eq(pokemonCardVariants.cardId, pokemonCards.id)
        )
        .where(eq(pokemonCards.setId, setId))
        .orderBy(pokemonCards.number)
        .limit(pageSize)
        .offset(offset);

        const formattedCards = dbCards.map(({ variant, card }) => {
          const f = dbCardToApiFormat(card, null);

          f.id = variant.id;
          f.variantId = variant.id;
          f.finishType = variant.finishType;
          f.editionType = variant.editionType;
          f.variantLabel = variant.variantLabel;
          f.isStamped = variant.isStamped;
          f.language = variant.language;

          if (variant.imageUrl) {
            f.images = {
              small: variant.imageUrl,
              large: variant.imageUrl,
            };
          }

          if (setRow) {
            f.set = dbSetToApiFormat(setRow);
          }

          return f;
        });

        const payload = {
          data: formattedCards,
          count: formattedCards.length,
          totalCount,
          page,
          source: "db",
        };

        setMemCache(cacheKey, payload);
        warmCardCache(formattedCards);

        res.json(payload);
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
        .where(and(eq(pokemonCards.id, cardId), isNull(pokemonCards.deletedAt)))
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

  app.get("/api/ebay/sold-price", async (req: Request, res: Response) => {
    const { cardName, setName, number, cardId } = req.query as Record<string, string>;
    if (!cardName) {
      res.status(400).json({ error: "cardName required" });
      return;
    }

    async function scrapeEbaySoldPrices(query: string): Promise<number[]> {
      const searchParams = new URLSearchParams({
        _nkw: query,
        _sacat: "183454",
        LH_Complete: "1",
        LH_Sold: "1",
        LH_PrefLoc: "1",
        _sop: "13",
      });
      const ebayUrl = `https://www.ebay.co.uk/sch/i.html?${searchParams}`;
      const html = await fetch(ebayUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-GB,en;q=0.9",
        },
      }).then((r) => r.text());

      const prices: number[] = [];

      // Primary: cheerio with the correct eBay price selector
      try {
        const $ = cheerio.load(html);
        $(".s-item__price").each((_, el) => {
          const text = $(el).text().trim();
          // Handle ranges like "£3.50 to £5.00" — take the lower value
          const match = text.match(/£([\d,]+\.?\d*)/);
          if (match) {
            const price = parseFloat(match[1].replace(/,/g, ""));
            if (price >= 0.5 && price <= 5000) prices.push(price);
          }
        });
      } catch (_) {}

      // Fallback regex patterns if cheerio found nothing
      if (prices.length === 0) {
        const patterns = [
          /s-item__price[^>]*>\s*£([\d,]+\.?\d*)/g,
          /class="BOLD[^"]*">\s*£([\d,]+\.?\d*)/g,
          /itemprop="price"[^>]*content="([\d.]+)"/g,
        ];
        for (const pattern of patterns) {
          for (const m of html.matchAll(pattern)) {
            const price = parseFloat(m[1].replace(/,/g, ""));
            if (price >= 0.5 && price <= 5000) prices.push(price);
          }
          if (prices.length >= 3) break;
        }
      }

      // Deduplicate and cap
      return [...new Set(prices)].slice(0, 20);
    }

    function computeStats(prices: number[]): { lowest: number | null; median: number | null; highest: number | null } {
      if (prices.length === 0) return { lowest: null, median: null, highest: null };
      const sorted = [...prices].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      return {
        lowest: Math.round(sorted[0] * 100) / 100,
        median: Math.round(median * 100) / 100,
        highest: Math.round(sorted[sorted.length - 1] * 100) / 100,
      };
    }

    async function scrapeGradedMedian(baseQuery: string, grader: string, grade: number): Promise<number | null> {
      try {
        const altGrader = grader === "Beckett" ? "BGS" : null;
        const query = `${baseQuery} ${altGrader ?? grader} ${grade} pokemon card`;
        const prices = await scrapeEbaySoldPrices(query);
        const stats = computeStats(prices);
        return stats.median;
      } catch {
        return null;
      }
    }

    try {
      if (cardId) {
        const cached = await db
          .select()
          .from(ebayPrices)
          .where(eq(ebayPrices.cardId, cardId))
          .orderBy(desc(ebayPrices.fetchedAt))
          .limit(20);
        if (cached.length > 0) {
          const cacheAge = Date.now() - new Date(cached[0].fetchedAt!).getTime();
          if (cacheAge < 24 * 60 * 60 * 1000) {
            const prices = cached.map((r) => r.price).filter((p): p is number => p !== null && p > 0);
            if (prices.length > 0) {
              const stats = computeStats(prices);
              const cardBase = `${cardName}${setName ? " " + setName : ""}`;
              const [psa9, psa10, beckett9, beckett10, ace9, ace10, cgc9, cgc10] = await Promise.allSettled([
                scrapeGradedMedian(cardBase, "PSA", 9),
                scrapeGradedMedian(cardBase, "PSA", 10),
                scrapeGradedMedian(cardBase, "Beckett", 9),
                scrapeGradedMedian(cardBase, "Beckett", 10),
                scrapeGradedMedian(cardBase, "ACE", 9),
                scrapeGradedMedian(cardBase, "ACE", 10),
                scrapeGradedMedian(cardBase, "CGC", 9),
                scrapeGradedMedian(cardBase, "CGC", 10),
              ]);
              function getValCached(r: PromiseSettledResult<number | null>): number | null {
                return r.status === "fulfilled" ? r.value : null;
              }
              const gradedPrices = {
                PSA: { 9: getValCached(psa9), 10: getValCached(psa10) },
                Beckett: { 9: getValCached(beckett9), 10: getValCached(beckett10) },
                ACE: { 9: getValCached(ace9), 10: getValCached(ace10) },
                CGC: { 9: getValCached(cgc9), 10: getValCached(cgc10) },
              };
              res.json({
                price: stats.median,
                lowestSold: stats.lowest,
                medianSold: stats.median,
                highestSold: stats.highest,
                source: "eBay UK (Sold)",
                count: prices.length,
                cached: true,
                gradedPrices,
              });
              return;
            }
          }
        }
      }

      // Build queries from most useful to least — "/" in number breaks eBay search
      const numberFirst = number ? number.split("/")[0].replace(/^0+/, "") : null;
      const queries: string[] = [];
      if (setName) queries.push(`${cardName} pokemon ${setName}`);
      if (numberFirst && parseInt(numberFirst, 10) > 0) queries.push(`${cardName} pokemon ${numberFirst}`);
      queries.push(`${cardName} pokemon card`);

      let rawPrices: number[] = [];
      for (const q of queries) {
        rawPrices = await scrapeEbaySoldPrices(q);
        if (rawPrices.length >= 3) break;
      }

      if (rawPrices.length === 0) {
        res.json({ price: null, lowestSold: null, medianSold: null, highestSold: null, source: "eBay UK (Sold)", count: 0, gradedPrices: null });
        return;
      }

      const stats = computeStats(rawPrices);

      if (cardId && rawPrices.length > 0) {
        try {
          await db.delete(ebayPrices).where(eq(ebayPrices.cardId, cardId));
          await db.insert(ebayPrices).values(
            rawPrices.map((price) => ({
              cardId,
              price,
              currency: "GBP",
              isSold: true,
              fetchedAt: new Date(),
            }))
          );
        } catch (_) {}
      }

      const cardBase = `${cardName}${setName ? " " + setName : ""}`;
      const [psa9, psa10, beckett9, beckett10, ace9, ace10, cgc9, cgc10] = await Promise.allSettled([
        scrapeGradedMedian(cardBase, "PSA", 9),
        scrapeGradedMedian(cardBase, "PSA", 10),
        scrapeGradedMedian(cardBase, "Beckett", 9),
        scrapeGradedMedian(cardBase, "Beckett", 10),
        scrapeGradedMedian(cardBase, "ACE", 9),
        scrapeGradedMedian(cardBase, "ACE", 10),
        scrapeGradedMedian(cardBase, "CGC", 9),
        scrapeGradedMedian(cardBase, "CGC", 10),
      ]);

      function getVal(r: PromiseSettledResult<number | null>): number | null {
        return r.status === "fulfilled" ? r.value : null;
      }

      const gradedPrices = {
        PSA: { 9: getVal(psa9), 10: getVal(psa10) },
        Beckett: { 9: getVal(beckett9), 10: getVal(beckett10) },
        ACE: { 9: getVal(ace9), 10: getVal(ace10) },
        CGC: { 9: getVal(cgc9), 10: getVal(cgc10) },
      };

      res.json({
        price: stats.median,
        lowestSold: stats.lowest,
        medianSold: stats.median,
        highestSold: stats.highest,
        source: "eBay UK (Sold)",
        count: rawPrices.length,
        gradedPrices,
      });
    } catch (error: any) {
      console.error("eBay price fetch error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch eBay prices" });
    }
  });

  app.post("/api/identify-card", express.json({ limit: "15mb" }), async (req: Request, res: Response) => {
    try {
      const { imageBase64, mode } = req.body;
      if (!imageBase64) {
        res.status(400).json({ error: "imageBase64 is required" });
        return;
      }

      const isNumberStripMode = mode === "number-strip";

      // ── Auth token resolved here; quota enforcement moves to after AI detection ──
      const authToken = req.headers.authorization?.replace("Bearer ", "");

      // ── Number-strip mode: focused prompt just for reading the collector number ──
      if (isNumberStripMode) {
        let stripResponse: Awaited<ReturnType<typeof openai.chat.completions.create>>;
        try {
          const stripPromise = openai.chat.completions.create({
            model: "gpt-5.2",
            messages: [
              {
                role: "system",
                content: `You are examining a close-up photo of the bottom edge of a Pokémon card. This strip contains the collector number and possibly a set code and regulation mark.

READ THESE THREE ELEMENTS:

1. COLLECTOR NUMBER (bottom-left area of the strip):
   Formats: "025/198" · "001/078" · "SV049" · "TG15/TG30" · "SWSH001"
   Japanese modern format: "A5C 043/066" — the letters/numbers BEFORE the space are the SET CODE, the "043/066" is the collector number.
   Read each digit carefully. Common confusions: 0↔8, 6↔9, 1↔7 — look at the shape.

2. SET CODE (short alphanumeric code near the collector number):
   Examples: "A5C" "A3a" "B3a" "A1" "SV09" "sv6pt5" "SWSH" "XY" "BW"
   Usually 2-6 characters. May appear before the slash number (Japanese) or stamped near it (English).
   Report EXACTLY what is printed — do not invent a code.

3. REGULATION MARK (a single letter inside a rounded box or circle):
   Letters used: A B C D E F G H
   Located near the collector number. Very small but clearly stamped.

Respond with valid JSON in this EXACT format:
{
  "cardNumber": "043/066",
  "setCode": "A5C",
  "regulationMark": "H",
  "confidence": "high",
  "notes": "Set code A5C clearly printed before the number"
}

Rules:
- "cardNumber": full collector number as printed. Empty string ONLY if truly unreadable.
- "setCode": code as printed if visible, otherwise "".
- "regulationMark": single letter if visible, otherwise "".
- "confidence": "high"=fully clear · "medium"=some digits uncertain · "low"=unreadable.
- NEVER invent digits you cannot see. If a digit is uncertain, use "medium" and note which one.`
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Read the collector number, set code, and regulation mark from this Pokémon card bottom strip. Return the JSON."
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
                      detail: "high"
                    }
                  }
                ]
              }
            ],
            response_format: { type: "json_object" },
            max_completion_tokens: 300,
          });
          const stripTimeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(Object.assign(new Error("AI identification timed out. Please try again."), { isTimeout: true })), 30000)
          );
          stripResponse = await Promise.race([stripPromise, stripTimeoutPromise]);
        } catch (aiErr: any) {
          if (aiErr.isTimeout || aiErr.name === "AbortError" || aiErr.code === "ERR_CANCELED") {
            res.status(408).json({ error: aiErr.message || "AI identification timed out. Please try again." });
            return;
          }
          throw aiErr;
        }
        const stripContent = stripResponse.choices[0]?.message?.content;
        if (!stripContent) {
          res.status(500).json({ error: "AI returned empty response" });
          return;
        }
        const stripResult = JSON.parse(stripContent);
        res.json({
          cardNumber: stripResult.cardNumber || "",
          setCode: stripResult.setCode || "",
          regulationMark: stripResult.regulationMark || "",
          confidence: stripResult.confidence || "low",
          notes: stripResult.notes || "",
        });
        return;
      }

      const setReference = await buildSetReferencePrompt();

      let response: Awaited<ReturnType<typeof openai.chat.completions.create>>;
      try {
        const aiPromise = openai.chat.completions.create({
          model: "gpt-5.2",
          messages: [
            {
              role: "system",
              content: `You are a Pokémon TCG card identification system. Your job is to read what is physically printed on the card and return it as structured JSON. Study every visible detail of the image carefully.

══ CARD LAYOUT — WHERE EACH ELEMENT LIVES ══

BOTTOM STRIP (examine this area FIRST and most carefully):
┌──────────────────────────────────────────────────────────────┐
│ [SET CODE] [Collector No.]   [Rarity ●◆★]  [Reg. Mark ©]   │
│ e.g.  "A5C  043/066"   or   "025/198"   or   "SV049"        │
└──────────────────────────────────────────────────────────────┘
• The COLLECTOR NUMBER is at the bottom-LEFT in small (~8pt) text.
• English format: "025/198" · "TG15/TG30" · "SV049" · "SWSH001"
• Japanese/Asian format: a short SET CODE (e.g. "A5C") appears directly BEFORE the slash number — e.g. "A5C 043/066". The code before the space IS the setCode.
• REGULATION MARK: a single letter (A–H) stamped in a rounded box near the number.

SET SYMBOL (expansion icon):
• English cards: small logo icon at the BOTTOM-RIGHT of the illustration window (between art and card text).
• Japanese cards: small icon near the collector number strip.

CARD NAME: large text at the very TOP of the card.
HP: large number at the top-right (e.g. "120 HP"). Do NOT confuse with collector number.

══ LANGUAGE DETECTION — DO THIS FIRST ══
• English: Latin script, "Illus." credit
• Japanese: hiragana / katakana / kanji characters
• Korean: Hangul (가나다 style)
• Chinese (Traditional): Chinese characters, typically no furigana

══ STEP-BY-STEP IDENTIFICATION ══

Step 1 — LANGUAGE: Identify from the script on the card.

Step 2 — COLLECTOR NUMBER: Read the bottom-left text digit by digit.
  • 0 is perfectly round, 8 has two distinct loops, 6 opens to the right, 9 opens to the left, 1 is straight.
  • Write both parts: e.g. "043" and "066" → "043/066". Include leading zeros.
  • If the format has a prefix (like "SV" or "SWSH"), include it: "SV049".

Step 3 — SET CODE: Report the short printed code (2–6 alphanumeric chars) if visible.
  • Japanese/Korean/Chinese modern: code before the slash number (A5C, A3a, B3a, A1, A2a…)
  • English: code may be printed near the regulation mark (sv1, sv4pt5, swsh1, xy1, bw1…)
  • Copy it EXACTLY as printed — do not guess or invent a code.

Step 4 — CARD NAME: Read from the top of the card exactly as printed.

Step 5 — HOLO TYPE from the card's surface finish:
  • Non-Holo: completely flat/matte
  • Holo: shiny holographic illustration, matte border
  • Reverse Holo: shiny/sparkly border, flat illustration
  • Full Art: illustration bleeds to card edges, no standard border
  • Special Art Rare / Illustration Rare: large painted full-bleed illustration
  • Secret Rare / Rainbow Rare / Gold: gold or rainbow texture

══ CONFIDENCE ══
• "high": clearly read the full collector number AND card name; set identified
• "medium": name is clear but number is partially obscured, or set is uncertain
• "low": image is too blurry, angled, or cut off — never invent a number

══ CARD BACK ══
If the image shows the Pokémon card back (blue oval, Poké Ball, "Pokémon" text), return:
{"isCardBack":true,"englishName":"","cardNumber":"","setCode":"","setName":"","language":"","holoType":"","rarity":"","confidence":"low","originalName":"","notes":"Card back"}

══ RESPONSE FORMAT ══
{
  "isCardBack": false,
  "englishName": "Pikachu",
  "cardNumber": "025/198",
  "setCode": "sv1",
  "setName": "Scarlet & Violet",
  "language": "English",
  "holoType": "Holo",
  "rarity": "Rare",
  "confidence": "high",
  "originalName": "ピカチュウ",
  "notes": "Regulation mark G; set code sv1 visible near number"
}

• "englishName": English translation of the card name
• "originalName": name exactly as printed on the card
• "setCode": the short printed code (2–6 chars). Empty string "" if not visible.
• "notes": include regulation mark letter, any codes spotted, legibility observations

${setReference}`
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Identify this Pokémon card. Start by zooming into the BOTTOM-LEFT corner to read the small collector number (e.g. '025/198'). Then read the card name from the top. Return the JSON."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
                    detail: "high"
                  }
                }
              ]
            }
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 800,
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

      // ── Card back detected — return early, no quota consumed ──────────────
      if (identification.isCardBack === true) {
        res.json({ isCardBack: true });
        return;
      }

      // ── Scan quota enforcement (free users only, fronts only) ─────────────
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
            .where(and(or(...nameConditions), isNull(pokemonCards.deletedAt)))
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

            // 1a. Filter by set CODE (most precise — exact ID match)
            if (identification.setCode && formatted.length > 1) {
              const aiCode = identification.setCode.toLowerCase().trim();
              const codeMatch = formatted.filter((c: any) => {
                const dbId = (c.set?.id ?? "").toLowerCase();
                return dbId === aiCode || dbId.startsWith(aiCode) || aiCode.startsWith(dbId);
              });
              if (codeMatch.length > 0) formatted = codeMatch;
            }

            // 1b. Filter by set name if still multiple matches
            if (identification.setName && formatted.length > 1) {
              const aiSet = identification.setName.toLowerCase();
              const setMatch = formatted.filter((c: any) => {
                const dbSet = (c.set?.name ?? "").toLowerCase();
                return dbSet.includes(aiSet) || aiSet.includes(dbSet);
              });
              if (setMatch.length > 0) formatted = setMatch;
            }

            // 1c. Filter by card number
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
      const blocked = await isCredentialBlocked(email, mobileNumber);
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
        ...(blocked ? { isTrialUsed: true } as any : {}),
      });
      const token = await storage.createSession(user.id);
      const { passwordHash: _ph, ...safeUser } = user as any;

      // Auto-send email verification OTP
      try {
        const { code } = createOtp(user.email.toLowerCase().trim());
        await sendOtpByEmail(user.email, code);
      } catch (otpErr) {
        console.error("Failed to send verification email:", otpErr);
      }

      res.json({ token, user: safeUser });
    } catch (error: any) {
      console.error("Register error:", error);
      res.status(500).json({ error: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/verify-email", async (req: Request, res: Response) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        res.status(400).json({ error: "email and code are required" });
        return;
      }
      const normalised = email.toLowerCase().trim();
      const result = verifyOtp(normalised, code);
      if (!result.valid) {
        if (result.tooManyAttempts) {
          res.status(429).json({ error: "Too many incorrect attempts. Please request a new code." });
          return;
        }
        res.status(401).json({ error: result.expired ? "Code expired. Please request a new one." : "Incorrect code. Please try again." });
        return;
      }
      const user = await storage.getUserByEmail(normalised);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      await storage.updateUser(user.id, { emailVerified: true });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Verify email error:", error);
      res.status(500).json({ error: error.message || "Verification failed" });
    }
  });

  app.post("/api/auth/resend-email-verification", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: "email is required" });
        return;
      }
      const normalised = email.toLowerCase().trim();
      const user = await storage.getUserByEmail(normalised);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      const { code, rateLimited } = createOtp(normalised);
      if (rateLimited) {
        res.status(429).json({ error: "Please wait before requesting another code." });
        return;
      }
      await sendOtpByEmail(user.email, code);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Resend verification error:", error);
      res.status(500).json({ error: error.message || "Failed to resend code" });
    }
  });

  app.delete("/api/auth/account", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (!token) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      const caller = await storage.validateSession(token);
      if (!caller) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      if (caller.isPremium && caller.subscriptionStatus === "active") {
        res.status(403).json({ error: "Please cancel your Premium subscription before deleting your account." });
        return;
      }
      await storage.deleteUser(caller.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete account error:", error);
      res.status(500).json({ error: error.message || "Failed to delete account" });
    }
  });

  // Verify password only — used for the first step of 2FA.
  // Returns masked contact info so the client can show channel options.
  // Does NOT create a session.
  app.post("/api/auth/verify-password", async (req: Request, res: Response) => {
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
      // Mask email and mobile for display in the OTP channel picker
      const maskEmail = (e: string) => {
        const [local, domain] = e.split("@");
        return local.slice(0, 2) + "***@" + domain;
      };
      const maskMobile = (m: string) => m.slice(0, -4).replace(/./g, "*") + m.slice(-4);
      res.json({
        userId: user.id,
        hasEmail: !!user.email,
        hasMobile: !!user.mobileNumber,
        maskedEmail: user.email ? maskEmail(user.email) : null,
        maskedMobile: user.mobileNumber ? maskMobile(user.mobileNumber) : null,
        emailCredential: user.email,
        mobileCredential: user.mobileNumber,
      });
    } catch (error: any) {
      console.error("Verify password error:", error);
      res.status(500).json({ error: error.message || "Verification failed" });
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
      const bu = (user as any).bannedUntil as Date | null;
      if (bu && new Date(bu) > new Date()) {
        const reason = (user as any).banReason || "Violation of community guidelines";
        const permanent = new Date(bu).getFullYear() > 2999;
        res.status(403).json({
          error: "Account banned",
          banned: true,
          bannedUntil: bu,
          banReason: reason,
          permanent,
          message: permanent
            ? `Your account has been permanently banned. Reason: ${reason}`
            : `Your account is banned until ${new Date(bu).toLocaleString()}. Reason: ${reason}`,
        });
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

      const bu = (user as any).bannedUntil as Date | null;
      if (bu && new Date(bu) > new Date()) {
        const reason = (user as any).banReason || "Violation of community guidelines";
        const permanent = new Date(bu).getFullYear() > 2999;
        res.status(403).json({
          error: "Account banned",
          banned: true,
          bannedUntil: bu,
          banReason: reason,
          permanent,
          message: permanent
            ? `Your account has been permanently banned. Reason: ${reason}`
            : `Your account is banned until ${new Date(bu).toLocaleString()}. Reason: ${reason}`,
        });
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

      const { getUncachableStripeClient, ensureStripeCustomer } = await import("./stripe-client");
      const stripe = await getUncachableStripeClient();

      // Ensure a valid Stripe customer exists for this user.
      // Auto-recreates if the stored ID is missing or invalid (e.g. test->live switch).
      const customerId = await ensureStripeCustomer(stripe, user);

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

      const { getUncachableStripeClient, ensureStripeCustomer } = await import("./stripe-client");
      const stripe = await getUncachableStripeClient();
      const { returnUrl } = req.body as { returnUrl: string };

      const customerId = await ensureStripeCustomer(stripe, user);

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

      const { getUncachableStripeClient, ensureStripeCustomer } = await import("./stripe-client");
      const stripe = await getUncachableStripeClient();

      let subscriptions;
      try {
        subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "all",
          limit: 5,
          expand: ["data.default_payment_method"],
        });
      } catch (e: any) {
        // Stale customer (e.g. test->live mode switch) — clear it so the next purchase recreates one.
        console.warn(`[Stripe] Sync failed for customer ${customerId}: ${e.message}. Clearing stored ID.`);
        await storage.updateUser(user.id, { stripeCustomerId: null } as any);
        res.json({ isPremium: false, subscriptionStatus: null });
        return;
      }

      const active = subscriptions.data.find(
        (s) => s.status === "active" || s.status === "trialing"
      );

      if (active) {
        const periodEnd = new Date((active as any).current_period_end * 1000);
        // Preserve "canceling" status when the sub is winding down
        const resolvedStatus = (active as any).cancel_at_period_end ? "canceling" : active.status;
        await storage.updateUser(user.id, {
          isPremium: true,
          stripeSubscriptionId: active.id,
          stripePriceId: (active.items.data[0]?.price?.id) ?? null,
          subscriptionStatus: resolvedStatus,
          subscriptionPeriodEnd: periodEnd,
        } as any);
        res.json({ isPremium: true, subscriptionStatus: resolvedStatus, periodEnd: periodEnd.toISOString(), cancelAtPeriodEnd: !!(active as any).cancel_at_period_end });
      } else {
        // No active Stripe subscription — check if still within a paid period (webhook safety net)
        const latestSub = subscriptions.data[0];
        const storedUser = user as any;
        const periodEndDate = storedUser.subscriptionPeriodEnd
          ? new Date(storedUser.subscriptionPeriodEnd)
          : null;
        const stillInGracePeriod = periodEndDate && periodEndDate > new Date();

        if (stillInGracePeriod) {
          // Stripe cancelled the sub but the billing period hasn't expired yet — keep premium
          await storage.updateUser(user.id, {
            subscriptionStatus: "canceling",
          } as any);
          res.json({ isPremium: true, subscriptionStatus: "canceling", periodEnd: periodEndDate!.toISOString(), cancelAtPeriodEnd: true });
        } else {
          // Fully expired
          await storage.updateUser(user.id, {
            isPremium: false,
            subscriptionStatus: latestSub?.status ?? "canceled",
          } as any);
          res.json({ isPremium: false, subscriptionStatus: latestSub?.status ?? "canceled" });
        }
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
        const { getUncachableStripeClient, ensureStripeCustomer } = await import("./stripe-client");
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
              // If cancel_at_period_end is true the sub is still active but winding down
              const resolvedStatus = isActive && sub.cancel_at_period_end
                ? "canceling"
                : sub.status;
              await pool.query(
                `UPDATE pokescan_users
                 SET is_premium = $1, stripe_subscription_id = $2,
                     stripe_price_id = $3, subscription_status = $4,
                     subscription_period_end = $5
                 WHERE id = $6`,
                [isActive, sub.id, sub.items?.data?.[0]?.price?.id ?? null, resolvedStatus, periodEnd, userId]
              );
              console.log(`[Stripe Webhook] Updated user ${userId}: isPremium=${isActive} status=${resolvedStatus} cancelAtPeriodEnd=${sub.cancel_at_period_end}`);
            }
            break;
          }
          case "customer.subscription.deleted": {
            const sub = event.data.object as any;
            const customerId = sub.customer as string;
            const periodEnd = sub.current_period_end
              ? new Date(sub.current_period_end * 1000)
              : new Date();
            await pool.query(
              `UPDATE pokescan_users
               SET is_premium = false, subscription_status = 'canceled',
                   subscription_period_end = $2
               WHERE stripe_customer_id = $1`,
              [customerId, periodEnd]
            );
            console.log(`[Stripe Webhook] Subscription ended for customer ${customerId} — premium removed`);
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
          const { getUncachableStripeClient, ensureStripeCustomer } = await import("./stripe-client");
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

  // ─── Market Listings ────────────────────────────────────────────────────────────

  // Helper to parse a DB row into a client-safe listing object
  function rowToListing(row: any) {
    return {
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      cardId: row.card_id,
      cardName: row.card_name,
      cardImage: row.card_image,
      setName: row.set_name,
      rarity: row.rarity,
      type: row.type,
      priceGBP: row.price_gbp ?? null,
      condition: row.condition,
      description: row.description ?? "",
      photos: (() => { try { return JSON.parse(row.photos ?? "[]"); } catch { return []; } })(),
      status: row.status ?? "approved",
      reviewedBy: row.reviewed_by ?? null,
      reviewedAt: row.reviewed_at ?? null,
      reviewNote: row.review_note ?? null,
      reviewNoteUpdatedBy: row.review_note_updated_by_username ?? row.review_note_updated_by ?? null,
      reviewNoteUpdatedAt: row.review_note_updated_at ?? null,
      externalUrl: row.external_url ?? null,
      createdAt: row.created_at,
    };
  }

  // GET /api/listings — approved listings only (premium required)
  app.get("/api/listings", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid or expired session" }); return; }
      if (!user.isPremium) { res.status(403).json({ error: "Premium required to access the marketplace." }); return; }

      // Public marketplace shows only approved listings.
      // The owner additionally sees their own pending/rejected listings so they
      // know the moderation status of their own posts.
      const result = await pool.query(
        `SELECT * FROM pokescan_market_listings
           WHERE status = 'approved' OR user_id = $1
           ORDER BY created_at DESC
           LIMIT 200`,
        [user.id]
      );
      res.json({ listings: result.rows.map(rowToListing) });
    } catch (err: any) {
      console.error("[Listings] GET error:", err.message);
      res.status(500).json({ error: "Could not fetch listings" });
    }
  });

  // POST /api/listings — create a listing (premium required). New listings are
  // pending until an admin/moderator approves them, to limit fake/scam posts.
  app.post("/api/listings", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid or expired session" }); return; }
      if (!user.isPremium) { res.status(403).json({ error: "Premium required to list on the marketplace." }); return; }

      const { cardId, cardName, cardImage, setName, rarity, type, priceGBP, condition, description, photos, externalUrl } = req.body;
      if (!cardId || !cardName || !cardImage || !setName || !type || !condition) {
        res.status(400).json({ error: "Missing required listing fields." });
        return;
      }

      const rawPhotos: string[] = Array.isArray(photos) ? photos.slice(0, 6) : [];
      const photosJson = JSON.stringify(rawPhotos);

      // Sanitise external URL — must be http/https or empty
      const safeExternalUrl = (typeof externalUrl === "string" && /^https?:\/\//i.test(externalUrl.trim()))
        ? externalUrl.trim()
        : null;

      // Staff posts are auto-approved; everyone else starts pending review.
      const isStaff = user.role === "admin" || user.role === "moderator";
      const initialStatus = isStaff ? "approved" : "pending";

      const result = await pool.query(
        `INSERT INTO pokescan_market_listings
           (user_id, user_name, card_id, card_name, card_image, set_name, rarity, type, price_gbp, condition, description, photos, status, reviewed_by, reviewed_at, external_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         RETURNING *`,
        [
          user.id, user.displayName,
          cardId, cardName, cardImage, setName, rarity ?? "Unknown",
          type, priceGBP ?? null,
          condition, description ?? "",
          photosJson,
          initialStatus,
          isStaff ? user.id : null,
          isStaff ? new Date() : null,
          safeExternalUrl,
        ]
      );
      res.status(201).json({ listing: rowToListing(result.rows[0]) });
    } catch (err: any) {
      console.error("[Listings] POST error:", err.message);
      res.status(500).json({ error: "Could not create listing" });
    }
  });

  // DELETE /api/listings/:id — owner or staff can delete
  app.delete("/api/listings/:id", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid or expired session" }); return; }

      const { id } = req.params;
      const existing = await pool.query(`SELECT user_id FROM pokescan_market_listings WHERE id = $1`, [id]);
      if (existing.rows.length === 0) { res.status(404).json({ error: "Listing not found" }); return; }

      const isOwner = existing.rows[0].user_id === user.id;
      const isStaff = user.role === "admin" || user.role === "moderator";
      if (!isOwner && !isStaff) { res.status(403).json({ error: "Not authorised to delete this listing" }); return; }

      await pool.query(`DELETE FROM pokescan_market_listings WHERE id = $1`, [id]);
      res.json({ success: true });
    } catch (err: any) {
      console.error("[Listings] DELETE error:", err.message);
      res.status(500).json({ error: "Could not delete listing" });
    }
  });

  // PATCH /api/listings/:id — owner can edit editable fields; resets to pending
  app.patch("/api/listings/:id", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid or expired session" }); return; }

      const { id } = req.params;
      const existing = await pool.query(`SELECT user_id FROM pokescan_market_listings WHERE id = $1`, [id]);
      if (existing.rows.length === 0) { res.status(404).json({ error: "Listing not found" }); return; }

      const isOwner = existing.rows[0].user_id === user.id;
      if (!isOwner) { res.status(403).json({ error: "Not authorised to edit this listing" }); return; }

      const { priceGBP, condition, description, externalUrl, photos } = req.body;
      if (!condition) { res.status(400).json({ error: "Condition is required" }); return; }

      const safeExternalUrl = (typeof externalUrl === "string" && /^https?:\/\//i.test(externalUrl.trim()))
        ? externalUrl.trim()
        : null;

      const isStaff = user.role === "admin" || user.role === "moderator";
      const newStatus = isStaff ? "approved" : "pending";

      let result;
      if (Array.isArray(photos)) {
        const photosJson = JSON.stringify(photos.slice(0, 6));
        result = await pool.query(
          `UPDATE pokescan_market_listings
             SET price_gbp = $1, condition = $2, description = $3, external_url = $4,
                 photos = $5,
                 status = $6,
                 reviewed_by = $7, reviewed_at = $8,
                 review_note = NULL
             WHERE id = $9
             RETURNING *`,
          [
            priceGBP ?? null, condition, description ?? "", safeExternalUrl,
            photosJson,
            newStatus,
            isStaff ? user.id : null,
            isStaff ? new Date() : null,
            id,
          ]
        );
      } else {
        result = await pool.query(
          `UPDATE pokescan_market_listings
             SET price_gbp = $1, condition = $2, description = $3, external_url = $4,
                 status = $5,
                 reviewed_by = $6, reviewed_at = $7,
                 review_note = NULL
             WHERE id = $8
             RETURNING *`,
          [
            priceGBP ?? null, condition, description ?? "", safeExternalUrl,
            newStatus,
            isStaff ? user.id : null,
            isStaff ? new Date() : null,
            id,
          ]
        );
      }
      res.json({ listing: rowToListing(result.rows[0]) });
    } catch (err: any) {
      console.error("[Listings] PATCH error:", err.message);
      res.status(500).json({ error: "Could not update listing" });
    }
  });

  // ─── Admin: market listing moderation ─────────────────────────────────────
  // GET /api/admin/listings?status=pending|approved|rejected|all (default: all)
  app.get("/api/admin/listings", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid or expired session" }); return; }
      if (user.role !== "admin" && user.role !== "moderator") {
        res.status(403).json({ error: "Staff access required" }); return;
      }

      const status = String(req.query.status ?? "all").toLowerCase();
      const allowed = ["pending", "approved", "rejected"];
      const result = allowed.includes(status)
        ? await pool.query(
            `SELECT ml.*, u.username AS review_note_updated_by_username
               FROM pokescan_market_listings ml
               LEFT JOIN pokescan_users u ON u.id = ml.review_note_updated_by
              WHERE ml.status = $1
              ORDER BY ml.created_at DESC LIMIT 500`,
            [status]
          )
        : await pool.query(
            `SELECT ml.*, u.username AS review_note_updated_by_username
               FROM pokescan_market_listings ml
               LEFT JOIN pokescan_users u ON u.id = ml.review_note_updated_by
              ORDER BY ml.created_at DESC LIMIT 500`
          );
      res.json({ listings: result.rows.map(rowToListing) });
    } catch (err: any) {
      console.error("[Admin Listings] GET error:", err.message);
      res.status(500).json({ error: "Could not fetch admin listings" });
    }
  });

  // PATCH /api/admin/listings/:id — set status to approved or rejected
  app.patch("/api/admin/listings/:id", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid or expired session" }); return; }
      if (user.role !== "admin" && user.role !== "moderator") {
        res.status(403).json({ error: "Staff access required" }); return;
      }

      const { id } = req.params;
      const { status, reviewNote } = req.body ?? {};

      if (status !== undefined && status !== "approved" && status !== "rejected") {
        res.status(400).json({ error: "status must be 'approved' or 'rejected'" }); return;
      }

      let result;
      if (status !== undefined) {
        result = await pool.query(
          `UPDATE pokescan_market_listings
              SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_note = $3
            WHERE id = $4
            RETURNING *`,
          [status, user.id, reviewNote ?? null, id]
        );
      } else {
        result = await pool.query(
          `WITH upd AS (
              UPDATE pokescan_market_listings
                 SET review_note = $1,
                     review_note_updated_by = $2,
                     review_note_updated_at = NOW()
               WHERE id = $3
             RETURNING *
           )
           SELECT upd.*, u.username AS review_note_updated_by_username
             FROM upd
             LEFT JOIN pokescan_users u ON u.id = upd.review_note_updated_by`,
          [reviewNote ?? null, user.id, id]
        );
      }
      if (result.rows.length === 0) { res.status(404).json({ error: "Listing not found" }); return; }

      const row = result.rows[0];
      const action = status !== undefined ? status : "note_edited";
      try {
        await db.insert(pokescanAdminActivityLog).values({
          listingId: id,
          listingName: row.card_name ?? null,
          action,
          performedBy: user.id,
          note: reviewNote ?? null,
        });
      } catch (logErr) {
        console.warn("[ActivityLog] Failed to write log entry:", logErr);
      }

      res.json({ listing: rowToListing(row) });
    } catch (err: any) {
      console.error("[Admin Listings] PATCH error:", err.message);
      res.status(500).json({ error: "Could not update listing" });
    }
  });

  // GET /api/admin/activity-log — paginated moderation activity log.
  // Admin/superadmin only (not plain moderators): the Logs tab in the admin UI is also
  // restricted to admins/superadmins. Moderators use the Reports tab for their queue.
  // Note: seedSuperadmin always sets the superadmin email's role to "admin", so
  // user.role === "admin" already covers superadmins. isSuperadminAuthorized is called
  // explicitly as a belt-and-suspenders check for legacy superadmin token paths.
  app.get("/api/admin/activity-log", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid or expired session" }); return; }
      if (user.role !== "admin" && !(await isSuperadminAuthorized(req))) {
        res.status(403).json({ error: "Admin access required" }); return;
      }

      const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
      const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || "20", 10)));
      const offset = (page - 1) * limit;
      const moderator = (req.query.moderator as string) || "";
      const dateFrom = (req.query.dateFrom as string) || "";
      const dateTo = (req.query.dateTo as string) || "";

      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (dateFrom && (!datePattern.test(dateFrom) || isNaN(Date.parse(dateFrom)))) {
        res.status(400).json({ error: "Invalid dateFrom format — use YYYY-MM-DD" }); return;
      }
      if (dateTo && (!datePattern.test(dateTo) || isNaN(Date.parse(dateTo)))) {
        res.status(400).json({ error: "Invalid dateTo format — use YYYY-MM-DD" }); return;
      }

      const conditions: string[] = [];
      const params: (string | number)[] = [];
      let pi = 1;

      if (moderator) {
        conditions.push(`u.username ILIKE $${pi++}`);
        params.push(`%${moderator}%`);
      }
      if (dateFrom) {
        conditions.push(`al.created_at >= $${pi++}`);
        params.push(new Date(dateFrom).toISOString());
      }
      if (dateTo) {
        conditions.push(`al.created_at <= $${pi++}`);
        params.push(new Date(dateTo + "T23:59:59").toISOString());
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total
           FROM pokescan_admin_activity_log al
           LEFT JOIN pokescan_users u ON u.id = al.performed_by
           ${where}`,
        params
      );
      const total = countResult.rows[0]?.total ?? 0;

      const dataResult = await pool.query(
        `SELECT al.*, u.username AS moderator_username, u.display_name AS moderator_display_name
           FROM pokescan_admin_activity_log al
           LEFT JOIN pokescan_users u ON u.id = al.performed_by
           ${where}
           ORDER BY al.created_at DESC
           LIMIT $${pi++} OFFSET $${pi++}`,
        [...params, limit, offset]
      );

      res.json({
        logs: dataResult.rows.map((r) => ({
          id: r.id,
          listingId: r.listing_id,
          listingName: r.listing_name,
          targetUserId: r.target_user_id,
          targetUsername: r.target_username,
          action: r.action,
          performedBy: r.performed_by,
          moderatorUsername: r.moderator_username,
          moderatorDisplayName: r.moderator_display_name,
          note: r.note,
          createdAt: r.created_at,
        })),
        total,
        page,
        limit,
        hasMore: offset + limit < total,
      });
    } catch (err: any) {
      console.error("[ActivityLog] GET error:", err.message);
      res.status(500).json({ error: "Could not fetch activity log" });
    }
  });

  // GET /api/admin/reports/all — all reports with pagination and optional status filter.
  // Admin/superadmin only, same rationale as /api/admin/activity-log above.
  app.get("/api/admin/reports/all", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid or expired session" }); return; }
      if (user.role !== "admin" && !(await isSuperadminAuthorized(req))) {
        res.status(403).json({ error: "Admin access required" }); return;
      }

      const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
      const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || "20", 10)));
      const offset = (page - 1) * limit;
      const status = (req.query.status as string) || "all";
      const reporter = (req.query.reporter as string) || "";
      const dateFrom = (req.query.dateFrom as string) || "";
      const dateTo = (req.query.dateTo as string) || "";

      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (dateFrom && (!datePattern.test(dateFrom) || isNaN(Date.parse(dateFrom)))) {
        res.status(400).json({ error: "Invalid dateFrom format — use YYYY-MM-DD" }); return;
      }
      if (dateTo && (!datePattern.test(dateTo) || isNaN(Date.parse(dateTo)))) {
        res.status(400).json({ error: "Invalid dateTo format — use YYYY-MM-DD" }); return;
      }

      const conditions: string[] = [];
      const params: (string | number)[] = [];
      let pi = 1;

      const allowedStatuses = ["pending", "reviewed", "dismissed"];
      if (allowedStatuses.includes(status)) {
        conditions.push(`r.status = $${pi++}`);
        params.push(status);
      }
      if (reporter) {
        conditions.push(`reporter.username ILIKE $${pi++}`);
        params.push(`%${reporter}%`);
      }
      if (dateFrom) {
        conditions.push(`r.created_at >= $${pi++}`);
        params.push(new Date(dateFrom).toISOString());
      }
      if (dateTo) {
        conditions.push(`r.created_at <= $${pi++}`);
        params.push(new Date(dateTo + "T23:59:59").toISOString());
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total
           FROM pokescan_reports r
           LEFT JOIN pokescan_users reporter ON reporter.id = r.reporter_id
           ${where}`,
        params
      );
      const total = countResult.rows[0]?.total ?? 0;

      const dataResult = await pool.query(
        `SELECT r.*,
                reporter.username AS reporter_username,
                reporter.display_name AS reporter_display_name,
                reported.username AS reported_username,
                reviewed_by_user.username AS reviewed_by_username
           FROM pokescan_reports r
           LEFT JOIN pokescan_users reporter ON reporter.id = r.reporter_id
           LEFT JOIN pokescan_users reported ON reported.id = r.reported_user_id
           LEFT JOIN pokescan_users reviewed_by_user ON reviewed_by_user.id = r.reviewed_by
           ${where}
           ORDER BY r.created_at DESC
           LIMIT $${pi++} OFFSET $${pi++}`,
        [...params, limit, offset]
      );

      res.json({
        reports: dataResult.rows.map((r) => ({
          id: r.id,
          reporterId: r.reporter_id,
          reporterUsername: r.reporter_username,
          reporterDisplayName: r.reporter_display_name,
          reportedUserId: r.reported_user_id,
          reportedUsername: r.reported_username,
          contentType: r.content_type,
          contentId: r.content_id,
          reason: r.reason,
          contentSnapshot: r.content_snapshot,
          status: r.status,
          reviewNote: r.review_note,
          reviewedBy: r.reviewed_by,
          reviewedByUsername: r.reviewed_by_username,
          reviewedAt: r.reviewed_at,
          createdAt: r.created_at,
        })),
        total,
        page,
        limit,
        hasMore: offset + limit < total,
      });
    } catch (err: any) {
      console.error("[AllReports] GET error:", err.message);
      res.status(500).json({ error: "Could not fetch reports" });
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

  // ─── Scan History CRUD ───────────────────────────────────────────────────────

  app.get("/api/scan-history", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid or expired session" }); return; }
      const rows = await db.execute(
        sql`SELECT * FROM pokescan_scan_history WHERE user_id = ${user.id} ORDER BY scanned_at DESC LIMIT 25`
      );
      const entries = (rows.rows as any[]).map((r) => ({
        id: r.id,
        timestamp: r.scanned_at,
        cardName: r.card_name,
        setName: r.set_name,
        cardNumber: r.card_number,
        language: r.language,
        thumbnail: r.thumbnail,
        priceGBP: r.price_gbp,
        identification: JSON.parse(r.identification || "{}"),
        tcgApiResults: JSON.parse(r.tcg_api_results || "[]"),
        pcvResults: JSON.parse(r.pcv_results || "[]"),
      }));
      res.json({ history: entries });
    } catch (error: any) {
      console.error("Scan history fetch error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch scan history" });
    }
  });

  app.post("/api/scan-history", express.json({ limit: "10mb" }), async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid or expired session" }); return; }
      const { cardName, setName, cardNumber, language, thumbnail, priceGBP, identification, tcgApiResults, pcvResults } = req.body;
      if (!cardName) { res.status(400).json({ error: "cardName is required" }); return; }
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await db.execute(
        sql`INSERT INTO pokescan_scan_history (id, user_id, card_name, set_name, card_number, language, thumbnail, price_gbp, identification, tcg_api_results, pcv_results)
            VALUES (${id}, ${user.id}, ${cardName}, ${setName || ""}, ${cardNumber || ""}, ${language || "english"},
                    ${thumbnail || null}, ${priceGBP ?? null},
                    ${JSON.stringify(identification || {})}, ${JSON.stringify(tcgApiResults || [])}, ${JSON.stringify(pcvResults || [])})`
      );
      await db.execute(
        sql`DELETE FROM pokescan_scan_history WHERE user_id = ${user.id} AND id NOT IN (
              SELECT id FROM pokescan_scan_history WHERE user_id = ${user.id} ORDER BY scanned_at DESC LIMIT 25
            )`
      );
      const rows = await db.execute(
        sql`SELECT * FROM pokescan_scan_history WHERE user_id = ${user.id} ORDER BY scanned_at DESC LIMIT 25`
      );
      const entries = (rows.rows as any[]).map((r) => ({
        id: r.id,
        timestamp: r.scanned_at,
        cardName: r.card_name,
        setName: r.set_name,
        cardNumber: r.card_number,
        language: r.language,
        thumbnail: r.thumbnail,
        priceGBP: r.price_gbp,
        identification: JSON.parse(r.identification || "{}"),
        tcgApiResults: JSON.parse(r.tcg_api_results || "[]"),
        pcvResults: JSON.parse(r.pcv_results || "[]"),
      }));
      res.json({ history: entries });
    } catch (error: any) {
      console.error("Scan history add error:", error);
      res.status(500).json({ error: error.message || "Failed to add scan history entry" });
    }
  });

  app.post("/api/scan-history/bulk", express.json({ limit: "10mb" }), async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid or expired session" }); return; }
      const { entries } = req.body;
      if (!Array.isArray(entries) || entries.length === 0) { res.json({ migrated: 0, failed: 0 }); return; }
      let migrated = 0;
      let failed = 0;
      for (const entry of entries) {
        try {
          const existingRows = await db.execute(
            sql`SELECT id FROM pokescan_scan_history WHERE id = ${entry.id} AND user_id = ${user.id}`
          );
          if ((existingRows.rows as any[]).length > 0) { migrated++; continue; }
          const scannedAt = entry.timestamp ? new Date(entry.timestamp) : new Date();
          await db.execute(
            sql`INSERT INTO pokescan_scan_history (id, user_id, card_name, set_name, card_number, language, thumbnail, price_gbp, identification, tcg_api_results, pcv_results, scanned_at)
                VALUES (${entry.id}, ${user.id}, ${entry.cardName || ""}, ${entry.setName || ""}, ${entry.cardNumber || ""},
                        ${entry.language || "english"}, ${entry.thumbnail || null}, ${entry.priceGBP ?? null},
                        ${JSON.stringify(entry.identification || {})}, ${JSON.stringify(entry.tcgApiResults || [])}, ${JSON.stringify(entry.pcvResults || [])}, ${scannedAt})`
          );
          migrated++;
        } catch { failed++; }
      }
      await db.execute(
        sql`DELETE FROM pokescan_scan_history WHERE user_id = ${user.id} AND id NOT IN (
              SELECT id FROM pokescan_scan_history WHERE user_id = ${user.id} ORDER BY scanned_at DESC LIMIT 25
            )`
      );
      res.json({ migrated, failed });
    } catch (error: any) {
      console.error("Scan history bulk migrate error:", error);
      res.status(500).json({ error: error.message || "Migration failed" });
    }
  });

  app.delete("/api/scan-history", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid or expired session" }); return; }
      await db.execute(sql`DELETE FROM pokescan_scan_history WHERE user_id = ${user.id}`);
      res.json({ history: [] });
    } catch (error: any) {
      console.error("Scan history clear error:", error);
      res.status(500).json({ error: error.message || "Failed to clear scan history" });
    }
  });

  app.delete("/api/scan-history/:id", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid or expired session" }); return; }
      const { id } = req.params;
      await db.execute(sql`DELETE FROM pokescan_scan_history WHERE id = ${id} AND user_id = ${user.id}`);
      const rows = await db.execute(
        sql`SELECT * FROM pokescan_scan_history WHERE user_id = ${user.id} ORDER BY scanned_at DESC LIMIT 25`
      );
      const entries = (rows.rows as any[]).map((r) => ({
        id: r.id,
        timestamp: r.scanned_at,
        cardName: r.card_name,
        setName: r.set_name,
        cardNumber: r.card_number,
        language: r.language,
        thumbnail: r.thumbnail,
        priceGBP: r.price_gbp,
        identification: JSON.parse(r.identification || "{}"),
        tcgApiResults: JSON.parse(r.tcg_api_results || "[]"),
        pcvResults: JSON.parse(r.pcv_results || "[]"),
      }));
      res.json({ history: entries });
    } catch (error: any) {
      console.error("Scan history delete error:", error);
      res.status(500).json({ error: error.message || "Failed to delete scan history entry" });
    }
  });

  // ─── Collection CRUD ─────────────────────────────────────────────────────────

  app.get("/api/collection", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid or expired session" }); return; }

      const rows = await db.execute(
        sql`SELECT * FROM pokescan_collections WHERE user_id = ${user.id} ORDER BY added_at DESC`
      );
      const items = (rows.rows as any[]).map((r) => ({
        id: r.id,
        cardId: r.card_id,
        cardName: r.card_name,
        cardImage: r.card_image,
        setName: r.set_name,
        setId: r.set_id,
        rarity: r.rarity,
        quantity: r.quantity,
        condition: r.condition,
        variant: r.variant || "Non-Holo",
        priceGBP: r.price_gbp,
        gradingCompany: r.grading_company || null,
        grade: r.grade || null,
        isVerified: r.is_verified ?? false,
        verifiedAt: r.verified_at || null,
        addedAt: r.added_at,
      }));
      res.json({ collection: items });
    } catch (error: any) {
      console.error("Collection fetch error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch collection" });
    }
  });

  app.post("/api/collection", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid or expired session" }); return; }

      const { cardId, cardName, cardImage, setName, setId, rarity, quantity, condition, variant, priceGBP, migrate, gradingCompany, grade } = req.body;
      const v = variant || "Non-Holo";
      const gc = gradingCompany || null;
      const gr = grade || null;

      // Grading is part of the card's identity: a graded copy and a raw copy coexist as separate rows.
      // Match on grading_company + grade too so they never overwrite each other.
      const existing = await db.execute(
        sql`SELECT id, quantity FROM pokescan_collections
            WHERE user_id = ${user.id}
              AND card_id = ${cardId}
              AND condition = ${condition}
              AND COALESCE(variant, 'Non-Holo') = ${v}
              AND COALESCE(grading_company, '') = COALESCE(${gc}, '')
              AND COALESCE(grade, '') = COALESCE(${gr}, '')`
      );

      if (existing.rows.length > 0) {
        const row = existing.rows[0] as any;
        const newQty = migrate ? Math.max(row.quantity, quantity || 1) : row.quantity + (quantity || 1);
        await db.execute(
          sql`UPDATE pokescan_collections SET quantity = ${newQty}, price_gbp = ${priceGBP ?? null} WHERE id = ${row.id}`
        );
      } else {
        await db.execute(
          sql`INSERT INTO pokescan_collections (user_id, card_id, card_name, card_image, set_name, set_id, rarity, quantity, condition, variant, price_gbp, grading_company, grade) VALUES (${user.id}, ${cardId}, ${cardName}, ${cardImage ?? null}, ${setName || setId || "Unknown"}, ${setId || null}, ${rarity || "Unknown"}, ${quantity || 1}, ${condition}, ${v}, ${priceGBP ?? null}, ${gc}, ${gr})`
        );
      }

      const rows = await db.execute(
        sql`SELECT * FROM pokescan_collections WHERE user_id = ${user.id} ORDER BY added_at DESC`
      );
      const items = (rows.rows as any[]).map((r) => ({
        id: r.id,
        cardId: r.card_id,
        cardName: r.card_name,
        cardImage: r.card_image,
        setName: r.set_name,
        setId: r.set_id,
        rarity: r.rarity,
        quantity: r.quantity,
        condition: r.condition,
        variant: r.variant || "Non-Holo",
        priceGBP: r.price_gbp,
        gradingCompany: r.grading_company || null,
        grade: r.grade || null,
        isVerified: r.is_verified ?? false,
        verifiedAt: r.verified_at || null,
        addedAt: r.added_at,
      }));
      res.json({ collection: items });
    } catch (error: any) {
      console.error("Collection add error:", error);
      res.status(500).json({ error: error.message || "Failed to add card" });
    }
  });

  app.put("/api/collection/:id", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid or expired session" }); return; }

      const { id } = req.params;
      const { quantity, gradingCompany, grade } = req.body;

      if (quantity <= 0) {
        await db.execute(sql`DELETE FROM pokescan_collections WHERE id = ${id} AND user_id = ${user.id}`);
      } else if (gradingCompany !== undefined) {
        const gc = gradingCompany || null;
        const gr = grade || null;
        await db.execute(sql`UPDATE pokescan_collections SET quantity = ${quantity}, grading_company = ${gc}, grade = ${gr} WHERE id = ${id} AND user_id = ${user.id}`);
      } else {
        await db.execute(sql`UPDATE pokescan_collections SET quantity = ${quantity} WHERE id = ${id} AND user_id = ${user.id}`);
      }

      const rows = await db.execute(
        sql`SELECT * FROM pokescan_collections WHERE user_id = ${user.id} ORDER BY added_at DESC`
      );
      const items = (rows.rows as any[]).map((r) => ({
        id: r.id,
        cardId: r.card_id,
        cardName: r.card_name,
        cardImage: r.card_image,
        setName: r.set_name,
        setId: r.set_id,
        rarity: r.rarity,
        quantity: r.quantity,
        condition: r.condition,
        variant: r.variant || "Non-Holo",
        priceGBP: r.price_gbp,
        gradingCompany: r.grading_company || null,
        grade: r.grade || null,
        isVerified: r.is_verified ?? false,
        verifiedAt: r.verified_at || null,
        addedAt: r.added_at,
      }));
      res.json({ collection: items });
    } catch (error: any) {
      console.error("Collection update error:", error);
      res.status(500).json({ error: error.message || "Failed to update card" });
    }
  });

  app.delete("/api/collection/:id", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid or expired session" }); return; }

      const { id } = req.params;
      await db.execute(sql`DELETE FROM pokescan_collections WHERE id = ${id} AND user_id = ${user.id}`);

      const rows = await db.execute(
        sql`SELECT * FROM pokescan_collections WHERE user_id = ${user.id} ORDER BY added_at DESC`
      );
      const items = (rows.rows as any[]).map((r) => ({
        id: r.id,
        cardId: r.card_id,
        cardName: r.card_name,
        cardImage: r.card_image,
        setName: r.set_name,
        setId: r.set_id,
        rarity: r.rarity,
        quantity: r.quantity,
        condition: r.condition,
        variant: r.variant || "Non-Holo",
        priceGBP: r.price_gbp,
        gradingCompany: r.grading_company || null,
        grade: r.grade || null,
        isVerified: r.is_verified ?? false,
        verifiedAt: r.verified_at || null,
        addedAt: r.added_at,
      }));
      res.json({ collection: items });
    } catch (error: any) {
      console.error("Collection delete error:", error);
      res.status(500).json({ error: error.message || "Failed to remove card" });
    }
  });

  // ─── Card photo verification ──────────────────────────────────────────────
  app.post("/api/collection/:id/verify", express.json({ limit: "25mb" }), async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid session" }); return; }

      const { id } = req.params;
      const { frontImageBase64, backImageBase64 } = req.body;
      if (!frontImageBase64 || !backImageBase64) {
        res.status(400).json({ error: "Both frontImageBase64 and backImageBase64 are required" }); return;
      }

      const row = await db.execute(
        sql`SELECT card_name, set_name, card_id, card_image FROM pokescan_collections WHERE id = ${id} AND user_id = ${user.id}`
      );
      if (!row.rows.length) { res.status(404).json({ error: "Collection item not found" }); return; }
      const card = row.rows[0] as any;

      // Extract card number from card ID (e.g. "sv4-25" → "25")
      const cardNumber = card.card_id?.split("-").pop() || "";

      const prompt = `You are a Pokémon TCG card verification expert. A user claims this physical card is:
Card Name: ${card.card_name}
Set Name: ${card.set_name}
Card Number: ${cardNumber}

You have been given TWO photos: the first is the FRONT of the physical card, the second is the BACK.

Examine both images carefully and determine whether the physical card shown matches the claimed card.
Check: the card name printed on the card, the artwork/illustration, set symbol, collector number, and overall appearance.
The card back should show the standard Pokémon TCG card back design (red/blue Poké Ball pattern).

Return ONLY valid JSON with no markdown:
{"matches": true, "confidence": "high", "reason": "The card name, artwork and set symbol all match exactly."}

confidence must be "high", "medium", or "low".
matches must be true or false.`;

      const aiRes = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: frontImageBase64, detail: "high" } },
            { type: "image_url", image_url: { url: backImageBase64, detail: "low" } },
          ],
        }],
      });

      const raw = aiRes.choices[0]?.message?.content?.trim() || "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("AI returned invalid response");
      const parsed = JSON.parse(jsonMatch[0]);

      const verified = !!(parsed.matches && parsed.confidence !== "low");
      let verifiedPercent = 0;
      let badgeEarned = false;
      if (verified) {
        await db.execute(
          sql`UPDATE pokescan_collections SET is_verified = true, verified_at = NOW() WHERE id = ${id} AND user_id = ${user.id}`
        );
        // Auto-grant Verified Collector badge if 90%+ of collection is now verified
        const countRow = await db.execute(
          sql`SELECT COUNT(*) FILTER (WHERE is_verified = true) AS verified_count, COUNT(*) AS total_count FROM pokescan_collections WHERE user_id = ${user.id}`
        );
        const counts = countRow.rows[0] as any;
        const total = parseInt(counts.total_count) || 0;
        const verifiedCount = parseInt(counts.verified_count) || 0;
        verifiedPercent = total > 0 ? Math.round((verifiedCount / total) * 100) : 0;
        if (total > 0 && verifiedCount / total >= 0.9) {
          const alreadyBadged = await db.execute(sql`SELECT is_verified_collector FROM pokescan_users WHERE id = ${user.id}`);
          if (!(alreadyBadged.rows[0] as any)?.is_verified_collector) {
            await db.execute(sql`UPDATE pokescan_users SET is_verified_collector = true WHERE id = ${user.id}`);
            badgeEarned = true;
          }
        }
      }

      res.json({
        verified,
        confidence: parsed.confidence || "low",
        reason: parsed.reason || "Unable to determine.",
        verifiedPercent,
        badgeEarned,
      });
    } catch (err: any) {
      console.error("Card verify error:", err);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // ─── Top verified value collections ──────────────────────────────────────
  app.get("/api/collections/top-verified", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const me = await storage.validateSession(token);
      if (!me) { res.status(401).json({ error: "Invalid session" }); return; }

      const result = await db.execute(
        sql`SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_verified_collector,
                   COUNT(c.id) FILTER (WHERE c.is_verified = true)::int AS verified_count,
                   COUNT(c.id)::int AS total_count,
                   COALESCE(SUM(c.price_gbp * c.quantity) FILTER (WHERE c.is_verified = true), 0) AS verified_value
            FROM pokescan_users u
            JOIN pokescan_collections c ON c.user_id = u.id
            WHERE u.collection_visible = true
            GROUP BY u.id, u.username, u.display_name, u.avatar_url, u.is_verified_collector
            HAVING COUNT(c.id) FILTER (WHERE c.is_verified = true) > 0
            ORDER BY verified_value DESC
            LIMIT 10`
      );

      const top = (result.rows as any[]).map((r) => ({
        id: r.id,
        username: r.username,
        displayName: r.display_name,
        avatarUrl: r.avatar_url || null,
        isVerifiedCollector: r.is_verified_collector ?? false,
        verifiedCount: r.verified_count,
        totalCount: r.total_count,
        verifiedValue: parseFloat(r.verified_value) || 0,
        verifiedPercent: r.total_count > 0 ? Math.round((r.verified_count / r.total_count) * 100) : 0,
      }));
      res.json({ top });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch top verified" });
    }
  });

  // ─── Collection visibility toggle ─────────────────────────────────────────
  app.patch("/api/user/collection-visible", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid session" }); return; }
      const { visible } = req.body;
      const updated = await storage.updateUser(user.id, { collectionVisible: !!visible });
      res.json({ collectionVisible: updated?.collectionVisible ?? !!visible });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to update visibility" });
    }
  });

  // Alias for collection visibility following task API contract
  app.patch("/api/collection/privacy", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid session" }); return; }
      const { isPublic } = req.body;
      const updated = await storage.updateUser(user.id, { collectionVisible: !!isPublic });
      res.json({ isPublic: updated?.collectionVisible ?? !!isPublic });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to update privacy" });
    }
  });

  // ─── View a friend's public collection ────────────────────────────────────
  app.get("/api/collection/user/:userId", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const me = await storage.validateSession(token);
      if (!me) { res.status(401).json({ error: "Invalid session" }); return; }

      const { userId } = req.params;

      // Check the target user exists and has collection visible
      const target = await storage.getUserById(userId);
      if (!target) { res.status(404).json({ error: "User not found" }); return; }
      if (!target.collectionVisible) { res.status(403).json({ error: "This collection is private" }); return; }

      // Check they are friends (accepted friendship)
      const friendship = await db.execute(
        sql`SELECT id FROM pokescan_friendships WHERE status = 'accepted' AND (
          (requester_id = ${me.id} AND addressee_id = ${userId}) OR
          (requester_id = ${userId} AND addressee_id = ${me.id})
        )`
      );
      if (friendship.rows.length === 0 && me.id !== userId) {
        res.status(403).json({ error: "You are not friends with this user" }); return;
      }

      const rows = await db.execute(
        sql`SELECT * FROM pokescan_collections WHERE user_id = ${userId} ORDER BY added_at DESC`
      );
      const items = (rows.rows as any[]).map((r) => ({
        id: r.id,
        cardId: r.card_id,
        cardName: r.card_name,
        cardImage: r.card_image,
        setName: r.set_name,
        setId: r.set_id,
        rarity: r.rarity,
        quantity: r.quantity,
        condition: r.condition,
        variant: r.variant || "Non-Holo",
        priceGBP: r.price_gbp,
        gradingCompany: r.grading_company || null,
        grade: r.grade || null,
        isVerified: r.is_verified ?? false,
        verifiedAt: r.verified_at || null,
        addedAt: r.added_at,
      }));
      res.json({ collection: items, owner: { id: target.id, displayName: target.displayName, username: target.username, avatarUrl: target.avatarUrl, isVerifiedCollector: target.isVerifiedCollector ?? false } });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch collection" });
    }
  });

  // ─── Public Collections browse ────────────────────────────────────────────
  app.get("/api/collections/public", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const me = await storage.validateSession(token);
      if (!me) { res.status(401).json({ error: "Invalid session" }); return; }

      const search = (req.query.search as string || "").trim();
      const page = parseInt((req.query.page as string) || "1", 10);
      const pageSize = 20;
      const offset = (page - 1) * pageSize;

      const searchClause = search
        ? sql`AND (u.username ILIKE ${'%' + search + '%'} OR u.display_name ILIKE ${'%' + search + '%'})`
        : sql``;

      const result = await db.execute(
        sql`SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_verified_collector,
                   COUNT(c.id)::int AS card_count,
                   COALESCE(SUM(c.quantity), 0)::int AS total_quantity,
                   COALESCE(SUM(c.price_gbp * c.quantity), 0) AS total_value
            FROM pokescan_users u
            LEFT JOIN pokescan_collections c ON c.user_id = u.id
            WHERE u.collection_visible = true ${searchClause}
            GROUP BY u.id, u.username, u.display_name, u.avatar_url, u.is_verified_collector
            ORDER BY total_value DESC
            LIMIT ${pageSize} OFFSET ${offset}`
      );

      const collectors = (result.rows as any[]).map((r) => ({
        id: r.id,
        username: r.username,
        displayName: r.display_name,
        avatarUrl: r.avatar_url || null,
        isVerifiedCollector: r.is_verified_collector ?? false,
        cardCount: r.card_count,
        totalQuantity: r.total_quantity,
        totalValue: parseFloat(r.total_value) || 0,
      }));

      res.json({ collectors, page, hasMore: collectors.length === pageSize });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch public collections" });
    }
  });

  // ─── Public collection view (no friendship required) ───────────────────────
  app.get("/api/collections/public/:userId", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const me = await storage.validateSession(token);
      if (!me) { res.status(401).json({ error: "Invalid session" }); return; }

      const { userId } = req.params;
      const target = await storage.getUserById(userId);
      if (!target) { res.status(404).json({ error: "User not found" }); return; }
      if (!target.collectionVisible) { res.status(403).json({ error: "This collection is private" }); return; }

      const rows = await db.execute(
        sql`SELECT * FROM pokescan_collections WHERE user_id = ${userId} ORDER BY added_at DESC`
      );
      const items = (rows.rows as any[]).map((r) => ({
        id: r.id,
        cardId: r.card_id,
        cardName: r.card_name,
        cardImage: r.card_image,
        setName: r.set_name,
        setId: r.set_id,
        rarity: r.rarity,
        quantity: r.quantity,
        condition: r.condition,
        variant: r.variant || "Non-Holo",
        priceGBP: r.price_gbp,
        gradingCompany: r.grading_company || null,
        grade: r.grade || null,
        isVerified: r.is_verified ?? false,
        verifiedAt: r.verified_at || null,
        addedAt: r.added_at,
      }));
      res.json({
        collection: items,
        owner: {
          id: target.id,
          displayName: target.displayName,
          username: target.username,
          avatarUrl: target.avatarUrl,
          isVerifiedCollector: target.isVerifiedCollector ?? false,
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch collection" });
    }
  });

  // ─── Collector Verification ────────────────────────────────────────────────
  app.post("/api/collector-verification", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid session" }); return; }

      const { cardId, cardName, cardImage, frontPhoto, backPhoto } = req.body;
      if (!cardId || !cardName || !frontPhoto || !backPhoto) {
        res.status(400).json({ error: "cardId, cardName, frontPhoto and backPhoto are required" }); return;
      }

      // Verify the card belongs to this user's collection and is a graded entry
      const cardOwnership = await db.execute(
        sql`SELECT id, grading_company, grade FROM pokescan_collections
            WHERE user_id = ${user.id} AND card_id = ${cardId}
              AND grading_company IS NOT NULL AND grade IS NOT NULL
            LIMIT 1`
      );
      if (cardOwnership.rows.length === 0) {
        res.status(403).json({ error: "The selected card must be a professionally graded entry in your collection (add it with a grading company and grade first)" }); return;
      }

      // Check for existing pending application
      const existing = await db.execute(
        sql`SELECT id FROM pokescan_collector_verifications WHERE user_id = ${user.id} AND status = 'pending'`
      );
      if (existing.rows.length > 0) {
        res.status(409).json({ error: "You already have a pending verification application" }); return;
      }

      // Check if already verified
      const userRow = await db.execute(sql`SELECT is_verified_collector FROM pokescan_users WHERE id = ${user.id}`);
      if ((userRow.rows[0] as any)?.is_verified_collector) {
        res.status(409).json({ error: "You are already a Verified Collector" }); return;
      }

      await db.execute(
        sql`INSERT INTO pokescan_collector_verifications (user_id, card_id, card_name, card_image, front_photo, back_photo)
            VALUES (${user.id}, ${cardId}, ${cardName}, ${cardImage || ""}, ${frontPhoto}, ${backPhoto})`
      );
      res.json({ success: true, message: "Application submitted" });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to submit verification" });
    }
  });

  app.get("/api/collector-verification/status", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const user = await storage.validateSession(token);
      if (!user) { res.status(401).json({ error: "Invalid session" }); return; }

      const row = await db.execute(
        sql`SELECT id, status, created_at FROM pokescan_collector_verifications WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 1`
      );
      const app = row.rows[0] as any;
      res.json({
        isVerifiedCollector: user.isVerifiedCollector ?? false,
        application: app ? { id: app.id, status: app.status, createdAt: app.created_at } : null,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to get verification status" });
    }
  });

  app.get("/api/admin/collector-verifications", async (req: Request, res: Response) => {
    try {
      const adminToken = req.headers.authorization?.replace("Bearer ", "");
      const admin = adminToken ? await storage.validateSession(adminToken) : null;
      if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) { res.status(403).json({ error: "Forbidden" }); return; }

      const status = (req.query.status as string) || "pending";
      const result = await db.execute(
        sql`SELECT v.*, u.username, u.display_name, u.avatar_url
            FROM pokescan_collector_verifications v
            JOIN pokescan_users u ON u.id = v.user_id
            WHERE v.status = ${status}
            ORDER BY v.created_at DESC`
      );
      const verifications = (result.rows as any[]).map((r) => ({
        id: r.id,
        userId: r.user_id,
        username: r.username,
        displayName: r.display_name,
        avatarUrl: r.avatar_url || null,
        cardId: r.card_id,
        cardName: r.card_name,
        cardImage: r.card_image,
        frontPhoto: r.front_photo,
        backPhoto: r.back_photo,
        status: r.status,
        reviewedBy: r.reviewed_by || null,
        reviewedAt: r.reviewed_at || null,
        createdAt: r.created_at,
      }));
      res.json({ verifications });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to fetch verifications" });
    }
  });

  app.post("/api/admin/collector-verifications/:id/approve", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      const reviewer = token ? await storage.validateSession(token) : null;
      if (!reviewer || (reviewer.role !== "admin" && reviewer.role !== "moderator")) { res.status(403).json({ error: "Forbidden" }); return; }

      const { id } = req.params;
      const ver = await db.execute(sql`SELECT * FROM pokescan_collector_verifications WHERE id = ${id}`);
      if (!ver.rows.length) { res.status(404).json({ error: "Not found" }); return; }
      const v = ver.rows[0] as any;

      await db.execute(
        sql`UPDATE pokescan_collector_verifications SET status = 'approved', reviewed_by = ${reviewer?.id || null}, reviewed_at = NOW() WHERE id = ${id}`
      );
      await db.execute(
        sql`UPDATE pokescan_users SET is_verified_collector = true WHERE id = ${v.user_id}`
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to approve" });
    }
  });

  app.post("/api/admin/collector-verifications/:id/reject", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      const reviewer = token ? await storage.validateSession(token) : null;
      if (!reviewer || (reviewer.role !== "admin" && reviewer.role !== "moderator")) { res.status(403).json({ error: "Forbidden" }); return; }

      const { id } = req.params;
      await db.execute(
        sql`UPDATE pokescan_collector_verifications SET status = 'rejected', reviewed_by = ${reviewer?.id || null}, reviewed_at = NOW() WHERE id = ${id}`
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to reject" });
    }
  });

  app.get("/api/admin/subscription-stats", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const caller = await storage.validateSession(token);
      if (!caller) { res.status(401).json({ error: "Invalid session" }); return; }
      if (caller.role !== "admin") { res.status(403).json({ error: "Admin required" }); return; }

      const MONTHLY_PRICE = 4.99;
      const ANNUAL_PRICE = 49.99;
      const MONTHLY_ID = "price_1TM7D8K7N6BNdayAPnuINUuU";
      const ANNUAL_ID = "price_1TM7D8K7N6BNdayAB1PFakyH";

      const result = await db.execute(
        sql`SELECT id, username, display_name, stripe_price_id, subscription_status, subscription_period_end, created_at
            FROM pokescan_users
            WHERE is_premium = true AND subscription_status IS NOT NULL
            ORDER BY subscription_period_end DESC NULLS LAST`
      );

      const subscribers = (result.rows as any[]).map(r => {
        const plan = r.stripe_price_id === MONTHLY_ID ? "monthly" : r.stripe_price_id === ANNUAL_ID ? "annual" : "unknown";
        return {
          id: r.id,
          username: r.username,
          displayName: r.display_name,
          plan,
          price: plan === "monthly" ? MONTHLY_PRICE : plan === "annual" ? ANNUAL_PRICE : 0,
          status: r.subscription_status,
          periodEnd: r.subscription_period_end,
          createdAt: r.created_at,
        };
      });

      const now = new Date();
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(dayStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const yearStart = new Date(now.getFullYear(), 0, 1);

      let dailyRevenue = 0, weeklyRevenue = 0, monthlyRevenue = 0, yearlyRevenue = 0;
      let totalActive = 0, monthlyCount = 0, annualCount = 0;

      for (const s of subscribers) {
        if (s.status === "active" || s.status === "canceling") {
          totalActive++;
          if (s.plan === "monthly") monthlyCount++;
          else annualCount++;
        }

        if (s.periodEnd) {
          const pEnd = new Date(s.periodEnd);
          const periodStart = s.plan === "monthly"
            ? new Date(pEnd.getTime() - 30 * 24 * 60 * 60 * 1000)
            : new Date(pEnd.getTime() - 365 * 24 * 60 * 60 * 1000);

          if (periodStart >= dayStart) dailyRevenue += s.price;
          if (periodStart >= weekStart) weeklyRevenue += s.price;
          if (periodStart >= monthStart) monthlyRevenue += s.price;
          if (periodStart >= yearStart) yearlyRevenue += s.price;
        }
      }

      const monthlyRecurring = monthlyCount * MONTHLY_PRICE + annualCount * (ANNUAL_PRICE / 12);

      res.json({
        subscribers,
        stats: {
          totalActive,
          monthlyCount,
          annualCount,
          dailyRevenue,
          weeklyRevenue,
          monthlyRevenue,
          yearlyRevenue,
          monthlyRecurring: Math.round(monthlyRecurring * 100) / 100,
        },
      });
    } catch (error: any) {
      console.error("Subscription stats error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch stats" });
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
      if (!await isSuperadminAuthorized(req)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (!userId) {
        res.status(400).json({ error: "userId required" });
        return;
      }
      const callerToken = req.headers.authorization?.replace("Bearer ", "");
      const caller = callerToken ? await storage.validateSession(callerToken) : null;
      const callerId = caller?.id || "system";

      const before = await storage.getUserById(userId);
      if (!before) { res.status(404).json({ error: "User not found" }); return; }

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

      // If admin revokes premium manually, also cancel Stripe sub
      if (isPremium === false && before.isPremium) {
        await cancelStripeForUser(userId, true);
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

      // Audit log
      const changes: string[] = [];
      if (displayName !== undefined && displayName !== before.displayName) changes.push(`name: "${before.displayName}" → "${displayName}"`);
      if (email !== undefined && email.toLowerCase() !== before.email) changes.push(`email: "${before.email}" → "${email.toLowerCase()}"`);
      if (mobileNumber !== undefined && mobileNumber !== before.mobileNumber) changes.push(`mobile changed`);
      if (password) changes.push("password reset");
      if (isPremium !== undefined && isPremium !== before.isPremium) {
        await logModAction({
          action: isPremium ? "premium_granted" : "premium_revoked",
          performedBy: callerId,
          targetUserId: userId,
          targetUsername: before.username,
          note: isPremium ? "Premium granted by admin" : "Premium revoked by admin (Stripe cancelled)",
        });
      }
      if (role !== undefined && role !== before.role) {
        await logModAction({
          action: "role_changed",
          performedBy: callerId,
          targetUserId: userId,
          targetUsername: before.username,
          note: `${before.role} → ${role}`,
        });
      }
      if (changes.length > 0) {
        await logModAction({
          action: "user_edited",
          performedBy: callerId,
          targetUserId: userId,
          targetUsername: before.username,
          note: changes.join("; "),
        });
      }

      const { passwordHash: _ph, ...safeUser } = updated as any;
      res.json({ user: safeUser });
    } catch (error: any) {
      console.error("Admin edit-user error:", error);
      res.status(500).json({ error: error.message || "Update failed" });
    }
  });

  // ---------------------------------------------------------------------
  // Superadmin auth — OTP via email
  // Legacy OTP-based admin login is removed. The admin/superadmin now logs in
  // via the regular email+password flow (POST /api/auth/login). Stubs below
  // return a clear error so older APKs prompt the user to update.
  app.post("/api/admin/request-otp", (_req: Request, res: Response) => {
    res.status(410).json({ error: "Admin code login has been removed. Please update the app and use the email + password login." });
  });
  app.post("/api/admin/verify-otp", (_req: Request, res: Response) => {
    res.status(410).json({ error: "Admin code login has been removed. Please update the app and use the email + password login." });
  });

  // Validate a stored superadmin token (used by client to check if it's still good).
  app.get("/api/admin/validate-token", async (req: Request, res: Response) => {
    res.json({ valid: await isSuperadminAuthorized(req) });
  });

  // Legacy endpoint kept as a stub so older APKs get a clear error.
  app.post("/api/admin/superadmin-login", (_req: Request, res: Response) => {
    res.status(410).json({
      error: "This sign-in method has been disabled. Please update the app and use the email code login.",
    });
  });

  app.post("/api/admin/create-user", async (req: Request, res: Response) => {
    try {
      const { superadminPassword, username, displayName, email, mobileNumber, password, isPremium, role } = req.body;
      if (!await isSuperadminAuthorized(req)) {
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
      if (!await isSuperadminAuthorized(req)) {
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
      if (!await isSuperadminAuthorized(req)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (!userId) {
        res.status(400).json({ error: "userId required" });
        return;
      }
      const callerToken = req.headers.authorization?.replace("Bearer ", "");
      const caller = callerToken ? await storage.validateSession(callerToken) : null;
      const callerId = caller?.id || "system";

      const before = await storage.getUserById(userId);
      if (!before) { res.status(404).json({ error: "User not found" }); return; }

      // Cancel any active Stripe subscription immediately
      await cancelStripeForUser(userId, true);

      // Add email + mobile to blocklist so they can't claim a new trial
      await addBlockedCredential(before.email || null, before.mobileNumber || null, "deleted", callerId);

      // Delete user's sessions first, then the user
      await db.delete(pokescanSessions).where(eq(pokescanSessions.userId, userId));
      const deleted = await db.delete(pokescanUsers).where(eq(pokescanUsers.id, userId)).returning();
      if (!deleted.length) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      await logModAction({
        action: "user_deleted",
        performedBy: callerId,
        targetUserId: userId,
        targetUsername: before.username,
        note: `Deleted @${before.username} (${before.email}); Stripe sub cancelled; email+mobile added to trial blocklist`,
      });
      res.json({ success: true, userId });
    } catch (error: any) {
      console.error("Admin delete-user error:", error);
      res.status(500).json({ error: error.message || "Delete failed" });
    }
  });

  // ─── Ban / unban / mute (account-level) ─────────────────────────────────────
  app.post("/api/admin/users/:id/ban", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const caller = await storage.validateSession(token);
      if (!caller) { res.status(401).json({ error: "Invalid session" }); return; }
      if (caller.role !== "admin" && caller.role !== "moderator") {
        res.status(403).json({ error: "Staff only" }); return;
      }
      const { id } = req.params;
      const { reason, durationHours, banChat } = req.body || {};
      const target = await storage.getUserById(id);
      if (!target) { res.status(404).json({ error: "User not found" }); return; }
      if (target.role === "admin" || target.role === "moderator") {
        res.status(403).json({ error: "Cannot ban staff members" }); return;
      }
      const permanent = durationHours == null || durationHours <= 0;
      const bannedUntil = permanent
        ? new Date("9999-12-31T23:59:59Z")
        : new Date(Date.now() + Number(durationHours) * 3600 * 1000);
      const banReason = (reason && String(reason).trim()) || "Violation of community guidelines";

      await pool.query(
        `UPDATE pokescan_users SET banned_until = $1, ban_reason = $2, banned_at = NOW(), banned_by = $3 ${banChat ? `, chat_banned_until = $1` : ""} WHERE id = $4`,
        [bannedUntil, banReason, caller.id, id]
      );

      // Auto-cancel any active Stripe subscription on ban
      if (target.isPremium) await cancelStripeForUser(id, true);

      // Revoke all sessions so they can't continue using the app
      await db.delete(pokescanSessions).where(eq(pokescanSessions.userId, id));

      await logModAction({
        action: "user_banned",
        performedBy: caller.id,
        targetUserId: id,
        targetUsername: target.username,
        note: `${permanent ? "Permanent" : `${durationHours}h`} ban — Reason: ${banReason}${target.isPremium ? "; Stripe sub cancelled" : ""}`,
      });

      res.json({ success: true, bannedUntil: bannedUntil.toISOString(), permanent, banReason });
    } catch (error: any) {
      console.error("Ban error:", error);
      res.status(500).json({ error: error.message || "Ban failed" });
    }
  });

  app.post("/api/admin/users/:id/unban", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const caller = await storage.validateSession(token);
      if (!caller) { res.status(401).json({ error: "Invalid session" }); return; }
      if (caller.role !== "admin" && caller.role !== "moderator") {
        res.status(403).json({ error: "Staff only" }); return;
      }
      const { id } = req.params;
      const target = await storage.getUserById(id);
      if (!target) { res.status(404).json({ error: "User not found" }); return; }
      await pool.query(
        `UPDATE pokescan_users SET banned_until = NULL, ban_reason = NULL, banned_at = NULL, banned_by = NULL, chat_banned_until = NULL WHERE id = $1`,
        [id]
      );
      await logModAction({
        action: "user_unbanned",
        performedBy: caller.id,
        targetUserId: id,
        targetUsername: target.username,
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Unban error:", error);
      res.status(500).json({ error: error.message || "Unban failed" });
    }
  });

  app.post("/api/admin/users/:id/mute", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const caller = await storage.validateSession(token);
      if (!caller) { res.status(401).json({ error: "Invalid session" }); return; }
      if (caller.role !== "admin" && caller.role !== "moderator") {
        res.status(403).json({ error: "Staff only" }); return;
      }
      const { id } = req.params;
      const { minutes } = req.body || {};
      const target = await storage.getUserById(id);
      if (!target) { res.status(404).json({ error: "User not found" }); return; }
      if (target.role === "admin" || target.role === "moderator") {
        res.status(403).json({ error: "Cannot mute staff" }); return;
      }
      const mins = Number(minutes);
      if (!mins || mins < 1) { res.status(400).json({ error: "minutes (positive) required" }); return; }
      const mutedUntil = new Date(Date.now() + mins * 60 * 1000);
      await pool.query(`UPDATE pokescan_users SET chat_muted_until = $1 WHERE id = $2`, [mutedUntil, id]);
      await logModAction({
        action: "user_muted",
        performedBy: caller.id,
        targetUserId: id,
        targetUsername: target.username,
        note: `Muted for ${mins} minutes (until ${mutedUntil.toISOString()})`,
      });
      res.json({ success: true, mutedUntil: mutedUntil.toISOString() });
    } catch (error: any) {
      console.error("Mute error:", error);
      res.status(500).json({ error: error.message || "Mute failed" });
    }
  });

  app.post("/api/admin/users/:id/unmute", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const caller = await storage.validateSession(token);
      if (!caller) { res.status(401).json({ error: "Invalid session" }); return; }
      if (caller.role !== "admin" && caller.role !== "moderator") {
        res.status(403).json({ error: "Staff only" }); return;
      }
      const { id } = req.params;
      const target = await storage.getUserById(id);
      if (!target) { res.status(404).json({ error: "User not found" }); return; }
      await pool.query(`UPDATE pokescan_users SET chat_muted_until = NULL WHERE id = $1`, [id]);
      await logModAction({
        action: "user_unmuted",
        performedBy: caller.id,
        targetUserId: id,
        targetUsername: target.username,
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Unmute error:", error);
      res.status(500).json({ error: error.message || "Unmute failed" });
    }
  });

  // ─── Bulk listing moderation ────────────────────────────────────────────────
  app.post("/api/admin/listings/bulk", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const caller = await storage.validateSession(token);
      if (!caller) { res.status(401).json({ error: "Invalid session" }); return; }
      if (caller.role !== "admin" && caller.role !== "moderator") {
        res.status(403).json({ error: "Staff only" }); return;
      }
      const { ids, action, reviewNote } = req.body || {};
      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ error: "ids array required" }); return;
      }
      if (action !== "approve" && action !== "reject" && action !== "delete") {
        res.status(400).json({ error: "action must be approve|reject|delete" }); return;
      }
      let updated = 0;
      if (action === "delete") {
        const r = await pool.query(
          `DELETE FROM pokescan_market_listings WHERE id = ANY($1::text[]) RETURNING id, card_name`,
          [ids]
        );
        updated = r.rowCount || 0;
        for (const row of r.rows) {
          await logModAction({
            action: "listing_deleted_bulk",
            performedBy: caller.id,
            listingId: row.id,
            listingName: row.card_name,
            note: reviewNote || null,
          });
        }
      } else {
        const status = action === "approve" ? "approved" : "rejected";
        const r = await pool.query(
          `UPDATE pokescan_market_listings
              SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_note = COALESCE($3, review_note)
            WHERE id = ANY($4::text[])
          RETURNING id, card_name`,
          [status, caller.id, reviewNote ?? null, ids]
        );
        updated = r.rowCount || 0;
        for (const row of r.rows) {
          await logModAction({
            action: `bulk_${status}`,
            performedBy: caller.id,
            listingId: row.id,
            listingName: row.card_name,
            note: reviewNote || null,
          });
        }
      }
      res.json({ success: true, updated, requested: ids.length });
    } catch (error: any) {
      console.error("Bulk listings error:", error);
      res.status(500).json({ error: error.message || "Bulk action failed" });
    }
  });

  // ─── Staff: view chatroom and private DMs ───────────────────────────────────
  app.get("/api/admin/chatroom", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const caller = await storage.validateSession(token);
      if (!caller) { res.status(401).json({ error: "Invalid session" }); return; }
      if (caller.role !== "admin" && caller.role !== "moderator") {
        res.status(403).json({ error: "Staff only" }); return;
      }
      const limit = Math.min(500, Math.max(1, parseInt((req.query.limit as string) || "200", 10)));
      const msgs = await db.select().from(pokescanChatroomMessages)
        .orderBy(desc(pokescanChatroomMessages.createdAt))
        .limit(limit);
      res.json({ messages: msgs.reverse() });
    } catch (error: any) {
      console.error("Admin chatroom view error:", error);
      res.status(500).json({ error: error.message || "Failed to load chatroom" });
    }
  });

  app.get("/api/admin/messages", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const caller = await storage.validateSession(token);
      if (!caller) { res.status(401).json({ error: "Invalid session" }); return; }
      if (caller.role !== "admin" && caller.role !== "moderator") {
        res.status(403).json({ error: "Staff only" }); return;
      }
      const userA = (req.query.userA as string || "").trim();
      const userB = (req.query.userB as string || "").trim();
      if (!userA) {
        // List recent DM threads involving any user
        const r = await pool.query(
          `SELECT m.*, su.username AS sender_username, su.display_name AS sender_display_name,
                  ru.username AS recipient_username, ru.display_name AS recipient_display_name
             FROM pokescan_messages m
             LEFT JOIN pokescan_users su ON su.id = m.sender_id
             LEFT JOIN pokescan_users ru ON ru.id = m.recipient_id
            ORDER BY m.created_at DESC
            LIMIT 200`
        );
        res.json({ messages: r.rows });
        return;
      }
      let q;
      if (userB) {
        q = await pool.query(
          `SELECT m.*, su.username AS sender_username, su.display_name AS sender_display_name,
                  ru.username AS recipient_username, ru.display_name AS recipient_display_name
             FROM pokescan_messages m
             LEFT JOIN pokescan_users su ON su.id = m.sender_id
             LEFT JOIN pokescan_users ru ON ru.id = m.recipient_id
            WHERE (m.sender_id = $1 AND m.recipient_id = $2)
               OR (m.sender_id = $2 AND m.recipient_id = $1)
            ORDER BY m.created_at ASC
            LIMIT 500`,
          [userA, userB]
        );
      } else {
        q = await pool.query(
          `SELECT m.*, su.username AS sender_username, su.display_name AS sender_display_name,
                  ru.username AS recipient_username, ru.display_name AS recipient_display_name
             FROM pokescan_messages m
             LEFT JOIN pokescan_users su ON su.id = m.sender_id
             LEFT JOIN pokescan_users ru ON ru.id = m.recipient_id
            WHERE m.sender_id = $1 OR m.recipient_id = $1
            ORDER BY m.created_at DESC
            LIMIT 500`,
          [userA]
        );
      }
      res.json({ messages: q.rows });
    } catch (error: any) {
      console.error("Admin messages view error:", error);
      res.status(500).json({ error: error.message || "Failed to load messages" });
    }
  });

  // ─── Blocked credentials list (superadmin) ──────────────────────────────────
  app.get("/api/admin/blocked-credentials", async (req: Request, res: Response) => {
    try {
      if (!await isSuperadminAuthorized(req)) { res.status(403).json({ error: "Forbidden" }); return; }
      const r = await pool.query(
        `SELECT * FROM pokescan_blocked_credentials ORDER BY created_at DESC LIMIT 500`
      );
      res.json({ blocked: r.rows });
    } catch (error: any) {
      console.error("Blocked creds list error:", error);
      res.status(500).json({ error: error.message || "Failed to load" });
    }
  });

  app.delete("/api/admin/blocked-credentials/:id", async (req: Request, res: Response) => {
    try {
      if (!await isSuperadminAuthorized(req)) { res.status(403).json({ error: "Forbidden" }); return; }
      await pool.query(`DELETE FROM pokescan_blocked_credentials WHERE id = $1`, [req.params.id]);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Blocked creds delete error:", error);
      res.status(500).json({ error: error.message || "Failed to remove" });
    }
  });

  // ─── Scrydex Sync ────────────────────────────────────────────────────────────
  // POST /api/admin/scrydex-sync  — triggers scrydex.com data sync (superadmin only).
  // Uses Server-Sent Events so the client can stream progress in real time.
  // The sync is NOT triggered automatically — only when this endpoint is called.
  app.post("/api/admin/scrydex-sync", async (req: Request, res: Response) => {
    try {
      const { superadminPassword } = req.body;
      if (!await isSuperadminAuthorized(req)) {
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
      if (!await isSuperadminAuthorized(req)) {
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

      send({ phase: "seeding-cards", message: "Seeding KO/ZH cards from JP sources…" });
      const { seedKoZhCards } = await import("./ko-zh-seed");
      const koZhResult = await seedKoZhCards((msg: string) => {
        send({ phase: "progress", message: msg });
      });
      send({ phase: "progress", message: `KO/ZH cards: ${koZhResult.inserted} inserted, ${koZhResult.skipped} skipped` });

      send({ phase: "done", ...result, koZhInserted: koZhResult.inserted, koZhSkipped: koZhResult.skipped, done: true });
      res.end();
    } catch (error: any) {
      console.error("Asian set sync error:", error);
      try {
        res.write(`data: ${JSON.stringify({ phase: "error", message: error.message || "Sync failed", done: true })}\n\n`);
        res.end();
      } catch {}
    }
  });

  app.get("/api/admin/sets", async (req: Request, res: Response) => {
    try {
      const pw = req.query.superadminPassword as string;
      if (!await isSuperadminAuthorized(req)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const allSets = await db
        .select({
          id: pokemonSets.id,
          name: pokemonSets.name,
          series: pokemonSets.series,
          hidden: pokemonSets.hidden,
          releaseDate: pokemonSets.releaseDate,
          cardCount: sql<number>`count(${pokemonCards.id})::int`,
        })
        .from(pokemonSets)
        .leftJoin(pokemonCards, and(eq(pokemonCards.setId, pokemonSets.id), isNull(pokemonCards.deletedAt)))
        .where(isNull(pokemonSets.deletedAt))
        .groupBy(pokemonSets.id, pokemonSets.name, pokemonSets.series, pokemonSets.hidden, pokemonSets.releaseDate)
        .orderBy(desc(pokemonSets.releaseDate));

      res.json({
        sets: allSets.map((s) => ({
          ...s,
          hidden: s.hidden ?? false,
          language: detectSetLanguage(s.id),
        })),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to list sets" });
    }
  });

  app.patch("/api/admin/sets/visibility", async (req: Request, res: Response) => {
    try {
      const { superadminPassword, setIds, hidden } = req.body;
      if (!await isSuperadminAuthorized(req)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (!Array.isArray(setIds) || setIds.length === 0) {
        res.status(400).json({ error: "setIds is required" });
        return;
      }
      for (const id of setIds) {
        await db.update(pokemonSets).set({ hidden: !!hidden }).where(eq(pokemonSets.id, id));
      }
      res.json({ updated: setIds.length, hidden: !!hidden });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to update visibility" });
    }
  });

  // GET /api/admin/scrydex-preview — dry-run: returns what would be added
  // without writing anything to the database.
  app.get("/api/admin/scrydex-preview", async (req: Request, res: Response) => {
    try {
      const pw = req.query.superadminPassword as string;
      if (!await isSuperadminAuthorized(req)) {
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
      const existingRows = await db
        .select({ id: pokemonSets.id, card_count: sql<string>`COUNT(${pokemonCards.id})` })
        .from(pokemonSets)
        .leftJoin(pokemonCards, eq(pokemonCards.setId, pokemonSets.id))
        .groupBy(pokemonSets.id);
      const existingIds   = new Set(existingRows.map((r) => r.id));
      const setsWithCards = new Set(
        existingRows.filter((r) => parseInt(r.card_count, 10) > 0).map((r) => r.id)
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
      if (!await isSuperadminAuthorized(req)) {
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
    const friendFields = { id: pokescanUsers.id, username: pokescanUsers.username, displayName: pokescanUsers.displayName, avatarUrl: pokescanUsers.avatarUrl, isPremium: pokescanUsers.isPremium, collectionVisible: pokescanUsers.collectionVisible };
    const friends = friendIds.size > 0
      ? await db.select(friendFields)
          .from(pokescanUsers).where(or(...[...friendIds].map(id => eq(pokescanUsers.id, id))))
      : [];
    const pendingReceived = rows.filter(r => r.addresseeId === me.id && r.status === "pending");
    const pendingSent = rows.filter(r => r.requesterId === me.id && r.status === "pending");
    const pendingUsers = pendingReceived.length > 0
      ? await db.select(friendFields)
          .from(pokescanUsers).where(or(...pendingReceived.map(r => eq(pokescanUsers.id, r.requesterId))))
      : [];
    const sentUsers = pendingSent.length > 0
      ? await db.select(friendFields)
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

  // ─── Support ─────────────────────────────────────────────────────────────────
  app.get("/api/support/admin", async (_req: Request, res: Response) => {
    try {
      const admins = await db
        .select({ id: pokescanUsers.id, displayName: pokescanUsers.displayName, username: pokescanUsers.username })
        .from(pokescanUsers)
        .where(eq(pokescanUsers.role, "admin"))
        .limit(1);
      if (admins.length === 0) {
        res.json({ admin: null });
        return;
      }
      res.json({ admin: admins[0] });
    } catch (err) {
      res.status(500).json({ error: "Failed to find support contact" });
    }
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
    let isAuthorized = await isSuperadminAuthorized(req);
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
    let isAuthorized = await isSuperadminAuthorized(req);
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
    if (!await isSuperadminAuthorized(req)) {
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

  app.post("/api/grade", express.json({ limit: "25mb" }), async (req: Request, res: Response) => {
    try {
      const { centering, cornerDamage, edgeDamage, surfaceDamage, frontImageBase64, backImageBase64, imageBase64 } = req.body;

      const frontImg = frontImageBase64 || imageBase64;

      if (frontImg) {
        const prompt = `You are an expert Pokémon TCG card grader with experience equivalent to PSA/BGS professional grading. You have been given ${backImageBase64 ? "TWO images: the FRONT of the card followed by the BACK of the card" : "ONE image: the FRONT of the card"}. Analyse both surfaces thoroughly.

Score each criterion 0–5 (0 = perfect, 5 = severe damage):
- centering: how off-centre the print is on the card stock
- cornerDamage: wear, fraying, bending on any corner
- edgeDamage: nicks, chips, roughness on any edge
- surfaceDamage: scratches, print lines, scuffs, stains on front or back

Also provide:
- centeringRatios: estimate the border-space percentages for each side. topPct + bottomPct = 100, leftPct + rightPct = 100. Perfect centering = 50/50.
- findings: one detailed sentence per criterion describing exactly what you see, including which specific corners/edges/areas are affected and the severity.
- gradingComments: a 2–3 sentence professional assessment of the overall card quality, likely PSA/BGS grade range, and what the main deductions are.
- overallNotes: one concise sentence summary.

Return ONLY valid JSON in exactly this format with no markdown:
{
  "centering": 0,
  "cornerDamage": 0,
  "edgeDamage": 0,
  "surfaceDamage": 0,
  "centeringRatios": { "topPct": 50, "bottomPct": 50, "leftPct": 50, "rightPct": 50 },
  "findings": {
    "centering": "detailed centering observation",
    "corners": "detailed corner observation",
    "edges": "detailed edge observation",
    "frontSurface": "detailed front surface observation",
    "backSurface": "detailed back surface observation or N/A if only front provided"
  },
  "gradingComments": "professional 2-3 sentence overall assessment with likely grade range",
  "overallNotes": "one sentence summary"
}`;

        const imageContent: any[] = [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: frontImg, detail: "high" } },
        ];
        if (backImageBase64) {
          imageContent.push({ type: "image_url", image_url: { url: backImageBase64, detail: "high" } });
        }

        const aiRes = await openai.chat.completions.create({
          model: "gpt-4o",
          max_tokens: 800,
          messages: [{ role: "user", content: imageContent }],
        });

        const raw = aiRes.choices[0]?.message?.content?.trim() || "";
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("AI returned invalid response");
        const parsed = JSON.parse(jsonMatch[0]);

        const result = calculateGrade({
          centering:    Math.max(0, Math.min(5, parsed.centering    ?? 0)),
          cornerDamage: Math.max(0, Math.min(5, parsed.cornerDamage ?? 0)),
          edgeDamage:   Math.max(0, Math.min(5, parsed.edgeDamage   ?? 0)),
          surfaceDamage: Math.max(0, Math.min(5, parsed.surfaceDamage ?? 0)),
        });

        const cr = parsed.centeringRatios;
        const centeringRatios = cr ? {
          topPct:    Math.round(Math.max(1, Math.min(99, cr.topPct    ?? 50))),
          bottomPct: Math.round(Math.max(1, Math.min(99, cr.bottomPct ?? 50))),
          leftPct:   Math.round(Math.max(1, Math.min(99, cr.leftPct   ?? 50))),
          rightPct:  Math.round(Math.max(1, Math.min(99, cr.rightPct  ?? 50))),
        } : null;

        return res.json({
          ...result,
          aiAssessed: true,
          aiNotes: parsed.overallNotes ?? null,
          centeringRatios,
          findings: parsed.findings ?? null,
          gradingComments: parsed.gradingComments ?? null,
        });
      }

      // Manual mode
      const result = calculateGrade({ centering, cornerDamage, edgeDamage, surfaceDamage });
      res.json(result);
    } catch (err) {
      console.error("Grading error:", err);
      res.status(500).json({ error: "Grading failed" });
    }
  });

  cleanupOldChatroomMessages();
  setInterval(cleanupOldChatroomMessages, 60 * 60 * 1000);

  const isStaffRole = (role: string) => role === "admin" || role === "moderator";

  app.get("/api/chatroom/messages", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const caller = await storage.validateSession(token);
      if (!caller) { res.status(401).json({ error: "Invalid session" }); return; }
      if (!caller.isPremium && !isStaffRole(caller.role)) {
        res.status(403).json({ error: "Premium membership required" });
        return;
      }

      if (caller.chatBannedUntil && new Date(caller.chatBannedUntil) > new Date()) {
        res.status(403).json({ error: "You are banned from the chat", bannedUntil: caller.chatBannedUntil });
        return;
      }

      const msgs = await db.select().from(pokescanChatroomMessages)
        .orderBy(desc(pokescanChatroomMessages.createdAt))
        .limit(200);

      res.json({ messages: msgs.reverse() });
    } catch (error: any) {
      console.error("Chatroom get error:", error);
      res.status(500).json({ error: error.message || "Failed to load chatroom" });
    }
  });

  app.post("/api/chatroom/messages", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const caller = await storage.validateSession(token);
      if (!caller) { res.status(401).json({ error: "Invalid session" }); return; }
      if (!caller.isPremium && !isStaffRole(caller.role)) {
        res.status(403).json({ error: "Premium membership required" });
        return;
      }

      if (caller.chatBannedUntil && new Date(caller.chatBannedUntil) > new Date()) {
        res.status(403).json({ error: "You are banned from the chat", bannedUntil: caller.chatBannedUntil });
        return;
      }

      if (caller.chatMutedUntil && new Date(caller.chatMutedUntil) > new Date()) {
        res.status(403).json({ error: "You are muted", mutedUntil: caller.chatMutedUntil });
        return;
      }

      const { body } = req.body;
      if (!body || typeof body !== "string" || !body.trim()) {
        res.status(400).json({ error: "Message body is required" });
        return;
      }

      const trimmed = body.trim().substring(0, 2000);

      const [msg] = await db.insert(pokescanChatroomMessages).values({
        senderId: caller.id,
        senderUsername: caller.username,
        senderDisplayName: caller.displayName || caller.username,
        senderAvatarUrl: caller.avatarUrl || null,
        body: trimmed,
      }).returning();

      res.json({ message: msg });
    } catch (error: any) {
      console.error("Chatroom send error:", error);
      res.status(500).json({ error: error.message || "Failed to send message" });
    }
  });

  app.delete("/api/chatroom/messages/:id", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const caller = await storage.validateSession(token);
      if (!caller) { res.status(401).json({ error: "Invalid session" }); return; }
      if (!caller.isPremium && !isStaffRole(caller.role)) {
        res.status(403).json({ error: "Premium membership required" });
        return;
      }

      if (caller.chatBannedUntil && new Date(caller.chatBannedUntil) > new Date() && !isStaffRole(caller.role)) {
        res.status(403).json({ error: "You are banned from the chat", bannedUntil: caller.chatBannedUntil });
        return;
      }

      const msgId = req.params.id;
      const [existing] = await db.select().from(pokescanChatroomMessages).where(eq(pokescanChatroomMessages.id, msgId));
      if (!existing) { res.status(404).json({ error: "Message not found" }); return; }

      if (existing.senderId !== caller.id && !isStaffRole(caller.role)) {
        res.status(403).json({ error: "Not allowed" });
        return;
      }

      await db.delete(pokescanChatroomMessages).where(eq(pokescanChatroomMessages.id, msgId));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Chatroom delete error:", error);
      res.status(500).json({ error: error.message || "Failed to delete message" });
    }
  });

  app.post("/api/chatroom/mute", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const caller = await storage.validateSession(token);
      if (!caller) { res.status(401).json({ error: "Invalid session" }); return; }
      if (!isStaffRole(caller.role)) { res.status(403).json({ error: "Staff only" }); return; }

      const { userId, minutes } = req.body;
      if (!userId || !minutes || typeof minutes !== "number" || minutes < 1) {
        res.status(400).json({ error: "userId and minutes (positive number) required" });
        return;
      }

      const target = await storage.getUserById(userId);
      if (!target) { res.status(404).json({ error: "User not found" }); return; }
      if (isStaffRole(target.role)) { res.status(403).json({ error: "Cannot mute staff members" }); return; }

      const mutedUntil = new Date(Date.now() + minutes * 60 * 1000);
      await pool.query("UPDATE pokescan_users SET chat_muted_until = $1 WHERE id = $2", [mutedUntil, userId]);
      res.json({ success: true, mutedUntil: mutedUntil.toISOString() });
    } catch (error: any) {
      console.error("Mute error:", error);
      res.status(500).json({ error: error.message || "Failed to mute user" });
    }
  });

  app.post("/api/chatroom/unmute", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const caller = await storage.validateSession(token);
      if (!caller) { res.status(401).json({ error: "Invalid session" }); return; }
      if (!isStaffRole(caller.role)) { res.status(403).json({ error: "Staff only" }); return; }

      const { userId } = req.body;
      if (!userId) { res.status(400).json({ error: "userId required" }); return; }

      await pool.query("UPDATE pokescan_users SET chat_muted_until = NULL WHERE id = $1", [userId]);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Unmute error:", error);
      res.status(500).json({ error: error.message || "Failed to unmute user" });
    }
  });

  app.post("/api/chatroom/ban", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const caller = await storage.validateSession(token);
      if (!caller) { res.status(401).json({ error: "Invalid session" }); return; }
      if (!isStaffRole(caller.role)) { res.status(403).json({ error: "Staff only" }); return; }

      const { userId, minutes } = req.body;
      if (!userId || !minutes || typeof minutes !== "number" || minutes < 1) {
        res.status(400).json({ error: "userId and minutes (positive number) required" });
        return;
      }

      const target = await storage.getUserById(userId);
      if (!target) { res.status(404).json({ error: "User not found" }); return; }
      if (isStaffRole(target.role)) { res.status(403).json({ error: "Cannot ban staff members" }); return; }

      const bannedUntil = new Date(Date.now() + minutes * 60 * 1000);
      await pool.query("UPDATE pokescan_users SET chat_banned_until = $1 WHERE id = $2", [bannedUntil, userId]);
      res.json({ success: true, bannedUntil: bannedUntil.toISOString() });
    } catch (error: any) {
      console.error("Ban error:", error);
      res.status(500).json({ error: error.message || "Failed to ban user" });
    }
  });

  app.post("/api/chatroom/unban", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
      const caller = await storage.validateSession(token);
      if (!caller) { res.status(401).json({ error: "Invalid session" }); return; }
      if (!isStaffRole(caller.role)) { res.status(403).json({ error: "Staff only" }); return; }

      const { userId } = req.body;
      if (!userId) { res.status(400).json({ error: "userId required" }); return; }

      await pool.query("UPDATE pokescan_users SET chat_banned_until = NULL WHERE id = $1", [userId]);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Unban error:", error);
      res.status(500).json({ error: error.message || "Failed to unban user" });
    }
  });

  // ─── Admin DB Editor ─────────────────────────────────────────────────────────

  app.get("/api/admin/db/cards", async (req: Request, res: Response) => {
    if (!await isSuperadminSessionOnly(req)) { res.status(403).json({ error: "Forbidden" }); return; }
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || "50", 10)));
    const search = (req.query.search as string || "").trim();
    const setIdFilter = (req.query.setId as string || "").trim();
    const trash = (req.query.trash as string) === "1";
    const offset = (page - 1) * pageSize;
    const deletedFilter = trash ? isNotNull(pokemonCards.deletedAt) : isNull(pokemonCards.deletedAt);
    let condition;
    if (search && setIdFilter) {
      condition = and(
        deletedFilter,
        or(ilike(pokemonCards.name, `%${search}%`), ilike(pokemonCards.id, `%${search}%`)),
        eq(pokemonCards.setId, setIdFilter)
      );
    } else if (search) {
      condition = and(deletedFilter, or(ilike(pokemonCards.name, `%${search}%`), ilike(pokemonCards.id, `%${search}%`)));
    } else if (setIdFilter) {
      condition = and(deletedFilter, eq(pokemonCards.setId, setIdFilter));
    } else {
      condition = deletedFilter;
    }
    const [countResult, rows] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(pokemonCards).where(condition),
      db.select({
        id: pokemonCards.id,
        setId: pokemonCards.setId,
        setName: pokemonSets.name,
        name: pokemonCards.name,
        number: pokemonCards.number,
        rarity: pokemonCards.rarity,
        supertype: pokemonCards.supertype,
        subtypes: pokemonCards.subtypes,
        imageSmall: pokemonCards.imageSmall,
        imageLarge: pokemonCards.imageLarge,
        artist: pokemonCards.artist,
        hp: pokemonCards.hp,
        nationalPokedexNumbers: pokemonCards.nationalPokedexNumbers,
        description: pokemonCards.description,
        deletedAt: pokemonCards.deletedAt,
      }).from(pokemonCards)
        .leftJoin(pokemonSets, eq(pokemonCards.setId, pokemonSets.id))
        .where(condition).orderBy(pokemonCards.number).limit(pageSize).offset(offset),
    ]);
    res.json({ cards: rows, total: countResult[0]?.count ?? 0, page, pageSize });
  });

  app.patch("/api/admin/db/cards/:id", async (req: Request, res: Response) => {
    if (!await isSuperadminSessionOnly(req)) { res.status(403).json({ error: "Forbidden" }); return; }
    const { id } = req.params;
    const { name, number, rarity, imageSmall, imageLarge, artist, hp, supertype, subtypes, description } = req.body;
    const updates: Record<string, any> = {};
    if (typeof name === "string") { if (!name.trim()) { res.status(400).json({ error: "Card name cannot be empty" }); return; } updates.name = name.trim(); }
    if (typeof number === "string") updates.number = number.trim() || undefined;
    if (Object.prototype.hasOwnProperty.call(req.body, "rarity")) updates.rarity = typeof rarity === "string" ? (rarity.trim() || null) : null;
    if (Object.prototype.hasOwnProperty.call(req.body, "imageSmall")) updates.image_small = typeof imageSmall === "string" ? (imageSmall.trim() || null) : null;
    if (Object.prototype.hasOwnProperty.call(req.body, "imageLarge")) updates.image_large = typeof imageLarge === "string" ? (imageLarge.trim() || null) : null;
    if (Object.prototype.hasOwnProperty.call(req.body, "artist")) updates.artist = typeof artist === "string" ? (artist.trim() || null) : null;
    if (Object.prototype.hasOwnProperty.call(req.body, "hp")) updates.hp = typeof hp === "string" ? (hp.trim() || null) : null;
    if (Object.prototype.hasOwnProperty.call(req.body, "supertype")) updates.supertype = typeof supertype === "string" ? (supertype.trim() || null) : null;
    if (Object.prototype.hasOwnProperty.call(req.body, "subtypes")) updates.subtypes = typeof subtypes === "string" ? (subtypes.trim() || null) : null;
    if (Object.prototype.hasOwnProperty.call(req.body, "description")) updates.description = typeof description === "string" ? (description.trim() || null) : null;
    if (Object.keys(updates).length === 0) { res.status(400).json({ error: "No valid fields to update" }); return; }
    const drizzleUpdates: Partial<typeof pokemonCards.$inferInsert> = {};
    if (updates.name !== undefined) drizzleUpdates.name = updates.name;
    if (updates.number !== undefined) drizzleUpdates.number = updates.number;
    if (Object.prototype.hasOwnProperty.call(updates, "rarity")) drizzleUpdates.rarity = updates.rarity;
    if (Object.prototype.hasOwnProperty.call(updates, "image_small")) drizzleUpdates.imageSmall = updates.image_small;
    if (Object.prototype.hasOwnProperty.call(updates, "image_large")) drizzleUpdates.imageLarge = updates.image_large;
    if (Object.prototype.hasOwnProperty.call(updates, "artist")) drizzleUpdates.artist = updates.artist;
    if (Object.prototype.hasOwnProperty.call(updates, "hp")) drizzleUpdates.hp = updates.hp;
    if (Object.prototype.hasOwnProperty.call(updates, "supertype")) drizzleUpdates.supertype = updates.supertype;
    if (Object.prototype.hasOwnProperty.call(updates, "subtypes")) drizzleUpdates.subtypes = updates.subtypes;
    if (Object.prototype.hasOwnProperty.call(updates, "description")) drizzleUpdates.description = updates.description;
    const [updated] = await db.update(pokemonCards).set(drizzleUpdates).where(and(eq(pokemonCards.id, id), isNull(pokemonCards.deletedAt))).returning();
    if (!updated) { res.status(404).json({ error: "Card not found" }); return; }
    res.json({ card: updated });
  });

  app.get("/api/admin/db/sets", async (req: Request, res: Response) => {
    if (!await isSuperadminSessionOnly(req)) { res.status(403).json({ error: "Forbidden" }); return; }
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt((req.query.pageSize as string) || "50", 10)));
    const search = (req.query.search as string || "").trim();
    const trash = (req.query.trash as string) === "1";
    const offset = (page - 1) * pageSize;
    const deletedFilter = trash ? isNotNull(pokemonSets.deletedAt) : isNull(pokemonSets.deletedAt);
    const condition = search
      ? and(deletedFilter, or(ilike(pokemonSets.name, `%${search}%`), ilike(pokemonSets.id, `%${search}%`)))
      : deletedFilter;
    const [countResult, sets] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(pokemonSets).where(condition),
      db.select({
        id: pokemonSets.id, name: pokemonSets.name, series: pokemonSets.series,
        releaseDate: pokemonSets.releaseDate, hidden: pokemonSets.hidden, total: pokemonSets.total,
        deletedAt: pokemonSets.deletedAt,
        cardCount: sql<number>`count(${pokemonCards.id})::int`,
      }).from(pokemonSets)
        .leftJoin(pokemonCards, and(eq(pokemonCards.setId, pokemonSets.id), isNull(pokemonCards.deletedAt)))
        .where(condition)
        .groupBy(pokemonSets.id)
        .orderBy(desc(pokemonSets.releaseDate))
        .limit(pageSize).offset(offset),
    ]);
    res.json({ sets, total: countResult[0]?.count ?? 0, page, pageSize });
  });

  app.patch("/api/admin/db/sets/:id", async (req: Request, res: Response) => {
    if (!await isSuperadminSessionOnly(req)) { res.status(403).json({ error: "Forbidden" }); return; }
    const { id } = req.params;
    const { name, releaseDate, hidden } = req.body;
    const updates: Partial<typeof pokemonSets.$inferInsert> = {};
    if (typeof name === "string") { if (!name.trim()) { res.status(400).json({ error: "Set name cannot be empty" }); return; } updates.name = name.trim(); }
    if (typeof releaseDate === "string") updates.releaseDate = releaseDate.trim() || null;
    if (typeof hidden === "boolean") updates.hidden = hidden;
    if (Object.keys(updates).length === 0) { res.status(400).json({ error: "No valid fields to update" }); return; }
    const [updated] = await db.update(pokemonSets).set(updates).where(and(eq(pokemonSets.id, id), isNull(pokemonSets.deletedAt))).returning();
    if (!updated) { res.status(404).json({ error: "Set not found" }); return; }
    res.json({ set: updated });
  });

  app.delete("/api/admin/db/cards/:id", async (req: Request, res: Response) => {
    if (!await isSuperadminSessionOnly(req)) { res.status(403).json({ error: "Forbidden" }); return; }
    const { id } = req.params;
    const existing = await db.select({ id: pokemonCards.id }).from(pokemonCards).where(and(eq(pokemonCards.id, id), isNull(pokemonCards.deletedAt))).limit(1);
    if (existing.length === 0) { res.status(404).json({ error: "Card not found" }); return; }
    await db.update(pokemonCards).set({ deletedAt: new Date() }).where(eq(pokemonCards.id, id));
    res.json({ success: true });
  });

  app.post("/api/admin/db/cards/:id/restore", async (req: Request, res: Response) => {
    if (!await isSuperadminSessionOnly(req)) { res.status(403).json({ error: "Forbidden" }); return; }
    const { id } = req.params;
    const existing = await db.select({ id: pokemonCards.id }).from(pokemonCards).where(and(eq(pokemonCards.id, id), isNotNull(pokemonCards.deletedAt))).limit(1);
    if (existing.length === 0) { res.status(404).json({ error: "Card not found in trash" }); return; }
    await db.update(pokemonCards).set({ deletedAt: null }).where(eq(pokemonCards.id, id));
    res.json({ success: true });
  });

  app.delete("/api/admin/db/sets/:id", async (req: Request, res: Response) => {
    if (!await isSuperadminSessionOnly(req)) { res.status(403).json({ error: "Forbidden" }); return; }
    const { id } = req.params;
    const existing = await db.select({ id: pokemonSets.id }).from(pokemonSets).where(and(eq(pokemonSets.id, id), isNull(pokemonSets.deletedAt))).limit(1);
    if (existing.length === 0) { res.status(404).json({ error: "Set not found" }); return; }
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx.update(pokemonCards).set({ deletedAt: now }).where(eq(pokemonCards.setId, id));
      await tx.update(pokemonSets).set({ deletedAt: now }).where(eq(pokemonSets.id, id));
    });
    res.json({ success: true });
  });

  app.post("/api/admin/db/sets/:id/restore", async (req: Request, res: Response) => {
    if (!await isSuperadminSessionOnly(req)) { res.status(403).json({ error: "Forbidden" }); return; }
    const { id } = req.params;
    const existing = await db.select({ id: pokemonSets.id }).from(pokemonSets).where(and(eq(pokemonSets.id, id), isNotNull(pokemonSets.deletedAt))).limit(1);
    if (existing.length === 0) { res.status(404).json({ error: "Set not found in trash" }); return; }
    await db.transaction(async (tx) => {
      await tx.update(pokemonCards).set({ deletedAt: null }).where(and(eq(pokemonCards.setId, id), isNotNull(pokemonCards.deletedAt)));
      await tx.update(pokemonSets).set({ deletedAt: null }).where(eq(pokemonSets.id, id));
    });
    res.json({ success: true });
  });

  // ── Generic Database Admin Endpoints (superadmin only) ───────────────────────
  const ADMIN_DB_TABLES: Record<string, { pk: string; searchCols: string[] }> = {
    pokescan_users:                   { pk: "id",    searchCols: ["username", "email", "display_name"] },
    pokescan_blocked_credentials:     { pk: "id",    searchCols: ["email", "mobile_number", "reason"] },
    pokescan_sessions:                { pk: "token", searchCols: ["user_id"] },
    pokemon_sets:                     { pk: "id",    searchCols: ["name", "series"] },
    pokemon_cards:                    { pk: "id",    searchCols: ["name", "set_id"] },
    card_pricing:                     { pk: "id",    searchCols: ["card_id"] },
    ebay_prices:                      { pk: "id",    searchCols: ["card_id", "title"] },
    pokescan_friendships:             { pk: "id",    searchCols: ["requester_id", "addressee_id", "status"] },
    pokescan_messages:                { pk: "id",    searchCols: ["sender_id", "recipient_id", "subject", "body"] },
    pokescan_reports:                 { pk: "id",    searchCols: ["reason", "content_type", "status"] },
    pokescan_market_listings:         { pk: "id",    searchCols: ["card_name", "user_name", "status"] },
    pokescan_collections:             { pk: "id",    searchCols: ["card_name", "user_id", "set_name"] },
    pokescan_chatroom_messages:       { pk: "id",    searchCols: ["sender_username", "body"] },
    pokescan_admin_activity_log:      { pk: "id",    searchCols: ["action", "target_username", "listing_name"] },
    pokescan_collector_verifications: { pk: "id",    searchCols: ["user_id", "card_name", "status"] },
    pokescan_scan_history:            { pk: "id",    searchCols: ["card_name", "set_name"] },
    sync_status:                      { pk: "id",    searchCols: [] },
    users:                            { pk: "id",    searchCols: ["username"] },
  };

  app.get("/api/admin/db/table/:tableName/schema", async (req: Request, res: Response) => {
    if (!await isSuperadminSessionOnly(req)) { res.status(403).json({ error: "Forbidden" }); return; }
    const { tableName } = req.params;
    if (!ADMIN_DB_TABLES[tableName]) { res.status(400).json({ error: "Unknown table" }); return; }
    const result = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_name = $1 AND table_schema = 'public'
       ORDER BY ordinal_position`,
      [tableName]
    );
    res.json({ columns: result.rows, pk: ADMIN_DB_TABLES[tableName].pk });
  });

  app.get("/api/admin/db/table/:tableName", async (req: Request, res: Response) => {
    if (!await isSuperadminSessionOnly(req)) { res.status(403).json({ error: "Forbidden" }); return; }
    const { tableName } = req.params;
    const tbl = ADMIN_DB_TABLES[tableName];
    if (!tbl) { res.status(400).json({ error: "Unknown table" }); return; }
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || "50", 10)));
    const search = ((req.query.search as string) || "").trim();
    const offset = (page - 1) * pageSize;
    const values: any[] = [];
    let whereClause = "";
    if (search && tbl.searchCols.length > 0) {
      const conditions = tbl.searchCols.map((col, i) => `"${col}"::text ILIKE $${i + 1}`);
      whereClause = `WHERE (${conditions.join(" OR ")})`;
      values.push(...tbl.searchCols.map(() => `%${search}%`));
    }
    const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${tableName}" ${whereClause}`, values);
    const dataResult = await pool.query(
      `SELECT * FROM "${tableName}" ${whereClause} ORDER BY "${tbl.pk}" DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pageSize, offset]
    );
    res.json({ rows: dataResult.rows, total: parseInt(countResult.rows[0].count, 10), page, pageSize });
  });

  app.get("/api/admin/db/tables", async (req: Request, res: Response) => {
    if (!await isSuperadminSessionOnly(req)) { res.status(403).json({ error: "Forbidden" }); return; }
    const tables = await Promise.all(
      Object.keys(ADMIN_DB_TABLES).map(async (t) => {
        const r = await pool.query(`SELECT COUNT(*) as count FROM "${t}"`);
        return { name: t, rowCount: parseInt(r.rows[0].count, 10) };
      })
    );
    res.json({ tables });
  });

  app.patch("/api/admin/db/table/:tableName/:id", express.json({ limit: "2mb" }), async (req: Request, res: Response) => {
    if (!await isSuperadminSessionOnly(req)) { res.status(403).json({ error: "Forbidden" }); return; }
    const { tableName, id } = req.params;
    const tbl = ADMIN_DB_TABLES[tableName];
    if (!tbl) { res.status(400).json({ error: "Unknown table" }); return; }
    const body = req.body as Record<string, any>;
    const schemaResult = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'`,
      [tableName]
    );
    const validCols = new Set<string>(schemaResult.rows.map((r: any) => r.column_name as string));
    const updates = Object.entries(body).filter(([k]) => k !== tbl.pk && validCols.has(k));
    if (updates.length === 0) { res.status(400).json({ error: "No valid fields to update" }); return; }
    const setClauses = updates.map(([col], i) => `"${col}" = $${i + 1}`);
    const values: any[] = [...updates.map(([, v]) => (v === "" ? null : v)), id];
    await pool.query(`UPDATE "${tableName}" SET ${setClauses.join(", ")} WHERE "${tbl.pk}" = $${values.length}`, values);
    const updated = await pool.query(`SELECT * FROM "${tableName}" WHERE "${tbl.pk}" = $1`, [id]);
    res.json({ row: updated.rows[0] || null });
  });

  app.delete("/api/admin/db/table/:tableName/:id", async (req: Request, res: Response) => {
    if (!await isSuperadminSessionOnly(req)) { res.status(403).json({ error: "Forbidden" }); return; }
    const { tableName, id } = req.params;
    const tbl = ADMIN_DB_TABLES[tableName];
    if (!tbl) { res.status(400).json({ error: "Unknown table" }); return; }
    await pool.query(`DELETE FROM "${tableName}" WHERE "${tbl.pk}" = $1`, [id]);
    res.json({ success: true });
  });

  app.post("/api/admin/db/table/:tableName", express.json({ limit: "2mb" }), async (req: Request, res: Response) => {
    if (!await isSuperadminSessionOnly(req)) { res.status(403).json({ error: "Forbidden" }); return; }
    const { tableName } = req.params;
    const tbl = ADMIN_DB_TABLES[tableName];
    if (!tbl) { res.status(400).json({ error: "Unknown table" }); return; }
    const body = req.body as Record<string, any>;
    const schemaResult = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'`,
      [tableName]
    );
    const validCols = new Set<string>(schemaResult.rows.map((r: any) => r.column_name as string));
    const entries = Object.entries(body).filter(([k]) => validCols.has(k) && body[k] !== "" && body[k] !== null && body[k] !== undefined);
    if (entries.length === 0) { res.status(400).json({ error: "No valid fields provided" }); return; }
    const cols = entries.map(([k]) => `"${k}"`).join(", ");
    const placeholders = entries.map((_, i) => `$${i + 1}`).join(", ");
    const values = entries.map(([, v]) => v);
    const result = await pool.query(`INSERT INTO "${tableName}" (${cols}) VALUES (${placeholders}) RETURNING *`, values);
    res.json({ row: result.rows[0] });
  });

  const httpServer = createServer(app);


  app.get("/api/admin/resync-progress", (_req: Request, res: Response) => {
    res.json(resyncState);
  });

  app.post("/api/admin/full-resync", async (_req: Request, res: Response) => {
    if (resyncState.running) {
      return res.status(409).json({
        success: false,
        error: "Resync already running",
      });
    }

    resyncState = {
      running: true,
      progress: null,
      error: null,
      startedAt: new Date(),
      finishedAt: null,
    };

    res.json({
      success: true,
      message: "Full resync started",
    });

    runFullResync((p) => {
      resyncState.progress = p;
    })
      .then(() => {
        resyncState.running = false;
        resyncState.finishedAt = new Date();
      })
      .catch((err: any) => {
        console.error("[FullResync] failed:", err);

        resyncState.running = false;
        resyncState.error =
          err?.message || "Full resync failed";

        resyncState.finishedAt = new Date();
      });
  });

    return httpServer;
    }