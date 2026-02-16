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
  ScrollView,
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
import { MarketListing, UserProfile } from "@/lib/storage";

type Tab = "listings" | "users";

function ListingRow({
  listing,
  colors,
  onRemove,
}: {
  listing: MarketListing;
  colors: ReturnType<typeof useThemeColors>;
  onRemove: () => void;
}) {
  const timeAgo = getTimeAgo(listing.createdAt);

  return (
    <View style={[styles.listingRow, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
      <Image source={{ uri: listing.cardImage }} style={styles.listingImg} contentFit="contain" />
      <View style={styles.listingDetails}>
        <View style={styles.listingTopRow}>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: listing.type === "sale" ? colors.success : colors.accent },
            ]}
          >
            <Text style={styles.typeBadgeText}>
              {listing.type === "sale" ? "SALE" : "TRADE"}
            </Text>
          </View>
          <Text style={[styles.timeText, { color: colors.textMuted }]}>{timeAgo}</Text>
        </View>
        <Text style={[styles.listingTitle, { color: colors.text }]} numberOfLines={1}>
          {listing.cardName}
        </Text>
        <Text style={[styles.listingMeta, { color: colors.textSecondary }]} numberOfLines={1}>
          {listing.setName} - {listing.condition}
        </Text>
        <View style={styles.listingBottomRow}>
          <View style={styles.sellerInfo}>
            <Ionicons name="person-outline" size={12} color={colors.textMuted} />
            <Text style={[styles.sellerName, { color: colors.textMuted }]}>{listing.userName}</Text>
          </View>
          {listing.priceGBP && (
            <Text style={[styles.listingPriceText, { color: colors.success }]}>
              {formatGBP(listing.priceGBP)}
            </Text>
          )}
        </View>
      </View>
      <Pressable
        style={[styles.removeBtn, { backgroundColor: "rgba(231, 76, 60, 0.15)" }]}
        onPress={onRemove}
      >
        <Ionicons name="trash-outline" size={18} color={colors.error} />
      </Pressable>
    </View>
  );
}

