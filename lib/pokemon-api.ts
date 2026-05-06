import { getSessionToken } from "./storage";
import { BASE_URL } from "@/lib/api";

export interface PokemonSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  releaseDate: string;
  updatedAt: string;
  language?: "english" | "japanese" | "korean" | "chinese";
  images: {
    symbol: string;
    logo: string;
  };
}

export interface PokemonCardPrice {
  low: number | null;
  mid: number | null;
  high: number | null;
  market: number | null;
  directLow: number | null;
}

export interface PokemonCard {
  id: string;
  name: string;
  supertype: string;
  subtypes?: string[];
  hp?: string;
  types?: string[];
  number: string;
  artist?: string;
  rarity?: string;
  set: PokemonSet;
  images: {
    small: string;
    large: string;
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
  tcgplayer?: {
    url: string;
    updatedAt: string;
    prices: {
      normal?: PokemonCardPrice;
      holofoil?: PokemonCardPrice;
      reverseHolofoil?: PokemonCardPrice;
      "1stEditionHolofoil"?: PokemonCardPrice;
      "1stEditionNormal"?: PokemonCardPrice;
    };
  };
  cardmarket?: {
    url: string;
    updatedAt: string;
    prices: {
      averageSellPrice: number | null;
      lowPrice: number | null;
      trendPrice: number | null;
      germanProLow: number | null;
      suggestedPrice: number | null;
      reverseHoloSell: number | null;
      reverseHoloLow: number | null;
      reverseHoloTrend: number | null;
      lowPriceExPlus: number | null;
      avg1: number | null;
      avg7: number | null;
      avg30: number | null;
    };
  };
}

interface ApiResponse<T> {
  data: T;
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

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

export async function fetchSets(): Promise<PokemonSet[]> {
  const res = await fetch(`${BASE_URL}/api/pokemon/sets`);
  if (!res.ok) throw new Error("Failed to fetch sets");
  let json: any = { data: [] };
  try {
    json = await res.json();
  } catch {
    console.warn("Invalid JSON response");
  }
  return json.data;
}

export async function fetchSetCards(setId: string, page: number = 1): Promise<{ cards: PokemonCard[]; totalCount: number }> {
  const res = await fetch(`${BASE_URL}/api/pokemon/sets/${setId}/cards?page=${page}`);
  if (!res.ok) throw new Error("Failed to fetch cards");
  let json: any = { data: [], totalCount: 0 };
  try {
    json = await res.json();
  } catch {
    console.warn("Invalid JSON response");
  }
  return { cards: json.data, totalCount: json.totalCount };
}

export async function searchCards(query: string, page: number = 1): Promise<{ cards: PokemonCard[]; totalCount: number }> {
  // Try local cache first — avoids API calls when DB has been downloaded
  if (page === 1) {
    try {
      const { getCacheStatus, searchLocalCardsByQuery } = await import("./card-cache");
      const meta = await getCacheStatus();
      if (meta.cachedSets > 0) {
        const localResults = await searchLocalCardsByQuery(query, 30);
        if (localResults.length > 0) {
          const cards: PokemonCard[] = localResults.map((c) => ({
            id: c.id,
            name: c.name,
            number: c.number,
            supertype: c.supertype || "Pokémon",
            types: c.types,
            hp: c.hp,
            artist: c.artist,
            rarity: c.rarity,
            set: {
              id: c.setId,
              name: c.setName,
              series: "",
              printedTotal: 0,
              total: 0,
              releaseDate: "",
              updatedAt: "",
              images: { symbol: "", logo: "" },
            },
            images: { small: c.imageSmall, large: c.imageLarge },
          }));
          return { cards, totalCount: localResults.length };
        }
      }
    } catch {
      // fall through to API
    }
  }
  const res = await fetch(`${BASE_URL}/api/pokemon/cards/search?q=${encodeURIComponent(query)}&page=${page}`);
  if (!res.ok) throw new Error("Failed to search cards");
  let json: any = { data: [], totalCount: 0 };
  try {
    json = await res.json();
  } catch {
    console.warn("Invalid JSON response");
  }
  return { cards: json.data, totalCount: json.totalCount };
}

export async function fetchCard(cardId: string): Promise<PokemonCard> {
  const res = await fetch(`${BASE_URL}/api/pokemon/cards/${cardId}`);
  if (!res.ok) throw new Error("Failed to fetch card");
  let json: any = { data: {} };
  try {
    json = await res.json();
  } catch {
    console.warn("Invalid JSON response");
  }
  return json.data;
}

export async function findCard(name: string, number?: string, setId?: string): Promise<PokemonCard | null> {
  try {
    const { searchLocalCards } = await import("./card-cache");
    const cached = await searchLocalCards(name, number, setId);
    if (cached) {
      return {
        id: cached.id,
        name: cached.name,
        number: cached.number,
        supertype: cached.supertype || "Pokémon",
        types: cached.types,
        hp: cached.hp,
        artist: cached.artist,
        rarity: cached.rarity,
        set: {
          id: cached.setId,
          name: cached.setName,
          series: "",
          printedTotal: 0,
          total: 0,
          releaseDate: "",
          updatedAt: "",
          images: { symbol: "", logo: "" },
        },
        images: { small: cached.imageSmall, large: cached.imageLarge },
      } as PokemonCard;
    }
  } catch {}

  const params = new URLSearchParams({ name });
  if (number) params.set("number", number);
  if (setId) params.set("setId", setId);
  const res = await fetch(`${BASE_URL}/api/pokemon/cards/find?${params.toString()}`);
  if (!res.ok) return null;
  let json: any = { data: null };
  try {
    json = await res.json();
  } catch {
    console.warn("Invalid JSON response");
  }
  return json.data || null;
}

export async function fetchPCVSets(): Promise<PCVSet[]> {
  const res = await fetch(`${BASE_URL}/api/pcv/sets`);
  if (!res.ok) throw new Error("Failed to fetch UK sets");
  let json: any = { data: [] };
  try {
    json = await res.json();
  } catch {
    console.warn("Invalid JSON response");
  }
  return json.data;
}

export async function fetchPCVSetCards(setId: string, slug: string): Promise<PCVCard[]> {
  const res = await fetch(`${BASE_URL}/api/pcv/sets/${setId}/${slug}/cards`);
  if (!res.ok) throw new Error("Failed to fetch UK card data");
  let json: any = { data: [] };
  try {
    json = await res.json();
  } catch {
    console.warn("Invalid JSON response");
  }
  return json.data;
}

export async function fetchPCVTopCards(condition: string = "ungraded"): Promise<PCVTopCard[]> {
  const res = await fetch(`${BASE_URL}/api/pcv/top/${condition}`);
  if (!res.ok) throw new Error("Failed to fetch top UK cards");
  let json: any = { data: [] };
  try {
    json = await res.json();
  } catch {
    console.warn("Invalid JSON response");
  }
  return json.data;
}

export async function fetchPCVSearch(query: string): Promise<PCVCard[]> {
  const res = await fetch(`${BASE_URL}/api/pcv/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Failed to search UK cards");
  let json: any = { data: [] };
  try {
    json = await res.json();
  } catch {
    console.warn("Invalid JSON response");
  }
  return json.data;
}

export async function fetchEbayUrls(cardName: string, setName?: string, number?: string): Promise<{ searchUrl: string; soldUrl: string }> {
  const params = new URLSearchParams({ cardName });
  if (setName) params.set("setName", setName);
  if (number) params.set("number", number);
  const res = await fetch(`${BASE_URL}/api/ebay/search-url?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to get eBay URLs");
  let json: any = { searchUrl: "", soldUrl: "" };
  try {
    json = await res.json();
  } catch {
    console.warn("Invalid JSON response");
  }
  return json;
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

export function getUKPrice(card: PokemonCard): { price: number | null; source: string } {
  if (card.ebayListings && card.ebayListings.length > 0) {
    const soldPrices = card.ebayListings
      .filter((l) => l.isSold && l.price !== null && l.price !== undefined && l.price > 0 && (l.currency === "GBP" || !l.currency))
      .map((l) => l.price as number);
    if (soldPrices.length > 0) {
      const sorted = [...soldPrices].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      return { price: Math.round(median * 100) / 100, source: "eBay UK (Sold)" };
    }
  }
  if (card.cardmarket?.prices) {
    const p = card.cardmarket.prices;
    const price = p.trendPrice ?? p.averageSellPrice ?? p.lowPrice;
    if (price) return { price, source: "Cardmarket" };
  }
  if (card.tcgplayer?.prices) {
    const prices = card.tcgplayer.prices;
    const variant = prices.holofoil || prices.normal || prices.reverseHolofoil;
    if (variant?.market) {
      const gbpPrice = variant.market * 0.79;
      return { price: Math.round(gbpPrice * 100) / 100, source: "TCGPlayer (est.)" };
    }
  }
  return { price: null, source: "" };
}

export interface CardIdentification {
  englishName: string;
  cardNumber: string;
  setName: string;
  language: string;
  holoType: string;
  rarity: string;
  confidence: string;
  originalName: string;
  notes: string;
}

export interface IdentifyCardResult {
  identification: CardIdentification;
  pcvResults: PCVCard[];
  tcgApiResults: PokemonCard[];
}

export async function identifyCard(imageBase64: string): Promise<IdentifyCardResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const token = await getSessionToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/api/identify-card`, {
      method: "POST",
      headers,
      body: JSON.stringify({ imageBase64 }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      let errMsg = "Failed to identify card";
      let errBody: any = {};
      try {
        errBody = await res.json();
        errMsg = errBody.error || errMsg;
      } catch {
        const errText = await res.text().catch(() => "");
        errMsg = errText || errMsg;
      }
      const err: any = new Error(errMsg);
      if (res.status === 429) err.isQuotaExceeded = true;
      throw err;
    }
    return res.json();
  } catch (e: any) {
    clearTimeout(timeout);
    if (e.name === "AbortError") {
      throw new Error("Connection timed out. Please check your signal and try again.");
    }
    throw e;
  }
}

export function formatGBP(price: number | null): string {
  if (price === null || price === undefined) return "N/A";
  return `\u00A3${price.toFixed(2)}`;
}
