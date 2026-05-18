import React, { useCallback, useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  useColorScheme,
  Platform,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/constants/colors";
import { fetchSetCards, PokemonCard, getUKPrice, formatGBP } from "@/lib/pokemon-api";
import { CachedCard } from "@/lib/card-cache";
import { useUser } from "@/lib/user-context";

function parseCardNumber(num: string): [number, string] {
  const match = num.match(/^(\d+)(.*)/);
  if (match) return [parseInt(match[1], 10), match[2]];
  return [Infinity, num];
}

function sortCardsByNumber(cards: PokemonCard[]): PokemonCard[] {
  return [...cards].sort((a, b) => {
    const [aNum, aSuffix] = parseCardNumber(a.number || "");
    const [bNum, bSuffix] = parseCardNumber(b.number || "");
    if (aNum !== bNum) return aNum - bNum;
    return aSuffix.localeCompare(bSuffix);
  });
}

const RARITY_ORDER = [
  "Common", "Uncommon", "Rare", "Rare Holo", "Double Rare", "Amazing Rare",
  "Rare Holo V", "Rare Holo VMAX", "Rare Holo VSTAR", "Rare Holo EX", "Rare Holo GX",
  "Trainer Gallery Rare Holo", "ACE SPEC Rare", "Rare Ultra", "Illustration Rare",
  "Rare Rainbow", "Special Illustration Rare", "Hyper Rare", "Rare Secret",
  "Rare Shiny", "Rare Shiny GX", "Rare Shining", "Promo",
];

function rarityRank(r: string): number {
  const idx = RARITY_ORDER.indexOf(r);
  return idx === -1 ? RARITY_ORDER.length : idx;
}

function cachedToPokemonCard(c: CachedCard): PokemonCard {
  return {
    id: c.id,
    name: c.name,
    number: c.number,
    supertype: c.supertype || "Pokémon",
    rarity: c.rarity,
    types: c.types,
    hp: c.hp,
    artist: c.artist,
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
  };
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const NUM_COLS = 3;
const H_PAD = 12;
const GAP = 6;
const CARD_WIDTH = (SCREEN_WIDTH - H_PAD * 2 - GAP * (NUM_COLS - 1)) / NUM_COLS;
const CARD_IMG_HEIGHT = CARD_WIDTH * 1.4;
const POKEBALL_GOLD = "#FFD700";

type CardCollectionData = { total: number; variants: Record<string, number> };

const VARIANT_COLORS: Record<string, string> = {
  "Holo": "#FFD700",
  "Reverse Holo": "#00BFFF",
  "Non-Holo": "#C0C0C0",
};
const VARIANT_LABELS: Record<string, string> = {
  "Holo": "H",
  "Reverse Holo": "R",
  "Non-Holo": "N",
};

function CollectionBadge({ data }: { data: CardCollectionData }) {
  const entries = Object.entries(data.variants).filter(([, qty]) => qty > 0);
  return (
    <View style={styles.collectionBadge}>
      <View style={styles.collectionBadgeInner}>
        {entries.map(([variant, qty]) => {
          const label = VARIANT_LABELS[variant] ?? variant[0];
          const color = VARIANT_COLORS[variant] ?? POKEBALL_GOLD;
          return (
            <View key={variant} style={{ flexDirection: "row", alignItems: "center", gap: 1 }}>
              <Text style={{ fontSize: 9, fontFamily: "Outfit_700Bold", color }}>{label}</Text>
              {qty > 1 && <Text style={{ fontSize: 8, fontFamily: "Outfit_600SemiBold", color }}>×{qty}</Text>}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function CardGridItem({
  card,
  colors,
  collectionData,
}: {
  card: any;
  colors: ReturnType<typeof useThemeColors>;
  collectionData: CardCollectionData | null;
}) {
  const priceData = getUKPrice(card);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.gridItem,
        {
          backgroundColor: colors.card,
          borderColor: (collectionData?.total ?? 0) > 0 ? POKEBALL_GOLD + "80" : colors.borderLight,
          borderWidth: (collectionData?.total ?? 0) > 0 ? 1.5 : 1,
          width: CARD_WIDTH,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
      onPress={() =>
        router.push({
          pathname: "/card/[id]",
          params: {
            id: card.id,
            variant: card.finishType || "Non-Holo",
          },
        })
      }
    >
      <View style={{ width: CARD_WIDTH, height: CARD_IMG_HEIGHT }}>
        <Image
          source={{ uri: card.images?.small || "" }}
          style={[styles.gridImage, { height: CARD_IMG_HEIGHT, width: CARD_WIDTH }]}
          contentFit="contain"
          placeholder={{ color: colors.surface }}
          transition={200}
        />

        {card.finishType === "Reverse Holo" && (
          <LinearGradient
            colors={["rgba(255,255,255,0.03)", "rgba(0,191,255,0.16)", "rgba(255,255,255,0.03)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 10, opacity: 0.9 }}
            pointerEvents="none"
          />
        )}

        {card.finishType === "Holo" && (
          <LinearGradient
            colors={["rgba(255,0,255,0.08)", "rgba(0,255,255,0.15)", "rgba(255,255,0,0.08)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 10, opacity: 0.85 }}
            pointerEvents="none"
          />
        )}

        {card.variantLabel && (
          <View
            style={{
              position: "absolute",
              bottom: 6,
              left: 6,
              backgroundColor: "rgba(0,0,0,0.72)",
              borderRadius: 8,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
          >
            <Text
              style={{
                color: card.finishType === "Holo" ? "#FFD700" : card.finishType === "Reverse Holo" ? "#00BFFF" : "#FFFFFF",
                fontSize: 9,
                fontFamily: "Outfit_700Bold",
              }}
            >
              {card.variantLabel}
            </Text>
          </View>
        )}

        {card.isStamped && (
          <View
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              backgroundColor: "rgba(255,215,0,0.22)",
              borderRadius: 8,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
          >
            <Text style={{ color: "#FFD700", fontSize: 9, fontFamily: "Outfit_700Bold" }}>
              STAMP
            </Text>
          </View>
        )}

        {(collectionData?.total ?? 0) > 0 && (
          <CollectionBadge data={collectionData!} />
        )}
      </View>

      <View style={styles.gridInfo}>
        <Text style={[styles.gridName, { color: colors.text }]} numberOfLines={2}>
          {card.name}
        </Text>
        <Text style={[styles.gridNumber, { color: colors.textMuted }]}>
          #{card.number}
        </Text>
        {priceData.price ? (
          <Text style={[styles.gridPrice, { color: colors.success }]}>
            {formatGBP(priceData.price)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const NON_ENGLISH_PATTERNS = ["_ja", "_ko", "_zh", "_cn", "topsun", "babanuki", "mengka", "oldmaid", "hanafuda"];

function getSetLanguageLabel(setId: string): string {
  const id = (setId || "").toLowerCase();
  if (["babanuki", "mengka", "topsun", "oldmaid", "hanafuda"].some((p) => id.includes(p))) return "Non-TCG";
  if (id.includes("_ja")) return "Japanese";
  if (id.includes("_ko")) return "Korean";
  if (id.includes("_zh") || id.includes("_cn")) return "Chinese";
  return "";
}

function isNonEnglishSet(setId: string): boolean {
  const id = (setId || "").toLowerCase();
  return NON_ENGLISH_PATTERNS.some((p) => id.includes(p));
}

export default function SetDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { collection } = useUser();

  const collectionMap = useMemo(() => {
    const map = new Map<string, CardCollectionData>();
    for (const item of collection) {
      const existing = map.get(item.cardId) ?? { total: 0, variants: {} };
      const v = item.variant || "Non-Holo";
      existing.total += item.quantity;
      existing.variants[v] = (existing.variants[v] ?? 0) + item.quantity;
      map.set(item.cardId, existing);
    }
    return map;
  }, [collection]);

  const [allCards, setAllCards] = useState<PokemonCard[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [loadKey, setLoadKey] = useState(0);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setHasError(false);
    setAllCards([]);
    setTotalCount(0);
    setActiveFilter(null);
    setLoadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!isRefreshing) setIsLoading(true);
    setHasError(false);

    const load = async () => {
      if (Platform.OS !== "web" && !isRefreshing) {
        try {
          const { getSetCardsFromCache } = await import("@/lib/card-cache");
          const cached = await getSetCardsFromCache(id as string);
          if (!cancelled && cached.length > 0) {
            const cards = sortCardsByNumber(cached.map(cachedToPokemonCard));
            setAllCards(cards);
            setTotalCount(cards.length);
            setIsLoading(false);
            setIsRefreshing(false);
            return;
          }
        } catch {}
      }

      try {
        const result = await fetchSetCards(id as string, 1);
        if (cancelled) return;
        setAllCards(sortCardsByNumber(result.cards));
        setTotalCount(result.totalCount);
        setIsLoading(false);
        setIsRefreshing(false);

        if (result.cards.length < result.totalCount) {
          setIsLoadingMore(true);
          let pg = 2;
          let accumulated = [...result.cards];
          while (!cancelled && accumulated.length < result.totalCount) {
            try {
              const next = await fetchSetCards(id as string, pg);
              if (cancelled) break;
              accumulated = [...accumulated, ...next.cards];
              setAllCards(sortCardsByNumber(accumulated));
              setTotalCount(next.totalCount);
              if (next.cards.length === 0) break;
              pg++;
            } catch {
              break;
            }
          }
          if (!cancelled) setIsLoadingMore(false);
        }
      } catch {
        if (!cancelled) {
          setHasError(true);
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [id, loadKey]);

  const availableRarities = useMemo(() => {
    const seen = new Set<string>();
    allCards.forEach((c) => { if (c.rarity) seen.add(c.rarity); });
    return Array.from(seen).sort((a, b) => rarityRank(a) - rarityRank(b));
  }, [allCards]);

  const expandedCards = useMemo(() => {
    return allCards.flatMap((card: any) => {
      if (!card?.variants || card.variants.length === 0) {
        return [{
          ...card,
          renderId: card.id,
          cardId: card.id,
          finishType: card.finishType || "Non-Holo",
          variantLabel: card.variantLabel || null,
          isStamped: card.isStamped || false,
        }];
      }
      return card.variants.map((variant: any) => ({
        ...card,
        renderId: variant?.id || `${card.id}-${variant?.finishType || "variant"}`,
        cardId: card.id,
        finishType: variant?.finishType || "Non-Holo",
        variantLabel: variant?.variantLabel || variant?.finishType || null,
        isStamped: variant?.isStamped || false,
        images: variant?.imageUrl
          ? { small: variant.imageUrl, large: variant.imageUrl }
          : card.images,
      }));
    });
  }, [allCards]);

  const filteredCards = useMemo(() => {
    if (!activeFilter) return expandedCards;
    return expandedCards.filter((c: any) => c?.rarity === activeFilter);
  }, [expandedCards, activeFilter]);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const loaded = allCards.length;
  const filteredCount = filteredCards.length;

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <CardGridItem
        card={item}
        colors={colors}
        collectionData={collectionMap.get(item.cardId ?? item.id) ?? null}
      />
    ),
    [colors, collectionMap]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={colorScheme === "dark" ? ["#2A0A0A", "#1A1A2E"] : ["#FFF0F0", "#F5F5F5"]}
        style={[styles.header, { paddingTop: (insets.top || webTopInset) + 4 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {name || "Set"}
            </Text>
            <View style={styles.headerMeta}>
              <View style={styles.headerMetaItem}>
                <MaterialCommunityIcons name="cards-outline" size={13} color={colors.pokemonRed} />
                <Text style={[styles.headerCount, { color: colors.textSecondary }]}>
                  {activeFilter
                    ? `${filteredCount} of ${loaded}${totalCount > loaded ? `/${totalCount}` : ""} cards`
                    : `${loaded}${totalCount > 0 ? `/${totalCount}` : ""} cards`}
                </Text>
              </View>
            </View>
          </View>
          <Pressable onPress={handleRefresh} style={styles.refreshBtn} disabled={isLoading || isRefreshing}>
            <Ionicons
              name="refresh"
              size={20}
              color={isLoading || isRefreshing ? colors.textMuted : colors.text}
            />
          </Pressable>
        </View>

        {!isLoading && availableRarities.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContent}
          >
            <Pressable
              style={[
                styles.filterChip,
                {
                  backgroundColor: !activeFilter ? colors.pokemonRed : colors.surface,
                  borderColor: !activeFilter ? colors.pokemonRed : colors.borderLight,
                },
              ]}
              onPress={() => setActiveFilter(null)}
            >
              <Text style={[styles.filterChipText, { color: !activeFilter ? "#FFF" : colors.textSecondary }]}>
                All
              </Text>
            </Pressable>

            {availableRarities.map((rarity) => {
              const active = activeFilter === rarity;
              return (
                <Pressable
                  key={rarity}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? colors.pokemonRed : colors.surface,
                      borderColor: active ? colors.pokemonRed : colors.borderLight,
                    },
                  ]}
                  onPress={() => setActiveFilter(active ? null : rarity)}
                >
                  <Text style={[styles.filterChipText, { color: active ? "#FFF" : colors.textSecondary }]}>
                    {rarity}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </LinearGradient>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="pokeball" size={40} color={colors.pokemonRed} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading cards...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCards}
          renderItem={renderItem}
          keyExtractor={(item: any) => item.renderId || item.id}
          numColumns={NUM_COLS}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[styles.listContent, { paddingBottom: 40 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.pokemonRed}
              colors={[colors.pokemonRed]}
            />
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={colors.pokemonRed} />
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                  Loading {totalCount - loaded} more cards...
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            hasError ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="wifi-off" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.text }]}>Couldn't load cards</Text>
                <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
                  This set may be unavailable. Pull down or tap refresh to try again.
                </Text>
                <Pressable onPress={handleRefresh} style={[styles.retryBtn, { backgroundColor: colors.pokemonRed }]}>
                  <Ionicons name="refresh" size={16} color="#FFF" />
                  <Text style={styles.retryBtnText}>Retry</Text>
                </Pressable>
              </View>
            ) : activeFilter ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="filter-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No {activeFilter} cards in this set
                </Text>
              </View>
            ) : isNonEnglishSet(id as string) ? (
              <View style={styles.emptyContainer}>
                <Text style={{ fontSize: 48, textAlign: "center" }}>
                  {getSetLanguageLabel(id as string) === "Japanese" ? "🇯🇵"
                    : getSetLanguageLabel(id as string) === "Korean" ? "🇰🇷"
                    : getSetLanguageLabel(id as string) === "Chinese" ? "🇨🇳"
                    : "🎴"}
                </Text>
                <Text style={[styles.emptyText, { color: colors.text }]}>
                  {getSetLanguageLabel(id as string)} Set
                </Text>
                <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
                  Individual card data for this set isn't available yet in the database.{"\n\n"}
                  Use the Scanner tab to identify any card — the AI will recognise it and show you its details and UK pricing.
                </Text>
                <Pressable
                  onPress={() => router.push("/(tabs)/scanner")}
                  style={[styles.retryBtn, { backgroundColor: colors.pokemonRed }]}
                >
                  <Ionicons name="scan-outline" size={16} color="#FFF" />
                  <Text style={styles.retryBtnText}>Open Scanner</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="cards-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No cards found for this set
                </Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 0 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 20, fontFamily: "Outfit_700Bold" },
  headerMeta: { flexDirection: "row", gap: 16, alignItems: "center", marginTop: 3 },
  headerMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerCount: { fontSize: 13, fontFamily: "Outfit_500Medium" },
  filterScroll: { marginTop: 10, marginHorizontal: -16 },
  filterContent: { paddingHorizontal: 16, paddingBottom: 6, gap: 8, flexDirection: "row" },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 12, fontFamily: "Outfit_600SemiBold" },
  listContent: { paddingHorizontal: H_PAD, paddingTop: 10 },
  gridRow: { gap: GAP, marginBottom: GAP },
  gridItem: { borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  gridImage: { borderTopLeftRadius: 9, borderTopRightRadius: 9 },
  gridInfo: { padding: 6, gap: 1 },
  gridName: { fontSize: 11, fontFamily: "Outfit_600SemiBold", lineHeight: 14 },
  gridNumber: { fontSize: 10, fontFamily: "Outfit_400Regular" },
  gridPrice: { fontSize: 11, fontFamily: "Outfit_700Bold", marginTop: 2 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "Outfit_500Medium" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Outfit_600SemiBold" },
  emptySubText: { fontSize: 13, fontFamily: "Outfit_400Regular", textAlign: "center", paddingHorizontal: 32 },
  refreshBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  retryBtnText: { color: "#FFF", fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  footerLoader: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
  footerText: { fontSize: 13, fontFamily: "Outfit_400Regular" },
  collectionBadge: { position: "absolute", bottom: 4, right: 4 },
  collectionBadgeInner: { flexDirection: "row", gap: 3, flexWrap: "wrap", justifyContent: "flex-end" },
});
