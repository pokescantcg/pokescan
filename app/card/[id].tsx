<<<<<<< HEAD
import React, { useState } from "react";
=======
import React, { useState, useCallback } from "react";
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
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
<<<<<<< HEAD
  TextInput,
=======
  Modal,
  TextInput,
  KeyboardAvoidingView,
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
<<<<<<< HEAD
=======
import * as ImagePicker from "expo-image-picker";
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
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
<<<<<<< HEAD
import { useUser } from "@/lib/user-context";
import { CardVariant, MarketListing } from "@/lib/storage";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CONDITIONS = [
  "Mint",
  "Near Mint",
  "Excellent",
  "Good",
  "Lightly Played",
  "Played",
  "Poor",
];
const GRADERS = ["None", "PSA", "Beckett", "CGC", "ACE"];

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

function getVariantIcon(variant: string): string {
  const v = variant.toLowerCase();
  if (v.includes("non-holo")) return "square-outline";
  if (v.includes("holo") && !v.includes("reverse")) return "sparkles";
  if (v.includes("reverse")) return "refresh-circle";
  if (v.includes("1st")) return "medal-outline";
  return "card-outline";
}

// Get all pricing data from TCGPlayer
function getAllPricing(card: PokemonCard | null) {
  if (!card?.tcgplayer?.prices) return null;

  const pricing: any = {};
  const prices = card.tcgplayer.prices;

  // Raw card prices (ungraded)
  if (prices.normal) pricing.normal = prices.normal;
  if (prices.holofoil) pricing.holofoil = prices.holofoil;
  if (prices.reverseHolofoil) pricing.reverseHolofoil = prices.reverseHolofoil;
  if (prices["1stEditionNormal"]) pricing.firstEdNormal = prices["1stEditionNormal"];
  if (prices["1stEditionHolofoil"]) pricing.firstEdHolo = prices["1stEditionHolofoil"];
  if (prices.unlimitedHolofoil) pricing.unlimitedHolo = prices.unlimitedHolofoil;

  return pricing;
}

export default function CardDetailScreen() {
  const { id, variant: routeVariant } = useLocalSearchParams<{
    id?: string;
    variant?: string;
  }>();

  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { user, addCard, addMarketListing } = useUser();

  const [selectedVariant, setSelectedVariant] = useState<string>(
    routeVariant || "Non-Holo"
  );
  const [selectedCondition, setSelectedCondition] = useState("Near Mint");
  const [selectedGrader, setSelectedGrader] = useState("None");
  const [gradeNumber, setGradeNumber] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [listingOpen, setListingOpen] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const {
    data: card,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["card", id],
    queryFn: () => {
      if (!id) throw new Error("No card ID");
      return fetchCard(id);
    },
    enabled: !!id,
  });
=======
import { getApiUrl } from "@/lib/query-client";
import { useUser } from "@/lib/user-context";
import { CardVariant } from "@/lib/storage";

const SCREEN_WIDTH = Dimensions.get("window").width;

