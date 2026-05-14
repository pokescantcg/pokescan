import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  FlatList,
  ScrollView,
  useColorScheme,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/constants/colors";
import PokeBackground from "@/components/PokeBackground";
import { useUser } from "@/lib/user-context";
import { useAppConfig } from "@/lib/app-config-context";
import { getApiUrl } from "@/lib/query-client";
import { getSessionToken } from "@/lib/storage";
import {
  searchCards,
  PokemonCard,
  getUKPrice,
  formatGBP,
  identifyCard,
  CardIdentification,
  PCVCard,
  generateEbaySearchUrl,
  generateEbaySoldUrl,
  fetchPCVSearch,
  findCard,
} from "@/lib/pokemon-api";

function langFlag(lang: string): string {
  if (lang === "Japanese") return "🇯🇵";
  if (lang === "Korean") return "🇰🇷";
  if (lang === "Chinese") return "🇨🇳";
  return "🇬🇧";
}

function IdentificationCard({
  identification,
  colors,
}: {
  identification: CardIdentification;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const isJapanese = identification.language === "Japanese";
  const isKorean = identification.language === "Korean";
  const isChinese = identification.language === "Chinese";
  const isForeign = isJapanese || isKorean || isChinese;

  const confidenceColor =
    identification.confidence === "high"
      ? colors.success
      : identification.confidence === "medium"
        ? colors.pokemonYellow
        : colors.error;

  return (
    <View style={[styles.idCard, { backgroundColor: colors.card, borderColor: colors.pokemonRed + "60" }]}>
      <LinearGradient
        colors={[colors.pokemonRed + "15", "transparent"]}
        style={styles.idGradient}
      />
      <View style={styles.idHeader}>
        <View style={[styles.aiIconBg, { backgroundColor: colors.pokemonRed + "20" }]}>
          <MaterialCommunityIcons name="robot" size={18} color={colors.pokemonRed} />
        </View>
        <Text style={[styles.idTitle, { color: colors.text }]}>AI Identification</Text>
        <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor }]}>
          <Text style={styles.confidenceText}>{identification.confidence}</Text>
        </View>
      </View>

      <View style={styles.idRow}>
        <Text style={[styles.idLabel, { color: colors.textMuted }]}>Name</Text>
        <Text style={[styles.idValue, { color: colors.text }]}>{identification.englishName}</Text>
      </View>

      {isForeign && identification.originalName !== identification.englishName && (
        <View style={styles.idRow}>
          <Text style={[styles.idLabel, { color: colors.textMuted }]}>Original</Text>
          <Text style={[styles.idValue, { color: colors.textSecondary }]}>{identification.originalName}</Text>
        </View>
      )}

      <View style={styles.idRow}>
        <Text style={[styles.idLabel, { color: colors.textMuted }]}>Set</Text>
        <Text style={[styles.idValue, { color: colors.text }]}>{identification.setName}</Text>
      </View>

      <View style={styles.idRow}>
        <Text style={[styles.idLabel, { color: colors.textMuted }]}>Number</Text>
        <Text style={[styles.idValue, { color: colors.text }]}>{identification.cardNumber}</Text>
      </View>

      <View style={styles.idDetailsRow}>
        {identification.language && (
          <View style={[styles.idTag, { backgroundColor: isForeign ? colors.pokemonBlue : colors.surfaceElevated }]}>
            <Text style={[styles.idTagText, { color: isForeign ? "#FFF" : colors.textSecondary }]}>
              {identification.language}
            </Text>
          </View>
        )}
        {identification.rarity && (
          <View style={[styles.idTag, { backgroundColor: colors.pokemonYellow + "30" }]}>
            <Text style={[styles.idTagText, { color: colors.pokemonYellow }]}>{identification.rarity}</Text>
          </View>
        )}
        {identification.holoType && identification.holoType !== "Non-Holo" && (
          <View style={[styles.idTag, { backgroundColor: colors.pokemonRed + "20" }]}>
            <Text style={[styles.idTagText, { color: colors.pokemonRed }]}>{identification.holoType}</Text>
          </View>
        )}
      </View>

      {identification.notes ? (
        <Text style={[styles.idNotes, { color: colors.textMuted }]}>{identification.notes}</Text>
      ) : null}
    </View>
  );
}

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

const GRADERS = ["PSA", "Beckett", "ACE", "CGC"] as const;

