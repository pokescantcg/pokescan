import React, { useState, useCallback } from "react";
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

  // Listing modal state
  const [listingModalVisible, setListingModalVisible] = useState(false);
  const [listingType, setListingType] = useState<"sale" | "trade">("sale");
  const [listingPrice, setListingPrice] = useState("");
  const [listingDescription, setListingDescription] = useState("");
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

  if (isLoading) {
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

  if (isError || !card) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: (insets.top || webTopInset) + 4 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        </View>
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
          </Pressable>
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
    </View>
  );
}

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
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  errorTitle: { fontSize: 18, fontFamily: "Outfit_600SemiBold", marginTop: 4 },
  errorSubtitle: { fontSize: 14, fontFamily: "Outfit_400Regular", textAlign: "center", paddingHorizontal: 32 },
  retryBtn: { marginTop: 8, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  retryBtnText: { fontSize: 15, fontFamily: "Outfit_600SemiBold", color: "#FFF" },
});
