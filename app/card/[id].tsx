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

  const { data: card, isLoading } = useQuery({
    queryKey: ["card", id],
    queryFn: () => fetchCard(id),
    staleTime: 1000 * 60 * 30,
  });

  const conditions = ["Mint", "Near Mint", "Excellent", "Good", "Light Play", "Played"];
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const inCollection = collection.some((c) => c.cardId === id);

  const handleAddToCollection = () => {
    if (!user) {
      Alert.alert("Sign In Required", "Create an account to add cards to your collection.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push("/register") },
      ]);
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
      priceGBP: priceData.price,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Added!", `${card.name} added to your collection.`);
  };

  const handleListForSale = () => {
    if (!user?.isPremium) {
      Alert.alert("Premium Required", "Upgrade to Premium to list cards on the marketplace.");
      return;
    }
    if (!card) return;
    const priceData = getUKPrice(card);
    createListing({
      userId: user.id,
      userName: user.displayName,
      cardId: card.id,
      cardName: card.name,
      cardImage: card.images.small,
      setName: card.set.name,
      rarity: card.rarity || "Unknown",
      type: "sale",
      priceGBP: priceData.price,
      condition: selectedCondition,
      description: "",
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Listed!", `${card.name} listed for sale on the marketplace.`);
  };

  const handleListForTrade = () => {
    if (!user?.isPremium) {
      Alert.alert("Premium Required", "Upgrade to Premium to list cards on the marketplace.");
      return;
    }
    if (!card) return;
    createListing({
      userId: user.id,
      userName: user.displayName,
      cardId: card.id,
      cardName: card.name,
      cardImage: card.images.small,
      setName: card.set.name,
      rarity: card.rarity || "Unknown",
      type: "trade",
      priceGBP: null,
      condition: selectedCondition,
      description: "",
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Listed!", `${card.name} listed for trade on the marketplace.`);
  };

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

  if (isLoading || !card) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: (insets.top || webTopInset) + 4 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="pokeball" size={40} color={colors.pokemonRed} />
        </View>
      </View>
    );
  }

  const priceData = getUKPrice(card);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: (insets.top || webTopInset) + 4 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {card.name}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: card.images.large }}
            style={styles.cardImage}
            contentFit="contain"
          />
        </View>

        <View style={styles.content}>
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
              </View>
            )}
          </View>

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
              <Text style={[styles.mainPriceValue, { color: priceData.price ? colors.success : colors.textMuted }]}>
                {formatGBP(priceData.price)}
              </Text>
              <Text style={[styles.mainPriceSource, { color: colors.textMuted }]}>
                via {priceData.source || "N/A"}
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
                onPress={handleListForSale}
              >
                <Ionicons name="cash-outline" size={18} color="#FFF" />
                <Text style={styles.actionBtnSmallText}>List for Sale</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtnSmall,
                  { backgroundColor: colors.pokemonBlue, opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={handleListForTrade}
              >
                <Ionicons name="swap-horizontal" size={18} color="#FFF" />
                <Text style={styles.actionBtnSmallText}>List for Trade</Text>
              </Pressable>
            </View>
          </View>
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
  ebayBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  ebayBtnText: { fontSize: 13, fontFamily: "Outfit_600SemiBold", color: "#FFF" },
  conditionTitle: { fontSize: 16, fontFamily: "Outfit_600SemiBold" },
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  actionBtnText: { fontSize: 16, fontFamily: "Outfit_600SemiBold", color: "#FFF" },
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
  actionBtnSmallText: { fontSize: 13, fontFamily: "Outfit_600SemiBold", color: "#FFF" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});