function PriceRow({ label, value, colors }: { label: string; value: number | null; colors: ReturnType<typeof useThemeColors> }) {
  return (
    <View style={styles.priceRow}>
      <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.priceValue, { color: value ? colors.text : colors.textMuted }]}>
        {formatGBP(value)}
      </Text>
    </View>
  );
}

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { user, addCard, createListing, collection } = useUser();
  const [selectedCondition, setSelectedCondition] = useState("Near Mint");
  const [selectedVariant, setSelectedVariant] = useState<CardVariant>("Non-Holo");

  const [ebayFetchedPrice, setEbayFetchedPrice] = useState<{ price: number | null; source: string } | null>(null);
  const [ebayPriceLoading, setEbayPriceLoading] = useState(false);

  // Listing modal state
  const [listingModalVisible, setListingModalVisible] = useState(false);
  const [listingType, setListingType] = useState<"sale" | "trade">("sale");
  const [listingPrice, setListingPrice] = useState("");
  const [listingDescription, setListingDescription] = useState("");
  const [listingExternalUrl, setListingExternalUrl] = useState("");
  const [listingPhotos, setListingPhotos] = useState<string[]>([]);
  const [listingLoading, setListingLoading] = useState(false);

  const { data: card, isLoading, isError, refetch } = useQuery({
    queryKey: ["card", id],
    queryFn: () => fetchCard(id),
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  const conditions = ["Mint", "Near Mint", "Excellent", "Good", "Light Play", "Played"];
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const inCollection = collection.some((c) => c.cardId === id);

  React.useEffect(() => {
    if (!card) return;
    const built = getUKPrice(card);
    if (built.price !== null) return;
    setEbayFetchedPrice(null);
    setEbayPriceLoading(true);
    const params = new URLSearchParams({ cardName: card.name });
    if (card.set?.name) params.set("setName", card.set.name);
    if (card.number) params.set("number", card.number);
    if (card.id) params.set("cardId", card.id);
    fetch(new URL(`/api/ebay/sold-price?${params}`, getApiUrl()).toString())
      .then((r) => r.json())
      .then((data) => {
        if (data.price) setEbayFetchedPrice({ price: data.price, source: data.source || "eBay UK (Sold)" });
      })
      .catch(() => {})
      .finally(() => setEbayPriceLoading(false));
  }, [card?.id]);

  const handleAddToCollection = () => {
    if (!user) {
      Alert.alert("Sign In Required", "Create an account to add cards to your collection.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push("/register") },
      ]);
      return;
    }
    if (!user.isPremium) {
      Alert.alert("Premium Required", "Upgrade to Premium to save cards to your collection.");
      return;
    }
    if (!card) return;
    const priceData = getUKPrice(card);
    addCard({
      cardId: card.id,
      cardName: card.name,
      cardImage: card.images.small,
      setName: card.set.name,
      setId: card.set.id,
      rarity: card.rarity || "Unknown",
      quantity: 1,
      condition: selectedCondition,
      variant: selectedVariant,
      priceGBP: priceData.price,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Added!", `${card.name} added to your collection.`);
  };

  const openListingModal = (type: "sale" | "trade") => {
    if (!user?.isPremium) {
      Alert.alert("Premium Required", "Upgrade to Premium to list cards on the marketplace.", [
        { text: "Cancel", style: "cancel" },
        { text: "Upgrade", onPress: () => router.push("/premium") },
      ]);
      return;
    }
    if (!card) return;
    setListingType(type);
    setListingPrice(type === "sale" ? String(getUKPrice(card).price ?? "") : "");
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
      Alert.alert("Permission needed", "Allow photo library access to add photos to your listing.");
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
      setListingPhotos((prev) => [...prev, `data:image/jpeg;base64,${result.assets[0].base64}`]);
    }
  }, [listingPhotos]);

  const takePhoto = useCallback(async () => {
    if (listingPhotos.length >= 6) {
      Alert.alert("Max Photos", "You can add up to 6 photos per listing.");
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow camera access to take photos for your listing.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setListingPhotos((prev) => [...prev, `data:image/jpeg;base64,${result.assets[0].base64}`]);
    }
  }, [listingPhotos]);

  const removePhoto = useCallback((index: number) => {
    setListingPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const submitListing = useCallback(async () => {
    if (!card || !user) return;
    setListingLoading(true);
    try {
      const priceVal = listingType === "sale"
        ? (parseFloat(listingPrice) || null)
        : null;
      await createListing({
        userId: user.id,
        userName: user.displayName,
        cardId: card.id,
        cardName: card.name,
        cardImage: card.images.small,
        setName: card.set.name,
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
        `${card.name} listed for ${listingType === "sale" ? "sale" : "trade"} on the marketplace.`
      );
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not create listing. Please try again.");
    } finally {
      setListingLoading(false);
    }
  }, [card, user, listingType, listingPrice, listingDescription, listingPhotos, selectedCondition, createListing]);

  const openEbayListings = () => {
    if (!card) return;
    const url = generateEbaySearchUrl(card.name, card.set.name, card.number);
    Linking.openURL(url);
  };

  const openEbaySold = () => {
    if (!card) return;
    const url = generateEbaySoldUrl(card.name, card.set.name, card.number);
    Linking.openURL(url);
  };
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
<<<<<<< HEAD
        <View
          style={[
            styles.header,
            { paddingTop: (insets.top || webTopInset) + 4 },
          ]}
        >
=======
        <View style={[styles.header, { paddingTop: (insets.top || webTopInset) + 4 }]}>
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        </View>
<<<<<<< HEAD
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.pokemonRed} />
          <Text style={[styles.text, { color: colors.textSecondary }]}>
            Loading card...
          </Text>
=======
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="pokeball" size={40} color={colors.pokemonRed} />
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
        </View>
      </View>
    );
  }

  if (isError || !card) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
<<<<<<< HEAD
        <View
          style={[
            styles.header,
            { paddingTop: (insets.top || webTopInset) + 4 },
          ]}
        >
=======
        <View style={[styles.header, { paddingTop: (insets.top || webTopInset) + 4 }]}>
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        </View>
<<<<<<< HEAD
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.pokemonRed} />
          <Text style={[styles.text, { color: colors.text }]}>
            Card not found
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.button, { backgroundColor: colors.pokemonRed }]}
          >
            <Text style={styles.buttonText}>Go Back</Text>
=======
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="wifi-off" size={48} color={colors.textMuted} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>Card unavailable</Text>
          <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
            This card is from an older set that hasn't loaded yet. Go back and open the set first, then try tapping the card again.
          </Text>
          <Pressable onPress={() => refetch()} style={[styles.retryBtn, { backgroundColor: colors.pokemonRed }]}>
            <Text style={styles.retryBtnText}>Try again</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/(tabs)/scanner")}
            style={[styles.retryBtn, { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.pokemonRed }]}
          >
            <Text style={[styles.retryBtnText, { color: colors.pokemonRed }]}>Search by name instead</Text>
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
          </Pressable>
        </View>
      </View>
    );
  }

