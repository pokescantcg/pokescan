import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "./query-client";

const KEYS = {
  META: "pokescan_cache_meta",
  SETS: "pokescan_cache_sets",
  CARDS_PREFIX: "pokescan_cache_cards_",
};

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
}

export interface CacheStatus extends CacheMeta {
  isSyncing: boolean;
}

export async function getCacheStatus(): Promise<CacheMeta> {
  const raw = await AsyncStorage.getItem(KEYS.META);
  if (!raw) {
    return {
      totalSets: 0,
      cachedSets: 0,
      totalCards: 0,
      lastSync: null,
      syncedSetIds: [],
    };
  }
  return JSON.parse(raw);
}

async function saveMeta(meta: CacheMeta): Promise<void> {
  await AsyncStorage.setItem(KEYS.META, JSON.stringify(meta));
}

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

export type SyncProgress = {
  stage: "sets" | "cards";
  current: number;
  total: number;
  setName?: string;
};

export async function syncDatabase(
  onProgress?: (progress: SyncProgress) => void,
  concurrency = 3
): Promise<CacheMeta> {
  const base = getApiUrl();

  onProgress?.({ stage: "sets", current: 0, total: 1 });

  const setsRes = await fetch(`${base}api/pokemon/sets`);
  if (!setsRes.ok) throw new Error("Failed to fetch sets");
  const setsData = await setsRes.json();
  const sets: Array<{ id: string; name: string; total: number }> = setsData.data || [];

  await AsyncStorage.setItem(KEYS.SETS, JSON.stringify(sets));

  const meta = await getCacheStatus();
  const alreadySynced = new Set(meta.syncedSetIds);
  const setsToSync = sets.filter((s) => !alreadySynced.has(s.id));

  // Shared mutable state protected by sequential saves
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
        totalSets: sets.length,
        cachedSets: syncedSetIds.length,
        totalCards,
        lastSync: new Date().toISOString(),
        syncedSetIds: [...syncedSetIds],
      });
    } catch (e) {
      console.warn(`Failed to cache set ${set.id}:`, e);
    }
  }

  // Process in concurrent batches
  for (let i = 0; i < setsToSync.length; i += concurrency) {
    const batch = setsToSync.slice(i, i + concurrency);
    await Promise.allSettled(batch.map(downloadSet));
  }

  const finalMeta: CacheMeta = {
    totalSets: sets.length,
    cachedSets: syncedSetIds.length,
    totalCards,
    lastSync: new Date().toISOString(),
    syncedSetIds,
  };
  await saveMeta(finalMeta);
  return finalMeta;
}

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
