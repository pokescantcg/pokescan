import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  useColorScheme,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/constants/colors";
import {
  fetchCard,
  getUKPrice,
  formatGBP,
  PokemonCard,
  generateEbaySearchUrl,
  generateEbaySoldUrl,
} from "@/lib/pokemon-api";
import { useUser } from "@/lib/user-context";
import { CardVariant } from "@/lib/storage";

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRADERS = ["PSA", "Beckett", "ACE", "CGC"] as const;

interface ExtendedEbayPrice {
  lowestSold: number | null;
  medianSold: number | null;
  highestSold: number | null;
}

// Safe variant detection
function getAvailableVariants(card: PokemonCard | null): string[] {
  try {
    if (!card?.tcgplayer?.prices) {
      return ["Non-Holo", "Holo", "Reverse Holo"];
    }

    const variants: string[] = [];
    const prices = card.tcgplayer.prices;

    if (prices.normal) variants.push("Non-Holo");
    if (prices.holofoil) variants.push("Holo");
    if (prices.reverseHolofoil) variants.push("Reverse Holo");
    if (prices["1stEditionNormal"]) variants.push("1st Ed");
    if (prices["1stEditionHolofoil"]) variants.push("1st Ed Holo");

    return variants.length > 0
      ? variants
      : ["Non-Holo", "Holo", "Reverse Holo"];
  } catch {
    return ["Non-Holo", "Holo", "Reverse Holo"];
  }
}

function getVariantIcon(variantName: string): string {
  try {
    const name = variantName?.toLowerCase() || "";
    if (name === "non-holo") return "square-outline";
    if (name === "holo") return "sparkles";
    if (name === "reverse holo") return "refresh-circle";
    if (name.includes("1st")) return "medal-outline";
    if (name.includes("alt") || name.includes("art")) return "image-outline";
    if (name.includes("full")) return "expand-outline";
    if (name.includes("secret")) return "star";
    if (name.includes("promo")) return "ribbon-outline";
    return "card-outline";
  } catch {
    return "card-outline";
  }
}

function PriceRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: number | null;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={styles.priceRow}>
      <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.priceValue,
          { color: value ? colors.text : colors.textMuted },
        ]}
      >
        {formatGBP(value)}
      </Text>
    </View>
  );
}