<<<<<<< HEAD
  const allPricing = getAllPricing(card);
  const availableVariants = getAvailableVariants(card);

  const handleAddToCollection = () => {
    if (!user) {
      Alert.alert("Sign in required", "Please sign in to add cards");
      return;
    }

    const price = getUKPrice(card);
    addCard({
      cardId: card.id,
      cardName: card.name,
      cardImage: card.images?.small || "",
      setName: card.set?.name || "",
      setId: card.set?.id || "",
      rarity: card.rarity || "",
      quantity: 1,
      condition: selectedCondition,
      variant: selectedVariant as CardVariant,
      priceGBP: price.price,
      gradingCompany: selectedGrader !== "None" ? selectedGrader : null,
      grade: gradeNumber || null,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Success", `${card.name} added to collection`);
  };

  const handleListForSale = () => {
    if (!user) {
      Alert.alert("Sign in required", "Please sign in to list items");
      return;
    }

    if (!salePrice || parseFloat(salePrice) <= 0) {
      Alert.alert("Invalid price", "Please enter a valid price");
      return;
    }

    const listing: MarketListing = {
      id: `${card.id}-${selectedVariant}-${Date.now()}`,
      cardId: card.id,
      cardName: card.name,
      setName: card.set?.name || "",
      cardNumber: card.number || "",
      cardImage: card.images?.small || "",
      variant: selectedVariant as CardVariant,
      condition: selectedCondition,
      grade: selectedGrader !== "None" ? `${selectedGrader} ${gradeNumber}` : null,
      price: parseFloat(salePrice),
      currency: "GBP",
      type: "sale",
      userId: user.id,
      userName: user.name || "Anonymous",
      description: `${card.name} ${selectedVariant} - ${selectedCondition} condition`,
      createdAt: new Date(),
      images: [card.images?.small || ""],
      condition_notes: "",
      shipping: {
        cost: 0,
        location: "UK",
      },
    };

    addMarketListing(listing);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Listed!", `${card.name} has been listed for sale at £${salePrice}`);
    setListingOpen(false);
    setSalePrice("");
  };

  const handleListForTrade = () => {
    if (!user) {
      Alert.alert("Sign in required", "Please sign in to list items");
      return;
    }

    const listing: MarketListing = {
      id: `${card.id}-trade-${Date.now()}`,
      cardId: card.id,
      cardName: card.name,
      setName: card.set?.name || "",
      cardNumber: card.number || "",
      cardImage: card.images?.small || "",
      variant: selectedVariant as CardVariant,
      condition: selectedCondition,
      grade: selectedGrader !== "None" ? `${selectedGrader} ${gradeNumber}` : null,
      price: 0,
      currency: "GBP",
      type: "trade",
      userId: user.id,
      userName: user.name || "Anonymous",
      description: `${card.name} ${selectedVariant} - ${selectedCondition} condition - OPEN TO TRADES`,
      createdAt: new Date(),
      images: [card.images?.small || ""],
      condition_notes: "",
      shipping: {
        cost: 0,
        location: "UK",
      },
    };

    addMarketListing(listing);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      "Trade Offer Posted!",
      `${card.name} has been posted for trades`
    );
  };

  const openEbayActive = () => {
    if (!card?.name) return;
    const url = generateEbaySearchUrl(card.name, card.set?.name, card.number);
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Could not open eBay")
    );
  };

  const openEbaySold = () => {
    if (!card?.name) return;
    const url = generateEbaySoldUrl(card.name, card.set?.name, card.number);
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Could not open eBay")
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[styles.header, { paddingTop: (insets.top || webTopInset) + 4 }]}
      >
=======
  const builtInPrice = getUKPrice(card);
  const priceData = builtInPrice.price !== null ? builtInPrice : (ebayFetchedPrice ?? { price: null, source: "" });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: (insets.top || webTopInset) + 4 }]}>
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {card.name}
        </Text>
        <View style={{ width: 36 }} />
      </View>

<<<<<<< HEAD
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Card Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: card.images?.large || "" }}
            style={styles.cardImage}
            contentFit="contain"
            placeholder={{ color: colors.surface }}
=======
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: card.images.large }}
            style={styles.cardImage}
            contentFit="contain"
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
          />
        </View>

        <View style={styles.content}>
