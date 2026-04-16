import React, { useCallback, useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  useColorScheme,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/constants/colors";
import { useUser } from "@/lib/user-context";
import { getSessionToken } from "@/lib/storage";
import { getApiUrl } from "@/lib/query-client";
import { formatGBP } from "@/lib/pokemon-api";
import { useCardCache } from "@/lib/card-cache-context";
import { CacheMeta, LangFilter, LANG_INFO, SyncProgress } from "@/lib/card-cache";
import PokeBackground from "@/components/PokeBackground";
import { socialApi } from "@/lib/social-api";

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { user, collection, collectionValue, listings, logout, isStaff, isSuperadminUser, updateAvatar, revokePremium } = useUser();
  const { cacheStatus, isDownloading, downloadPercent, progress, startDownload, clearCardCache, refreshStatus, selectedLanguages, setSelectedLanguages } = useCardCache();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [collectionVisible, setCollectionVisible] = useState(user?.collectionVisible ?? false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  // ── Cancel premium state ────────────────────────────────────────────────────
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelCode, setCancelCode] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    socialApi.getUnreadCount().then(d => setUnreadCount(d.count)).catch(() => {});
    setCollectionVisible(user.collectionVisible ?? false);
  }, [user]);

  const handleMessageSupport = useCallback(async () => {
    try {
      const url = new URL("/api/support/admin", getApiUrl()).href;
      const res = await fetch(url);
      const data = await res.json();
      if (data.admin) {
        router.push({
          pathname: "/messages",
          params: {
            recipientId: data.admin.id,
            recipientName: "Admin",
            recipientUsername: "admin",
          },
        });
      } else {
        Linking.openURL("mailto:pokescantcg@gmail.com?subject=Support%20Request");
      }
    } catch {
      Linking.openURL("mailto:pokescantcg@gmail.com?subject=Support%20Request");
    }
  }, []);

  const handleToggleCollectionVisible = useCallback(async () => {
    if (!user?.isPremium) return;
    setTogglingVisibility(true);
    const next = !collectionVisible;
    setCollectionVisible(next);
    try {
      await socialApi.setCollectionVisibility(next);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setCollectionVisible(!next);
      Alert.alert("Error", "Failed to update collection visibility.");
    } finally {
      setTogglingVisibility(false);
    }
  }, [user, collectionVisible]);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const totalCards = collection.reduce((sum, item) => sum + item.quantity, 0);
  const myListings = listings.filter((l) => l.userId === user?.id);

  const handlePickAvatar = useCallback(async () => {
    if (!user?.isPremium) {
      Alert.alert("Premium Required", "Upgrade to Premium to set a profile picture.");
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Needed", "Please allow access to your photo library to upload a profile picture.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      setUploadingAvatar(true);

      const asset = result.assets[0];
      let finalUrl: string = asset.uri;

      // Try to upload to server so the picture persists across devices & sessions
      const token = await getSessionToken();
      if (token && asset.base64) {
        try {
          const mimeType = asset.mimeType || "image/jpeg";
          const apiBase = getApiUrl();
          const uploadUrl = new URL("/api/user/avatar", apiBase).toString();
          const resp = await fetch(uploadUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ base64: asset.base64, mimeType }),
          });
          const json = await resp.json();
          if (resp.ok && json.avatarUrl) {
            finalUrl = json.avatarUrl;
          } else {
            console.warn("Avatar upload failed:", json.error);
          }
        } catch (uploadErr) {
          console.warn("Avatar upload error, falling back to local:", uploadErr);
        }
      }

      await updateAvatar(finalUrl);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to update profile picture.");
    } finally {
      setUploadingAvatar(false);
    }
  }, [user?.isPremium, updateAvatar]);

  const handleSync = useCallback(async () => {
    if (isDownloading) return;
    if (selectedLanguages.length === 0) {
      Alert.alert("Select a Language", "Please choose at least one language to download.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await startDownload(selectedLanguages);
      await refreshStatus();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Database Ready!",
        `Cards are now saved on your device for instant searching.`
      );
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Download Failed", e.message || "Could not download card database. Check your connection and try again.");
    }
  }, [isDownloading, startDownload, refreshStatus, selectedLanguages]);

  const handleClearCache = useCallback(() => {
    Alert.alert(
      "Clear Card Database",
      "This will delete all locally saved card data. The app will need to re-download it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await clearCardCache();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        },
      ]
    );
  }, [clearCardCache]);

  const handleToggleLanguage = useCallback((lang: LangFilter) => {
    const next = selectedLanguages.includes(lang)
      ? selectedLanguages.filter((l) => l !== lang)
      : [...selectedLanguages, lang];
    setSelectedLanguages(next);
  }, [selectedLanguages, setSelectedLanguages]);

  // ── Cancel premium handlers ─────────────────────────────────────────────────
  const handleOpenCancelModal = useCallback(() => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setCancelCode(code);
    setCodeInput("");
    setShowCancelModal(true);
  }, []);

  const handleConfirmCancel = useCallback(async () => {
    if (codeInput.trim() !== cancelCode) {
      Alert.alert("Incorrect Code", "The code you entered does not match. Please try again.");
      return;
    }
    setCancelLoading(true);
    try {
      const token = await getSessionToken();
      const apiBase = getApiUrl();
      const url = new URL("/api/user/cancel-premium", apiBase).toString();
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const json = await resp.json();
      if (!resp.ok) {
        Alert.alert("Error", json.error || "Could not cancel premium. Please try again.");
        return;
      }
      setShowCancelModal(false);
      // Update local context immediately so UI reflects the change
      if (user) await revokePremium(user.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Premium Cancelled", "Your premium membership has been cancelled. You can ask an admin to reinstate it at any time.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Network error. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  }, [codeInput, cancelCode]);

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={colorScheme === "dark" ? ["#2A0A0A", "#1A1A2E"] : ["#FFF0F0", "#F5F5F5"]}
          style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}
        >
          <View style={styles.titleRow}>
            <Ionicons name="person-circle" size={24} color={colors.pokemonRed} />
            <Text style={[styles.title, { color: colors.text, flex: 1 }]}>Profile</Text>
            <Image
              source={{ uri: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/133.png" }}
              style={styles.eeveeDecor}
              contentFit="contain"
            />
          </View>
        </LinearGradient>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
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
              testID="create-account-btn"
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
              style={[styles.loginBtnWrap, { borderColor: colors.pokemonRed + "50" }]}
              onPress={() => router.push("/login")}
              testID="sign-in-btn"
            >
              <Text style={[styles.loginBtnText, { color: colors.pokemonRed }]}>Sign In</Text>
            </Pressable>
            <Pressable
              style={styles.staffLink}
              onPress={() => router.push("/admin-login")}
            >
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.staffLinkText, { color: colors.textMuted }]}>Superadmin Login</Text>
            </Pressable>
          </View>

          <View style={[styles.dbSection, { marginTop: 0 }]}>
            <DatabaseSyncCard
              cacheStatus={cacheStatus}
              isSyncing={isDownloading}
              syncPercent={downloadPercent}
              progress={progress}
              selectedLanguages={selectedLanguages}
              onToggleLanguage={handleToggleLanguage}
              onSync={handleSync}
              onClear={handleClearCache}
              colors={colors}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PokeBackground opacity={colorScheme === "dark" ? 0.18 : 0.12} />
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
            <Text style={[styles.title, { color: colors.text, flex: 1 }]}>Profile</Text>
            <Pressable
              onPress={() => router.push("/messages")}
              style={{ marginRight: 10, position: "relative" }}
              testID="messages-icon-btn"
            >
              <Ionicons name="mail-outline" size={24} color={colors.text} />
              {unreadCount > 0 && (
                <View style={[styles.mailBadge, { backgroundColor: colors.pokemonRed }]}>
                  <Text style={styles.mailBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                </View>
              )}
            </Pressable>
            <Image
              source={{ uri: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/133.png" }}
              style={styles.eeveeDecor}
              contentFit="contain"
            />
          </View>

          <View style={styles.profileSection}>
            <Pressable onPress={handlePickAvatar} style={{ marginBottom: 10 }}>
              {user.avatarUrl ? (
                <View style={styles.avatarCircle}>
                  {uploadingAvatar ? (
                    <ActivityIndicator color="#FFF" size="large" />
                  ) : (
                    <Image
                      source={{ uri: user.avatarUrl }}
                      style={{ width: 80, height: 80, borderRadius: 40 }}
                      contentFit="cover"
                    />
                  )}
                  {user.isPremium && (
                    <View style={styles.cameraOverlay}>
                      <Ionicons name="camera" size={14} color="#FFF" />
                    </View>
                  )}
                </View>
              ) : (
                <LinearGradient
                  colors={["#CC0000", "#8B0000"]}
                  style={styles.avatarCircle}
                >
                  {uploadingAvatar ? (
                    <ActivityIndicator color="#FFF" size="large" />
                  ) : (
                    <Text style={styles.avatarText}>
                      {user.displayName.charAt(0).toUpperCase()}
                    </Text>
                  )}
                  {user.isPremium && (
                    <View style={styles.cameraOverlay}>
                      <Ionicons name="camera" size={14} color="#FFF" />
                    </View>
                  )}
                </LinearGradient>
              )}
            </Pressable>
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

        {user.isPremium && !isStaff ? (
          <View style={[styles.premiumBanner, { backgroundColor: colors.card, borderColor: colors.pokemonYellow + "50" }]}>
            <MaterialCommunityIcons name="star-circle" size={24} color={colors.pokemonYellow} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.premiumBannerTitle, { color: colors.pokemonYellow }]}>Premium Member</Text>
              <Text style={[styles.premiumBannerDesc, { color: colors.textMuted }]}>
                You have access to all premium features
              </Text>
            </View>
            <Pressable
              onPress={handleOpenCancelModal}
              style={[styles.cancelPremiumBtn, { borderColor: colors.pokemonRed + "60" }]}
            >
              <Text style={[styles.cancelPremiumBtnText, { color: colors.pokemonRed }]}>Cancel</Text>
            </Pressable>
          </View>
        ) : !user.isPremium ? (
          <Pressable
            style={[styles.premiumBanner, { backgroundColor: colors.card, borderColor: colors.pokemonRed + "60" }]}
            onPress={() => router.push("/premium")}
          >
            <MaterialCommunityIcons name="star-circle" size={24} color={colors.pokemonRed} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.premiumBannerTitle, { color: colors.pokemonRed }]}>Go Premium</Text>
              <Text style={[styles.premiumBannerDesc, { color: colors.textMuted }]}>
                From £4.99/mo · Tap to unlock all features
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}

        {user.isPremium && (
          <Pressable
            style={[styles.premiumBanner, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 0 }]}
            onPress={handleToggleCollectionVisible}
            disabled={togglingVisibility}
          >
            <Ionicons name="albums-outline" size={22} color={collectionVisible ? colors.success : colors.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.premiumBannerTitle, { color: colors.text, fontSize: 14 }]}>
                Collection Visibility
              </Text>
              <Text style={[styles.premiumBannerDesc, { color: colors.textMuted }]}>
                {collectionVisible ? "Friends can view your collection" : "Your collection is private"}
              </Text>
            </View>
            {togglingVisibility ? (
              <ActivityIndicator size="small" color={colors.pokemonRed} />
            ) : (
              <View style={[styles.visToggle, { backgroundColor: collectionVisible ? colors.success : colors.border }]}>
                <View style={[styles.visToggleKnob, { alignSelf: collectionVisible ? "flex-end" : "flex-start" }]} />
              </View>
            )}
          </Pressable>
        )}

        <View style={styles.dbSection}>
          <DatabaseSyncCard
            cacheStatus={cacheStatus}
            isSyncing={isDownloading}
            syncPercent={downloadPercent}
            progress={progress}
            selectedLanguages={selectedLanguages}
            onToggleLanguage={handleToggleLanguage}
            onSync={handleSync}
            onClear={handleClearCache}
            colors={colors}
          />
        </View>

        <View style={styles.helpSection}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>HELP & SUPPORT</Text>

          <Pressable
            style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
            onPress={handleMessageSupport}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.pokemonBlue} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.text }]}>Message Support</Text>
              <Text style={[styles.menuSubtext, { color: colors.textMuted }]}>Chat directly with our team</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          <Pressable
            style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
            onPress={() => Linking.openURL("mailto:pokescantcg@gmail.com?subject=Support%20Request")}
          >
            <Ionicons name="mail-outline" size={22} color={colors.pokemonRed} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.text }]}>Email Support</Text>
              <Text style={[styles.menuSubtext, { color: colors.textMuted }]}>pokescantcg@gmail.com</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

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

      {/* ── Cancel Premium Modal ─────────────────────────────────────────── */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={[styles.cancelModalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="star-off" size={36} color={colors.pokemonRed} style={{ marginBottom: 12 }} />
            <Text style={[styles.cancelModalTitle, { color: colors.text }]}>Cancel Premium</Text>
            <Text style={[styles.cancelModalDesc, { color: colors.textSecondary }]}>
              To confirm cancellation, please enter the code below:
            </Text>
            <View style={[styles.cancelCodeBox, { backgroundColor: colors.surface, borderColor: colors.pokemonRed + "60" }]}>
              <Text style={[styles.cancelCodeText, { color: colors.pokemonRed }]}>{cancelCode}</Text>
            </View>
            <TextInput
              style={[
                styles.cancelCodeInput,
                { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Enter code"
              placeholderTextColor={colors.textMuted}
              value={codeInput}
              onChangeText={setCodeInput}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            <View style={styles.cancelModalBtns}>
              <Pressable
                style={[styles.cancelModalDismiss, { borderColor: colors.border }]}
                onPress={() => setShowCancelModal(false)}
              >
                <Text style={[styles.cancelModalDismissText, { color: colors.textSecondary }]}>Keep Premium</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.cancelModalConfirm,
                  {
                    backgroundColor: codeInput.length === 6 ? colors.pokemonRed : colors.surface,
                    opacity: cancelLoading ? 0.6 : 1,
                  },
                ]}
                onPress={handleConfirmCancel}
                disabled={cancelLoading || codeInput.length < 6}
              >
                {cancelLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.cancelModalConfirmText, { color: codeInput.length === 6 ? "#fff" : colors.textMuted }]}>
                    Confirm Cancel
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// Language rows shown in the database card
const DOWNLOADABLE_LANGS: LangFilter[] = ["english"];
const SCANNER_ONLY_LANGS = [
  { id: "japanese", label: "Japanese", flag: "🇯🇵" },
  { id: "korean",   label: "Korean",   flag: "🇰🇷" },
  { id: "chinese",  label: "Chinese",  flag: "🇨🇳" },
];

function DatabaseSyncCard({
  cacheStatus,
  isSyncing,
  syncPercent,
  progress,
  selectedLanguages,
  onToggleLanguage,
  onSync,
  onClear,
  colors,
}: {
  cacheStatus: CacheMeta | null;
  isSyncing: boolean;
  syncPercent: number;
  progress: SyncProgress | null;
  selectedLanguages: LangFilter[];
  onToggleLanguage: (lang: LangFilter) => void;
  onSync: () => void;
  onClear: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const hasData = cacheStatus && cacheStatus.totalCards > 0;
  const isComplete = hasData && cacheStatus.cachedSets >= cacheStatus.totalSets;

  // Which languages are already fully or partially downloaded
  const downloadedLangs = new Set<LangFilter>(cacheStatus?.selectedLanguages ?? []);

  // Button label
  const syncLabel = (() => {
    if (!isSyncing) {
      if (!hasData) return "Download";
      if (!isComplete) return "Resume Download";
      return "Sync Updates";
    }
    if (progress?.stage === "sets") return "Fetching sets…";
    if (progress?.stage === "cards" && progress.setName)
      return `${progress.setName} (${progress.current}/${progress.total})`;
    return "Downloading…";
  })();

  return (
    <View style={[dbStyles.card, { backgroundColor: colors.card, borderColor: colors.pokemonBlue + "40" }]}>
      {/* Header */}
      <View style={dbStyles.header}>
        <View style={[dbStyles.iconBg, { backgroundColor: colors.pokemonBlue + "20" }]}>
          <MaterialCommunityIcons name="database" size={20} color={colors.pokemonBlue} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[dbStyles.title, { color: colors.text }]}>Card Database</Text>
          <Text style={[dbStyles.subtitle, { color: colors.textMuted }]}>
            {hasData
              ? `${formatNumber(cacheStatus.totalCards)} cards · ${cacheStatus.cachedSets} sets`
              : "Select languages to download"}
          </Text>
        </View>
        {isComplete && !isSyncing && (
          <View style={[dbStyles.badge, { backgroundColor: colors.success + "20" }]}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={[dbStyles.badgeText, { color: colors.success }]}>Ready</Text>
          </View>
        )}
      </View>

      {/* Stats row (when data exists) */}
      {hasData && !isSyncing && (
        <View style={dbStyles.statsRow}>
          <View style={dbStyles.stat}>
            <Text style={[dbStyles.statNum, { color: colors.pokemonBlue }]}>
              {formatNumber(cacheStatus.totalCards)}
            </Text>
            <Text style={[dbStyles.statLabel, { color: colors.textMuted }]}>Cards</Text>
          </View>
          <View style={[dbStyles.statDivider, { backgroundColor: colors.borderLight }]} />
          <View style={dbStyles.stat}>
            <Text style={[dbStyles.statNum, { color: colors.pokemonBlue }]}>
              {cacheStatus.cachedSets}
            </Text>
            <Text style={[dbStyles.statLabel, { color: colors.textMuted }]}>Sets</Text>
          </View>
          <View style={[dbStyles.statDivider, { backgroundColor: colors.borderLight }]} />
          <View style={dbStyles.stat}>
            <Text style={[dbStyles.statNum, { color: colors.textSecondary }]} numberOfLines={1}>
              {formatDate(cacheStatus.lastSync)}
            </Text>
            <Text style={[dbStyles.statLabel, { color: colors.textMuted }]}>Last Sync</Text>
          </View>
        </View>
      )}

      {/* Progress bar */}
      {isSyncing && (
        <View style={dbStyles.progressWrap}>
          <View style={[dbStyles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[dbStyles.progressBar, { backgroundColor: colors.pokemonBlue, width: `${syncPercent}%` as any }]}
            />
          </View>
          <Text style={[dbStyles.progressLabel, { color: colors.textMuted }]}>
            {syncPercent}%
          </Text>
        </View>
      )}

      {/* Language selector section */}
      <View style={[dbStyles.langSection, { borderColor: colors.borderLight }]}>
        <Text style={[dbStyles.langSectionLabel, { color: colors.textMuted }]}>
          {isSyncing ? "DOWNLOADING" : "SELECT LANGUAGES"}
        </Text>

        {/* Downloadable languages (English, Chinese) */}
        {DOWNLOADABLE_LANGS.map((lang) => {
          const info = LANG_INFO[lang];
          const isSelected = selectedLanguages.includes(lang);
          const isDownloaded = downloadedLangs.has(lang);
          return (
            <Pressable
              key={lang}
              style={[
                dbStyles.langRow,
                { borderColor: isSelected ? colors.pokemonBlue + "60" : colors.borderLight },
                isSelected && { backgroundColor: colors.pokemonBlue + "10" },
              ]}
              onPress={() => !isSyncing && onToggleLanguage(lang)}
              disabled={isSyncing}
            >
              <Text style={dbStyles.langFlag}>{info.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[dbStyles.langLabel, { color: colors.text }]}>
                  {info.label}
                </Text>
                <Text style={[dbStyles.langDesc, { color: colors.textMuted }]}>
                  {lang === "english" ? "~165 sets · Full TCG database" : "5 sets · Mandarin & regional editions"}
                </Text>
              </View>
              {isDownloaded && !isSyncing && (
                <Ionicons name="checkmark-circle" size={16} color={colors.success} style={{ marginRight: 8 }} />
              )}
              <View style={[
                dbStyles.checkbox,
                { borderColor: isSelected ? colors.pokemonBlue : colors.borderLight },
                isSelected && { backgroundColor: colors.pokemonBlue },
              ]}>
                {isSelected && <Ionicons name="checkmark" size={12} color="#FFF" />}
              </View>
            </Pressable>
          );
        })}

        {/* Scanner-only languages (Japanese, Korean) */}
        {SCANNER_ONLY_LANGS.map((lang) => (
          <View
            key={lang.id}
            style={[dbStyles.langRow, dbStyles.langRowDisabled, { borderColor: colors.borderLight }]}
          >
            <Text style={dbStyles.langFlag}>{lang.flag}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[dbStyles.langLabel, { color: colors.textSecondary }]}>
                {lang.label}
              </Text>
              <Text style={[dbStyles.langDesc, { color: colors.textMuted }]}>
                Not in database · Use the Scanner tab
              </Text>
            </View>
            <View style={[dbStyles.scannerBadge, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <Ionicons name="scan-outline" size={11} color={colors.textMuted} />
              <Text style={[dbStyles.scannerBadgeText, { color: colors.textMuted }]}>Scanner</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Action buttons */}
      <View style={dbStyles.buttons}>
        <Pressable
          style={({ pressed }) => [
            dbStyles.syncBtn,
            {
              backgroundColor: selectedLanguages.length === 0 ? colors.border : colors.pokemonBlue,
              opacity: pressed || isSyncing ? 0.8 : 1,
            },
          ]}
          onPress={onSync}
          disabled={isSyncing || selectedLanguages.length === 0}
        >
          {isSyncing ? (
            <MaterialCommunityIcons name="pokeball" size={16} color="#FFF" />
          ) : (
            <Ionicons name="cloud-download" size={16} color="#FFF" />
          )}
          <Text style={dbStyles.syncBtnText} numberOfLines={1}>{syncLabel}</Text>
        </Pressable>
        {hasData && !isSyncing && (
          <Pressable
            style={({ pressed }) => [
              dbStyles.clearBtn,
              { borderColor: colors.borderLight, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={onClear}
          >
            <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const dbStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBg: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, fontFamily: "Outfit_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontFamily: "Outfit_600SemiBold" },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 0 },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statNum: { fontSize: 16, fontFamily: "Outfit_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Outfit_400Regular" },
  statDivider: { width: 1, height: 30, marginHorizontal: 8 },
  progressWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  progressBar: { height: 6, borderRadius: 3 },
  progressLabel: { fontSize: 11, fontFamily: "Outfit_600SemiBold", width: 32, textAlign: "right" },
  buttons: { flexDirection: "row", gap: 8 },
  syncBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 12,
    gap: 7,
  },
  syncBtnText: { fontSize: 13, fontFamily: "Outfit_600SemiBold", color: "#FFF" },
  clearBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  // Language selector
  langSection: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    gap: 0,
  },
  langSectionLabel: {
    fontSize: 10,
    fontFamily: "Outfit_600SemiBold",
    letterSpacing: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderTopWidth: 1,
  },
  langRowDisabled: { opacity: 0.6 },
  langFlag: { fontSize: 20, lineHeight: 24 },
  langLabel: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  langDesc: { fontSize: 11, fontFamily: "Outfit_400Regular", marginTop: 1 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  scannerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  scannerBadgeText: { fontSize: 10, fontFamily: "Outfit_600SemiBold" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {},
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  mailBadge: { position: "absolute", top: -5, right: -7, minWidth: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  mailBadgeText: { fontSize: 9, fontFamily: "Outfit_700Bold", color: "#FFF" },
  title: { fontSize: 28, fontFamily: "Outfit_700Bold" },
  eeveeDecor: { width: 64, height: 64 },
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
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#CC0000",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
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
  premiumBannerTitle: { fontSize: 16, fontFamily: "Outfit_700Bold" },
  premiumBannerDesc: { fontSize: 12, fontFamily: "Outfit_400Regular", opacity: 0.7 },
  cancelPremiumBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelPremiumBtnText: { fontSize: 12, fontFamily: "Outfit_600SemiBold" },
  visToggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: "center",
  },
  visToggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  cancelModalBox: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 28,
    alignItems: "center",
  },
  cancelModalTitle: { fontSize: 20, fontFamily: "Outfit_700Bold", marginBottom: 8, textAlign: "center" },
  cancelModalDesc: { fontSize: 14, fontFamily: "Outfit_400Regular", textAlign: "center", marginBottom: 20, lineHeight: 20 },
  cancelCodeBox: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginBottom: 16,
  },
  cancelCodeText: { fontSize: 28, fontFamily: "Outfit_700Bold", letterSpacing: 6 },
  cancelCodeInput: {
    width: "100%",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 20,
    fontFamily: "Outfit_700Bold",
    textAlign: "center",
    letterSpacing: 4,
    marginBottom: 24,
  },
  cancelModalBtns: { flexDirection: "row", gap: 12, width: "100%" },
  cancelModalDismiss: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
  },
  cancelModalDismissText: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  cancelModalConfirm: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelModalConfirmText: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  dbSection: { paddingHorizontal: 20, marginBottom: 20 },
  helpSection: { paddingHorizontal: 20, gap: 8, marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontFamily: "Outfit_600SemiBold", letterSpacing: 0.8, marginBottom: 4 },
  menuSubtext: { fontSize: 12, fontFamily: "Outfit_400Regular" },
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
  emptyContainer: { justifyContent: "center", alignItems: "center", paddingTop: 60, gap: 8, paddingHorizontal: 20 },
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
  loginBtnWrap: {
    marginTop: 10,
    paddingHorizontal: 32,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
  },
  loginBtnText: { fontSize: 16, fontFamily: "Outfit_600SemiBold" },
  staffLink: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 20, marginBottom: 24 },
  staffLinkText: { fontSize: 13, fontFamily: "Outfit_500Medium" },
  versionText: { fontSize: 12, fontFamily: "Outfit_400Regular", textAlign: "center", marginTop: 8 },
});
