import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  useColorScheme,
  FlatList,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useThemeColors } from "@/constants/colors";
import {
  getUKPrice,
  formatGBP,
  PokemonCard,
} from "@/lib/pokemon-api";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 3;
const CARD_IMG_HEIGHT = CARD_WIDTH * 1.4;

// Complete variant mapping with all 16 types
const VARIANT_INFO: Record<string, { label: string; color: string; icon: string }> = {
  // Base variants
  normal: { label: "Non-Holo", color: "#95a5a6", icon: "square-outline" },
  non_holo: { label: "Non-Holo", color: "#95a5a6", icon: "square-outline" },
  holo: { label: "Holo", color: "#f39c12", icon: "sparkles" },
  reverse_holo: { label: "Reverse Holo", color: "#3498db", icon: "refresh-circle" },

  // Special finish variants
  cosmos_holo: { label: "Cosmos Holo", color: "#9b59b6", icon: "star-box" },
  cracked_ice: { label: "Cracked Ice", color: "#1abc9c", icon: "snowflake" },
  master_ball: { label: "Master Ball", color: "#c0392b", icon: "circle-slice-8" },
  poke_ball: { label: "Poké Ball", color: "#e74c3c", icon: "circle" },

  // Stamp variants
  staff_stamp: { label: "Staff Stamp", color: "#34495e", icon: "stamper" },
  prerelease_stamp: { label: "Prerelease", color: "#16a085", icon: "stamp" },
  winner_stamp: { label: "Winner", color: "#d4af37", icon: "trophy" },
  league_stamp: { label: "League", color: "#2980b9", icon: "shield-star" },
  champion_stamp: { label: "Champion", color: "#f39c12", icon: "crown" },
  set_stamp: { label: "Set Stamp", color: "#8e44ad", icon: "tag" },
};

function getVariantInfo(
  variantLabel?: string,
  finishType?: string,
  variant?: string
): { label: string; color: string; icon: string } {
  const source = variantLabel || finishType || variant || "normal";
  const normalized = source.toLowerCase().trim().replace(/\s+/g, "_");

  if (VARIANT_INFO[normalized]) {
    return VARIANT_INFO[normalized];
  }

  if (normalized.includes("reverse")) {
    return VARIANT_INFO.reverse_holo;
  }
  if (normalized.includes("holo") && !normalized.includes("reverse")) {
    return VARIANT_INFO.holo;
  }
  if (normalized.includes("cosmos")) {
    return VARIANT_INFO.cosmos_holo;
  }
  if (normalized.includes("cracked")) {
    return VARIANT_INFO.cracked_ice;
  }
  if (normalized.includes("master")) {
    return VARIANT_INFO.master_ball;
  }
  if (normalized.includes("poke")) {
    return VARIANT_INFO.poke_ball;
  }
  if (normalized.includes("staff")) {
    return VARIANT_INFO.staff_stamp;
  }
  if (normalized.includes("prerelease")) {
    return VARIANT_INFO.prerelease_stamp;
  }
  if (normalized.includes("winner")) {
    return VARIANT_INFO.winner_stamp;
  }
  if (normalized.includes("league")) {
    return VARIANT_INFO.league_stamp;
  }
  if (normalized.includes("champion")) {
    return VARIANT_INFO.champion_stamp;
  }
  if (normalized.includes("set") && normalized.includes("stamp")) {
    return VARIANT_INFO.set_stamp;
  }

  return VARIANT_INFO.normal;
}