<<<<<<< HEAD
          {/* Card Title & Meta */}
          <View>
            <Text style={[styles.cardName, { color: colors.text }]}>
              {card.name}
            </Text>
            <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
              {card.set?.name} #{card.number}
            </Text>
          </View>

          {/* Card Details Grid */}
          <View style={styles.detailsGrid}>
            {card.supertype && (
              <View
                style={[
                  styles.detailBox,
                  { backgroundColor: colors.card, borderColor: colors.borderLight },
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
                  styles.detailBox,
                  { backgroundColor: colors.card, borderColor: colors.borderLight },
                ]}
              >
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                  HP
                </Text>
                <Text style={[styles.detailValue, { color: colors.pokemonRed }]}>
                  {card.hp}
                </Text>
              </View>
            )}
            {card.rarity && (
              <View
                style={[
                  styles.detailBox,
                  { backgroundColor: colors.card, borderColor: colors.borderLight },
                ]}
              >
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                  Rarity
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {card.rarity}
                </Text>
=======
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardName, { color: colors.text }]}>{card.name}</Text>
              <Text style={[styles.cardSetName, { color: colors.textSecondary }]}>
                {card.set.name} #{card.number}
              </Text>
            </View>
            {card.rarity && (
              <View style={[styles.rarityBadge, { backgroundColor: colors.pokemonYellow + "25" }]}>
                <Ionicons name="star" size={12} color={colors.pokemonYellow} />
                <Text style={[styles.rarityText, { color: colors.pokemonYellow }]}>{card.rarity}</Text>
              </View>
            )}
          </View>

          <View style={styles.detailsGrid}>
            {card.supertype && (
              <View style={[styles.detailChip, { backgroundColor: colors.card, borderColor: colors.pokemonRed + "30" }]}>
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Type</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{card.supertype}</Text>
              </View>
            )}
            {card.hp && (
              <View style={[styles.detailChip, { backgroundColor: colors.card, borderColor: colors.pokemonRed + "30" }]}>
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>HP</Text>
                <Text style={[styles.detailValue, { color: colors.pokemonRed }]}>{card.hp}</Text>
              </View>
            )}
            {card.types && card.types.length > 0 && (
              <View style={[styles.detailChip, { backgroundColor: colors.card, borderColor: colors.pokemonBlue + "30" }]}>
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Energy</Text>
                <Text style={[styles.detailValue, { color: colors.pokemonBlue }]}>{card.types.join(", ")}</Text>
              </View>
            )}
            {card.artist && (
              <View style={[styles.detailChip, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Artist</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{card.artist}</Text>
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
              </View>
            )}
          </View>

<<<<<<< HEAD
          {/* UK Pricing - Comprehensive Breakdown */}
          <View
            style={[
              styles.section,
              { backgroundColor: colors.card, borderColor: colors.borderLight },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              💰 UK Market Pricing
            </Text>

            {allPricing ? (
              <View style={styles.pricingGrid}>
                {/* Raw (Ungraded) Prices */}
                <Text style={[styles.pricingCategory, { color: colors.textSecondary }]}>
                  📋 Raw (Ungraded)
                </Text>

                {allPricing.normal && (
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceLabel, { color: colors.text }]}>
                      Non-Holo
                    </Text>
                    <View style={styles.priceValues}>
                      {allPricing.normal.low && (
                        <Text style={[styles.priceText, { color: colors.textMuted }]}>
                          Low: {formatGBP(allPricing.normal.low)}
                        </Text>
                      )}
                      {allPricing.normal.mid && (
                        <Text style={[styles.priceText, { color: colors.success }]}>
                          Mid: {formatGBP(allPricing.normal.mid)}
                        </Text>
                      )}
                      {allPricing.normal.high && (
                        <Text style={[styles.priceText, { color: colors.textMuted }]}>
                          High: {formatGBP(allPricing.normal.high)}
                        </Text>
                      )}
                      {allPricing.normal.market && (
                        <Text style={[styles.priceMarket, { color: colors.pokemonYellow }]}>
                          Market: {formatGBP(allPricing.normal.market)}
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {allPricing.holofoil && (
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceLabel, { color: colors.text }]}>
                      Holo
                    </Text>
                    <View style={styles.priceValues}>
                      {allPricing.holofoil.low && (
                        <Text style={[styles.priceText, { color: colors.textMuted }]}>
                          Low: {formatGBP(allPricing.holofoil.low)}
                        </Text>
                      )}
                      {allPricing.holofoil.mid && (
                        <Text style={[styles.priceText, { color: colors.success }]}>
                          Mid: {formatGBP(allPricing.holofoil.mid)}
                        </Text>
                      )}
                      {allPricing.holofoil.high && (
                        <Text style={[styles.priceText, { color: colors.textMuted }]}>
                          High: {formatGBP(allPricing.holofoil.high)}
                        </Text>
                      )}
                      {allPricing.holofoil.market && (
                        <Text style={[styles.priceMarket, { color: colors.pokemonYellow }]}>
                          Market: {formatGBP(allPricing.holofoil.market)}
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {allPricing.reverseHolofoil && (
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceLabel, { color: colors.text }]}>
                      Reverse Holo
                    </Text>
                    <View style={styles.priceValues}>
                      {allPricing.reverseHolofoil.low && (
                        <Text style={[styles.priceText, { color: colors.textMuted }]}>
                          Low: {formatGBP(allPricing.reverseHolofoil.low)}
                        </Text>
                      )}
                      {allPricing.reverseHolofoil.mid && (
                        <Text style={[styles.priceText, { color: colors.success }]}>
                          Mid: {formatGBP(allPricing.reverseHolofoil.mid)}
                        </Text>
                      )}
                      {allPricing.reverseHolofoil.high && (
                        <Text style={[styles.priceText, { color: colors.textMuted }]}>
                          High: {formatGBP(allPricing.reverseHolofoil.high)}
                        </Text>
                      )}
                      {allPricing.reverseHolofoil.market && (
                        <Text style={[styles.priceMarket, { color: colors.pokemonYellow }]}>
                          Market: {formatGBP(allPricing.reverseHolofoil.market)}
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {allPricing.firstEdNormal && (
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceLabel, { color: colors.text }]}>
                      1st Ed Non-Holo
                    </Text>
                    <View style={styles.priceValues}>
                      {allPricing.firstEdNormal.market && (
                        <Text style={[styles.priceMarket, { color: colors.pokemonYellow }]}>
                          Market: {formatGBP(allPricing.firstEdNormal.market)}
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {allPricing.firstEdHolo && (
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceLabel, { color: colors.text }]}>
                      1st Ed Holo
                    </Text>
                    <View style={styles.priceValues}>
                      {allPricing.firstEdHolo.market && (
                        <Text style={[styles.priceMarket, { color: colors.pokemonYellow }]}>
                          Market: {formatGBP(allPricing.firstEdHolo.market)}
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                <Text style={[styles.priceSource, { color: colors.textMuted, marginTop: 12 }]}>
                  Source: TCGPlayer UK
                </Text>
              </View>
            ) : (
              <Text style={[styles.priceValue, { color: colors.textMuted }]}>
                Price data unavailable
              </Text>
            )}
          </View>

          {/* eBay UK */}
          <View
            style={[
              styles.section,
              { backgroundColor: colors.card, borderColor: colors.borderLight },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              🌐 eBay UK
=======
          <View style={[styles.priceSection, { backgroundColor: colors.card, borderColor: colors.pokemonRed + "30" }]}>
            <View style={styles.priceSectionHeader}>
              <Ionicons name="pricetag" size={18} color={colors.pokemonRed} />
              <Text style={[styles.priceSectionTitle, { color: colors.text }]}>UK Pricing</Text>
            </View>
            <LinearGradient
              colors={colorScheme === "dark" ? ["#1F2B47", "#162040"] : ["#FFF8F8", "#FFF0F0"]}
              style={styles.mainPrice}
            >
              <Text style={[styles.mainPriceLabel, { color: colors.textSecondary }]}>
                Market Price (GBP)
              </Text>
              {ebayPriceLoading && !priceData.price ? (
                <ActivityIndicator size="small" color={colors.pokemonRed} style={{ marginVertical: 8 }} />
              ) : (
                <Text style={[styles.mainPriceValue, { color: priceData.price ? colors.success : colors.textMuted }]}>
                  {formatGBP(priceData.price)}
                </Text>
              )}
              <Text style={[styles.mainPriceSource, { color: colors.textMuted }]}>
                {ebayPriceLoading && !priceData.price ? "Checking eBay UK…" : `via ${priceData.source || "N/A"}`}
              </Text>
            </LinearGradient>

            {card.cardmarket?.prices && (
              <View style={styles.priceDetails}>
                <PriceRow label="Average Sell" value={card.cardmarket.prices.averageSellPrice} colors={colors} />
                <PriceRow label="Low Price" value={card.cardmarket.prices.lowPrice} colors={colors} />
                <PriceRow label="Trend Price" value={card.cardmarket.prices.trendPrice} colors={colors} />
                <PriceRow label="7-Day Avg" value={card.cardmarket.prices.avg7} colors={colors} />
                <PriceRow label="30-Day Avg" value={card.cardmarket.prices.avg30} colors={colors} />
              </View>
            )}
          </View>

          <View style={[styles.ebaySection, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            <View style={styles.priceSectionHeader}>
              <Ionicons name="globe-outline" size={18} color="#E53238" />
              <Text style={[styles.priceSectionTitle, { color: colors.text }]}>eBay UK</Text>
            </View>
            <Text style={[styles.ebayDesc, { color: colors.textSecondary }]}>
              Compare prices on eBay UK for this card
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
            </Text>
            <View style={styles.ebayButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.ebayBtn,
<<<<<<< HEAD
                  { backgroundColor: "#E53238", opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={openEbayActive}
              >
                <Ionicons name="search" size={16} color="#FFF" />
                <Text style={styles.ebayBtnText}>Active</Text>
=======
                  { backgroundColor: "#E53238", opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={openEbayListings}
              >
                <Ionicons name="search" size={16} color="#FFF" />
                <Text style={styles.ebayBtnText}>Active Listings</Text>
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.ebayBtn,
<<<<<<< HEAD
                  { backgroundColor: "#0064D2", opacity: pressed ? 0.8 : 1 },
=======
                  { backgroundColor: "#0064D2", opacity: pressed ? 0.85 : 1 },
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
                ]}
                onPress={openEbaySold}
              >
                <Ionicons name="checkmark-done" size={16} color="#FFF" />
<<<<<<< HEAD
                <Text style={styles.ebayBtnText}>Sold</Text>
=======
                <Text style={styles.ebayBtnText}>Sold Items</Text>
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
              </Pressable>
            </View>
          </View>

<<<<<<< HEAD
          {/* Variant Selection */}
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              ✨ Variant
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.variantRow}
            >
              {availableVariants.map((v) => (
                <Pressable
                  key={v}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        selectedVariant === v ? colors.pokemonYellow : colors.card,
                      borderColor:
                        selectedVariant === v ? colors.pokemonYellow : colors.borderLight,
=======
          <Text style={[styles.conditionTitle, { color: colors.text }]}>Card Variant</Text>
          <View style={styles.variantRow}>
            {(["Non-Holo", "Holo", "Reverse Holo"] as CardVariant[]).map((v) => {
              const active = selectedVariant === v;
              const iconName = v === "Non-Holo" ? "square-outline" : v === "Holo" ? "sparkles" : "refresh-circle";
              return (
                <Pressable
                  key={v}
                  style={[
                    styles.variantChip,
                    {
                      backgroundColor: active ? colors.pokemonYellow : colors.card,
                      borderColor: active ? colors.pokemonYellow : colors.borderLight,
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
                    },
                  ]}
                  onPress={() => setSelectedVariant(v)}
                >
<<<<<<< HEAD
                  <Ionicons
                    name={getVariantIcon(v) as any}
                    size={14}
                    color={selectedVariant === v ? "#000" : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: selectedVariant === v ? "#000" : colors.textSecondary,
                      },
                    ]}
                  >
                    {v}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Condition Selection */}
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              📋 Condition
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.conditionRow}
            >
              {CONDITIONS.map((c) => (
                <Pressable
                  key={c}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        selectedCondition === c ? colors.pokemonRed : colors.card,
                    },
                  ]}
                  onPress={() => setSelectedCondition(c)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: selectedCondition === c ? "#FFF" : colors.textSecondary,
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
              🏆 Grading
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.conditionRow}
            >
              {GRADERS.map((g) => (
                <Pressable
                  key={g}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        selectedGrader === g ? colors.pokemonYellow : colors.card,
                    },
                  ]}
                  onPress={() => setSelectedGrader(g)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: selectedGrader === g ? "#000" : colors.textSecondary,
                      },
                    ]}
                  >
                    {g}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {selectedGrader !== "None" && (
              <View style={{ marginTop: 12, gap: 8 }}>
                <Text style={[styles.gradeLabel, { color: colors.text }]}>
                  Grade (1-10)
                </Text>
                <View
                  style={[
                    styles.gradeInput,
                    { backgroundColor: colors.card, borderColor: colors.borderLight },
                  ]}
                >
                  <Text style={[styles.gradeValue, { color: colors.text }]}>
                    {gradeNumber || "—"}
                  </Text>
                </View>
                <View style={styles.gradeButtons}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <Pressable
                      key={num}
                      style={[
                        styles.gradeBtn,
                        {
                          backgroundColor:
                            gradeNumber === String(num)
                              ? colors.pokemonRed
                              : colors.card,
                          borderColor: colors.borderLight,
                        },
                      ]}
                      onPress={() => setGradeNumber(String(num))}
                    >
                      <Text
                        style={[
                          styles.gradeBtnText,
                          {
                            color:
                              gradeNumber === String(num)
                                ? "#FFF"
                                : colors.textSecondary,
                          },
                        ]}
                      >
                        {num}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <LinearGradient
            colors={[colors.pokemonRed, colors.pokemonDarkRed]}
            style={{ borderRadius: 14, marginVertical: 20 }}
          >
            <Pressable style={styles.actionBtn} onPress={handleAddToCollection}>
              <Ionicons name="add-circle-outline" size={20} color="#FFF" />
              <Text style={styles.actionBtnText}>Add to Collection</Text>
            </Pressable>
          </LinearGradient>

          {/* Marketplace Buttons */}
          <View style={styles.marketplaceButtons}>
            <Pressable
              style={[
                styles.marketplaceBtn,
                { backgroundColor: colors.success },
              ]}
              onPress={() => setListingOpen(!listingOpen)}
            >
              <MaterialCommunityIcons name="cash-multiple" size={18} color="#FFF" />
              <Text style={styles.actionBtnText}>List for Sale</Text>
            </Pressable>
            <Pressable
              style={[
                styles.marketplaceBtn,
                { backgroundColor: colors.pokemonBlue },
              ]}
              onPress={handleListForTrade}
            >
              <MaterialCommunityIcons name="swap-horizontal" size={18} color="#FFF" />
              <Text style={styles.actionBtnText}>List for Trade</Text>
            </Pressable>
          </View>

          {/* Sale Price Input */}
          {listingOpen && (
            <View
              style={[
                styles.section,
                { backgroundColor: colors.card, borderColor: colors.borderLight },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                💷 Set Price
              </Text>
              <View style={styles.priceInputContainer}>
                <Text style={[styles.currencySymbol, { color: colors.text }]}>£</Text>
                <TextInput
                  style={[
                    styles.priceInput,
                    { color: colors.text, borderColor: colors.borderLight },
                  ]}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  value={salePrice}
                  onChangeText={setSalePrice}
                />
              </View>
              <Pressable
                style={[styles.button, { backgroundColor: colors.success }]}
                onPress={handleListForSale}
              >
                <Text style={styles.buttonText}>✓ Confirm Listing</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
=======
                  <Ionicons name={iconName as any} size={14} color={active ? "#000" : colors.textSecondary} />
                  <Text style={[styles.variantChipText, { color: active ? "#000" : colors.textSecondary }]}>
                    {v}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.conditionTitle, { color: colors.text }]}>Card Condition</Text>
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
                    backgroundColor: selectedCondition === c ? colors.pokemonRed : colors.card,
                    borderColor: selectedCondition === c ? colors.pokemonRed : colors.borderLight,
                  },
                ]}
                onPress={() => setSelectedCondition(c)}
              >
                <Text
                  style={[
                    styles.conditionChipText,
                    { color: selectedCondition === c ? "#FFF" : colors.textSecondary },
                  ]}
                >
                  {c}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.actionButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                { opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={handleAddToCollection}
            >
              <LinearGradient
                colors={["#CC0000", "#8B0000"]}
                style={styles.actionBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name={inCollection ? "checkmark-circle" : "add-circle"} size={20} color="#FFF" />
                <Text style={styles.actionBtnText}>
                  {inCollection ? "Add Another" : "Add to Collection"}
                </Text>
              </LinearGradient>
            </Pressable>

            <View style={styles.actionRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtnSmall,
                  { backgroundColor: colors.success, opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={() => openListingModal("sale")}
              >
                <Ionicons name="cash-outline" size={18} color="#FFF" />
                <Text style={styles.actionBtnSmallText}>List for Sale</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtnSmall,
                  { backgroundColor: colors.pokemonBlue, opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={() => openListingModal("trade")}
              >
                <Ionicons name="swap-horizontal" size={18} color="#FFF" />
                <Text style={styles.actionBtnSmallText}>List for Trade</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Listing Modal ──────────────────────────────────── */}
      <Modal
        visible={listingModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setListingModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: colors.background }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={[listingStyles.header, { paddingTop: insets.top + 12, backgroundColor: listingType === "sale" ? colors.success : colors.pokemonBlue }]}>
            <View style={{ flex: 1 }}>
              <Text style={listingStyles.modalTitle}>
                {listingType === "sale" ? "List for Sale" : "List for Trade"}
              </Text>
              <Text style={listingStyles.modalSubtitle} numberOfLines={1}>{card?.name}</Text>
            </View>
            <Pressable onPress={() => setListingModalVisible(false)} style={listingStyles.closeBtn}>
              <Ionicons name="close" size={22} color="#FFF" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {/* Price (sale only) */}
            {listingType === "sale" && (
              <View>
                <Text style={[listingStyles.label, { color: colors.textSecondary }]}>Asking Price (£)</Text>
                <TextInput
                  style={[listingStyles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.borderLight }]}
                  value={listingPrice}
                  onChangeText={setListingPrice}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 9.99"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            )}

            {/* Description */}
            <View>
              <Text style={[listingStyles.label, { color: colors.textSecondary }]}>Description (optional)</Text>
              <TextInput
                style={[listingStyles.input, listingStyles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.borderLight }]}
                value={listingDescription}
                onChangeText={setListingDescription}
                placeholder="Describe the card's condition, any extras included, etc."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* External listing URL */}
            <View>
              <Text style={[listingStyles.label, { color: colors.textSecondary }]}>External Listing URL (optional)</Text>
              <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: "Outfit_400Regular", marginBottom: 6 }}>
                Link buyers to your eBay, Vinted, or other listing
              </Text>
              <TextInput
                style={[listingStyles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.borderLight }]}
                value={listingExternalUrl}
                onChangeText={setListingExternalUrl}
                placeholder="https://www.ebay.co.uk/itm/..."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            {/* Photos */}
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <Text style={[listingStyles.label, { color: colors.textSecondary }]}>Your Photos ({listingPhotos.length}/6)</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: "Outfit_400Regular" }}>
                  So buyers can see the actual card
                </Text>
              </View>

              {/* Photo grid */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {listingPhotos.map((uri, idx) => (
                  <View key={idx} style={listingStyles.photoThumb}>
                    <Image source={{ uri }} style={{ width: "100%", height: "100%", borderRadius: 10 }} contentFit="cover" />
                    <Pressable
                      style={listingStyles.photoRemoveBtn}
                      onPress={() => removePhoto(idx)}
                    >
                      <Ionicons name="close-circle" size={20} color="#FFF" />
                    </Pressable>
                  </View>
                ))}
                {listingPhotos.length < 6 && (
                  <View style={{ gap: 8 }}>
                    <Pressable
                      style={[listingStyles.photoAddBtn, { borderColor: colors.borderLight, backgroundColor: colors.card }]}
                      onPress={pickPhoto}
                    >
                      <Ionicons name="images-outline" size={22} color={colors.textSecondary} />
                      <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: "Outfit_500Medium" }}>Library</Text>
                    </Pressable>
                    <Pressable
                      style={[listingStyles.photoAddBtn, { borderColor: colors.borderLight, backgroundColor: colors.card }]}
                      onPress={takePhoto}
                    >
                      <Ionicons name="camera-outline" size={22} color={colors.textSecondary} />
                      <Text style={{ fontSize: 11, color: colors.textMuted, fontFamily: "Outfit_500Medium" }}>Camera</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>

            {/* Condition reminder */}
            <View style={[listingStyles.conditionReminder, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
              <Text style={{ flex: 1, fontSize: 12, color: colors.textMuted, fontFamily: "Outfit_400Regular" }}>
                Listing condition: <Text style={{ fontFamily: "Outfit_600SemiBold", color: colors.text }}>{selectedCondition}</Text>. Change this on the card detail page before listing.
              </Text>
            </View>

            {/* Submit */}
            <Pressable
              style={({ pressed }) => [
                listingStyles.submitBtn,
                { backgroundColor: listingType === "sale" ? colors.success : colors.pokemonBlue, opacity: pressed || listingLoading ? 0.8 : 1 },
              ]}
              onPress={submitListing}
              disabled={listingLoading}
            >
              {listingLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name={listingType === "sale" ? "cash-outline" : "swap-horizontal"} size={20} color="#FFF" />
                  <Text style={listingStyles.submitBtnText}>
                    {listingType === "sale" ? "Publish Listing" : "List for Trade"}
                  </Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
    </View>
  );
}

<<<<<<< HEAD
=======
const listingStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  modalTitle: { fontSize: 20, fontFamily: "Outfit_700Bold", color: "#FFF" },
  modalSubtitle: { fontSize: 13, fontFamily: "Outfit_400Regular", color: "rgba(255,255,255,0.8)", marginTop: 2 },
  closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 13, fontFamily: "Outfit_600SemiBold", marginBottom: 6 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    fontFamily: "Outfit_400Regular",
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
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  conditionReminder: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  submitBtnText: { fontSize: 16, fontFamily: "Outfit_700Bold", color: "#FFF" },
});

>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
<<<<<<< HEAD
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
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  imageContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  cardImage: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7 * 1.4,
    borderRadius: 12,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
    paddingBottom: 40,
  },
  cardName: {
    fontSize: 28,
    fontFamily: "Outfit_700Bold",
  },
  cardMeta: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    marginTop: 4,
  },
  detailsGrid: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  detailBox: {
    flex: 1,
    minWidth: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  detailLabel: {
    fontSize: 9,
    fontFamily: "Outfit_500Medium",
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 13,
    fontFamily: "Outfit_600SemiBold",
    marginTop: 4,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Outfit_700Bold",
    marginBottom: 8,
  },
  pricingGrid: {
    gap: 12,
  },
  pricingCategory: {
    fontSize: 14,
    fontFamily: "Outfit_700Bold",
    marginTop: 8,
  },
  priceRow: {
    gap: 6,
  },
  priceLabel: {
    fontSize: 13,
    fontFamily: "Outfit_600SemiBold",
  },
  priceValues: {
    gap: 4,
    paddingLeft: 12,
  },
  priceText: {
    fontSize: 12,
    fontFamily: "Outfit_500Medium",
  },
  priceMarket: {
    fontSize: 13,
    fontFamily: "Outfit_700Bold",
  },
  priceValue: {
    fontSize: 24,
    fontFamily: "Outfit_700Bold",
  },
  priceSource: {
    fontSize: 11,
    fontFamily: "Outfit_400Regular",
  },
  ebayButtons: {
    flexDirection: "row",
    gap: 10,
  },
=======
    gap: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Outfit_600SemiBold", textAlign: "center" },
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
  detailChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, gap: 2 },
  detailLabel: { fontSize: 10, fontFamily: "Outfit_400Regular", textTransform: "uppercase" },
  detailValue: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  priceSection: { borderRadius: 16, padding: 16, borderWidth: 1.5, gap: 12 },
  priceSectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  priceSectionTitle: { fontSize: 16, fontFamily: "Outfit_700Bold" },
  mainPrice: { borderRadius: 12, padding: 16, alignItems: "center", gap: 4 },
  mainPriceLabel: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  mainPriceValue: { fontSize: 28, fontFamily: "Outfit_700Bold" },
  mainPriceSource: { fontSize: 11, fontFamily: "Outfit_400Regular" },
  priceDetails: { gap: 4 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  priceLabel: { fontSize: 13, fontFamily: "Outfit_400Regular" },
  priceValue: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  ebaySection: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 10 },
  ebayDesc: { fontSize: 13, fontFamily: "Outfit_400Regular" },
  ebayButtons: { flexDirection: "row", gap: 10 },
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
  ebayBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
<<<<<<< HEAD
  ebayBtnText: {
    fontSize: 13,
    fontFamily: "Outfit_600SemiBold",
    color: "#FFF",
  },
  variantRow: {
    gap: 8,
    paddingBottom: 12,
  },
  conditionRow: {
    gap: 8,
    paddingBottom: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 90,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Outfit_600SemiBold",
  },
  gradeLabel: {
    fontSize: 13,
    fontFamily: "Outfit_600SemiBold",
  },
  gradeInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  gradeValue: {
    fontSize: 18,
    fontFamily: "Outfit_700Bold",
  },
  gradeButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  gradeBtn: {
    width: "19%",
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  gradeBtnText: {
    fontSize: 13,
    fontFamily: "Outfit_600SemiBold",
  },
  actionBtn: {
=======
  ebayBtnText: { fontSize: 13, fontFamily: "Outfit_600SemiBold", color: "#FFF" },
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
  conditionRow: { gap: 8 },
  conditionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  conditionChipText: { fontSize: 13, fontFamily: "Outfit_500Medium" },
  actionButtons: { gap: 10 },
  actionBtn: {},
  actionBtnGradient: {
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
<<<<<<< HEAD
    gap: 8,
  },
  actionBtnText: {
    fontSize: 16,
    fontFamily: "Outfit_600SemiBold",
    color: "#FFF",
  },
  marketplaceButtons: {
    flexDirection: "row",
    gap: 10,
    paddingBottom: 20,
  },
  marketplaceBtn: {
=======
    borderRadius: 14,
    gap: 8,
  },
  actionBtnText: { fontSize: 16, fontFamily: "Outfit_600SemiBold", color: "#FFF" },
  actionRow: { flexDirection: "row", gap: 10 },
  actionBtnSmall: {
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
<<<<<<< HEAD
    paddingVertical: 14,
    borderRadius: 10,
    gap: 6,
  },
  priceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontFamily: "Outfit_700Bold",
  },
  priceInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 16,
    fontFamily: "Outfit_600SemiBold",
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
=======
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  actionBtnSmallText: { fontSize: 13, fontFamily: "Outfit_600SemiBold", color: "#FFF" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  errorTitle: { fontSize: 18, fontFamily: "Outfit_600SemiBold", marginTop: 4 },
  errorSubtitle: { fontSize: 14, fontFamily: "Outfit_400Regular", textAlign: "center", paddingHorizontal: 32 },
  retryBtn: { marginTop: 8, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  retryBtnText: { fontSize: 15, fontFamily: "Outfit_600SemiBold", color: "#FFF" },
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
});
