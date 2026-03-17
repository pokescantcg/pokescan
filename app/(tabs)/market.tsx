import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
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
import { MarketListing } from "@/lib/storage";

function ListingCard({
  listing,
  colors,
  isOwner,
  onDelete,
}: {
  listing: MarketListing;
  colors: ReturnType<typeof useThemeColors>;
  isOwner: boolean;
  onDelete: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.listingCard,
        { backgroundColor: colors.card, borderColor: colors.borderLight, opacity: pressed ? 0.9 : 1 },
      ]}
      onPress={() => router.push({ pathname: "/card/[id]", params: { id: listing.cardId } })}
    >
      <Image source={{ uri: listing.cardImage }} style={styles.listingImage} contentFit="contain" />
      <View style={styles.listingInfo}>
        <View style={styles.listingHeader}>
          <View
            style={[
              styles.listingBadge,
              { backgroundColor: listing.type === "sale" ? colors.success : colors.pokemonBlue },
            ]}
          >
            <Text style={styles.listingBadgeText}>
              {listing.type === "sale" ? "FOR SALE" : "TRADE"}
            </Text>
          </View>
        </View>
        <Text style={[styles.listingName, { color: colors.text }]} numberOfLines={1}>
          {listing.cardName}
        </Text>
        <Text style={[styles.listingSet, { color: colors.textSecondary }]} numberOfLines={1}>
          {listing.setName}
        </Text>
        <Text style={[styles.listingCondition, { color: colors.textMuted }]}>
          {listing.condition}
        </Text>
        {listing.priceGBP && (
          <Text style={[styles.listingPrice, { color: colors.success }]}>
            {formatGBP(listing.priceGBP)}
          </Text>
        )}
        <Text style={[styles.listingUser, { color: colors.textMuted }]}>
          by {listing.userName}
        </Text>
      </View>
      {isOwner && (
        <Pressable
          style={[styles.deleteBtn, { backgroundColor: colors.pokemonRed }]}
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Ionicons name="trash-outline" size={16} color="#FFF" />
        </Pressable>
      )}
    </Pressable>
  );
}

