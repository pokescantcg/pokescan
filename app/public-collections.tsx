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

interface TopVerified {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  isVerifiedCollector: boolean;
  verifiedCount: number;
  totalCount: number;
  verifiedValue: number;
  verifiedPercent: number;
}

const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

function AvatarView({ item, size, colors }: { item: { avatarUrl?: string | null; displayName: string }; size: number; colors: any }) {
  if (item.avatarUrl) {
    return <Image source={{ uri: item.avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden" }} contentFit="cover" />;
  }
  return (
    <LinearGradient colors={["#CC0000", "#8B0000"]} style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: size * 0.38, fontFamily: "Outfit_700Bold", color: "#FFF" }}>{item.displayName.charAt(0).toUpperCase()}</Text>
    </LinearGradient>
  );
}

export default function PublicCollectionsScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const [topVerified, setTopVerified] = useState<TopVerified[]>([]);
  const [topLoading, setTopLoading] = useState(true);

  const [collectors, setCollectors] = useState<PublicCollector[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchTopVerified = useCallback(async () => {
    try {
      const token = await getSessionToken();
      const url = new URL("/api/collections/top-verified", getApiUrl());
      const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setTopVerified(data.top || []);
    } catch {}
  }, []);

  const fetchCollectors = useCallback(async (q: string, pg: number, append: boolean) => {
    try {
      const token = await getSessionToken();
      const url = new URL("/api/collections/public", getApiUrl());
      if (q) url.searchParams.set("search", q);
      url.searchParams.set("page", String(pg));
      const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
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
    setTopLoading(true);
    fetchTopVerified().finally(() => setTopLoading(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchCollectors(search, 1, false).finally(() => setLoading(false));
  }, [search]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchTopVerified(), fetchCollectors(search, 1, false)]);
    setRefreshing(false);
  }, [search, fetchCollectors, fetchTopVerified]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchCollectors(search, page + 1, true);
    setLoadingMore(false);
  }, [loadingMore, hasMore, search, page, fetchCollectors]);

  const handleSearch = useCallback(() => {
    setSearch(searchInput.trim());
  }, [searchInput]);

  const navigateToCollection = (item: { id: string; displayName: string }) => {
    router.push({ pathname: "/friend-collection", params: { userId: item.id, displayName: item.displayName, isPublic: "true" } });
  };

  // ─── Header: top verified leaderboard ──────────────────────────────────────
  const ListHeader = (
    <>
      {/* Top Verified Collections */}
      <View style={styles.sectionHeader}>
        <Ionicons name="trophy" size={18} color="#FFD700" />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Verified Collections</Text>
      </View>
      <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
        Ranked by verified card value · 90%+ verified earns the Verified Collector badge
      </Text>

      {topLoading ? (
        <ActivityIndicator color={colors.pokemonRed} style={{ marginVertical: 16 }} />
      ) : topVerified.length === 0 ? (
        <View style={[styles.emptyTop, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <Ionicons name="shield-outline" size={32} color={colors.textMuted} />
          <Text style={[styles.emptyTopText, { color: colors.textMuted }]}>No verified collections yet</Text>
        </View>
      ) : (
        topVerified.map((item, index) => {
          const medalColor = index < 3 ? MEDAL_COLORS[index] : colors.textMuted;
          const isTop3 = index < 3;
          return (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.topRow,
                {
                  backgroundColor: colors.card,
                  borderColor: isTop3 ? medalColor + "50" : colors.borderLight,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={() => navigateToCollection(item)}
            >
              {/* Rank */}
              <View style={[styles.rankBadge, { backgroundColor: isTop3 ? medalColor + "20" : colors.surfaceElevated }]}>
                <Text style={[styles.rankText, { color: isTop3 ? medalColor : colors.textMuted }]}>
                  {isTop3 ? ["🥇", "🥈", "🥉"][index] : `#${index + 1}`}
                </Text>
              </View>

              <AvatarView item={item} size={42} colors={colors} />

              <View style={styles.topInfo}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Text style={[styles.topName, { color: colors.text }]} numberOfLines={1}>{item.displayName}</Text>
                  {item.isVerifiedCollector && (
                    <Ionicons name="shield-checkmark" size={13} color="#2ECC71" />
                  )}
                </View>
                <Text style={[styles.topUsername, { color: colors.textMuted }]}>@{item.username}</Text>
                <View style={styles.topStats}>
                  <View style={[styles.verifiedPct, { backgroundColor: "#2ECC7115" }]}>
                    <Ionicons name="shield-checkmark" size={10} color="#2ECC71" />
                    <Text style={[styles.verifiedPctText, { color: "#2ECC71" }]}>{item.verifiedPercent}% verified</Text>
                  </View>
                  <Text style={[styles.topCardCount, { color: colors.textMuted }]}>
                    {item.verifiedCount}/{item.totalCount} cards
                  </Text>
                </View>
              </View>

              <View style={styles.topValueCol}>
                <Text style={[styles.topValue, { color: colors.success }]}>{formatGBP(item.verifiedValue)}</Text>
                <Text style={[styles.topValueLabel, { color: colors.textMuted }]}>verified</Text>
              </View>
            </Pressable>
          );
        })
      )}

      {/* Divider */}
      <View style={[styles.divider, { borderColor: colors.borderLight }]}>
        <View style={[styles.dividerLine, { backgroundColor: colors.borderLight }]} />
        <View style={[styles.dividerChip, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <MaterialCommunityIcons name="account-group" size={13} color={colors.textSecondary} />
          <Text style={[styles.dividerText, { color: colors.textSecondary }]}>All Public Collections</Text>
        </View>
        <View style={[styles.dividerLine, { backgroundColor: colors.borderLight }]} />
      </View>
    </>
  );

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

      {loading && collectors.length === 0 ? (
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
          ListHeaderComponent={ListHeader}
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
              onPress={() => navigateToCollection(item)}
            >
              <AvatarView item={item} size={48} colors={colors} />
              <View style={styles.collectorInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
                    {item.displayName}
                  </Text>
                  {item.isVerifiedCollector && (
                    <View style={[styles.verifiedBadge, { backgroundColor: "#2ECC7115" }]}>
                      <Ionicons name="shield-checkmark" size={12} color="#2ECC71" />
                      <Text style={[styles.verifiedText, { color: "#2ECC71" }]}>Verified</Text>
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

  // Top Verified
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 17, fontFamily: "Outfit_700Bold" },
  sectionSub: { fontSize: 12, fontFamily: "Outfit_400Regular", marginBottom: 12, lineHeight: 17 },
  emptyTop: {
    alignItems: "center",
    gap: 8,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  emptyTopText: { fontSize: 13, fontFamily: "Outfit_400Regular" },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    gap: 10,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { fontSize: 15, fontFamily: "Outfit_700Bold" },
  topInfo: { flex: 1, gap: 2 },
  topName: { fontSize: 14, fontFamily: "Outfit_700Bold", flexShrink: 1 },
  topUsername: { fontSize: 11, fontFamily: "Outfit_400Regular" },
  topStats: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  verifiedPct: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedPctText: { fontSize: 10, fontFamily: "Outfit_700Bold" },
  topCardCount: { fontSize: 10, fontFamily: "Outfit_400Regular" },
  topValueCol: { alignItems: "flex-end", gap: 2 },
  topValue: { fontSize: 14, fontFamily: "Outfit_700Bold" },
  topValueLabel: { fontSize: 10, fontFamily: "Outfit_400Regular" },

  // Divider
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    marginBottom: 16,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  dividerText: { fontSize: 11, fontFamily: "Outfit_600SemiBold" },

  // Regular collectors
  collectorRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
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
