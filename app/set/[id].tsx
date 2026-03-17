import React, { useCallback, useState, useEffect } from "react";
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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/constants/colors";
import { fetchSetCards, PokemonCard, getUKPrice, formatGBP } from "@/lib/pokemon-api";

const SCREEN_WIDTH = Dimensions.get("window").width;
const NUM_COLS = 3;
const H_PAD = 12;
const GAP = 6;
const CARD_WIDTH = (SCREEN_WIDTH - H_PAD * 2 - GAP * (NUM_COLS - 1)) / NUM_COLS;
const CARD_IMG_HEIGHT = CARD_WIDTH * 1.4;

function CardGridItem({
  card,
  colors,
}: {
  card: PokemonCard;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const priceData = getUKPrice(card);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.gridItem,
        {
          backgroundColor: colors.card,
          borderColor: colors.borderLight,
          width: CARD_WIDTH,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
      onPress={() => router.push({ pathname: "/card/[id]", params: { id: card.id } })}
    >
      <Image
        source={{ uri: card.images?.small || "" }}
        style={[styles.gridImage, { height: CARD_IMG_HEIGHT, width: CARD_WIDTH }]}
        contentFit="contain"
        placeholder={{ color: colors.surface }}
        transition={200}
      />
      <View style={styles.gridInfo}>
        <Text style={[styles.gridName, { color: colors.text }]} numberOfLines={2}>
          {card.name}
        </Text>
        <Text style={[styles.gridNumber, { color: colors.textMuted }]}>#{card.number}</Text>
        {priceData.price ? (
          <Text style={[styles.gridPrice, { color: colors.success }]}>
            {formatGBP(priceData.price)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function SetDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();

  const [allCards, setAllCards] = useState<PokemonCard[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setAllCards([]);
    setPage(1);
    fetchSetCards(id as string, 1)
      .then((result) => {
        if (cancelled) return;
        setAllCards(result.cards);
        setTotalCount(result.totalCount);
        setHasMore(result.cards.length < result.totalCount);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || isLoading) return;
    setIsLoadingMore(true);
    const nextPage = page + 1;
    try {
      const result = await fetchSetCards(id as string, nextPage);
      setAllCards((prev) => {
        const newCards = [...prev, ...result.cards];
        setHasMore(newCards.length < result.totalCount);
        return newCards;
      });
      setPage(nextPage);
    } catch {}
    finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, isLoading, page, id]);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const loaded = allCards.length;

  const renderItem = useCallback(
    ({ item }: { item: PokemonCard }) => <CardGridItem card={item} colors={colors} />,
    [colors]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={colorScheme === "dark" ? ["#2A0A0A", "#1A1A2E"] : ["#FFF0F0", "#F5F5F5"]}
        style={[styles.header, { paddingTop: (insets.top || webTopInset) + 4 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {name || "Set"}
            </Text>
            <View style={styles.headerMeta}>
              <View style={styles.headerMetaItem}>
                <MaterialCommunityIcons name="cards-outline" size={13} color={colors.pokemonRed} />
                <Text style={[styles.headerCount, { color: colors.textSecondary }]}>
                  {loaded}{totalCount > 0 ? `/${totalCount}` : ""} cards
                </Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="pokeball" size={40} color={colors.pokemonRed} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading cards...</Text>
        </View>
      ) : (
        <FlatList
          data={allCards}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLS}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[styles.listContent, { paddingBottom: 40 }]}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={colors.pokemonRed} />
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                  Loading more...
                </Text>
              </View>
            ) : hasMore ? (
              <Pressable
                style={[styles.loadMoreBtn, { borderColor: colors.pokemonRed + "60" }]}
                onPress={loadMore}
              >
                <Text style={[styles.loadMoreText, { color: colors.pokemonRed }]}>
                  Load More ({totalCount - loaded} remaining)
                </Text>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="cards-outline" size={48} color={colors.textMuted} />
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
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 20, fontFamily: "Outfit_700Bold" },
  headerMeta: { flexDirection: "row", gap: 16, alignItems: "center", marginTop: 3 },
  headerMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerCount: { fontSize: 13, fontFamily: "Outfit_500Medium" },
  listContent: { paddingHorizontal: H_PAD, paddingTop: 10 },
  gridRow: { gap: GAP, marginBottom: GAP },
  gridItem: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  gridImage: {
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
  },
  gridInfo: {
    padding: 6,
    gap: 1,
  },
  gridName: {
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
    lineHeight: 14,
  },
  gridNumber: {
    fontSize: 10,
    fontFamily: "Outfit_400Regular",
  },
  gridPrice: {
    fontSize: 11,
    fontFamily: "Outfit_700Bold",
    marginTop: 2,
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "Outfit_500Medium" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Outfit_500Medium" },
  footerLoader: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  footerText: { fontSize: 13, fontFamily: "Outfit_400Regular" },
  loadMoreBtn: {
    margin: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
  },
  loadMoreText: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
});
