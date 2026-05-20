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
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
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
import { CardVariant, updateCollectionItemPrice } from "@/lib/storage";
import { getApiUrl } from "@/lib/query-client";

const SCREEN_WIDTH = Dimensions.get("window").width;

const GRADERS = ["PSA", "Beckett", "ACE", "CGC"] as const;

interface ExtendedEbayPrice {
  lowestSold: number | null;
  medianSold: number | null;
  highestSold: number | null;
  gradedPrices: {
    PSA: { 9: number | null; 10: number | null };
    Beckett: { 9: number | null; 10: number | null };
    ACE: { 9: number | null; 10: number | null };
    CGC: { 9: number | null; 10: number | null };
  } | null;
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

function SoldPriceBreakdown({
  ext,
  loading,
  colors,
}: {
  ext: ExtendedEbayPrice | null;
  loading: boolean;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const [gradedOpen, setGradedOpen] = useState(false);
  const hasAnyGraded = useMemo(() => {
    if (!ext?.gradedPrices) return false;
    return GRADERS.some(
      (g) =>
        ext.gradedPrices![g][9] !== null || ext.gradedPrices![g][10] !== null,
    );
  }, [ext]);

  if (loading) {
    return (
      <View style={styles.soldLoadingRow}>
        <ActivityIndicator size="small" color={colors.pokemonRed} />
        <Text style={[styles.soldLoadingText, { color: colors.textMuted }]}>
          Fetching eBay sold prices…
        </Text>
      </View>
    );
  }
  if (
    !ext ||
    (ext.lowestSold === null &&
      ext.medianSold === null &&
      ext.highestSold === null)
  )
    return null;

  return (
    <View style={styles.soldBreakdownWrap}>
      <View style={styles.soldRow}>
        <View style={styles.soldStat}>
          <Text style={[styles.soldStatLabel, { color: colors.textMuted }]}>
            Lowest Sold
          </Text>
          <Text style={[styles.soldStatValue, { color: colors.pokemonBlue }]}>
            {ext.lowestSold !== null ? formatGBP(ext.lowestSold) : "—"}
          </Text>
        </View>
        <View
          style={[styles.soldDivider, { backgroundColor: colors.borderLight }]}
        />
        <View style={styles.soldStat}>
          <Text style={[styles.soldStatLabel, { color: colors.textMuted }]}>
            Median Sold
          </Text>
          <Text style={[styles.soldStatValue, { color: colors.success }]}>
            {ext.medianSold !== null ? formatGBP(ext.medianSold) : "—"}
          </Text>
        </View>
        <View
          style={[styles.soldDivider, { backgroundColor: colors.borderLight }]}
        />
        <View style={styles.soldStat}>
          <Text style={[styles.soldStatLabel, { color: colors.textMuted }]}>
            Highest Sold
          </Text>
          <Text style={[styles.soldStatValue, { color: colors.pokemonRed }]}>
            {ext.highestSold !== null ? formatGBP(ext.highestSold) : "—"}
          </Text>
        </View>
      </View>

      <Pressable
        style={[styles.gradedToggle, { borderTopColor: colors.borderLight }]}
        onPress={() => setGradedOpen((v) => !v)}
      >
        <MaterialCommunityIcons
          name="certificate-outline"
          size={14}
          color={colors.textMuted}
        />
        <Text style={[styles.gradedToggleText, { color: colors.textMuted }]}>
          {gradedOpen
            ? "Hide Graded Prices"
            : "Graded Prices (PSA / BGS / ACE / CGC)"}
        </Text>
        <Ionicons
          name={gradedOpen ? "chevron-up" : "chevron-down"}
          size={13}
          color={colors.textMuted}
        />
      </Pressable>

      {gradedOpen && (
        <View style={styles.gradedGrid}>
          <View style={styles.gradedHeaderRow}>
            <View style={styles.gradedLabelCol} />
            <Text style={[styles.gradedColHeader, { color: colors.textMuted }]}>
              Grade 9
            </Text>
            <Text style={[styles.gradedColHeader, { color: colors.textMuted }]}>
              Grade 10
            </Text>
          </View>
          {GRADERS.map((grader) => {
            const g9 = ext.gradedPrices?.[grader][9] ?? null;
            const g10 = ext.gradedPrices?.[grader][10] ?? null;
            return (
              <View
                key={grader}
                style={[
                  styles.gradedRow,
                  { borderTopColor: colors.borderLight },
                ]}
              >
                <Text style={[styles.graderName, { color: colors.text }]}>
                  {grader}
                </Text>
                <Text
                  style={[
                    styles.gradedPrice,
                    { color: g9 !== null ? colors.success : colors.textMuted },
                  ]}
                >
                  {g9 !== null ? formatGBP(g9) : "No data"}
                </Text>
                <Text
                  style={[
                    styles.gradedPrice,
                    { color: g10 !== null ? colors.success : colors.textMuted },
                  ]}
                >
                  {g10 !== null ? formatGBP(g10) : "No data"}
                </Text>
              </View>
            );
          })}
          {!hasAnyGraded && (
            <Text style={[styles.noGradedText, { color: colors.textMuted }]}>
              No graded sold results found for this card
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

// Get available variants based on TCGPlayer prices in card data
function getAvailableVariants(card: PokemonCard | null): string[] {
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

  return variants.length > 0 ? variants : ["Non-Holo", "Holo", "Reverse Holo"];
}

// Get the variant icon based on name
function getVariantIcon(variantName: string): string {
  const name = variantName.toLowerCase();
  if (name === "non-holo") return "square-outline";
  if (name === "holo") return "sparkles";
  if (name === "reverse holo") return "refresh-circle";
  if (name.includes("1st")) return "medal-outline";
  if (name.includes("alt") || name.includes("art")) return "image-outline";
  if (name.includes("full")) return "expand-outline";
  if (name.includes("secret")) return "star";
  if (name.includes("promo")) return "ribbon-outline";
  return "card-outline";
}

export default function CardDetailScreen() {
  const { id, variant: routeVariant } = useLocalSearchParams<{
    id: string;
    variant?: string;
  }>();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { user, addCard, createListing, collection } = useUser();
  const [selectedCondition, setSelectedCondition] = useState("Near Mint");
  const [selectedVariant, setSelectedVariant] = useState<CardVariant>(
    (routeVariant || "Non-Holo") as CardVariant,
  );
  const [gradingCompany, setGradingCompany] = useState("");
  const [grade, setGrade] = useState("");

  const [ebayFetchedPrice, setEbayFetchedPrice] = useState<{
    price: number | null;
    source: string;
  } | null>(null);
  const [ebayPriceLoading, setEbayPriceLoading] = useState(false);
  const [extEbayPrice, setExtEbayPrice] = useState<ExtendedEbayPrice | null>(
    null,
  );

  // Listing modal state
  const [listingModalVisible, setListingModalVisible] = useState(false);
  const [listingType, setListingType] = useState<"sale" | "trade">("sale");
  const [listingPrice, setListingPrice] = useState("");
  const [listingDescription, setListingDescription] = useState("");
  const [listingExternalUrl, setListingExternalUrl] = useState("");
  const [listingPhotos, setListingPhotos] = useState<string[]>([]);
  const [listingLoading, setListingLoading] = useState(false);

  const {
    data: card,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["card", id],
    queryFn: () => fetchCard(id),
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  });

  const conditions = [
    "Mint",
    "Near Mint",
    "Excellent",
    "Good",
    "Light Play",
    "Played",
  ];
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const inCollection = collection.some((c) => c.cardId === id);

  // Sync the selected variant once card data arrives
  React.useEffect(() => {
    if (!card) return;
    const v =
      card.finishType ||
      card.variantLabel ||
      card.variant ||
      card.variantType ||
      routeVariant ||
      "Non-Holo";
    setSelectedVariant(v as CardVariant);
  }, [card?.id]);

  React.useEffect(() => {
    if (!card) return;
    setEbayFetchedPrice(null);
    setExtEbayPrice(null);
    setEbayPriceLoading(true);
    const params = new URLSearchParams({ cardName: card.name });
    if (card.set?.name) params.set("setName", card.set.name);
    if (card.number) params.set("number", card.number);
    if (card.id) params.set("cardId", card.id);
    const url = new URL(`/api/ebay/sold-price?${params}`, getApiUrl());
    fetch(url.toString())
      .then((r) => r.json())
      .then((data) => {
        if (data.price)
          setEbayFetchedPrice({
            price: data.price,
            source: data.source || "eBay UK (Sold)",
          });
        if (data.medianSold !== undefined || data.lowestSold !== undefined) {
          setExtEbayPrice({
            lowestSold: data.lowestSold ?? null,
            medianSold: data.medianSold ?? null,
            highestSold: data.highestSold ?? null,
            gradedPrices: data.gradedPrices ?? null,
          });
        }
      })
      .catch(() => {})
      .finally(() => setEbayPriceLoading(false));
  }, [card?.id]);

  useEffect(() => {
    if (!card || !ebayFetchedPrice?.price || !user) return;
    const nullPriceItems = collection.filter(
      (c) => c.cardId === card.id && !c.priceGBP && c.id,
    );
    if (nullPriceItems.length === 0) return;
    nullPriceItems.forEach((item) => {
      updateCollectionItemPrice(item.id!, ebayFetchedPrice.price!);
    });
  }, [ebayFetchedPrice?.price, card?.id]);

  const handleAddToCollection = () => {
    if (!user) {
      Alert.alert(
        "Sign In Required",
        "Create an account to add cards to your collection.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => router.push("/register") },
        ],
      );
      return;
    }
    if (!user.isPremium) {
      Alert.alert(
        "Premium Required",
        "Upgrade to Premium to save cards to your collection.",
      );
      return;
    }
    if (!card) return;
    const builtIn = getUKPrice(card);
    const effectivePrice = builtIn.price ?? ebayFetchedPrice?.price ?? null;
    addCard({
      cardId: card.id,
      cardName: card.name,
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
    Alert.alert("Added!", `${card.name} added to your collection.`);
  };

  const openListingModal = (type: "sale" | "trade") => {
    if (!user?.isPremium) {
      Alert.alert(
        "Premium Required",
        "Upgrade to Premium to list cards on the marketplace.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Upgrade", onPress: () => router.push("/premium") },
        ],
      );
      return;
    }
    if (!card) return;
    setListingType(type);
    setListingPrice(
      type === "sale" ? String(getUKPrice(card).price ?? "") : "",
    );
    setListingDescription("");
    setListingPhotos([]);
    setListingModalVisible(true);
  };

  const pickPhoto = useCallback(async () => {
    if (listingPhotos.length >= 6) {
      Alert.alert("Max Photos", "You can add up to 6 photos per listing.");
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Allow photo library access to add photos to your listing.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: false,
      allowsMultipleSelection: false,
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setListingPhotos((prev) => [
        ...prev,
        `data:image/jpeg;base64,${result.assets[0].base64}`,
      ]);
    }
  }, [listingPhotos]);

  const takePhoto = useCallback(async () => {
    if (listingPhotos.length >= 6) {
      Alert.alert("Max Photos", "You can add up to 6 photos per listing.");
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Allow camera access to take photos for your listing.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setListingPhotos((prev) => [
        ...prev,
        `data:image/jpeg;base64,${result.assets[0].base64}`,
      ]);
    }
  }, [listingPhotos]);

  const removePhoto = useCallback((index: number) => {
    setListingPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const submitListing = useCallback(async () => {
    if (!card || !user) return;
    setListingLoading(true);
    try {
      const priceVal =
        listingType === "sale" ? parseFloat(listingPrice) || null : null;
      await createListing({
        userId: user.id,
        userName: user.displayName,
        cardId: card.id,
        cardName: card.name,
        cardImage: card.images?.small ?? "",
        setName: card.set?.name ?? "",
        rarity: card.rarity || "Unknown",
        type: listingType,
        priceGBP: priceVal,
        condition: selectedCondition,
        description: listingDescription.trim(),
        photos: listingPhotos,
        externalUrl: listingExternalUrl.trim() || null,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setListingModalVisible(false);
      Alert.alert(
        "Listed!",
        `${card.name} listed for ${listingType === "sale" ? "sale" : "trade"} on the marketplace.`,
      );
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.message ?? "Could not create listing. Please try again.",
      );
    } finally {
      setListingLoading(false);
    }
  }, [
    card,
    user,
    listingType,
    listingPrice,
    listingDescription,
    listingPhotos,
    selectedCondition,
    createListing,
  ]);

  const openEbayListings = () => {
    if (!card) return;
    const url = generateEbaySearchUrl(card.name, card.set?.name, card.number);
    Linking.openURL(url);
  };

  const openEbaySold = () => {
    if (!card) return;
    const url = generateEbaySoldUrl(card.name, card.set?.name, card.number);
    Linking.openURL(url);
  };

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
        </View>
      </View>
    );
  }

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
            This card is from an older set that hasn't loaded yet. Go back and
            open the set first, then try tapping the card again.
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={[styles.retryBtn, { backgroundColor: colors.pokemonRed }]}
          >
            <Text style={styles.retryBtnText}>Try again</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/(tabs)/scanner")}
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
              Search by name instead
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const builtInPrice = getUKPrice(card);
  const priceData =
    builtInPrice.price !== null
      ? builtInPrice
      : (ebayFetchedPrice ?? { price: null, source: "" });

  const availableVariants = useMemo(
    () => getAvailableVariants(card),
    [card?.tcgplayer],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[styles.header, { paddingTop: (insets.top || webTopInset) + 4 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text
          style={[styles.headerTitle, { color: colors.text }]}
          numberOfLines={1}
        >
          {card.name}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: card.images?.large ?? undefined }}
            style={styles.cardImage}
            contentFit="contain"
            placeholder={{ color: colors.surface }}
          />
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardName, { color: colors.text }]}>
                {card.name}
              </Text>
              <Text
                style={[styles.cardSetName, { color: colors.textSecondary }]}
              >
                {card.set?.name ?? ""} #{card.number}
              </Text>
            </View>
            {card.rarity && (
              <View
                style={[
                  styles.rarityBadge,
                  { backgroundColor: colors.pokemonYellow + "25" },
                ]}
              >
                <Ionicons name="star" size={12} color={colors.pokemonYellow} />
                <Text
                  style={[styles.rarityText, { color: colors.pokemonYellow }]}
                >
                  {card.rarity}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.detailsGrid}>
            {card.supertype && (
              <View
                style={[
                  styles.detailChip,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.pokemonRed + "30",
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
                    borderColor: colors.pokemonRed + "30",
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
            {card.types && card.types.length > 0 && (
              <View
                style={[
                  styles.detailChip,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.pokemonBlue + "30",
                  },
                ]}
              >
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                  Energy
                </Text>
                <Text
                  style={[styles.detailValue, { color: colors.pokemonBlue }]}
                >
                  {card.types.join(", ")}
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

          <View
            style={[
              styles.priceSection,
              {
                backgroundColor: colors.card,
                borderColor: colors.pokemonRed + "30",
              },
            ]}
          >
            <View style={styles.priceSectionHeader}>
              <Ionicons name="pricetag" size={18} color={colors.pokemonRed} />
              <Text style={[styles.priceSectionTitle, { color: colors.text }]}>
                UK Pricing
              </Text>
            </View>
            <LinearGradient
              colors={
                colorScheme === "dark"
                  ? ["#1F2B47", "#162040"]
                  : ["#FFF8F8", "#FFF0F0"]
              }
              style={styles.mainPrice}
            >
              <Text
                style={[styles.mainPriceLabel, { color: colors.textSecondary }]}
              >
                Market Price (GBP)
              </Text>
              {ebayPriceLoading && !priceData.price ? (
                <ActivityIndicator
                  size="small"
                  color={colors.pokemonRed}
                  style={{ marginVertical: 8 }}
                />
              ) : (
                <Text
                  style={[
                    styles.mainPriceValue,
                    {
                      color: priceData.price
                        ? colors.success
                        : colors.textMuted,
                    },
                  ]}
                >
                  {formatGBP(priceData.price)}
                </Text>
              )}
              <Text
                style={[styles.mainPriceSource, { color: colors.textMuted }]}
              >
                {ebayPriceLoading && !priceData.price
                  ? "Checking eBay UK…"
                  : `via ${priceData.source || "N/A"}`}
              </Text>
            </LinearGradient>

            {/* eBay sold price breakdown */}
            <SoldPriceBreakdown
              ext={extEbayPrice}
              loading={ebayPriceLoading}
              colors={colors}
            />

            {card.cardmarket?.prices && (
              <View style={styles.priceDetails}>
                <PriceRow
                  label="Average Sell"
                  value={card.cardmarket.prices.averageSellPrice}
                  colors={colors}
                />
                <PriceRow
                  label="Low Price"
                  value={card.cardmarket.prices.lowPrice}
                  colors={colors}
                />
                <PriceRow
                  label="Trend Price"
                  value={card.cardmarket.prices.trendPrice}
                  colors={colors}
                />
                <PriceRow
                  label="7-Day Avg"
                  value={card.cardmarket.prices.avg7}
                  colors={colors}
                />
                <PriceRow
                  label="30-Day Avg"
                  value={card.cardmarket.prices.avg30}
                  colors={colors}
                />
              </View>
            )}
          </View>

          <View
            style={[
              styles.ebaySection,
              { backgroundColor: colors.card, borderColor: colors.borderLight },
            ]}
          >
            <View style={styles.priceSectionHeader}>
              <Ionicons name="globe-outline" size={18} color="#E53238" />
              <Text style={[styles.priceSectionTitle, { color: colors.text }]}>
                eBay UK
              </Text>
            </View>
            <Text style={[styles.ebayDesc, { color: colors.textSecondary }]}>
              Compare prices on eBay UK for this card
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
                <Text style={styles.ebayBtnText}>Active Listings</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.ebayBtn,
                  { backgroundColor: "#0064D2", opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={openEbaySold}
              >
                <Ionicons name="checkmark-done" size={16} color="#FFF" />
                <Text style={styles.ebayBtnText}>Sold Items</Text>
              </Pressable>
            </View>
          </View>

          {/* FIXED: Card Variant Section */}
          <Text style={[styles.conditionTitle, { color: colors.text }]}>
            Card Variant
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.variantRow}
          >
            {availableVariants.map((v: string) => {
              const active = selectedVariant === v;
              const iconName = getVariantIcon(v);
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
                      minWidth: 90,
                    },
                  ]}
                  onPress={() => setSelectedVariant(v as CardVariant)}
                >
                  <Ionicons
                    name={iconName as any}
                    size={14}
                    color={active ? "#000" : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.variantChipText,
                      { color: active ? "#000" : colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {v}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={[styles.conditionTitle, { color: colors.text }]}>
            Card Condition
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
                      selectedCondition === c ? colors.pokemonRed : colors.card,
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
                    styles.conditionChipText,
                    {
                      color:
                        selectedCondition === c ? "#FFF" : colors.textSecondary,
                    },
                  ]}
                >
                  {c}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={[styles.conditionTitle, { color: colors.text }]}>
            Grading (Optional)
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.conditionRow, { marginBottom: 8 }]}
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
                      styles.conditionChipText,
                      {
                        color: selected ? "#000" : colors.textSecondary,
                      },
                    ]}
                  >
                    {co}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {gradingCompany && (
            <>
              <Text style={[styles.conditionTitle, { color: colors.text }]}>
                Grade
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.conditionRow}
              >
                {["10", "9.5", "9", "8.5", "8", "7.5", "7"].map((g) => {
                  const selected = g === grade;
                  return (
                    <Pressable
                      key={g}
                      style={[
                        styles.conditionChip,
                        {
                          backgroundColor: selected
                            ? colors.pokemonRed
                            : colors.card,
                          borderColor: selected
                            ? colors.pokemonRed
                            : colors.borderLight,
                        },
                      ]}
                      onPress={() => setGrade(g)}
                    >
                      <Text
                        style={[
                          styles.conditionChipText,
                          {
                            color: selected ? "#FFF" : colors.textSecondary,
                          },
                        ]}
                      >
                        {g}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}

          <View style={styles.actionButtons}>
            <LinearGradient
              colors={
                colorScheme === "dark"
                  ? [colors.pokemonRed, colors.pokemonDarkRed]
                  : [colors.pokemonRed, colors.pokemonDarkRed]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionBtn}
            >
              <Pressable
                style={styles.actionBtnGradient}
                onPress={handleAddToCollection}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFF" />
                <Text style={styles.actionBtnText}>Add to Collection</Text>
              </Pressable>
            </LinearGradient>

            <View style={styles.actionRow}>
              <Pressable
                style={[
                  styles.actionBtnSmall,
                  { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.pokemonRed },
                ]}
                onPress={() => openListingModal("sale")}
              >
                <Ionicons name="pricetag-outline" size={16} color={colors.pokemonRed} />
                <Text style={[styles.actionBtnSmallText, { color: colors.pokemonRed }]}>
                  Sell
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.actionBtnSmall,
                  { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.pokemonBlue },
                ]}
                onPress={() => openListingModal("trade")}
              >
                <Ionicons name="swap-horizontal" size={16} color={colors.pokemonBlue} />
                <Text style={[styles.actionBtnSmallText, { color: colors.pokemonBlue }]}>
                  Trade
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Listing Modal */}
      <Modal
        visible={listingModalVisible}
        animationType="slide"
        onRequestClose={() => setListingModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          <View
            style={[
              styles.header,
              { paddingTop: (insets.top || webTopInset) + 4 },
            ]}
          >
            <Pressable
              onPress={() => setListingModalVisible(false)}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Create Listing
            </Text>
            <View style={{ width: 36 }} />
          </View>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 40 }}
          >
            <Text style={[listingModalStyles.label, { color: colors.text }]}>
              Listing Type
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
              {(["sale", "trade"] as const).map((type) => (
                <Pressable
                  key={type}
                  style={[
                    styles.conditionChip,
                    {
                      flex: 1,
                      backgroundColor:
                        listingType === type ? colors.pokemonRed : colors.card,
                      borderColor:
                        listingType === type ? colors.pokemonRed : colors.borderLight,
                    },
                  ]}
                  onPress={() => setListingType(type)}
                >
                  <Text
                    style={[
                      styles.conditionChipText,
                      {
                        color:
                          listingType === type ? "#FFF" : colors.textSecondary,
                      },
                    ]}
                  >
                    {type === "sale" ? "For Sale" : "For Trade"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {listingType === "sale" && (
              <>
                <Text style={[listingModalStyles.label, { color: colors.text }]}>
                  Price (GBP)
                </Text>
                <TextInput
                  style={[
                    listingModalStyles.input,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.borderLight,
                      color: colors.text,
                    },
                  ]}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  value={listingPrice}
                  onChangeText={setListingPrice}
                />
              </>
            )}

            <Text style={[listingModalStyles.label, { color: colors.text }]}>
              Description
            </Text>
            <TextInput
              style={[
                listingModalStyles.input,
                listingModalStyles.textArea,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderLight,
                  color: colors.text,
                },
              ]}
              placeholder="Describe the card's condition and any details..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={listingDescription}
              onChangeText={setListingDescription}
            />

            <Text style={[listingModalStyles.label, { color: colors.text }]}>
              External URL (Optional)
            </Text>
            <TextInput
              style={[
                listingModalStyles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderLight,
                  color: colors.text,
                },
              ]}
              placeholder="https://..."
              placeholderTextColor={colors.textMuted}
              keyboardType="url"
              value={listingExternalUrl}
              onChangeText={setListingExternalUrl}
            />

            <Text style={[listingModalStyles.label, { color: colors.text }]}>
              Photos
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {listingPhotos.map((photo, i) => (
                <View key={i} style={listingModalStyles.photoThumb}>
                  <Image
                    source={{ uri: photo }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                  <Pressable
                    style={listingModalStyles.photoRemoveBtn}
                    onPress={() => removePhoto(i)}
                  >
                    <Ionicons name="close" size={16} color="#FFF" />
                  </Pressable>
                </View>
              ))}
              {listingPhotos.length < 6 && (
                <>
                  <Pressable
                    style={[
                      listingModalStyles.photoAddBtn,
                      {
                        borderColor: colors.borderLight,
                        backgroundColor: colors.card,
                      },
                    ]}
                    onPress={pickPhoto}
                  >
                    <Ionicons name="image" size={20} color={colors.textMuted} />
                  </Pressable>
                  <Pressable
                    style={[
                      listingModalStyles.photoAddBtn,
                      {
                        borderColor: colors.borderLight,
                        backgroundColor: colors.card,
                      },
                    ]}
                    onPress={takePhoto}
                  >
                    <Ionicons name="camera" size={20} color={colors.textMuted} />
                  </Pressable>
                </>
              )}
            </View>

            <Pressable
              style={[
                listingModalStyles.submitBtn,
                { backgroundColor: colors.pokemonRed },
              ]}
              onPress={submitListing}
              disabled={listingLoading}
            >
              {listingLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                  <Text style={listingModalStyles.submitBtnText}>
                    Create Listing
                  </Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const listingModalStyles = StyleSheet.create({
  label: { fontSize: 13, fontFamily: "Outfit_600SemiBold", marginBottom: 6 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    fontFamily: "Outfit_400Regular",
    marginBottom: 16,
  },
  textArea: { minHeight: 80, textAlignVertical: "top", paddingTop: 11 },
  photoThumb: {
    width: 90,
    height: 90,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  photoRemoveBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 10,
  },
  photoAddBtn: {
    width: 90,
    height: 90,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 10,
  },
  submitBtnText: { fontSize: 16, fontFamily: "Outfit_700Bold", color: "#FFF" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
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
  imageContainer: { alignItems: "center", paddingVertical: 8 },
  cardImage: {
    width: SCREEN_WIDTH * 0.65,
    height: SCREEN_WIDTH * 0.65 * 1.4,
    borderRadius: 12,
  },
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cardName: { fontSize: 24, fontFamily: "Outfit_700Bold" },
  cardSetName: { fontSize: 14, fontFamily: "Outfit_400Regular", marginTop: 2 },
  rarityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  rarityText: { fontSize: 12, fontFamily: "Outfit_600SemiBold" },
  detailsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  detailChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 2,
  },
  detailLabel: {
    fontSize: 10,
    fontFamily: "Outfit_400Regular",
    textTransform: "uppercase",
  },
  detailValue: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  priceSection: { borderRadius: 16, padding: 16, borderWidth: 1.5, gap: 12 },
  priceSectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  priceSectionTitle: { fontSize: 16, fontFamily: "Outfit_700Bold" },
  mainPrice: { borderRadius: 12, padding: 16, alignItems: "center", gap: 4 },
  mainPriceLabel: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  mainPriceValue: { fontSize: 28, fontFamily: "Outfit_700Bold" },
  mainPriceSource: { fontSize: 11, fontFamily: "Outfit_400Regular" },
  priceDetails: { gap: 4 },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  priceLabel: { fontSize: 13, fontFamily: "Outfit_400Regular" },
  priceValue: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  ebaySection: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 10 },
  ebayDesc: { fontSize: 13, fontFamily: "Outfit_400Regular" },
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
  conditionTitle: { fontSize: 16, fontFamily: "Outfit_600SemiBold" },
  variantRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  variantChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  variantChipText: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  conditionRow: { gap: 8, marginBottom: 16 },
  conditionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  conditionChipText: { fontSize: 13, fontFamily: "Outfit_500Medium" },
  actionButtons: { gap: 10, marginTop: 8 },
  actionBtn: { borderRadius: 14, overflow: "hidden" },
  actionBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  actionBtnText: {
    fontSize: 16,
    fontFamily: "Outfit_600SemiBold",
    color: "#FFF",
  },
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtnSmall: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  actionBtnSmallText: {
    fontSize: 13,
    fontFamily: "Outfit_600SemiBold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
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
  soldLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  soldLoadingText: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  soldBreakdownWrap: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  soldRow: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 8 },
  soldStat: { flex: 1, alignItems: "center", gap: 2 },
  soldStatLabel: { fontSize: 11, fontFamily: "Outfit_500Medium" },
  soldStatValue: { fontSize: 16, fontFamily: "Outfit_700Bold" },
  soldDivider: { width: 1, marginVertical: 4 },
  gradedToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderTopWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  gradedToggleText: { flex: 1, fontSize: 12, fontFamily: "Outfit_500Medium" },
  gradedGrid: { paddingHorizontal: 12, paddingBottom: 10, gap: 0 },
  gradedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 6,
  },
  gradedLabelCol: { flex: 1 },
  gradedColHeader: {
    width: 80,
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
    textAlign: "center",
  },
  gradedRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingVertical: 8,
  },
  graderName: { flex: 1, fontSize: 13, fontFamily: "Outfit_700Bold" },
  gradedPrice: {
    width: 80,
    fontSize: 13,
    fontFamily: "Outfit_600SemiBold",
    textAlign: "center",
  },
  noGradedText: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
    paddingVertical: 8,
  },
  retryBtnText: {
    fontSize: 15,
    fontFamily: "Outfit_600SemiBold",
    color: "#FFF",
  },
});