export default function CardDetailScreen() {
  const { id, variant: routeVariant } = useLocalSearchParams<{
    id?: string;
    variant?: string;
  }>();

  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { user, addCard } = useUser();

  const [selectedCondition, setSelectedCondition] = useState("Near Mint");
  const [selectedVariant, setSelectedVariant] = useState<CardVariant>(
    (routeVariant || "Non-Holo") as CardVariant,
  );
  const [gradingCompany, setGradingCompany] = useState("");
  const [grade, setGrade] = useState("");
  const [ebayPrice, setEbayPrice] = useState<number | null>(null);
  const [ebayLoading, setEbayLoading] = useState(false);

  const cardId = id || "";
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const conditions = [
    "Mint",
    "Near Mint",
    "Excellent",
    "Good",
    "Light Play",
    "Played",
  ];

  const {
    data: card,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["card", cardId],
    queryFn: () => {
      if (!cardId) {
        throw new Error("No card ID provided");
      }
      return fetchCard(cardId);
    },
    enabled: !!cardId,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });

  // Sync variant after card loads
  React.useEffect(() => {
    if (!card) return;
    try {
      const v =
        card.finishType ||
        card.variantLabel ||
        card.variant ||
        card.variantType ||
        routeVariant ||
        "Non-Holo";
      setSelectedVariant((v || "Non-Holo") as CardVariant);
    } catch {
      setSelectedVariant("Non-Holo");
    }
  }, [card?.id]);

  // Fetch eBay price
  React.useEffect(() => {
    if (!card?.name) return;

    setEbayLoading(true);
    const params = new URLSearchParams({ cardName: card.name });
    if (card.set?.name) params.set("setName", card.set.name);
    if (card.number) params.set("number", card.number);

    fetch(`/api/ebay/sold-price?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.price) setEbayPrice(data.price);
      })
      .catch(() => {})
      .finally(() => setEbayLoading(false));
  }, [card?.name]);

  const handleAddToCollection = () => {
    try {
      if (!user) {
        Alert.alert("Sign In Required", "Create an account first.", [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => router.push("/register") },
        ]);
        return;
      }

      if (!user.isPremium) {
        Alert.alert("Premium Required", "Upgrade to Premium to continue.");
        return;
      }

      if (!card) return;

      const builtInPrice = getUKPrice(card);
      const effectivePrice = builtInPrice.price ?? ebayPrice ?? null;

      addCard({
        cardId: card.id || "",
        cardName: card.name || "Unknown",
        cardImage: card.images?.small ?? "",
        setName: card.set?.name ?? "",
        setId: card.set?.id ?? "",
        rarity: card.rarity || "Unknown",
        quantity: 1,
        condition: selectedCondition,
        variant: selectedVariant,
        priceGBP: effectivePrice,
        gradingCompany: gradingCompany.trim() || null,
        grade: grade.trim() || null,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", `${card.name} added to your collection.`);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to add card.");
    }
  };

  const openEbayListings = () => {
    try {
      if (!card?.name) return;
      const url = generateEbaySearchUrl(card.name, card.set?.name, card.number);
      Linking.openURL(url);
    } catch {
      Alert.alert("Error", "Could not open eBay.");
    }
  };

  const openEbaySold = () => {
    try {
      if (!card?.name) return;
      const url = generateEbaySoldUrl(card.name, card.set?.name, card.number);
      Linking.openURL(url);
    } catch {
      Alert.alert("Error", "Could not open eBay.");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.header,
            { paddingTop: (insets.top || webTopInset) + 4 },
          ]}
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons
            name="pokeball"
            size={40}
            color={colors.pokemonRed}
          />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading card...
          </Text>
        </View>
      </View>
    );
  }

  // Error state
  if (isError || !card) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.header,
            { paddingTop: (insets.top || webTopInset) + 4 },
          ]}
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons
            name="wifi-off"
            size={48}
            color={colors.textMuted}
          />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Card unavailable
          </Text>
          <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
            This card couldn't be loaded. Try going back and opening the set
            again.
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={[styles.retryBtn, { backgroundColor: colors.pokemonRed }]}
          >
            <Text style={styles.retryBtnText}>Try Again</Text>
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.retryBtn,
              {
                backgroundColor: colors.surface,
                borderWidth: 1.5,
                borderColor: colors.pokemonRed,
              },
            ]}
          >
            <Text style={[styles.retryBtnText, { color: colors.pokemonRed }]}>
              Go Back
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const availableVariants = useMemo(
    () => getAvailableVariants(card),
    [card?.tcgplayer?.prices],
  );

  const builtInPrice = getUKPrice(card);
  const displayPrice = builtInPrice.price ?? ebayPrice ?? null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[styles.header, { paddingTop: (insets.top || webTopInset) + 4 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {card.name || "Card Details"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Card Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: card.images?.large ?? "" }}
            style={styles.cardImage}
            contentFit="contain"
            placeholder={{ color: colors.surface }}
          />
        </View>

        <View style={styles.content}>
          {/* Card Title */}
          <View>
            <Text style={[styles.cardName, { color: colors.text }]}>
              {card.name || "Unknown"}
            </Text>
            <Text style={[styles.cardNumber, { color: colors.textSecondary }]}>
              {card.set?.name ?? ""} #{card.number ?? ""}
            </Text>
          </View>

          {/* Card Details */}
          <View style={styles.detailsGrid}>
            {card.supertype && (
              <View
                style={[
                  styles.detailChip,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                  Type
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {card.supertype}
                </Text>
              </View>
            )}
            {card.hp && (
              <View
                style={[
                  styles.detailChip,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                  HP
                </Text>
                <Text
                  style={[styles.detailValue, { color: colors.pokemonRed }]}
                >
                  {card.hp}
                </Text>
              </View>
            )}
            {card.artist && (
              <View
                style={[
                  styles.detailChip,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                  Artist
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {card.artist}
                </Text>
              </View>
            )}
          </View>

          {/* Pricing Section */}
          <View
            style={[
              styles.priceSection,
              { backgroundColor: colors.card, borderColor: colors.borderLight },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              UK Pricing
            </Text>
            <LinearGradient
              colors={
                colorScheme === "dark"
                  ? ["#1F2B47", "#162040"]
                  : ["#FFF8F8", "#FFF0F0"]
              }
              style={styles.priceDisplay}
            >
              <Text
                style={[styles.priceLabel, { color: colors.textSecondary }]}
              >
                Market Price
              </Text>
              {ebayLoading ? (
                <ActivityIndicator color={colors.pokemonRed} />
              ) : (
                <Text
                  style={[
                    styles.mainPrice,
                    { color: displayPrice ? colors.success : colors.textMuted },
                  ]}
                >
                  {formatGBP(displayPrice)}
                </Text>
              )}
            </LinearGradient>
          </View>

          {/* eBay Section */}
          <View
            style={[
              styles.priceSection,
              { backgroundColor: colors.card, borderColor: colors.borderLight },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              eBay UK
            </Text>
            <View style={styles.ebayButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.ebayBtn,
                  { backgroundColor: "#E53238", opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={openEbayListings}
              >
                <Ionicons name="search" size={16} color="#FFF" />
                <Text style={styles.ebayBtnText}>Active</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.ebayBtn,
                  { backgroundColor: "#0064D2", opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={openEbaySold}
              >
                <Ionicons name="checkmark-done" size={16} color="#FFF" />
                <Text style={styles.ebayBtnText}>Sold</Text>
              </Pressable>
            </View>
          </View>

          {/* Variant Selection */}
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Variant
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.variantRow}
            >
              {availableVariants.map((v) => {
                const active = selectedVariant === v;
                return (
                  <Pressable
                    key={v}
                    style={[
                      styles.variantChip,
                      {
                        backgroundColor: active
                          ? colors.pokemonYellow
                          : colors.card,
                        borderColor: active
                          ? colors.pokemonYellow
                          : colors.borderLight,
                      },
                    ]}
                    onPress={() => setSelectedVariant(v as CardVariant)}
                  >
                    <Ionicons
                      name={getVariantIcon(v) as any}
                      size={14}
                      color={active ? "#000" : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.variantText,
                        { color: active ? "#000" : colors.textSecondary },
                      ]}
                    >
                      {v}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Condition Selection */}
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Condition
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.conditionRow}
            >
              {conditions.map((c) => (
                <Pressable
                  key={c}
                  style={[
                    styles.conditionChip,
                    {
                      backgroundColor:
                        selectedCondition === c
                          ? colors.pokemonRed
                          : colors.card,
                      borderColor:
                        selectedCondition === c
                          ? colors.pokemonRed
                          : colors.borderLight,
                    },
                  ]}
                  onPress={() => setSelectedCondition(c)}
                >
                  <Text
                    style={[
                      styles.conditionText,
                      {
                        color:
                          selectedCondition === c
                            ? "#FFF"
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {c}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Grading Selection */}
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Grading
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.conditionRow}
            >
              {(["None", "PSA", "Beckett", "CGC", "ACE"] as const).map((co) => {
                const selected = (co === "None" ? "" : co) === gradingCompany;
                return (
                  <Pressable
                    key={co}
                    style={[
                      styles.conditionChip,
                      {
                        backgroundColor: selected
                          ? colors.pokemonYellow
                          : colors.card,
                        borderColor: selected
                          ? colors.pokemonYellow
                          : colors.borderLight,
                      },
                    ]}
                    onPress={() => setGradingCompany(co === "None" ? "" : co)}
                  >
                    <Text
                      style={[
                        styles.conditionText,
                        { color: selected ? "#000" : colors.textSecondary },
                      ]}
                    >
                      {co}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Action Button */}
          <LinearGradient
            colors={[colors.pokemonRed, colors.pokemonDarkRed]}
            style={{ borderRadius: 14, marginVertical: 24 }}
          >
            <Pressable
              style={[styles.actionBtn, { paddingVertical: 16 }]}
              onPress={handleAddToCollection}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFF" />
              <Text style={styles.actionBtnText}>Add to Collection</Text>
            </Pressable>
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Outfit_600SemiBold",
    textAlign: "center",
  },
  imageContainer: { alignItems: "center", paddingVertical: 16 },
  cardImage: {
    width: SCREEN_WIDTH * 0.65,
    height: SCREEN_WIDTH * 0.65 * 1.4,
    borderRadius: 12,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
    paddingBottom: 40,
  },
  cardName: { fontSize: 24, fontFamily: "Outfit_700Bold" },
  cardNumber: { fontSize: 13, fontFamily: "Outfit_400Regular", marginTop: 4 },
  detailsGrid: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  detailChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  detailLabel: {
    fontSize: 10,
    fontFamily: "Outfit_400Regular",
    textTransform: "uppercase",
  },
  detailValue: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  sectionTitle: { fontSize: 16, fontFamily: "Outfit_700Bold", marginBottom: 8 },
  priceSection: { borderRadius: 16, padding: 16, borderWidth: 1 },
  priceDisplay: { borderRadius: 12, padding: 16, alignItems: "center", gap: 4 },
  priceLabel: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  mainPrice: { fontSize: 28, fontFamily: "Outfit_700Bold" },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  ebayButtons: { flexDirection: "row", gap: 10 },
  ebayBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  ebayBtnText: {
    fontSize: 13,
    fontFamily: "Outfit_600SemiBold",
    color: "#FFF",
  },
  variantRow: { gap: 8, paddingBottom: 12 },
  variantChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 90,
  },
  variantText: { fontSize: 12, fontFamily: "Outfit_600SemiBold" },
  conditionRow: { gap: 8, paddingBottom: 12 },
  conditionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  conditionText: { fontSize: 13, fontFamily: "Outfit_500Medium" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionBtnText: {
    fontSize: 16,
    fontFamily: "Outfit_600SemiBold",
    color: "#FFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14, fontFamily: "Outfit_400Regular" },
  errorTitle: { fontSize: 18, fontFamily: "Outfit_600SemiBold", marginTop: 4 },
  errorSubtitle: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryBtnText: {
    fontSize: 15,
    fontFamily: "Outfit_600SemiBold",
    color: "#FFF",
  },
});
