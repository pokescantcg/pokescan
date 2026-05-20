/**
 * Enhanced Pokemon Card Scanner Logic
 * =====================================
 * Drop-in upgrade for your pokemon-api.ts identifyCard / findCard functions.
 *
 * HOW IT WORKS
 * ────────────
 * 1. Your existing AI scan returns { englishName, cardNumber, setCode, setName, confidence }
 * 2. We run those through resolveSet() from set-database.ts — this maps any
 *    PTCGO code / set name / API ID to the correct SetInfo instantly.
 * 3. We build a precise API query: name:"Pikachu" set.id:sv3pt5 number:188
 * 4. If that returns nothing, we fall back to name-only + fuzzy scoring.
 * 5. We return the best match, confidence score, alternatives, AND the
 *    symbol/logo image URLs from pokesymbols.com — free, no extra API call.
 *
 * USAGE
 * ────────────
 * Replace or wrap your existing findCard() call with enhancedFindCard().
 * Optionally call getSetSymbolUrl() anywhere you want to show the set symbol.
 *
 * INSTALL
 * ────────────
 * 1. Copy set-database.ts → lib/set-database.ts
 * 2. Copy this file     → lib/scanner-enhanced.ts
 * 3. In your scanner.tsx, import from scanner-enhanced instead of pokemon-api
 *    for the findCard / identifyCard parts.
 */

import {
  parseCardBottomText,
  buildApiQuery,
  resolveSet,
  findSetByName,
  getSymbolUrl,
  getLogoUrl,
  type SetInfo,
} from "./set-database";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface EnhancedScanInput {
  /** Card name from AI OCR (English) */
  cardName: string;
  /**
   * Raw bottom-right corner text as read by OCR.
   * e.g. "188/132 MEW", "45/165", "SWSH001"
   * If your AI already parses these separately, pass them in the fields below.
   */
  bottomRightText?: string;
  /** Card number, if already parsed */
  cardNumber?: string;
  /** PTCGO set code, if already parsed (e.g. "MEW", "SVI") */
  ptcgoCode?: string;
  /** Set name from AI, if returned (e.g. "151", "Scarlet & Violet") */
  setName?: string;
  /** Pokemon TCG API set ID, if already known (e.g. "sv3pt5") */
  apiSetId?: string;
}

export interface CardMatch {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  set: {
    id: string;
    name: string;
    series: string;
    ptcgoCode?: string;
    /** Symbol image URL from pokesymbols.com */
    symbolUrl: string | null;
    /** Logo image URL from pokesymbols.com */
    logoUrl: string | null;
  };
  images: {
    small: string;
    large: string;
  };
}

export interface EnhancedScanResult {
  /** Best matching card, or null if nothing found */
  match: CardMatch | null;
  /** Confidence 0–100 */
  confidence: number;
  /** Up to 4 alternative matches with their confidence scores */
  alternatives: Array<{ card: CardMatch; confidence: number }>;
  /** Resolved set info from our local database */
  setInfo: SetInfo | null;
  /** Symbol URL for the identified set (from pokesymbols.com) */
  symbolUrl: string | null;
  /** Debug: what query was used */
  debugQuery: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUZZY MATCHING
// ─────────────────────────────────────────────────────────────────────────────

/** Levenshtein-based similarity score 0–1 */
function nameSimilarity(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;

  // Levenshtein
  const m = s1.length, n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = s1[i - 1] === s2[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i][j - 1], dp[i - 1][j]);
    }
  }
  return 1 - dp[m][n] / Math.max(m, n);
}

// ─────────────────────────────────────────────────────────────────────────────
// RAW API CARD → CardMatch
// ─────────────────────────────────────────────────────────────────────────────

