import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  useColorScheme,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/constants/colors";
import { useUser } from "@/lib/user-context";
import { formatGBP } from "@/lib/pokemon-api";

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { user, collection, collectionValue, listings, logout, togglePremium, isStaff, isSuperadminUser } = useUser();

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const totalCards = collection.reduce((sum, item) => sum + item.quantity, 0);
  const myListings = listings.filter((l) => l.userId === user?.id);

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={colorScheme === "dark" ? ["#2A0A0A", "#1A1A2E"] : ["#FFF0F0", "#F5F5F5"]}
          style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}
        >
          <View style={styles.titleRow}>
            <Ionicons name="person-circle" size={24} color={colors.pokemonRed} />
            <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
          </View>
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.pokemonRed + "20" }]}>
            <MaterialCommunityIcons name="pokeball" size={48} color={colors.pokemonRed} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
            Welcome to PokeScan TCG
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
            Create an account to track your collection, get price alerts, and join the marketplace
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
              <Text style={styles.signInBtnText}>Create Account</Text>
            </LinearGradient>
          </Pressable>
          <Pressable
            style={styles.staffLink}
            onPress={() => router.push("/admin-login")}
          >
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.staffLinkText, { color: colors.textMuted }]}>Superadmin Login</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
      >
        <LinearGradient
          colors={colorScheme === "dark" ? ["#2A0A0A", "#1A1A2E"] : ["#FFF0F0", "#F5F5F5"]}
          style={{ paddingTop: (insets.top || webTopInset) + 8, paddingHorizontal: 20, paddingBottom: 20 }}
        >
          <View style={styles.titleRow}>
            <Ionicons name="person-circle" size={24} color={colors.pokemonRed} />
            <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
          </View>

          <View style={styles.profileSection}>
            <LinearGradient
              colors={["#CC0000", "#8B0000"]}
              style={styles.avatarCircle}
            >
              <Text style={styles.avatarText}>
                {user.displayName.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
            <Text style={[styles.displayName, { color: colors.text }]}>{user.displayName}</Text>
            <Text style={[styles.username, { color: colors.textSecondary }]}>@{user.username}</Text>
            {user.isPremium && (
              <View style={[styles.premiumTag, { backgroundColor: colors.pokemonYellow }]}>
                <MaterialCommunityIcons name="pokeball" size={12} color="#000" />
                <Text style={styles.premiumTagText}>PREMIUM</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        <View style={styles.statsSection}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.pokemonRed + "30" }]}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{totalCards}</Text>
            <Text style={[styles.statDesc, { color: colors.textSecondary }]}>Total Cards</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.pokemonYellow + "30" }]}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{collection.length}</Text>
            <Text style={[styles.statDesc, { color: colors.textSecondary }]}>Unique Cards</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.success + "30" }]}>
            <Text style={[styles.statNumber, { color: colors.success }]}>{formatGBP(collectionValue)}</Text>
            <Text style={[styles.statDesc, { color: colors.textSecondary }]}>Collection Value</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.pokemonBlue + "30" }]}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{myListings.length}</Text>
            <Text style={[styles.statDesc, { color: colors.textSecondary }]}>Listings</Text>
          </View>
        </View>

        {!user.isPremium && (
          <Pressable
            onPress={() => {
              togglePremium();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }}
          >
            <LinearGradient
              colors={[colors.pokemonYellow, "#FF9800"]}
              style={styles.premiumBanner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialCommunityIcons name="pokeball" size={24} color="#000" />
              <View style={{ flex: 1 }}>
                <Text style={styles.premiumBannerTitle}>Upgrade to Premium</Text>
                <Text style={styles.premiumBannerDesc}>
                  Access the marketplace to trade and sell cards
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#000" />
            </LinearGradient>
          </Pressable>
        )}

        <View style={styles.menuSection}>
          {isStaff && (
            <Pressable
              style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.pokemonRed + "30" }]}
              onPress={() => router.push("/admin-panel")}
            >
              <Ionicons name="shield-checkmark" size={22} color={colors.pokemonRed} />
              <Text style={[styles.menuText, { color: colors.text }]}>
                {isSuperadminUser ? "Superadmin Panel" : user.role === "admin" ? "Admin Panel" : "Moderator Panel"}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          )}

          {user.isPremium && (
            <Pressable
              style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
              onPress={() => {
                togglePremium();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Ionicons name="diamond-outline" size={22} color={colors.warning} />
              <Text style={[styles.menuText, { color: colors.text }]}>Cancel Premium</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          )}

          <Pressable
            style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
            onPress={() => {
              Alert.alert("Sign Out", "Are you sure you want to sign out?", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Sign Out",
                  style: "destructive",
                  onPress: () => {
                    logout();
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  },
                },
              ]);
            }}
          >
            <Ionicons name="log-out-outline" size={22} color={colors.pokemonRed} />
            <Text style={[styles.menuText, { color: colors.pokemonRed }]}>Sign Out</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        <Text style={[styles.versionText, { color: colors.textMuted }]}>
          PokeScan TCG v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {},
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  title: { fontSize: 28, fontFamily: "Outfit_700Bold" },
  profileSection: { alignItems: "center", marginBottom: 4 },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  avatarText: { fontSize: 32, fontFamily: "Outfit_700Bold", color: "#FFF" },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  displayName: { fontSize: 22, fontFamily: "Outfit_700Bold" },
  username: { fontSize: 14, fontFamily: "Outfit_400Regular" },
  premiumTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  premiumTagText: { fontSize: 11, fontFamily: "Outfit_700Bold", color: "#000" },
  statsSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
    marginTop: 16,
  },
  statCard: {
    width: "47%",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    gap: 4,
  },
  statNumber: { fontSize: 20, fontFamily: "Outfit_700Bold" },
  statDesc: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  premiumBanner: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  premiumBannerTitle: { fontSize: 16, fontFamily: "Outfit_700Bold", color: "#000" },
  premiumBannerDesc: { fontSize: 12, fontFamily: "Outfit_400Regular", color: "#000", opacity: 0.7 },
  menuSection: { paddingHorizontal: 20, gap: 8, marginBottom: 20 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  menuText: { flex: 1, fontSize: 15, fontFamily: "Outfit_500Medium" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60, gap: 8, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 20, fontFamily: "Outfit_600SemiBold" },
  emptySubtext: { fontSize: 13, fontFamily: "Outfit_400Regular", textAlign: "center", paddingHorizontal: 20 },
  signInBtnWrap: { marginTop: 12 },
  signInGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  signInBtnText: { fontSize: 16, fontFamily: "Outfit_600SemiBold", color: "#FFF" },
  staffLink: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 20 },
  staffLinkText: { fontSize: 13, fontFamily: "Outfit_500Medium" },
  versionText: { fontSize: 12, fontFamily: "Outfit_400Regular", textAlign: "center", marginTop: 8 },
});
