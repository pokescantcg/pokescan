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

export function formatGBP(price: number | null): string {
  if (price === null || price === undefined) return "N/A";
  return `\u00A3${price.toFixed(2)}`;
}