export default function SetDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();

  const [selectedRarity, setSelectedRarity] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: cards = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["setCards", id],
    queryFn: async () => {
      if (!id) throw new Error("No set ID provided");

      try {
        console.log(`[SetDetail] Fetching cards for set: ${id}`);

        // Fetch from API with proper error handling
        const response = await fetch(
          `https://api.pokemontcg.io/v2/cards?q=set.id:${id}`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const json = await response.json();
        console.log("[SetDetail] API Response:", json);

        // Handle different response formats
        let cardsArray: PokemonCard[] = [];

        if (json.data && Array.isArray(json.data)) {
          cardsArray = json.data;
        } else if (Array.isArray(json)) {
          cardsArray = json;
        } else {
          throw new Error("Invalid API response format");
        }

        if (!cardsArray || cardsArray.length === 0) {
          throw new Error("No cards found in set");
        }

        console.log(`[SetDetail] Received ${cardsArray.length} base cards`);

        // Expand variants
        const expanded: PokemonCard[] = [];

        for (const card of cardsArray) {
          try {
            if (!card.tcgplayer?.prices) {
              expanded.push(card);
              continue;
            }

            const prices = card.tcgplayer.prices;
            const variants = [];

            if (prices.normal) {
              variants.push({
                ...card,
                variantLabel: "Non-Holo",
                finishType: "normal",
              });
            }
            if (prices.holofoil) {
              variants.push({
                ...card,
                variantLabel: "Holo",
                finishType: "holo",
              });
            }
            if (prices.reverseHolofoil) {
              variants.push({
                ...card,
                variantLabel: "Reverse Holo",
                finishType: "reverse_holo",
              });
            }
            if (prices["1stEditionNormal"]) {
              variants.push({
                ...card,
                variantLabel: "1st Ed Non-Holo",
                finishType: "1st_edition",
              });
            }
            if (prices["1stEditionHolofoil"]) {
              variants.push({
                ...card,
                variantLabel: "1st Ed Holo",
                finishType: "1st_edition_holo",
              });
            }

            if (variants.length > 0) {
              expanded.push(...variants);
            } else {
              expanded.push(card);
            }
          } catch (cardErr) {
            console.error(`[SetDetail] Error processing card:`, cardErr);
            expanded.push(card);
          }
        }

        console.log(
          `[SetDetail] Expanded ${cardsArray.length} cards to ${expanded.length} variants`
        );
        return expanded;
      } catch (err: any) {
        console.error("[SetDetail] Error fetching cards:", err);
        throw new Error(`Failed to load cards: ${err.message}`);
      }
    },
    retry: 2,
    staleTime: 1000 * 60 * 30,
  });

  const rarities = useMemo(() => {
    const unique = new Set(cards.map((c) => c.rarity).filter(Boolean));
    return ["All", ...Array.from(unique).sort()];
  }, [cards]);

  const filteredCards = useMemo(() => {
    if (!selectedRarity || selectedRarity === "All") return cards;
    return cards.filter((c) => c.rarity === selectedRarity);
  }, [cards, selectedRarity]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderCard = ({ item }: { item: PokemonCard }) => {
    const price = getUKPrice(item);
    const variantInfo = getVariantInfo(
      item.variantLabel,
      item.finishType,
      item.variant
    );

    return (
      <Pressable
        style={{ width: CARD_WIDTH, marginBottom: 16 }}
        onPress={() => {
          router.push({
            pathname: "/card/[id]",
            params: {
              id: item.id,
              variant: variantInfo.label,
            },
          });
        }}
      >
        <View
          style={[
            styles.cardImageContainer,
            {
              height: CARD_IMG_HEIGHT,
              backgroundColor: colors.surface,
            },
          ]}
        >
          {item.images?.small ? (
            <Image
              source={{ uri: item.images.small }}
              style={styles.cardImage}
              contentFit="contain"
              placeholder={{ color: colors.surfaceVariant }}
            />
          ) : (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="image-outline" size={32} color={colors.textMuted} />
            </View>
          )}

          <View
            style={[
              styles.variantBadge,
              { backgroundColor: variantInfo.color },
            ]}
          >
            <MaterialCommunityIcons
              name={variantInfo.icon as any}
              size={10}
              color="#FFF"
            />
            <Text style={styles.variantBadgeText}>{variantInfo.label}</Text>
          </View>
        </View>

        <Text
          style={[styles.cardName, { color: colors.text }]}
          numberOfLines={2}
        >
          {item.name}
        </Text>

        <Text style={[styles.cardNumber, { color: colors.textSecondary }]}>
          #{item.number}
        </Text>

        {price.price ? (
          <Text style={[styles.cardPrice, { color: colors.success }]}>
            {formatGBP(price.price)}
          </Text>
        ) : (
          <Text style={[styles.cardPrice, { color: colors.textMuted }]}>
            Price N/A
          </Text>
        )}
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {name || "Set"}
          </Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.pokemonRed} />
          <Text style={[styles.text, { color: colors.textSecondary }]}>
            Loading cards...
          </Text>
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {name || "Set"}
          </Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={colors.pokemonRed}
          />
          <Text style={[styles.text, { color: colors.text }, { textAlign: "center" }]}>
            Error Loading Cards
          </Text>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {error?.message || "Unknown error"}
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={[styles.button, { backgroundColor: colors.pokemonRed }]}
          >
            <Text style={styles.buttonText}>Retry</Text>
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            style={[styles.button, { backgroundColor: colors.textMuted }]}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (cards.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {name || "Set"}
          </Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="card-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.text, { color: colors.text }]}>
            No cards found
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.button, { backgroundColor: colors.pokemonRed }]}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {name || "Set"}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.cardCountContainer}>
        <Text style={[styles.cardCount, { color: colors.textSecondary }]}>
          {filteredCards.length}/{cards.length} variants
        </Text>
      </View>

      {rarities.length > 1 && (
        <View style={styles.filterContainer}>
          {rarities.map((rarity) => (
            <Pressable
              key={rarity}
              style={[
                styles.filterBtn,
                {
                  backgroundColor:
                    selectedRarity === rarity || (!selectedRarity && rarity === "All")
                      ? colors.pokemonRed
                      : colors.card,
                  borderColor: colors.borderLight,
                },
              ]}
              onPress={() =>
                setSelectedRarity(rarity === "All" ? null : rarity)
              }
            >
              <Text
                style={[
                  styles.filterBtnText,
                  {
                    color:
                      selectedRarity === rarity || (!selectedRarity && rarity === "All")
                        ? "#FFF"
                        : colors.textSecondary,
                  },
                ]}
              >
                {rarity}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <FlatList
        data={filteredCards}
        renderItem={renderCard}
        keyExtractor={(item, index) => `${item.id}-${item.variantLabel}-${index}`}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContainer}
        scrollIndicatorInsets={{ right: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.text, { color: colors.textMuted }]}>
              No cards match this filter
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Outfit_700Bold",
    flex: 1,
    textAlign: "center",
  },
  cardCountContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cardCount: {
    fontSize: 13,
    fontFamily: "Outfit_500Medium",
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterBtnText: {
    fontSize: 12,
    fontFamily: "Outfit_600SemiBold",
  },
  gridContainer: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  gridRow: {
    gap: 12,
    justifyContent: "space-between",
  },
  cardImageContainer: {
    position: "relative",
    marginBottom: 8,
    borderRadius: 10,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  variantBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  variantBadgeText: {
    fontSize: 8,
    fontFamily: "Outfit_600SemiBold",
    color: "#FFF",
  },
  cardName: {
    fontSize: 12,
    fontFamily: "Outfit_600SemiBold",
    marginBottom: 2,
  },
  cardNumber: {
    fontSize: 11,
    fontFamily: "Outfit_400Regular",
    marginBottom: 4,
  },
  cardPrice: {
    fontSize: 12,
    fontFamily: "Outfit_700Bold",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  text: {
    fontSize: 16,
    fontFamily: "Outfit_500Medium",
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
    textAlign: "center",
  },
});
