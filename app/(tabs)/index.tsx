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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/constants/colors";
import { fetchPCVSets, PCVSet } from "@/lib/pokemon-api";

function SetCard({ set, colors }: { set: PCVSet; colors: ReturnType<typeof useThemeColors> }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.setCard,
        { backgroundColor: colors.card, borderColor: colors.borderLight, opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={() => router.push({ pathname: "/set/[id]", params: { id: set.id, slug: set.slug, name: set.name } })}
    >
      <Image
        source={{ uri: set.logoUrl }}
        style={styles.setLogo}
        contentFit="contain"
      />
      <View style={styles.setInfo}>
        <Text style={[styles.setSeries, { color: colors.pokemonRed }]} numberOfLines={1}>
          {set.series}
        </Text>
        <Text style={[styles.setName, { color: colors.text }]} numberOfLines={1}>
          {set.name}
        </Text>
        <View style={styles.setMeta}>
          <View style={styles.setMetaItem}>
            <MaterialCommunityIcons name="cards-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.setMetaText, { color: colors.textSecondary }]}>
              {set.cardCount} cards
            </Text>
          </View>
          {set.releaseDate ? (
            <View style={styles.setMetaItem}>
              <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.setMetaText, { color: colors.textSecondary }]}>
                {set.releaseDate}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <Image
        source={{ uri: set.symbolUrl }}
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
    queryKey: ["pcv-sets"],
    queryFn: fetchPCVSets,
    staleTime: 1000 * 60 * 30,
  });

  const filteredSets = sets?.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.series.toLowerCase().includes(q);
  });

  const groupedSets = filteredSets?.reduce<Record<string, PCVSet[]>>((acc, set) => {
    if (!acc[set.series]) acc[set.series] = [];
    acc[set.series].push(set);
    return acc;
  }, {});

  const sections = groupedSets
    ? Object.entries(groupedSets).map(([series, items]) => ({ series, data: items }))
    : [];

  const flatData = sections.flatMap((section) => [
    { type: "header" as const, series: section.series, key: `header-${section.series}` },
    ...section.data.map((set) => ({ type: "set" as const, set, key: `${set.id}-${set.slug}` })),
  ]);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const renderItem = useCallback(
    ({ item }: { item: (typeof flatData)[number] }) => {
      if (item.type === "header") {
        return (
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionDot, { backgroundColor: colors.pokemonRed }]} />
            <Text style={[styles.sectionHeader, { color: colors.pokemonRed }]}>
              {item.series}
            </Text>
          </View>
        );
      }
      return <SetCard set={item.set} colors={colors} />;
    },
    [colors]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={colorScheme === "dark" ? ["#2A0A0A", "#1A1A2E"] : ["#FFF0F0", "#F5F5F5"]}
        style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}
      >
        <View style={styles.titleRow}>
          <MaterialCommunityIcons name="pokeball" size={28} color={colors.pokemonRed} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={[styles.title, { color: colors.text }]}>PokeScan</Text>
              <Text style={[styles.titleAccent, { color: colors.pokemonRed }]}>TCG</Text>
            </View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              UK card sets & prices
            </Text>
          </View>
          <Image
            source={{ uri: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png" }}
            style={styles.pikachuMascot}
            contentFit="contain"
          />
        </View>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.pokemonRed + "40" }]}>
          <Ionicons name="search" size={18} color={colors.pokemonRed} />
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
      </LinearGradient>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="pokeball" size={48} color={colors.pokemonRed} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading UK card sets...
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
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.pokemonRed} />
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
    paddingBottom: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontFamily: "Outfit_700Bold",
  },
  titleAccent: {
    fontSize: 28,
    fontFamily: "Outfit_700Bold",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    marginTop: 2,
  },
  pikachuMascot: {
    width: 72,
    height: 72,
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
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Outfit_400Regular",
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    marginBottom: 8,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionHeader: {
    fontSize: 13,
    fontFamily: "Outfit_700Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
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
    fontFamily: "Outfit_600SemiBold",
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
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Outfit_500Medium",
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
