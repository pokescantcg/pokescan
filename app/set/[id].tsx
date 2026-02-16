import React, { useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  useColorScheme,
  Platform,
  ActivityIndicator,
  Dimensions,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useThemeColors } from "@/constants/colors";
import { fetchPCVSetCards, PCVCard, formatGBP } from "@/lib/pokemon-api";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = (SCREEN_WIDTH - 60) / 2;

function CardListItem({ card, colors }: { card: PCVCard; colors: ReturnType<typeof useThemeColors> }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.cardItem,
        { backgroundColor: colors.card, borderColor: colors.borderLight, opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={() => {
        if (card.url) Linking.openURL(card.url);
      }}
    >
      <View style={styles.cardInfo}>
        <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
          {card.name}
        </Text>
        {card.number ? (
          <Text style={[styles.cardNumber, { color: colors.textMuted }]}>
            #{card.number}
          </Text>
        ) : null}
        <View style={styles.cardMeta}>
          {card.holoType ? (
            <View style={[styles.chip, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.chipText, { color: colors.textSecondary }]}>{card.holoType}</Text>
            </View>
          ) : null}
          {card.rarity ? (
            <View style={[styles.chip, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.chipText, { color: colors.gold }]}>{card.rarity}</Text>
            </View>
          ) : null}
          {card.edition && card.edition !== "Unlimited" ? (
            <View style={[styles.chip, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.chipText, { color: colors.accent }]}>{card.edition}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.priceCol}>
        {card.priceGBP !== null ? (
          <Text style={[styles.price, { color: colors.success }]}>
            {formatGBP(card.priceGBP)}
          </Text>
        ) : (
          <Text style={[styles.price, { color: colors.textMuted }]}>N/A</Text>
        )}
        <Text style={[styles.priceLabel, { color: colors.textMuted }]}>NM/M</Text>
      </View>
      <Ionicons name="open-outline" size={14} color={colors.textMuted} />
    </Pressable>
  );
}

export default function SetDetailScreen() {
  const { id, slug, name } = useLocalSearchParams<{ id: string; slug: string; name: string }>();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();

  const { isLoading, data: cards } = useQuery({
    queryKey: ["pcv-set-cards", id, slug],
    queryFn: () => fetchPCVSetCards(id, slug),
    staleTime: 1000 * 60 * 30,
  });

  const totalCount = cards?.length || 0;
  const totalValue = cards?.reduce((sum, c) => sum + (c.priceGBP || 0), 0) || 0;
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const renderItem = useCallback(
    ({ item }: { item: PCVCard }) => <CardListItem card={item} colors={colors} />,
    [colors]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: (insets.top || webTopInset) + 4 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {name || "Set"}
            </Text>
            <View style={styles.headerMeta}>
              <Text style={[styles.headerCount, { color: colors.textSecondary }]}>
                {totalCount} cards
              </Text>
              {totalValue > 0 ? (
                <Text style={[styles.headerValue, { color: colors.success }]}>
                  Set value: {formatGBP(totalValue)}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading UK prices...</Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.name}-${item.number}-${item.holoType}-${item.edition}-${index}`}
          contentContainerStyle={[styles.listContent, { paddingBottom: 40 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="albums-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No cards found for this set
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 22, fontFamily: "Outfit_700Bold" },
  headerMeta: { flexDirection: "row", gap: 12, alignItems: "center", marginTop: 2 },
  headerCount: { fontSize: 13, fontFamily: "Outfit_400Regular" },
  headerValue: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  listContent: { paddingHorizontal: 16 },
  cardItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    gap: 12,
  },
  cardInfo: { flex: 1, gap: 2 },
  cardName: { fontSize: 15, fontFamily: "Outfit_600SemiBold" },
  cardNumber: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  cardMeta: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  chipText: { fontSize: 10, fontFamily: "Outfit_500Medium" },
  priceCol: { alignItems: "flex-end", gap: 2 },
  price: { fontSize: 15, fontFamily: "Outfit_700Bold" },
  priceLabel: { fontSize: 10, fontFamily: "Outfit_400Regular" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "Outfit_400Regular" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Outfit_500Medium" },
});
