import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "./query-client";

const API_URL = "https://pokemon-card-scan.replit.app";

const KEYS = {
  META: "pokescan_cache_meta",
  SETS: "pokescan_cache_sets",
  CARDS_PREFIX: "pokescan_cache_cards_",
};

// ── Language classification ───────────────────────────────────────────────────

export type LangFilter = "english" | "chinese";

export const LANG_INFO: Record<LangFilter, { label: string; flag: string; native: string }> = {
  english: { label: "English", flag: "🇬🇧", native: "English" },
  chinese: { label: "Chinese", flag: "🇨🇳", native: "中文" },
};

export function detectSetLanguage(_setId: string): LangFilter {
  return "english";
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CachedCard {
  id: string;
  name: string;
  number: string;
  setId: string;
  setName: string;
  rarity?: string;
  supertype?: string;
  types?: string[];
  hp?: string;
  artist?: string;
  imageSmall: string;
  imageLarge: string;
}

export interface CacheMeta {
  totalSets: number;
  cachedSets: number;
  totalCards: number;
  lastSync: string | null;
  syncedSetIds: string[];
  selectedLanguages: LangFilter[];
}

export interface CacheStatus extends CacheMeta {
  isSyncing: boolean;
}

// ── Persistence ───────────────────────────────────────────────────────────────

export async function getCacheStatus(): Promise<CacheMeta> {
  const raw = await AsyncStorage.getItem(KEYS.META);
  if (!raw) {
    return {
      totalSets: 0,
      cachedSets: 0,
      totalCards: 0,
      lastSync: null,
      syncedSetIds: [],
      selectedLanguages: [],
    };
  }
  const parsed = JSON.parse(raw);
  return {
    ...parsed,
    selectedLanguages: parsed.selectedLanguages ?? [],
  };
}

async function safeSet(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (err: any) {
    if (err?.message?.includes?.("SQLITE_FULL") || err?.message?.includes?.("disk is full")) {
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const cacheKeys = allKeys.filter((k) => k.startsWith(KEYS.CARDS_PREFIX));
        if (cacheKeys.length > 0) {
          const toRemove = cacheKeys.slice(0, Math.max(1, Math.floor(cacheKeys.length / 2)));
          await AsyncStorage.multiRemove(toRemove);
          console.log(`[CardCache] Evicted ${toRemove.length} cached sets to free space`);
          await AsyncStorage.setItem(key, value);
          return;
        }
      } catch {}
      console.warn("[CardCache] Storage full, skipping write:", key);
    } else {
      throw err;
    }
  }
}

async function saveMeta(meta: CacheMeta): Promise<void> {
  await safeSet(KEYS.META, JSON.stringify(meta));
}

// ── Search ────────────────────────────────────────────────────────────────────

export async function searchLocalCards(
  name: string,
  number?: string,
  setId?: string
): Promise<CachedCard | null> {
  const meta = await getCacheStatus();
  if (meta.totalCards === 0) return null;

  const nameLower = name.toLowerCase().trim();

  const setIdsToSearch = setId
    ? meta.syncedSetIds.filter((id) => id === setId)
    : meta.syncedSetIds;

  for (const sid of setIdsToSearch) {
    const raw = await AsyncStorage.getItem(KEYS.CARDS_PREFIX + sid);
    if (!raw) continue;
    const cards: CachedCard[] = JSON.parse(raw);

    const nameMatches = cards.filter(
      (c) => c.name.toLowerCase() === nameLower
    );

    if (nameMatches.length === 0) continue;

    if (number && nameMatches.length > 1) {
      const numOnly = String(number).split("/")[0].replace(/^0+/, "");
      const exact = nameMatches.find(
        (c) => String(c.number).replace(/^0+/, "") === numOnly
      );
      if (exact) return exact;
    }

    if (nameMatches.length > 0) return nameMatches[0];
  }

  const namePrefixResults: CachedCard[] = [];
  for (const sid of setIdsToSearch.slice(0, 20)) {
    const raw = await AsyncStorage.getItem(KEYS.CARDS_PREFIX + sid);
    if (!raw) continue;
    const cards: CachedCard[] = JSON.parse(raw);
    const partial = cards.filter((c) =>
      c.name.toLowerCase().startsWith(nameLower)
    );
    namePrefixResults.push(...partial);
    if (namePrefixResults.length > 0) break;
  }

  return namePrefixResults[0] || null;
}

