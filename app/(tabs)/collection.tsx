import React, { useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  SectionList,
  Pressable,
  useColorScheme,
  Platform,
  Alert,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/constants/colors";
import { useUser } from "@/lib/user-context";
import { formatGBP } from "@/lib/pokemon-api";
import { CollectionItem } from "@/lib/storage";
import PokeBackground from "@/components/PokeBackground";

function setLogoUrl(setId: string) {
  return `https://images.pokemontcg.io/${setId}/logo.png`;
}
function setSymbolUrl(setId: string) {
  return `https://images.pokemontcg.io/${setId}/symbol.png`;
}

function CollectionCard({
  item,
  colors,
  onRemove,
  onUpdateQty,
}: {
  item: CollectionItem;
  colors: ReturnType<typeof useThemeColors>;
  onRemove: () => void;
  onUpdateQty: (qty: number) => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.cardItem,
        { backgroundColor: colors.card, borderColor: colors.borderLight, opacity: pressed ? 0.9 : 1 },
      ]}
      onPress={() => router.push({ pathname: "/card/[id]", params: { id: item.cardId } })}
    >
      <Image source={{ uri: item.cardImage }} style={styles.cardImage} contentFit="contain" />
      <View style={styles.cardInfo}>
        <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
          {item.cardName}
        </Text>
        <Text style={[styles.cardCondition, { color: colors.textMuted }]}>
          {item.variant && item.variant !== "Non-Holo" ? `${item.variant} · ` : ""}{item.condition}
        </Text>
        <Text style={[styles.cardPrice, { color: item.priceGBP ? colors.success : colors.textMuted }]}>
          {formatGBP(item.priceGBP)} each
        </Text>
      </View>
      <View style={styles.qtyControls}>
        <Pressable
          style={[styles.qtyBtn, { backgroundColor: colors.surfaceElevated }]}
          onPress={() => {
            if (item.quantity <= 1) {
              onRemove();
            } else {
              onUpdateQty(item.quantity - 1);
            }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Ionicons name={item.quantity <= 1 ? "trash-outline" : "remove"} size={16} color={item.quantity <= 1 ? colors.pokemonRed : colors.text} />
        </Pressable>
        <Text style={[styles.qtyText, { color: colors.text }]}>{item.quantity}</Text>
        <Pressable
          style={[styles.qtyBtn, { backgroundColor: colors.surfaceElevated }]}
          onPress={() => {
            onUpdateQty(item.quantity + 1);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Ionicons name="add" size={16} color={colors.text} />
        </Pressable>
      </View>
    </Pressable>
  );
}

interface SetSection {
  setId: string;
  setName: string;
  cardCount: number;
  totalQuantity: number;
  setValue: number;
  latestAdded: string;
  data: CollectionItem[];
}

export default function CollectionScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { user, collection, collectionValue, removeCard, updateQuantity } = useUser();
  const [sortBy, setSortBy] = useState<"name" | "value" | "recent">("recent");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  }, []);

  const sections: SetSection[] = useMemo(() => {
    const groups = new Map<string, SetSection>();

    for (const item of collection) {
      const key = item.setId || item.setName;
      if (!groups.has(key)) {
        groups.set(key, {
          setId: item.setId,
          setName: item.setName,
          cardCount: 0,
          totalQuantity: 0,
          setValue: 0,
          latestAdded: item.addedAt,
          data: [],
        });
      }
      const g = groups.get(key)!;
      g.data.push(item);
      g.cardCount += 1;
      g.totalQuantity += item.quantity;
      g.setValue += (item.priceGBP ?? 0) * item.quantity;
      if (new Date(item.addedAt) > new Date(g.latestAdded)) {
        g.latestAdded = item.addedAt;
      }
    }

    let result = Array.from(groups.values());

    if (sortBy === "name") {
      result.sort((a, b) => a.setName.localeCompare(b.setName));
      result.forEach(s => s.data.sort((a, b) => a.cardName.localeCompare(b.cardName)));
    } else if (sortBy === "value") {
      result.sort((a, b) => b.setValue - a.setValue);
      result.forEach(s => s.data.sort((a, b) => (b.priceGBP ?? 0) - (a.priceGBP ?? 0)));
    } else {
      result.sort((a, b) => new Date(b.latestAdded).getTime() - new Date(a.latestAdded).getTime());
      result.forEach(s => s.data.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()));
    }

    return result;
  }, [collection, sortBy]);

  const totalCards = collection.reduce((sum, item) => sum + item.quantity, 0);
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={colorScheme === "dark" ? ["#2A0A0A", "#1A1A2E"] : ["#FFF0F0", "#F5F5F5"]}
          style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}
        >
          <View style={styles.titleRow}>
            <MaterialCommunityIcons name="pokeball" size={24} color={colors.pokemonRed} />
            <Text style={[styles.title, { color: colors.text }]}>My Collection</Text>
          </View>
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="pokeball" size={56} color={colors.pokemonRed + "40"} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Sign In Required</Text>
          <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
            Create an account to start tracking your collection
          </Text>
          <Pressable style={styles.signInBtn} onPress={() => router.push("/register")}>
            <LinearGradient colors={["#CC0000", "#8B0000"]} style={styles.signInGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.signInBtnText}>Sign In</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!user.isPremium) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={colorScheme === "dark" ? ["#2A0A0A", "#1A1A2E"] : ["#FFF0F0", "#F5F5F5"]}
          style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}
        >
          <View style={styles.titleRow}>
            <MaterialCommunityIcons name="pokeball" size={24} color={colors.pokemonRed} />
            <Text style={[styles.title, { color: colors.text }]}>My Collection</Text>
          </View>
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <LinearGradient
            colors={[colors.pokemonYellow, "#FF9800"]}
            style={{ borderRadius: 20, padding: 28, alignItems: "center", gap: 10, width: "100%", maxWidth: 360 }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons name="pokeball" size={48} color="#000" />
            <Text style={{ fontSize: 22, fontFamily: "Outfit_700Bold", color: "#000" }}>Premium Required</Text>
            <Text style={{ fontSize: 14, fontFamily: "Outfit_400Regular", color: "#000", textAlign: "center", opacity: 0.75 }}>
              Upgrade to Premium to save cards to your collection and track your portfolio value.
            </Text>
            <Pressable
              onPress={() => router.push("/premium")}
              style={({ pressed }) => ({
                flexDirection: "row", alignItems: "center", gap: 8,
                backgroundColor: pressed ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.15)",
                paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 4,
              })}
            >
              <Ionicons name="star" size={16} color="#000" />
              <Text style={{ fontSize: 15, fontFamily: "Outfit_700Bold", color: "#000" }}>Upgrade to Premium</Text>
            </Pressable>
          </LinearGradient>
          <View style={{ marginTop: 24, gap: 14 }}>
            {["Save cards to your collection", "Track portfolio value in GBP", "View collection stats", "Access marketplace"].map(
              (feature, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.pokemonRed} />
                  <Text style={{ fontSize: 15, fontFamily: "Outfit_500Medium", color: colors.text }}>{feature}</Text>
                </View>
              )
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PokeBackground opacity={colorScheme === "dark" ? 0.18 : 0.12} />
      <LinearGradient
        colors={colorScheme === "dark" ? ["#2A0A0A", "#1A1A2E"] : ["#FFF0F0", "#F5F5F5"]}
        style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}
      >
        <View style={styles.titleRow}>
          <MaterialCommunityIcons name="pokeball" size={24} color={colors.pokemonRed} />
          <Text style={[styles.title, { color: colors.text }]}>My Collection</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.pokemonRed + "30" }]}>
            <MaterialCommunityIcons name="cards" size={18} color={colors.pokemonRed} />
            <Text style={[styles.statValue, { color: colors.text }]}>{totalCards}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Cards</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.pokemonYellow + "30" }]}>
            <Ionicons name="star" size={18} color={colors.pokemonYellow} />
            <Text style={[styles.statValue, { color: colors.text }]}>{collection.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Unique</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.success + "30" }]}>
            <Ionicons name="cash" size={18} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.success }]}>{formatGBP(collectionValue)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Value</Text>
          </View>
        </View>
        <View style={styles.sortRow}>
          {(["recent", "name", "value"] as const).map((s) => (
            <Pressable
              key={s}
              style={[styles.sortBtn, sortBy === s && { backgroundColor: colors.pokemonRed }]}
              onPress={() => setSortBy(s)}
            >
              <Text style={[styles.sortBtnText, { color: sortBy === s ? "#FFF" : colors.textSecondary }]}>
                {s === "recent" ? "Recent" : s === "name" ? "A-Z" : "Value"}
              </Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      <SectionList
        sections={sections}
        keyExtractor={(item) => `${item.cardId}-${item.condition}-${item.variant || "Non-Holo"}`}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.pokemonRed}
            colors={[colors.pokemonRed]}
          />
        }
        renderSectionHeader={({ section }) => (
          <Pressable
            style={[styles.setHeader, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
            onPress={() => router.push({ pathname: "/set/[id]", params: { id: section.setId, name: section.setName } })}
          >
            <Image
              source={{ uri: setLogoUrl(section.setId) }}
              style={styles.setLogo}
              contentFit="contain"
              placeholder={{ color: colors.surface } as any}
            />
            <View style={styles.setInfo}>
              <Text style={[styles.setName, { color: colors.text }]} numberOfLines={1}>
                {section.setName}
              </Text>
              <View style={styles.setMeta}>
                <View style={styles.setMetaItem}>
                  <MaterialCommunityIcons name="cards-outline" size={12} color={colors.textSecondary} />
                  <Text style={[styles.setMetaText, { color: colors.textSecondary }]}>
                    {section.totalQuantity} {section.totalQuantity === 1 ? "card" : "cards"}
                  </Text>
                </View>
                {section.setValue > 0 && (
                  <View style={styles.setMetaItem}>
                    <Ionicons name="cash-outline" size={12} color={colors.success} />
                    <Text style={[styles.setMetaText, { color: colors.success }]}>
                      {formatGBP(section.setValue)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <Image
              source={{ uri: setSymbolUrl(section.setId) }}
              style={styles.setSymbol}
              contentFit="contain"
              placeholder={{ color: colors.surface } as any}
            />
          </Pressable>
        )}
        renderItem={({ item }) => (
          <CollectionCard
            item={item}
            colors={colors}
            onRemove={() => {
              Alert.alert("Remove Card", `Remove ${item.cardName} from collection?`, [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Remove",
                  style: "destructive",
                  onPress: () => removeCard(item.cardId, item.condition, item.variant),
                },
              ]);
            }}
            onUpdateQty={(qty) => updateQuantity(item.cardId, item.condition, qty, item.variant)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Image
              source={{ uri: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/143.png" }}
              style={styles.emptyPokemon}
              contentFit="contain"
            />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              Your collection is sleeping...
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              Browse sets or scan cards to add them to your collection
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  title: { fontSize: 28, fontFamily: "Outfit_700Bold" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 4,
  },
  statValue: { fontSize: 18, fontFamily: "Outfit_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Outfit_400Regular" },
  sortRow: { flexDirection: "row", gap: 8 },
  sortBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  sortBtnText: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  setHeader: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    marginBottom: 6,
    marginTop: 10,
    borderWidth: 1,
    gap: 12,
  },
  setLogo: { width: 80, height: 44, borderRadius: 4 },
  setInfo: { flex: 1, gap: 3 },
  setName: { fontSize: 15, fontFamily: "Outfit_700Bold" },
  setMeta: { flexDirection: "row", gap: 12, alignItems: "center" },
  setMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  setMetaText: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  setSymbol: { width: 28, height: 28 },
  cardItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 10,
    marginBottom: 6,
    marginLeft: 12,
    borderWidth: 1,
    gap: 10,
  },
  cardImage: { width: 48, height: 68, borderRadius: 6 },
  cardInfo: { flex: 1, gap: 2 },
  cardName: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  cardCondition: { fontSize: 11, fontFamily: "Outfit_500Medium" },
  cardPrice: { fontSize: 13, fontFamily: "Outfit_700Bold", marginTop: 2 },
  qtyControls: { alignItems: "center", gap: 4 },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: { fontSize: 16, fontFamily: "Outfit_700Bold" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 40, gap: 8 },
  emptyPokemon: { width: 140, height: 140 },
  emptyTitle: { fontSize: 18, fontFamily: "Outfit_600SemiBold" },
  emptySubtext: { fontSize: 13, fontFamily: "Outfit_400Regular", textAlign: "center", paddingHorizontal: 40 },
  signInBtn: { marginTop: 8 },
  signInGradient: { paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  signInBtnText: { fontSize: 15, fontFamily: "Outfit_600SemiBold", color: "#FFF" },
});
