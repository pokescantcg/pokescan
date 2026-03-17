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
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
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
        source={{ uri: set.images?.logo || "" }}
        style={styles.setLogo}
        contentFit="contain"
        placeholder={{ color: colors.surface }}
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
              {set.total || set.printedTotal || "?"} cards
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
        source={{ uri: set.images?.symbol || "" }}
        style={styles.setSymbol}
        contentFit="contain"
        placeholder={{ color: colors.surface }}
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
    queryKey: ["tcg-sets"],
    queryFn: fetchSets,
    staleTime: 1000 * 60 * 60,
  });

  const filtered = search.trim()
    ? (sets || []).filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.series.toLowerCase().includes(search.toLowerCase())
      )
    : (sets || []);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const renderItem = useCallback(
    ({ item }: { item: PokemonSet }) => <SetCard set={item} colors={colors} />,
    [colors]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={colorScheme === "dark" ? ["#2A0A0A", "#1A1A2E"] : ["#FFF0F0", "#F5F5F5"]}
        style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}
      >
        <View style={styles.titleRow}>
          <MaterialCommunityIcons name="pokeball" size={26} color={colors.pokemonRed} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>Card Sets</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {sets?.length || 0} sets available
            </Text>
          </View>
        </View>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.pokemonRed + "40" }]}>
          <Ionicons name="search" size={17} color={colors.pokemonRed} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search sets..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={17} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="pokeball" size={48} color={colors.pokemonRed} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading sets...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.pokemonRed}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="cards-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {search ? "No sets match your search" : "No sets available"}
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
  header: { paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 28, fontFamily: "Outfit_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Outfit_400Regular", marginTop: 2 },
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
  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  setCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
  },
  setLogo: { width: 80, height: 48, borderRadius: 6 },
  setInfo: { flex: 1, gap: 2 },
  setSeries: { fontSize: 11, fontFamily: "Outfit_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  setName: { fontSize: 16, fontFamily: "Outfit_700Bold" },
  setMeta: { flexDirection: "row", gap: 12, alignItems: "center", marginTop: 3 },
  setMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  setMetaText: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  setSymbol: { width: 32, height: 32 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 14 },
  loadingText: { fontSize: 15, fontFamily: "Outfit_500Medium" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Outfit_500Medium" },
});
