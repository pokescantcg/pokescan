<<<<<<< HEAD
import React, { useState, useMemo, useEffect } from "react";
=======
import React, { useCallback, useState, useEffect, useMemo } from "react";
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
import {
  StyleSheet,
  Text,
  View,
<<<<<<< HEAD
  Pressable,
  useColorScheme,
  FlatList,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Animated,
  TextInput,
  Modal,
=======
  FlatList,
  Pressable,
  useColorScheme,
  Platform,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
<<<<<<< HEAD
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useThemeColors } from "@/constants/colors";
import { getUKPrice, formatGBP, PokemonCard } from "@/lib/pokemon-api";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 3;
const CARD_IMG_HEIGHT = CARD_WIDTH * 1.4;

const VARIANT_INFO: Record<string, { label: string; color: string }> = {
  normal: { label: "Non-Holo", color: "#95a5a6" },
  non_holo: { label: "Non-Holo", color: "#95a5a6" },
  holo: { label: "Holo", color: "#f39c12" },
  reverse_holo: { label: "Reverse Holo", color: "#3498db" },
  cosmos_holo: { label: "Cosmos Holo", color: "#9b59b6" },
  cracked_ice: { label: "Cracked Ice", color: "#1abc9c" },
  master_ball: { label: "Master Ball", color: "#c0392b" },
  poke_ball: { label: "Poké Ball", color: "#e74c3c" },
  staff_stamp: { label: "Staff Stamp", color: "#34495e" },
  prerelease_stamp: { label: "Prerelease", color: "#16a085" },
  winner_stamp: { label: "Winner", color: "#d4af37" },
  league_stamp: { label: "League", color: "#2980b9" },
  champion_stamp: { label: "Champion", color: "#f39c12" },
  set_stamp: { label: "Set Stamp", color: "#8e44ad" },
};

function getVariantInfo(
  variantLabel?: string,
  finishType?: string,
  variant?: string,
): { label: string; color: string } {
  const source = variantLabel || finishType || variant || "normal";
  const normalized = source.toLowerCase().trim().replace(/\s+/g, "_");

  if (VARIANT_INFO[normalized]) {
    return VARIANT_INFO[normalized];
  }

  if (normalized.includes("reverse")) return VARIANT_INFO.reverse_holo;
  if (normalized.includes("holo") && !normalized.includes("reverse"))
    return VARIANT_INFO.holo;
  if (normalized.includes("cosmos")) return VARIANT_INFO.cosmos_holo;
  if (normalized.includes("cracked")) return VARIANT_INFO.cracked_ice;
  if (normalized.includes("master")) return VARIANT_INFO.master_ball;
  if (normalized.includes("poke")) return VARIANT_INFO.poke_ball;
  if (normalized.includes("staff")) return VARIANT_INFO.staff_stamp;
  if (normalized.includes("prerelease")) return VARIANT_INFO.prerelease_stamp;
  if (normalized.includes("winner")) return VARIANT_INFO.winner_stamp;
  if (normalized.includes("league")) return VARIANT_INFO.league_stamp;
  if (normalized.includes("champion")) return VARIANT_INFO.champion_stamp;
  if (normalized.includes("set") && normalized.includes("stamp"))
    return VARIANT_INFO.set_stamp;

  return VARIANT_INFO.normal;
}

function AnimatedVariantBadge({ variantInfo }: { variantInfo: any }) {
  const scaleAnim = new Animated.Value(1);
  const rotateAnim = new Animated.Value(0);
  const glowAnim = new Animated.Value(0);

  useEffect(() => {
    const variantLower = variantInfo.label.toLowerCase();

    // Different animations for different variants
    if (variantLower.includes("holo") && !variantLower.includes("reverse")) {
      // Holo - Sparkle pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.15,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else if (variantLower.includes("reverse")) {
      // Reverse Holo - Sparkle pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.15,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else if (variantLower.includes("cosmos")) {
      // Cosmos - Glow pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: false,
          }),
        ]),
      ).start();
    } else if (variantLower.includes("cracked")) {
      // Cracked Ice - Shake effect
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.05,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.95,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else if (
      variantLower.includes("master") ||
      variantLower.includes("poke")
    ) {
      // Master/Poke Ball - Bounce
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else if (variantLower.includes("stamp")) {
      // Stamps - Gentle pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.08,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else if (variantLower.includes("1st")) {
      // 1st Edition - Rotate slowly
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      // Default - Standard pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [scaleAnim, rotateAnim, glowAnim, variantInfo.label]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const shadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.9],
  });

  const getVariantStyle = () => {
    const variantLower = variantInfo.label.toLowerCase();

    if (variantLower.includes("cosmos")) {
      return {
        shadowColor: variantInfo.color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: shadowOpacity,
        shadowRadius: 8,
      };
    }

    return {};
  };

  return (
    <Animated.View
      style={[
        styles.variantBadge,
        {
          backgroundColor: variantInfo.color,
          transform: [{ scale: scaleAnim }, { rotate: rotate }],
        },
        getVariantStyle(),
      ]}
    >
      <View style={styles.pokeball}>
        <View style={styles.pokeballTop} />
        <View style={styles.pokeballMiddle} />
        <View style={styles.pokeballBottom} />
      </View>
      <Text style={styles.variantBadgeText}>{variantInfo.label}</Text>
    </Animated.View>
  );
}

