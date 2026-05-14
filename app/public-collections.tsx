import React, { useState, useCallback, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  useColorScheme,
  Platform,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/constants/colors";
import { formatGBP } from "@/lib/pokemon-api";
import { getApiUrl } from "@/lib/query-client";
import { getSessionToken } from "@/lib/storage";

interface PublicCollector {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  isVerifiedCollector: boolean;
  cardCount: number;
  totalQuantity: number;
  totalValue: number;
}

export default function PublicCollectionsScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const [collectors, setCollectors] = useState<PublicCollector[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchCollectors = useCallback(async (q: string, pg: number, append: boolean) => {
    try {
      const token = await getSessionToken();
      const url = new URL("/api/collections/public", getApiUrl());
      if (q) url.searchParams.set("search", q);
      url.searchParams.set("page", String(pg));
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setCollectors((prev) => append ? [...prev, ...data.collectors] : data.collectors);
      setHasMore(data.hasMore);
      setPage(pg);
    } catch (e: any) {
      console.error("PublicCollections fetch error:", e);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchCollectors(search, 1, false).finally(() => setLoading(false));
  }, [search]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCollectors(search, 1, false);
    setRefreshing(false);
  }, [search, fetchCollectors]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchCollectors(search, page + 1, true);
    setLoadingMore(false);
  }, [loadingMore, hasMore, search, page, fetchCollectors]);

  const handleSearch = useCallback(() => {
    setSearch(searchInput.trim());
  }, [searchInput]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={colorScheme === "dark" ? ["#2A0A0A", "#1A1A2E"] : ["#FFF0F0", "#F5F5F5"]}
        style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}
      >
        <View style={styles.titleRow}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <MaterialCommunityIcons name="account-group" size={24} color={colors.pokemonRed} />
          <Text style={[styles.title, { color: colors.text }]}>Public Collections</Text>
        </View>
        <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by username..."
            placeholderTextColor={colors.textMuted}
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchInput.length > 0 && (
            <Pressable onPress={() => { setSearchInput(""); setSearch(""); }}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.pokemonRed} />
        </View>
      ) : (
        <FlatList
          data={collectors}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.pokemonRed} colors={[colors.pokemonRed]} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.pokemonRed} style={{ marginVertical: 12 }} /> : null}
          ListEmptyComponent={
            <View style={styles.center}>
              <MaterialCommunityIcons name="account-group-outline" size={56} color={colors.textMuted + "60"} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No public collections found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.collectorRow,
                { backgroundColor: colors.card, borderColor: colors.borderLight, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => router.push({ pathname: "/friend-collection", params: { userId: item.id, displayName: item.displayName, isPublic: "true" } })}
            >
              {item.avatarUrl ? (
                <Image source={{ uri: item.avatarUrl }} style={styles.avatar} contentFit="cover" />
              ) : (
                <LinearGradient colors={["#CC0000", "#8B0000"]} style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
                </LinearGradient>
              )}
              <View style={styles.collectorInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
                    {item.displayName}
                  </Text>
                  {item.isVerifiedCollector && (
                    <View style={[styles.verifiedBadge, { backgroundColor: colors.pokemonBlue + "20" }]}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.pokemonBlue} />
                      <Text style={[styles.verifiedText, { color: colors.pokemonBlue }]}>Verified</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.username, { color: colors.textMuted }]}>@{item.username}</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <MaterialCommunityIcons name="cards-outline" size={12} color={colors.textSecondary} />
                    <Text style={[styles.statText, { color: colors.textSecondary }]}>{item.cardCount} unique · {item.totalQuantity} total</Text>
                  </View>
                  {item.totalValue > 0 && (
                    <View style={styles.statItem}>
                      <Ionicons name="cash-outline" size={12} color={colors.success} />
                      <Text style={[styles.statText, { color: colors.success }]}>{formatGBP(item.totalValue)}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  backBtn: { marginRight: 4 },
  title: { fontSize: 22, fontFamily: "Outfit_700Bold", flex: 1 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Outfit_400Regular" },
  listContent: { paddingHorizontal: 16, paddingTop: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Outfit_400Regular" },
  collectorRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarText: { fontSize: 18, fontFamily: "Outfit_700Bold", color: "#FFF" },
  collectorInfo: { flex: 1, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  displayName: { fontSize: 15, fontFamily: "Outfit_700Bold" },
  username: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  verifiedText: { fontSize: 11, fontFamily: "Outfit_600SemiBold" },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 12, fontFamily: "Outfit_400Regular" },
});