function toCardMatch(raw: any, setInfo: SetInfo | null): CardMatch {
  // Try our local DB first (most accurate symbol URL), fall back to API data
  const resolvedSet = setInfo
    ?? (raw.set?.ptcgoCode ? resolveSet(raw.set.ptcgoCode) : null)
    ?? (raw.set?.id        ? resolveSet(raw.set.id)        : null)
    ?? (raw.set?.name      ? findSetByName(raw.set.name)   : null);

  return {
    id:     raw.id,
    name:   raw.name,
    number: raw.number,
    rarity: raw.rarity,
    set: {
      id:         raw.set?.id   ?? "",
      name:       raw.set?.name ?? "",
      series:     raw.set?.series ?? resolvedSet?.series ?? "",
      ptcgoCode:  raw.set?.ptcgoCode ?? resolvedSet?.ptcgoCode ?? undefined,
      symbolUrl:  resolvedSet ? getSymbolUrl(resolvedSet.slug) : null,
      logoUrl:    resolvedSet ? getLogoUrl(resolvedSet.slug)   : null,
    },
    images: {
      small: raw.images?.small ?? "",
      large: raw.images?.large ?? "",
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN: ENHANCED FIND CARD
// ─────────────────────────────────────────────────────────────────────────────

const TCG_API = "https://api.pokemontcg.io/v2/cards";

/**
 * Enhanced card lookup using the full set database.
 *
 * Pass whatever you have from the AI scan — the more fields the better.
 * The function tries the most specific query first and falls back gracefully.
 */
export async function enhancedFindCard(
  input: EnhancedScanInput,
): Promise<EnhancedScanResult> {

  // ── Step 1: Resolve set from all available hints ──────────────────────────

  let setInfo: SetInfo | null = null;

  // Try in order of reliability: explicit apiSetId > ptcgoCode > bottomRightText > setName
  if (input.apiSetId) {
    setInfo = resolveSet(input.apiSetId);
  }
  if (!setInfo && input.ptcgoCode) {
    setInfo = resolveSet(input.ptcgoCode);
  }
  if (!setInfo && input.bottomRightText) {
    const parsed = parseCardBottomText(input.bottomRightText);
    if (parsed.setInfo) setInfo = parsed.setInfo;
    // Also extract card number if not already provided
    if (!input.cardNumber && parsed.cardNumber) {
      input = { ...input, cardNumber: parsed.cardNumber };
    }
    if (!input.ptcgoCode && parsed.ptcgoCode) {
      input = { ...input, ptcgoCode: parsed.ptcgoCode };
    }
  }
  if (!setInfo && input.setName) {
    setInfo = resolveSet(input.setName);
  }

  const symbolUrl = setInfo ? getSymbolUrl(setInfo.slug) : null;

  // ── Step 2: Build and run the primary query ───────────────────────────────

  const primaryQuery = buildApiQuery(
    input.cardName,
    input.cardNumber ?? null,
    setInfo?.ptcgoCode ?? input.ptcgoCode ?? input.apiSetId ?? null,
  );

  let cards: any[] = await fetchCards(primaryQuery);
  let usedQuery = primaryQuery;

  // ── Step 3: If no results, try without number (OCR often misreads numbers) ─

  if (cards.length === 0 && input.cardNumber) {
    const noNumberQuery = buildApiQuery(
      input.cardName,
      null,
      setInfo?.ptcgoCode ?? input.ptcgoCode ?? null,
    );
    cards = await fetchCards(noNumberQuery);
    usedQuery = noNumberQuery;
  }

  // ── Step 4: If still nothing, try name-only fuzzy search ─────────────────

  if (cards.length === 0) {
    const fuzzyQuery = `name:"${input.cardName}"`;
    cards = await fetchCards(fuzzyQuery);
    usedQuery = fuzzyQuery;
  }

  // ── Step 5: Score every result ────────────────────────────────────────────

  if (cards.length === 0) {
    return {
      match: null,
      confidence: 0,
      alternatives: [],
      setInfo,
      symbolUrl,
      debugQuery: usedQuery,
    };
  }

  interface ScoredCard { card: any; confidence: number }

  const scored: ScoredCard[] = cards.map((card: any) => {
    let score = 0;

    // Name similarity (0–60 points)
    score += nameSimilarity(input.cardName, card.name) * 60;

    // Set match (0–25 points)
    if (setInfo) {
      if (card.set?.id === setInfo.apiId) score += 25;
      else if (card.set?.ptcgoCode === setInfo.ptcgoCode) score += 20;
    } else if (input.setName) {
      const sn = nameSimilarity(input.setName, card.set?.name ?? "");
      score += sn * 15;
    }

    // Card number match (0–15 points)
    if (input.cardNumber) {
      if (card.number === input.cardNumber) score += 15;
      else if (card.number?.replace(/^0+/, "") === input.cardNumber.replace(/^0+/, "")) {
        score += 10; // leading-zero tolerance
      }
    }

    return { card, confidence: Math.min(100, Math.round(score)) };
  });

  scored.sort((a, b) => b.confidence - a.confidence);

  const best = scored[0];
  const alternatives = scored
    .slice(1, 5)
    .map(s => ({ card: toCardMatch(s.card, setInfo), confidence: s.confidence }));

  return {
    match: toCardMatch(best.card, setInfo),
    confidence: best.confidence,
    alternatives,
    setInfo,
    symbolUrl,
    debugQuery: usedQuery,
  };
}

async function fetchCards(query: string): Promise<any[]> {
  try {
    const res = await fetch(`${TCG_API}?q=${encodeURIComponent(query)}&pageSize=20`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.data ?? [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE: SYMBOL URL HELPERS (re-exported for use in your UI components)
// ─────────────────────────────────────────────────────────────────────────────

export { getSymbolUrl, getLogoUrl, resolveSet, parseCardBottomText } from "./set-database";

// ─────────────────────────────────────────────────────────────────────────────
// ADAPTER: Wrap your existing CardIdentification type
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Use this inside your existing scanner.tsx wherever you call findCard().
 *
 * Before:
 *   const found = await findCard(identification.englishName, identification.cardNumber, identification.setCode);
 *
 * After:
 *   const result = await enhancedFindCard({
 *     cardName:        identification.englishName,
 *     cardNumber:      identification.cardNumber ?? undefined,
 *     ptcgoCode:       identification.setCode    ?? undefined,
 *     setName:         identification.setName    ?? undefined,
 *     bottomRightText: identification.bottomRightText ?? undefined,
 *   });
 *   const found = result.match;               // use like old PokemonCard
 *   const symbolUrl = result.symbolUrl;       // show in UI!
 */
export async function findCardEnhanced(
  englishName: string,
  cardNumber?: string,
  setCode?: string,
  setName?: string,
  bottomRightText?: string,
) {
  return enhancedFindCard({
    cardName: englishName,
    cardNumber,
    ptcgoCode: setCode,
    setName,
    bottomRightText,
  });
}