function AnimatedRarityBorder({
  rarity,
  children,
}: {
  rarity: string;
  children: React.ReactNode;
}) {
  const glowAnim = new Animated.Value(0);
  const rotateAnim = new Animated.Value(0);

  useEffect(() => {
    // Glow pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ]),
    ).start();

    // Rotation for special rarities
    if (
      rarity?.toLowerCase().includes("rare") ||
      rarity?.toLowerCase().includes("ultra")
    ) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ).start();
    }
  }, [glowAnim, rotateAnim, rarity]);

  const getBorderStyle = () => {
    if (!rarity) return null;

    const rarityLower = rarity.toLowerCase();

    // Secret Rare - Rainbow gradient rotating
    if (rarityLower.includes("secret")) {
      const rotate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
      });

      return {
        borderWidth: 3,
        borderColor: "transparent",
        borderRadius: 10,
        shadowColor: "#ff00ff",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        transform: [{ rotate }],
      };
    }

    // Ultra Rare - Gold pulsing
    if (rarityLower.includes("ultra")) {
      const opacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.5, 1],
      });

      return {
        borderWidth: 2.5,
        borderColor: "#FFD700",
        borderRadius: 10,
        shadowColor: "#FFD700",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: opacity,
        shadowRadius: 8,
      };
    }

    // Hyper Rare - Blue electric pulse
    if (rarityLower.includes("hyper")) {
      const opacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.4, 1],
      });

      return {
        borderWidth: 2.5,
        borderColor: "#00BFFF",
        borderRadius: 10,
        shadowColor: "#00BFFF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: opacity,
        shadowRadius: 10,
      };
    }

    // Double Rare - Purple shimmer
    if (rarityLower.includes("double")) {
      const opacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.9],
      });

      return {
        borderWidth: 2,
        borderColor: "#9370DB",
        borderRadius: 10,
        shadowColor: "#9370DB",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: opacity,
        shadowRadius: 6,
      };
    }

    // Rare - Green glow
    if (rarityLower.includes("rare") && !rarityLower.includes("common")) {
      const opacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
      });

      return {
        borderWidth: 2,
        borderColor: "#32CD32",
        borderRadius: 10,
        shadowColor: "#32CD32",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: opacity,
        shadowRadius: 5,
      };
    }

    // Uncommon - Silver subtle glow
    if (rarityLower.includes("uncommon")) {
      return {
        borderWidth: 1.5,
        borderColor: "#C0C0C0",
        borderRadius: 10,
        shadowColor: "#C0C0C0",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 3,
      };
    }

    // Common - Simple gray border
    if (rarityLower.includes("common")) {
      return {
        borderWidth: 1,
        borderColor: "#808080",
        borderRadius: 10,
      };
    }

    // Promo - Orange glow
    if (rarityLower.includes("promo")) {
      const opacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.4, 0.8],
      });

      return {
        borderWidth: 2,
        borderColor: "#FF8C00",
        borderRadius: 10,
        shadowColor: "#FF8C00",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: opacity,
        shadowRadius: 6,
      };
    }

    return null;
  };

  const borderStyle = getBorderStyle();

  if (!borderStyle) {
    return <>{children}</>;
  }

  return <Animated.View style={borderStyle}>{children}</Animated.View>;
}

