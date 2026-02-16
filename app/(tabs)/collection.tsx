import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  useColorScheme,
  Platform,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/constants/colors";
import { useUser } from "@/lib/user-context";
import { formatGBP } from "@/lib/pokemon-api";
import { CollectionItem } from "@/lib/storage";

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
        <Text style={[styles.cardSet, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.setName}
        </Text>
        <Text style={[styles.cardCondition, { color: colors.textMuted }]}>
          {item.condition}
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
          <Ionicons name={item.quantity <= 1 ? "trash-outline" : "remove"} size={16} color={colors.text} />
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

export default function CollectionScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { user, collection, collectionValue, removeCard, updateQuantity } = useUser();
  const [sortBy, setSortBy] = useState<"name" | "value" | "recent">("recent");

  const sorted = [...collection].sort((a, b) => {
    if (sortBy === "name") return a.cardName.localeCompare(b.cardName);
    if (sortBy === "value") return (b.priceGBP ?? 0) - (a.priceGBP ?? 0);
    return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
  });

  const totalCards = collection.reduce((sum, item) => sum + item.quantity, 0);
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}>
          <Text style={[styles.title, { color: colors.text }]}>My Collection</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="person-outline" size={56} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Sign In Required</Text>
          <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
            Create an account to start tracking your collection
          </Text>
          <Pressable
            style={[styles.signInBtn, { backgroundColor: colors.gold }]}
            onPress={() => router.push("/register")}
          >
            <Text style={styles.signInBtnText}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}>
        <Text style={[styles.title, { color: colors.text }]}>My Collection</Text>
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="layers" size={18} color={colors.gold} />
            <Text style={[styles.statValue, { color: colors.text }]}>{totalCards}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Cards</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="diamond" size={18} color={colors.gold} />
            <Text style={[styles.statValue, { color: colors.text }]}>{collection.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Unique</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="cash" size={18} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.success }]}>{formatGBP(collectionValue)}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Value</Text>
          </View>
        </View>

        <View style={styles.sortRow}>
          {(["recent", "name", "value"] as const).map((s) => (
            <Pressable
              key={s}
              style={[styles.sortBtn, sortBy === s && { backgroundColor: colors.gold }]}
              onPress={() => setSortBy(s)}
            >
              <Text
                style={[
                  styles.sortBtnText,
                  { color: sortBy === s ? "#000" : colors.textSecondary },
                ]}
              >
                {s === "recent" ? "Recent" : s === "name" ? "A-Z" : "Value"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={sorted}
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
                  onPress: () => removeCard(item.cardId, item.condition),
                },
              ]);
            }}
            onUpdateQty={(qty) => updateQuantity(item.cardId, item.condition, qty)}
          />
        )}
        keyExtractor={(item) => `${item.cardId}-${item.condition}`}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={56} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              No Cards Yet
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
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontSize: 28, fontFamily: "Outfit_700Bold", marginBottom: 10 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  statValue: { fontSize: 18, fontFamily: "Outfit_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Outfit_400Regular" },
  sortRow: { flexDirection: "row", gap: 8 },
  sortBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  sortBtnText: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  listContent: { paddingHorizontal: 20, paddingTop: 8 },
  cardItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    gap: 10,
  },
  cardImage: { width: 48, height: 68, borderRadius: 6 },
  cardInfo: { flex: 1, gap: 1 },
  cardName: { fontSize: 15, fontFamily: "Outfit_600SemiBold" },
  cardSet: { fontSize: 12, fontFamily: "Outfit_400Regular" },
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
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 18, fontFamily: "Outfit_600SemiBold" },
  emptySubtext: { fontSize: 13, fontFamily: "Outfit_400Regular", textAlign: "center", paddingHorizontal: 40 },
  signInBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  signInBtnText: { fontSize: 15, fontFamily: "Outfit_600SemiBold", color: "#000" },
});
