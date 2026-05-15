import * as cheerio from "cheerio";
import {
  normalizeFinishType,
  normalizeEdition,
} from "./utils/card-normalizers";
const BASE_URL = "https://pokecardvalues.co.uk";
const CDN_BASE = "https://doujkbm8mih0s.cloudfront.net/static/images/alt";

export interface PCVSet {
  id: string;
  slug: string;
  name: string;
  series: string;
  releaseDate: string;
  cardCount: number;
  logoUrl: string;
  symbolUrl: string;
  url: string;
}

export interface PCVCard {
  name: string;
  number: string;

  holoType: string;
  rarity: string;
  edition: string;

  normalizedFinishType: string;
  normalizedEditionType: string;

  priceGBP: number | null;

  url: string;

  setName: string;
  setId: string;

  imageUrl: string;
}

export interface PCVTopCard {
  rank: number;
  name: string;
  number: string;
  rarity: string;
  holoType: string;
  edition: string;
  setName: string;
  priceGBP: number;
  url: string;
  imageUrl: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 1000 * 60 * 60;
const cache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; PokeScanTCG/1.0)",
      "Accept": "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

function parsePrice(text: string): number | null {
  const match = text.match(/£([\d,]+\.?\d*)/);
  if (!match) return null;
  return parseFloat(match[1].replace(",", ""));
}

const SERIES_ORDER = [
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
  "World Championships",
];

export async function scrapeSets(): Promise<PCVSet[]> {
  const cached = getCached<PCVSet[]>("sets");
  if (cached) return cached;

  try {
    const html = await fetchPage(`${BASE_URL}/sets/`);
    const $ = cheerio.load(html);
    const sets: PCVSet[] = [];

    $("a[href*='/sets/']").each((_, el) => {
      const $el = $(el);
      const href = $el.attr("href");
      if (!href || href === "/sets/" || href === `${BASE_URL}/sets/`) return;

      const urlMatch = href.match(/\/sets\/([^/]+)\/([^/]+)\/?$/);
      if (!urlMatch) return;

      const setId = urlMatch[1];
      const slug = urlMatch[2];

      const text = $el.text().trim();
      const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);

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
      $img.each((_, imgEl) => {
        const src = $(imgEl).attr("src") || "";
        if (src.includes("LOGOS")) logoUrl = src;
        else if (src.includes("SYMBOLS")) symbolUrl = src;
      });

      let series = "Other";
      for (const s of SERIES_ORDER) {
        if (href.toLowerCase().includes(s.toLowerCase().replace(/ /g, "-")) ||
            name.toLowerCase().includes(s.toLowerCase())) {
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
        url: `${BASE_URL}/sets/${setId}/${slug}/`,
      });
    });

    setCache("sets", sets);
    return sets;
  } catch (error) {
    console.error("Failed to scrape sets:", error);
    throw error;
  }
}

export async function scrapeSetCards(setId: string, slug: string): Promise<PCVCard[]> {
  const cacheKey = `set-cards-${setId}-${slug}`;
  const cached = getCached<PCVCard[]>(cacheKey);
  if (cached) return cached;

  try {
    const html = await fetchPage(`${BASE_URL}/sets/${setId}/${slug}/`);
    const $ = cheerio.load(html);
    const cards: PCVCard[] = [];

    const jsonLdItems: Array<{ name: string; url: string }> = [];
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
      } catch {}
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
      let priceGBP: number | null = null;

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
          if (parts.length >= 5) rarity = parts[4].trim().replace(" - Pokémon Card", "");
        }
      }

      const holoEdText = (holoEdDiv.length ? holoEdDiv : holoEdDivAlt).html() || "";
      const holoEdLines = holoEdText.split("<br>").map((l: string) => cheerio.load(l).text().trim()).filter(Boolean);

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
        const lines = fullText.split("\n").map((l: string) => l.trim()).filter(Boolean);
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

      if (!name) { cardIndex++; continue; }

      const $img = $el.find("img");
      const imageUrl = $img.first().attr("src") || "";

      cards.push({
        name,
        number,

        holoType,
        rarity,
        edition,

        normalizedFinishType:
          normalizeFinishType(holoType),

        normalizedEditionType:
          normalizeEdition(edition),

        priceGBP,

        url: href.startsWith("http")
          ? href
          : `${BASE_URL}${href}`,

        setName: slug.replace(/-/g, " "),

        setId,

        imageUrl,
      });

    setCache(cacheKey, cards);
    return cards;
  } catch (error) {
    console.error(`Failed to scrape set cards for ${setId}:`, error);
    throw error;
  }
}

export async function scrapeTopCards(condition: string = "ungraded"): Promise<PCVTopCard[]> {
  const cacheKey = `top-cards-${condition}`;
  const cached = getCached<PCVTopCard[]>(cacheKey);
  if (cached) return cached;

  try {
    const validConditions = ["ungraded", "psa8", "psa9", "psa10"];
    const cond = validConditions.includes(condition) ? condition : "ungraded";
    const html = await fetchPage(`${BASE_URL}/prices/${cond}/`);
    const $ = cheerio.load(html);
    const topCards: PCVTopCard[] = [];
    let rank = 0;

    $("a[href*='/cards/']").each((_, el) => {
      const $el = $(el);
      const href = $el.attr("href") || "";
      if (!href.includes("/cards/")) return;

      rank++;
      const text = $el.text().trim();
      const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);

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
        imageUrl,
      });
    });

    setCache(cacheKey, topCards);
    return topCards;
  } catch (error) {
    console.error(`Failed to scrape top cards:`, error);
    throw error;
  }
}

export async function scrapeCardSearch(query: string): Promise<PCVCard[]> {
  const cacheKey = `search-${query.toLowerCase()}`;
  const cached = getCached<PCVCard[]>(cacheKey);
  if (cached) return cached;

  try {
    const html = await fetchPage(`${BASE_URL}/search/?q=${encodeURIComponent(query)}`);
    const $ = cheerio.load(html);
    const cards: PCVCard[] = [];

    $("a[href*='/cards/']").each((_, el) => {
      const $el = $(el);
      const href = $el.attr("href") || "";
      if (!href.includes("/cards/")) return;

      const text = $el.text().trim();
      const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);

      let name = "";
      let number = "";
      let holoType = "";
      let rarity = "";
      let edition = "";
      let setName = "";
      let priceGBP: number | null = null;

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
          setName = setMatch[1].replace(/-\d+$/, "").split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
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
        imageUrl,
      });
    });

    setCache(cacheKey, cards);
    return cards;
  } catch (error) {
    console.error(`Failed to search cards:`, error);
    return [];
  }
}

export function generateEbaySearchUrl(cardName: string, setName?: string, number?: string): string {
  let query = `pokemon card ${cardName}`;
  if (setName) query += ` ${setName}`;
  if (number) query += ` ${number}`;
  return `https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(query)}&_sacat=183454&LH_PrefLoc=1`;
}

export function generateEbaySoldUrl(cardName: string, setName?: string, number?: string): string {
  let query = `pokemon card ${cardName}`;
  if (setName) query += ` ${setName}`;
  if (number) query += ` ${number}`;
  return `https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(query)}&_sacat=183454&LH_PrefLoc=1&LH_Complete=1&LH_Sold=1`;
}
