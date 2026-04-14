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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
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
import { MarketListing, UserProfile, UserRole } from "@/lib/storage";
import { socialApi, AdminReport } from "@/lib/social-api";
import { getApiUrl } from "@/lib/query-client";

function EditUserModal({
  profile,
  colors,
  visible,
  onClose,
  onSave,
}: {
  profile: UserProfile;
  colors: ReturnType<typeof useThemeColors>;
  visible: boolean;
  onClose: () => void;
  onSave: (updates: { displayName?: string; email?: string; mobileNumber?: string; password?: string }) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [email, setEmail] = useState(profile.email || "");
  const [mobileNumber, setMobileNumber] = useState(profile.mobileNumber || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setDisplayName(profile.displayName);
    setEmail(profile.email || "");
    setMobileNumber(profile.mobileNumber || "");
    setPassword("");
  }, [profile.id]);

  const handleSave = async () => {
    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedMobile = mobileNumber.trim();
    const trimmedPassword = password.trim();

    if (!trimmedName) {
      Alert.alert("Validation", "Display name cannot be empty.");
      return;
    }
    if (trimmedPassword && trimmedPassword.length < 6) {
      Alert.alert("Validation", "New password must be at least 6 characters.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        displayName: trimmedName,
        email: trimmedEmail || undefined,
        mobileNumber: trimmedMobile || undefined,
        password: trimmedPassword || undefined,
      });
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={editStyles.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={[editStyles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={editStyles.header}>
                <Text style={[editStyles.title, { color: colors.text }]}>Edit Account</Text>
                <Pressable onPress={onClose} style={editStyles.closeBtn}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </Pressable>
              </View>
              <Text style={[editStyles.subtitle, { color: colors.textMuted }]}>
                @{profile.username}
              </Text>

              <Text style={[editStyles.label, { color: colors.textSecondary }]}>Display Name</Text>
              <TextInput
                style={[editStyles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Display name"
                placeholderTextColor={colors.textMuted}
                autoCorrect={false}
              />

              <Text style={[editStyles.label, { color: colors.textSecondary }]}>Email</Text>
              <TextInput
                style={[editStyles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={[editStyles.label, { color: colors.textSecondary }]}>Mobile Number</Text>
              <TextInput
                style={[editStyles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                value={mobileNumber}
                onChangeText={setMobileNumber}
                placeholder="e.g. +447700900123"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />

              <Text style={[editStyles.label, { color: colors.textSecondary }]}>New Password (leave blank to keep)</Text>
              <View style={{ flexDirection: "row", alignItems: "center", height: 46, paddingHorizontal: 14, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, marginBottom: 14 }}>
                <TextInput
                  style={{ flex: 1, color: colors.text, fontSize: 15, fontFamily: "Outfit_400Regular" }}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textMuted} />
                </Pressable>
              </View>

              <View style={editStyles.btnRow}>
                <Pressable
                  style={[editStyles.cancelBtn, { borderColor: colors.border }]}
                  onPress={onClose}
                >
                  <Text style={[editStyles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[editStyles.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Ionicons name="checkmark" size={16} color="#FFF" />
                  <Text style={editStyles.saveBtnText}>{saving ? "Saving…" : "Save"}</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const editStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  sheet: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  title: { fontSize: 18, fontFamily: "Outfit_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Outfit_400Regular", marginBottom: 18 },
  closeBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 12, fontFamily: "Outfit_600SemiBold", marginBottom: 6, letterSpacing: 0.5 },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Outfit_400Regular",
    marginBottom: 14,
  },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: { fontSize: 15, fontFamily: "Outfit_600SemiBold" },
  saveBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#CC0000",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  saveBtnText: { fontSize: 15, fontFamily: "Outfit_700Bold", color: "#FFF" },
});

type Tab = "listings" | "users" | "reports" | "database";

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
  isSuperadmin,
  onTogglePremium,
  onChangeRole,
  onEdit,
  onDelete,
}: {
  profile: UserProfile;
  colors: ReturnType<typeof useThemeColors>;
  isCurrentUser: boolean;
  isSuperadmin: boolean;
  onTogglePremium: () => void;
  onChangeRole: (role: UserRole) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const roleColor = profile.role === "admin" ? "#E74C3C" : profile.role === "moderator" ? "#E67E22" : colors.textMuted;
  const isSuperadminAccount = profile.username === "superadmin";

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
          {isSuperadminAccount && (
            <View style={[styles.youBadge, { backgroundColor: "#E74C3C" }]}>
              <Text style={styles.youBadgeText}>OWNER</Text>
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
      {isSuperadmin && !isSuperadminAccount && (
        <View style={styles.userActions}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: "rgba(255,255,255,0.08)" }]}
            onPress={onEdit}
          >
            <Ionicons name="pencil-outline" size={15} color={colors.pokemonYellow} />
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: "rgba(255,255,255,0.08)" }]}
            onPress={() => {
              const options: { label: string; role: UserRole }[] = [
                { label: "Regular User", role: "user" },
                { label: "Market Moderator", role: "moderator" },
                { label: "Full App Admin", role: "admin" },
              ];
              const currentRoleLabel = options.find((o) => o.role === profile.role)?.label || "User";
              Alert.alert(
                "Set Role",
                `Current role: ${currentRoleLabel}\n\nChoose a new role for ${profile.displayName}:`,
                [
                  ...options
                    .filter((o) => o.role !== profile.role)
                    .map((o) => ({
                      text: o.label,
                      onPress: () => onChangeRole(o.role),
                    })),
                  { text: "Cancel", style: "cancel" as const },
                ]
              );
            }}
          >
            <Ionicons name="shield-outline" size={15} color={colors.accent} />
          </Pressable>
          {profile.role === "user" && (
            <Pressable
              style={[
                styles.actionBtn,
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
                size={15}
                color={profile.isPremium ? colors.error : colors.success}
              />
            </Pressable>
          )}
          <Pressable
            style={[styles.actionBtn, { backgroundColor: "rgba(231,76,60,0.15)" }]}
            onPress={() =>
              Alert.alert(
                "Delete User",
                `Permanently delete ${profile.displayName} (@${profile.username})? This cannot be undone.`,
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: onDelete },
                ]
              )
            }
          >
            <Ionicons name="trash-outline" size={15} color="#E74C3C" />
          </Pressable>
        </View>
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

function CreateUserModal({
  colors,
  visible,
  onClose,
  onCreated,
}: {
  colors: ReturnType<typeof useThemeColors>;
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setUsername("");
    setDisplayName("");
    setEmail("");
    setMobileNumber("");
    setPassword("");
    setIsPremium(false);
    setShowPassword(false);
  };

  const handleCreate = async () => {
    const u = username.trim();
    const d = displayName.trim();
    const e = email.trim();
    const p = password.trim();
    if (!u || !d || !e || !p) {
      Alert.alert("Missing Fields", "Username, display name, email and password are required.");
      return;
    }
    if (p.length < 6) {
      Alert.alert("Validation", "Password must be at least 6 characters.");
      return;
    }
    setSaving(true);
    try {
      const { getApiUrl } = await import("@/lib/query-client");
      const base = getApiUrl();
      const res = await fetch(`${base}/api/admin/create-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          superadminPassword: "killer89!",
          username: u,
          displayName: d,
          email: e,
          mobileNumber: mobileNumber.trim() || "",
          password: p,
          isPremium,
          role: "user",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create account");
      Alert.alert("Success", `Account created for @${u}`);
      reset();
      onCreated();
      onClose();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create account");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { reset(); onClose(); }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={editStyles.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={[editStyles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={editStyles.header}>
                <Text style={[editStyles.title, { color: colors.text }]}>Create Account</Text>
                <Pressable onPress={() => { reset(); onClose(); }} style={editStyles.closeBtn}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </Pressable>
              </View>
              <Text style={[editStyles.subtitle, { color: colors.textMuted }]}>
                Create a new user account
              </Text>

              <Text style={[editStyles.label, { color: colors.textSecondary }]}>Username *</Text>
              <TextInput
                style={[editStyles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                value={username}
                onChangeText={setUsername}
                placeholder="username"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={[editStyles.label, { color: colors.textSecondary }]}>Display Name *</Text>
              <TextInput
                style={[editStyles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Display name"
                placeholderTextColor={colors.textMuted}
                autoCorrect={false}
              />

              <Text style={[editStyles.label, { color: colors.textSecondary }]}>Email *</Text>
              <TextInput
                style={[editStyles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                value={email}
                onChangeText={setEmail}
                placeholder="user@email.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={[editStyles.label, { color: colors.textSecondary }]}>Mobile (optional)</Text>
              <TextInput
                style={[editStyles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                value={mobileNumber}
                onChangeText={setMobileNumber}
                placeholder="+447700900123"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />

              <Text style={[editStyles.label, { color: colors.textSecondary }]}>Password *</Text>
              <View style={{ flexDirection: "row", alignItems: "center", height: 46, paddingHorizontal: 14, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, marginBottom: 14 }}>
                <TextInput
                  style={{ flex: 1, color: colors.text, fontSize: 15, fontFamily: "Outfit_400Regular" }}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textMuted} />
                </Pressable>
              </View>

              <Pressable
                style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 }}
                onPress={() => setIsPremium(!isPremium)}
              >
                <Ionicons
                  name={isPremium ? "checkbox" : "square-outline"}
                  size={22}
                  color={isPremium ? "#CC0000" : colors.textMuted}
                />
                <Text style={{ fontSize: 14, fontFamily: "Outfit_600SemiBold", color: colors.textSecondary }}>
                  Grant Premium Access
                </Text>
              </Pressable>

              <View style={editStyles.btnRow}>
                <Pressable
                  style={[editStyles.cancelBtn, { borderColor: colors.border }]}
                  onPress={() => { reset(); onClose(); }}
                >
                  <Text style={[editStyles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[editStyles.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={handleCreate}
                  disabled={saving}
                >
                  <Ionicons name="person-add-outline" size={16} color="#FFF" />
                  <Text style={editStyles.saveBtnText}>{saving ? "Creating…" : "Create"}</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
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
    changeUserRole,
    editUserAccount,
    deleteUserAccount,
    isStaff,
    isAdminUser,
    isSuperadminUser,
    logout,
    refreshUsers,
  } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>("listings");
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [isRefreshingUsers, setIsRefreshingUsers] = useState(false);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const data = await socialApi.getAdminReports();
      setReports(data.reports);
    } catch (e) {
      console.error("Failed to load reports:", e);
    } finally {
      setReportsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (activeTab === "reports") loadReports();
  }, [activeTab, loadReports]);

  const handleUpdateReport = useCallback(async (id: string, status: "reviewed" | "dismissed") => {
    try {
      await socialApi.updateReport(id, status, reviewNotes[id] || undefined);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setReports(prev => prev.map(r => r.id === id ? { ...r, status, reviewNote: reviewNotes[id] || null } : r));
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not update report.");
    }
  }, [reviewNotes]);

  const handleRefreshUsers = useCallback(async () => {
    setIsRefreshingUsers(true);
    await refreshUsers();
    setIsRefreshingUsers(false);
  }, [refreshUsers]);

  type DbPreview = {
    scrydexSetCount: number;
    dbSetCount: number;
    newSetsFound: number;
    emptySetsFound: number;
    setsToProcess: number;
    newSets: { id: string; name: string; series: string }[];
    emptySets: { id: string; name: string; series: string }[];
  };
  type SyncProgress = {
    phase: string;
    setsProcessed: number;
    setsTotal: number;
    setsAdded: number;
    cardsAdded: number;
    cardsUpdated: number;
    currentSet?: string;
    done?: boolean;
    error?: string;
  };

  const [dbPreview, setDbPreview] = useState<DbPreview | null>(null);
  const [dbPreviewLoading, setDbPreviewLoading] = useState(false);
  const [syncRunning, setSyncRunning] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [syncLog, setSyncLog] = useState<string[]>([]);
  const syncLogRef = React.useRef<ScrollView | null>(null);

  const handleDbPreview = useCallback(async () => {
    setDbPreviewLoading(true);
    setDbPreview(null);
    try {
      const url = new URL("/api/admin/scrydex-preview", getApiUrl());
      url.searchParams.set("superadminPassword", "killer89!");
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setDbPreview(data);
    } catch (e: any) {
      Alert.alert("Preview Failed", e.message || "Could not reach server.");
    } finally {
      setDbPreviewLoading(false);
    }
  }, []);

  const syncXhrRef = React.useRef<XMLHttpRequest | null>(null);

  const handleSyncStart = useCallback(() => {
    Alert.alert(
      "Run Scrydex Sync",
      `This will process ${dbPreview?.setsToProcess ?? "?"} set(s) — ${dbPreview?.newSetsFound ?? 0} new and ${dbPreview?.emptySetsFound ?? 0} existing but empty. Cards will be added to each. This may take several minutes. Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start Sync",
          style: "default",
          onPress: () => {
            setSyncRunning(true);
            setSyncProgress(null);
            setSyncLog(["Starting sync…"]);

            const url = new URL("/api/admin/scrydex-sync", getApiUrl());
            const xhr = new XMLHttpRequest();
            syncXhrRef.current = xhr;
            let lastIndex = 0;
            let buffer = "";

            const processBuffer = () => {
              const parts = buffer.split("\n\n");
              buffer = parts.pop() ?? "";
              for (const part of parts) {
                const line = part.trim();
                if (!line.startsWith("data: ")) continue;
                try {
                  const evt: SyncProgress = JSON.parse(line.slice(6));
                  setSyncProgress(evt);
                  const msg = evt.currentSet
                    ? `[${evt.setsProcessed}/${evt.setsTotal}] ${evt.currentSet}`
                    : evt.phase ?? "";
                  if (msg) setSyncLog(prev => [...prev.slice(-200), msg]);
                } catch {}
              }
            };

            xhr.onprogress = () => {
              const newText = xhr.responseText.slice(lastIndex);
              lastIndex = xhr.responseText.length;
              buffer += newText;
              processBuffer();
            };

            xhr.onload = () => {
              // Process any remaining text
              const remaining = xhr.responseText.slice(lastIndex);
              if (remaining) {
                buffer += remaining;
                processBuffer();
              }
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setDbPreview(null);
              setSyncRunning(false);
              syncXhrRef.current = null;
            };

            xhr.onerror = () => {
              setSyncLog(prev => [...prev, "Network error — sync failed."]);
              Alert.alert("Sync Error", "A network error occurred. Please try again.");
              setSyncRunning(false);
              syncXhrRef.current = null;
            };

            xhr.ontimeout = () => {
              setSyncLog(prev => [...prev, "Request timed out."]);
              setSyncRunning(false);
              syncXhrRef.current = null;
            };

            xhr.timeout = 600_000; // 10 min max
            xhr.open("POST", url.toString());
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.send(JSON.stringify({ superadminPassword: "killer89!" }));
          },
        },
      ]
    );
  }, [dbPreview]);

  const handleSyncCancel = useCallback(() => {
    syncXhrRef.current?.abort();
    syncXhrRef.current = null;
    setSyncLog(prev => [...prev, "Sync cancelled."]);
    setSyncRunning(false);
  }, []);

  const [asianSyncRunning, setAsianSyncRunning] = useState(false);
  const [asianSyncLog, setAsianSyncLog] = useState<string[]>([]);
  const asianXhrRef = React.useRef<XMLHttpRequest | null>(null);

  const handleAsianSync = useCallback(() => {
    Alert.alert(
      "Sync Asian Sets",
      "This will insert 211 Japanese sets (from Scrydex), ~90 Korean sets, and ~50 Chinese sets into the database. Existing sets are skipped. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start",
          style: "default",
          onPress: () => {
            setAsianSyncRunning(true);
            setAsianSyncLog(["Starting Asian set sync…"]);

            const url = new URL("/api/admin/sync-asian-sets", getApiUrl());
            const xhr = new XMLHttpRequest();
            asianXhrRef.current = xhr;
            let asianLastIndex = 0;
            let asianBuffer = "";

            const processAsianBuffer = () => {
              const parts = asianBuffer.split("\n\n");
              asianBuffer = parts.pop() ?? "";
              for (const part of parts) {
                const line = part.trim();
                if (!line.startsWith("data: ")) continue;
                try {
                  const evt = JSON.parse(line.slice(6));
                  if (evt.message) setAsianSyncLog(prev => [...prev.slice(-300), evt.message]);
                  if (evt.done) {
                    const summary = `✅ Done — inserted ${evt.inserted ?? "?"}, skipped ${evt.skipped ?? "?"}, errors ${evt.errors ?? 0}`;
                    setAsianSyncLog(prev => [...prev, summary]);
                    setAsianSyncRunning(false);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                } catch {}
              }
            };

            xhr.onprogress = () => {
              const newText = xhr.responseText.slice(asianLastIndex);
              asianLastIndex = xhr.responseText.length;
              asianBuffer += newText;
              processAsianBuffer();
            };
            xhr.onload = () => {
              const remaining = xhr.responseText.slice(asianLastIndex);
              if (remaining) { asianBuffer += remaining; processAsianBuffer(); }
              if (asianSyncRunning) setAsianSyncRunning(false);
            };
            xhr.onerror = () => {
              setAsianSyncLog(prev => [...prev, "Network error — sync failed."]);
              setAsianSyncRunning(false);
            };
            xhr.ontimeout = () => {
              setAsianSyncLog(prev => [...prev, "Request timed out."]);
              setAsianSyncRunning(false);
            };
            xhr.timeout = 120_000;
            xhr.open("POST", url.toString());
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.send(JSON.stringify({ superadminPassword: "killer89!" }));
          },
        },
      ]
    );
  }, []);

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

  const handleEditUser = useCallback(
    async (updates: { displayName?: string; email?: string; mobileNumber?: string; password?: string }) => {
      if (!editingUser) return;
      // If password provided, push to backend directly
      if (updates.password) {
        const { getApiUrl } = await import("@/lib/query-client");
        const base = getApiUrl();
        const res = await fetch(`${base}/api/admin/edit-user`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            superadminPassword: "killer89!",
            userId: editingUser.id,
            displayName: updates.displayName,
            email: updates.email,
            mobileNumber: updates.mobileNumber,
            password: updates.password,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to update account");
        }
      }
      await editUserAccount(editingUser.id, { displayName: updates.displayName, email: updates.email, mobileNumber: updates.mobileNumber });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [editingUser, editUserAccount]
  );

  const handleDeleteUser = useCallback(
    async (profile: UserProfile) => {
      await deleteUserAccount(profile.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
    [deleteUserAccount]
  );

  const handleChangeRole = useCallback(
    (profile: UserProfile, role: UserRole) => {
      const roleLabels: Record<UserRole, string> = {
        user: "Regular User",
        moderator: "Market Moderator",
        admin: "Full App Admin",
      };
      Alert.alert(
        "Change Role",
        `Set ${profile.displayName} as "${roleLabels[role]}"?${role !== "user" ? "\nThey will also get premium access." : ""}`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm",
            onPress: () => {
              changeUserRole(profile.id, role);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ]
      );
    },
    [changeUserRole]
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

  const badgeLabel = isSuperadminUser ? "SUPERADMIN" : user.role === "admin" ? "ADMIN" : "MODERATOR";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: (insets.top || webTopInset) + 4 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.topBarCenter}>
          <LinearGradient
            colors={isSuperadminUser ? ["#C0392B", "#8E1F1F"] : ["#E74C3C", "#C0392B"]}
            style={styles.staffBadgeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="shield-checkmark" size={14} color="#FFF" />
            <Text style={styles.staffBadgeText}>{badgeLabel}</Text>
          </LinearGradient>
        </View>
        <Pressable
          onPress={() => {
            Alert.alert("Sign Out", "Sign out of your account?", [
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
        {(isSuperadminUser || isAdminUser) && (
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
        )}
        <Pressable
          style={[styles.tab, activeTab === "reports" && styles.tabActive]}
          onPress={() => setActiveTab("reports")}
        >
          <Ionicons
            name="flag-outline"
            size={18}
            color={activeTab === "reports" ? "#FFF" : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "reports" ? "#FFF" : colors.textMuted },
            ]}
          >
            Reports {reports.filter(r => r.status === "pending").length > 0 ? `(${reports.filter(r => r.status === "pending").length})` : ""}
          </Text>
        </Pressable>
        {isSuperadminUser && (
          <Pressable
            style={[styles.tab, activeTab === "database" && styles.tabActive]}
            onPress={() => setActiveTab("database")}
          >
            <Ionicons
              name="server-outline"
              size={18}
              color={activeTab === "database" ? "#FFF" : colors.textMuted}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === "database" ? "#FFF" : colors.textMuted },
              ]}
            >
              Database
            </Text>
          </Pressable>
        )}
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

      {activeTab === "reports" && (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          onRefresh={loadReports}
          refreshing={reportsLoading}
          ListHeaderComponent={
            reports.length > 0 ? (
              <View style={[styles.summaryBar, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: colors.pokemonRed }]}>
                    {reports.filter(r => r.status === "pending").length}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Pending</Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: colors.success }]}>
                    {reports.filter(r => r.status === "reviewed").length}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Reviewed</Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: colors.textMuted }]}>
                    {reports.filter(r => r.status === "dismissed").length}
                  </Text>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Dismissed</Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            reportsLoading ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="hourglass-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Loading reports...</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="shield-checkmark-outline" size={56} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No Reports</Text>
                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>No content reports to review</Text>
              </View>
            )
          }
          renderItem={({ item: report }) => {
            const isPending = report.status === "pending";
            const isExpanded = expandedReport === report.id;
            let snapshot: any = null;
            try { snapshot = report.contentSnapshot ? JSON.parse(report.contentSnapshot) : null; } catch {}
            return (
              <Pressable
                style={[styles.reportCard, { backgroundColor: colors.card, borderColor: isPending ? colors.pokemonRed : colors.border }]}
                onPress={() => setExpandedReport(isExpanded ? null : report.id)}
              >
                <View style={styles.reportCardHeader}>
                  <View style={[styles.reportTypeBadge, { backgroundColor: report.contentType === "message" ? colors.pokemonBlue : colors.success }]}>
                    <Ionicons name={report.contentType === "message" ? "mail-outline" : "pricetag-outline"} size={12} color="#FFF" />
                    <Text style={styles.reportTypeBadgeText}>{report.contentType === "message" ? "MESSAGE" : "LISTING"}</Text>
                  </View>
                  <View style={[styles.reportStatusBadge, {
                    backgroundColor: isPending ? colors.pokemonRed + "20" : report.status === "reviewed" ? colors.success + "20" : colors.textMuted + "20"
                  }]}>
                    <Text style={[styles.reportStatusText, { color: isPending ? colors.pokemonRed : report.status === "reviewed" ? colors.success : colors.textMuted }]}>
                      {report.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.reportTime, { color: colors.textMuted }]}>{getTimeAgo(report.createdAt)}</Text>
                  <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
                </View>

                <View style={styles.reportMeta}>
                  <Ionicons name="person-outline" size={13} color={colors.textMuted} />
                  <Text style={[styles.reportMetaText, { color: colors.textMuted }]}>
                    Reported by <Text style={{ color: colors.text }}>{report.reporterDisplayName}</Text>
                    {report.reportedUserDisplayName ? <> · Against <Text style={{ color: colors.pokemonRed }}>{report.reportedUserDisplayName}</Text></> : null}
                  </Text>
                </View>

                <View style={[styles.reportReasonBox, { backgroundColor: colors.background }]}>
                  <Text style={[styles.reportReasonLabel, { color: colors.textMuted }]}>REASON</Text>
                  <Text style={[styles.reportReasonText, { color: colors.text }]}>{report.reason}</Text>
                </View>

                {isExpanded && snapshot && (
                  <View style={[styles.reportSnapshot, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.reportSnapshotLabel, { color: colors.textMuted }]}>CONTENT SNAPSHOT</Text>
                    {report.contentType === "message" && (
                      <>
                        {snapshot.subject ? <Text style={[styles.reportSnapshotSubject, { color: colors.text }]}>{snapshot.subject}</Text> : null}
                        <Text style={[styles.reportSnapshotBody, { color: colors.textSecondary }]}>{snapshot.body}</Text>
                        {snapshot.senderUsername && <Text style={[styles.reportSnapshotMeta, { color: colors.textMuted }]}>From: @{snapshot.senderUsername}</Text>}
                      </>
                    )}
                    {report.contentType === "listing" && (
                      <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                        {snapshot.cardImage && (
                          <Image source={{ uri: snapshot.cardImage }} style={{ width: 50, height: 70, borderRadius: 6 }} contentFit="contain" />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.reportSnapshotSubject, { color: colors.text }]}>{snapshot.cardName}</Text>
                          <Text style={[styles.reportSnapshotMeta, { color: colors.textMuted }]}>{snapshot.setName}</Text>
                          <Text style={[styles.reportSnapshotMeta, { color: colors.textMuted }]}>{snapshot.condition} · {snapshot.type === "sale" ? "For Sale" : "Trade"}</Text>
                          {snapshot.priceGBP && <Text style={[styles.reportSnapshotMeta, { color: colors.success }]}>{formatGBP(snapshot.priceGBP)}</Text>}
                          <Text style={[styles.reportSnapshotMeta, { color: colors.textMuted }]}>Seller: {snapshot.userName}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {isExpanded && report.reviewNote && (
                  <View style={[styles.reportNote, { backgroundColor: colors.success + "15", borderColor: colors.success }]}>
                    <Text style={[styles.reportNoteLabel, { color: colors.success }]}>REVIEW NOTE</Text>
                    <Text style={[styles.reportNoteText, { color: colors.text }]}>{report.reviewNote}</Text>
                    {report.reviewedByUsername && <Text style={[styles.reportNoteBy, { color: colors.textMuted }]}>— @{report.reviewedByUsername}</Text>}
                  </View>
                )}

                {isExpanded && isPending && (
                  <View style={styles.reportActions}>
                    <TextInput
                      style={[styles.reportNoteInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                      placeholder="Add a review note (optional)..."
                      placeholderTextColor={colors.textMuted}
                      value={reviewNotes[report.id] || ""}
                      onChangeText={text => setReviewNotes(prev => ({ ...prev, [report.id]: text }))}
                      multiline
                    />
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                      <Pressable
                        style={[styles.reportActionBtn, { backgroundColor: colors.success, flex: 1 }]}
                        onPress={() => handleUpdateReport(report.id, "reviewed")}
                      >
                        <Ionicons name="checkmark-circle-outline" size={16} color="#FFF" />
                        <Text style={styles.reportActionBtnText}>Mark Reviewed</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.reportActionBtn, { backgroundColor: colors.textMuted, flex: 1 }]}
                        onPress={() => handleUpdateReport(report.id, "dismissed")}
                      >
                        <Ionicons name="close-circle-outline" size={16} color="#FFF" />
                        <Text style={styles.reportActionBtnText}>Dismiss</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      )}

      {activeTab === "database" && isSuperadminUser && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 14 }}
        >
          <View style={[{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.borderLight }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#CC0000" + "22", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="search-outline" size={20} color="#CC0000" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[{ fontSize: 16, fontFamily: "Outfit_700Bold", color: colors.text }]}>Scrydex Preview</Text>
                <Text style={[{ fontSize: 12, fontFamily: "Outfit_400Regular", color: colors.textMuted }]}>Check what new sets are available</Text>
              </View>
            </View>
            {dbPreview && (
              <View style={{ gap: 10, marginBottom: 14 }}>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={[{ flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 12, alignItems: "center", gap: 4, borderWidth: 1, borderColor: colors.borderLight }]}>
                    <Text style={{ fontSize: 22, fontFamily: "Outfit_700Bold", color: "#CC0000" }}>{dbPreview.setsToProcess}</Text>
                    <Text style={{ fontSize: 11, fontFamily: "Outfit_400Regular", color: colors.textMuted }}>Need Sync</Text>
                  </View>
                  <View style={[{ flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 12, alignItems: "center", gap: 4, borderWidth: 1, borderColor: colors.borderLight }]}>
                    <Text style={{ fontSize: 22, fontFamily: "Outfit_700Bold", color: colors.text }}>{dbPreview.dbSetCount}</Text>
                    <Text style={{ fontSize: 11, fontFamily: "Outfit_400Regular", color: colors.textMuted }}>In Database</Text>
                  </View>
                  <View style={[{ flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 12, alignItems: "center", gap: 4, borderWidth: 1, borderColor: colors.borderLight }]}>
                    <Text style={{ fontSize: 22, fontFamily: "Outfit_700Bold", color: colors.text }}>{dbPreview.scrydexSetCount}</Text>
                    <Text style={{ fontSize: 11, fontFamily: "Outfit_400Regular", color: colors.textMuted }}>On Scrydex</Text>
                  </View>
                </View>
                {dbPreview.newSets.length > 0 && (
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 12, fontFamily: "Outfit_700Bold", color: colors.textMuted, letterSpacing: 0.8 }}>NEW SETS TO ADD</Text>
                    {dbPreview.newSets.map(s => (
                      <View key={s.id} style={[{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.background, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.borderLight }]}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#CC0000" }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontFamily: "Outfit_600SemiBold", color: colors.text }}>{s.name}</Text>
                          <Text style={{ fontSize: 11, fontFamily: "Outfit_400Regular", color: colors.textMuted }}>{s.id} · {s.series}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                {dbPreview.emptySets.length > 0 && (
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 12, fontFamily: "Outfit_700Bold", color: colors.textMuted, letterSpacing: 0.8 }}>EXISTING SETS MISSING CARDS</Text>
                    {dbPreview.emptySets.map(s => (
                      <View key={s.id} style={[{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.background, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.borderLight }]}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.pokemonYellow }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontFamily: "Outfit_600SemiBold", color: colors.text }}>{s.name}</Text>
                          <Text style={{ fontSize: 11, fontFamily: "Outfit_400Regular", color: colors.textMuted }}>{s.id} · {s.series}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
            <Pressable
              style={[{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.background, borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: colors.border }, dbPreviewLoading && { opacity: 0.6 }]}
              onPress={handleDbPreview}
              disabled={dbPreviewLoading || syncRunning}
            >
              {dbPreviewLoading
                ? <Ionicons name="hourglass-outline" size={18} color={colors.text} />
                : <Ionicons name="refresh-outline" size={18} color={colors.text} />}
              <Text style={{ fontSize: 14, fontFamily: "Outfit_600SemiBold", color: colors.text }}>
                {dbPreviewLoading ? "Checking…" : dbPreview ? "Refresh Preview" : "Run Preview"}
              </Text>
            </Pressable>
          </View>

          <View style={[{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.borderLight }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#27AE60" + "22", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="cloud-download-outline" size={20} color="#27AE60" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[{ fontSize: 16, fontFamily: "Outfit_700Bold", color: colors.text }]}>Sync Database</Text>
                <Text style={[{ fontSize: 12, fontFamily: "Outfit_400Regular", color: colors.textMuted }]}>Download new sets & cards from Scrydex</Text>
              </View>
            </View>

            {syncProgress && (
              <View style={{ gap: 10, marginBottom: 14 }}>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={[{ flex: 1, backgroundColor: colors.background, borderRadius: 10, padding: 10, alignItems: "center", gap: 3, borderWidth: 1, borderColor: colors.borderLight }]}>
                    <Text style={{ fontSize: 18, fontFamily: "Outfit_700Bold", color: "#27AE60" }}>{syncProgress.setsAdded}</Text>
                    <Text style={{ fontSize: 10, fontFamily: "Outfit_400Regular", color: colors.textMuted }}>Sets Added</Text>
                  </View>
                  <View style={[{ flex: 1, backgroundColor: colors.background, borderRadius: 10, padding: 10, alignItems: "center", gap: 3, borderWidth: 1, borderColor: colors.borderLight }]}>
                    <Text style={{ fontSize: 18, fontFamily: "Outfit_700Bold", color: "#3498DB" }}>{syncProgress.cardsAdded}</Text>
                    <Text style={{ fontSize: 10, fontFamily: "Outfit_400Regular", color: colors.textMuted }}>Cards Added</Text>
                  </View>
                  <View style={[{ flex: 1, backgroundColor: colors.background, borderRadius: 10, padding: 10, alignItems: "center", gap: 3, borderWidth: 1, borderColor: colors.borderLight }]}>
                    <Text style={{ fontSize: 18, fontFamily: "Outfit_700Bold", color: colors.textMuted }}>{syncProgress.cardsUpdated}</Text>
                    <Text style={{ fontSize: 10, fontFamily: "Outfit_400Regular", color: colors.textMuted }}>Updated</Text>
                  </View>
                </View>
                <View style={{ height: 8, backgroundColor: colors.background, borderRadius: 8, overflow: "hidden" }}>
                  <View style={{ height: "100%", width: `${syncProgress.setsTotal > 0 ? Math.round((syncProgress.setsProcessed / syncProgress.setsTotal) * 100) : 0}%`, backgroundColor: "#27AE60", borderRadius: 8 }} />
                </View>
                <Text style={{ fontSize: 12, fontFamily: "Outfit_400Regular", color: colors.textMuted, textAlign: "center" }}>
                  {syncProgress.setsTotal > 0
                    ? `${syncProgress.setsProcessed} / ${syncProgress.setsTotal} sets — ${Math.round((syncProgress.setsProcessed / syncProgress.setsTotal) * 100)}%`
                    : syncProgress.phase}
                </Text>
                {syncProgress.currentSet && (
                  <Text style={{ fontSize: 11, fontFamily: "Outfit_500Medium", color: colors.text, textAlign: "center" }} numberOfLines={1}>
                    {syncProgress.currentSet}
                  </Text>
                )}
                {syncProgress.done && (
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#27AE60" + "22", borderRadius: 10, padding: 10 }}>
                    <Ionicons name="checkmark-circle" size={18} color="#27AE60" />
                    <Text style={{ fontSize: 13, fontFamily: "Outfit_700Bold", color: "#27AE60" }}>Sync Complete!</Text>
                  </View>
                )}
              </View>
            )}

            {syncLog.length > 0 && (
              <View style={[{ backgroundColor: "#000", borderRadius: 10, padding: 10, marginBottom: 12, maxHeight: 180 }]}>
                <ScrollView
                  ref={syncLogRef}
                  showsVerticalScrollIndicator={false}
                  onContentSizeChange={() => syncLogRef.current?.scrollToEnd({ animated: true })}
                >
                  {syncLog.map((line, i) => (
                    <Text key={i} style={{ fontSize: 10, fontFamily: "Outfit_400Regular", color: "#00FF88", lineHeight: 16 }}>{line}</Text>
                  ))}
                </ScrollView>
              </View>
            )}

            {syncRunning ? (
              <Pressable
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#CC0000", borderRadius: 12, paddingVertical: 12 }}
                onPress={handleSyncCancel}
              >
                <Ionicons name="stop-circle-outline" size={18} color="#FFF" />
                <Text style={{ fontSize: 14, fontFamily: "Outfit_700Bold", color: "#FFF" }}>Cancel Sync</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#27AE60", borderRadius: 12, paddingVertical: 12 }, (!dbPreview || dbPreview.newSetsFound === 0) && { opacity: 0.5 }]}
                onPress={handleSyncStart}
                disabled={!dbPreview || dbPreview.newSetsFound === 0 || syncRunning}
              >
                <Ionicons name="cloud-download-outline" size={18} color="#FFF" />
                <Text style={{ fontSize: 14, fontFamily: "Outfit_700Bold", color: "#FFF" }}>
                  {dbPreview?.newSetsFound === 0 ? "Database Up To Date" : `Sync ${dbPreview?.newSetsFound ?? "?"} New Set${(dbPreview?.newSetsFound ?? 0) !== 1 ? "s" : ""}`}
                </Text>
              </Pressable>
            )}
            {!dbPreview && !syncRunning && (
              <Text style={{ fontSize: 11, fontFamily: "Outfit_400Regular", color: colors.textMuted, textAlign: "center", marginTop: 8 }}>
                Run a preview first to see what will be synced
              </Text>
            )}

            {/* Asian Sets Sync */}
            <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Text style={{ fontSize: 16, fontFamily: "Outfit_700Bold", color: colors.text }}>🇯🇵🇰🇷🇨🇳 Asian Sets</Text>
              </View>
              <Text style={{ fontSize: 12, fontFamily: "Outfit_400Regular", color: colors.textMuted, marginBottom: 12 }}>
                Insert 211 Japanese sets (from Scrydex), ~90 Korean sets, and ~50 Chinese sets. Already existing sets are skipped automatically.
              </Text>

              {asianSyncLog.length > 0 && (
                <View style={{ backgroundColor: "#0A0A0A", borderRadius: 8, padding: 10, marginBottom: 12, maxHeight: 120 }}>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {asianSyncLog.slice(-30).map((line, i) => (
                      <Text key={i} style={{ fontSize: 10, fontFamily: "Outfit_400Regular", color: "#00FF88", lineHeight: 16 }}>{line}</Text>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Pressable
                style={[{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#1565C0", borderRadius: 12, paddingVertical: 12 }, asianSyncRunning && { opacity: 0.6 }]}
                onPress={handleAsianSync}
                disabled={asianSyncRunning}
              >
                <Ionicons name="globe-outline" size={18} color="#FFF" />
                <Text style={{ fontSize: 14, fontFamily: "Outfit_700Bold", color: "#FFF" }}>
                  {asianSyncRunning ? "Syncing Asian Sets…" : "Sync JP / KO / ZH Sets"}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      )}

      {editingUser && (
        <EditUserModal
          profile={editingUser}
          colors={colors}
          visible={!!editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleEditUser}
        />
      )}

      <CreateUserModal
        colors={colors}
        visible={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        onCreated={() => {}}
      />

      {activeTab === "users" && (isSuperadminUser || isAdminUser) && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
        >
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
            {isSuperadminUser && (
              <Pressable
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  backgroundColor: "#CC0000",
                  borderRadius: 12,
                  paddingVertical: 12,
                }}
                onPress={() => setShowCreateUser(true)}
              >
                <Ionicons name="person-add-outline" size={18} color="#FFF" />
                <Text style={{ fontSize: 15, fontFamily: "Outfit_600SemiBold", color: "#FFF" }}>
                  Create Account
                </Text>
              </Pressable>
            )}
            <Pressable
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                backgroundColor: colors.card,
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 16,
                opacity: isRefreshingUsers ? 0.6 : 1,
              }}
              onPress={handleRefreshUsers}
              disabled={isRefreshingUsers}
            >
              <Ionicons name={isRefreshingUsers ? "hourglass-outline" : "refresh-outline"} size={18} color={colors.text} />
            </Pressable>
          </View>

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
                  isSuperadmin={isSuperadminUser}
                  onTogglePremium={() => handleTogglePremium(u)}
                  onChangeRole={(role) => handleChangeRole(u, role)}
                  onEdit={() => setEditingUser(u)}
                  onDelete={() => handleDeleteUser(u)}
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
                isSuperadmin={isSuperadminUser}
                onTogglePremium={() => handleTogglePremium(u)}
                onChangeRole={(role) => handleChangeRole(u, role)}
                onEdit={() => setEditingUser(u)}
                onDelete={() => handleDeleteUser(u)}
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
  userActions: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
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
  reportCard: { marginHorizontal: 16, marginTop: 10, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  reportCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  reportTypeBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  reportTypeBadgeText: { fontSize: 10, fontFamily: "Outfit_700Bold", color: "#FFF" },
  reportStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  reportStatusText: { fontSize: 10, fontFamily: "Outfit_700Bold" },
  reportTime: { flex: 1, fontSize: 11, fontFamily: "Outfit_400Regular", textAlign: "right" },
  reportMeta: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginBottom: 8 },
  reportMetaText: { flex: 1, fontSize: 12, fontFamily: "Outfit_400Regular" },
  reportReasonBox: { padding: 10, borderRadius: 10, marginBottom: 6 },
  reportReasonLabel: { fontSize: 10, fontFamily: "Outfit_700Bold", letterSpacing: 0.8, marginBottom: 3 },
  reportReasonText: { fontSize: 13, fontFamily: "Outfit_500Medium" },
  reportSnapshot: { padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 8 },
  reportSnapshotLabel: { fontSize: 10, fontFamily: "Outfit_700Bold", letterSpacing: 0.8, marginBottom: 6 },
  reportSnapshotSubject: { fontSize: 14, fontFamily: "Outfit_700Bold", marginBottom: 4 },
  reportSnapshotBody: { fontSize: 13, fontFamily: "Outfit_400Regular", lineHeight: 18 },
  reportSnapshotMeta: { fontSize: 11, fontFamily: "Outfit_400Regular", marginTop: 3 },
  reportNote: { padding: 10, borderRadius: 10, borderWidth: 1, marginTop: 8 },
  reportNoteLabel: { fontSize: 10, fontFamily: "Outfit_700Bold", letterSpacing: 0.8, marginBottom: 4 },
  reportNoteText: { fontSize: 13, fontFamily: "Outfit_400Regular" },
  reportNoteBy: { fontSize: 11, fontFamily: "Outfit_400Regular", marginTop: 4 },
  reportActions: { marginTop: 10 },
  reportNoteInput: { padding: 10, borderRadius: 10, borderWidth: 1, fontSize: 13, fontFamily: "Outfit_400Regular", minHeight: 60, textAlignVertical: "top" },
  reportActionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  reportActionBtnText: { fontSize: 13, fontFamily: "Outfit_600SemiBold", color: "#FFF" },
});
