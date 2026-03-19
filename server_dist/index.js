var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  cardPricing: () => cardPricing,
  ebayPrices: () => ebayPrices,
  insertUserSchema: () => insertUserSchema,
  pokemonCards: () => pokemonCards,
  pokemonSets: () => pokemonSets,
  pokescanFriendships: () => pokescanFriendships,
  pokescanMessages: () => pokescanMessages,
  pokescanReports: () => pokescanReports,
  pokescanSessions: () => pokescanSessions,
  pokescanUsers: () => pokescanUsers,
  syncStatus: () => syncStatus,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, real, timestamp, boolean, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var pokescanUsers, pokescanSessions, insertUserSchema, users, pokemonSets, pokemonCards, cardPricing, ebayPrices, pokescanFriendships, pokescanMessages, pokescanReports, syncStatus;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    pokescanUsers = pgTable("pokescan_users", {
      id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::varchar`),
      username: text("username").notNull().unique(),
      displayName: text("display_name").notNull(),
      email: text("email").notNull().unique(),
      mobileNumber: text("mobile_number").notNull().default(""),
      passwordHash: text("password_hash"),
      authProvider: text("auth_provider").notNull().default("local"),
      isPremium: boolean("is_premium").notNull().default(false),
      role: text("role").notNull().default("user"),
      avatarUrl: text("avatar_url"),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`NOW()`)
    });
    pokescanSessions = pgTable("pokescan_sessions", {
      token: varchar("token", { length: 64 }).primaryKey(),
      userId: varchar("user_id", { length: 36 }).notNull().references(() => pokescanUsers.id, { onDelete: "cascade" }),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`NOW()`),
      expiresAt: timestamp("expires_at", { withTimezone: true }).notNull().default(sql`NOW() + INTERVAL '30 days'`)
    });
    insertUserSchema = createInsertSchema(pokescanUsers).pick({
      username: true,
      displayName: true,
      email: true,
      mobileNumber: true
    });
    users = pgTable("users", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      username: text("username").notNull().unique(),
      password: text("password").notNull()
    });
    pokemonSets = pgTable("pokemon_sets", {
      id: varchar("id").primaryKey(),
      name: text("name").notNull(),
      series: text("series").notNull(),
      printedTotal: integer("printed_total"),
      total: integer("total"),
      releaseDate: text("release_date"),
      logoUrl: text("logo_url"),
      symbolUrl: text("symbol_url"),
      imageUrl: text("image_url"),
      syncedAt: timestamp("synced_at").default(sql`CURRENT_TIMESTAMP`)
    });
    pokemonCards = pgTable("pokemon_cards", {
      id: varchar("id").primaryKey(),
      setId: varchar("set_id").notNull().references(() => pokemonSets.id),
      name: text("name").notNull(),
      number: text("number").notNull(),
      rarity: text("rarity"),
      supertype: text("supertype"),
      subtypes: text("subtypes"),
      imageSmall: text("image_small"),
      imageLarge: text("image_large"),
      artist: text("artist"),
      hp: text("hp"),
      nationalPokedexNumbers: text("national_pokedex_numbers"),
      syncedAt: timestamp("synced_at").default(sql`CURRENT_TIMESTAMP`)
    });
    cardPricing = pgTable(
      "card_pricing",
      {
        id: serial("id").primaryKey(),
        cardId: varchar("card_id").notNull().references(() => pokemonCards.id),
        tcgLow: real("tcg_low"),
        tcgMid: real("tcg_mid"),
        tcgHigh: real("tcg_high"),
        tcgMarket: real("tcg_market"),
        tcgDirectLow: real("tcg_direct_low"),
        cardmarketAvg: real("cardmarket_avg"),
        cardmarketLow: real("cardmarket_low"),
        cardmarketTrend: real("cardmarket_trend"),
        priceGBP: real("price_gbp"),
        updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`)
      },
      (t) => [unique("card_pricing_card_id_unique").on(t.cardId)]
    );
    ebayPrices = pgTable("ebay_prices", {
      id: serial("id").primaryKey(),
      cardId: varchar("card_id").notNull().references(() => pokemonCards.id),
      title: text("title"),
      price: real("price"),
      currency: text("currency").default("GBP"),
      soldDate: text("sold_date"),
      listingUrl: text("listing_url"),
      isSold: boolean("is_sold").default(true),
      fetchedAt: timestamp("fetched_at").default(sql`CURRENT_TIMESTAMP`)
    });
    pokescanFriendships = pgTable("pokescan_friendships", {
      id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::varchar`),
      requesterId: varchar("requester_id", { length: 36 }).notNull().references(() => pokescanUsers.id, { onDelete: "cascade" }),
      addresseeId: varchar("addressee_id", { length: 36 }).notNull().references(() => pokescanUsers.id, { onDelete: "cascade" }),
      status: text("status").notNull().default("pending"),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`NOW()`)
    });
    pokescanMessages = pgTable("pokescan_messages", {
      id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::varchar`),
      senderId: varchar("sender_id", { length: 36 }).notNull().references(() => pokescanUsers.id, { onDelete: "cascade" }),
      recipientId: varchar("recipient_id", { length: 36 }).notNull().references(() => pokescanUsers.id, { onDelete: "cascade" }),
      subject: text("subject").notNull().default(""),
      body: text("body").notNull(),
      isRead: boolean("is_read").notNull().default(false),
      deletedBySender: boolean("deleted_by_sender").notNull().default(false),
      deletedByRecipient: boolean("deleted_by_recipient").notNull().default(false),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`NOW()`)
    });
    pokescanReports = pgTable("pokescan_reports", {
      id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::varchar`),
      reporterId: varchar("reporter_id", { length: 36 }).notNull().references(() => pokescanUsers.id, { onDelete: "cascade" }),
      reportedUserId: varchar("reported_user_id", { length: 36 }).references(() => pokescanUsers.id, { onDelete: "set null" }),
      contentType: text("content_type").notNull(),
      contentId: text("content_id").notNull(),
      reason: text("reason").notNull(),
      contentSnapshot: text("content_snapshot"),
      status: text("status").notNull().default("pending"),
      reviewNote: text("review_note"),
      reviewedBy: varchar("reviewed_by", { length: 36 }).references(() => pokescanUsers.id, { onDelete: "set null" }),
      reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`NOW()`)
    });
    syncStatus = pgTable("sync_status", {
      id: serial("id").primaryKey(),
      totalSets: integer("total_sets").default(0),
      syncedSets: integer("synced_sets").default(0),
      totalCards: integer("total_cards").default(0),
      syncedCards: integer("synced_cards").default(0),
      lastCardSyncAt: timestamp("last_card_sync_at"),
      lastPriceSyncAt: timestamp("last_price_sync_at"),
      isRunning: boolean("is_running").default(false),
      lastError: text("last_error"),
      updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`)
    });
  }
});

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool as Pool2 } from "pg";
var pool2, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required");
    }
    pool2 = new Pool2({
      connectionString: process.env.DATABASE_URL
    });
    db = drizzle(pool2, { schema: schema_exports });
  }
});