function UserRow({
  profile,
  colors,
  isCurrentUser,
  isAdminUser,
  onTogglePremium,
}: {
  profile: UserProfile;
  colors: ReturnType<typeof useThemeColors>;
  isCurrentUser: boolean;
  isAdminUser: boolean;
  onTogglePremium: () => void;
}) {
  const roleColor = profile.role === "admin" ? "#E74C3C" : profile.role === "moderator" ? "#E67E22" : colors.textMuted;

  return (
    <View style={[styles.userRow, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
      <View style={[styles.userAvatar, { backgroundColor: profile.role !== "user" ? roleColor : colors.surfaceElevated }]}>
        <Text style={[styles.userAvatarText, { color: profile.role !== "user" ? "#FFF" : colors.text }]}>
          {profile.displayName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.userDetails}>
        <View style={styles.userNameRow}>
          <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
            {profile.displayName}
          </Text>
          {isCurrentUser && (
            <View style={[styles.youBadge, { backgroundColor: colors.accent }]}>
              <Text style={styles.youBadgeText}>YOU</Text>
            </View>
          )}
        </View>
        <Text style={[styles.userHandle, { color: colors.textSecondary }]}>@{profile.username}</Text>
        <View style={styles.userTagsRow}>
          <View style={[styles.roleBadge, { backgroundColor: roleColor }]}>
            <Text style={styles.roleBadgeText}>{profile.role.toUpperCase()}</Text>
          </View>
          {profile.isPremium && (
            <View style={[styles.premBadge, { backgroundColor: colors.gold }]}>
              <Ionicons name="diamond" size={10} color="#000" />
              <Text style={styles.premBadgeText}>PREMIUM</Text>
            </View>
          )}
        </View>
      </View>
      {profile.role === "user" && isAdminUser && (
        <Pressable
          style={[
            styles.premiumToggleBtn,
            {
              backgroundColor: profile.isPremium
                ? "rgba(231, 76, 60, 0.15)"
                : "rgba(46, 204, 113, 0.15)",
            },
          ]}
          onPress={onTogglePremium}
        >
          <Ionicons
            name={profile.isPremium ? "close-circle" : "diamond"}
            size={16}
            color={profile.isPremium ? colors.error : colors.success}
          />
          <Text
            style={[
              styles.premiumToggleText,
              { color: profile.isPremium ? colors.error : colors.success },
            ]}
          >
            {profile.isPremium ? "Revoke" : "Grant"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AdminPanelScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const {
    user,
    listings,
    allUsers,
    deleteListing,
    grantPremium,
    revokePremium,
    isStaff,
    isAdminUser,
    logout,
  } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>("listings");

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const handleRemoveListing = useCallback(
    (listing: MarketListing) => {
      Alert.alert(
        "Remove Listing",
        `Remove "${listing.cardName}" by ${listing.userName} from the marketplace?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => {
              deleteListing(listing.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            },
          },
        ]
      );
    },
    [deleteListing]
  );

  const handleTogglePremium = useCallback(
    (profile: UserProfile) => {
      const action = profile.isPremium ? "Revoke" : "Grant";
      Alert.alert(
        `${action} Premium`,
        `${action} premium access for ${profile.displayName} (@${profile.username})?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: action,
            style: profile.isPremium ? "destructive" : "default",
            onPress: () => {
              if (profile.isPremium) {
                revokePremium(profile.id);
              } else {
                grantPremium(profile.id);
              }
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ]
      );
    },
    [grantPremium, revokePremium]
  );

  if (!user || !isStaff) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.topBar, { paddingTop: (insets.top || webTopInset) + 4 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="lock-closed" size={56} color={colors.error} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Access Denied</Text>
          <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
            You must be logged in as staff to view this page
          </Text>
        </View>
      </View>
    );
  }

  const regularUsers = allUsers.filter((u) => u.role === "user");
  const staffUsers = allUsers.filter((u) => u.role !== "user");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: (insets.top || webTopInset) + 4 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.topBarCenter}>
          <LinearGradient
            colors={["#E74C3C", "#C0392B"]}
            style={styles.staffBadgeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="shield-checkmark" size={14} color="#FFF" />
            <Text style={styles.staffBadgeText}>
              {user.role === "admin" ? "ADMIN" : "MODERATOR"}
            </Text>
          </LinearGradient>
        </View>
        <Pressable
          onPress={() => {
            Alert.alert("Sign Out", "Sign out of staff account?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Sign Out",
                style: "destructive",
                onPress: () => {
                  logout();
                  router.replace("/(tabs)/profile");
                },
              },
            ]);
          }}
          style={styles.logoutBtn}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.error} />
        </Pressable>
      </View>

      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === "listings" && styles.tabActive]}
          onPress={() => setActiveTab("listings")}
        >
          <MaterialCommunityIcons
            name="store-outline"
            size={18}
            color={activeTab === "listings" ? "#FFF" : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "listings" ? "#FFF" : colors.textMuted },
            ]}
          >
            Listings ({listings.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "users" && styles.tabActive]}
          onPress={() => setActiveTab("users")}
        >
          <Ionicons
            name="people-outline"
            size={18}
            color={activeTab === "users" ? "#FFF" : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "users" ? "#FFF" : colors.textMuted },
            ]}
          >
            Users ({allUsers.length})
          </Text>
        </Pressable>
      </View>

      {activeTab === "listings" && (
        <FlatList
          data={listings}
          renderItem={({ item }) => (
            <ListingRow
              listing={item}
              colors={colors}
              onRemove={() => handleRemoveListing(item)}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            listings.length > 0 ? (
              <View style={[styles.summaryBar, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {listings.filter((l) => l.type === "sale").length}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>For Sale</Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {listings.filter((l) => l.type === "trade").length}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Trades</Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{listings.length}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total</Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="store-check-outline" size={56} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                No Active Listings
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                All clear - no marketplace listings to review
              </Text>
            </View>
          }
        />
      )}

      {activeTab === "users" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
        >
          {staffUsers.length > 0 && (
            <>
              <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
                STAFF ({staffUsers.length})
              </Text>
              {staffUsers.map((u) => (
                <UserRow
                  key={u.id}
                  profile={u}
                  colors={colors}
                  isCurrentUser={u.id === user.id}
                  isAdminUser={isAdminUser}
                  onTogglePremium={() => handleTogglePremium(u)}
                />
              ))}
            </>
          )}

          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
            USERS ({regularUsers.length})
          </Text>
          {regularUsers.length > 0 ? (
            regularUsers.map((u) => (
              <UserRow
                key={u.id}
                profile={u}
                colors={colors}
                isCurrentUser={u.id === user.id}
                isAdminUser={isAdminUser}
                onTogglePremium={() => handleTogglePremium(u)}
              />
            ))
          ) : (
            <View style={[styles.noUsersBox, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <Ionicons name="people-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.noUsersText, { color: colors.textMuted }]}>
                No regular users registered yet
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  topBarCenter: { flex: 1, alignItems: "center" },
  staffBadgeGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  staffBadgeText: { fontSize: 12, fontFamily: "Outfit_700Bold", color: "#FFF" },
  logoutBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  tabActive: { backgroundColor: "#E74C3C" },
  tabText: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  listContent: { paddingHorizontal: 20 },
  summaryBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { fontSize: 18, fontFamily: "Outfit_700Bold" },
  summaryLabel: { fontSize: 11, fontFamily: "Outfit_400Regular" },
  summaryDivider: { width: 1, height: 28 },
  listingRow: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    gap: 10,
    alignItems: "center",
  },
  listingImg: { width: 50, height: 70, borderRadius: 6 },
  listingDetails: { flex: 1, gap: 2 },
  listingTopRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  typeBadgeText: { fontSize: 9, fontFamily: "Outfit_700Bold", color: "#FFF" },
  timeText: { fontSize: 10, fontFamily: "Outfit_400Regular" },
  listingTitle: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  listingMeta: { fontSize: 11, fontFamily: "Outfit_400Regular" },
  listingBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sellerInfo: { flexDirection: "row", alignItems: "center", gap: 4 },
  sellerName: { fontSize: 11, fontFamily: "Outfit_400Regular" },
  listingPriceText: { fontSize: 13, fontFamily: "Outfit_700Bold" },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    fontSize: 12,
    fontFamily: "Outfit_700Bold",
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 8,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    gap: 10,
  },
  userAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: { fontSize: 17, fontFamily: "Outfit_700Bold" },
  userDetails: { flex: 1, gap: 2 },
  userNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  userName: { fontSize: 15, fontFamily: "Outfit_600SemiBold" },
  youBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  youBadgeText: { fontSize: 9, fontFamily: "Outfit_700Bold", color: "#FFF" },
  userHandle: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  userTagsRow: { flexDirection: "row", gap: 6, marginTop: 2 },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  roleBadgeText: { fontSize: 9, fontFamily: "Outfit_700Bold", color: "#FFF" },
  premBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  premBadgeText: { fontSize: 9, fontFamily: "Outfit_700Bold", color: "#000" },
  premiumToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  premiumToggleText: { fontSize: 12, fontFamily: "Outfit_600SemiBold" },
  noUsersBox: {
    alignItems: "center",
    gap: 8,
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
  },
  noUsersText: { fontSize: 13, fontFamily: "Outfit_400Regular" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 18, fontFamily: "Outfit_600SemiBold" },
  emptySubtext: { fontSize: 13, fontFamily: "Outfit_400Regular", textAlign: "center", paddingHorizontal: 40 },
});
