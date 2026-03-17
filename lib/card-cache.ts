import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "./query-client";

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

async function saveMeta(meta: CacheMeta): Promise<void> {
  await AsyncStorage.setItem(KEYS.META, JSON.stringify(meta));
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

  const setsRes = await fetch(`${base}api/pokemon/sets`);
  if (!setsRes.ok) throw new Error("Failed to fetch sets");
  const setsData = await setsRes.json();
  const allSets: Array<{ id: string; name: string; total: number }> = setsData.data || [];

  await AsyncStorage.setItem(KEYS.SETS, JSON.stringify(allSets));

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
      const cardsRes = await fetch(`${base}api/pokemon/sets/${set.id}/all-cards`);
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

      await AsyncStorage.setItem(KEYS.CARDS_PREFIX + set.id, JSON.stringify(cached));

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
