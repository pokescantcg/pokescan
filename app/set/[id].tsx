import React, { useState, useCallback } from "react";
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
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useThemeColors } from "@/constants/colors";
import { fetchSetCards, PokemonCard, getUKPrice, formatGBP } from "@/lib/pokemon-api";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = (SCREEN_WIDTH - 60) / 3;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

function CardGridItem({ card, colors }: { card: PokemonCard; colors: ReturnType<typeof useThemeColors> }) {
  const priceData = getUKPrice(card);
  return (
    <Pressable
      style={({ pressed }) => [styles.gridCard, { opacity: pressed ? 0.85 : 1 }]}
      onPress={() => router.push({ pathname: "/card/[id]", params: { id: card.id } })}
    >
      <Image source={{ uri: card.images.small }} style={styles.gridImage} contentFit="contain" />
      <Text style={[styles.gridName, { color: colors.text }]} numberOfLines={1}>
        {card.name}
      </Text>
      <Text style={[styles.gridNumber, { color: colors.textMuted }]}>#{card.number}</Text>
      {priceData.price !== null && (
        <Text style={[styles.gridPrice, { color: colors.success }]}>
          {formatGBP(priceData.price)}
        </Text>
      )}
    </Pressable>
  );
}

export default function SetDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(1);
  const [allCards, setAllCards] = useState<PokemonCard[]>([]);

  const { isLoading, data } = useQuery({
    queryKey: ["set-cards", id, page],
    queryFn: () => fetchSetCards(id, page),
    staleTime: 1000 * 60 * 30,
  });

  const cards = data?.cards || [];
  const totalCount = data?.totalCount || 0;

  const displayCards = page === 1 ? cards : [...allCards, ...cards];

  const loadMore = useCallback(() => {
    if (displayCards.length < totalCount && !isLoading) {
      setAllCards(displayCards);
      setPage((p) => p + 1);
    }
  }, [displayCards, totalCount, isLoading]);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

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
            <Text style={[styles.headerCount, { color: colors.textSecondary }]}>
              {totalCount} cards
            </Text>
          </View>
        </View>
      </View>

      {isLoading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading cards...</Text>
        </View>
      ) : (
        <FlatList
          data={displayCards}
          renderItem={({ item }) => <CardGridItem card={item} colors={colors} />}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={[styles.gridContent, { paddingBottom: 40 }]}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isLoading && page > 1 ? (
              <ActivityIndicator size="small" color={colors.gold} style={{ marginVertical: 20 }} />
            ) : null
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
  headerCount: { fontSize: 13, fontFamily: "Outfit_400Regular" },
  gridContent: { paddingHorizontal: 20 },
  gridRow: { gap: 10, marginBottom: 12 },
  gridCard: {
    width: CARD_WIDTH,
    alignItems: "center",
    gap: 4,
  },
  gridImage: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 8,
  },
  gridName: { fontSize: 12, fontFamily: "Outfit_600SemiBold", textAlign: "center" },
  gridNumber: { fontSize: 10, fontFamily: "Outfit_400Regular" },
  gridPrice: { fontSize: 11, fontFamily: "Outfit_700Bold" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "Outfit_400Regular" },
});
