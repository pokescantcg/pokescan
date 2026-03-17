import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  useColorScheme,
  Platform,
  Alert,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/constants/colors";
import { fetchPCVSetCards, PCVCard, formatGBP, findCard } from "@/lib/pokemon-api";

const SCREEN_WIDTH = Dimensions.get("window").width;

function CardListItem({
  card,
  colors,
  onPress,
  isLoading,
}: {
  card: PCVCard;
  colors: ReturnType<typeof useThemeColors>;
  onPress: () => void;
  isLoading: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.cardItem,
        { backgroundColor: colors.card, borderColor: colors.borderLight, opacity: pressed || isLoading ? 0.7 : 1 },
      ]}
      onPress={onPress}
      disabled={isLoading}
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
            <View style={[styles.chip, { backgroundColor: colors.pokemonRed + "15" }]}>
              <Text style={[styles.chipText, { color: colors.pokemonRed }]}>{card.holoType}</Text>
            </View>
          ) : null}
          {card.rarity ? (
            <View style={[styles.chip, { backgroundColor: colors.pokemonYellow + "20" }]}>
              <Text style={[styles.chipText, { color: colors.pokemonYellow }]}>{card.rarity}</Text>
            </View>
          ) : null}
          {card.edition && card.edition !== "Unlimited" ? (
            <View style={[styles.chip, { backgroundColor: colors.pokemonBlue + "20" }]}>
              <Text style={[styles.chipText, { color: colors.pokemonBlue }]}>{card.edition}</Text>
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
      {isLoading ? (
        <MaterialCommunityIcons name="pokeball" size={16} color={colors.pokemonRed} />
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

export default function SetDetailScreen() {
  const { id, slug, name } = useLocalSearchParams<{ id: string; slug: string; name: string }>();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const [loadingCardKey, setLoadingCardKey] = useState<string | null>(null);

  const { isLoading, data: cards } = useQuery({
    queryKey: ["pcv-set-cards", id, slug],
    queryFn: () => fetchPCVSetCards(id, slug),
    staleTime: 1000 * 60 * 30,
  });

  const totalCount = cards?.length || 0;
  const totalValue = cards?.reduce((sum, c) => sum + (c.priceGBP || 0), 0) || 0;
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const handleCardPress = useCallback(async (card: PCVCard, cardKey: string) => {
    if (loadingCardKey) return;
    setLoadingCardKey(cardKey);
    try {
      const found = await findCard(card.name, card.number, card.setId || undefined);
      if (found) {
        router.push({ pathname: "/card/[id]", params: { id: found.id } });
      } else {
        Alert.alert(
          card.name,
          `No database entry found for this card.\n\nSet: ${card.setName || card.setId}\nNumber: #${card.number}\nCondition value: ${formatGBP(card.priceGBP)}`,
          [{ text: "OK" }]
        );
      }
    } catch {
      Alert.alert("Error", "Could not load card details. Please try again.");
    } finally {
      setLoadingCardKey(null);
    }
  }, [loadingCardKey]);

  const renderItem = useCallback(
    ({ item }: { item: PCVCard }) => {
      const cardKey = `${item.name}-${item.number}-${item.holoType}-${item.edition}`;
      return (
        <CardListItem
          card={item}
          colors={colors}
          onPress={() => handleCardPress(item, cardKey)}
          isLoading={loadingCardKey === cardKey}
        />
      );
    },
    [colors, handleCardPress, loadingCardKey]
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
                <MaterialCommunityIcons name="cards-outline" size={14} color={colors.pokemonRed} />
                <Text style={[styles.headerCount, { color: colors.textSecondary }]}>
                  {totalCount} cards
                </Text>
              </View>
              {totalValue > 0 ? (
                <View style={styles.headerMetaItem}>
                  <Ionicons name="cash-outline" size={14} color={colors.success} />
                  <Text style={[styles.headerValue, { color: colors.success }]}>
                    {formatGBP(totalValue)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="pokeball" size={40} color={colors.pokemonRed} />
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
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 22, fontFamily: "Outfit_700Bold" },
  headerMeta: { flexDirection: "row", gap: 16, alignItems: "center", marginTop: 4 },
  headerMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerCount: { fontSize: 13, fontFamily: "Outfit_500Medium" },
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
  chipText: { fontSize: 10, fontFamily: "Outfit_600SemiBold" },
  priceCol: { alignItems: "flex-end", gap: 2 },
  price: { fontSize: 15, fontFamily: "Outfit_700Bold" },
  priceLabel: { fontSize: 10, fontFamily: "Outfit_400Regular" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "Outfit_500Medium" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Outfit_500Medium" },
});