export default function SetDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();

  const [selectedRarity, setSelectedRarity] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showRarityDropdown, setShowRarityDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
        const response = await fetch(
          `https://api.pokemontcg.io/v2/cards?q=set.id:${id}`,
          {
            headers: { "Content-Type": "application/json" },
          },
        );

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const json = await response.json();
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

        const expanded: PokemonCard[] = [];

        for (const card of cardsArray) {
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
        }

        return expanded;
      } catch (err: any) {
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
    let filtered = cards;

    if (selectedRarity && selectedRarity !== "All") {
      filtered = filtered.filter((c) => c.rarity === selectedRarity);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name?.toLowerCase().includes(query) ||
          c.number?.toString().includes(query),
      );
    }

    return filtered;
  }, [cards, selectedRarity, searchQuery]);

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
      item.variant,
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
        <AnimatedRarityBorder rarity={item.rarity}>
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
                <Ionicons
                  name="image-outline"
                  size={32}
                  color={colors.textMuted}
                />
              </View>
            )}

            <AnimatedVariantBadge variantInfo={variantInfo} />
          </View>
        </AnimatedRarityBorder>

        <Text
          style={[styles.cardName, { color: colors.text }]}
          numberOfLines={2}
        >
          {item.name}
        </Text>

        <Text style={[styles.cardNumber, { color: colors.textSecondary }]}>
          #{item.number}
        </Text>

        <View
          style={[
            styles.priceBadge,
            { backgroundColor: colors.success + "20" },
          ]}
        >
          {price.price ? (
            <>
              <Text style={[styles.cardPrice, { color: colors.success }]}>
                {formatGBP(price.price)}
              </Text>
              <Text style={[styles.priceSource, { color: colors.textMuted }]}>
                {price.source || "Market"}
              </Text>
            </>
          ) : (
            <Text style={[styles.cardPrice, { color: colors.textMuted }]}>
              N/A
            </Text>
          )}
        </View>
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
          <Text
            style={[styles.headerTitle, { color: colors.text }]}
            numberOfLines={1}
          >
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
          <Text
            style={[styles.headerTitle, { color: colors.text }]}
            numberOfLines={1}
          >
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
          <Text
            style={[
              styles.text,
              { color: colors.text },
              { textAlign: "center" },
            ]}
          >
            Error Loading Cards
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={[styles.button, { backgroundColor: colors.pokemonRed }]}
          >
            <Text style={styles.buttonText}>Retry</Text>
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
          <Text
            style={[styles.headerTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {name || "Set"}
          </Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="card-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.text, { color: colors.text }]}>
            No cards found
          </Text>
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
        <Text
          style={[styles.headerTitle, { color: colors.text }]}
          numberOfLines={1}
        >
          {name || "Set"}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {/* Rarity Dropdown - Above Grid */}
      {rarities.length > 1 && (
        <View style={styles.dropdownSection}>
          <Pressable
            style={[
              styles.dropdownButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderLight,
              },
            ]}
            onPress={() => setShowRarityDropdown(!showRarityDropdown)}
          >
            <Text style={[styles.dropdownButtonText, { color: colors.text }]}>
              {selectedRarity || "All Rarities"}
            </Text>
            <Ionicons
              name={showRarityDropdown ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>

          <Modal
            visible={showRarityDropdown}
            transparent
            animationType="fade"
            onRequestClose={() => setShowRarityDropdown(false)}
          >
            <Pressable
              style={styles.modalOverlay}
              onPress={() => setShowRarityDropdown(false)}
            >
              <View
                style={[
                  styles.dropdownContent,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                <ScrollView bounces={false} showsVerticalScrollIndicator={true}>
                  {rarities.map((rarity) => (
                    <Pressable
                      key={rarity}
                      style={[
                        styles.dropdownItem,
                        {
                          backgroundColor:
                            selectedRarity === rarity ||
                            (!selectedRarity && rarity === "All")
                              ? colors.pokemonRed + "20"
                              : "transparent",
                          borderBottomColor: colors.borderLight,
                        },
                      ]}
                      onPress={() => {
                        setSelectedRarity(rarity === "All" ? null : rarity);
                        setShowRarityDropdown(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          {
                            color: colors.text,
                            fontWeight:
                              selectedRarity === rarity ||
                              (!selectedRarity && rarity === "All")
                                ? "700"
                                : "400",
                          },
                        ]}
                      >
                        {rarity}
                      </Text>
                      {(selectedRarity === rarity ||
                        (!selectedRarity && rarity === "All")) && (
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color={colors.pokemonRed}
                        />
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </Pressable>
          </Modal>
        </View>
      )}

      {/* Cards Grid with Search */}
      <FlatList
        data={filteredCards}
        renderItem={renderCard}
        keyExtractor={(item, index) =>
          `${item.id}-${item.variantLabel}-${index}`
        }
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContainer}
        scrollIndicatorInsets={{ right: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <View style={styles.gridHeader}>
            {/* Search Bar - Inside Grid */}
            <View
              style={[
                styles.searchContainer,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderLight,
                },
              ]}
            >
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search by name or #..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={colors.textSecondary}
                  />
                </Pressable>
              )}
            </View>

            {/* Results Count */}
            <Text
              style={[styles.resultsCount, { color: colors.textSecondary }]}
            >
              {filteredCards.length}/{cards.length} variants
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="search-outline"
              size={48}
              color={colors.textMuted}
            />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {searchQuery ? "No cards match" : "No cards found"}
            </Text>
          </View>
        }
      />
=======
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

// Preferred rarity order (most common → rarest)
const RARITY_ORDER = [
  "Common",
  "Uncommon",
  "Rare",
  "Rare Holo",
  "Double Rare",
  "Amazing Rare",
  "Rare Holo V",
  "Rare Holo VMAX",
  "Rare Holo VSTAR",
  "Rare Holo EX",
  "Rare Holo GX",
  "Trainer Gallery Rare Holo",
  "ACE SPEC Rare",
  "Rare Ultra",
  "Illustration Rare",
  "Rare Rainbow",
  "Special Illustration Rare",
  "Hyper Rare",
  "Rare Secret",
  "Rare Shiny",
  "Rare Shiny GX",
  "Rare Shining",
  "Promo",
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
const MAX_BALLS = 5;

function CollectionBadge({ count }: { count: number }) {
  const balls = Math.min(count, MAX_BALLS);
  const extra = count - MAX_BALLS;
  return (
    <View style={styles.collectionBadge}>
      <View style={styles.collectionBadgeInner}>
        {Array.from({ length: balls }).map((_, i) => (
          <MaterialCommunityIcons key={i} name="pokeball" size={11} color={POKEBALL_GOLD} />
        ))}
        {extra > 0 && (
          <Text style={styles.collectionBadgeExtra}>+{extra}</Text>
        )}
      </View>
    </View>
  );
}

function CardGridItem({
  card,
  colors,
  collectionCount,
}: {
  card: PokemonCard;
  colors: ReturnType<typeof useThemeColors>;
  collectionCount: number;
}) {
  const priceData = getUKPrice(card);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.gridItem,
        {
          backgroundColor: colors.card,
          borderColor: collectionCount > 0 ? POKEBALL_GOLD + "80" : colors.borderLight,
          borderWidth: collectionCount > 0 ? 1.5 : 1,
          width: CARD_WIDTH,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
      onPress={() => router.push({ pathname: "/card/[id]", params: { id: card.id } })}
    >
      <View style={{ width: CARD_WIDTH, height: CARD_IMG_HEIGHT }}>
        <Image
          source={{ uri: card.images?.small || "" }}
          style={[styles.gridImage, { height: CARD_IMG_HEIGHT, width: CARD_WIDTH }]}
          contentFit="contain"
          placeholder={{ color: colors.surface }}
          transition={200}
        />
        {collectionCount > 0 && <CollectionBadge count={collectionCount} />}
      </View>
      <View style={styles.gridInfo}>
        <Text style={[styles.gridName, { color: colors.text }]} numberOfLines={2}>
          {card.name}
        </Text>
        <Text style={[styles.gridNumber, { color: colors.textMuted }]}>#{card.number}</Text>
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
    const map = new Map<string, number>();
    for (const item of collection) {
      map.set(item.cardId, (map.get(item.cardId) ?? 0) + item.quantity);
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
      // On mobile, check the local device cache first — instant if already downloaded
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

      // Fetch page 1, then auto-load all remaining pages in background
      try {
        const result = await fetchSetCards(id as string, 1);
        if (cancelled) return;
        setAllCards(sortCardsByNumber(result.cards));
        setTotalCount(result.totalCount);
        setIsLoading(false);
        setIsRefreshing(false);

        // Auto-load all remaining pages silently in the background
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

  // Derive unique rarities present in this set, sorted by rarity order
  const availableRarities = useMemo(() => {
    const seen = new Set<string>();
    allCards.forEach((c) => { if (c.rarity) seen.add(c.rarity); });
    return Array.from(seen).sort((a, b) => rarityRank(a) - rarityRank(b));
  }, [allCards]);

  // Apply active filter
  const filteredCards = useMemo(() => {
    if (!activeFilter) return allCards;
    return allCards.filter((c) => c.rarity === activeFilter);
  }, [allCards, activeFilter]);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const loaded = allCards.length;
  const filteredCount = filteredCards.length;

  const renderItem = useCallback(
    ({ item }: { item: PokemonCard }) => (
      <CardGridItem
        card={item}
        colors={colors}
        collectionCount={collectionMap.get(item.id) ?? 0}
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
          <Pressable
            onPress={handleRefresh}
            style={styles.refreshBtn}
            disabled={isLoading || isRefreshing}
          >
            <Ionicons
              name="refresh"
              size={20}
              color={isLoading || isRefreshing ? colors.textMuted : colors.text}
            />
          </Pressable>
        </View>

        {/* Filter chips — only show once we have rarities */}
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
          keyExtractor={(item) => item.id}
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
                <Pressable
                  onPress={handleRefresh}
                  style={[styles.retryBtn, { backgroundColor: colors.pokemonRed }]}
                >
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
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
    </View>
  );
}

const styles = StyleSheet.create({
<<<<<<< HEAD
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
  dropdownSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  dropdownButtonText: {
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
    paddingTop: 130,
  },
  dropdownContent: {
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 14,
    fontFamily: "Outfit_500Medium",
  },
  gridHeader: {
    gap: 10,
    marginBottom: 8,
  },
  gridContainer: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  gridRow: {
    gap: 12,
    justifyContent: "space-between",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Outfit_500Medium",
  },
  resultsCount: {
    fontSize: 13,
    fontFamily: "Outfit_500Medium",
    paddingHorizontal: 12,
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
  pokeball: {
    width: 12,
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#000",
  },
  pokeballTop: {
    flex: 1,
    backgroundColor: "#E53238",
    borderBottomWidth: 2,
    borderBottomColor: "#000",
  },
  pokeballMiddle: {
    width: 2,
    height: 2,
    backgroundColor: "#000",
    alignSelf: "center",
    marginVertical: -1,
  },
  pokeballBottom: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  variantBadgeText: {
    fontSize: 8,
    fontFamily: "Outfit_700Bold",
    color: "#FFF",
    textShadowColor: "#000",
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  priceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
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
    textAlign: "center",
  },
  priceSource: {
    fontSize: 8,
    fontFamily: "Outfit_500Medium",
    textAlign: "center",
    marginTop: 2,
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
  emptyText: {
    fontSize: 16,
    fontFamily: "Outfit_500Medium",
    marginTop: 12,
  },
  text: {
    fontSize: 16,
    fontFamily: "Outfit_500Medium",
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
=======
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
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 12, fontFamily: "Outfit_600SemiBold" },
  listContent: { paddingHorizontal: H_PAD, paddingTop: 10 },
  gridRow: { gap: GAP, marginBottom: GAP },
  gridItem: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  gridImage: {
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
  },
  gridInfo: {
    padding: 6,
    gap: 1,
  },
  gridName: {
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
    lineHeight: 14,
  },
  gridNumber: {
    fontSize: 10,
    fontFamily: "Outfit_400Regular",
  },
  gridPrice: {
    fontSize: 11,
    fontFamily: "Outfit_700Bold",
    marginTop: 2,
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "Outfit_500Medium" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Outfit_600SemiBold" },
  emptySubText: { fontSize: 13, fontFamily: "Outfit_400Regular", textAlign: "center", paddingHorizontal: 32 },
  refreshBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 4 },
  retryBtnText: { fontSize: 15, fontFamily: "Outfit_600SemiBold", color: "#FFF" },
  footerLoader: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  footerText: { fontSize: 13, fontFamily: "Outfit_400Regular" },
  loadMoreBtn: {
    margin: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
  },
  loadMoreText: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  collectionBadge: {
    position: "absolute",
    top: 5,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  collectionBadgeInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  collectionBadgeExtra: {
    fontSize: 9,
    fontFamily: "Outfit_700Bold",
    color: POKEBALL_GOLD,
    marginLeft: 1,
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
  },
});