// server/scrydex-scraper.ts
var scrydex_scraper_exports = {};
__export(scrydex_scraper_exports, {
  runScrydexSync: () => runScrydexSync,
  scrapeScrydexSetCards: () => scrapeScrydexSetCards,
  scrapeScrydexSetDetail: () => scrapeScrydexSetDetail,
  scrapeScrydexSets: () => scrapeScrydexSets,
  scrapeScrydexTcgPocketSets: () => scrapeScrydexTcgPocketSets
});
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
async function fetchPage2(path2) {
  const url = path2.startsWith("http") ? path2 : `${BASE_URL2}${path2}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    },
    signal: AbortSignal.timeout(2e4)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}
function htmlDecode(str) {
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}
function slugToName(slug) {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
async function scrapeScrydexSets() {
  const html = await fetchPage2("/pokemon/expansions");
  return parseSetsFromHtml(html);
}
async function scrapeScrydexTcgPocketSets() {
  const html = await fetchPage2("/pokemon/tcg-pocket/expansions");
  return parseSetsFromHtml(html);
}
function parseSetsFromHtml(html) {
  const sets = [];
  const seen = /* @__PURE__ */ new Set();
  const linkRe = /href="\/pokemon\/expansions\/([^"/]+)\/([^"/?\s]+)"/g;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const slug = m[1];
    const id = m[2];
    if (seen.has(id)) continue;
    seen.add(id);
    const start = m.index;
    const block = html.substring(start, start + 2e3);
    const name = slugToName(slug);
    const series = inferSeries(id);
    const dateM = block.match(/(\d{4}\/\d{2}\/\d{2}|\d{4}-\d{2}-\d{2})/);
    const releaseDate = dateM ? dateM[1].replace(/\//g, "-") : "";
    const countM = block.match(/(\d+)\s*cards?/i);
    const total = countM ? parseInt(countM[1], 10) : 0;
    const logoUrl = `${IMAGE_BASE}/${id}-logo/logo`;
    const symbolUrl = `${IMAGE_BASE}/${id}-symbol/symbol`;
    sets.push({ id, slug, name, series, releaseDate, total, logoUrl, symbolUrl });
  }
  return sets;
}
async function scrapeScrydexSetDetail(slug, id) {
  const html = await fetchPage2(`/pokemon/expansions/${slug}/${id}`);
  const nameM = html.match(
    /<h1[^>]*class="[^"]*text-heading-32[^"]*"[^>]*>([^<]+)<\/h1>/
  );
  const name = nameM ? htmlDecode(nameM[1].trim()) : slugToName(slug);
  const seriesM = html.match(
    /<span[^>]*text-heading-16[^>]*>([^<]+)<\/span>[^<]*<span[^>]*text-mono-2[^>]*>[^<]*<\/span>[^<]*<span[^>]*text-heading-16[^>]*>(\d+)\s*cards?<\/span>/
  );
  const series = seriesM ? htmlDecode(seriesM[1].trim()) : inferSeries(id);
  const total = seriesM ? parseInt(seriesM[2], 10) : 0;
  const dateM = html.match(/(\d{4}\/\d{2}\/\d{2})/);
  const releaseDate = dateM ? dateM[1].replace(/\//g, "-") : "";
  const logoUrl = `${IMAGE_BASE}/${id}-logo/logo`;
  const symbolUrl = `${IMAGE_BASE}/${id}-symbol/symbol`;
  return { id, slug, name, series, releaseDate, total, logoUrl, symbolUrl };
}
async function scrapeScrydexSetCards(slug, setId) {
  const html = await fetchPage2(`/pokemon/expansions/${slug}/${setId}`);
  return parseCardsFromSetHtml(html, setId);
}
function parseCardsFromSetHtml(html, setId) {
  const cards = [];
  const seen = /* @__PURE__ */ new Set();
  const cardRe = /href="\/pokemon\/cards\/([^/]+)\/([^?"\s]+)\?variant=([^"]+)"[\s\S]*?data-id="([^"]+)"[\s\S]*?src="(https:\/\/images\.scrydex\.com\/pokemon\/[^"]+\/medium)"[\s\S]*?<span[^>]*>([^<]+)<\/span>[\s\S]*?<span[^>]*>([^<]*)<\/span>[\s\S]*?<span[^>]*>\$([\d.]+)<\/span>/g;
  let m;
  while ((m = cardRe.exec(html)) !== null) {
    const cardSlug = m[1];
    const scrydexId = m[2];
    const imgMedium = m[5];
    const nameWithNum = m[6].trim();
    const priceStr = m[8];
    if (seen.has(scrydexId)) continue;
    seen.add(scrydexId);
    const nameNumM = nameWithNum.match(/^(.+?)\s*#(\S+)$/);
    const name = nameNumM ? htmlDecode(nameNumM[1].trim()) : htmlDecode(slugToName(cardSlug));
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
      priceUsd
    });
  }
  if (cards.length === 0) {
    const linkRe = /href="\/pokemon\/cards\/([^/]+)\/([^?"\s]+)\?variant=[^"]+"/g;
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
        priceUsd: null
      });
    }
  }
  return cards;
}
function inferSeries(id) {
  if (id.startsWith("tcgp")) return "TCG Pocket";
  if (id.startsWith("sv")) return "Scarlet & Violet";
  if (id.startsWith("swsh")) return "Sword & Shield";
  if (id.startsWith("sm")) return "Sun & Moon";
  if (id.startsWith("xy")) return "XY";
  if (id.startsWith("bw")) return "Black & White";
  if (id.startsWith("me")) return "Mega Evolution";
  if (id.startsWith("rsv") || id.startsWith("zsv")) return "Scarlet & Violet";
  if (id.startsWith("neo")) return "Neo";
  if (id.startsWith("ecard")) return "E-Card";
  if (id.startsWith("ex")) return "EX";
  if (id.startsWith("dp")) return "Diamond & Pearl";
  if (id.startsWith("pl")) return "Platinum";
  if (id.startsWith("hgss")) return "HeartGold & SoulSilver";
  if (id.startsWith("col")) return "Call of Legends";
  if (id.startsWith("gym")) return "Gym";
  if (id.startsWith("base")) return "Base";
  if (id.startsWith("pop")) return "POP Series";
  if (id.startsWith("wc")) return "World Championships";
  if (id.startsWith("np")) return "Neo";
  if (id.startsWith("cel")) return "Sword & Shield";
  return "Other";
}
async function runScrydexSync(onProgress) {
  const progress = {
    phase: "sets",
    setsProcessed: 0,
    setsTotal: 0,
    setsAdded: 0,
    cardsProcessed: 0,
    cardsAdded: 0,
    cardsUpdated: 0
  };
  const report = (patch) => {
    Object.assign(progress, patch);
    onProgress?.(progress);
  };
  try {
    report({ phase: "sets", message: "Fetching set list from scrydex.com..." });
    const [enSets, pocketSets] = await Promise.all([
      scrapeScrydexSets(),
      scrapeScrydexTcgPocketSets()
    ]);
    const allSetsMap = /* @__PURE__ */ new Map();
    for (const s of [...enSets, ...pocketSets]) {
      if (!allSetsMap.has(s.id)) allSetsMap.set(s.id, s);
    }
    const allSets = [...allSetsMap.values()];
    report({ setsTotal: allSets.length, message: `Found ${allSets.length} sets on scrydex.com` });
    const existingSetRows = await pool2.query(
      "SELECT id FROM pokemon_sets"
    );
    const existingSetIds = new Set(
      existingSetRows.rows.map((r) => r.id)
    );
    report({ phase: "cards" });
    for (const set of allSets) {
      report({ currentSet: set.name, setsProcessed: progress.setsProcessed });
      let setId = set.id;
      if (!existingSetIds.has(setId)) {
        try {
          await delay(DELAY_MS);
          const detail = await scrapeScrydexSetDetail(set.slug, set.id);
          await pool2.query(
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
              detail.logoUrl
              // image_url falls back to logo
            ]
          );
          existingSetIds.add(setId);
          report({ setsAdded: progress.setsAdded + 1 });
        } catch (err) {
          console.error(`[Scrydex] Failed to insert set ${setId}:`, err.message);
        }
      }
      try {
        await delay(DELAY_MS);
        const cards = await scrapeScrydexSetCards(set.slug, setId);
        if (cards.length === 0) {
          report({ setsProcessed: progress.setsProcessed + 1 });
          continue;
        }
        const cardIds = cards.map((c) => c.id);
        const existingCardsRes = await pool2.query(
          `SELECT id, image_small FROM pokemon_cards WHERE id = ANY($1)`,
          [cardIds]
        );
        const existingCards = new Map(
          existingCardsRes.rows.map((r) => [r.id, r.image_small])
        );
        for (const card of cards) {
          progress.cardsProcessed++;
          if (!existingCards.has(card.id)) {
            if (!existingSetIds.has(setId)) continue;
            try {
              await pool2.query(
                `INSERT INTO pokemon_cards (id, set_id, name, number, image_small, image_large)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (id) DO NOTHING`,
                [
                  card.id,
                  card.setId,
                  card.name,
                  card.number,
                  card.imageSmall,
                  card.imageLarge
                ]
              );
              progress.cardsAdded++;
            } catch (err) {
            }
          } else {
            const existingImg = existingCards.get(card.id);
            if (!existingImg || existingImg === "") {
              try {
                await pool2.query(
                  `UPDATE pokemon_cards
                   SET image_small = $1, image_large = $2
                   WHERE id = $3 AND (image_small IS NULL OR image_small = '')`,
                  [card.imageSmall, card.imageLarge, card.id]
                );
                progress.cardsUpdated++;
              } catch (err) {
              }
            }
          }
        }
        report({ setsProcessed: progress.setsProcessed + 1 });
      } catch (err) {
        console.error(
          `[Scrydex] Failed to process cards for ${setId}:`,
          err.message
        );
        report({ setsProcessed: progress.setsProcessed + 1 });
      }
    }
    report({
      phase: "done",
      message: `Sync complete. ${progress.setsAdded} sets added, ${progress.cardsAdded} cards added, ${progress.cardsUpdated} card images updated.`
    });
  } catch (err) {
    report({ phase: "error", message: err.message || "Sync failed" });
  }
  return progress;
}
var BASE_URL2, IMAGE_BASE, DELAY_MS;
var init_scrydex_scraper = __esm({
  "server/scrydex-scraper.ts"() {
    "use strict";
    init_db();
    BASE_URL2 = "https://scrydex.com";
    IMAGE_BASE = "https://images.scrydex.com/pokemon";
    DELAY_MS = 400;
  }
});

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "node:http";
import express from "express";
import OpenAI from "openai";
import bcrypt from "bcryptjs";

// server/pokecardvalues-scraper.ts
import * as cheerio from "cheerio";
var BASE_URL = "https://pokecardvalues.co.uk";
var CDN_BASE = "https://doujkbm8mih0s.cloudfront.net/static/images/alt";
var CACHE_TTL = 1e3 * 60 * 60;
var cache = /* @__PURE__ */ new Map();
function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}
function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}
async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; PokeScanTCG/1.0)",
      "Accept": "text/html,application/xhtml+xml"
    }
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}
function parsePrice(text2) {
  const match = text2.match(/£([\d,]+\.?\d*)/);
  if (!match) return null;
  return parseFloat(match[1].replace(",", ""));
}
var SERIES_ORDER = [
  "Mega Evolution",
  "Scarlet & Violet",
  "Sword & Shield",
  "Sun & Moon",
  "XY",
  "Black & White",
  "Call of Legends",
  "HeartGold & SoulSilver",
  "Platinum",
  "Diamond & Pearl",
  "EX",
  "E-Card",
  "Neo",
  "Gym",
  "Base",
  "Other Promos",
  "POP Series",
  "World Championships"
];
async function scrapeSets() {
  const cached = getCached("sets");
  if (cached) return cached;
  try {
    const html = await fetchPage(`${BASE_URL}/sets/`);
    const $ = cheerio.load(html);
    const sets = [];
    $("a[href*='/sets/']").each((_, el) => {
      const $el = $(el);
      const href = $el.attr("href");
      if (!href || href === "/sets/" || href === `${BASE_URL}/sets/`) return;
      const urlMatch = href.match(/\/sets\/([^/]+)\/([^/]+)\/?$/);
      if (!urlMatch) return;
      const setId = urlMatch[1];
      const slug = urlMatch[2];
      const text2 = $el.text().trim();
      const lines = text2.split("\n").map((l) => l.trim()).filter(Boolean);
      let name = "";
      let releaseDate = "";
      let cardCount = 0;
      for (const line of lines) {
        if (line.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)/i)) {
          releaseDate = line;
        } else if (line.match(/^\/?\d+$/)) {
          cardCount = parseInt(line.replace("/", ""), 10);
        } else if (line.length > 1 && !line.match(/^\d+$/) && !name) {
          name = line;
        }
      }
      if (!name) return;
      const $img = $el.find("img");
      let logoUrl = "";
      let symbolUrl = "";
      $img.each((_2, imgEl) => {
        const src = $(imgEl).attr("src") || "";
        if (src.includes("LOGOS")) logoUrl = src;
        else if (src.includes("SYMBOLS")) symbolUrl = src;
      });
      let series = "Other";
      for (const s of SERIES_ORDER) {
        if (href.toLowerCase().includes(s.toLowerCase().replace(/ /g, "-")) || name.toLowerCase().includes(s.toLowerCase())) {
          series = s;
          break;
        }
      }
      if (setId.startsWith("sv")) series = "Scarlet & Violet";
      else if (setId.startsWith("swsh")) series = "Sword & Shield";
      else if (setId.startsWith("sm")) series = "Sun & Moon";
      else if (setId.startsWith("xy")) series = "XY";
      else if (setId.startsWith("bw")) series = "Black & White";
      else if (setId.startsWith("me")) series = "Mega Evolution";
      else if (setId.startsWith("neo")) series = "Neo";
      else if (setId.startsWith("ecard")) series = "E-Card";
      else if (setId.startsWith("ex")) series = "EX";
      else if (setId.startsWith("dp")) series = "Diamond & Pearl";
      else if (setId.startsWith("pl")) series = "Platinum";
      else if (setId.startsWith("hgss")) series = "HeartGold & SoulSilver";
      else if (setId.startsWith("gym")) series = "Gym";
      else if (setId.startsWith("base")) series = "Base";
      else if (setId.startsWith("pop")) series = "POP Series";
      else if (setId.startsWith("wc")) series = "World Championships";
      else if (setId.startsWith("mc")) series = "Other Promos";
      else if (setId.startsWith("tk")) series = "Other Promos";
      else if (setId.startsWith("cel")) series = "Sword & Shield";
      else if (setId.startsWith("tot")) series = "Sword & Shield";
      else if (setId.startsWith("det")) series = "Sun & Moon";
      else if (setId.startsWith("col")) series = "Call of Legends";
      const existing = sets.find((s) => s.id === setId && s.slug === slug);
      if (existing) return;
      sets.push({
        id: setId,
        slug,
        name,
        series,
        releaseDate,
        cardCount,
        logoUrl: logoUrl || `${CDN_BASE}/thumb_lg/LOGOS/${setId}-logo.png`,
        symbolUrl: symbolUrl || `${CDN_BASE}/thumb_xs/SYMBOLS/${setId}-symbol.png`,
        url: `${BASE_URL}/sets/${setId}/${slug}/`
      });
    });
    setCache("sets", sets);
    return sets;
  } catch (error) {
    console.error("Failed to scrape sets:", error);
    throw error;
  }
}
async function scrapeSetCards(setId, slug) {
  const cacheKey = `set-cards-${setId}-${slug}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  try {
    const html = await fetchPage(`${BASE_URL}/sets/${setId}/${slug}/`);
    const $ = cheerio.load(html);
    const cards = [];
    const jsonLdItems = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || "{}");
        if (json["@type"] === "ItemList" && json.itemListElement) {
          for (const item of json.itemListElement) {
            if (item["@type"] === "ListItem" && item.name) {
              jsonLdItems.push({ name: item.name, url: item.url || "" });
            }
          }
        }
      } catch {
      }
    });
    const cardContainers = $(".card-title-info").closest("a[href*='/cards/'], div").parent();
    let cardIndex = 0;
    const cardLinks = $("a[href*='/cards/']").toArray();
    for (const el of cardLinks) {
      const $el = $(el);
      const href = $el.attr("href") || "";
      if (!href.includes("/cards/")) continue;
      const titleDiv = $el.find(".card-title-info");
      const holoEdDiv = $el.find(".card-holo-edition-info");
      const priceDiv = $el.find(".price-info");
      const $parentContainer = $el.parent();
      const holoEdDivAlt = $parentContainer.find(".card-holo-edition-info");
      const priceDivAlt = $parentContainer.find(".price-info");
      let name = "";
      let number = "";
      let holoType = "";
      let rarity = "";
      let edition = "";
      let priceGBP = null;
      const titleText = titleDiv.text().trim();
      if (titleText) {
        const nameNumMatch = titleText.match(/^(.+?)\s*-\s*(\S+)/);
        if (nameNumMatch) {
          name = nameNumMatch[1].trim();
          number = nameNumMatch[2];
        } else {
          name = titleText;
        }
      }
      if (!name && jsonLdItems[cardIndex]) {
        const ldName = jsonLdItems[cardIndex].name;
        const parts = ldName.split(" - ");
        if (parts.length >= 2) {
          name = parts[0].trim();
          number = parts[1].trim();
          if (parts.length >= 3) holoType = parts[2].trim().replace(/\\u002D/g, "-");
          if (parts.length >= 4) edition = parts[3].trim();
          if (parts.length >= 5) rarity = parts[4].trim().replace(" - Pok\xE9mon Card", "");
        }
      }
      const holoEdText = (holoEdDiv.length ? holoEdDiv : holoEdDivAlt).html() || "";
      const holoEdLines = holoEdText.split("<br>").map((l) => cheerio.load(l).text().trim()).filter(Boolean);
      if (holoEdLines.length >= 1 && !holoType) {
        holoType = holoEdLines[0];
      }
      if (holoEdLines.length >= 2) {
        const rarityEdMatch = holoEdLines[1].match(/^(.+?)\s*-\s*(.+)$/);
        if (rarityEdMatch) {
          rarity = rarityEdMatch[1].trim();
          edition = rarityEdMatch[2].trim();
        } else {
          rarity = holoEdLines[1];
        }
      }
      const priceText = (priceDiv.length ? priceDiv : priceDivAlt).text().trim();
      if (priceText) {
        priceGBP = parsePrice(priceText);
      }
      if (!name) {
        const fullText = $el.text().trim();
        const lines = fullText.split("\n").map((l) => l.trim()).filter(Boolean);
        const nameNumMatch2 = lines[0]?.match(/^(.+?)\s*-\s*(\S+)/);
        if (nameNumMatch2) {
          name = nameNumMatch2[1].trim();
          number = nameNumMatch2[2];
        }
        for (const line of lines) {
          if (line.match(/^(Non-Holo|Holo|Reverse Holo)$/i) && !holoType) holoType = line;
          if (line.match(/NM\/M Value:/i) && priceGBP === null) priceGBP = parsePrice(line);
          const rarityEdMatch2 = line.match(/^(Common|Uncommon|Rare|Double Rare|Ultra Rare|Special Illustration Rare|Hyper Rare|ACE SPEC Rare|Promo|Secret Rare|Shining Rare Holo|Rare Holo|Rare Ultra|Rare Rainbow)\s*-\s*(.+)$/i);
          if (rarityEdMatch2 && !rarity) {
            rarity = rarityEdMatch2[1];
            edition = rarityEdMatch2[2];
          }
        }
      }
      if (!name) {
        cardIndex++;
        continue;
      }
      const $img = $el.find("img");
      const imageUrl = $img.first().attr("src") || "";
      cards.push({
        name,
        number,
        holoType,
        rarity,
        edition,
        priceGBP,
        url: href.startsWith("http") ? href : `${BASE_URL}${href}`,
        setName: slug.replace(/-/g, " "),
        setId,
        imageUrl
      });
      cardIndex++;
    }
    setCache(cacheKey, cards);
    return cards;
  } catch (error) {
    console.error(`Failed to scrape set cards for ${setId}:`, error);
    throw error;
  }
}
async function scrapeTopCards(condition = "ungraded") {
  const cacheKey = `top-cards-${condition}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  try {
    const validConditions = ["ungraded", "psa8", "psa9", "psa10"];
    const cond = validConditions.includes(condition) ? condition : "ungraded";
    const html = await fetchPage(`${BASE_URL}/prices/${cond}/`);
    const $ = cheerio.load(html);
    const topCards = [];
    let rank = 0;
    $("a[href*='/cards/']").each((_, el) => {
      const $el = $(el);
      const href = $el.attr("href") || "";
      if (!href.includes("/cards/")) return;
      rank++;
      const text2 = $el.text().trim();
      const lines = text2.split("\n").map((l) => l.trim()).filter(Boolean);
      let name = "";
      let number = "";
      let rarity = "";
      let holoType = "";
      let edition = "";
      let setName = "";
      let priceGBP = 0;
      for (const line of lines) {
        const nameNumMatch = line.match(/^(.+?)\s*-\s*(\S+)/);
        if (nameNumMatch && !name) {
          name = nameNumMatch[1].trim();
          number = nameNumMatch[2];
        }
        if (line.match(/NM \/ M Value:|NM\/M Value:/i)) {
          const p = parsePrice(line);
          if (p) priceGBP = p;
        }
        const rarityMatch = line.match(/^(Rare Holo|Rare Ultra|Rare Rainbow|Secret Rare|Special Illustration Rare|Shining Rare Holo|Promo|Rare Holo EX)\s*-\s*(.+)$/i);
        if (rarityMatch) {
          rarity = rarityMatch[1];
          holoType = rarityMatch[2];
        }
        const edSetMatch = line.match(/^(Unlimited|1st Edition|Shadowless|1999-2000 Print|Worlds Promo|Staff Prerelease|Stamp Promo|National Championships|Top Sixteen Worlds Promo)\s*-\s*(.+)$/i);
        if (edSetMatch) {
          edition = edSetMatch[1];
          setName = edSetMatch[2];
        }
      }
      if (!name || priceGBP === 0) return;
      const $img = $el.find("img");
      const imageUrl = $img.first().attr("src") || "";
      topCards.push({
        rank,
        name,
        number,
        rarity,
        holoType,
        edition,
        setName,
        priceGBP,
        url: href.startsWith("http") ? href : `${BASE_URL}${href}`,
        imageUrl
      });
    });
    setCache(cacheKey, topCards);
    return topCards;
  } catch (error) {
    console.error(`Failed to scrape top cards:`, error);
    throw error;
  }
}
async function scrapeCardSearch(query) {
  const cacheKey = `search-${query.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  try {
    const html = await fetchPage(`${BASE_URL}/search/?q=${encodeURIComponent(query)}`);
    const $ = cheerio.load(html);
    const cards = [];
    $("a[href*='/cards/']").each((_, el) => {
      const $el = $(el);
      const href = $el.attr("href") || "";
      if (!href.includes("/cards/")) return;
      const text2 = $el.text().trim();
      const lines = text2.split("\n").map((l) => l.trim()).filter(Boolean);
      let name = "";
      let number = "";
      let holoType = "";
      let rarity = "";
      let edition = "";
      let setName = "";
      let priceGBP = null;
      const nameNumMatch = lines[0]?.match(/^(.+?)\s*-\s*(\S+)/);
      if (nameNumMatch) {
        name = nameNumMatch[1].trim();
        number = nameNumMatch[2];
      }
      for (const line of lines) {
        if (line.match(/^(Non-Holo|Holo|Reverse Holo)$/i)) {
          holoType = line;
        }
        if (line.match(/NM\/M Value:/i)) {
          priceGBP = parsePrice(line);
        }
        const rarityEdMatch = line.match(/^(.+?)\s*-\s*(Unlimited|1st Edition|Shadowless|Poke Ball|Master Ball|Stamp Promo)$/i);
        if (rarityEdMatch && !rarity) {
          rarity = rarityEdMatch[1];
          edition = rarityEdMatch[2];
        }
      }
      const slugParts = href.replace(/^\/cards\//, "").replace(/\/$/, "").split("/")[0] || "";
      if (!holoType) {
        if (slugParts.includes("holo-reverse") || slugParts.includes("reverse-holo")) holoType = "Reverse Holo";
        else if (slugParts.includes("non-holo")) holoType = "Non-Holo";
        else if (slugParts.includes("holo")) holoType = "Holo";
      }
      if (!edition) {
        if (slugParts.includes("1st-edition")) edition = "1st Edition";
        else if (slugParts.includes("shadowless")) edition = "Shadowless";
        else if (slugParts.includes("unlimited")) edition = "Unlimited";
      }
      if (!setName) {
        const setMatch = slugParts.match(/(?:unlimited|shadowless|1st-edition|holo|non-holo|reverse-holo)-(.+)$/);
        if (setMatch) {
          setName = setMatch[1].replace(/-\d+$/, "").split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        }
      }
      if (!name) return;
      const $source = $el.find("source[data-srcset]").first();
      const $img = $el.find("img");
      const imageUrl = $source.attr("data-srcset") || $img.first().attr("data-src") || $img.first().attr("src") || "";
      cards.push({
        name,
        number,
        holoType,
        rarity,
        edition,
        priceGBP,
        url: href.startsWith("http") ? href : `${BASE_URL}${href}`,
        setName,
        setId: "",
        imageUrl
      });
    });
    setCache(cacheKey, cards);
    return cards;
  } catch (error) {
    console.error(`Failed to search cards:`, error);
    return [];
  }
}
function generateEbaySearchUrl(cardName, setName, number) {
  let query = `pokemon card ${cardName}`;
  if (setName) query += ` ${setName}`;
  if (number) query += ` ${number}`;
  return `https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(query)}&_sacat=183454&LH_PrefLoc=1`;
}
function generateEbaySoldUrl(cardName, setName, number) {
  let query = `pokemon card ${cardName}`;
  if (setName) query += ` ${setName}`;
  if (number) query += ` ${number}`;
  return `https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(query)}&_sacat=183454&LH_PrefLoc=1&LH_Complete=1&LH_Sold=1`;
}

// server/storage.ts
import { randomBytes, randomUUID } from "crypto";
import { Pool } from "pg";
var pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
var PgStorage = class {
  async createUser(user) {
    const id = randomUUID();
    const result = await pool.query(
      `INSERT INTO pokescan_users (id, username, display_name, email, mobile_number, password_hash, auth_provider, is_premium, role, avatar_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        id,
        user.username.toLowerCase().trim(),
        user.displayName.trim(),
        user.email.toLowerCase().trim(),
        user.mobileNumber?.trim() || "",
        user.passwordHash || null,
        user.authProvider || "local",
        user.isPremium || false,
        user.role || "user",
        user.avatarUrl || null
      ]
    );
    return mapRow(result.rows[0]);
  }
  async importUser(user) {
    const existing = await pool.query("SELECT id FROM pokescan_users WHERE email = $1", [user.email.toLowerCase().trim()]);
    if (existing.rows.length > 0) return { status: "skipped" };
    await pool.query(
      `INSERT INTO pokescan_users (id, username, display_name, email, mobile_number, password_hash, auth_provider, is_premium, role, avatar_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (email) DO NOTHING`,
      [
        user.id,
        user.username.toLowerCase().trim(),
        user.displayName.trim(),
        user.email.toLowerCase().trim(),
        user.mobileNumber?.trim() || "",
        user.passwordHash || null,
        user.authProvider || "local",
        user.isPremium || false,
        user.role || "user",
        user.avatarUrl || null
      ]
    );
    return { status: "created" };
  }
  async getUserById(id) {
    const result = await pool.query(
      "SELECT * FROM pokescan_users WHERE id = $1",
      [id]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }
  async getUserByEmail(email) {
    const result = await pool.query(
      "SELECT * FROM pokescan_users WHERE email = $1",
      [email.toLowerCase().trim()]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }
  async getUserByMobile(mobile) {
    const normalized = normalizeMobile(mobile);
    const result = await pool.query(
      "SELECT * FROM pokescan_users WHERE mobile_number = $1 OR mobile_number = $2",
      [mobile.trim(), normalized]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }
  async getUserByUsername(username) {
    const result = await pool.query(
      "SELECT * FROM pokescan_users WHERE username = $1",
      [username.toLowerCase().trim()]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }
  async getAllUsers() {
    const result = await pool.query(
      "SELECT * FROM pokescan_users ORDER BY created_at DESC"
    );
    return result.rows.map(mapRow);
  }
  async updateUser(id, fields) {
    const sets = [];
    const values = [];
    let idx = 1;
    if (fields.isPremium !== void 0) {
      sets.push(`is_premium = $${idx++}`);
      values.push(fields.isPremium);
    }
    if (fields.role !== void 0) {
      sets.push(`role = $${idx++}`);
      values.push(fields.role);
    }
    if (fields.avatarUrl !== void 0) {
      sets.push(`avatar_url = $${idx++}`);
      values.push(fields.avatarUrl);
    }
    if (fields.displayName !== void 0) {
      sets.push(`display_name = $${idx++}`);
      values.push(fields.displayName);
    }
    if (fields.email !== void 0) {
      sets.push(`email = $${idx++}`);
      values.push(fields.email.toLowerCase().trim());
    }
    if (fields.mobileNumber !== void 0) {
      sets.push(`mobile_number = $${idx++}`);
      values.push(fields.mobileNumber.trim());
    }
    if (sets.length === 0) return this.getUserById(id);
    values.push(id);
    const result = await pool.query(
      `UPDATE pokescan_users SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }
  async setPassword(userId, passwordHash) {
    await pool.query(
      "UPDATE pokescan_users SET password_hash = $1 WHERE id = $2",
      [passwordHash, userId]
    );
  }
  async createSession(userId) {
    const token = randomBytes(32).toString("hex");
    await pool.query(
      `INSERT INTO pokescan_sessions (token, user_id, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [token, userId]
    );
    return token;
  }
  async validateSession(token) {
    const result = await pool.query(
      `SELECT u.* FROM pokescan_users u
       JOIN pokescan_sessions s ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }
  async deleteSession(token) {
    await pool.query("DELETE FROM pokescan_sessions WHERE token = $1", [token]);
  }
  async deleteAllUserSessions(userId) {
    await pool.query("DELETE FROM pokescan_sessions WHERE user_id = $1", [userId]);
  }
};
function mapRow(row) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    email: row.email,
    mobileNumber: row.mobile_number,
    passwordHash: row.password_hash,
    authProvider: row.auth_provider,
    isPremium: row.is_premium,
    role: row.role,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at
  };
}
function normalizeMobile(mobile) {
  const digits = mobile.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) {
    return "+44" + digits.slice(1);
  }
  if (!mobile.startsWith("+")) {
    return "+" + digits;
  }
  return mobile.trim();
}
var storage = new PgStorage();

// server/otp-service.ts
import { randomInt } from "crypto";
import nodemailer from "nodemailer";
var otpStore = /* @__PURE__ */ new Map();
var rateLimitStore = /* @__PURE__ */ new Map();
var MAX_OTP_ATTEMPTS = 5;
var RATE_LIMIT_WINDOW = 60 * 1e3;
var RATE_LIMIT_MAX = 3;
function generateOtp() {
  return randomInt(1e5, 999999).toString();
}
function normalizeCredential(credential) {
  return credential.toLowerCase().trim();
}
function isRateLimited(key) {
  const entry = rateLimitStore.get(key);
  if (!entry) return false;
  if (Date.now() - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitStore.delete(key);
    return false;
  }
  return entry.count >= RATE_LIMIT_MAX;
}
function recordRateLimit(key) {
  const entry = rateLimitStore.get(key);
  if (!entry || Date.now() - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitStore.set(key, { count: 1, windowStart: Date.now() });
  } else {
    entry.count++;
  }
}
function createOtp(credential) {
  const key = normalizeCredential(credential);
  if (isRateLimited(key)) {
    return { code: "", rateLimited: true };
  }
  recordRateLimit(key);
  const code = generateOtp();
  otpStore.set(key, {
    code,
    expiresAt: Date.now() + 10 * 60 * 1e3,
    credential: key,
    attempts: 0
  });
  return { code, rateLimited: false };
}
function verifyOtp(credential, code) {
  const key = normalizeCredential(credential);
  const entry = otpStore.get(key);
  if (!entry) return { valid: false, expired: true, tooManyAttempts: false };
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(key);
    return { valid: false, expired: true, tooManyAttempts: false };
  }
  if (entry.attempts >= MAX_OTP_ATTEMPTS) {
    otpStore.delete(key);
    return { valid: false, expired: false, tooManyAttempts: true };
  }
  entry.attempts++;
  if (entry.code !== code.trim()) {
    return { valid: false, expired: false, tooManyAttempts: false };
  }
  otpStore.delete(key);
  return { valid: true, expired: false, tooManyAttempts: false };
}
function createEmailTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    return null;
  }
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}
async function sendOtpByEmail(email, code) {
  const transporter = createEmailTransport();
  if (!transporter) {
    console.log(`[OTP] No SMTP configured. Code for ${email}: ${code}`);
    return true;
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: "Your PokeScan Verification Code",
      text: `Your PokeScan verification code is: ${code}

This code expires in 10 minutes.`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #CC0000;">PokeScan Verification</h2>
          <p>Your one-time verification code is:</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #CC0000; padding: 16px; background: #FFF0F0; border-radius: 8px; text-align: center;">${code}</div>
          <p style="color: #666; font-size: 13px; margin-top: 16px;">This code expires in 10 minutes. Do not share it with anyone.</p>
        </div>
      `
    });
    return true;
  } catch (err) {
    console.error("Failed to send OTP email:", err);
    console.log(`[OTP] Email failed. Code for ${email}: ${code}`);
    return true;
  }
}
async function sendOtpBySms(mobile, code) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !fromNumber) {
    console.log(`[OTP] No SMS configured. Code for ${mobile}: ${code}`);
    return true;
  }
  try {
    const { default: twilio } = await import("twilio");
    const client = twilio(accountSid, authToken);
    await client.messages.create({
      body: `Your PokeScan verification code is: ${code}. Expires in 10 minutes.`,
      from: fromNumber,
      to: mobile
    });
    return true;
  } catch (err) {
    console.error("Failed to send OTP SMS:", err);
    console.log(`[OTP] SMS failed. Code for ${mobile}: ${code}`);
    return true;
  }
}
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of otpStore.entries()) {
    if (now > entry.expiresAt) otpStore.delete(key);
  }
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW * 2) rateLimitStore.delete(key);
  }
}, 5 * 60 * 1e3);

// server/routes.ts
init_db();
init_schema();
import { eq as eq2, desc, sql as sql3, ilike, or, and as and2, ne } from "drizzle-orm";

// server/card-sync.ts
init_db();
init_schema();
import { eq, inArray, sql as sql2 } from "drizzle-orm";
import * as cheerio2 from "cheerio";
var POKEMON_API = "https://api.pokemontcg.io/v2";
var PRICE_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1e3;
var EBAY_THROTTLE_MS = 2e3;
var GBP_THROTTLE_MS = 1e3;
var TCG_REQUEST_DELAY_MS = 200;
var syncRunning = false;
var priceRefreshTimer = null;
var SYNC_STATUS_ID = 1;
async function getOrCreateSyncStatus() {
  const rows = await db.select().from(syncStatus).where(eq(syncStatus.id, SYNC_STATUS_ID)).limit(1);
  if (rows.length === 0) {
    const inserted = await db.insert(syncStatus).values({ id: SYNC_STATUS_ID, totalSets: 0, syncedSets: 0, totalCards: 0, syncedCards: 0, isRunning: false }).onConflictDoNothing().returning();
    if (inserted.length > 0) return inserted[0];
    const refetched = await db.select().from(syncStatus).where(eq(syncStatus.id, SYNC_STATUS_ID)).limit(1);
    return refetched[0];
  }
  return rows[0];
}
async function updateSyncStatus(patch) {
  await db.insert(syncStatus).values({ id: SYNC_STATUS_ID, ...patch }).onConflictDoUpdate({
    target: syncStatus.id,
    set: { ...patch, updatedAt: /* @__PURE__ */ new Date() }
  });
}
function buildTcgHeaders() {
  const headers = { "User-Agent": "PokeScanTCG/1.0" };
  const key = process.env.POKEMON_TCG_API_KEY;
  if (key) headers["X-Api-Key"] = key;
  return headers;
}
async function fetchJson(url, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2e4);
    try {
      const res = await fetch(url, { headers: buildTcgHeaders(), signal: controller.signal });
      clearTimeout(timer);
      if (res.status === 429 || res.status === 503 || res.status === 504) {
        if (attempt < retries) {
          await sleep(1e4 * (attempt + 1));
          continue;
        }
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return res.json();
    } catch (err) {
      clearTimeout(timer);
      if (attempt < retries && (err.name === "AbortError" || err.message?.includes("fetch"))) {
        await sleep(5e3 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`fetchJson exhausted retries for ${url}`);
}
function sleep(ms) {
  return new Promise((resolve2) => setTimeout(resolve2, ms));
}
async function syncAllSets() {
  console.log("[CardSync] Fetching all sets from Pokemon TCG API...");
  const responseData = await fetchJson(`${POKEMON_API}/sets?orderBy=-releaseDate&pageSize=250`);
  const sets = responseData.data ?? [];
  console.log(`[CardSync] Got ${sets.length} sets.`);
  await updateSyncStatus({ totalSets: sets.length });
  for (const set of sets) {
    try {
      await db.insert(pokemonSets).values({
        id: set.id,
        name: set.name,
        series: set.series ?? "",
        printedTotal: set.printedTotal ?? null,
        total: set.total ?? null,
        releaseDate: set.releaseDate ?? null,
        logoUrl: set.images?.logo ?? null,
        symbolUrl: set.images?.symbol ?? null,
        imageUrl: set.images?.logo ?? null,
        syncedAt: /* @__PURE__ */ new Date()
      }).onConflictDoUpdate({
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
          syncedAt: /* @__PURE__ */ new Date()
        }
      });
    } catch (err) {
      console.error(`[CardSync] Failed to upsert set ${set.id}:`, err);
    }
  }
}
async function syncCardsForSet(setId, setName, force = false) {
  let allCards = [];
  let page = 1;
  while (true) {
    const data = await fetchJson(
      `${POKEMON_API}/cards?q=set.id:${setId}&orderBy=number&page=${page}&pageSize=250`
    );
    const typed = data;
    const cards = typed.data ?? [];
    allCards = allCards.concat(cards);
    if (allCards.length >= (typed.totalCount ?? 0) || cards.length < 250) break;
    page++;
  }
  let existingIds = /* @__PURE__ */ new Set();
  if (!force && allCards.length > 0) {
    const ids = allCards.map((c) => c.id);
    const existing = await db.select({ id: pokemonCards.id }).from(pokemonCards).where(inArray(pokemonCards.id, ids));
    existingIds = new Set(existing.map((r) => r.id));
  }
  let inserted = 0;
  for (const card of allCards) {
    const alreadySynced = !force && existingIds.has(card.id);
    try {
      await db.insert(pokemonCards).values({
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
        nationalPokedexNumbers: card.nationalPokedexNumbers ? card.nationalPokedexNumbers.join(",") : null,
        syncedAt: /* @__PURE__ */ new Date()
      }).onConflictDoUpdate({
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
          nationalPokedexNumbers: card.nationalPokedexNumbers ? card.nationalPokedexNumbers.join(",") : null,
          syncedAt: /* @__PURE__ */ new Date()
        }
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
async function syncPricingForCard(card) {
  const tcgp = card.tcgplayer?.prices;
  const cm = card.cardmarket?.prices;
  const tcgNormal = tcgp?.normal ?? tcgp?.holofoil ?? tcgp?.["1stEditionNormal"] ?? tcgp?.["1stEditionHolofoil"] ?? null;
  const tcgLow = tcgNormal?.low ?? null;
  const tcgMid = tcgNormal?.mid ?? null;
  const tcgHigh = tcgNormal?.high ?? null;
  const tcgMarket = tcgNormal?.market ?? null;
  const tcgDirectLow = tcgNormal?.directLow ?? null;
  const cardmarketAvg = cm?.averageSellPrice ?? cm?.avg1 ?? null;
  const cardmarketLow = cm?.lowPrice ?? null;
  const cardmarketTrend = cm?.trendPrice ?? null;
  try {
    await db.insert(cardPricing).values({
      cardId: card.id,
      tcgLow,
      tcgMid,
      tcgHigh,
      tcgMarket,
      tcgDirectLow,
      cardmarketAvg,
      cardmarketLow,
      cardmarketTrend,
      updatedAt: /* @__PURE__ */ new Date()
    }).onConflictDoUpdate({
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
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
  } catch (err) {
    console.error(`[CardSync] Failed to upsert pricing for card ${card.id}:`, err);
  }
}
async function syncGbpPricingForCard(cardId, cardName, cardNumber) {
  try {
    const results = await scrapeCardSearch(cardName);
    if (!results || results.length === 0) return;
    const numOnly = String(cardNumber).split("/")[0].replace(/^0+/, "");
    const match = results.find((c) => {
      const cNum = String(c.number).split("/")[0].replace(/^0+/, "");
      return cNum === numOnly;
    }) ?? results[0];
    if (!match || match.priceGBP === null) return;
    await db.insert(cardPricing).values({ cardId, priceGBP: match.priceGBP, updatedAt: /* @__PURE__ */ new Date() }).onConflictDoUpdate({
      target: cardPricing.cardId,
      set: { priceGBP: match.priceGBP, updatedAt: /* @__PURE__ */ new Date() }
    });
  } catch (err) {
    console.error(`[CardSync] GBP price sync failed for card ${cardId}:`, err);
  }
}
async function scrapeEbayListings(url, isSold) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-GB,en;q=0.9"
      }
    });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio2.load(html);
    const listings = [];
    $(".s-item").each((_, el) => {
      const $el = $(el);
      const title = $el.find(".s-item__title").text().trim();
      if (!title || title === "Shop on eBay") return;
      const priceText = $el.find(".s-item__price").text().trim();
      const priceMatch = priceText.match(/[£$€]([\d,]+\.?\d*)/);
      if (!priceMatch) return;
      const price = parseFloat(priceMatch[1].replace(",", ""));
      const currency = priceText.startsWith("\xA3") ? "GBP" : priceText.startsWith("$") ? "USD" : "EUR";
      const soldDate = $el.find(".s-item__caption--row, .POSITIVE, .s-item__endedDate").first().text().trim();
      const listingUrl = $el.find("a.s-item__link").attr("href") ?? "";
      listings.push({ title, price, currency, soldDate, listingUrl, isSold });
    });
    return listings;
  } catch (err) {
    console.error("[CardSync] eBay scrape error:", err);
    return [];
  }
}
async function syncEbayPricesForCard(cardId, cardName, setName, cardNumber) {
  try {
    const soldUrl = generateEbaySoldUrl(cardName, setName, cardNumber);
    const activeUrl = generateEbaySearchUrl(cardName, setName, cardNumber);
    const [soldListings, activeListings] = await Promise.all([
      scrapeEbayListings(soldUrl, true),
      scrapeEbayListings(activeUrl, false)
    ]);
    const allListings = [...soldListings.slice(0, 10), ...activeListings.slice(0, 5)];
    if (allListings.length === 0) return;
    const existingRows = await db.select({ listingUrl: ebayPrices.listingUrl, isSold: ebayPrices.isSold }).from(ebayPrices).where(eq(ebayPrices.cardId, cardId));
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
        fetchedAt: /* @__PURE__ */ new Date()
      });
      existingKeys.add(key);
    }
  } catch (err) {
    console.error(`[CardSync] eBay sync failed for card ${cardId}:`, err);
  }
}
async function runFullSync(force = false) {
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
      lastCardSyncAt: /* @__PURE__ */ new Date(),
      totalCards: totalSynced,
      syncedCards: totalSynced
    });
    console.log(`[CardSync] Full sync complete. ${totalSynced} cards across ${syncedSetsCount} sets.`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[CardSync] Sync failed:", err);
    await updateSyncStatus({ isRunning: false, lastError: msg });
  } finally {
    syncRunning = false;
  }
}
async function runPriceRefresh() {
  console.log("[CardSync] Starting pricing refresh...");
  try {
    const allSets = await db.select({ id: pokemonSets.id, name: pokemonSets.name }).from(pokemonSets);
    for (const set of allSets) {
      const cards = await db.select({
        id: pokemonCards.id,
        name: pokemonCards.name,
        number: pokemonCards.number,
        rarity: pokemonCards.rarity,
        setId: pokemonCards.setId
      }).from(pokemonCards).where(eq(pokemonCards.setId, set.id));
      for (const card of cards) {
        try {
          const apiData = await fetchJson(`${POKEMON_API}/cards/${card.id}`);
          const typed = apiData;
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
    await updateSyncStatus({ lastPriceSyncAt: /* @__PURE__ */ new Date() });
    console.log("[CardSync] Pricing refresh complete.");
  } catch (err) {
    console.error("[CardSync] Pricing refresh error:", err);
  }
}
async function runFastCardSeed() {
  console.log("[CardSync] Starting fast card seed (basic data, no pricing)...");
  const allSets = await db.select({ id: pokemonSets.id, name: pokemonSets.name }).from(pokemonSets);
  const alreadySeededRows = await db.select({ setId: pokemonCards.setId }).from(pokemonCards).groupBy(pokemonCards.setId);
  const alreadySeeded = new Set(alreadySeededRows.map((r) => r.setId));
  const sets = allSets.filter((s) => !alreadySeeded.has(s.id));
  console.log(`[CardSync] ${alreadySeeded.size} sets already seeded, ${sets.length} remaining...`);
  let totalInserted = 0;
  const NO_CARD_PREFIXES = [];
  for (const set of sets) {
    if (NO_CARD_PREFIXES.some((p) => set.id.startsWith(p))) {
      console.log(`[CardSync] Skipped set ${set.id} (regional set, no TCG API cards)`);
      await sleep(200);
      continue;
    }
    try {
      let allCards = [];
      let page = 1;
      while (true) {
        let pageData = null;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 12e3);
        try {
          const res = await fetch(
            `${POKEMON_API}/cards?q=set.id:${set.id}&orderBy=number&page=${page}&pageSize=250`,
            { headers: buildTcgHeaders(), signal: ctrl.signal }
          );
          clearTimeout(timer);
          if (res.status === 429) {
            console.log(`[CardSync] Rate limited for ${set.id}, waiting 20s...`);
            await sleep(2e4);
          } else if (res.ok) {
            const ct = res.headers.get("content-type") || "";
            if (ct.includes("application/json")) {
              pageData = await res.json();
            }
          }
        } catch (fetchErr) {
          clearTimeout(timer);
          if (fetchErr.name === "AbortError") {
            console.log(`[CardSync] Timeout for ${set.id} page ${page}, skipping set`);
          }
        }
        if (!pageData) break;
        const cards = pageData.data ?? [];
        allCards = allCards.concat(cards);
        if (allCards.length >= (pageData.totalCount ?? 0) || cards.length < 250) break;
        page++;
        await sleep(1500);
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
            nationalPokedexNumbers: card.nationalPokedexNumbers ? card.nationalPokedexNumbers.join(",") : null,
            syncedAt: /* @__PURE__ */ new Date()
          }).onConflictDoNothing();
          totalInserted++;
        } catch {
        }
      }
      if (allCards.length > 0) {
        console.log(`[CardSync] Fast seeded ${allCards.length} cards for set ${set.id} (${set.name})`);
      } else {
        console.log(`[CardSync] Skipped set ${set.id} (no cards available)`);
      }
      await sleep(5e3);
    } catch (err) {
      console.error(`[CardSync] Fast seed error for set ${set.id}:`, err);
      await sleep(1e3);
    }
  }
  await updateSyncStatus({ totalCards: totalInserted, syncedCards: totalInserted, lastCardSyncAt: /* @__PURE__ */ new Date() });
  console.log(`[CardSync] Fast card seed complete \u2014 ${totalInserted} cards in DB.`);
}
async function startSyncService() {
  console.log("[CardSync] Sync service starting...");
  if (priceRefreshTimer) clearInterval(priceRefreshTimer);
  priceRefreshTimer = setInterval(() => {
    runPriceRefresh().catch(
      (err) => console.error("[CardSync] Price refresh interval error:", err)
    );
  }, PRICE_REFRESH_INTERVAL_MS);
  setTimeout(async () => {
    try {
      const [totalSetRows, seededSetRows] = await Promise.all([
        db.select({ count: sql2`count(*)::int` }).from(pokemonSets),
        db.select({ count: sql2`count(distinct set_id)::int` }).from(pokemonCards)
      ]);
      const totalSets = totalSetRows[0]?.count ?? 0;
      const seededSets = seededSetRows[0]?.count ?? 0;
      if (totalSets === 0) {
        console.log("[CardSync] DB empty \u2014 seeding sets first...");
        await syncAllSets();
        console.log("[CardSync] Sets seeded. Starting fast card seed in background...");
        runFastCardSeed().catch(console.error);
      } else if (seededSets < Math.floor(totalSets * 0.8)) {
        console.log(`[CardSync] Only ${seededSets}/${totalSets} sets seeded \u2014 resuming fast card seed...`);
        runFastCardSeed().catch(console.error);
      } else {
        console.log(`[CardSync] DB seeded: ${seededSets}/${totalSets} sets with cards \u2014 OK.`);
      }
    } catch (err) {
      console.error("[CardSync] Auto-seed check failed:", err);
    }
  }, 5e3);
}
async function getSyncStatus() {
  return getOrCreateSyncStatus();
}

// server/routes.ts
var openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
});
var POKEMON_API2 = "https://api.pokemontcg.io/v2";
function tcgHeaders() {
  const h = { "User-Agent": "PokeScanTCG/1.0" };
  if (process.env.POKEMON_TCG_API_KEY) h["X-Api-Key"] = process.env.POKEMON_TCG_API_KEY;
  return h;
}
var setCardsMemCache = /* @__PURE__ */ new Map();
var MEM_CACHE_TTL_MS = 20 * 60 * 1e3;
function getMemCache(key) {
  const e = setCardsMemCache.get(key);
  return e && Date.now() - e.ts < MEM_CACHE_TTL_MS ? e.data : null;
}
function setMemCache(key, data) {
  setCardsMemCache.set(key, { data, ts: Date.now() });
}
var cardMemCache = /* @__PURE__ */ new Map();
function getCardCache(id) {
  const e = cardMemCache.get(id);
  return e && Date.now() - e.ts < MEM_CACHE_TTL_MS ? e.data : null;
}
function setCardCache(id, data) {
  cardMemCache.set(id, { data, ts: Date.now() });
}
function warmCardCache(cards) {
  for (const card of cards) {
    if (card?.id && !cardMemCache.has(card.id)) {
      setCardCache(card.id, { data: card });
    }
  }
}
function dbSetToApiFormat(set) {
  return {
    id: set.id,
    name: set.name,
    series: set.series,
    printedTotal: set.printedTotal,
    total: set.total,
    releaseDate: set.releaseDate,
    images: {
      symbol: set.symbolUrl,
      logo: set.logoUrl
    }
  };
}
function dbCardToApiFormat(card, pricing, ebay) {
  const base = {
    id: card.id,
    name: card.name,
    number: card.number,
    rarity: card.rarity,
    supertype: card.supertype,
    subtypes: card.subtypes ? card.subtypes.split(",") : [],
    images: {
      small: card.imageSmall,
      large: card.imageLarge
    },
    artist: card.artist,
    hp: card.hp,
    set: { id: card.setId }
  };
  if (pricing) {
    base.tcgplayer = {
      prices: {
        normal: {
          low: pricing.tcgLow,
          mid: pricing.tcgMid,
          high: pricing.tcgHigh,
          market: pricing.tcgMarket,
          directLow: pricing.tcgDirectLow
        }
      }
    };
    base.cardmarket = {
      prices: {
        averageSellPrice: pricing.cardmarketAvg,
        lowPrice: pricing.cardmarketLow,
        trendPrice: pricing.cardmarketTrend
      }
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
      isSold: e.isSold
    }));
  }
  return base;
}
async function registerRoutes(app2) {
  startSyncService();
  app2.get("/api/pokemon/sets", async (_req, res) => {
    try {
      const dbSets = await db.select().from(pokemonSets).orderBy(desc(pokemonSets.releaseDate));
      if (dbSets.length > 0) {
        res.json({ data: dbSets.map(dbSetToApiFormat), count: dbSets.length, source: "db" });
        return;
      }
    } catch (dbError) {
      console.error("DB sets query failed, falling back to API:", dbError);
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1e4);
      const response = await fetch(`${POKEMON_API2}/sets?orderBy=-releaseDate&pageSize=250`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`TCG API returned ${response.status}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Failed to fetch sets:", error);
      res.status(500).json({ error: "Failed to fetch sets" });
    }
  });
  app2.get("/api/pokemon/sets/:setId/cards", async (req, res) => {
    try {
      const { setId } = req.params;
      const page = parseInt(req.query.page || "1", 10);
      const pageSize = parseInt(req.query.pageSize || "250", 10);
      const offset = (page - 1) * pageSize;
      const cacheKey = `${setId}:${page}:${pageSize}`;
      const memHit = getMemCache(cacheKey);
      if (memHit) {
        res.json(memHit);
        return;
      }
      try {
        const [totalCountResult, setInfoResult] = await Promise.all([
          db.select({ count: sql3`count(*)::int` }).from(pokemonCards).where(eq2(pokemonCards.setId, setId)),
          db.select({ total: pokemonSets.total }).from(pokemonSets).where(eq2(pokemonSets.id, setId)).limit(1)
        ]);
        const totalCount = totalCountResult[0]?.count ?? 0;
        const expectedTotal = setInfoResult[0]?.total ?? 0;
        const fullySeeded = totalCount > 0 && (expectedTotal === 0 || totalCount >= Math.floor(expectedTotal * 0.9));
        if (fullySeeded) {
          const dbCards = await db.select().from(pokemonCards).where(eq2(pokemonCards.setId, setId)).orderBy(pokemonCards.number).limit(pageSize).offset(offset);
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
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3e4);
      const response = await fetch(
        `${POKEMON_API2}/cards?q=set.id:${setId}&orderBy=number&page=${page}&pageSize=${pageSize}`,
        { signal: controller.signal, headers: tcgHeaders() }
      );
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`TCG API ${response.status}`);
      const data = await response.json();
      setMemCache(cacheKey, data);
      warmCardCache(data.data || []);
      res.json(data);
      (async () => {
        try {
          let bgPage = 1;
          let seeded = 0;
          while (true) {
            const ctrl2 = new AbortController();
            const t2 = setTimeout(() => ctrl2.abort(), 3e4);
            const r2 = await fetch(
              `${POKEMON_API2}/cards?q=set.id:${setId}&orderBy=number&page=${bgPage}&pageSize=250`,
              { signal: ctrl2.signal }
            );
            clearTimeout(t2);
            if (!r2.ok) break;
            const d2 = await r2.json();
            const cards2 = d2.data || [];
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
                  imageLarge: card.images?.large || null
                }).onConflictDoNothing();
              } catch {
              }
            }
            seeded += cards2.length;
            if (cards2.length < 250) break;
            bgPage++;
          }
          if (seeded > 0) {
            console.log(`[BgSeed] Seeded ${seeded} cards for set ${setId}`);
            for (const k of setCardsMemCache.keys()) {
              if (k.startsWith(`${setId}:`)) setCardsMemCache.delete(k);
            }
          }
        } catch (bgErr) {
        }
      })();
    } catch (error) {
      if (error?.name === "AbortError") {
        res.status(504).json({ error: "Cards took too long to load. Please try again." });
      } else {
        console.error("Failed to fetch set cards:", error);
        res.status(500).json({ error: "Failed to fetch cards. Please try again." });
      }
    }
  });
  app2.get("/api/pokemon/cards/search", async (req, res) => {
    try {
      const query = req.query.q;
      if (!query || query.trim().length < 2) {
        res.json({ data: [], count: 0, totalCount: 0 });
        return;
      }
      const page = parseInt(String(req.query.page || "1"), 10);
      const pageSize = 20;
      const offset = (page - 1) * pageSize;
      try {
        const dbResults = await db.select({ card: pokemonCards, set: pokemonSets }).from(pokemonCards).leftJoin(pokemonSets, eq2(pokemonCards.setId, pokemonSets.id)).where(ilike(pokemonCards.name, `%${query.trim()}%`)).orderBy(desc(pokemonSets.releaseDate)).limit(pageSize).offset(offset);
        if (dbResults.length > 0) {
          const formatted = dbResults.map(({ card, set }) => {
            const base = dbCardToApiFormat(card, null);
            if (set) {
              base.set = {
                id: set.id,
                name: set.name,
                series: set.series ?? void 0,
                printedTotal: set.printedTotal,
                total: set.total,
                releaseDate: set.releaseDate,
                images: { symbol: set.symbolUrl, logo: set.logoUrl }
              };
            }
            return base;
          });
          const totalCountResult = await db.select({ count: sql3`count(*)::int` }).from(pokemonCards).where(ilike(pokemonCards.name, `%${query.trim()}%`));
          const totalCount = totalCountResult[0]?.count ?? formatted.length;
          res.json({ data: formatted, count: formatted.length, totalCount, source: "db" });
          return;
        }
      } catch (dbErr) {
        console.error("DB card search failed, falling back to API:", dbErr);
      }
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12e3);
      try {
        const encodedQuery = encodeURIComponent(`name:"${query.trim()}*"`);
        const response = await fetch(
          `${POKEMON_API2}/cards?q=${encodedQuery}&orderBy=-set.releaseDate&page=${page}&pageSize=${pageSize}`,
          { signal: ctrl.signal, headers: tcgHeaders() }
        );
        clearTimeout(timer);
        const text2 = await response.text();
        if (!response.ok) {
          console.error(`Pokemon TCG API error ${response.status}: ${text2.substring(0, 200)}`);
          res.json({ data: [], count: 0, totalCount: 0 });
          return;
        }
        const data = JSON.parse(text2);
        res.json(data);
      } catch (apiErr) {
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
  app2.get("/api/pokemon/sets/:setId/all-cards", async (req, res) => {
    try {
      const { setId } = req.params;
      const setInfoResult = await db.select({ total: pokemonSets.total }).from(pokemonSets).where(eq2(pokemonSets.id, setId)).limit(1);
      const expectedTotal = setInfoResult[0]?.total ?? 0;
      const dbCards = await db.select().from(pokemonCards).where(eq2(pokemonCards.setId, setId)).orderBy(pokemonCards.number);
      const fullySeeded = dbCards.length > 0 && (expectedTotal === 0 || dbCards.length >= Math.floor(expectedTotal * 0.9));
      if (fullySeeded) {
        const pricingRows = await Promise.all(
          dbCards.map(
            (c) => db.select().from(cardPricing).where(eq2(cardPricing.cardId, c.id)).limit(1)
          )
        );
        const formattedCards = dbCards.map(
          (card, i) => dbCardToApiFormat(card, pricingRows[i][0] ?? null)
        );
        res.json({ data: formattedCards, count: formattedCards.length, source: "db" });
        return;
      }
      let allCards = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const response = await fetch(
          `${POKEMON_API2}/cards?q=set.id:${setId}&orderBy=number&page=${page}&pageSize=250`
        );
        const text2 = await response.text();
        if (!response.ok) break;
        try {
          const data = JSON.parse(text2);
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
  app2.get("/api/pokemon/cards/find", async (req, res) => {
    try {
      const name = req.query.name;
      const number = req.query.number;
      const setId = req.query.setId;
      if (!name) {
        res.status(400).json({ error: "name is required" });
        return;
      }
      let query = `name:"${name}"`;
      if (setId) query += ` set.id:${setId}`;
      const encodedQuery = encodeURIComponent(query);
      const text2 = await fetch(
        `${POKEMON_API2}/cards?q=${encodedQuery}&orderBy=-set.releaseDate&pageSize=20`
      ).then((r) => r.text()).catch(() => null);
      if (!text2) {
        res.json({ data: null });
        return;
      }
      let cards = [];
      try {
        const data = JSON.parse(text2);
        cards = data.data || [];
      } catch {
        res.json({ data: null });
        return;
      }
      if (number && cards.length > 1) {
        const numOnly = String(number).split("/")[0].replace(/^0+/, "");
        const exact = cards.filter((c) => {
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
  app2.get("/api/pokemon/cards/:cardId", async (req, res) => {
    try {
      const { cardId } = req.params;
      const cached = getCardCache(cardId);
      if (cached) {
        res.json(cached);
        return;
      }
      const dbCard = await db.select().from(pokemonCards).where(eq2(pokemonCards.id, cardId)).limit(1);
      if (dbCard.length > 0) {
        const pricing = await db.select().from(cardPricing).where(eq2(cardPricing.cardId, cardId)).limit(1);
        const ebayData = await db.select().from(ebayPrices).where(eq2(ebayPrices.cardId, cardId)).orderBy(desc(ebayPrices.fetchedAt)).limit(10);
        const formattedCard = dbCardToApiFormat(dbCard[0], pricing[0] ?? null, ebayData);
        const setData = await db.select().from(pokemonSets).where(eq2(pokemonSets.id, dbCard[0].setId)).limit(1);
        if (setData.length > 0) {
          formattedCard.set = dbSetToApiFormat(setData[0]);
        }
        res.json({ data: formattedCard, source: "db" });
        return;
      }
      const cardAbort = new AbortController();
      const cardTimeout = setTimeout(() => cardAbort.abort(), 15e3);
      let response;
      try {
        response = await fetch(`${POKEMON_API2}/cards/${cardId}`, { signal: cardAbort.signal });
      } finally {
        clearTimeout(cardTimeout);
      }
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.includes("application/json")) {
        res.status(502).json({ error: "Card not available right now. Please try again." });
        return;
      }
      const data = await response.json();
      if (data?.data?.id) {
        setCardCache(data.data.id, data);
      }
      res.json(data);
    } catch (error) {
      if (error?.name === "AbortError") {
        res.status(504).json({ error: "Card took too long to load. Please try again." });
        return;
      }
      console.error("Failed to fetch card:", error);
      res.status(500).json({ error: "Failed to fetch card" });
    }
  });
  app2.get("/api/sync/status", async (_req, res) => {
    try {
      const status = await getSyncStatus();
      res.json({ data: status });
    } catch (error) {
      console.error("Failed to get sync status:", error);
      res.status(500).json({ error: "Failed to get sync status" });
    }
  });
  app2.post("/api/sync/trigger", async (req, res) => {
    try {
      const syncSecret = process.env.SYNC_SECRET;
      const authHeader = req.headers["x-sync-secret"];
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
  app2.get("/api/pcv/sets", async (_req, res) => {
    try {
      const sets = await scrapeSets();
      res.json({ data: sets, count: sets.length });
    } catch (error) {
      console.error("Failed to scrape PCV sets:", error);
      res.status(500).json({ error: "Failed to fetch UK card sets" });
    }
  });
  app2.get("/api/pcv/sets/:setId/:slug/cards", async (req, res) => {
    try {
      const { setId, slug } = req.params;
      const cards = await scrapeSetCards(setId, slug);
      res.json({ data: cards, count: cards.length });
    } catch (error) {
      console.error("Failed to scrape PCV set cards:", error);
      res.status(500).json({ error: "Failed to fetch UK card data" });
    }
  });
  app2.get("/api/pcv/top/:condition", async (req, res) => {
    try {
      const { condition } = req.params;
      const topCards = await scrapeTopCards(condition);
      res.json({ data: topCards, count: topCards.length });
    } catch (error) {
      console.error("Failed to scrape PCV top cards:", error);
      res.status(500).json({ error: "Failed to fetch top valued cards" });
    }
  });
  app2.get("/api/pcv/search", async (req, res) => {
    try {
      const query = req.query.q;
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
  app2.get("/api/ebay/search-url", (req, res) => {
    const cardName = req.query.cardName;
    const setName = req.query.setName;
    const number = req.query.number;
    if (!cardName) {
      res.status(400).json({ error: "cardName is required" });
      return;
    }
    res.json({
      searchUrl: generateEbaySearchUrl(cardName, setName, number),
      soldUrl: generateEbaySoldUrl(cardName, setName, number)
    });
  });
  app2.post("/api/identify-card", express.json({ limit: "10mb" }), async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        res.status(400).json({ error: "imageBase64 is required" });
        return;
      }
      let response;
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
  "originalName": "\u30D4\u30AB\u30C1\u30E5\u30A6",
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
          max_completion_tokens: 500
        });
        const timeoutPromise = new Promise(
          (_, reject) => setTimeout(() => reject(Object.assign(new Error("AI identification timed out. Please try again."), { isTimeout: true })), 3e4)
        );
        response = await Promise.race([aiPromise, timeoutPromise]);
      } catch (aiErr) {
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
      let pcvResults = [];
      try {
        pcvResults = await scrapeCardSearch(identification.englishName);
        if (identification.cardNumber && pcvResults.length > 1) {
          const numberOnly = identification.cardNumber.split("/")[0].replace(/^0+/, "");
          const filtered = pcvResults.filter((c) => {
            const cNum = c.number?.split("/")[0].replace(/^0+/, "");
            return cNum === numberOnly;
          });
          if (filtered.length > 0) pcvResults = filtered;
        }
      } catch (e) {
        console.error("PCV search after identification failed:", e);
      }
      let tcgApiResults = [];
      try {
        const cardName = identification.englishName?.trim();
        if (cardName && cardName.length >= 2) {
          const dbMatches = await db.select({ card: pokemonCards, set: pokemonSets }).from(pokemonCards).leftJoin(pokemonSets, eq2(pokemonCards.setId, pokemonSets.id)).where(ilike(pokemonCards.name, `%${cardName}%`)).orderBy(desc(pokemonSets.releaseDate)).limit(10);
          if (dbMatches.length > 0) {
            let formatted = dbMatches.map(({ card, set }) => {
              const base = dbCardToApiFormat(card, null);
              if (set) {
                base.set = {
                  id: set.id,
                  name: set.name,
                  series: set.series ?? void 0,
                  printedTotal: set.printedTotal,
                  total: set.total,
                  releaseDate: set.releaseDate,
                  images: { symbol: set.symbolUrl, logo: set.logoUrl }
                };
              }
              return base;
            });
            if (identification.cardNumber && formatted.length > 1) {
              const numOnly = identification.cardNumber.split("/")[0].replace(/^0+/, "");
              const exactMatch = formatted.filter((c) => {
                const cn = String(c.number).replace(/^0+/, "");
                return cn === numOnly;
              });
              if (exactMatch.length > 0) formatted = exactMatch;
            }
            tcgApiResults = formatted;
          }
        }
      } catch (dbErr) {
        console.error("DB card search after identification failed:", dbErr);
      }
      if (tcgApiResults.length === 0) {
        try {
          const encodedQuery = encodeURIComponent(`name:"${identification.englishName}"`);
          const apiCtrl = new AbortController();
          const apiTimer = setTimeout(() => apiCtrl.abort(), 1e4);
          const tcgRes = await fetch(
            `${POKEMON_API2}/cards?q=${encodedQuery}&orderBy=-set.releaseDate&pageSize=10`,
            { signal: apiCtrl.signal, headers: tcgHeaders() }
          );
          clearTimeout(apiTimer);
          if (tcgRes.ok) {
            const tcgData = await tcgRes.json();
            tcgApiResults = tcgData.data || [];
            if (identification.cardNumber && tcgApiResults.length > 1) {
              const numOnly = identification.cardNumber.split("/")[0].replace(/^0+/, "");
              const exactMatch = tcgApiResults.filter((c) => {
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
        tcgApiResults: tcgApiResults.slice(0, 10)
      });
    } catch (error) {
      console.error("Card identification failed:", error);
      res.status(500).json({ error: error.message || "Failed to identify card" });
    }
  });
  app2.post("/api/auth/register", async (req, res) => {
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
        avatarUrl: null
      });
      const token = await storage.createSession(user.id);
      const { passwordHash: _ph, ...safeUser } = user;
      res.json({ token, user: safeUser });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ error: error.message || "Registration failed" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
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
      const { passwordHash: _ph, ...safeUser } = user;
      res.json({ token, user: safeUser });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: error.message || "Login failed" });
    }
  });
  app2.post("/api/auth/send-otp", async (req, res) => {
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
    } catch (error) {
      console.error("Send OTP error:", error);
      res.status(500).json({ error: error.message || "Failed to send OTP" });
    }
  });
  app2.post("/api/auth/send-otp-register", async (req, res) => {
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
      let targetCredential;
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
    } catch (error) {
      console.error("Send OTP register error:", error);
      res.status(500).json({ error: error.message || "Failed to send OTP" });
    }
  });
  app2.post("/api/auth/verify-otp", async (req, res) => {
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
    } catch (error) {
      console.error("Verify OTP error:", error);
      res.status(500).json({ error: error.message || "Verification failed" });
    }
  });
  app2.post("/api/auth/session", async (req, res) => {
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
    } catch (error) {
      console.error("Session validation error:", error);
      res.status(500).json({ error: error.message || "Session validation failed" });
    }
  });
  app2.post("/api/auth/logout", async (req, res) => {
    try {
      const { token } = req.body;
      if (token) {
        await storage.deleteSession(token);
      }
      res.json({ message: "Logged out" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: error.message || "Logout failed" });
    }
  });
  app2.post("/api/user/avatar", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      const { base64, mimeType } = req.body;
      if (!base64 || typeof base64 !== "string") {
        res.status(400).json({ error: "base64 image data required" });
        return;
      }
      if (base64.length > 1572864) {
        res.status(400).json({ error: "Image too large. Please choose a smaller image." });
        return;
      }
      const dataUrl = `data:${mimeType || "image/jpeg"};base64,${base64}`;
      const updated = await storage.updateUser(user.id, { avatarUrl: dataUrl });
      if (!updated) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json({ avatarUrl: dataUrl });
    } catch (error) {
      console.error("Avatar upload error:", error);
      res.status(500).json({ error: error.message || "Upload failed" });
    }
  });
  app2.get("/api/auth/users", async (req, res) => {
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
      if (!caller || caller.role !== "admin" && caller.role !== "moderator") {
        res.status(403).json({ error: "Insufficient permissions" });
        return;
      }
      const users2 = await storage.getAllUsers();
      res.json({ users: users2 });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: error.message || "Failed to get users" });
    }
  });
  app2.put("/api/auth/users/:userId", async (req, res) => {
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
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ error: error.message || "Update failed" });
    }
  });
  app2.patch("/api/admin/edit-user", async (req, res) => {
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
      const profileUpdates = {};
      if (displayName !== void 0 && displayName.trim()) profileUpdates.displayName = displayName.trim();
      if (email !== void 0 && email.trim()) profileUpdates.email = email.trim().toLowerCase();
      if (mobileNumber !== void 0) profileUpdates.mobileNumber = mobileNumber.trim();
      if (isPremium !== void 0) profileUpdates.isPremium = isPremium;
      if (role !== void 0) profileUpdates.role = role;
      if (Object.keys(profileUpdates).length === 0 && !password) {
        res.status(400).json({ error: "No fields to update" });
        return;
      }
      let updated = Object.keys(profileUpdates).length > 0 ? await storage.updateUser(userId, profileUpdates) : await storage.getUserById(userId);
      if (!updated) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      if (password !== void 0 && password.trim().length >= 6) {
        const passwordHash = await bcrypt.hash(password.trim(), 10);
        await storage.setPassword(userId, passwordHash);
      }
      const { passwordHash: _ph, ...safeUser } = updated;
      res.json({ user: safeUser });
    } catch (error) {
      console.error("Admin edit-user error:", error);
      res.status(500).json({ error: error.message || "Update failed" });
    }
  });
  app2.post("/api/admin/create-user", async (req, res) => {
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
        avatarUrl: null
      });
      const { passwordHash: _ph, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (error) {
      console.error("Admin create-user error:", error);
      res.status(500).json({ error: error.message || "Create user failed" });
    }
  });
  app2.get("/api/admin/users", async (req, res) => {
    try {
      const pwd = req.query.superadminPassword;
      if (pwd !== process.env.SUPERADMIN_PASSWORD && pwd !== "killer89!") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const users2 = await storage.getAllUsers();
      res.json({ users: users2 });
    } catch (error) {
      console.error("Admin get-users error:", error);
      res.status(500).json({ error: error.message || "Failed to get users" });
    }
  });
  app2.delete("/api/admin/delete-user", async (req, res) => {
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
      await db.delete(pokescanSessions).where(eq2(pokescanSessions.userId, userId));
      const deleted = await db.delete(pokescanUsers).where(eq2(pokescanUsers.id, userId)).returning();
      if (!deleted.length) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json({ success: true, userId });
    } catch (error) {
      console.error("Admin delete-user error:", error);
      res.status(500).json({ error: error.message || "Delete failed" });
    }
  });
  app2.post("/api/admin/scrydex-sync", async (req, res) => {
    try {
      const { superadminPassword } = req.body;
      if (superadminPassword !== process.env.SUPERADMIN_PASSWORD && superadminPassword !== "killer89!") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      const send = (data) => {
        res.write(`data: ${JSON.stringify(data)}

`);
      };
      const { runScrydexSync: runScrydexSync2 } = await Promise.resolve().then(() => (init_scrydex_scraper(), scrydex_scraper_exports));
      const result = await runScrydexSync2((progress) => {
        send(progress);
      });
      send({ ...result, done: true });
      res.end();
    } catch (error) {
      console.error("Scrydex sync error:", error);
      try {
        res.write(
          `data: ${JSON.stringify({ phase: "error", message: error.message || "Sync failed", done: true })}

`
        );
        res.end();
      } catch {
      }
    }
  });
  app2.get("/api/admin/scrydex-preview", async (req, res) => {
    try {
      const pw = req.query.superadminPassword;
      if (pw !== process.env.SUPERADMIN_PASSWORD && pw !== "killer89!") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const { scrapeScrydexSets: scrapeScrydexSets2, scrapeScrydexTcgPocketSets: scrapeScrydexTcgPocketSets2 } = await Promise.resolve().then(() => (init_scrydex_scraper(), scrydex_scraper_exports));
      const [enSets, pocketSets] = await Promise.all([
        scrapeScrydexSets2(),
        scrapeScrydexTcgPocketSets2()
      ]);
      const allSetsMap = /* @__PURE__ */ new Map();
      for (const s of [...enSets, ...pocketSets]) {
        if (!allSetsMap.has(s.id)) allSetsMap.set(s.id, s);
      }
      const allSets = [...allSetsMap.values()];
      const existingRes = await pool2.query("SELECT id FROM pokemon_sets");
      const existingIds = new Set(existingRes.rows.map((r) => r.id));
      const missingSets = allSets.filter((s) => !existingIds.has(s.id));
      res.json({
        scrydexSetCount: allSets.length,
        dbSetCount: existingIds.size,
        newSetsFound: missingSets.length,
        newSets: missingSets.map((s) => ({ id: s.id, name: s.name, series: s.series }))
      });
    } catch (error) {
      res.status(500).json({ error: error.message || "Preview failed" });
    }
  });
  app2.post("/api/admin/import-users", async (req, res) => {
    try {
      const { superadminPassword, users: users2 } = req.body;
      if (superadminPassword !== process.env.SUPERADMIN_PASSWORD && superadminPassword !== "killer89!") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (!Array.isArray(users2) || users2.length === 0) {
        res.status(400).json({ error: "users array required" });
        return;
      }
      const results = [];
      for (const u of users2) {
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
            avatarUrl: u.avatarUrl || null
          });
          results.push({ username: u.username, status: result.status });
        } catch (err) {
          results.push({ username: u.username, status: "error", reason: err.message });
        }
      }
      res.json({ results });
    } catch (error) {
      console.error("Admin import-users error:", error);
      res.status(500).json({ error: error.message || "Import failed" });
    }
  });
  async function getUserFromToken(req) {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return null;
    const user = await storage.validateSession(token);
    if (!user) return null;
    return { id: user.id, username: user.username, displayName: user.displayName };
  }
  app2.get("/api/social/friends", async (req, res) => {
    const me = await getUserFromToken(req);
    if (!me) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const rows = await db.select().from(pokescanFriendships).where(
      or(eq2(pokescanFriendships.requesterId, me.id), eq2(pokescanFriendships.addresseeId, me.id))
    );
    const friendIds = /* @__PURE__ */ new Set();
    for (const r of rows) {
      if (r.status === "accepted") {
        friendIds.add(r.requesterId === me.id ? r.addresseeId : r.requesterId);
      }
    }
    const friends = friendIds.size > 0 ? await db.select({ id: pokescanUsers.id, username: pokescanUsers.username, displayName: pokescanUsers.displayName, avatarUrl: pokescanUsers.avatarUrl }).from(pokescanUsers).where(or(...[...friendIds].map((id) => eq2(pokescanUsers.id, id)))) : [];
    const pendingReceived = rows.filter((r) => r.addresseeId === me.id && r.status === "pending");
    const pendingSent = rows.filter((r) => r.requesterId === me.id && r.status === "pending");
    const pendingUsers = pendingReceived.length > 0 ? await db.select({ id: pokescanUsers.id, username: pokescanUsers.username, displayName: pokescanUsers.displayName, avatarUrl: pokescanUsers.avatarUrl }).from(pokescanUsers).where(or(...pendingReceived.map((r) => eq2(pokescanUsers.id, r.requesterId)))) : [];
    const sentUsers = pendingSent.length > 0 ? await db.select({ id: pokescanUsers.id, username: pokescanUsers.username, displayName: pokescanUsers.displayName, avatarUrl: pokescanUsers.avatarUrl }).from(pokescanUsers).where(or(...pendingSent.map((r) => eq2(pokescanUsers.id, r.addresseeId)))) : [];
    res.json({ friends, pendingReceived: pendingUsers, pendingSent: sentUsers });
  });
  app2.post("/api/social/friend-request", async (req, res) => {
    const me = await getUserFromToken(req);
    if (!me) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { targetUserId } = req.body;
    if (!targetUserId || targetUserId === me.id) {
      res.status(400).json({ error: "Invalid target" });
      return;
    }
    const existing = await db.select().from(pokescanFriendships).where(
      or(
        and2(eq2(pokescanFriendships.requesterId, me.id), eq2(pokescanFriendships.addresseeId, targetUserId)),
        and2(eq2(pokescanFriendships.requesterId, targetUserId), eq2(pokescanFriendships.addresseeId, me.id))
      )
    );
    if (existing.length > 0) {
      res.status(400).json({ error: "Request already exists" });
      return;
    }
    const [row] = await db.insert(pokescanFriendships).values({ requesterId: me.id, addresseeId: targetUserId, status: "pending" }).returning();
    res.json({ friendship: row });
  });
  app2.post("/api/social/friend-respond", async (req, res) => {
    const me = await getUserFromToken(req);
    if (!me) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { requesterId, action } = req.body;
    if (!requesterId || !["accept", "decline"].includes(action)) {
      res.status(400).json({ error: "Bad request" });
      return;
    }
    const rows = await db.select().from(pokescanFriendships).where(
      and2(eq2(pokescanFriendships.requesterId, requesterId), eq2(pokescanFriendships.addresseeId, me.id), eq2(pokescanFriendships.status, "pending"))
    );
    if (!rows.length) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    if (action === "accept") {
      await db.update(pokescanFriendships).set({ status: "accepted" }).where(eq2(pokescanFriendships.id, rows[0].id));
      res.json({ status: "accepted" });
    } else {
      await db.delete(pokescanFriendships).where(eq2(pokescanFriendships.id, rows[0].id));
      res.json({ status: "declined" });
    }
  });
  app2.delete("/api/social/friend-remove", async (req, res) => {
    const me = await getUserFromToken(req);
    if (!me) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { friendId } = req.body;
    await db.delete(pokescanFriendships).where(
      or(
        and2(eq2(pokescanFriendships.requesterId, me.id), eq2(pokescanFriendships.addresseeId, friendId)),
        and2(eq2(pokescanFriendships.requesterId, friendId), eq2(pokescanFriendships.addresseeId, me.id))
      )
    );
    res.json({ success: true });
  });
  app2.get("/api/social/user-search", async (req, res) => {
    const me = await getUserFromToken(req);
    if (!me) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const q = (req.query.q || "").trim();
    if (q.length < 2) {
      res.json({ users: [] });
      return;
    }
    const users2 = await db.select({ id: pokescanUsers.id, username: pokescanUsers.username, displayName: pokescanUsers.displayName, avatarUrl: pokescanUsers.avatarUrl }).from(pokescanUsers).where(and2(ne(pokescanUsers.id, me.id), or(ilike(pokescanUsers.username, `%${q}%`), ilike(pokescanUsers.displayName, `%${q}%`)))).limit(20);
    res.json({ users: users2 });
  });
  app2.get("/api/social/messages/inbox", async (req, res) => {
    const me = await getUserFromToken(req);
    if (!me) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const rows = await db.select({
      id: pokescanMessages.id,
      subject: pokescanMessages.subject,
      body: pokescanMessages.body,
      isRead: pokescanMessages.isRead,
      createdAt: pokescanMessages.createdAt,
      senderId: pokescanMessages.senderId,
      senderUsername: pokescanUsers.username,
      senderDisplayName: pokescanUsers.displayName,
      senderAvatarUrl: pokescanUsers.avatarUrl
    }).from(pokescanMessages).innerJoin(pokescanUsers, eq2(pokescanMessages.senderId, pokescanUsers.id)).where(and2(eq2(pokescanMessages.recipientId, me.id), eq2(pokescanMessages.deletedByRecipient, false))).orderBy(desc(pokescanMessages.createdAt));
    res.json({ messages: rows });
  });
  app2.get("/api/social/messages/sent", async (req, res) => {
    const me = await getUserFromToken(req);
    if (!me) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const rows = await db.select({
      id: pokescanMessages.id,
      subject: pokescanMessages.subject,
      body: pokescanMessages.body,
      isRead: pokescanMessages.isRead,
      createdAt: pokescanMessages.createdAt,
      recipientId: pokescanMessages.recipientId,
      recipientUsername: pokescanUsers.username,
      recipientDisplayName: pokescanUsers.displayName,
      recipientAvatarUrl: pokescanUsers.avatarUrl
    }).from(pokescanMessages).innerJoin(pokescanUsers, eq2(pokescanMessages.recipientId, pokescanUsers.id)).where(and2(eq2(pokescanMessages.senderId, me.id), eq2(pokescanMessages.deletedBySender, false))).orderBy(desc(pokescanMessages.createdAt));
    res.json({ messages: rows });
  });
  app2.get("/api/social/messages/unread-count", async (req, res) => {
    const me = await getUserFromToken(req);
    if (!me) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const result = await db.select({ count: sql3`count(*)::int` }).from(pokescanMessages).where(and2(eq2(pokescanMessages.recipientId, me.id), eq2(pokescanMessages.isRead, false), eq2(pokescanMessages.deletedByRecipient, false)));
    res.json({ count: result[0]?.count ?? 0 });
  });
  app2.post("/api/social/messages/send", async (req, res) => {
    const me = await getUserFromToken(req);
    if (!me) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { recipientId, subject, body } = req.body;
    if (!recipientId || !body?.trim()) {
      res.status(400).json({ error: "recipientId and body required" });
      return;
    }
    const target = await storage.getUserById(recipientId);
    if (!target) {
      res.status(404).json({ error: "Recipient not found" });
      return;
    }
    const [msg] = await db.insert(pokescanMessages).values({
      senderId: me.id,
      recipientId,
      subject: (subject || "").trim(),
      body: body.trim()
    }).returning();
    res.json({ message: msg });
  });
  app2.patch("/api/social/messages/:id/read", async (req, res) => {
    const me = await getUserFromToken(req);
    if (!me) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    await db.update(pokescanMessages).set({ isRead: true }).where(
      and2(eq2(pokescanMessages.id, req.params.id), eq2(pokescanMessages.recipientId, me.id))
    );
    res.json({ success: true });
  });
  app2.delete("/api/social/messages/:id", async (req, res) => {
    const me = await getUserFromToken(req);
    if (!me) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const [msg] = await db.select().from(pokescanMessages).where(eq2(pokescanMessages.id, req.params.id));
    if (!msg) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (msg.senderId === me.id) {
      await db.update(pokescanMessages).set({ deletedBySender: true }).where(eq2(pokescanMessages.id, msg.id));
    } else if (msg.recipientId === me.id) {
      await db.update(pokescanMessages).set({ deletedByRecipient: true }).where(eq2(pokescanMessages.id, msg.id));
    }
    res.json({ success: true });
  });
  app2.post("/api/social/report", async (req, res) => {
    const me = await getUserFromToken(req);
    if (!me) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { contentType, contentId, reason, contentSnapshot, reportedUserId } = req.body;
    if (!contentType || !contentId || !reason?.trim()) {
      res.status(400).json({ error: "contentType, contentId, and reason are required" });
      return;
    }
    const existing = await db.select().from(pokescanReports).where(
      and2(eq2(pokescanReports.reporterId, me.id), eq2(pokescanReports.contentId, contentId), eq2(pokescanReports.status, "pending"))
    );
    if (existing.length > 0) {
      res.status(400).json({ error: "You already reported this content" });
      return;
    }
    const [report] = await db.insert(pokescanReports).values({
      reporterId: me.id,
      reportedUserId: reportedUserId || null,
      contentType,
      contentId,
      reason: reason.trim(),
      contentSnapshot: contentSnapshot ? JSON.stringify(contentSnapshot) : null
    }).returning();
    res.json({ report });
  });
  app2.get("/api/admin/reports", async (req, res) => {
    const pw = req.query.superadminPassword;
    const token = req.headers.authorization?.replace("Bearer ", "");
    let isAuthorized = pw === "killer89!";
    if (!isAuthorized && token) {
      const user = await storage.validateSession(token);
      if (user && (user.role === "admin" || user.role === "moderator")) isAuthorized = true;
    }
    if (!isAuthorized) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
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
      reporterUsername: sql3`r_user.username`,
      reporterDisplayName: sql3`r_user.display_name`,
      reportedUserUsername: sql3`ru_user.username`,
      reportedUserDisplayName: sql3`ru_user.display_name`,
      reviewedByUsername: sql3`rev_user.username`
    }).from(pokescanReports).leftJoin(sql3`pokescan_users AS r_user`, sql3`r_user.id = pokescan_reports.reporter_id`).leftJoin(sql3`pokescan_users AS ru_user`, sql3`ru_user.id = pokescan_reports.reported_user_id`).leftJoin(sql3`pokescan_users AS rev_user`, sql3`rev_user.id = pokescan_reports.reviewed_by`).orderBy(desc(pokescanReports.createdAt));
    res.json({ reports });
  });
  app2.patch("/api/admin/reports/:id", async (req, res) => {
    const pw = req.body.superadminPassword;
    const token = req.headers.authorization?.replace("Bearer ", "");
    let reviewerId = null;
    let isAuthorized = pw === "killer89!";
    if (!isAuthorized && token) {
      const user = await storage.validateSession(token);
      if (user && (user.role === "admin" || user.role === "moderator")) {
        isAuthorized = true;
        reviewerId = user.id;
      }
    }
    if (!isAuthorized) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { status, reviewNote } = req.body;
    if (!["reviewed", "dismissed"].includes(status)) {
      res.status(400).json({ error: "status must be 'reviewed' or 'dismissed'" });
      return;
    }
    const [updated] = await db.update(pokescanReports).set({
      status,
      reviewNote: reviewNote?.trim() || null,
      reviewedBy: reviewerId || null,
      reviewedAt: /* @__PURE__ */ new Date()
    }).where(eq2(pokescanReports.id, req.params.id)).returning();
    if (!updated) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    res.json({ report: updated });
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/index.ts
import * as fs from "fs";
import * as path from "path";
var app = express2();
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express2.json({
      limit: "10mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express2.urlencoded({ extended: false, limit: "10mb" }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path2 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path2.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  app2.use("/assets", express2.static(path.resolve(process.cwd(), "assets")));
  app2.use(express2.static(path.resolve(process.cwd(), "static-build")));
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
}
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`express server serving on port ${port}`);
    }
  );
})();
