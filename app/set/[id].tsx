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
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useThemeColors } from "@/constants/colors";
import {
  fetchSetCards,
  expandCardVariants,
  getUKPrice,
  formatGBP,
  PokemonCard,
} from "@/lib/pokemon-api";
import { getSetCardsFromCache } from "@/lib/card-cache";

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
  // Priority: variantLabel > finishType > variant
  const source = variantLabel || finishType || variant || "normal";
  const normalized = source.toLowerCase().trim().replace(/\s+/g, "_");

  // Direct match in map
  if (VARIANT_INFO[normalized]) {
    return VARIANT_INFO[normalized];
  }

  // Fuzzy matching
  if (
    normalized.includes("reverse") ||
    normalized.includes("reversal") ||
    normalized.includes("rev")
  ) {
    return VARIANT_INFO.reverse_holo;
  }
  if (normalized.includes("holo") && !normalized.includes("reverse")) {
    return VARIANT_INFO.holo;
  }
  if (normalized.includes("cosmos")) {
    return VARIANT_INFO.cosmos_holo;
  }
  if (normalized.includes("cracked") || normalized.includes("crack")) {
    return VARIANT_INFO.cracked_ice;
  }
  if (normalized.includes("master")) {
    return VARIANT_INFO.master_ball;
  }
  if (normalized.includes("poke") || normalized.includes("pokéball")) {
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

  // Default fallback
  return VARIANT_INFO.normal;
}

export default function SetDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();

  const [selectedRarity, setSelectedRarity] = useState<string | null>(null);

  const {
    data: cards = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["setCards", id],
    queryFn: async () => {
      if (!id) throw new Error("No set ID");

      try {
        // Try cache first
        const cached = getSetCardsFromCache(id);
        if (cached && cached.length > 0) {
          console.log(
            `[SetDetail] Loaded ${cached.length} cards from cache for set ${id}`
          );
          const expanded = expandCardVariants(cached);
          console.log(
            `[SetDetail] Expanded to ${expanded.length} variants from ${cached.length} base cards`
          );
          return expanded;
        }

        // Fetch from API
        console.log(`[SetDetail] Fetching cards for set ${id} from API`);
        const fetched = await fetchSetCards(id);
        const expanded = expandCardVariants(fetched);
        console.log(
          `[SetDetail] Fetched ${fetched.length} cards, expanded to ${expanded.length} variants`
        );
        return expanded;
      } catch (err) {
        console.error("[SetDetail] Error loading cards:", err);
        throw err;
      }
    },
    staleTime: 1000 * 60 * 60,
  });

  const rarities = useMemo(() => {
    const unique = new Set(cards.map((c) => c.rarity).filter(Boolean));
    return ["All", ...Array.from(unique).sort()];
  }, [cards]);

  const filteredCards = useMemo(() => {
    if (!selectedRarity || selectedRarity === "All") return cards;
    return cards.filter((c) => c.rarity === selectedRarity);
  }, [cards, selectedRarity]);

  const renderCard = ({ item, index }: { item: PokemonCard; index: number }) => {
    const price = getUKPrice(item);
    const variantInfo = getVariantInfo(
      item.variantLabel,
      item.finishType,
      item.variant
    );

    // Debug logging
    if (index < 3) {
      console.log(
        `[Card ${index}] name=${item.name}, variant=${item.variantLabel}, finishType=${item.finishType}, display=${variantInfo.label}`
      );
    }

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
        {/* Card Image Container */}
        <View
          style={[
            styles.cardImageContainer,
            {
              height: CARD_IMG_HEIGHT,
              backgroundColor: colors.surface,
            },
          ]}
        >
          {/* Card Image */}
          <Image
            source={{ uri: item.images?.small || "" }}
            style={styles.cardImage}
            contentFit="contain"
            placeholder={{ color: colors.surfaceVariant }}
          />

          {/* Variant Badge - Always Visible */}
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

        {/* Card Name */}
        <Text
          style={[styles.cardName, { color: colors.text }]}
          numberOfLines={2}
        >
          {item.name}
        </Text>

        {/* Card Number */}
        <Text style={[styles.cardNumber, { color: colors.textSecondary }]}>
          #{item.number}
        </Text>

        {/* Price */}
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>
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
          <Text style={[styles.text, { color: colors.text }]}>
            Error loading cards
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

  if (cards.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
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
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {name || "Set"}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {/* Card Count */}
      <View style={styles.cardCountContainer}>
        <Text style={[styles.cardCount, { color: colors.textSecondary }]}>
          {filteredCards.length}/{cards.length} variants
        </Text>
      </View>

      {/* Rarity Filter */}
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

      {/* Cards Grid */}
      <FlatList
        data={filteredCards}
        renderItem={renderCard}
        keyExtractor={(item, index) => `${item.id}-${item.variantLabel}-${index}`}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContainer}
        scrollIndicatorInsets={{ right: 1 }}
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
    backgroundColor: "#000",
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
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
    textAlign: "center",
  },
});
