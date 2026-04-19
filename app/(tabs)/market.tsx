import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ScrollView,
  Pressable,
  Modal,
  useColorScheme,
  Platform,
  Alert,
  RefreshControl,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { useThemeColors } from "@/constants/colors";
import { useUser } from "@/lib/user-context";
import { formatGBP, fetchCard } from "@/lib/pokemon-api";
import { MarketListing } from "@/lib/storage";
import PokeBackground from "@/components/PokeBackground";
import { socialApi } from "@/lib/social-api";

const REPORT_REASONS = [
  "Spam or advertising",
  "Fake or misleading listing",
  "Inappropriate content",
  "Suspicious pricing",
  "Other",
];

function ListingDetailModal({
  listing,
  visible,
  colors,
  isOwner,
  currentUserId,
  onClose,
  onDelete,
  onMessage,
  onReport,
}: {
  listing: MarketListing | null;
  visible: boolean;
  colors: ReturnType<typeof useThemeColors>;
  isOwner: boolean;
  currentUserId: string;
  onClose: () => void;
  onDelete: () => void;
  onMessage: () => void;
  onReport: (reason: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: cardData } = useQuery({
    queryKey: ["/api/pokemon/cards", listing?.cardId],
    enabled: !!listing?.cardId && visible,
  });

  const card = (cardData as any)?.data ?? (cardData as any);

  if (!listing) return null;

  const hasPhotos = listing.photos && listing.photos.length > 0;
  const canMessage = listing.userId !== currentUserId;

  const handleReport = () => {
    Alert.alert(
      "Report Listing",
      "Why are you reporting this listing?",
      [
        ...REPORT_REASONS.map((reason) => ({
          text: reason,
          onPress: () => onReport(reason),
        })),
        { text: "Cancel", style: "cancel" as const },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[modalStyles.container, { backgroundColor: colors.background }]}>
        {/* Header bar */}
        <View
          style={[
            modalStyles.header,
            {
              paddingTop: (insets.top || webTopInset) + 12,
              backgroundColor: colors.card,
              borderBottomColor: colors.borderLight,
            },
          ]}
        >
          <Pressable onPress={onClose} hitSlop={12} style={modalStyles.closeBtn}>
            <Ionicons name="chevron-down" size={24} color={colors.textSecondary} />
          </Pressable>
          <Text style={[modalStyles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {listing.cardName}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[modalStyles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        >
          {/* Card image */}
          <View style={modalStyles.imageWrap}>
            <Image
              source={{ uri: listing.cardImage }}
              style={modalStyles.cardImage}
              contentFit="contain"
            />
          </View>

          {/* Card identity */}
          <View style={[modalStyles.section, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            <Text style={[modalStyles.cardName, { color: colors.text }]}>{listing.cardName}</Text>
            <Text style={[modalStyles.setName, { color: colors.textSecondary }]}>{listing.setName}</Text>
            {card?.number && (
              <Text style={[modalStyles.cardMeta, { color: colors.textMuted }]}>
                #{card.number}
                {listing.rarity && listing.rarity !== "Unknown" ? ` · ${listing.rarity}` : ""}
              </Text>
            )}
            {!card?.number && listing.rarity && listing.rarity !== "Unknown" && (
              <Text style={[modalStyles.cardMeta, { color: colors.textMuted }]}>{listing.rarity}</Text>
            )}
          </View>

          {/* Listing details */}
          <View style={[modalStyles.section, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            {/* Type badge + price row */}
            <View style={modalStyles.badgeRow}>
              <View
                style={[
                  modalStyles.typeBadge,
                  { backgroundColor: listing.type === "sale" ? colors.success : colors.pokemonBlue },
                ]}
              >
                <Text style={modalStyles.typeBadgeText}>
                  {listing.type === "sale" ? "FOR SALE" : "TRADE"}
                </Text>
              </View>
              {listing.priceGBP ? (
                <Text style={[modalStyles.price, { color: colors.success }]}>
                  {formatGBP(listing.priceGBP)}
                </Text>
              ) : null}
            </View>

            {/* Condition */}
            <View style={modalStyles.detailRow}>
              <Text style={[modalStyles.detailLabel, { color: colors.textMuted }]}>Condition</Text>
              <Text style={[modalStyles.detailValue, { color: colors.text }]}>{listing.condition}</Text>
            </View>

            {/* Seller */}
            <View style={modalStyles.detailRow}>
              <Text style={[modalStyles.detailLabel, { color: colors.textMuted }]}>Seller</Text>
              <Text style={[modalStyles.detailValue, { color: colors.text }]}>{listing.userName}</Text>
            </View>

            {/* Description */}
            {!!listing.description && (
              <View style={[modalStyles.descriptionWrap, { borderTopColor: colors.borderLight }]}>
                <Text style={[modalStyles.detailLabel, { color: colors.textMuted, marginBottom: 4 }]}>Description</Text>
                <Text style={[modalStyles.descriptionText, { color: colors.textSecondary }]}>
                  {listing.description}
                </Text>
              </View>
            )}
          </View>

          {/* Moderation status (owner only, non-approved) */}
          {isOwner && listing.status !== "approved" && (
            <View
              style={[
                modalStyles.statusBanner,
                {
                  backgroundColor: listing.status === "rejected" ? colors.error + "18" : "#E67E2218",
                  borderColor: listing.status === "rejected" ? colors.error + "40" : "#E67E2240",
                },
              ]}
            >
              <Ionicons
                name={listing.status === "rejected" ? "close-circle-outline" : "time-outline"}
                size={16}
                color={listing.status === "rejected" ? colors.error : "#E67E22"}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    modalStyles.statusTitle,
                    { color: listing.status === "rejected" ? colors.error : "#E67E22" },
                  ]}
                >
                  {listing.status === "rejected" ? "Rejected by moderation" : "Awaiting approval"}
                </Text>
                {!!listing.reviewNote && (
                  <Text style={[modalStyles.statusNote, { color: colors.textMuted }]}>{listing.reviewNote}</Text>
                )}
              </View>
            </View>
          )}

          {/* External URL */}
          {!!listing.externalUrl && (
            <Pressable
              style={[modalStyles.externalBtn, { backgroundColor: colors.card, borderColor: colors.pokemonBlue + "50" }]}
              onPress={() => Linking.openURL(listing.externalUrl!)}
            >
              <Ionicons name="open-outline" size={18} color={colors.pokemonBlue} />
              <Text style={[modalStyles.externalBtnText, { color: colors.pokemonBlue }]}>
                View External Listing
              </Text>
            </Pressable>
          )}

          {/* Photos */}
          {hasPhotos && (
            <View style={[modalStyles.section, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
              <Text style={[modalStyles.detailLabel, { color: colors.textMuted, marginBottom: 10 }]}>
                Seller Photos
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10 }}
              >
                {listing.photos.map((uri, idx) => (
                  <Image
                    key={idx}
                    source={{ uri }}
                    style={modalStyles.photo}
                    contentFit="cover"
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>

        {/* Bottom action bar */}
        <View
          style={[
            modalStyles.actionBar,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.borderLight,
              paddingBottom: insets.bottom + 12,
            },
          ]}
        >
          {canMessage && (
            <Pressable
              style={[modalStyles.actionBtn, { backgroundColor: colors.pokemonBlue, flex: 1 }]}
              onPress={onMessage}
            >
              <Ionicons name="mail-outline" size={16} color="#FFF" />
              <Text style={modalStyles.actionBtnText}>Message Seller</Text>
            </Pressable>
          )}
          {!isOwner && (
            <Pressable
              style={[modalStyles.actionBtn, { backgroundColor: colors.error + "CC", flex: canMessage ? 0 : 1 }]}
              onPress={handleReport}
            >
              <Ionicons name="flag-outline" size={16} color="#FFF" />
              <Text style={modalStyles.actionBtnText}>Report</Text>
            </Pressable>
          )}
          {isOwner && (
            <Pressable
              style={[modalStyles.actionBtn, { backgroundColor: colors.error, flex: 1 }]}
              onPress={onDelete}
            >
              <Ionicons name="trash-outline" size={16} color="#FFF" />
              <Text style={modalStyles.actionBtnText}>Delete Listing</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

function ListingCard({
  listing,
  colors,
  onPress,
}: {
  listing: MarketListing;
  colors: ReturnType<typeof useThemeColors>;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.listingCard,
        { backgroundColor: colors.card, borderColor: colors.borderLight, opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={onPress}
    >
      <Image source={{ uri: listing.cardImage }} style={styles.listingImage} contentFit="contain" />
      <View style={styles.listingInfo}>
        <Text style={[styles.listingName, { color: colors.text }]} numberOfLines={1}>
          {listing.cardName}
        </Text>
        <Text style={[styles.listingUser, { color: colors.textMuted }]}>
          {listing.userName}
        </Text>
      </View>
      <View style={styles.listingRight}>
        {listing.type === "sale" && listing.priceGBP ? (
          <Text style={[styles.listingPrice, { color: colors.success }]}>
            {formatGBP(listing.priceGBP)}
          </Text>
        ) : (
          <View style={[styles.tradeBadge, { backgroundColor: colors.pokemonBlue }]}>
            <Text style={styles.tradeBadgeText}>TRADE</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ marginTop: 2 }} />
      </View>
    </Pressable>
  );
}

export default function MarketScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { user, listings, deleteListing, isStaff, refreshData } = useUser();
  const [filter, setFilter] = useState<"all" | "sale" | "trade">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedListing, setSelectedListing] = useState<MarketListing | null>(null);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshData]);

  const filtered = listings.filter((l) => {
    if (filter === "all") return true;
    return l.type === filter;
  });

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const handleDelete = useCallback(
    (item: MarketListing) => {
      const isOwn = item.userId === user?.id;
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
            onPress: () => {
              setSelectedListing(null);
              deleteListing(item.id);
            },
          },
        ]
      );
    },
    [user, deleteListing]
  );

  const handleReport = useCallback(
    async (item: MarketListing, reason: string) => {
      try {
        await socialApi.submitReport(
          "listing",
          item.id,
          reason,
          {
            cardName: item.cardName,
            setName: item.setName,
            condition: item.condition,
            type: item.type,
            priceGBP: item.priceGBP,
            cardImage: item.cardImage,
            userName: item.userName,
          },
          item.userId
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSelectedListing(null);
        Alert.alert("Reported", "Thanks for the report. Our team will review it.");
      } catch (e: any) {
        Alert.alert(
          "Error",
          e.message === "You already reported this content"
            ? "You have already reported this listing."
            : "Could not submit report."
        );
      }
    },
    []
  );

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
          <Pressable style={styles.signInBtnWrap} onPress={() => router.push("/register")}>
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
              style={[styles.premiumBtn, { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(0,0,0,0.20)" }]}
              onPress={() => router.push("/premium")}
            >
              <MaterialCommunityIcons name="star-circle" size={18} color="#000" />
              <Text style={[styles.premiumBtnText, { color: "#000" }]}>Upgrade to Premium</Text>
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
      <PokeBackground opacity={colorScheme === "dark" ? 0.18 : 0.12} />
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
              <Text style={[styles.filterBtnText, { color: filter === f ? "#FFF" : colors.textSecondary }]}>
                {f === "all" ? "All" : f === "sale" ? "For Sale" : "Trades"}
              </Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      <FlatList
        data={filtered}
        ListHeaderComponent={
          <View style={[styles.disclaimer, { backgroundColor: colors.card, borderColor: colors.pokemonYellow + "55" }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.pokemonYellow} style={{ marginTop: 1 }} />
            <Text style={[styles.disclaimerText, { color: colors.textMuted }]}>
              PokeScan TCG is an advertising platform only. We are not involved in any trades or sales between users and accept no responsibility for lost, stolen, or undelivered cards. All exchanges are carried out entirely between buyers and sellers at their own risk.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ListingCard
            listing={item}
            colors={colors}
            onPress={() => setSelectedListing(item)}
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
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No Listings Yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              Open a card from your collection and tap "List for Sale" or "List for Trade"
            </Text>
          </View>
        }
      />

      {selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          visible={!!selectedListing}
          colors={colors}
          isOwner={selectedListing.userId === user.id || isStaff}
          currentUserId={user.id}
          onClose={() => setSelectedListing(null)}
          onDelete={() => handleDelete(selectedListing)}
          onMessage={() => {
            setSelectedListing(null);
            router.push({
              pathname: "/messages",
              params: {
                recipientId: selectedListing.userId,
                recipientName: selectedListing.userName,
                recipientUsername: selectedListing.userName,
              },
            });
          }}
          onReport={(reason) => handleReport(selectedListing, reason)}
        />
      )}
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
  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  disclaimerText: { flex: 1, fontSize: 11, fontFamily: "Outfit_400Regular", lineHeight: 16 },
  listingCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    borderWidth: 1,
    gap: 12,
  },
  listingImage: { width: 46, height: 64, borderRadius: 5 },
  listingInfo: { flex: 1, gap: 3 },
  listingName: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  listingUser: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  listingRight: { alignItems: "flex-end", gap: 4 },
  listingPrice: { fontSize: 15, fontFamily: "Outfit_700Bold" },
  tradeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tradeBadgeText: { fontSize: 9, fontFamily: "Outfit_700Bold", color: "#FFF" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 18, fontFamily: "Outfit_600SemiBold" },
  emptySubtext: { fontSize: 13, fontFamily: "Outfit_400Regular", textAlign: "center", paddingHorizontal: 40 },
  signInBtnWrap: { marginTop: 8 },
  signInGradient: { paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  signInBtnText: { fontSize: 15, fontFamily: "Outfit_600SemiBold", color: "#FFF" },
  premiumContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  premiumCard: { borderRadius: 20, padding: 28, alignItems: "center", gap: 12 },
  premiumTitle: { fontSize: 22, fontFamily: "Outfit_700Bold", color: "#000" },
  premiumDesc: { fontSize: 14, fontFamily: "Outfit_400Regular", color: "#000", textAlign: "center", opacity: 0.7 },
  premiumBtn: { backgroundColor: "#000", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 4 },
  premiumBtnText: { fontSize: 15, fontFamily: "Outfit_700Bold", color: "#FFDE00" },
  premiumFeatures: { marginTop: 24, gap: 14 },
  premiumFeatureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  premiumFeatureText: { fontSize: 15, fontFamily: "Outfit_500Medium" },
});

const modalStyles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  closeBtn: { width: 36, alignItems: "flex-start" },
  headerTitle: { flex: 1, fontSize: 16, fontFamily: "Outfit_600SemiBold", textAlign: "center" },
  scrollContent: { padding: 16, gap: 12 },
  imageWrap: { alignItems: "center", paddingVertical: 16 },
  cardImage: { width: 200, height: 280 },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  cardName: { fontSize: 20, fontFamily: "Outfit_700Bold" },
  setName: { fontSize: 14, fontFamily: "Outfit_500Medium" },
  cardMeta: { fontSize: 13, fontFamily: "Outfit_400Regular" },
  badgeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  typeBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  typeBadgeText: { fontSize: 11, fontFamily: "Outfit_700Bold", color: "#FFF" },
  price: { fontSize: 22, fontFamily: "Outfit_700Bold" },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  detailLabel: { fontSize: 13, fontFamily: "Outfit_500Medium" },
  detailValue: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  descriptionWrap: { borderTopWidth: 1, paddingTop: 10, marginTop: 4 },
  descriptionText: { fontSize: 14, fontFamily: "Outfit_400Regular", lineHeight: 20 },
  statusBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  statusTitle: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  statusNote: { fontSize: 12, fontFamily: "Outfit_400Regular", marginTop: 2 },
  externalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  externalBtnText: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  photo: { width: 130, height: 130, borderRadius: 10 },
  actionBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  actionBtnText: { fontSize: 14, fontFamily: "Outfit_600SemiBold", color: "#FFF" },
});
