import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  SectionList,
  Pressable,
  useColorScheme,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/constants/colors";
import { socialApi, SocialUser } from "@/lib/social-api";
import { CollectionItem } from "@/lib/storage";
import { formatGBP } from "@/lib/pokemon-api";

function setLogoUrl(setId: string) {
  return `https://images.pokemontcg.io/${setId}/logo.png`;
}

interface SetSection {
  setId: string;
  setName: string;
  totalQuantity: number;
  setValue: number;
  data: CollectionItem[];
}

function groupBySet(collection: CollectionItem[]): SetSection[] {
  const groups = new Map<string, SetSection>();
  for (const item of collection) {
    const key = item.setId || item.setName || "Unknown";
    if (!groups.has(key)) {
      groups.set(key, { setId: item.setId, setName: item.setName, totalQuantity: 0, setValue: 0, data: [] });
    }
    const g = groups.get(key)!;
    g.data.push(item);
    g.totalQuantity += item.quantity;
    g.setValue += (item.priceGBP ?? 0) * item.quantity;
  }
  return Array.from(groups.values()).sort((a, b) => b.setValue - a.setValue);
}

export default function FriendCollectionScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
<<<<<<< HEAD
  const { userId, displayName, isPublic } = useLocalSearchParams<{ userId: string; displayName: string; isPublic?: string }>();
  const isPublicView = isPublic === "true";
=======
  const { userId, displayName } = useLocalSearchParams<{ userId: string; displayName: string }>();
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f

  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [owner, setOwner] = useState<SocialUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsedSets, setCollapsedSets] = useState<Set<string>>(new Set());

  const fetchCollection = async () => {
    try {
      setError(null);
<<<<<<< HEAD
      if (isPublicView) {
        const token = await import("@/lib/storage").then(m => m.getSessionToken());
        const { getApiUrl } = await import("@/lib/query-client");
        const url = new URL(`/api/collections/public/${userId}`, getApiUrl());
        const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        setCollection(data.collection);
        setOwner(data.owner);
      } else {
        const data = await socialApi.getFriendCollection(userId);
        setCollection(data.collection);
        setOwner(data.owner);
      }
=======
      const data = await socialApi.getFriendCollection(userId);
      setCollection(data.collection);
      setOwner(data.owner);
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
    } catch (e: any) {
      setError(e.message || "Failed to load collection");
    }
  };

  useEffect(() => {
    fetchCollection().finally(() => setLoading(false));
  }, [userId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCollection();
    setRefreshing(false);
  };

  const toggleSet = (setId: string) => {
    setCollapsedSets(prev => {
      const next = new Set(prev);
      next.has(setId) ? next.delete(setId) : next.add(setId);
      return next;
    });
  };

  const rawSections = useMemo(() => groupBySet(collection), [collection]);
  const sections = useMemo(() =>
    rawSections.map(s => ({ ...s, data: collapsedSets.has(s.setId) ? ([] as CollectionItem[]) : s.data })),
    [rawSections, collapsedSets]
  );

  const totalCards = collection.reduce((sum, i) => sum + i.quantity, 0);
  const totalValue = collection.reduce((sum, i) => sum + (i.priceGBP ?? 0) * i.quantity, 0);
  const ownerName = owner?.displayName ?? displayName ?? "Friend";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={colorScheme === "dark" ? ["#0A1A2A", "#1A1A2E"] : ["#EFF6FF", "#F5F5F5"]}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
<<<<<<< HEAD
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {ownerName}'s Collection
              </Text>
              {owner?.isVerifiedCollector && (
                <Ionicons name="checkmark-circle" size={18} color="#3498DB" />
              )}
            </View>
=======
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {ownerName}'s Collection
            </Text>
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
            {owner && (
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>@{owner.username}</Text>
            )}
          </View>
        </View>

        {!loading && !error && (
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.pokemonBlue + "30" }]}>
              <MaterialCommunityIcons name="cards" size={16} color={colors.pokemonBlue} />
              <Text style={[styles.statValue, { color: colors.text }]}>{totalCards}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Cards</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.pokemonYellow + "30" }]}>
              <Ionicons name="star" size={16} color={colors.pokemonYellow} />
              <Text style={[styles.statValue, { color: colors.text }]}>{collection.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Unique</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.success + "30" }]}>
              <Ionicons name="cash" size={16} color={colors.success} />
              <Text style={[styles.statValue, { color: colors.success }]}>{formatGBP(totalValue)}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Value</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.pokemonBlue} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading collection...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.errorTitle, { color: colors.textSecondary }]}>Collection Unavailable</Text>
          <Text style={[styles.errorBody, { color: colors.textMuted }]}>{error}</Text>
        </View>
      ) : collection.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="pokeball" size={48} color={colors.textMuted} />
          <Text style={[styles.errorTitle, { color: colors.textSecondary }]}>No cards yet</Text>
          <Text style={[styles.errorBody, { color: colors.textMuted }]}>{ownerName} hasn't added any cards</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
