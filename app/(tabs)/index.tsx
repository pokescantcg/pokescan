import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  TextInput,
  useColorScheme,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useThemeColors } from "@/constants/colors";
import { fetchSets, PokemonSet } from "@/lib/pokemon-api";

function SetCard({ set, colors }: { set: PokemonSet; colors: ReturnType<typeof useThemeColors> }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.setCard,
        { backgroundColor: colors.card, borderColor: colors.borderLight, opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={() => router.push({ pathname: "/set/[id]", params: { id: set.id, name: set.name } })}
    >
      <Image
        source={{ uri: set.images.logo }}
        style={styles.setLogo}
        contentFit="contain"
      />
      <View style={styles.setInfo}>
        <Text style={[styles.setSeries, { color: colors.textMuted }]} numberOfLines={1}>
          {set.series}
        </Text>
        <Text style={[styles.setName, { color: colors.text }]} numberOfLines={1}>
          {set.name}
        </Text>
        <View style={styles.setMeta}>
          <View style={styles.setMetaItem}>
            <Ionicons name="layers-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.setMetaText, { color: colors.textSecondary }]}>
              {set.printedTotal} cards
            </Text>
          </View>
          <View style={styles.setMetaItem}>
            <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.setMetaText, { color: colors.textSecondary }]}>
              {set.releaseDate}
            </Text>
          </View>
        </View>
      </View>
      <Image
        source={{ uri: set.images.symbol }}
        style={styles.setSymbol}
        contentFit="contain"
      />
    </Pressable>
  );
}

export default function BrowseScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");

  const { data: sets, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["pokemon-sets"],
    queryFn: fetchSets,
    staleTime: 1000 * 60 * 30,
  });

  const filteredSets = sets?.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.series.toLowerCase().includes(q);
  });

  const groupedSets = filteredSets?.reduce<Record<string, PokemonSet[]>>((acc, set) => {
    if (!acc[set.series]) acc[set.series] = [];
    acc[set.series].push(set);
    return acc;
  }, {});

  const sections = groupedSets
    ? Object.entries(groupedSets).map(([series, items]) => ({ series, data: items }))
    : [];

  const flatData = sections.flatMap((section) => [
    { type: "header" as const, series: section.series, key: `header-${section.series}` },
    ...section.data.map((set) => ({ type: "set" as const, set, key: set.id })),
  ]);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const renderItem = useCallback(
    ({ item }: { item: (typeof flatData)[number] }) => {
      if (item.type === "header") {
        return (
          <Text style={[styles.sectionHeader, { color: colors.gold }]}>
            {item.series}
          </Text>
        );
      }
      return <SetCard set={item.set} colors={colors} />;
    },
    [colors]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}>
        <Text style={[styles.title, { color: colors.text }]}>PokeScan TCG</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Browse all Pokemon card sets
        </Text>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search sets..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading card sets...
          </Text>
        </View>
      ) : (
        <FlatList
          data={flatData}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.gold} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No sets found
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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontFamily: "Outfit_700Bold",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Outfit_400Regular",
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontFamily: "Outfit_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
  },
  setCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
  },
  setLogo: {
    width: 60,
    height: 40,
  },
  setInfo: {
    flex: 1,
    gap: 2,
  },
  setSeries: {
    fontSize: 11,
    fontFamily: "Outfit_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  setName: {
    fontSize: 15,
    fontFamily: "Outfit_600SemiBold",
  },
  setMeta: {
    flexDirection: "row",
    gap: 12,
    marginTop: 2,
  },
  setMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  setMetaText: {
    fontSize: 11,
    fontFamily: "Outfit_400Regular",
  },
  setSymbol: {
    width: 28,
    height: 28,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Outfit_500Medium",
  },
});
