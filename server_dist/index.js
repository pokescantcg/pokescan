var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "node:http";
import express from "express";
import OpenAI from "openai";

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

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  cardPricing: () => cardPricing,
  ebayPrices: () => ebayPrices,
  insertUserSchema: () => insertUserSchema,
  pokemonCards: () => pokemonCards,
  pokemonSets: () => pokemonSets,
  syncStatus: () => syncStatus,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, real, timestamp, boolean, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var pokemonSets = pgTable("pokemon_sets", {
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
var pokemonCards = pgTable("pokemon_cards", {
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
var cardPricing = pgTable(
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
var ebayPrices = pgTable("ebay_prices", {
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
var syncStatus = pgTable("sync_status", {
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

// server/db.ts
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}
var pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
var db = drizzle(pool, { schema: schema_exports });

// server/routes.ts
import { eq as eq2, desc, sql as sql3 } from "drizzle-orm";

// server/card-sync.ts
import { eq, inArray } from "drizzle-orm";
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
    const inserted = await db.insert(syncStatus).values({ totalSets: 0, syncedSets: 0, totalCards: 0, syncedCards: 0, isRunning: false }).returning();
    return inserted[0];
  }
  return rows[0];
}
async function updateSyncStatus(patch) {
  const rows = await db.select({ id: syncStatus.id }).from(syncStatus).where(eq(syncStatus.id, SYNC_STATUS_ID)).limit(1);
  if (rows.length === 0) {
    await db.insert(syncStatus).values({ ...patch });
  } else {
    await db.update(syncStatus).set({ ...patch, updatedAt: /* @__PURE__ */ new Date() }).where(eq(syncStatus.id, SYNC_STATUS_ID));
  }
}
async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "PokeScanTCG/1.0" }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
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
async function startSyncService() {
  console.log("[CardSync] Sync service starting...");
  runFullSync(false).catch(
    (err) => console.error("[CardSync] Background sync error:", err)
  );
  if (priceRefreshTimer) clearInterval(priceRefreshTimer);
  priceRefreshTimer = setInterval(() => {
    runPriceRefresh().catch(
      (err) => console.error("[CardSync] Price refresh interval error:", err)
    );
  }, PRICE_REFRESH_INTERVAL_MS);
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
      const response = await fetch(`${POKEMON_API2}/sets?orderBy=-releaseDate&pageSize=250`);
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
      const pageSize = 50;
      const offset = (page - 1) * pageSize;
      const dbSet = await db.select({ id: pokemonSets.id }).from(pokemonSets).where(eq2(pokemonSets.id, setId)).limit(1);
      if (dbSet.length > 0) {
        const totalCountResult = await db.select({ count: sql3`count(*)::int` }).from(pokemonCards).where(eq2(pokemonCards.setId, setId));
        const totalCount = totalCountResult[0]?.count ?? 0;
        if (totalCount > 0) {
          const dbCards = await db.select().from(pokemonCards).where(eq2(pokemonCards.setId, setId)).orderBy(pokemonCards.number).limit(pageSize).offset(offset);
          const cardIds = dbCards.map((c) => c.id);
          const pricingRows = await Promise.all(
            cardIds.map(
              (id) => db.select().from(cardPricing).where(eq2(cardPricing.cardId, id)).limit(1)
            )
          );
          const pricingMap = /* @__PURE__ */ new Map();
          dbCards.forEach((card, i) => {
            if (pricingRows[i][0]) pricingMap.set(card.id, pricingRows[i][0]);
          });
          const formattedCards = dbCards.map(
            (card) => dbCardToApiFormat(card, pricingMap.get(card.id) ?? null)
          );
          res.json({
            data: formattedCards,
            count: formattedCards.length,
            totalCount,
            page,
            source: "db"
          });
          return;
        }
      }
      const response = await fetch(
        `${POKEMON_API2}/cards?q=set.id:${setId}&orderBy=number&page=${page}&pageSize=${pageSize}`
      );
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Failed to fetch set cards:", error);
      res.status(500).json({ error: "Failed to fetch cards" });
    }
  });
  app2.get("/api/pokemon/cards/search", async (req, res) => {
    try {
      const query = req.query.q;
      const page = req.query.page || "1";
      const encodedQuery = encodeURIComponent(`name:"${query}*"`);
      const response = await fetch(
        `${POKEMON_API2}/cards?q=${encodedQuery}&orderBy=-set.releaseDate&page=${page}&pageSize=20`
      );
      const text2 = await response.text();
      if (!response.ok) {
        console.error(`Pokemon TCG API error ${response.status}: ${text2.substring(0, 200)}`);
        res.json({ data: [], count: 0, totalCount: 0 });
        return;
      }
      try {
        const data = JSON.parse(text2);
        res.json(data);
      } catch {
        console.error("Pokemon TCG API returned non-JSON:", text2.substring(0, 200));
        res.json({ data: [], count: 0, totalCount: 0 });
      }
    } catch (error) {
      console.error("Failed to search cards:", error);
      res.json({ data: [], count: 0, totalCount: 0 });
    }
  });
  app2.get("/api/pokemon/sets/:setId/all-cards", async (req, res) => {
    try {
      const { setId } = req.params;
      const dbCards = await db.select().from(pokemonCards).where(eq2(pokemonCards.setId, setId)).orderBy(pokemonCards.number);
      if (dbCards.length > 0) {
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
      const response = await fetch(`${POKEMON_API2}/cards/${cardId}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
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
      const response = await openai.chat.completions.create({
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
                  url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 500
      });
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
        const encodedQuery = encodeURIComponent(`name:"${identification.englishName}"`);
        const tcgRes = await fetch(
          `${POKEMON_API2}/cards?q=${encodedQuery}&orderBy=-set.releaseDate&pageSize=10`
        );
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
