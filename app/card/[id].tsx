import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/constants/colors";
import { getUKPrice, formatGBP } from "@/lib/pokemon-api";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();

  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const loadCard = async (attempt = 0) => {
    try {
      setLoading(true);
      setError(null);

      if (!id) {
        throw new Error("No card ID provided");
      }

      console.log(`🔵 Loading card with ID: ${id} (attempt ${attempt + 1})`);

      // Add timeout to catch hung requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(
        `https://pokemon-card-scan.replit.app/api/pokemon/cards/${id}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.data) {
        throw new Error("Invalid response format");
      }

      console.log(`🟢 Card loaded successfully: ${data.data.name}`);
      setCard(data.data);
    } catch (err: any) {
      console.error(`🔴 Error loading card (attempt ${attempt + 1}):`, err.message);

      // Auto-retry on server crash (5xx errors) or timeout
      if (attempt < MAX_RETRIES && (err.code === 'ABORT_ERR' || err.message?.includes('5'))) {
        console.log(`🟡 Retrying... (${attempt + 1}/${MAX_RETRIES})`);
        setRetryCount(attempt + 1);
        
        // Wait 2 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return loadCard(attempt + 1);
      }

      const errorMsg =
        err.code === 'ABORT_ERR'
          ? "Request timed out. Server may be busy. Please try again."
          : err.message || "Failed to load card";
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCard();
  }, [id]);

  const handleRetry = () => {
    setRetryCount(0);
    loadCard();
  };

  if (loading) {
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
          <MaterialCommunityIcons
            name="pokeball"
            size={48}
            color={colors.pokemonRed}
          />
          <Text style={[styles.text, { color: colors.textSecondary }]}>
            {retryCount > 0 ? `Retrying... (${retryCount}/${MAX_RETRIES})` : "Loading card..."}
          </Text>
        </View>
      </View>
    );
  }

  if (error || !card) {
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
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={48}
            color={colors.pokemonRed}
          />
          <Text style={[styles.text, { color: colors.text }]}>
            Card unavailable
          </Text>
          <Text style={[styles.smallText, { color: colors.textSecondary }]}>
            {error || "Unable to load card data"}
          </Text>
          <View style={styles.buttonGroup}>
            <Pressable
              onPress={handleRetry}
              style={[styles.button, { backgroundColor: colors.pokemonRed }]}
            >
              <Ionicons name="refresh" size={16} color="#FFF" />
              <Text style={styles.buttonText}>Try Again</Text>
            </Pressable>
            <Pressable
              onPress={() => router.back()}
              style={[
                styles.button,
                {
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.pokemonRed,
                },
              ]}
            >
              <Text style={[styles.buttonText, { color: colors.pokemonRed }]}>
                Go Back
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  const price = getUKPrice(card);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[styles.header, { paddingTop: (insets.top || webTopInset) + 4 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {card?.name || "Card"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Card Image */}
        <View style={styles.imageSection}>
          <Image
            source={{ uri: card?.images?.large || "" }}
            style={styles.cardImage}
            contentFit="contain"
            placeholder={{ color: colors.surface }}
          />
        </View>

        {/* Card Info */}
        <View style={styles.infoSection}>
          <Text style={[styles.cardName, { color: colors.text }]}>
            {card?.name || "Unknown Card"}
          </Text>
          <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
            {card?.set?.name || "Unknown Set"} #{card?.number || ""}
          </Text>

          {/* Details Grid */}
          <View style={styles.detailsGrid}>
            {card?.supertype && (
              <View
                style={[
                  styles.detailItem,
                  { backgroundColor: colors.card, borderColor: colors.borderLight },
                ]}
              >
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                  TYPE
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {card.supertype}
                </Text>
              </View>
            )}

            {card?.hp && (
              <View
                style={[
                  styles.detailItem,
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

            {card?.rarity && (
              <View
                style={[
                  styles.detailItem,
                  { backgroundColor: colors.card, borderColor: colors.borderLight },
                ]}
              >
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                  RARITY
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {card.rarity}
                </Text>
              </View>
            )}

            {card?.artist && (
              <View
                style={[
                  styles.detailItem,
                  { backgroundColor: colors.card, borderColor: colors.borderLight },
                ]}
              >
                <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                  ARTIST
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {card.artist}
                </Text>
              </View>
            )}
          </View>

          {/* Pricing Section */}
          {price.price && (
            <View
              style={[
                styles.priceSection,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderLight,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                UK Market Price
              </Text>
              <Text style={[styles.priceValue, { color: colors.success }]}>
                {formatGBP(price.price)}
              </Text>
              <Text style={[styles.priceSource, { color: colors.textMuted }]}>
                via {price.source || "TCGPlayer"}
              </Text>
            </View>
          )}

          {/* TCGPlayer Variants Info */}
          {card?.tcgplayer?.prices && (
            <View
              style={[
                styles.priceSection,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderLight,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Available Variants
              </Text>
              <View style={styles.variantsList}>
                {card.tcgplayer.prices?.normal && (
                  <Text style={[styles.variantItem, { color: colors.text }]}>
                    • Non-Holo
                  </Text>
                )}
                {card.tcgplayer.prices?.holofoil && (
                  <Text style={[styles.variantItem, { color: colors.text }]}>
                    • Holo
                  </Text>
                )}
                {card.tcgplayer.prices?.reverseHolofoil && (
                  <Text style={[styles.variantItem, { color: colors.text }]}>
                    • Reverse Holo
                  </Text>
                )}
                {card.tcgplayer.prices?.["1stEditionNormal"] && (
                  <Text style={[styles.variantItem, { color: colors.text }]}>
                    • 1st Edition
                  </Text>
                )}
                {card.tcgplayer.prices?.["1stEditionHolofoil"] && (
                  <Text style={[styles.variantItem, { color: colors.text }]}>
                    • 1st Edition Holo
                  </Text>
                )}
              </View>
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
  imageSection: {
    alignItems: "center",
    paddingVertical: 20,
  },
  cardImage: {
    width: SCREEN_WIDTH * 0.65,
    height: SCREEN_WIDTH * 0.65 * 1.4,
    borderRadius: 12,
  },
  infoSection: {
    paddingHorizontal: 20,
    gap: 16,
  },
  cardName: {
    fontSize: 28,
    fontFamily: "Outfit_700Bold",
  },
  cardMeta: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  detailItem: {
    flex: 1,
    minWidth: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  detailLabel: {
    fontSize: 9,
    fontFamily: "Outfit_600SemiBold",
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 13,
    fontFamily: "Outfit_600SemiBold",
    marginTop: 4,
  },
  priceSection: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
    marginBottom: 8,
  },
  priceValue: {
    fontSize: 24,
    fontFamily: "Outfit_700Bold",
  },
  priceSource: {
    fontSize: 11,
    fontFamily: "Outfit_400Regular",
    marginTop: 4,
  },
  variantsList: {
    gap: 4,
  },
  variantItem: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    paddingVertical: 2,
  },
  text: {
    fontSize: 16,
    fontFamily: "Outfit_500Medium",
  },
  smallText: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    width: "100%",
    paddingHorizontal: 20,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
    textAlign: "center",
  },
});
