import { getApiUrl } from "./query-client";

export interface PokemonSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  releaseDate: string;
  updatedAt: string;
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

function apiBase(): string {
  return getApiUrl();
}

export async function fetchSets(): Promise<PokemonSet[]> {
  const base = apiBase();
  const res = await fetch(`${base}api/pokemon/sets`);
  if (!res.ok) throw new Error("Failed to fetch sets");
  const json: ApiResponse<PokemonSet[]> = await res.json();
  return json.data;
}

export async function fetchSetCards(setId: string, page: number = 1): Promise<{ cards: PokemonCard[]; totalCount: number }> {
  const base = apiBase();
  const res = await fetch(`${base}api/pokemon/sets/${setId}/cards?page=${page}`);
  if (!res.ok) throw new Error("Failed to fetch cards");
  const json: ApiResponse<PokemonCard[]> = await res.json();
  return { cards: json.data, totalCount: json.totalCount };
}

export async function searchCards(query: string, page: number = 1): Promise<{ cards: PokemonCard[]; totalCount: number }> {
  const base = apiBase();
  const res = await fetch(`${base}api/pokemon/cards/search?q=${encodeURIComponent(query)}&page=${page}`);
  if (!res.ok) throw new Error("Failed to search cards");
  const json: ApiResponse<PokemonCard[]> = await res.json();
  return { cards: json.data, totalCount: json.totalCount };
}

export async function fetchCard(cardId: string): Promise<PokemonCard> {
  const base = apiBase();
  const res = await fetch(`${base}api/pokemon/cards/${cardId}`);
  if (!res.ok) throw new Error("Failed to fetch card");
  const json = await res.json();
  return json.data;
}

export async function fetchPCVSets(): Promise<PCVSet[]> {
  const base = apiBase();
  const res = await fetch(`${base}api/pcv/sets`);
  if (!res.ok) throw new Error("Failed to fetch UK sets");
  const json = await res.json();
  return json.data;
}

export async function fetchPCVSetCards(setId: string, slug: string): Promise<PCVCard[]> {
  const base = apiBase();
  const res = await fetch(`${base}api/pcv/sets/${setId}/${slug}/cards`);
  if (!res.ok) throw new Error("Failed to fetch UK card data");
  const json = await res.json();
  return json.data;
}

export async function fetchPCVTopCards(condition: string = "ungraded"): Promise<PCVTopCard[]> {
  const base = apiBase();
  const res = await fetch(`${base}api/pcv/top/${condition}`);
  if (!res.ok) throw new Error("Failed to fetch top UK cards");
  const json = await res.json();
  return json.data;
}

export async function fetchPCVSearch(query: string): Promise<PCVCard[]> {
  const base = apiBase();
  const res = await fetch(`${base}api/pcv/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Failed to search UK cards");
  const json = await res.json();
  return json.data;
}

export async function fetchEbayUrls(cardName: string, setName?: string, number?: string): Promise<{ searchUrl: string; soldUrl: string }> {
  const base = apiBase();
  const params = new URLSearchParams({ cardName });
  if (setName) params.set("setName", setName);
  if (number) params.set("number", number);
  const res = await fetch(`${base}api/ebay/search-url?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to get eBay URLs");
  return res.json();
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
  const base = apiBase();
  const res = await fetch(`${base}api/identify-card`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64 }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Failed to identify card");
  }
  return res.json();
}

export function formatGBP(price: number | null): string {
  if (price === null || price === undefined) return "N/A";
  return `\u00A3${price.toFixed(2)}`;
}