<<<<<<< HEAD
          keyExtractor={(item) => item.id ?? `${item.cardId}-${item.condition}-${item.variant || "Non-Holo"}-${item.gradingCompany || ""}-${item.grade || ""}`}
=======
          keyExtractor={(item) => `${item.cardId}-${item.condition}-${item.variant}`}
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.pokemonBlue} colors={[colors.pokemonBlue]} />
          }
          renderSectionHeader={({ section }) => {
            const s = section as SetSection;
            const collapsed = collapsedSets.has(s.setId);
            return (
              <Pressable
                style={[styles.setHeader, { backgroundColor: colors.card, borderColor: collapsed ? colors.borderLight : colors.pokemonBlue + "40" }]}
                onPress={() => toggleSet(s.setId)}
              >
                <Image
                  source={{ uri: setLogoUrl(s.setId) }}
                  style={styles.setLogo}
                  contentFit="contain"
                  placeholder={{ color: colors.surface } as any}
                />
                <View style={styles.setInfo}>
                  <Text style={[styles.setName, { color: colors.text }]} numberOfLines={1}>{s.setName}</Text>
                  <View style={styles.setMeta}>
                    <MaterialCommunityIcons name="cards-outline" size={11} color={colors.textSecondary} />
                    <Text style={[styles.setMetaText, { color: colors.textSecondary }]}>{s.totalQuantity} cards</Text>
                    {s.setValue > 0 && (
                      <>
                        <Ionicons name="cash-outline" size={11} color={colors.success} />
                        <Text style={[styles.setMetaText, { color: colors.success }]}>{formatGBP(s.setValue)}</Text>
                      </>
                    )}
                  </View>
                </View>
                <Ionicons name={collapsed ? "chevron-forward" : "chevron-down"} size={16} color={colors.textSecondary} />
              </Pressable>
            );
          }}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.cardItem, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
              onPress={() => router.push({ pathname: "/card/[id]", params: { id: item.cardId } })}
            >
              <Image source={{ uri: item.cardImage }} style={styles.cardImage} contentFit="contain" />
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>{item.cardName}</Text>
                <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
                  {item.variant && item.variant !== "Non-Holo" ? `${item.variant} · ` : ""}{item.condition}
                </Text>
<<<<<<< HEAD
                {item.gradingCompany && item.grade && (
                  <View style={{ flexDirection: "row", marginTop: 2 }}>
                    <View style={{ backgroundColor: "#3498DB20", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, fontFamily: "Outfit_700Bold", color: "#3498DB" }}>{item.gradingCompany} {item.grade}</Text>
                    </View>
                  </View>
                )}
=======
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
                {item.priceGBP ? (
                  <Text style={[styles.cardPrice, { color: colors.success }]}>{formatGBP(item.priceGBP)}</Text>
                ) : null}
              </View>
              <View style={[styles.qtyBadge, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={[styles.qtyText, { color: colors.text }]}>×{item.quantity}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontFamily: "Outfit_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  statsRow: { flexDirection: "row", gap: 8 },
  statBox: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, gap: 3 },
  statValue: { fontSize: 16, fontFamily: "Outfit_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Outfit_400Regular" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, padding: 32 },
  loadingText: { fontSize: 14, fontFamily: "Outfit_400Regular" },
  errorTitle: { fontSize: 18, fontFamily: "Outfit_600SemiBold", textAlign: "center" },
  errorBody: { fontSize: 13, fontFamily: "Outfit_400Regular", textAlign: "center" },
  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  setHeader: {
    flexDirection: "row", alignItems: "center", borderRadius: 14,
    padding: 10, marginBottom: 6, marginTop: 8, borderWidth: 1, gap: 10,
  },
  setLogo: { width: 72, height: 40, borderRadius: 4 },
  setInfo: { flex: 1, gap: 3 },
  setName: { fontSize: 14, fontFamily: "Outfit_700Bold" },
  setMeta: { flexDirection: "row", gap: 5, alignItems: "center" },
  setMetaText: { fontSize: 11, fontFamily: "Outfit_400Regular" },
  cardItem: {
    flexDirection: "row", alignItems: "center", borderRadius: 12,
    padding: 10, marginBottom: 5, marginLeft: 10, borderWidth: 1, gap: 10,
  },
  cardImage: { width: 44, height: 62, borderRadius: 5 },
  cardInfo: { flex: 1, gap: 2 },
  cardName: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  cardMeta: { fontSize: 11, fontFamily: "Outfit_400Regular" },
  cardPrice: { fontSize: 12, fontFamily: "Outfit_700Bold" },
  qtyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  qtyText: { fontSize: 13, fontFamily: "Outfit_700Bold" },
});
