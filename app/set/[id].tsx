import React, { useCallback, useState, useEffect, useMemo, useRef } from "react";
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
  Modal,
  Animated,
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/constants/colors";
import {
  fetchSetCards,
  PokemonCard,
  getUKPrice,
  formatGBP,
} from "@/lib/pokemon-api";
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
  "Common","Uncommon","Rare","Rare Holo","Double Rare","Amazing Rare",
  "Rare Holo V","Rare Holo VMAX","Rare Holo VSTAR","Rare Holo EX","Rare Holo GX",
  "Trainer Gallery Rare Holo","ACE SPEC Rare","Rare Ultra","Illustration Rare",
  "Rare Rainbow","Special Illustration Rare","Hyper Rare","Rare Secret",
  "Rare Shiny","Rare Shiny GX","Rare Shining","Promo",
];

function rarityRank(r: string): number {
  const idx = RARITY_ORDER.indexOf(r);
  return idx === -1 ? RARITY_ORDER.length : idx;
}

function cachedToPokemonCard(c: CachedCard): PokemonCard {
  return {
    id: c.id, name: c.name, number: c.number,
    supertype: c.supertype || "Pokémon", rarity: c.rarity,
    types: c.types, hp: c.hp, artist: c.artist,
    set: { id: c.setId, name: c.setName, series: "", printedTotal: 0,
      total: 0, releaseDate: "", updatedAt: "", images: { symbol: "", logo: "" } },
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

const FINISH_LABELS: Record<string, string> = {
  normal: "Non-Holo",
  non_holo: "Non-Holo",
  holo: "Holo",
  reverse_holo: "Reverse Holo",
  cosmos_holo: "Cosmos Holo",
  cracked_ice: "Cracked Ice",
  master_ball: "Master Ball",
  poke_ball: "Poké Ball",
  staff_stamp: "Staff Stamp",
  prerelease_stamp: "Prerelease",
  winner_stamp: "Winner",
  league_stamp: "League",
  champion_stamp: "Champion",
  set_stamp: "Set Stamp",
};

// Enhanced per-variant visual config with animations
const VARIANT_STYLE: Record<string, {
  border: string; badge: string; badgeText: string;
  gradientColors: string[]; showGradient: boolean;
  animationType: "shimmer" | "glow" | "pulse" | "sparkle" | "cosmic" | "bounce" | "none";
  accentColor: string;
}> = {
  holo: {
    border: "#FFD700",
    badge: "rgba(255,215,0,0.22)",
    badgeText: "#FFD700",
    gradientColors: ["rgba(255,0,200,0.10)","rgba(0,255,255,0.18)","rgba(255,255,0,0.10)"],
    showGradient: true,
    animationType: "shimmer",
    accentColor: "#FFD700",
  },
  reverse_holo: {
    border: "#00BFFF",
    badge: "rgba(0,191,255,0.22)",
    badgeText: "#00BFFF",
    gradientColors: ["rgba(0,191,255,0.04)","rgba(120,0,255,0.14)","rgba(0,191,255,0.04)"],
    showGradient: true,
    animationType: "glow",
    accentColor: "#00BFFF",
  },
  cosmos_holo: {
    border: "#B44FFF",
    badge: "rgba(180,79,255,0.22)",
    badgeText: "#B44FFF",
    gradientColors: ["rgba(180,79,255,0.12)","rgba(0,80,255,0.16)","rgba(180,79,255,0.08)"],
    showGradient: true,
    animationType: "cosmic",
    accentColor: "#B44FFF",
  },
  cracked_ice: {
    border: "#4DD0E1",
    badge: "rgba(77,208,225,0.22)",
    badgeText: "#4DD0E1",
    gradientColors: ["rgba(77,208,225,0.08)","rgba(100,200,255,0.12)"],
    showGradient: true,
    animationType: "sparkle",
    accentColor: "#4DD0E1",
  },
  master_ball: {
    border: "#FF1744",
    badge: "rgba(255,23,68,0.22)",
    badgeText: "#FF1744",
    gradientColors: ["rgba(255,23,68,0.10)","rgba(255,100,100,0.12)"],
    showGradient: true,
    animationType: "pulse",
    accentColor: "#FF1744",
  },
  poke_ball: {
    border: "#FF5252",
    badge: "rgba(255,82,82,0.22)",
    badgeText: "#FF5252",
    gradientColors: ["rgba(255,82,82,0.08)","rgba(255,150,100,0.12)"],
    showGradient: true,
    animationType: "bounce",
    accentColor: "#FF5252",
  },
  normal: {
    border: "transparent",
    badge: "rgba(255,255,255,0.10)",
    badgeText: "#AAAAAA",
    gradientColors: [],
    showGradient: false,
    animationType: "none",
    accentColor: "#AAAAAA",
  },
};

function getVariantStyle(finishType: string) {
  return VARIANT_STYLE[finishType] ?? VARIANT_STYLE.normal;
}

type CardCollectionData = { total: number; variants: Record<string, number> };

const VARIANT_COLORS: Record<string, string> = {
  Holo: "#FFD700", "Reverse Holo": "#00BFFF", "Non-Holo": "#C0C0C0",
};
const VARIANT_LABELS: Record<string, string> = {
  Holo: "H", "Reverse Holo": "R", "Non-Holo": "N",
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
            <View key={variant} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
              <View style={[styles.variantDot, { backgroundColor: color }]} />
              <Text style={{ fontSize: 8, fontFamily: "Outfit_700Bold", color }}>{label}</Text>
              {qty > 1 && (
                <Text style={{ fontSize: 7, fontFamily: "Outfit_600SemiBold", color }}>×{qty}</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// Animated variant badge component
function AnimatedVariantBadge({
  label, animationType, badgeColor, textColor
}: {
  label: string; animationType: string; badgeColor: string; textColor: string;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (animationType === "pulse") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.1, duration: 600, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else if (animationType === "bounce") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 0.95, duration: 300, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1.05, duration: 300, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [animationType, scaleAnim]);

  return (
    <Animated.View
      style={[
        styles.variantBadge,
        { backgroundColor: badgeColor, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Text style={[styles.variantBadgeText, { color: textColor }]}>{label}</Text>
    </Animated.View>
  );
}

function CardGridItem({
  card, colors, collectionData, onVariantPress,
}: {
  card: any;
  colors: ReturnType<typeof useThemeColors>;
  collectionData: CardCollectionData | null;
  onVariantPress?: (card: any) => void;
}) {
  const priceData = getUKPrice(card);
  const finishType = card.finishType || "normal";
  const vs = getVariantStyle(finishType);
  const inCollection = (collectionData?.total ?? 0) > 0;
  const label = FINISH_LABELS[finishType] || card.variantLabel || finishType;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.gridItem,
        {
          backgroundColor: colors.card,
          borderColor: inCollection
            ? POKEBALL_GOLD + "80"
            : vs.border !== "transparent"
            ? vs.border + "60"
            : colors.borderLight,
          borderWidth: inCollection || vs.border !== "transparent" ? 2 : 1,
          width: CARD_WIDTH,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      onPress={() => onVariantPress?.(card)}
    >
      <View style={{ position: "relative" }}>
        <Image
          source={card.images?.small || ""}
          style={[styles.gridImage, { width: CARD_WIDTH, height: CARD_IMG_HEIGHT }]}
          contentFit="cover"
          placeholder="L4ZR-Z~q^+of00oJodR%00~q^+of"
        />
        {vs.showGradient && (
          <LinearGradient
            colors={vs.gradientColors}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.variantOverlay, { borderRadius: 10 }]}
            pointerEvents="none"
          />
        )}
        {vs.animationType === "shimmer" && (
          <View style={[styles.shimmerEffect, { borderRadius: 10 }]} />
        )}
        {vs.animationType === "glow" && (
          <View style={[styles.glowEffect, { borderRadius: 10, borderColor: vs.accentColor }]} />
        )}
        {vs.animationType === "cosmic" && (
          <View style={[styles.cosmicEffect, { borderRadius: 10 }]} />
        )}
        {vs.animationType === "sparkle" && (
          <>
            <View style={[styles.sparkle, { top: "20%", left: "20%", backgroundColor: vs.accentColor }]} />
            <View style={[styles.sparkle, { top: "60%", right: "15%", backgroundColor: vs.accentColor }]} />
            <View style={[styles.sparkle, { bottom: "20%", left: "10%", backgroundColor: vs.accentColor }]} />
          </>
        )}

        {finishType !== "normal" && (
          <AnimatedVariantBadge
            label={label}
            animationType={vs.animationType}
            badgeColor={vs.badge}
            textColor={vs.badgeText}
          />
        )}

        {["staff_stamp", "prerelease_stamp", "winner_stamp", "league_stamp", "champion_stamp", "set_stamp"].includes(finishType) && (
          <View style={[styles.stampBadge, { backgroundColor: "rgba(255,215,0,0.28)" }]}>
            <MaterialCommunityIcons name="stamp" size={10} color="#FFD700" />
            <Text style={styles.stampBadgeText}>{label}</Text>
          </View>
        )}
      </View>

      <View style={styles.gridInfo}>
        <Text style={[styles.gridName, { color: colors.text }]} numberOfLines={1}>
          {card.name}
        </Text>
        <Text style={[styles.gridNumber, { color: colors.textSecondary }]}>
          #{card.number}
        </Text>
        {priceData && (
          <Text style={[styles.gridPrice, { color: colors.pokemonRed }]}>
            {formatGBP(priceData.mid)}
          </Text>
        )}
      </View>

      {collectionData && <CollectionBadge data={collectionData} />}
    </Pressable>
  );
}

// Variant Gallery Modal
function VariantGalleryModal({
  visible, card, colors, onClose,
}: {
  visible: boolean;
  card: any;
  colors: ReturnType<typeof useThemeColors>;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();

  // Group variants by finish type
  const variants = useMemo(() => {
    if (!card?.variants) return [];
    return Object.entries(FINISH_LABELS).reduce((acc: any[], [key, label]) => {
      const variant = card.variants?.[key];
      if (variant) {
        acc.push({ key, label, ...variant });
      }
      return acc;
    }, []);
  }, [card]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { paddingTop: insets.top, borderBottomColor: colors.borderLight }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {card?.name} Variants
          </Text>
          <Pressable onPress={onClose} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView style={styles.variantGalleryScroll} contentContainerStyle={styles.variantGalleryContent}>
          {variants.length > 0 ? (
            variants.map((variant, idx) => {
              const vs = getVariantStyle(variant.key);
              return (
                <View key={idx} style={[styles.variantGalleryItem, { borderColor: colors.borderLight }]}>
                  <View style={styles.variantGalleryImageContainer}>
                    <Image
                      source={variant.images?.large || ""}
                      style={styles.variantGalleryImage}
                      contentFit="contain"
                    />
                    {vs.showGradient && (
                      <LinearGradient
                        colors={vs.gradientColors}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={styles.variantGalleryOverlay}
                        pointerEvents="none"
                      />
                    )}
                  </View>

                  <View style={styles.variantGalleryInfo}>
                    <View style={[styles.variantGalleryBadge, { backgroundColor: vs.badge }]}>
                      <Text style={[styles.variantGalleryBadgeText, { color: vs.badgeText }]}>
                        {variant.label}
                      </Text>
                    </View>

                    {variant.prices && (
                      <View style={styles.variantPrices}>
                        {variant.prices.mid && (
                          <View style={styles.priceRow}>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Mid Price:</Text>
                            <Text style={[{ color: colors.pokemonRed, fontSize: 13, fontFamily: "Outfit_700Bold" }]}>
                              {formatGBP(variant.prices.mid)}
                            </Text>
                          </View>
                        )}
                        {variant.prices.high && (
                          <View style={styles.priceRow}>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>High:</Text>
                            <Text style={{ color: colors.pokemonRed, fontSize: 13, fontFamily: "Outfit_700Bold" }}>
                              {formatGBP(variant.prices.high)}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.noVariantsContainer}>
              <Text style={{ color: colors.textSecondary }}>No variants available for this card</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function SetDetailScreen() {
  const { id, name } = useLocalSearchParams();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const [cards, setCards] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [showVariantModal, setShowVariantModal] = useState(false);

  // ... (keep existing fetchCards, load, refresh logic)
  const fetchCards = useCallback(async (setId: string) => {
    try {
      setIsLoading(true);
      setHasError(false);
      const data = await fetchSetCards(setId);
      if (data) {
        const sorted = sortCardsByNumber(data.cards);
        setCards(sorted);
        setLoaded(sorted.length);
        setTotalCount(data.total);
      }
    } catch (error) {
      console.error("Error fetching cards:", error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) fetchCards(id as string);
  }, [id, fetchCards]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchCards(id as string).finally(() => setIsRefreshing(false));
  }, [id, fetchCards]);

  const availableRarities = useMemo(() => {
    const rarities = [...new Set(cards.map(c => c.rarity))].filter(Boolean);
    return rarities.sort((a, b) => rarityRank(a) - rarityRank(b));
  }, [cards]);

  const filteredCount = useMemo(() => {
    return activeFilter ? cards.filter(c => c.rarity === activeFilter).length : cards.length;
  }, [cards, activeFilter]);

  const expandedCards = useMemo(() => {
    let result = cards;
    if (activeFilter) result = result.filter(c => c.rarity === activeFilter);
    return result;
  }, [cards, activeFilter]);

  const handleVariantPress = useCallback((card: any) => {
    setSelectedCard(card);
    setShowVariantModal(true);
  }, []);

  const renderItem = useCallback(
    ({ item: card }: { item: any }) => (
      <CardGridItem
        card={card}
        colors={colors}
        collectionData={null}
        onVariantPress={handleVariantPress}
      />
    ),
    [colors, handleVariantPress]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.surface, colors.background]}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: insets.top }]}
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
            <Ionicons name="refresh" size={20} color={isLoading || isRefreshing ? colors.textMuted : colors.text} />
          </Pressable>
        </View>

        {!isLoading && availableRarities.length > 1 && (
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            style={styles.filterScroll} contentContainerStyle={styles.filterContent}
          >
            <Pressable
              style={[styles.filterChip, {
                backgroundColor: !activeFilter ? colors.pokemonRed : colors.surface,
                borderColor: !activeFilter ? colors.pokemonRed : colors.borderLight,
              }]}
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
                  style={[styles.filterChip, {
                    backgroundColor: active ? colors.pokemonRed : colors.surface,
                    borderColor: active ? colors.pokemonRed : colors.borderLight,
                  }]}
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
          data={expandedCards}
          renderItem={renderItem}
          keyExtractor={(item: any) => item.renderId || item.id}
          numColumns={NUM_COLS}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[styles.listContent, { paddingBottom: 40 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing} onRefresh={handleRefresh}
              tintColor={colors.pokemonRed} colors={[colors.pokemonRed]}
            />
          }
          ListEmptyComponent={
            hasError ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="wifi-off" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.text }]}>Couldn't load cards</Text>
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
            ) : (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="cards-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No cards found</Text>
              </View>
            )
          }
        />
      )}

      <VariantGalleryModal
        visible={showVariantModal}
        card={selectedCard}
        colors={colors}
        onClose={() => setShowVariantModal(false)}
      />
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
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  filterChipText: { fontSize: 12, fontFamily: "Outfit_600SemiBold" },
  listContent: { paddingHorizontal: H_PAD, paddingTop: 10 },
  gridRow: { gap: GAP, marginBottom: GAP },
  gridItem: { borderRadius: 10, borderWidth: 2, overflow: "hidden" },
  gridImage: { borderTopLeftRadius: 9, borderTopRightRadius: 9 },
  gridInfo: { padding: 8, gap: 2 },
  gridName: { fontSize: 11, fontFamily: "Outfit_600SemiBold", lineHeight: 14 },
  gridNumber: { fontSize: 9, fontFamily: "Outfit_500Medium" },
  gridPrice: { fontSize: 11, fontFamily: "Outfit_700Bold", marginTop: 3 },
  
  // Enhanced variant badge
  variantBadge: {
    position: "absolute", bottom: 6, left: 6,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
  },
  variantBadgeText: { fontSize: 9, fontFamily: "Outfit_700Bold" },
  variantDot: { width: 5, height: 5, borderRadius: 2.5 },

  // Animation effects
  variantOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  shimmerEffect: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)",
  },
  glowEffect: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 2, shadowOpacity: 0.5, shadowRadius: 8, elevation: 8,
  },
  cosmicEffect: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    background: "radial-gradient(circle at 30% 30%, rgba(180,79,255,0.2), transparent 70%)",
  },
  sparkle: {
    position: "absolute", width: 4, height: 4, borderRadius: 2,
    opacity: 0.8,
  },

  stampBadge: {
    position: "absolute", top: 6, right: 6,
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
    flexDirection: "row", alignItems: "center", gap: 2,
  },
  stampBadgeText: { color: "#FFD700", fontSize: 8, fontFamily: "Outfit_700Bold" },

  // Modal styles
  modalContainer: { flex: 1 },
  modalHeader: { 
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontFamily: "Outfit_700Bold" },
  modalCloseBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

  variantGalleryScroll: { flex: 1 },
  variantGalleryContent: { padding: 16, gap: 12 },
  variantGalleryItem: {
    borderRadius: 12, borderWidth: 1, overflow: "hidden",
    flexDirection: "row", minHeight: 180,
  },
  variantGalleryImageContainer: {
    flex: 1, justifyContent: "center", alignItems: "center",
  },
  variantGalleryImage: { width: "100%", height: "100%" },
  variantGalleryOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },

  variantGalleryInfo: { flex: 1, padding: 12, justifyContent: "space-between" },
  variantGalleryBadge: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    alignSelf: "flex-start", marginBottom: 8,
  },
  variantGalleryBadgeText: { fontSize: 11, fontFamily: "Outfit_700Bold" },

  variantPrices: { gap: 4 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  noVariantsContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 40 },

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "Outfit_500Medium" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Outfit_600SemiBold" },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 8 },
  retryBtnText: { color: "#FFF", fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  collectionBadge: { position: "absolute", bottom: 4, right: 4 },
  collectionBadgeInner: { flexDirection: "row", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" },
});