export default function MarketScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { user, listings, deleteListing, togglePremium, isStaff } = useUser();
  const [filter, setFilter] = useState<"all" | "sale" | "trade">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  }, []);

  const filtered = listings.filter((l) => {
    if (filter === "all") return true;
    return l.type === filter;
  });

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={colorScheme === "dark" ? ["#2A0A0A", "#1A1A2E"] : ["#FFF0F0", "#F5F5F5"]}
          style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}
        >
          <View style={styles.titleRow}>
            <Ionicons name="storefront" size={22} color={colors.pokemonRed} />
            <Text style={[styles.title, { color: colors.text }]}>Marketplace</Text>
          </View>
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <Ionicons name="storefront-outline" size={56} color={colors.pokemonRed + "40"} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Sign In Required</Text>
          <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
            Create an account to access the marketplace
          </Text>
          <Pressable
            style={styles.signInBtnWrap}
            onPress={() => router.push("/register")}
          >
            <LinearGradient
              colors={["#CC0000", "#8B0000"]}
              style={styles.signInGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
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
            <Ionicons name="storefront" size={22} color={colors.pokemonRed} />
            <Text style={[styles.title, { color: colors.text }]}>Marketplace</Text>
          </View>
        </LinearGradient>
        <View style={styles.premiumContainer}>
          <LinearGradient
            colors={[colors.pokemonYellow, "#FF9800"]}
            style={styles.premiumCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons name="pokeball" size={48} color="#000" />
            <Text style={styles.premiumTitle}>Premium Required</Text>
            <Text style={styles.premiumDesc}>
              Upgrade to Premium to list cards for trade or sale and browse marketplace listings from other collectors.
            </Text>
            <Pressable
              style={styles.premiumBtn}
              onPress={() => {
                togglePremium();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }}
            >
              <Text style={styles.premiumBtnText}>Activate Premium</Text>
            </Pressable>
          </LinearGradient>

          <View style={styles.premiumFeatures}>
            {["List cards for trade", "List cards for sale", "Browse other collectors", "Direct messaging"].map(
              (feature, i) => (
                <View key={i} style={styles.premiumFeatureRow}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.pokemonRed} />
                  <Text style={[styles.premiumFeatureText, { color: colors.text }]}>{feature}</Text>
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
      <LinearGradient
        colors={colorScheme === "dark" ? ["#2A0A0A", "#1A1A2E"] : ["#FFF0F0", "#F5F5F5"]}
        style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}
      >
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <Ionicons name="storefront" size={22} color={colors.pokemonRed} />
            <Text style={[styles.title, { color: colors.text }]}>Marketplace</Text>
          </View>
          <View style={[styles.premiumBadge, { backgroundColor: colors.pokemonYellow }]}>
            <MaterialCommunityIcons name="pokeball" size={12} color="#000" />
            <Text style={styles.premiumBadgeText}>PREMIUM</Text>
          </View>
        </View>
        <View style={styles.filterRow}>
          {(["all", "sale", "trade"] as const).map((f) => (
            <Pressable
              key={f}
              style={[styles.filterBtn, filter === f && { backgroundColor: colors.pokemonRed }]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[styles.filterBtnText, { color: filter === f ? "#FFF" : colors.textSecondary }]}
              >
                {f === "all" ? "All" : f === "sale" ? "For Sale" : "Trades"}
              </Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      <FlatList
        data={filtered}
        renderItem={({ item }) => (
          <ListingCard
            listing={item}
            colors={colors}
            isOwner={item.userId === user.id || isStaff}
            onDelete={() => {
              const isOwn = item.userId === user.id;
              Alert.alert(
                "Remove Listing",
                isOwn
                  ? "Remove this listing from the marketplace?"
                  : `Remove "${item.cardName}" by ${item.userName}? (Staff action)`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => deleteListing(item.id),
                  },
                ]
              );
            }}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.pokemonRed}
            colors={[colors.pokemonRed]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="pricetags-outline" size={56} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              No Listings Yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              Open a card from your collection and tap "List for Sale" or "List for Trade"
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 10 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 28, fontFamily: "Outfit_700Bold" },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumBadgeText: { fontSize: 10, fontFamily: "Outfit_700Bold", color: "#000" },
  filterRow: { flexDirection: "row", gap: 8 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  filterBtnText: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  listContent: { paddingHorizontal: 20, paddingTop: 8 },
  listingCard: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    gap: 10,
  },
  listingImage: { width: 56, height: 78, borderRadius: 6 },
  listingInfo: { flex: 1, gap: 2 },
  listingHeader: { flexDirection: "row" },
  listingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  listingBadgeText: { fontSize: 9, fontFamily: "Outfit_700Bold", color: "#FFF" },
  listingName: { fontSize: 15, fontFamily: "Outfit_600SemiBold" },
  listingSet: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  listingCondition: { fontSize: 11, fontFamily: "Outfit_500Medium" },
  listingPrice: { fontSize: 14, fontFamily: "Outfit_700Bold" },
  listingUser: { fontSize: 11, fontFamily: "Outfit_400Regular" },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 18, fontFamily: "Outfit_600SemiBold" },
  emptySubtext: { fontSize: 13, fontFamily: "Outfit_400Regular", textAlign: "center", paddingHorizontal: 40 },
  signInBtnWrap: { marginTop: 8 },
  signInGradient: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  signInBtnText: { fontSize: 15, fontFamily: "Outfit_600SemiBold", color: "#FFF" },
  premiumContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  premiumCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 12,
  },
  premiumTitle: { fontSize: 22, fontFamily: "Outfit_700Bold", color: "#000" },
  premiumDesc: { fontSize: 14, fontFamily: "Outfit_400Regular", color: "#000", textAlign: "center", opacity: 0.7 },
  premiumBtn: {
    backgroundColor: "#000",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  premiumBtnText: { fontSize: 15, fontFamily: "Outfit_700Bold", color: "#FFDE00" },
  premiumFeatures: { marginTop: 24, gap: 14 },
  premiumFeatureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  premiumFeatureText: { fontSize: 15, fontFamily: "Outfit_500Medium" },
});