function SoldPriceBreakdown({ ext, loading, colors }: {
  ext: ExtendedEbayPrice | null;
  loading: boolean;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const [gradedOpen, setGradedOpen] = useState(false);

  const hasAnyGraded = useMemo(() => {
    if (!ext?.gradedPrices) return false;
    return GRADERS.some(g => ext.gradedPrices![g][9] !== null || ext.gradedPrices![g][10] !== null);
  }, [ext]);

  if (loading) {
    return (
      <View style={soldStyles.loadingRow}>
        <ActivityIndicator size="small" color={colors.pokemonRed} />
        <Text style={[soldStyles.loadingText, { color: colors.textMuted }]}>Fetching eBay sold prices…</Text>
      </View>
    );
  }
  if (!ext || (ext.lowestSold === null && ext.medianSold === null && ext.highestSold === null)) return null;

  return (
    <View style={[soldStyles.wrap, { borderColor: colors.borderLight }]}>
      <Text style={[soldStyles.header, { color: colors.textSecondary }]}>eBay UK Sold Prices</Text>
      <View style={soldStyles.row}>
        <View style={soldStyles.stat}>
          <Text style={[soldStyles.statLabel, { color: colors.textMuted }]}>Lowest</Text>
          <Text style={[soldStyles.statValue, { color: colors.pokemonBlue }]}>
            {ext.lowestSold !== null ? formatGBP(ext.lowestSold) : "—"}
          </Text>
        </View>
        <View style={[soldStyles.divider, { backgroundColor: colors.borderLight }]} />
        <View style={soldStyles.stat}>
          <Text style={[soldStyles.statLabel, { color: colors.textMuted }]}>Median</Text>
          <Text style={[soldStyles.statValue, { color: colors.success }]}>
            {ext.medianSold !== null ? formatGBP(ext.medianSold) : "—"}
          </Text>
        </View>
        <View style={[soldStyles.divider, { backgroundColor: colors.borderLight }]} />
        <View style={soldStyles.stat}>
          <Text style={[soldStyles.statLabel, { color: colors.textMuted }]}>Highest</Text>
          <Text style={[soldStyles.statValue, { color: colors.pokemonRed }]}>
            {ext.highestSold !== null ? formatGBP(ext.highestSold) : "—"}
          </Text>
        </View>
      </View>

      {/* Graded prices toggle */}
      <Pressable
        style={[soldStyles.gradedToggle, { borderTopColor: colors.borderLight }]}
        onPress={() => setGradedOpen(v => !v)}
      >
        <MaterialCommunityIcons name="certificate-outline" size={14} color={colors.textMuted} />
        <Text style={[soldStyles.gradedToggleText, { color: colors.textMuted }]}>
          {gradedOpen ? "Hide Graded Prices" : "Show Graded Prices"}
        </Text>
        <Ionicons name={gradedOpen ? "chevron-up" : "chevron-down"} size={13} color={colors.textMuted} />
      </Pressable>

      {gradedOpen && (
        <View style={soldStyles.gradedGrid}>
          <View style={soldStyles.gradedHeaderRow}>
            <View style={soldStyles.gradedLabelCol} />
            <Text style={[soldStyles.gradedColHeader, { color: colors.textMuted }]}>Grade 9</Text>
            <Text style={[soldStyles.gradedColHeader, { color: colors.textMuted }]}>Grade 10</Text>
          </View>
          {GRADERS.map(grader => {
            const g9 = ext.gradedPrices?.[grader][9] ?? null;
            const g10 = ext.gradedPrices?.[grader][10] ?? null;
            return (
              <View key={grader} style={[soldStyles.gradedRow, { borderTopColor: colors.borderLight }]}>
                <Text style={[soldStyles.graderName, { color: colors.text }]}>{grader}</Text>
                <Text style={[soldStyles.gradedPrice, { color: g9 !== null ? colors.success : colors.textMuted }]}>
                  {g9 !== null ? formatGBP(g9) : "No data"}
                </Text>
                <Text style={[soldStyles.gradedPrice, { color: g10 !== null ? colors.success : colors.textMuted }]}>
                  {g10 !== null ? formatGBP(g10) : "No data"}
                </Text>
              </View>
            );
          })}
          {!hasAnyGraded && (
            <Text style={[soldStyles.noGradedText, { color: colors.textMuted }]}>
              No graded sold results found for this card
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const soldStyles = StyleSheet.create({
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  loadingText: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  wrap: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  header: { fontSize: 11, fontFamily: "Outfit_600SemiBold", paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  row: { flexDirection: "row", paddingHorizontal: 8, paddingBottom: 10 },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statLabel: { fontSize: 11, fontFamily: "Outfit_500Medium" },
  statValue: { fontSize: 16, fontFamily: "Outfit_700Bold" },
  divider: { width: 1, marginVertical: 4 },
  gradedToggle: { flexDirection: "row", alignItems: "center", gap: 6, borderTopWidth: 1, paddingVertical: 10, paddingHorizontal: 12 },
  gradedToggleText: { flex: 1, fontSize: 12, fontFamily: "Outfit_500Medium" },
  gradedGrid: { paddingHorizontal: 12, paddingBottom: 10, gap: 0 },
  gradedHeaderRow: { flexDirection: "row", alignItems: "center", paddingBottom: 6 },
  gradedLabelCol: { flex: 1 },
  gradedColHeader: { width: 80, fontSize: 11, fontFamily: "Outfit_600SemiBold", textAlign: "center" },
  gradedRow: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, paddingVertical: 8 },
  graderName: { flex: 1, fontSize: 13, fontFamily: "Outfit_700Bold" },
  gradedPrice: { width: 80, fontSize: 13, fontFamily: "Outfit_600SemiBold", textAlign: "center" },
  noGradedText: { fontSize: 12, fontFamily: "Outfit_400Regular", textAlign: "center", paddingVertical: 8 },
});

// ─── AI Price Card (shown when no database match found) ───────────────────────

function AIPriceCard({
  identification,
  pcvResults,
  colors,
  onEbayListings,
  onEbaySold,
}: {
  identification: CardIdentification;
  pcvResults: PCVCard[];
  colors: ReturnType<typeof useThemeColors>;
  onEbayListings: () => void;
  onEbaySold: () => void;
}) {
  const isForeign = ["Japanese", "Korean", "Chinese"].includes(identification.language);
  const flag = langFlag(identification.language);
  const topPrice = pcvResults.length > 0 ? pcvResults[0].priceGBP : null;
  const confidenceColor =
    identification.confidence === "high"
      ? colors.success
      : identification.confidence === "medium"
        ? colors.pokemonYellow
        : colors.error;

  const [extPrice, setExtPrice] = useState<ExtendedEbayPrice | null>(null);
  const [extLoading, setExtLoading] = useState(false);

  useEffect(() => {
    if (!identification.englishName) return;
    setExtLoading(true);
    const params = new URLSearchParams({ cardName: identification.englishName });
    if (identification.setName) params.set("setName", identification.setName);
    if (identification.cardNumber) params.set("number", identification.cardNumber);
    const url = new URL(`/api/ebay/sold-price?${params}`, getApiUrl());
    fetch(url.toString())
      .then(r => r.json())
      .then(data => {
        if (data.medianSold !== undefined || data.lowestSold !== undefined) {
          setExtPrice({
            lowestSold: data.lowestSold ?? null,
            medianSold: data.medianSold ?? null,
            highestSold: data.highestSold ?? null,
            gradedPrices: data.gradedPrices ?? null,
          });
        }
      })
      .catch(() => {})
      .finally(() => setExtLoading(false));
  }, [identification.englishName, identification.setName, identification.cardNumber]);

  return (
    <View style={[aiPriceStyles.wrap, { backgroundColor: colors.card, borderColor: colors.pokemonRed + "50" }]}>
      <LinearGradient colors={[colors.pokemonRed + "14", "transparent"]} style={aiPriceStyles.gradient} />

      {/* Header row */}
      <View style={aiPriceStyles.headerRow}>
        <View style={aiPriceStyles.badgeRow}>
          <View style={[aiPriceStyles.aiBadge, { backgroundColor: colors.pokemonRed + "20" }]}>
            <MaterialCommunityIcons name="robot" size={13} color={colors.pokemonRed} />
            <Text style={[aiPriceStyles.aiBadgeText, { color: colors.pokemonRed }]}>AI Result</Text>
          </View>
          <View style={[aiPriceStyles.confBadge, { backgroundColor: confidenceColor }]}>
            <Text style={aiPriceStyles.confBadgeText}>{identification.confidence}</Text>
          </View>
        </View>
        {topPrice ? (
          <Text style={[aiPriceStyles.priceText, { color: colors.success }]}>{formatGBP(topPrice)}</Text>
        ) : (
          <View style={[aiPriceStyles.noPriceBadge, { backgroundColor: colors.surface }]}>
            <Text style={[aiPriceStyles.noPriceText, { color: colors.textMuted }]}>No UK price</Text>
          </View>
        )}
      </View>

      {/* Card identity */}
      <View style={aiPriceStyles.cardIdentity}>
        <View style={aiPriceStyles.nameRow}>
          <Text style={aiPriceStyles.flagEmoji}>{flag}</Text>
          <Text style={[aiPriceStyles.cardName, { color: colors.text }]} numberOfLines={2}>
            {identification.englishName}
          </Text>
        </View>
        {isForeign && identification.originalName && identification.originalName !== identification.englishName && (
          <Text style={[aiPriceStyles.originalName, { color: colors.textSecondary }]}>
            {identification.originalName}
          </Text>
        )}
        <Text style={[aiPriceStyles.setLine, { color: colors.textSecondary }]} numberOfLines={1}>
          {identification.setName}
          {identification.cardNumber ? `  ·  #${identification.cardNumber}` : ""}
        </Text>

        {/* Tags */}
        <View style={aiPriceStyles.tagsRow}>
          {identification.language && isForeign && (
            <View style={[aiPriceStyles.tag, { backgroundColor: colors.pokemonBlue + "25" }]}>
              <Text style={[aiPriceStyles.tagText, { color: colors.pokemonBlue }]}>{identification.language}</Text>
            </View>
          )}
          {identification.rarity && (
            <View style={[aiPriceStyles.tag, { backgroundColor: colors.pokemonYellow + "28" }]}>
              <Text style={[aiPriceStyles.tagText, { color: colors.pokemonYellow }]}>{identification.rarity}</Text>
            </View>
          )}
          {identification.holoType && identification.holoType !== "Non-Holo" && (
            <View style={[aiPriceStyles.tag, { backgroundColor: colors.pokemonRed + "20" }]}>
              <Text style={[aiPriceStyles.tagText, { color: colors.pokemonRed }]}>{identification.holoType}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Sold price breakdown */}
      <SoldPriceBreakdown ext={extPrice} loading={extLoading} colors={colors} />

      {/* Price context note */}
      {!extLoading && !extPrice && topPrice && pcvResults.length > 1 && (
        <Text style={[aiPriceStyles.priceNote, { color: colors.textMuted }]}>
          Best UK price from {pcvResults.length} variant{pcvResults.length > 1 ? "s" : ""} · tap eBay for live market prices
        </Text>
      )}
      {!extLoading && !extPrice && !topPrice && (
        <Text style={[aiPriceStyles.priceNote, { color: colors.textMuted }]}>
          No UK database price found — use eBay UK below to check current market value
        </Text>
      )}

      {/* eBay buttons */}
      <View style={aiPriceStyles.ebayRow}>
        <Pressable
          style={({ pressed }) => [aiPriceStyles.ebayBtn, { backgroundColor: "#E53238", opacity: pressed ? 0.85 : 1 }]}
          onPress={onEbayListings}
        >
          <Ionicons name="search" size={15} color="#FFF" />
          <Text style={aiPriceStyles.ebayBtnText}>eBay Listings</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [aiPriceStyles.ebayBtn, { backgroundColor: "#0064D2", opacity: pressed ? 0.85 : 1 }]}
          onPress={onEbaySold}
        >
          <Ionicons name="checkmark-done" size={15} color="#FFF" />
          <Text style={aiPriceStyles.ebayBtnText}>Sold Items</Text>
        </Pressable>
      </View>

      {/* No DB note */}
      <View style={[aiPriceStyles.noDbNote, { backgroundColor: colors.surfaceElevated }]}>
        <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />
        <Text style={[aiPriceStyles.noDbNoteText, { color: colors.textMuted }]}>
          Card not found in our database — results are AI-identified only
        </Text>
      </View>
    </View>
  );
}

const aiPriceStyles = StyleSheet.create({
  wrap: { borderRadius: 16, borderWidth: 1.5, padding: 14, gap: 12, overflow: "hidden", marginBottom: 12 },
  gradient: { position: "absolute", top: 0, left: 0, right: 0, height: 80 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  aiBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  aiBadgeText: { fontSize: 11, fontFamily: "Outfit_700Bold" },
  confBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  confBadgeText: { fontSize: 11, fontFamily: "Outfit_700Bold", color: "#FFF", textTransform: "capitalize" },
  priceText: { fontSize: 22, fontFamily: "Outfit_700Bold" },
  noPriceBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  noPriceText: { fontSize: 12, fontFamily: "Outfit_500Medium" },
  cardIdentity: { gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  flagEmoji: { fontSize: 22, lineHeight: 28 },
  cardName: { fontSize: 20, fontFamily: "Outfit_700Bold", flex: 1 },
  originalName: { fontSize: 13, fontFamily: "Outfit_400Regular", marginLeft: 30, fontStyle: "italic" },
  setLine: { fontSize: 13, fontFamily: "Outfit_500Medium", marginLeft: 30 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginLeft: 30, marginTop: 4 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  tagText: { fontSize: 11, fontFamily: "Outfit_700Bold" },
  priceNote: { fontSize: 11, fontFamily: "Outfit_400Regular" },
  ebayRow: { flexDirection: "row", gap: 8 },
  ebayBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  ebayBtnText: { fontSize: 13, fontFamily: "Outfit_700Bold", color: "#FFF" },
  noDbNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    borderRadius: 8,
    padding: 8,
  },
  noDbNoteText: { flex: 1, fontSize: 11, fontFamily: "Outfit_400Regular", lineHeight: 16 },
});

function PCVResultCard({ card, colors }: { card: PCVCard; colors: ReturnType<typeof useThemeColors> }) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const found = await findCard(card.name, card.number, card.setId || undefined);
      if (found) {
        router.push({ pathname: "/card/[id]", params: { id: found.id } });
      } else {
        Alert.alert(
          card.name,
          `Card details:\nSet: ${card.setName || card.setId}\nNumber: #${card.number}\n${card.holoType ? `Type: ${card.holoType}\n` : ""}UK Value: ${formatGBP(card.priceGBP)}`,
          [{ text: "OK" }]
        );
      }
    } catch {
      Alert.alert("Error", "Could not load card details. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.resultCard,
        { backgroundColor: colors.card, borderColor: colors.borderLight, opacity: pressed || isLoading ? 0.7 : 1 },
      ]}
      onPress={handlePress}
      disabled={isLoading}
    >
      <View style={styles.resultInfo}>
        <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>
          {card.name}
        </Text>
        <Text style={[styles.resultSet, { color: colors.textSecondary }]} numberOfLines={1}>
          {card.setName || card.setId} #{card.number}
        </Text>
        <View style={styles.resultMeta}>
          {card.holoType ? (
            <Text style={[styles.resultRarity, { color: colors.pokemonRed }]} numberOfLines={1}>
              {card.holoType}
            </Text>
          ) : null}
          {card.rarity ? (
            <Text style={[styles.resultRarity, { color: colors.pokemonYellow }]} numberOfLines={1}>
              {card.rarity}
            </Text>
          ) : null}
          {card.edition && card.edition !== "Unlimited" ? (
            <Text style={[styles.resultRarity, { color: colors.textMuted }]} numberOfLines={1}>
              {card.edition}
            </Text>
          ) : null}
        </View>
      </View>
      <Text
        style={[
          styles.resultPrice,
          { color: card.priceGBP ? colors.success : colors.textMuted },
        ]}
      >
        {formatGBP(card.priceGBP)}
      </Text>
      {isLoading ? (
        <MaterialCommunityIcons name="pokeball" size={14} color={colors.pokemonRed} />
      ) : (
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

function DatabaseMatchCard({
  card,
  pcvCard,
  identification,
  colors,
  onEbayListings,
  onEbaySold,
}: {
  card: PokemonCard;
  pcvCard: PCVCard | null;
  identification: CardIdentification;
  colors: ReturnType<typeof useThemeColors>;
  onEbayListings: () => void;
  onEbaySold: () => void;
}) {
  const tcgPrice = getUKPrice(card);
  const displayPrice = pcvCard?.priceGBP || tcgPrice.price;

  const [extPrice, setExtPrice] = useState<ExtendedEbayPrice | null>(null);
  const [extLoading, setExtLoading] = useState(false);

  useEffect(() => {
    setExtLoading(true);
    const params = new URLSearchParams({ cardName: card.name });
    if (card.set?.name) params.set("setName", card.set.name);
    if (card.number) params.set("number", card.number);
    if (card.id) params.set("cardId", card.id);
    const url = new URL(`/api/ebay/sold-price?${params}`, getApiUrl());
    fetch(url.toString())
      .then(r => r.json())
      .then(data => {
        if (data.medianSold !== undefined || data.lowestSold !== undefined) {
          setExtPrice({
            lowestSold: data.lowestSold ?? null,
            medianSold: data.medianSold ?? null,
            highestSold: data.highestSold ?? null,
            gradedPrices: data.gradedPrices ?? null,
          });
        }
      })
      .catch(() => {})
      .finally(() => setExtLoading(false));
  }, [card.id]);

  return (
    <View style={[dbMatchStyles.wrap, { backgroundColor: colors.card, borderColor: colors.success + "60" }]}>
      <LinearGradient colors={[colors.success + "18", "transparent"]} style={dbMatchStyles.gradient} />

      <View style={dbMatchStyles.header}>
        <View style={[dbMatchStyles.badgeBg, { backgroundColor: colors.success + "20" }]}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={[dbMatchStyles.badgeText, { color: colors.success }]}>Database Match</Text>
        </View>
        {displayPrice ? (
          <Text style={[dbMatchStyles.price, { color: colors.success }]}>{formatGBP(displayPrice)}</Text>
        ) : null}
      </View>

      <Pressable
        style={({ pressed }) => [dbMatchStyles.cardRow, { opacity: pressed ? 0.85 : 1 }]}
        onPress={() => router.push({ pathname: "/card/[id]", params: { id: card.id } })}
      >
        <Image source={{ uri: card.images.small }} style={dbMatchStyles.cardImage} contentFit="contain" />
        <View style={dbMatchStyles.cardInfo}>
          <Text style={[dbMatchStyles.cardName, { color: colors.text }]} numberOfLines={2}>{card.name}</Text>
          <Text style={[dbMatchStyles.cardSet, { color: colors.textSecondary }]} numberOfLines={1}>
            {card.set.name}
          </Text>
          <Text style={[dbMatchStyles.cardNumber, { color: colors.textMuted }]}>
            #{card.number}
          </Text>
          {card.rarity && (
            <Text style={[dbMatchStyles.cardRarity, { color: colors.pokemonYellow }]} numberOfLines={1}>
              {card.rarity}
            </Text>
          )}
          <View style={dbMatchStyles.viewRow}>
            <Text style={[dbMatchStyles.viewText, { color: colors.pokemonRed }]}>View Full Details</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.pokemonRed} />
          </View>
        </View>
      </Pressable>

      {/* Sold price breakdown */}
      <SoldPriceBreakdown ext={extPrice} loading={extLoading} colors={colors} />

      <View style={dbMatchStyles.ebayRow}>
        <Pressable
          style={({ pressed }) => [dbMatchStyles.ebayBtn, { backgroundColor: "#E53238", opacity: pressed ? 0.85 : 1 }]}
          onPress={onEbayListings}
        >
          <Ionicons name="search" size={14} color="#FFF" />
          <Text style={dbMatchStyles.ebayBtnText}>eBay Listings</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [dbMatchStyles.ebayBtn, { backgroundColor: "#0064D2", opacity: pressed ? 0.85 : 1 }]}
          onPress={onEbaySold}
        >
          <Ionicons name="checkmark-done" size={14} color="#FFF" />
          <Text style={dbMatchStyles.ebayBtnText}>Sold Items</Text>
        </Pressable>
      </View>
    </View>
  );
}

const dbMatchStyles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  gradient: { position: "absolute", top: 0, left: 0, right: 0, height: 70 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badgeBg: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontFamily: "Outfit_700Bold" },
  price: { fontSize: 20, fontFamily: "Outfit_700Bold" },
  cardRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  cardImage: { width: 72, height: 100, borderRadius: 8 },
  cardInfo: { flex: 1, gap: 3 },
  cardName: { fontSize: 16, fontFamily: "Outfit_700Bold" },
  cardSet: { fontSize: 13, fontFamily: "Outfit_500Medium" },
  cardNumber: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  cardRarity: { fontSize: 12, fontFamily: "Outfit_600SemiBold" },
  viewRow: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 4 },
  viewText: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  ebayRow: { flexDirection: "row", gap: 8 },
  ebayBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 10, gap: 6 },
  ebayBtnText: { fontSize: 12, fontFamily: "Outfit_700Bold", color: "#FFF" },
});

function SearchResultCard({ card, colors }: { card: PokemonCard; colors: ReturnType<typeof useThemeColors> }) {
  const priceData = getUKPrice(card);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.resultCard,
        { backgroundColor: colors.card, borderColor: colors.borderLight, opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={() => router.push({ pathname: "/card/[id]", params: { id: card.id } })}
    >
      <Image source={{ uri: card.images.small }} style={styles.resultImage} contentFit="contain" />
      <View style={styles.resultInfo}>
        <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>
          {card.name}
        </Text>
        <Text style={[styles.resultSet, { color: colors.textSecondary }]} numberOfLines={1}>
          {card.set.name} #{card.number}
        </Text>
        {card.rarity && (
          <Text style={[styles.resultRarity, { color: colors.pokemonYellow }]} numberOfLines={1}>
            {card.rarity}
          </Text>
        )}
        <Text
          style={[
            styles.resultPrice,
            { color: priceData.price ? colors.success : colors.textMuted },
          ]}
        >
          {formatGBP(priceData.price)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

// ─── Grading Tool ────────────────────────────────────────────────────────────

interface GradingResult {
  grade: number;
  label: string;
  breakdown: { centering: number; corners: number; edges: number; surface: number };
  aiAssessed?: boolean;
  aiNotes?: string | null;
  centeringRatios?: {
    topPct: number;
    bottomPct: number;
    leftPct: number;
    rightPct: number;
  } | null;
  findings?: {
    centering?: string;
    corners?: string;
    edges?: string;
    frontSurface?: string;
    backSurface?: string;
  } | null;
  gradingComments?: string | null;
}

interface CapturedImage {
  uri: string;
  base64: string;
}

const CONDITION_LEVELS = [
  { value: 0, label: "Perfect",  color: "#27AE60" },
  { value: 1, label: "Minimal",  color: "#52BE80" },
  { value: 2, label: "Slight",   color: "#F39C12" },
  { value: 3, label: "Moderate", color: "#E67E22" },
  { value: 4, label: "Heavy",    color: "#E74C3C" },
  { value: 5, label: "Severe",   color: "#922B21" },
];

function gradeColor(grade: number): string {
  if (grade >= 9.5) return "#27AE60";
  if (grade >= 8.0) return "#52BE80";
  if (grade >= 6.0) return "#F39C12";
  if (grade >= 4.0) return "#E67E22";
  return "#E74C3C";
}

function centeringEdgeColor(pct: number): string {
  const offset = Math.abs(pct - 50);
  if (offset <= 3)  return "#27AE60";
  if (offset <= 8)  return "#F39C12";
  return "#E74C3C";
}

function CenteringOverlay({
  imageUri,
  ratios,
}: {
  imageUri: string;
  ratios: NonNullable<GradingResult["centeringRatios"]>;
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const VF = 0.20;
  const HF = 0.17;
  const topH    = size.h * VF * (ratios.topPct    / 100);
  const bottomH = size.h * VF * (ratios.bottomPct / 100);
  const leftW   = size.w * HF * (ratios.leftPct   / 100);
  const rightW  = size.w * HF * (ratios.rightPct  / 100);
  const vColor  = centeringEdgeColor(ratios.topPct);
  const hColor  = centeringEdgeColor(ratios.leftPct);

  return (
    <View
      style={gradingStyles.overlayContainer}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      <Image source={{ uri: imageUri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
      {size.w > 0 && (
        <>
          <View style={[gradingStyles.overlayStrip, { top: 0, left: 0, right: 0, height: topH, backgroundColor: vColor + "55" }]}>
            <Text style={gradingStyles.overlayLabel}>{ratios.topPct}%</Text>
          </View>
          <View style={[gradingStyles.overlayStrip, { bottom: 0, left: 0, right: 0, height: bottomH, backgroundColor: vColor + "55" }]}>
            <Text style={gradingStyles.overlayLabel}>{ratios.bottomPct}%</Text>
          </View>
          <View style={[gradingStyles.overlayStrip, { top: topH, bottom: bottomH, left: 0, width: leftW, backgroundColor: hColor + "55" }]}>
            <Text style={[gradingStyles.overlayLabel, { transform: [{ rotate: "-90deg" }] }]}>{ratios.leftPct}%</Text>
          </View>
          <View style={[gradingStyles.overlayStrip, { top: topH, bottom: bottomH, right: 0, width: rightW, backgroundColor: hColor + "55" }]}>
            <Text style={[gradingStyles.overlayLabel, { transform: [{ rotate: "90deg" }] }]}>{ratios.rightPct}%</Text>
          </View>
        </>
      )}
    </View>
  );
}

function ImageCapturePanel({
  label,
  image,
  onCamera,
  onGallery,
  onClear,
  colors,
  disabled,
}: {
  label: string;
  image: CapturedImage | null;
  onCamera: () => void;
  onGallery: () => void;
  onClear: () => void;
  colors: ReturnType<typeof useThemeColors>;
  disabled?: boolean;
}) {
  return (
    <View style={gradingStyles.panelWrap}>
      <Text style={[gradingStyles.panelLabel, { color: colors.textSecondary }]}>{label}</Text>
      {image ? (
        <View style={[gradingStyles.panelImageWrap, { borderColor: colors.success + "80" }]}>
          <Image source={{ uri: image.uri }} style={gradingStyles.panelImage} contentFit="cover" />
          <Pressable style={gradingStyles.panelClearBtn} onPress={onClear}>
            <Ionicons name="close-circle" size={22} color="#FFF" />
          </Pressable>
          <View style={[gradingStyles.panelTick, { backgroundColor: colors.success }]}>
            <Ionicons name="checkmark" size={12} color="#FFF" />
          </View>
        </View>
      ) : (
        <View style={[gradingStyles.panelPlaceholder, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Ionicons name="card-outline" size={32} color={colors.textMuted} />
          <Text style={[gradingStyles.panelPlaceholderText, { color: colors.textMuted }]}>
            {label === "Front" ? "Card Front" : "Card Back"}
          </Text>
        </View>
      )}
      <View style={gradingStyles.panelBtns}>
        <Pressable
          style={({ pressed }) => [gradingStyles.panelBtn, { backgroundColor: colors.pokemonRed, opacity: pressed || disabled ? 0.7 : 1 }]}
          onPress={onCamera}
          disabled={!!disabled}
        >
          <Ionicons name="camera" size={15} color="#FFF" />
        </Pressable>
        <Pressable
          style={({ pressed }) => [gradingStyles.panelBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, opacity: pressed || disabled ? 0.7 : 1 }]}
          onPress={onGallery}
          disabled={!!disabled}
        >
          <Ionicons name="images" size={15} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

function ConditionRow({
  label,
  icon,
  value,
  onChange,
  colors,
}: {
  label: string;
  icon: string;
  value: number;
  onChange: (v: number) => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={gradingStyles.condRow}>
      <View style={gradingStyles.condLabelRow}>
        <Ionicons name={icon as any} size={14} color={colors.pokemonRed} />
        <Text style={[gradingStyles.condLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[gradingStyles.condValue, { color: CONDITION_LEVELS[value].color }]}>
          {CONDITION_LEVELS[value].label}
        </Text>
      </View>
      <View style={gradingStyles.condButtons}>
        {CONDITION_LEVELS.map((lvl) => (
          <Pressable
            key={lvl.value}
            onPress={() => onChange(lvl.value)}
            style={[
              gradingStyles.condBtn,
              {
                backgroundColor: value === lvl.value ? lvl.color : colors.surface,
                borderColor:     value === lvl.value ? lvl.color : colors.borderLight,
              },
            ]}
          >
            <Text style={[gradingStyles.condBtnText, { color: value === lvl.value ? "#FFF" : colors.textMuted }]}>
              {lvl.value}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

async function pickImage(source: "camera" | "gallery"): Promise<CapturedImage | null> {
  if (source === "camera") {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Camera access is needed to grade cards.");
      return null;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: true, aspect: [3, 4], base64: true });
    if (res.canceled || !res.assets[0]) return null;
    const asset = res.assets[0];
    const b64 = asset.base64
      ? (asset.base64.startsWith("data:") ? asset.base64 : `data:image/jpeg;base64,${asset.base64}`)
      : await (async () => {
          const raw = await FileSystem.readAsStringAsync(asset.uri, { encoding: "base64" as any });
          return `data:image/jpeg;base64,${raw}`;
        })();
    return { uri: asset.uri, base64: b64 };
  } else {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, allowsEditing: true, aspect: [3, 4], base64: true });
    if (res.canceled || !res.assets[0]) return null;
    const asset = res.assets[0];
    const b64 = asset.base64
      ? (asset.base64.startsWith("data:") ? asset.base64 : `data:image/jpeg;base64,${asset.base64}`)
      : await (async () => {
          if (Platform.OS === "web") {
            const resp = await fetch(asset.uri);
            const blob = await resp.blob();
            return new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }
          const raw = await FileSystem.readAsStringAsync(asset.uri, { encoding: "base64" as any });
          return `data:image/jpeg;base64,${raw}`;
        })();
    return { uri: asset.uri, base64: b64 };
  }
}

function GradingTool({ colors, isPremium }: { colors: ReturnType<typeof useThemeColors>; isPremium: boolean }) {
  const [frontImage, setFrontImage] = useState<CapturedImage | null>(null);
  const [backImage, setBackImage]   = useState<CapturedImage | null>(null);
  const [isAiGrading, setIsAiGrading] = useState(false);
  const [result, setResult] = useState<GradingResult | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [centering, setCentering] = useState(0);
  const [cornerDamage, setCornerDamage] = useState(0);
  const [edgeDamage, setEdgeDamage] = useState(0);
  const [surfaceDamage, setSurfaceDamage] = useState(0);
  const [manualLoading, setManualLoading] = useState(false);

  const resetAll = () => {
    setFrontImage(null);
    setBackImage(null);
    setResult(null);
    setCentering(0);
    setCornerDamage(0);
    setEdgeDamage(0);
    setSurfaceDamage(0);
  };

  const handleCapture = async (side: "front" | "back", source: "camera" | "gallery") => {
    try {
      const img = await pickImage(source);
      if (!img) return;
      if (side === "front") setFrontImage(img);
      else setBackImage(img);
    } catch (e) {
      console.error("Image pick error:", e);
    }
  };

  const handleAiGrade = async () => {
    if (!frontImage || !backImage) return;
    setResult(null);
    setIsAiGrading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const url = new URL("/api/grade", getApiUrl());
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frontImageBase64: frontImage.base64, backImageBase64: backImage.base64 }),
      });
      const data: GradingResult = await res.json();
      setResult(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "AI grading failed. Please try again or use Manual Grade.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsAiGrading(false);
    }
  };

  const handleManualGrade = async () => {
    setManualLoading(true);
    try {
      const url = new URL("/api/grade", getApiUrl());
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centering, cornerDamage, edgeDamage, surfaceDamage }),
      });
      const data: GradingResult = await res.json();
      setResult(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to calculate grade. Please try again.");
    } finally {
      setManualLoading(false);
    }
  };

  if (!isPremium) {
    return (
      <View style={[gradingStyles.lockWrap, { backgroundColor: colors.card, borderColor: colors.pokemonYellow + "60" }]}>
        <LinearGradient colors={[colors.pokemonYellow + "15", "transparent"]} style={gradingStyles.lockGradient} />
        <View style={[gradingStyles.lockIconBg, { backgroundColor: colors.pokemonYellow + "25" }]}>
          <Ionicons name="lock-closed" size={28} color={colors.pokemonYellow} />
        </View>
        <Text style={[gradingStyles.lockTitle, { color: colors.text }]}>Premium Feature</Text>
        <Text style={[gradingStyles.lockDesc, { color: colors.textSecondary }]}>
          Card grading is available to Premium members. Upgrade to get accurate PSA-style grades for your cards.
        </Text>
        <Pressable
          style={({ pressed }) => [gradingStyles.lockBtn, { backgroundColor: colors.pokemonYellow, opacity: pressed ? 0.85 : 1 }]}
          onPress={() => router.push("/profile" as any)}
        >
          <Ionicons name="star" size={16} color="#1A1A2E" />
          <Text style={gradingStyles.lockBtnText}>Upgrade to Premium</Text>
        </Pressable>
      </View>
    );
  }

  const canGrade = !!(frontImage && backImage);
  const bothScanned = canGrade;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={gradingStyles.scrollContent}>

      {/* ── Scan panel ── */}
      <View style={[gradingStyles.card, { backgroundColor: colors.card, borderColor: colors.pokemonRed + "50" }]}>
        <LinearGradient colors={[colors.pokemonRed + "12", "transparent"]} style={gradingStyles.cardGrad} />

        <View style={gradingStyles.cardHeader}>
          <View style={[gradingStyles.headerBadge, { backgroundColor: colors.pokemonRed + "20" }]}>
            <MaterialCommunityIcons name="certificate" size={16} color={colors.pokemonRed} />
            <Text style={[gradingStyles.headerBadgeText, { color: colors.pokemonRed }]}>AI Card Grader</Text>
          </View>
          {(frontImage || backImage || result) && (
            <Pressable onPress={resetAll}>
              <Text style={[gradingStyles.resetText, { color: colors.textMuted }]}>Reset</Text>
            </Pressable>
          )}
        </View>

        <Text style={[gradingStyles.cardHint, { color: colors.textMuted }]}>
          Scan both sides of your card for an accurate AI grade
        </Text>

        <View style={gradingStyles.panelsRow}>
          <ImageCapturePanel
            label="Front"
            image={frontImage}
            onCamera={() => handleCapture("front", "camera")}
            onGallery={() => handleCapture("front", "gallery")}
            onClear={() => { setFrontImage(null); setResult(null); }}
            colors={colors}
            disabled={isAiGrading}
          />
          <ImageCapturePanel
            label="Back"
            image={backImage}
            onCamera={() => handleCapture("back", "camera")}
            onGallery={() => handleCapture("back", "gallery")}
            onClear={() => { setBackImage(null); setResult(null); }}
            colors={colors}
            disabled={isAiGrading}
          />
        </View>

        {!bothScanned && (
          <View style={[gradingStyles.scanHintRow, { backgroundColor: colors.surface }]}>
            <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
            <Text style={[gradingStyles.scanHintText, { color: colors.textMuted }]}>
              {!frontImage && !backImage
                ? "Scan the front and back of your card to begin"
                : !frontImage
                ? "Still need the card front"
                : "Still need the card back"}
            </Text>
          </View>
        )}

        {bothScanned && (
          <Pressable
            style={({ pressed }) => [gradingStyles.gradeBtn, { opacity: pressed || isAiGrading ? 0.85 : 1 }]}
            onPress={handleAiGrade}
            disabled={isAiGrading}
          >
            <LinearGradient colors={["#CC0000", "#8B0000"]} style={gradingStyles.gradeBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              {isAiGrading ? (
                <>
                  <ActivityIndicator color="#FFF" size="small" />
                  <Text style={gradingStyles.gradeBtnText}>AI Analysing Both Sides…</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="certificate-outline" size={20} color="#FFF" />
                  <Text style={gradingStyles.gradeBtnText}>Grade This Card</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        )}
      </View>

      {/* ── Grade result ── */}
      {result && (
        <View style={[gradingStyles.resultCard, { backgroundColor: colors.card, borderColor: gradeColor(result.grade) + "80" }]}>
          <LinearGradient colors={[gradeColor(result.grade) + "18", "transparent"]} style={gradingStyles.cardGrad} />

          {result.aiAssessed && (
            <View style={gradingStyles.aiBadgeRow}>
              <View style={[gradingStyles.aiBadge, { backgroundColor: colors.pokemonRed + "20" }]}>
                <MaterialCommunityIcons name="robot" size={13} color={colors.pokemonRed} />
                <Text style={[gradingStyles.aiBadgeText, { color: colors.pokemonRed }]}>AI Assessed — Front &amp; Back</Text>
              </View>
            </View>
          )}

          {/* Grade number + label */}
          <View style={gradingStyles.gradeDisplay}>
            <Text style={[gradingStyles.gradeNumber, { color: gradeColor(result.grade) }]}>
              {result.grade.toFixed(1)}
            </Text>
            <View style={gradingStyles.gradeInfo}>
              <Text style={[gradingStyles.gradeLabel, { color: colors.text }]}>{result.label}</Text>
              <Text style={[gradingStyles.gradeSubtext, { color: colors.textMuted }]}>Estimated Grade</Text>
            </View>
          </View>

          {/* Score breakdown */}
          <View style={[gradingStyles.breakdownRow, { borderTopColor: colors.borderLight }]}>
            {[
              { label: "Centering", score: result.breakdown.centering },
              { label: "Corners",   score: result.breakdown.corners },
              { label: "Edges",     score: result.breakdown.edges },
              { label: "Surface",   score: result.breakdown.surface },
            ].map((b) => (
              <View key={b.label} style={gradingStyles.breakdownItem}>
                <Text style={[gradingStyles.breakdownScore, { color: gradeColor(b.score) }]}>{b.score.toFixed(1)}</Text>
                <Text style={[gradingStyles.breakdownLabel, { color: colors.textMuted }]}>{b.label}</Text>
              </View>
            ))}
          </View>

          {/* Centering overlay on front card */}
          {frontImage && result.centeringRatios && (
            <View style={gradingStyles.centeringSection}>
              <Text style={[gradingStyles.findingTitle, { color: colors.text }]}>Centering Analysis</Text>
              <View style={[gradingStyles.centeringLegendRow]}>
                {["Top", "Bottom", "Left", "Right"].map((side, i) => {
                  const pct = [
                    result.centeringRatios!.topPct,
                    result.centeringRatios!.bottomPct,
                    result.centeringRatios!.leftPct,
                    result.centeringRatios!.rightPct,
                  ][i];
                  return (
                    <View key={side} style={gradingStyles.centeringLegendItem}>
                      <Text style={[gradingStyles.centeringLegendPct, { color: centeringEdgeColor(pct) }]}>{pct}%</Text>
                      <Text style={[gradingStyles.centeringLegendSide, { color: colors.textMuted }]}>{side}</Text>
                    </View>
                  );
                })}
              </View>
              <CenteringOverlay imageUri={frontImage.uri} ratios={result.centeringRatios} />
              <Text style={[gradingStyles.centeringCaption, { color: colors.textMuted }]}>
                Coloured bars show estimated border margins. Green = well-centred, red = off-centre.
              </Text>
            </View>
          )}

          {/* Detailed findings per category */}
          {result.findings && (
            <View style={[gradingStyles.findingsSection, { borderTopColor: colors.borderLight }]}>
              <Text style={[gradingStyles.findingsSectionTitle, { color: colors.text }]}>Detailed Findings</Text>
              {[
                { key: "centering",    icon: "resize",         label: "Centering",      text: result.findings.centering },
                { key: "corners",      icon: "triangle",       label: "Corners",         text: result.findings.corners },
                { key: "edges",        icon: "remove",         label: "Edges",           text: result.findings.edges },
                { key: "frontSurface", icon: "phone-portrait", label: "Front Surface",   text: result.findings.frontSurface },
                { key: "backSurface",  icon: "phone-portrait", label: "Back Surface",    text: result.findings.backSurface },
              ].filter((f) => f.text && f.text !== "N/A").map((f) => (
                <View key={f.key} style={[gradingStyles.findingRow, { borderColor: colors.borderLight }]}>
                  <View style={[gradingStyles.findingIconWrap, { backgroundColor: colors.surface }]}>
                    <Ionicons name={f.icon as any} size={13} color={colors.pokemonRed} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[gradingStyles.findingTitle, { color: colors.text }]}>{f.label}</Text>
                    <Text style={[gradingStyles.findingText, { color: colors.textSecondary }]}>{f.text}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Professional grading comments */}
          {result.gradingComments && (
            <View style={[gradingStyles.commentsBox, { backgroundColor: colors.surface, borderColor: colors.pokemonRed + "30" }]}>
              <View style={gradingStyles.commentsHeader}>
                <MaterialCommunityIcons name="certificate-outline" size={14} color={colors.pokemonRed} />
                <Text style={[gradingStyles.commentsTitle, { color: colors.pokemonRed }]}>Professional Assessment</Text>
              </View>
              <Text style={[gradingStyles.commentsText, { color: colors.textSecondary }]}>{result.gradingComments}</Text>
            </View>
          )}

          {/* Summary note */}
          {result.aiNotes && (
            <View style={[gradingStyles.aiNotes, { backgroundColor: colors.surface }]}>
              <MaterialCommunityIcons name="robot" size={13} color={colors.textMuted} />
              <Text style={[gradingStyles.aiNotesText, { color: colors.textMuted }]}>{result.aiNotes}</Text>
            </View>
          )}

          <View style={[gradingStyles.disclaimer, { backgroundColor: colors.surface }]}>
            <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
            <Text style={[gradingStyles.disclaimerText, { color: colors.textMuted }]}>
              Estimated grade only. Professional grading services (PSA, BGS, CGC) may differ.
            </Text>
          </View>
        </View>
      )}

      {/* ── Manual Grade toggle ── */}
      <Pressable
        style={[gradingStyles.manualToggle, { borderColor: colors.borderLight }]}
        onPress={() => setShowManual(v => !v)}
      >
        <Ionicons name={showManual ? "chevron-up" : "chevron-down"} size={14} color={colors.textMuted} />
        <Text style={[gradingStyles.manualToggleText, { color: colors.textMuted }]}>
          {showManual ? "Hide Manual Grade" : "Manual Grade (no photo)"}
        </Text>
      </Pressable>

      {showManual && (
        <View style={[gradingStyles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <Text style={[gradingStyles.cardHint, { color: colors.textMuted }]}>
            Rate each condition from 0 (perfect) to 5 (severe damage)
          </Text>
          <ConditionRow label="Centering" icon="resize"    value={centering}     onChange={setCentering}     colors={colors} />
          <ConditionRow label="Corners"   icon="triangle"  value={cornerDamage}  onChange={setCornerDamage}  colors={colors} />
          <ConditionRow label="Edges"     icon="remove"    value={edgeDamage}    onChange={setEdgeDamage}    colors={colors} />
          <ConditionRow label="Surface"   icon="eye"       value={surfaceDamage} onChange={setSurfaceDamage} colors={colors} />
          <Pressable
            style={({ pressed }) => [gradingStyles.gradeBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={handleManualGrade}
            disabled={manualLoading}
          >
            <LinearGradient colors={["#CC0000", "#8B0000"]} style={gradingStyles.gradeBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              {manualLoading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="certificate-outline" size={20} color="#FFF" />
                  <Text style={gradingStyles.gradeBtnText}>Calculate Grade</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const gradingStyles = StyleSheet.create({
  scrollContent:         { paddingHorizontal: 16, paddingBottom: 100, gap: 12 },
  card:                  { borderRadius: 16, borderWidth: 1.5, padding: 16, gap: 14, overflow: "hidden" },
  cardGrad:              { position: "absolute", top: 0, left: 0, right: 0, height: 80 },
  cardHeader:            { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerBadge:           { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  headerBadgeText:       { fontSize: 13, fontFamily: "Outfit_700Bold" },
  resetText:             { fontSize: 13, fontFamily: "Outfit_500Medium" },
  cardHint:              { fontSize: 12, fontFamily: "Outfit_400Regular" },
  // Two-panel capture
  panelsRow:             { flexDirection: "row", gap: 12 },
  panelWrap:             { flex: 1, gap: 6 },
  panelLabel:            { fontSize: 12, fontFamily: "Outfit_700Bold", textAlign: "center" },
  panelImageWrap:        { borderRadius: 10, overflow: "hidden", aspectRatio: 0.72, borderWidth: 2 },
  panelImage:            { width: "100%", height: "100%" },
  panelClearBtn:         { position: "absolute", top: 4, right: 4 },
  panelTick:             { position: "absolute", bottom: 4, right: 4, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  panelPlaceholder:      { borderRadius: 10, aspectRatio: 0.72, borderWidth: 1.5, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 6 },
  panelPlaceholderText:  { fontSize: 10, fontFamily: "Outfit_500Medium", textAlign: "center" },
  panelBtns:             { flexDirection: "row", gap: 6 },
  panelBtn:              { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  scanHintRow:           { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, padding: 10 },
  scanHintText:          { flex: 1, fontSize: 12, fontFamily: "Outfit_400Regular" },
  // Grade button
  gradeBtn:              { borderRadius: 14, overflow: "hidden" },
  gradeBtnInner:         { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 8 },
  gradeBtnText:          { fontSize: 15, fontFamily: "Outfit_700Bold", color: "#FFF" },
  // Result card
  resultCard:            { borderRadius: 16, borderWidth: 1.5, padding: 16, gap: 12, overflow: "hidden" },
  aiBadgeRow:            { flexDirection: "row" },
  aiBadge:               { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  aiBadgeText:           { fontSize: 12, fontFamily: "Outfit_700Bold" },
  gradeDisplay:          { flexDirection: "row", alignItems: "center", gap: 16 },
  gradeNumber:           { fontSize: 64, fontFamily: "Outfit_700Bold", lineHeight: 70 },
  gradeInfo:             { flex: 1, gap: 4 },
  gradeLabel:            { fontSize: 16, fontFamily: "Outfit_700Bold" },
  gradeSubtext:          { fontSize: 12, fontFamily: "Outfit_400Regular" },
  breakdownRow:          { flexDirection: "row", borderTopWidth: 1, paddingTop: 12, gap: 4 },
  breakdownItem:         { flex: 1, alignItems: "center", gap: 2 },
  breakdownScore:        { fontSize: 16, fontFamily: "Outfit_700Bold" },
  breakdownLabel:        { fontSize: 10, fontFamily: "Outfit_500Medium" },
  // Centering overlay
  centeringSection:      { gap: 8 },
  centeringLegendRow:    { flexDirection: "row", justifyContent: "space-around" },
  centeringLegendItem:   { alignItems: "center", gap: 2 },
  centeringLegendPct:    { fontSize: 15, fontFamily: "Outfit_700Bold" },
  centeringLegendSide:   { fontSize: 10, fontFamily: "Outfit_500Medium" },
  overlayContainer:      { width: "100%", aspectRatio: 0.72, borderRadius: 10, overflow: "hidden", backgroundColor: "#000" },
  overlayStrip:          { position: "absolute", alignItems: "center", justifyContent: "center" },
  overlayLabel:          { color: "#FFF", fontSize: 10, fontFamily: "Outfit_700Bold", textShadowColor: "#000", textShadowRadius: 3, textShadowOffset: { width: 0, height: 0 } },
  centeringCaption:      { fontSize: 10, fontFamily: "Outfit_400Regular", textAlign: "center" },
  // Findings
  findingsSection:       { borderTopWidth: 1, paddingTop: 12, gap: 10 },
  findingsSectionTitle:  { fontSize: 14, fontFamily: "Outfit_700Bold" },
  findingRow:            { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  findingIconWrap:       { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  findingTitle:          { fontSize: 12, fontFamily: "Outfit_700Bold" },
  findingText:           { fontSize: 12, fontFamily: "Outfit_400Regular", lineHeight: 17 },
  // Professional comments
  commentsBox:           { borderRadius: 10, borderWidth: 1, padding: 12, gap: 6 },
  commentsHeader:        { flexDirection: "row", alignItems: "center", gap: 6 },
  commentsTitle:         { fontSize: 12, fontFamily: "Outfit_700Bold" },
  commentsText:          { fontSize: 12, fontFamily: "Outfit_400Regular", lineHeight: 18 },
  // AI notes + disclaimer
  aiNotes:               { flexDirection: "row", alignItems: "flex-start", gap: 6, borderRadius: 8, padding: 10 },
  aiNotesText:           { flex: 1, fontSize: 11, fontFamily: "Outfit_400Regular", lineHeight: 16, fontStyle: "italic" },
  disclaimer:            { flexDirection: "row", alignItems: "flex-start", gap: 6, borderRadius: 8, padding: 10 },
  disclaimerText:        { flex: 1, fontSize: 11, fontFamily: "Outfit_400Regular", lineHeight: 16 },
  // Manual grade
  condRow:               { gap: 8 },
  condLabelRow:          { flexDirection: "row", alignItems: "center", gap: 6 },
  condLabel:             { fontSize: 13, fontFamily: "Outfit_600SemiBold", flex: 1 },
  condValue:             { fontSize: 12, fontFamily: "Outfit_700Bold" },
  condButtons:           { flexDirection: "row", gap: 6 },
  condBtn:               { flex: 1, aspectRatio: 1, borderRadius: 8, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  condBtnText:           { fontSize: 12, fontFamily: "Outfit_700Bold" },
  manualToggle:          { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  manualToggleText:      { fontSize: 13, fontFamily: "Outfit_500Medium" },
  // Premium lock
  lockWrap:              { borderRadius: 16, borderWidth: 1.5, padding: 24, gap: 14, alignItems: "center", overflow: "hidden", marginHorizontal: 16 },
  lockGradient:          { position: "absolute", top: 0, left: 0, right: 0, height: 100 },
  lockIconBg:            { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  lockTitle:             { fontSize: 20, fontFamily: "Outfit_700Bold" },
  lockDesc:              { fontSize: 14, fontFamily: "Outfit_400Regular", textAlign: "center", lineHeight: 20 },
  lockBtn:               { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  lockBtnText:           { fontSize: 15, fontFamily: "Outfit_700Bold", color: "#1A1A2E" },
});

interface ScanQuota {
  freeScansRemaining: number;
  bonusScansAvailable: number;
  totalRemaining: number;
  consecutiveLoginDays: number;
  alreadyCheckedInToday: boolean;
  bonusEarnedToday: number;
  streakReset: boolean;
}

export default function ScannerScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { scannerEnabled } = useAppConfig();
  const isPremium = user?.isPremium ?? false;
  const [mode, setMode] = useState<"identify" | "grade">("identify");
  const gradeDisclaimerShown = useRef(false);
  const [scanQuota, setScanQuota] = useState<ScanQuota | null>(null);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [streakModal, setStreakModal] = useState<{ day: number; bonus: number; reset: boolean } | null>(null);

  useEffect(() => {
    if (!user || isPremium) return;
    (async () => {
      try {
        const token = await getSessionToken();
        if (!token) return;
        const base = getApiUrl();
        const res = await fetch(new URL("/api/user/daily-checkin", base).toString(), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data: ScanQuota & { streakReset?: boolean } = await res.json();
        if ((data as any).unlimited) return;
        setScanQuota(data);
        if (!data.alreadyCheckedInToday && data.bonusEarnedToday > 0) {
          setStreakModal({
            day: data.consecutiveLoginDays === 0 ? 7 : data.consecutiveLoginDays,
            bonus: data.bonusEarnedToday,
            reset: !!data.streakReset,
          });
        }
      } catch { /* ignore — quota display is non-critical */ }
    })();
  }, [user?.id, isPremium]);

  const refreshQuota = useCallback(async () => {
    if (!user || isPremium) return;
    try {
      const token = await getSessionToken();
      if (!token) return;
      const base = getApiUrl();
      const res = await fetch(new URL("/api/user/scan-quota", base).toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if ((data as any).unlimited) return;
      setScanQuota(data);
      if (data.totalRemaining <= 0) setIsQuotaExceeded(true);
    } catch { /* ignore */ }
  }, [user?.id, isPremium]);

  const handleSwitchToGrade = useCallback(() => {
    if (!gradeDisclaimerShown.current) {
      gradeDisclaimerShown.current = true;
      Alert.alert(
        "Estimated Grades Only",
        "The grades provided by this tool are estimates based on the condition details you enter and are intended as a guide only.\n\nThese are NOT official grades from PSA, BGS, CGC or any other professional grading company.\n\nPokeScan TCG and its development team accept no responsibility for any difference between the estimated grade shown here and the final grade given by a professional grading service. Always seek professional grading for accurate results.",
        [{ text: "I Understand", style: "default", onPress: () => setMode("grade") }],
        { cancelable: false }
      );
    } else {
      setMode("grade");
    }
  }, []);
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<PokemonCard[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identification, setIdentification] = useState<CardIdentification | null>(null);
  const [pcvResults, setPcvResults] = useState<PCVCard[]>([]);
  const [tcgApiResults, setTcgApiResults] = useState<PokemonCard[]>([]);
  const [identifyError, setIdentifyError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchText.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    setIdentification(null);
    setPcvResults([]);
    setTcgApiResults([]);
    try {
      const pcvSearchResults = await fetchPCVSearch(searchText.trim());
      if (pcvSearchResults.length > 0) {
        setPcvResults(pcvSearchResults);
        setResults([]);
      } else {
        try {
          const { cards } = await searchCards(searchText.trim());
          setResults(cards);
        } catch {
          setResults([]);
        }
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.error("Search failed:", e);
      try {
        const { cards } = await searchCards(searchText.trim());
        setResults(cards);
      } catch {
        Alert.alert("Search Error", "Failed to search for cards. Please try again.");
      }
    } finally {
      setIsSearching(false);
    }
  }, [searchText]);

  const processImageFromBase64 = useCallback(async (uri: string, base64Data: string | null | undefined) => {
    setCapturedImage(uri);
    setIsIdentifying(true);
    setIdentifyError(null);
    setIdentification(null);
    setPcvResults([]);
    setTcgApiResults([]);
    setResults([]);
    setHasSearched(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let base64: string;
      if (base64Data) {
        // ImagePicker already returned base64 directly — use it
        base64 = base64Data.startsWith("data:") ? base64Data : `data:image/jpeg;base64,${base64Data}`;
      } else if (Platform.OS === "web") {
        // Web: fetch the blob and convert to data URL
        const response = await fetch(uri);
        const blob = await response.blob();
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // Native fallback: read via FileSystem legacy
        const fileBase64 = await FileSystem.readAsStringAsync(uri, {
          encoding: "base64" as any,
        });
        base64 = `data:image/jpeg;base64,${fileBase64}`;
      }

      const result = await identifyCard(base64);
      setIdentification(result.identification);
      setPcvResults(result.pcvResults || []);
      setTcgApiResults(result.tcgApiResults || []);
      setSearchText(result.identification.englishName);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refreshQuota();
    } catch (e: any) {
      console.error("Identification failed:", e);
      if (e.isQuotaExceeded) {
        setIsQuotaExceeded(true);
        setCapturedImage(null);
        refreshQuota();
      } else {
        setIdentifyError(e.message || "Failed to identify card");
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsIdentifying(false);
    }
  }, [refreshQuota]);

  const handleCameraCapture = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera access is needed to scan cards.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.85,
        allowsEditing: true,
        aspect: [3, 4],
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        processImageFromBase64(result.assets[0].uri, result.assets[0].base64);
      }
    } catch (e) {
      console.error("Camera error:", e);
    }
  }, [processImageFromBase64]);

  const handleGallery = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.85,
        allowsEditing: true,
        aspect: [3, 4],
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        processImageFromBase64(result.assets[0].uri, result.assets[0].base64);
      }
    } catch (e) {
      console.error("Gallery error:", e);
    }
  }, [processImageFromBase64]);

  const handleEbayListings = useCallback((name: string, setName?: string, number?: string) => {
    const url = generateEbaySearchUrl(name, setName, number);
    Linking.openURL(url);
  }, []);

  const handleEbaySold = useCallback((name: string, setName?: string, number?: string) => {
    const url = generateEbaySoldUrl(name, setName, number);
    Linking.openURL(url);
  }, []);

  const clearAll = useCallback(() => {
    setCapturedImage(null);
    setIdentification(null);
    setPcvResults([]);
    setTcgApiResults([]);
    setIdentifyError(null);
    setIsQuotaExceeded(false);
    setResults([]);
    setHasSearched(false);
    setSearchText("");
  }, []);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const renderHeader = () => (
    <>
      {/* ── Quota exceeded card ── */}
      {isQuotaExceeded && !isIdentifying && (
        <View style={[styles.quotaCard, { backgroundColor: colors.card, borderColor: colors.pokemonYellow + "80" }]}>
          <LinearGradient colors={[colors.pokemonYellow + "18", "transparent"]} style={styles.quotaCardGrad} />
          <View style={[styles.quotaIconBg, { backgroundColor: colors.pokemonYellow + "25" }]}>
            <MaterialCommunityIcons name="pokeball" size={28} color={colors.pokemonYellow} />
          </View>
          <Text style={[styles.quotaTitle, { color: colors.text }]}>Daily Scans Used Up</Text>
          <Text style={[styles.quotaDesc, { color: colors.textSecondary }]}>
            You've used all your scans for today. Come back tomorrow for 25 more, or go Premium for unlimited scanning.
          </Text>
          <View style={styles.quotaBtns}>
            <Pressable
              style={[styles.quotaPremBtn, { backgroundColor: colors.pokemonYellow }]}
              onPress={() => router.push("/premium")}
            >
              <Ionicons name="star" size={15} color="#1A1A2E" />
              <Text style={[styles.quotaPremBtnText, { color: "#1A1A2E" }]}>Go Premium</Text>
            </Pressable>
            <Pressable style={[styles.quotaDismissBtn, { borderColor: colors.borderLight }]} onPress={clearAll}>
              <Text style={[styles.quotaDismissText, { color: colors.textMuted }]}>Dismiss</Text>
            </Pressable>
          </View>
        </View>
      )}

      {capturedImage && !isQuotaExceeded && (
        <View style={[styles.capturedPreview, { borderColor: colors.pokemonRed + "60" }]}>
          <Image source={{ uri: capturedImage }} style={styles.capturedImage} contentFit="contain" />
          <Pressable
            style={[styles.clearCapture, { backgroundColor: colors.pokemonRed }]}
            onPress={clearAll}
          >
            <Ionicons name="close" size={16} color="#FFF" />
          </Pressable>
        </View>
      )}

      {isIdentifying && (
        <View style={[styles.identifyingCard, { backgroundColor: colors.card, borderColor: colors.pokemonRed + "40" }]}>
          <MaterialCommunityIcons name="pokeball" size={28} color={colors.pokemonRed} />
          <Text style={[styles.identifyingText, { color: colors.text }]}>
            AI is analysing your card...
          </Text>
          <Text style={[styles.identifyingSubtext, { color: colors.textMuted }]}>
            Works with English, Japanese, Korean & Chinese cards
          </Text>
        </View>
      )}

      {identifyError && !isIdentifying && !isQuotaExceeded && (
        <View style={[styles.errorCard, { backgroundColor: colors.card, borderColor: colors.error }]}>
          <Ionicons name="alert-circle" size={20} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{identifyError}</Text>
          <Pressable onPress={clearAll}>
            <Text style={[styles.retryText, { color: colors.pokemonRed }]}>Try again</Text>
          </Pressable>
        </View>
      )}

      {identification && !isIdentifying && (identification.confidence === "low" || identification.confidence === "medium") && (
        <View style={[styles.retakeBanner, { backgroundColor: colors.card, borderColor: colors.pokemonYellow + "80" }]}>
          <View style={styles.retakeBannerHeader}>
            <Ionicons name="warning" size={18} color={colors.pokemonYellow} />
            <Text style={[styles.retakeBannerTitle, { color: colors.text }]}>
              {identification.confidence === "low" ? "Could not read card clearly" : "Low confidence result"}
            </Text>
          </View>
          <Text style={[styles.retakeBannerSubtitle, { color: colors.textSecondary }]}>
            For a better result:
          </Text>
          <View style={styles.retakeTipsList}>
            <Text style={[styles.retakeTip, { color: colors.textMuted }]}>
              · Fill the frame — the card should take up at least 80% of the photo
            </Text>
            <Text style={[styles.retakeTip, { color: colors.textMuted }]}>
              · Use even lighting with no glare or shadows across the card
            </Text>
            <Text style={[styles.retakeTip, { color: colors.textMuted }]}>
              · Hold steady and keep the phone parallel to the card (not angled)
            </Text>
          </View>
          <Pressable
            style={[styles.retakeBtn, { backgroundColor: colors.pokemonRed }]}
            onPress={() => { clearAll(); }}
          >
            <Ionicons name="camera" size={15} color="#FFF" />
            <Text style={styles.retakeBtnText}>Retake Photo</Text>
          </Pressable>
        </View>
      )}

      {identification && !isIdentifying && (
        <>
          {tcgApiResults.length > 0 ? (
            // ── DB match found: AI context card + full database card with price + eBay ──
            <>
              <IdentificationCard identification={identification} colors={colors} />
              <DatabaseMatchCard
                card={tcgApiResults[0]}
                pcvCard={pcvResults[0] || null}
                identification={identification}
                colors={colors}
                onEbayListings={() => handleEbayListings(identification.englishName, identification.setName, identification.cardNumber)}
                onEbaySold={() => handleEbaySold(identification.englishName, identification.setName, identification.cardNumber)}
              />
            </>
          ) : identification.englishName ? (
            // ── No DB match: rich AI result card with price + eBay links ──
            <AIPriceCard
              identification={identification}
              pcvResults={pcvResults}
              colors={colors}
              onEbayListings={() => handleEbayListings(identification.englishName, identification.setName, identification.cardNumber)}
              onEbaySold={() => handleEbaySold(identification.englishName, identification.setName, identification.cardNumber)}
            />
          ) : (
            // ── Could not identify ──
            <IdentificationCard identification={identification} colors={colors} />
          )}
        </>
      )}

      {pcvResults.length > 1 && (
        <View style={styles.resultsHeaderRow}>
          <View style={[styles.resultsHeaderDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {tcgApiResults.length > 0 ? `UK Price Variants (${pcvResults.length})` : `All UK Price Variants (${pcvResults.length})`}
          </Text>
        </View>
      )}
    </>
  );

  const hasIdentifiedResults = pcvResults.length > 0 || (tcgApiResults.length > 0 && !!identification);
  const allSearchShown = results.length > 0 && !hasIdentifiedResults;

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PokeBackground opacity={colorScheme === "dark" ? 0.18 : 0.12} />
        <View style={[authGateStyles.wrapper, { paddingTop: insets.top + 20 }]}>
          <LinearGradient
            colors={colorScheme === "dark" ? ["#1A1A2E", "#0A1A2A"] : ["#EFF6FF", "#F5F5F5"]}
            style={authGateStyles.inner}
          >
            <View style={[authGateStyles.iconRing, { backgroundColor: colors.pokemonRed + "20", borderColor: colors.pokemonRed + "40" }]}>
              <MaterialCommunityIcons name="line-scan" size={48} color={colors.pokemonRed} />
            </View>
            <Text style={[authGateStyles.title, { color: colors.text }]}>Sign in to Scan</Text>
            <Text style={[authGateStyles.body, { color: colors.textMuted }]}>
              Create a free account to scan and identify Pokémon cards with AI, track prices, and build your collection.
            </Text>
            <Pressable
              style={[authGateStyles.primaryBtn, { backgroundColor: colors.pokemonRed }]}
              onPress={() => router.push("/register")}
            >
              <Text style={authGateStyles.primaryBtnText}>Create Account</Text>
            </Pressable>
            <Pressable
              style={[authGateStyles.secondaryBtn, { borderColor: colors.border }]}
              onPress={() => router.push("/login")}
            >
              <Text style={[authGateStyles.secondaryBtnText, { color: colors.text }]}>Sign In</Text>
            </Pressable>
          </LinearGradient>
        </View>
      </View>
    );
  }

  if (!scannerEnabled) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PokeBackground opacity={colorScheme === "dark" ? 0.18 : 0.12} />
        <View style={[authGateStyles.wrapper, { paddingTop: insets.top + 20 }]}>
          <LinearGradient
            colors={colorScheme === "dark" ? ["#1A1A2E", "#0A1A2A"] : ["#EFF6FF", "#F5F5F5"]}
            style={authGateStyles.inner}
          >
            <View style={[authGateStyles.iconRing, { backgroundColor: colors.pokemonYellow + "20", borderColor: colors.pokemonYellow + "40" }]}>
              <MaterialCommunityIcons name="line-scan" size={48} color={colors.pokemonYellow} />
            </View>
            <Text style={[authGateStyles.title, { color: colors.text }]}>Scanner Temporarily Unavailable</Text>
            <Text style={[authGateStyles.body, { color: colors.textMuted }]}>
              Card scanning has been temporarily paused by the team. You can still browse sets, manage your collection, and use the marketplace. Please check back soon.
            </Text>
          </LinearGradient>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PokeBackground opacity={colorScheme === "dark" ? 0.18 : 0.12} />
      {/* ── Streak notification modal ── */}
      <Modal
        visible={!!streakModal}
        transparent
        animationType="fade"
        onRequestClose={() => setStreakModal(null)}
      >
        <Pressable style={streakStyles.overlay} onPress={() => setStreakModal(null)}>
          <Pressable style={[streakStyles.card, { backgroundColor: colors.card }]} onPress={() => {}}>
            <LinearGradient colors={["#FFDE0030", "transparent"]} style={streakStyles.grad} />
            <Text style={streakStyles.fireEmoji}>{streakModal?.day === 7 ? "🏆" : "🔥"}</Text>
            <Text style={[streakStyles.title, { color: colors.text }]}>
              {streakModal?.day === 7 ? "7-Day Streak Complete!" : `Day ${streakModal?.day} Streak!`}
            </Text>
            <Text style={[streakStyles.bonus, { color: colors.pokemonYellow }]}>
              +{streakModal?.bonus} bonus scans earned
            </Text>
            <Text style={[streakStyles.desc, { color: colors.textSecondary }]}>
              {streakModal?.day === 7
                ? "You completed a full 7-day streak! Your bonus scans are valid for 7 days. Keep it up!"
                : `Come back tomorrow to continue your streak. Bonus scans expire in 7 days.`}
            </Text>
            {streakModal?.reset && (
              <Text style={[streakStyles.resetNote, { color: colors.textMuted }]}>
                Your streak was reset — missed a day. Your existing bonus scans are still safe though!
              </Text>
            )}
            <Pressable
              style={[streakStyles.btn, { backgroundColor: colors.pokemonYellow }]}
              onPress={() => setStreakModal(null)}
            >
              <Text style={streakStyles.btnText}>Let's Scan!</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <LinearGradient
        colors={colorScheme === "dark" ? ["#2A0A0A", "#1A1A2E"] : ["#FFF0F0", "#F5F5F5"]}
        style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}
      >
        <View style={styles.titleRow}>
          <Ionicons name="scan" size={22} color={colors.pokemonRed} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>Card Scanner</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              AI-powered card identification
            </Text>
          </View>
          {!isPremium && scanQuota && (
            <Pressable
              style={[styles.scanQuotaPill, {
                backgroundColor: scanQuota.totalRemaining <= 5
                  ? colors.error + "20"
                  : colors.surface,
                borderColor: scanQuota.totalRemaining <= 5
                  ? colors.error
                  : colors.borderLight,
              }]}
              onPress={() => router.push("/premium")}
            >
              <MaterialCommunityIcons
                name="camera-outline"
                size={13}
                color={scanQuota.totalRemaining <= 5 ? colors.error : colors.textMuted}
              />
              <Text style={[styles.scanQuotaText, {
                color: scanQuota.totalRemaining <= 5 ? colors.error : colors.textMuted,
              }]}>
                {scanQuota.totalRemaining} left
              </Text>
              {scanQuota.bonusScansAvailable > 0 && (
                <View style={[styles.bonusDot, { backgroundColor: colors.pokemonYellow }]} />
              )}
            </Pressable>
          )}
          {isPremium && (
            <View style={[styles.scanQuotaPill, { backgroundColor: colors.pokemonYellow + "20", borderColor: colors.pokemonYellow }]}>
              <Ionicons name="star" size={13} color={colors.pokemonYellow} />
              <Text style={[styles.scanQuotaText, { color: colors.pokemonYellow }]}>Unlimited</Text>
            </View>
          )}
          <Image
            source={{ uri: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/479.png" }}
            style={styles.rotomMascot}
            contentFit="contain"
          />
        </View>
      </LinearGradient>

      {/* Mode toggle: Identify / Grade */}
      <View style={[styles.modeToggle, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <Pressable
          style={[styles.modeBtn, mode === "identify" && { backgroundColor: colors.pokemonRed }]}
          onPress={() => setMode("identify")}
        >
          <Ionicons name="scan" size={16} color={mode === "identify" ? "#FFF" : colors.textMuted} />
          <Text style={[styles.modeBtnText, { color: mode === "identify" ? "#FFF" : colors.textMuted }]}>Identify</Text>
        </Pressable>
        <Pressable
          style={[styles.modeBtn, mode === "grade" && { backgroundColor: colors.pokemonRed }]}
          onPress={handleSwitchToGrade}
        >
          <MaterialCommunityIcons name="certificate-outline" size={16} color={mode === "grade" ? "#FFF" : colors.textMuted} />
          <Text style={[styles.modeBtnText, { color: mode === "grade" ? "#FFF" : colors.textMuted }]}>Grade</Text>
          {!isPremium && <Ionicons name="lock-closed" size={11} color={mode === "grade" ? "#FFF" : colors.pokemonYellow} />}
        </Pressable>
      </View>

      {mode === "identify" && (
        <View style={styles.scanSection}>
          <View style={styles.scanButtons}>
            <Pressable
              style={({ pressed }) => [styles.scanButton, { opacity: pressed ? 0.85 : 1 }]}
              onPress={handleCameraCapture}
            >
              <LinearGradient
                colors={["#CC0000", "#8B0000"]}
                style={styles.scanButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="camera" size={24} color="#FFF" />
                <Text style={styles.scanButtonText}>Scan Card</Text>
              </LinearGradient>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.scanButton, { opacity: pressed ? 0.85 : 1 }]}
              onPress={handleGallery}
            >
              <View style={[styles.scanButtonGradient, { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.borderLight }]}>
                <Ionicons name="images" size={24} color={colors.text} />
                <Text style={[styles.scanButtonText, { color: colors.text }]}>Gallery</Text>
              </View>
            </Pressable>
          </View>

          {!capturedImage && !identification && (
            <View style={[styles.alignmentGuide, { borderColor: colors.pokemonRed + "50", backgroundColor: colors.surface }]}>
              <View style={styles.alignmentFrame}>
                <View style={[styles.alignCorner, styles.alignTL, { borderColor: colors.pokemonRed }]} />
                <View style={[styles.alignCorner, styles.alignTR, { borderColor: colors.pokemonRed }]} />
                <View style={[styles.alignCorner, styles.alignBL, { borderColor: colors.pokemonRed }]} />
                <View style={[styles.alignCorner, styles.alignBR, { borderColor: colors.pokemonRed }]} />
                <View style={styles.alignInner}>
                  <MaterialCommunityIcons name="card-outline" size={28} color={colors.pokemonRed + "60"} />
                  <Text style={[styles.alignLabel, { color: colors.textMuted }]}>Align card within the frame</Text>
                  <Text style={[styles.alignSub, { color: colors.textMuted + "90" }]}>Fill the frame · Good lighting · Hold steady</Text>
                </View>
              </View>
            </View>
          )}

          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.pokemonRed + "40" }]}>
            <Ionicons name="search" size={18} color={colors.pokemonRed} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Or type card name..."
              placeholderTextColor={colors.textMuted}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <Pressable onPress={clearAll}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            )}
            <Pressable
              style={[styles.searchSubmit, { backgroundColor: colors.pokemonRed }]}
              onPress={handleSearch}
            >
              <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </Pressable>
          </View>
        </View>
      )}

      {mode === "grade" ? (
        <GradingTool colors={colors} isPremium={isPremium} />
      ) : isSearching ? (
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="pokeball" size={40} color={colors.pokemonRed} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Searching...</Text>
        </View>
      ) : hasIdentifiedResults && pcvResults.length > 0 ? (
        <FlatList
          data={pcvResults}
          renderItem={({ item }) => <PCVResultCard card={item} colors={colors} />}
          keyExtractor={(item, i) => `${item.url}-${i}`}
          contentContainerStyle={[styles.resultsList, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
        />
      ) : hasIdentifiedResults && tcgApiResults.length > 1 ? (
        <FlatList
          data={tcgApiResults.slice(1)}
          renderItem={({ item }) => <SearchResultCard card={item} colors={colors} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.resultsList, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <>
              {renderHeader()}
              <View style={styles.resultsHeaderRow}>
                <View style={[styles.resultsHeaderDot, { backgroundColor: colors.pokemonBlue }]} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Other Versions ({tcgApiResults.length - 1})
                </Text>
              </View>
            </>
          )}
        />
      ) : hasIdentifiedResults ? (
        <FlatList
          data={[]}
          renderItem={() => null}
          contentContainerStyle={[styles.resultsList, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
        />
      ) : allSearchShown ? (
        <FlatList
          data={results}
          renderItem={({ item }) => <SearchResultCard card={item} colors={colors} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.resultsList, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={[]}
          renderItem={() => null}
          contentContainerStyle={[styles.resultsList, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            hasSearched ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No cards found</Text>
              </View>
            ) : !capturedImage && !identification ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="pokeball" size={64} color={colors.pokemonRed + "40"} />
                <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                  Scan Any Card
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                  Take a photo or pick from gallery. AI identifies the card name, set & number automatically
                </Text>
                <View style={styles.languageRow}>
                  {["English", "Japanese", "Korean", "Chinese"].map((lang) => (
                    <View key={lang} style={[styles.langBadge, { backgroundColor: colors.pokemonRed + "15", borderColor: colors.pokemonRed + "30", borderWidth: 1 }]}>
                      <Text style={[styles.langText, { color: colors.pokemonRed }]}>{lang}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  title: { fontSize: 28, fontFamily: "Outfit_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Outfit_400Regular", marginTop: 2 },
  rotomMascot: { width: 64, height: 64 },
  scanSection: { paddingHorizontal: 20, gap: 12, paddingBottom: 8 },
  scanButtons: { flexDirection: "row", gap: 12 },
  scanButton: {
    flex: 1,
  },
  scanButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  scanButtonText: { fontSize: 14, fontFamily: "Outfit_600SemiBold", color: "#FFF" },
  capturedPreview: {
    height: 200,
    borderRadius: 14,
    borderWidth: 2,
    overflow: "hidden",
    marginBottom: 8,
  },
  capturedImage: { width: "100%", height: "100%" },
  clearCapture: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Outfit_400Regular", padding: 0 },
  searchSubmit: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  identifyingCard: {
    borderRadius: 14,
    padding: 20,
    borderWidth: 1.5,
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  identifyingText: { fontSize: 15, fontFamily: "Outfit_600SemiBold" },
  identifyingSubtext: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  errorCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Outfit_500Medium" },
  retryText: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  idCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    gap: 8,
    marginBottom: 8,
    overflow: "hidden",
  },
  idGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  idHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  aiIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  idTitle: { flex: 1, fontSize: 15, fontFamily: "Outfit_700Bold" },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  confidenceText: { fontSize: 11, fontFamily: "Outfit_700Bold", color: "#FFF", textTransform: "uppercase" },
  idRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  idLabel: { fontSize: 13, fontFamily: "Outfit_400Regular" },
  idValue: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  idDetailsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  idTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  idTagText: { fontSize: 11, fontFamily: "Outfit_600SemiBold" },
  idNotes: { fontSize: 12, fontFamily: "Outfit_400Regular", fontStyle: "italic", marginTop: 4 },
  ebaySection: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  ebaySectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  ebaySectionTitle: { fontSize: 14, fontFamily: "Outfit_700Bold" },
  ebaySectionDesc: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  ebayBtns: { flexDirection: "row", gap: 8 },
  ebayBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  ebayBtnText: { fontSize: 12, fontFamily: "Outfit_600SemiBold", color: "#FFF" },
  resultsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  resultsHeaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: { fontSize: 16, fontFamily: "Outfit_700Bold" },
  resultsList: { paddingHorizontal: 20, paddingTop: 8 },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    gap: 10,
  },
  resultImage: { width: 40, height: 56, borderRadius: 6 },
  resultInfo: { flex: 1, gap: 2 },
  resultMeta: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  resultName: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  resultSet: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  resultRarity: { fontSize: 11, fontFamily: "Outfit_500Medium" },
  resultPrice: { fontSize: 14, fontFamily: "Outfit_700Bold" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "Outfit_500Medium" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 40, gap: 10 },
  emptyTitle: { fontSize: 20, fontFamily: "Outfit_700Bold" },
  emptyText: { fontSize: 16, fontFamily: "Outfit_500Medium" },
  emptySubtext: { fontSize: 13, fontFamily: "Outfit_400Regular", textAlign: "center", paddingHorizontal: 32 },
  languageRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 8 },
  langBadge: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  langText: { fontSize: 12, fontFamily: "Outfit_600SemiBold" },
  modeToggle: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  modeBtnText: { fontSize: 14, fontFamily: "Outfit_700Bold" },
  scanQuotaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
  },
  scanQuotaText: { fontSize: 12, fontFamily: "Outfit_700Bold" },
  bonusDot: { width: 6, height: 6, borderRadius: 3 },
  quotaCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 20,
    gap: 10,
    alignItems: "center",
    overflow: "hidden",
  },
  quotaCardGrad: { position: "absolute", top: 0, left: 0, right: 0, height: 80 },
  quotaIconBg: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  quotaTitle: { fontSize: 18, fontFamily: "Outfit_700Bold", textAlign: "center" },
  quotaDesc: { fontSize: 13, fontFamily: "Outfit_400Regular", textAlign: "center", lineHeight: 19 },
  quotaBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  quotaPremBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12 },
  quotaPremBtnText: { fontSize: 14, fontFamily: "Outfit_700Bold" },
  quotaDismissBtn: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12, borderWidth: 1 },
  quotaDismissText: { fontSize: 14, fontFamily: "Outfit_500Medium" },
  retakeBanner: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    gap: 8,
    marginBottom: 10,
  },
  retakeBannerHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  retakeBannerTitle: { fontSize: 14, fontFamily: "Outfit_700Bold", flex: 1 },
  retakeBannerSubtitle: { fontSize: 12, fontFamily: "Outfit_600SemiBold" },
  retakeTipsList: { gap: 4 },
  retakeTip: { fontSize: 12, fontFamily: "Outfit_400Regular", lineHeight: 18 },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 2,
  },
  retakeBtnText: { fontSize: 13, fontFamily: "Outfit_700Bold", color: "#FFF" },
  alignmentGuide: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  alignmentFrame: {
    position: "relative",
    height: 100,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  alignCorner: {
    position: "absolute",
    width: 16,
    height: 16,
    borderWidth: 2,
  },
  alignTL: { top: 4, left: 4, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  alignTR: { top: 4, right: 4, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  alignBL: { bottom: 4, left: 4, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  alignBR: { bottom: 4, right: 4, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  alignInner: { alignItems: "center", gap: 4 },
  alignLabel: { fontSize: 12, fontFamily: "Outfit_600SemiBold", textAlign: "center" },
  alignSub: { fontSize: 11, fontFamily: "Outfit_400Regular", textAlign: "center" },
});

const streakStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", borderRadius: 24, padding: 28, alignItems: "center", gap: 10, overflow: "hidden" },
  grad: { position: "absolute", top: 0, left: 0, right: 0, height: 100 },
  fireEmoji: { fontSize: 48 },
  title: { fontSize: 22, fontFamily: "Outfit_700Bold", textAlign: "center" },
  bonus: { fontSize: 20, fontFamily: "Outfit_700Bold" },
  desc: { fontSize: 14, fontFamily: "Outfit_400Regular", textAlign: "center", lineHeight: 20 },
  resetNote: { fontSize: 12, fontFamily: "Outfit_400Regular", textAlign: "center", fontStyle: "italic" },
  btn: { marginTop: 8, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  btnText: { fontSize: 16, fontFamily: "Outfit_700Bold", color: "#1A1A2E" },
});

const authGateStyles = StyleSheet.create({
  wrapper: { flex: 1, justifyContent: "center", alignItems: "center", padding: 28 },
  inner: { width: "100%", borderRadius: 28, padding: 32, alignItems: "center", gap: 16 },
  iconRing: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 2, justifyContent: "center", alignItems: "center", marginBottom: 4,
  },
  title: { fontSize: 26, fontFamily: "Outfit_700Bold", textAlign: "center" },
  body: { fontSize: 14, fontFamily: "Outfit_400Regular", textAlign: "center", lineHeight: 22, opacity: 0.8 },
  primaryBtn: {
    width: "100%", paddingVertical: 16, borderRadius: 16,
    alignItems: "center", marginTop: 4,
  },
  primaryBtnText: { fontSize: 16, fontFamily: "Outfit_700Bold", color: "#FFF" },
  secondaryBtn: {
    width: "100%", paddingVertical: 14, borderRadius: 16,
    alignItems: "center", borderWidth: 1.5,
  },
  secondaryBtnText: { fontSize: 16, fontFamily: "Outfit_600SemiBold" },
});