export async function searchLocalCardsByQuery(
  query: string,
  limit: number = 30
): Promise<CachedCard[]> {
  const meta = await getCacheStatus();
  if (meta.cachedSets === 0) return [];

  const queryLower = query.toLowerCase().trim();
  if (!queryLower) return [];

  const results: CachedCard[] = [];
  const seen = new Set<string>();

  // First pass: exact name starts-with (most relevant)
  for (const sid of meta.syncedSetIds) {
    if (results.length >= limit) break;
    const raw = await AsyncStorage.getItem(KEYS.CARDS_PREFIX + sid);
    if (!raw) continue;
    const cards: CachedCard[] = JSON.parse(raw);
    for (const c of cards) {
      if (c.name.toLowerCase().startsWith(queryLower) && !seen.has(c.id)) {
        seen.add(c.id);
        results.push(c);
        if (results.length >= limit) break;
      }
    }
  }

  // Second pass: contains match (if we still need more)
  if (results.length < limit) {
    for (const sid of meta.syncedSetIds) {
      if (results.length >= limit) break;
      const raw = await AsyncStorage.getItem(KEYS.CARDS_PREFIX + sid);
      if (!raw) continue;
      const cards: CachedCard[] = JSON.parse(raw);
      for (const c of cards) {
        if (c.name.toLowerCase().includes(queryLower) && !seen.has(c.id)) {
          seen.add(c.id);
          results.push(c);
          if (results.length >= limit) break;
        }
      }
    }
  }

  return results;
}

// ── Sync ──────────────────────────────────────────────────────────────────────

export type SyncProgress = {
  stage: "sets" | "cards";
  current: number;
  total: number;
  setName?: string;
};

export async function syncDatabase(
  onProgress?: (progress: SyncProgress) => void,
  concurrency = 3,
  languageFilter?: LangFilter[]
): Promise<CacheMeta> {
  const base = getApiUrl();

  onProgress?.({ stage: "sets", current: 0, total: 1 });

  const setsRes = await fetch(`${API_URL}/api/pokemon/sets`);
  if (!setsRes.ok) throw new Error("Failed to fetch sets");
  const setsData = await setsRes.json();
  const allSets: Array<{ id: string; name: string; total: number }> = setsData.data || [];

  await safeSet(KEYS.SETS, JSON.stringify(allSets));

  // Filter to selected languages (or all if no filter specified)
  const sets =
    languageFilter && languageFilter.length > 0
      ? allSets.filter((s) => languageFilter.includes(detectSetLanguage(s.id)))
      : allSets;

  const meta = await getCacheStatus();
  const alreadySynced = new Set(meta.syncedSetIds);
  const setsToSync = sets.filter((s) => !alreadySynced.has(s.id));

  let totalCards = meta.totalCards;
  const syncedSetIds = [...meta.syncedSetIds];
  let completed = 0;

  async function downloadSet(set: { id: string; name: string; total: number }): Promise<void> {
    try {
      const cardsRes = await fetch(`${API_URL}/api/pokemon/sets/${set.id}/all-cards`);
      if (!cardsRes.ok) return;
      const cardsData = await cardsRes.json();
      const rawCards: any[] = cardsData.data || [];

      const cached: CachedCard[] = rawCards.map((c: any) => ({
        id: c.id,
        name: c.name,
        number: c.number,
        setId: c.set?.id || set.id,
        setName: c.set?.name || set.name,
        rarity: c.rarity,
        supertype: c.supertype,
        types: c.types,
        hp: c.hp,
        artist: c.artist,
        imageSmall: c.images?.small || "",
        imageLarge: c.images?.large || "",
      }));

      await safeSet(KEYS.CARDS_PREFIX + set.id, JSON.stringify(cached));

      totalCards += cached.length;
      syncedSetIds.push(set.id);
      completed++;

      onProgress?.({
        stage: "cards",
        current: completed,
        total: setsToSync.length,
        setName: set.name,
      });

      await saveMeta({
        totalSets: allSets.length,
        cachedSets: syncedSetIds.length,
        totalCards,
        lastSync: new Date().toISOString(),
        syncedSetIds: [...syncedSetIds],
        selectedLanguages: languageFilter ?? meta.selectedLanguages,
      });
    } catch (e) {
      console.warn(`Failed to cache set ${set.id}:`, e);
    }
  }

  for (let i = 0; i < setsToSync.length; i += concurrency) {
    const batch = setsToSync.slice(i, i + concurrency);
    await Promise.allSettled(batch.map(downloadSet));
  }

  const finalMeta: CacheMeta = {
    totalSets: allSets.length,
    cachedSets: syncedSetIds.length,
    totalCards,
    lastSync: new Date().toISOString(),
    syncedSetIds,
    selectedLanguages: languageFilter ?? meta.selectedLanguages,
  };
  await saveMeta(finalMeta);
  return finalMeta;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export async function getSetCardsFromCache(setId: string): Promise<CachedCard[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.CARDS_PREFIX + setId);
    if (!raw) return [];
    return JSON.parse(raw) as CachedCard[];
  } catch {
    return [];
  }
}

export async function clearCache(): Promise<void> {
  const meta = await getCacheStatus();
  const keysToDelete = [
    KEYS.META,
    KEYS.SETS,
    ...meta.syncedSetIds.map((id) => KEYS.CARDS_PREFIX + id),
  ];
  await AsyncStorage.multiRemove(keysToDelete);
}

/**
 * Returns approximate set counts per language from a set list.
 */
export function countSetsByLanguage(
  sets: Array<{ id: string }>
): Record<LangFilter, number> {
  const counts: Record<LangFilter, number> = { english: 0, chinese: 0 };
  for (const s of sets) {
    const lang = detectSetLanguage(s.id);
    counts[lang] = (counts[lang] ?? 0) + 1;
  }
  return counts;
}
