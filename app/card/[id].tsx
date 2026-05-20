import React, { useState } from "react";
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
  TextInput,
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
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.pokemonRed} />
          <Text style={[styles.text, { color: colors.textSecondary }]}>
            Loading card...
          </Text>
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
          </Pressable>
        </View>
      </View>
    );
  }

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
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {card.name}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Card Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: card.images?.large || "" }}
            style={styles.cardImage}
            contentFit="contain"
            placeholder={{ color: colors.surface }}
          />
        </View>

        <View style={styles.content}>
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
              </View>
            )}
          </View>

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
            </Text>
            <View style={styles.ebayButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.ebayBtn,
                  { backgroundColor: "#E53238", opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={openEbayActive}
              >
                <Ionicons name="search" size={16} color="#FFF" />
                <Text style={styles.ebayBtnText}>Active</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.ebayBtn,
                  { backgroundColor: "#0064D2", opacity: pressed ? 0.8 : 1 },
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
                    },
                  ]}
                  onPress={() => setSelectedVariant(v)}
                >
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
  marketplaceButtons: {
    flexDirection: "row",
    gap: 10,
    paddingBottom: 20,
  },
  marketplaceBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
});
