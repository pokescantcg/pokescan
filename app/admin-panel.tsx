import React, { useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  StyleProp,
  ViewStyle,
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
  Linking,
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
import { MarketListing, UserProfile, UserRole, getSuperadminToken } from "@/lib/storage";
import { socialApi, AdminReport } from "@/lib/social-api";
import { getApiUrl } from "@/lib/query-client";

/** Build standard auth header for superadmin endpoints. Returns null when no token. */
async function adminAuthHeader(): Promise<Record<string, string> | null> {
  const token = await getSuperadminToken();
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
}

/** Throws a friendly error if the user has no superadmin session. */
async function requireAdminAuthHeader(): Promise<Record<string, string>> {
  const headers = await adminAuthHeader();
  if (!headers) {
    throw new Error("Superadmin session expired. Please sign in again.");
  }
  return headers;
}

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
  deleteBtn: {
    width: "100%",
    height: 42,
    borderRadius: 12,
    backgroundColor: "#B71C1C",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  deleteBtnText: { fontSize: 14, fontFamily: "Outfit_600SemiBold", color: "#FFF" },
});

type Tab = "listings" | "users" | "reports" | "revenue" | "database" | "logs";

interface ActivityLogEntry {
  id: string;
  listingId: string | null;
  listingName: string | null;
  action: string;
  performedBy: string | null;
  moderatorUsername: string | null;
  moderatorDisplayName: string | null;
  note: string | null;
  createdAt: string;
}

interface AllReportEntry {
  id: string;
  reporterId: string;
  reporterUsername: string | null;
  reporterDisplayName: string | null;
  reportedUserId: string | null;
  reportedUsername: string | null;
  contentType: string;
  contentId: string;
  reason: string;
  contentSnapshot: string | null;
  status: string;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedByUsername: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

const STRIPE_PRICE_MONTHLY = "price_1TM7D8K7N6BNdayAPnuINUuU";

const STRIPE_PRICE_ANNUAL = "price_1TM7D8K7N6BNdayAB1PFakyH";

function getSubscriptionLabel(priceId?: string | null): string {
  if (!priceId) return "Manual";
  if (priceId === STRIPE_PRICE_MONTHLY) return "Monthly (£4.99)";
  if (priceId === STRIPE_PRICE_ANNUAL) return "Annual (£49.99)";
  return "Paid";
}

function formatRenewalDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function ListingRow({
  listing,
  colors,
  onRemove,
  onApprove,
  onReject,
  onMessage,
  onView,
}: {
  listing: MarketListing;
  colors: ReturnType<typeof useThemeColors>;
  onRemove: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onMessage?: () => void;
  onView?: () => void;
}) {
  const timeAgo = getTimeAgo(listing.createdAt);
  const status = listing.status ?? "approved";
  const statusColor =
    status === "approved" ? colors.success :
    status === "rejected" ? colors.error :
    "#E67E22"; // pending → orange

  return (
    <Pressable
      onPress={onView}
      style={[styles.listingRow, { backgroundColor: colors.card, borderColor: status === "pending" ? statusColor : colors.borderLight, borderWidth: status === "pending" ? 1.5 : 1 }]}
    >
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
          <View style={[styles.typeBadge, { backgroundColor: statusColor + "30", marginLeft: 6 }]}>
            <Text style={[styles.typeBadgeText, { color: statusColor }]}>{status.toUpperCase()}</Text>
          </View>
          <Text style={[styles.timeText, { color: colors.textMuted, marginLeft: "auto" }]}>{timeAgo}</Text>
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

        <View style={{ flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {status === "pending" && onApprove && (
            <Pressable onPress={onApprove} style={[styles.adminActionBtn, { backgroundColor: colors.success }]}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#FFF" />
              <Text style={styles.adminActionBtnText}>Approve</Text>
            </Pressable>
          )}
          {status === "pending" && onReject && (
            <Pressable onPress={onReject} style={[styles.adminActionBtn, { backgroundColor: colors.error }]}>
              <Ionicons name="close-circle-outline" size={14} color="#FFF" />
              <Text style={styles.adminActionBtnText}>Reject</Text>
            </Pressable>
          )}
          {onMessage && (
            <Pressable onPress={onMessage} style={[styles.adminActionBtn, { backgroundColor: colors.pokemonBlue }]}>
              <Ionicons name="chatbubble-outline" size={14} color="#FFF" />
              <Text style={styles.adminActionBtnText}>Message</Text>
            </Pressable>
          )}
        </View>
      </View>
      <Pressable
        style={[styles.removeBtn, { backgroundColor: "rgba(231, 76, 60, 0.15)" }]}
        onPress={onRemove}
      >
        <Ionicons name="trash-outline" size={18} color={colors.error} />
      </Pressable>
    </Pressable>
  );
}

function ListingDetailModal({
  listing,
  colors,
  onClose,
  onApprove,
  onReject,
  onMessage,
  onRemove,
  onSaveNote,
}: {
  listing: MarketListing | null;
  colors: ReturnType<typeof useThemeColors>;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onMessage: () => void;
  onRemove: () => void;
  onSaveNote: (note: string | null) => Promise<void>;
}) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  React.useEffect(() => {
    setEditingNote(false);
    setNoteText("");
    setSavingNote(false);
  }, [listing?.id]);

  if (!listing) return null;
  const status = listing.status ?? "approved";
  const statusColor =
    status === "approved" ? colors.success :
    status === "rejected" ? colors.error :
    "#E67E22";
  return (
    <Modal visible={!!listing} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Pressable onPress={onClose} style={{ width: 36 }}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={{ flex: 1, textAlign: "center", fontSize: 16, fontFamily: "Outfit_700Bold", color: colors.text }} numberOfLines={1}>
            Listing Details
          </Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Image source={{ uri: listing.cardImage }} style={{ width: 100, height: 140, borderRadius: 8 }} contentFit="contain" />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 18, fontFamily: "Outfit_700Bold", color: colors.text }}>{listing.cardName}</Text>
              <Text style={{ fontSize: 13, fontFamily: "Outfit_400Regular", color: colors.textSecondary }}>{listing.setName}</Text>
              <Text style={{ fontSize: 13, fontFamily: "Outfit_500Medium", color: colors.textMuted }}>{listing.rarity}</Text>
              <View style={{ flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                <View style={[styles.typeBadge, { backgroundColor: listing.type === "sale" ? colors.success : colors.accent }]}>
                  <Text style={styles.typeBadgeText}>{listing.type === "sale" ? "SALE" : "TRADE"}</Text>
                </View>
                <View style={[styles.typeBadge, { backgroundColor: statusColor + "30" }]}>
                  <Text style={[styles.typeBadgeText, { color: statusColor }]}>{status.toUpperCase()}</Text>
                </View>
              </View>
              {listing.priceGBP != null && (
                <Text style={{ fontSize: 18, fontFamily: "Outfit_700Bold", color: colors.success, marginTop: 4 }}>
                  {formatGBP(listing.priceGBP)}
                </Text>
              )}
            </View>
          </View>

          <View style={{ backgroundColor: colors.card, padding: 12, borderRadius: 10, gap: 4 }}>
            <Text style={{ fontSize: 11, fontFamily: "Outfit_700Bold", color: colors.textMuted, letterSpacing: 1 }}>SELLER</Text>
            <Text style={{ fontSize: 14, fontFamily: "Outfit_600SemiBold", color: colors.text }}>{listing.userName}</Text>
            <Text style={{ fontSize: 12, fontFamily: "Outfit_400Regular", color: colors.textMuted }}>Condition: {listing.condition}</Text>
            <Text style={{ fontSize: 12, fontFamily: "Outfit_400Regular", color: colors.textMuted }}>Posted: {new Date(listing.createdAt).toLocaleString("en-GB")}</Text>
          </View>

          {listing.description ? (
            <View style={{ backgroundColor: colors.card, padding: 12, borderRadius: 10, gap: 4 }}>
              <Text style={{ fontSize: 11, fontFamily: "Outfit_700Bold", color: colors.textMuted, letterSpacing: 1 }}>DESCRIPTION</Text>
              <Text style={{ fontSize: 14, fontFamily: "Outfit_400Regular", color: colors.text, lineHeight: 20 }}>{listing.description}</Text>
            </View>
          ) : null}

          {listing.externalUrl ? (
            <Pressable
              onPress={() => {
                const url = listing.externalUrl!;
                if (/^https?:\/\//i.test(url)) {
                  Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open the external listing URL."));
                } else {
                  Alert.alert("Invalid URL", "This listing has an unsupported URL format.");
                }
              }}
              style={{ backgroundColor: colors.card, padding: 12, borderRadius: 10, gap: 4, flexDirection: "row", alignItems: "center" }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 11, fontFamily: "Outfit_700Bold", color: colors.textMuted, letterSpacing: 1 }}>EXTERNAL LISTING</Text>
                <Text style={{ fontSize: 13, fontFamily: "Outfit_400Regular", color: colors.pokemonBlue }} numberOfLines={1}>{listing.externalUrl}</Text>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.pokemonBlue} />
            </Pressable>
          ) : null}

          {listing.photos && listing.photos.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 11, fontFamily: "Outfit_700Bold", color: colors.textMuted, letterSpacing: 1 }}>SELLER PHOTOS ({listing.photos.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {listing.photos.map((p, i) => (
                  <Image key={i} source={{ uri: p }} style={{ width: 140, height: 140, borderRadius: 10, backgroundColor: colors.surface }} contentFit="cover" />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Review note — editable for approved/rejected listings */}
          {status !== "pending" && (
            <View style={{ backgroundColor: editingNote ? colors.card : statusColor + "15", borderColor: editingNote ? colors.borderLight : statusColor, borderWidth: 1, padding: 12, borderRadius: 10, gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 11, fontFamily: "Outfit_700Bold", color: editingNote ? colors.textMuted : statusColor, letterSpacing: 1 }}>REVIEW NOTE</Text>
                {!editingNote && (
                  <Pressable
                    hitSlop={8}
                    onPress={() => { setNoteText(listing.reviewNote ?? ""); setEditingNote(true); }}
                    style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                  >
                    <Ionicons name="pencil-outline" size={13} color={colors.textMuted} />
                    <Text style={{ fontSize: 12, fontFamily: "Outfit_500Medium", color: colors.textMuted }}>
                      {listing.reviewNote ? "Edit" : "Add note"}
                    </Text>
                  </Pressable>
                )}
              </View>
              {editingNote ? (
                <>
                  <TextInput
                    value={noteText}
                    onChangeText={setNoteText}
                    placeholder="Leave a note for the seller (optional)"
                    placeholderTextColor={colors.textMuted}
                    multiline
                    style={{
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderRadius: 8,
                      padding: 10,
                      fontSize: 14,
                      fontFamily: "Outfit_400Regular",
                      minHeight: 72,
                      textAlignVertical: "top",
                      borderWidth: 1,
                      borderColor: colors.borderLight,
                    }}
                  />
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable
                      onPress={() => setEditingNote(false)}
                      style={{ flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight }}
                    >
                      <Text style={{ fontSize: 13, fontFamily: "Outfit_600SemiBold", color: colors.textSecondary }}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      disabled={savingNote}
                      onPress={async () => {
                        setSavingNote(true);
                        try {
                          await onSaveNote(noteText.trim() || null);
                          setEditingNote(false);
                        } finally {
                          setSavingNote(false);
                        }
                      }}
                      style={{ flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: "center", backgroundColor: colors.pokemonBlue }}
                    >
                      <Text style={{ fontSize: 13, fontFamily: "Outfit_600SemiBold", color: "#FFF" }}>
                        {savingNote ? "Saving…" : "Save Note"}
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 14, fontFamily: "Outfit_400Regular", color: listing.reviewNote ? colors.text : colors.textMuted, fontStyle: listing.reviewNote ? "normal" : "italic" }}>
                    {listing.reviewNote ?? "No note — tap Edit to add one"}
                  </Text>
                  {listing.reviewNoteUpdatedBy && listing.reviewNoteUpdatedAt && (
                    <Text style={{ fontSize: 11, fontFamily: "Outfit_400Regular", color: colors.textMuted, marginTop: 4 }}>
                      {`Last edited by @${listing.reviewNoteUpdatedBy} on ${new Date(listing.reviewNoteUpdatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                    </Text>
                  )}
                </>
              )}
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            {status === "pending" && (
              <>
                <Pressable onPress={onApprove} style={[styles.adminActionBtn, { backgroundColor: colors.success, flex: 1 }]}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#FFF" />
                  <Text style={styles.adminActionBtnText}>Approve</Text>
                </Pressable>
                <Pressable onPress={onReject} style={[styles.adminActionBtn, { backgroundColor: colors.error, flex: 1 }]}>
                  <Ionicons name="close-circle-outline" size={16} color="#FFF" />
                  <Text style={styles.adminActionBtnText}>Reject</Text>
                </Pressable>
              </>
            )}
            <Pressable onPress={onMessage} style={[styles.adminActionBtn, { backgroundColor: colors.pokemonBlue, flex: 1 }]}>
              <Ionicons name="chatbubble-outline" size={16} color="#FFF" />
              <Text style={styles.adminActionBtnText}>Message Seller</Text>
            </Pressable>
            <Pressable onPress={onRemove} style={[styles.adminActionBtn, { backgroundColor: colors.error + "20", flex: 1 }]}>
              <Ionicons name="trash-outline" size={16} color={colors.error} />
              <Text style={[styles.adminActionBtnText, { color: colors.error }]}>Remove</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
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
  onAddFriend,
  friendStatus,
}: {
  profile: UserProfile;
  colors: ReturnType<typeof useThemeColors>;
  isCurrentUser: boolean;
  isSuperadmin: boolean;
  onTogglePremium: () => void;
  onChangeRole: (role: UserRole) => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddFriend?: () => void;
  friendStatus?: "none" | "pending" | "friends";
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
          {profile.isPremium && profile.subscriptionStatus && (
            <View style={[styles.roleBadge, { backgroundColor: colors.accent }]}>
              <Text style={styles.roleBadgeText}>{getSubscriptionLabel(profile.stripePriceId)}</Text>
            </View>
          )}
        </View>
        {profile.isPremium && profile.subscriptionPeriodEnd && (
          <Text style={{ fontSize: 11, fontFamily: "Outfit_400Regular", color: colors.textMuted, marginTop: 2 }}>
            {profile.subscriptionStatus === "canceling" ? "Expires" : "Renews"}: {formatRenewalDate(profile.subscriptionPeriodEnd)}
          </Text>
        )}
      </View>
      {isSuperadmin && !isSuperadminAccount && (
        <View style={styles.userActions}>
          {!isCurrentUser && onAddFriend && friendStatus === "none" && (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: "rgba(46,204,113,0.15)" }]}
              onPress={onAddFriend}
            >
              <Ionicons name="person-add-outline" size={15} color={colors.success} />
            </Pressable>
          )}
          {friendStatus === "pending" && (
            <View style={[styles.actionBtn, { backgroundColor: "rgba(255,255,255,0.05)" }]}>
              <Ionicons name="hourglass-outline" size={15} color={colors.textMuted} />
            </View>
          )}
          {friendStatus === "friends" && (
            <View style={[styles.actionBtn, { backgroundColor: "rgba(46,204,113,0.15)" }]}>
              <Ionicons name="people" size={15} color={colors.success} />
            </View>
          )}
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
                { label: "Moderator", role: "moderator" },
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
      const res = await fetch(new URL("/api/admin/create-user", base).href, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await requireAdminAuthHeader()) },
        body: JSON.stringify({
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

type IonName = React.ComponentProps<typeof Ionicons>["name"];
type MccName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

type DropdownOption<T extends string> =
  | { value: T; label: string; iconLib: "mcc"; icon: MccName }
  | { value: T; label: string; iconLib?: "ion"; icon?: IonName };

function AdminDropdown<T extends string>({
  value,
  options,
  onChange,
  colors,
  icon,
  style,
}: {
  value: T;
  options: DropdownOption<T>[];
  onChange: (v: T) => void;
  colors: ReturnType<typeof useThemeColors>;
  icon?: IonName;
  style?: StyleProp<ViewStyle>;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  function renderIcon(opt: DropdownOption<T> | undefined, size: number, color: string) {
    if (!opt?.icon) {
      return icon ? <Ionicons name={icon} size={size} color={color} /> : null;
    }
    if (opt.iconLib === "mcc") {
      return <MaterialCommunityIcons name={opt.icon} size={size} color={color} />;
    }
    return <Ionicons name={opt.icon} size={size} color={color} />;
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.borderLight,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
          },
          style,
        ]}
      >
        {renderIcon(selected, 18, colors.pokemonRed)}
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            fontFamily: "Outfit_600SemiBold",
            color: colors.text,
          }}
        >
          {selected?.label ?? value}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", paddingHorizontal: 32 }}
          onPress={() => setOpen(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: "hidden",
              }}
            >
              {options.map((opt, idx) => {
                const isActive = opt.value === value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => { onChange(opt.value); setOpen(false); }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingHorizontal: 18,
                      paddingVertical: 14,
                      backgroundColor: isActive ? colors.pokemonRed + "22" : "transparent",
                      borderTopWidth: idx > 0 ? 1 : 0,
                      borderTopColor: colors.borderLight,
                    }}
                  >
                    {renderIcon(opt, 20, isActive ? colors.pokemonRed : colors.textMuted)}
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 15,
                        fontFamily: isActive ? "Outfit_700Bold" : "Outfit_500Medium",
                        color: isActive ? colors.pokemonRed : colors.text,
                      }}
                    >
                      {opt.label}
                    </Text>
                    {isActive && (
                      <Ionicons name="checkmark" size={18} color={colors.pokemonRed} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── DB Browser ──────────────────────────────────────────────────────────────

interface DbCard {
  id: string;
  setId: string;
  setName: string | null;
  name: string;
  number: string;
  rarity: string | null;
  supertype: string | null;
  subtypes: string | null;
  imageSmall: string | null;
  imageLarge: string | null;
  artist: string | null;
  hp: string | null;
  nationalPokedexNumbers: string | null;
  description: string | null;
}

function getSetLang(id: string): string {
  if (id.includes("_ja")) return "JP";
  if (id.includes("_ko")) return "KO";
  if (id.includes("_zh")) return "ZH";
  return "EN";
}

interface DbSet {
  id: string;
  name: string;
  series: string;
  releaseDate: string | null;
  hidden: boolean | null;
  total: number | null;
  cardCount: number;
}

function EditCardModal({
  card,
  colors,
  visible,
  onClose,
  onSaved,
  onDeleted,
}: {
  card: DbCard | null;
  colors: ReturnType<typeof useThemeColors>;
  visible: boolean;
  onClose: () => void;
  onSaved: (updated: DbCard) => void;
  onDeleted: (id: string) => void;
}) {
  const [setNameVal, setSetNameVal] = useState("");
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [rarity, setRarity] = useState("");
  const [supertype, setSupertype] = useState("");
  const [subtypes, setSubtypes] = useState("");
  const [description, setDescription] = useState("");
  const [imageSmall, setImageSmall] = useState("");
  const [imageLarge, setImageLarge] = useState("");
  const [artist, setArtist] = useState("");
  const [hp, setHp] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  React.useEffect(() => {
    if (card) {
      setSetNameVal(card.setName ?? card.setId);
      setName(card.name);
      setNumber(card.number);
      setRarity(card.rarity ?? "");
      setSupertype(card.supertype ?? "");
      setSubtypes(card.subtypes ?? "");
      setDescription(card.description ?? "");
      setImageSmall(card.imageSmall ?? "");
      setImageLarge(card.imageLarge ?? "");
      setArtist(card.artist ?? "");
      setHp(card.hp ?? "");
    }
  }, [card?.id]);

  const handleSave = async () => {
    if (!card) return;
    if (!name.trim()) { Alert.alert("Validation", "Card name cannot be empty."); return; }
    setSaving(true);
    try {
      const headers = await requireAdminAuthHeader();
      const cardUrl = new URL(`/api/admin/db/cards/${card.id}`, getApiUrl()).toString();
      const cardRes = await fetch(cardUrl, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ name, number, rarity: rarity || null, supertype: supertype || null, subtypes: subtypes || null, description: description || null, imageSmall: imageSmall || null, imageLarge: imageLarge || null, artist: artist || null, hp: hp || null }),
      });
      const cardData = await cardRes.json();
      if (!cardRes.ok) throw new Error(cardData.error || "Failed to save card");
      const newSetName = setNameVal.trim();
      if (newSetName && newSetName !== (card.setName ?? card.setId)) {
        const setUrl = new URL(`/api/admin/db/sets/${card.setId}`, getApiUrl()).toString();
        const setRes = await fetch(setUrl, {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ name: newSetName }),
        });
        if (!setRes.ok) {
          const setData = await setRes.json();
          throw new Error(setData.error || "Card saved but failed to update set name");
        }
      }
      onSaved({ ...cardData.card, setName: newSetName || card.setName });
      onClose();
      Alert.alert("Saved", "Card updated successfully.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save card.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!card) return;
    Alert.alert(
      "Delete Card",
      `Are you sure you want to permanently delete "${card.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive", onPress: async () => {
            setDeleting(true);
            try {
              const headers = await requireAdminAuthHeader();
              const url = new URL(`/api/admin/db/cards/${card.id}`, getApiUrl()).toString();
              const res = await fetch(url, { method: "DELETE", headers });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Failed to delete card");
              onDeleted(card.id);
              onClose();
            } catch (e: any) {
              Alert.alert("Error", e.message || "Failed to delete card.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (!card) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={editStyles.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView style={{ width: "100%" }} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={[editStyles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={editStyles.header}>
                  <Text style={[editStyles.title, { color: colors.text }]}>Edit Card</Text>
                  <Pressable onPress={onClose} style={editStyles.closeBtn}>
                    <Ionicons name="close" size={22} color={colors.textMuted} />
                  </Pressable>
                </View>
                <Text style={[editStyles.subtitle, { color: colors.textMuted }]}>{card.id}</Text>

                <Text style={[editStyles.label, { color: colors.textSecondary }]}>Set Name</Text>
                <TextInput
                  style={[editStyles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                  value={setNameVal}
                  onChangeText={setSetNameVal}
                  placeholder="Set name"
                  placeholderTextColor={colors.textMuted}
                  autoCorrect={false}
                />
                <Text style={{ color: colors.textMuted, fontFamily: "Outfit_400Regular", fontSize: 11, marginBottom: 8, marginTop: -4 }}>
                  Editing renames the parent set · {card.setId} · {getSetLang(card.setId)}
                </Text>

                <Text style={[editStyles.label, { color: colors.textSecondary }]}>Description</Text>
                <TextInput
                  style={[editStyles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, minHeight: 64 }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Card flavour text / description"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  autoCorrect={false}
                />

                {(["Name", "Number", "Rarity", "Supertype", "Subtypes", "Artist", "HP"] as const).map((label) => {
                  const field = label.toLowerCase() as "name" | "number" | "rarity" | "supertype" | "subtypes" | "artist" | "hp";
                  const valMap: Record<string, string> = { name, number, rarity, supertype, subtypes, artist, hp };
                  const setterMap: Record<string, (v: string) => void> = { name: setName, number: setNumber, rarity: setRarity, supertype: setSupertype, subtypes: setSubtypes, artist: setArtist, hp: setHp };
                  return (
                    <React.Fragment key={label}>
                      <Text style={[editStyles.label, { color: colors.textSecondary }]}>{label}</Text>
                      <TextInput
                        style={[editStyles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                        value={valMap[field]}
                        onChangeText={setterMap[field]}
                        placeholder={label}
                        placeholderTextColor={colors.textMuted}
                        autoCorrect={false}
                      />
                    </React.Fragment>
                  );
                })}

                <Text style={[editStyles.label, { color: colors.textSecondary }]}>Small Image URL</Text>
                <TextInput
                  style={[editStyles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                  value={imageSmall}
                  onChangeText={setImageSmall}
                  placeholder="https://..."
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={[editStyles.label, { color: colors.textSecondary }]}>Large Image URL</Text>
                <TextInput
                  style={[editStyles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                  value={imageLarge}
                  onChangeText={setImageLarge}
                  placeholder="https://..."
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Pressable
                  style={[editStyles.deleteBtn, (deleting || saving) && { opacity: 0.6 }]}
                  onPress={handleDelete}
                  disabled={deleting || saving}
                >
                  <Ionicons name="trash-outline" size={15} color="#FFF" />
                  <Text style={editStyles.deleteBtnText}>{deleting ? "Deleting…" : "Delete Card"}</Text>
                </Pressable>

                <View style={[editStyles.btnRow, { marginTop: 6 }]}>
                  <Pressable style={[editStyles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
                    <Text style={[editStyles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[editStyles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                    <Text style={editStyles.saveBtnText}>{saving ? "Saving…" : "Save"}</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function EditSetModal({
  set,
  colors,
  visible,
  onClose,
  onSaved,
  onDeleted,
}: {
  set: DbSet | null;
  colors: ReturnType<typeof useThemeColors>;
  visible: boolean;
  onClose: () => void;
  onSaved: (updated: DbSet) => void;
  onDeleted: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [hidden, setHidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [setCards, setSetCards] = useState<{ id: string; name: string; number: string; rarity: string | null }[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [showCards, setShowCards] = useState(false);

  React.useEffect(() => {
    if (set) {
      setName(set.name);
      setReleaseDate(set.releaseDate ?? "");
      setHidden(set.hidden ?? false);
      setSetCards([]);
      setShowCards(false);
    }
  }, [set?.id]);

  const loadSetCards = useCallback(async () => {
    if (!set || cardsLoading) return;
    setCardsLoading(true);
    try {
      const url = new URL("/api/admin/db/cards", getApiUrl());
      url.searchParams.set("setId", set.id);
      url.searchParams.set("pageSize", "100");
      const headers = await requireAdminAuthHeader();
      const res = await fetch(url.toString(), { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSetCards(data.cards ?? []);
    } catch {
      setSetCards([]);
    } finally {
      setCardsLoading(false);
    }
  }, [set?.id]);

  const handleToggleCards = () => {
    const next = !showCards;
    setShowCards(next);
    if (next && setCards.length === 0) loadSetCards();
  };

  const handleSave = async () => {
    if (!set) return;
    if (!name.trim()) { Alert.alert("Validation", "Set name cannot be empty."); return; }
    setSaving(true);
    try {
      const url = new URL(`/api/admin/db/sets/${set.id}`, getApiUrl()).toString();
      const headers = await requireAdminAuthHeader();
      const res = await fetch(url, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ name, releaseDate: releaseDate || null, hidden }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      onSaved({ ...set, ...data.set, cardCount: set.cardCount });
      onClose();
      Alert.alert("Saved", "Set updated successfully.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save set.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!set) return;
    Alert.alert(
      "Delete Set",
      `Are you sure you want to permanently delete the set "${set.name}"? This will also delete all ${set.cardCount} card(s) in it. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive", onPress: async () => {
            setDeleting(true);
            try {
              const headers = await requireAdminAuthHeader();
              const url = new URL(`/api/admin/db/sets/${set.id}`, getApiUrl()).toString();
              const res = await fetch(url, { method: "DELETE", headers });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Failed to delete set");
              onDeleted(set.id);
              onClose();
            } catch (e: any) {
              Alert.alert("Error", e.message || "Failed to delete set.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (!set) return null;

  const lang = getSetLang(set.id);
  const langColor = lang === "JP" ? "#E53935" : lang === "KO" ? "#1565C0" : lang === "ZH" ? "#F57F17" : "#2E7D32";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={editStyles.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ width: "100%" }}>
            <ScrollView style={{ width: "100%" }} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={[editStyles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={editStyles.header}>
                  <Text style={[editStyles.title, { color: colors.text }]}>Edit Set</Text>
                  <Pressable onPress={onClose} style={editStyles.closeBtn}>
                    <Ionicons name="close" size={22} color={colors.textMuted} />
                  </Pressable>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Text style={[editStyles.subtitle, { color: colors.textMuted, marginBottom: 0 }]}>{set.id} · {set.cardCount} cards</Text>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: langColor + "22", borderWidth: 1, borderColor: langColor }}>
                    <Text style={{ fontSize: 11, fontFamily: "Outfit_700Bold", color: langColor }}>{lang}</Text>
                  </View>
                </View>

                <Text style={[editStyles.label, { color: colors.textSecondary }]}>Name</Text>
                <TextInput
                  style={[editStyles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Set name"
                  placeholderTextColor={colors.textMuted}
                  autoCorrect={false}
                />

                <Text style={[editStyles.label, { color: colors.textSecondary }]}>Release Date (YYYY/MM/DD)</Text>
                <TextInput
                  style={[editStyles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                  value={releaseDate}
                  onChangeText={setReleaseDate}
                  placeholder="e.g. 2024/01/01"
                  placeholderTextColor={colors.textMuted}
                  autoCorrect={false}
                />

                <Pressable
                  onPress={() => setHidden(!hidden)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18, paddingVertical: 4 }}
                >
                  <View style={{
                    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
                    borderColor: hidden ? "#E65100" : colors.borderLight,
                    backgroundColor: hidden ? "#E65100" : "transparent",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    {hidden && <Ionicons name="checkmark" size={13} color="#FFF" />}
                  </View>
                  <Text style={{ fontSize: 14, fontFamily: "Outfit_500Medium", color: colors.text }}>
                    Hidden from users
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleToggleCards}
                  style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.borderLight }}
                >
                  <Ionicons name={showCards ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
                  <Text style={{ fontSize: 13, fontFamily: "Outfit_600SemiBold", color: colors.textSecondary }}>
                    {showCards ? "Hide" : "Show"} Cards in Set ({set.cardCount})
                  </Text>
                </Pressable>

                {showCards && (
                  <View style={{ maxHeight: 200, marginBottom: 12, backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.borderLight, overflow: "hidden" }}>
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                      {cardsLoading ? (
                        <Text style={{ padding: 12, textAlign: "center", color: colors.textMuted, fontFamily: "Outfit_400Regular", fontSize: 13 }}>Loading cards…</Text>
                      ) : setCards.length === 0 ? (
                        <Text style={{ padding: 12, textAlign: "center", color: colors.textMuted, fontFamily: "Outfit_400Regular", fontSize: 13 }}>No cards found</Text>
                      ) : setCards.map(c => (
                        <View key={c.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                          <Text style={{ width: 36, fontSize: 11, fontFamily: "Outfit_600SemiBold", color: colors.textMuted }}>#{c.number}</Text>
                          <Text style={{ flex: 1, fontSize: 13, fontFamily: "Outfit_500Medium", color: colors.text }} numberOfLines={1}>{c.name}</Text>
                          {c.rarity ? <Text style={{ fontSize: 10, fontFamily: "Outfit_400Regular", color: colors.textMuted }} numberOfLines={1}>{c.rarity}</Text> : null}
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <Pressable
                  style={[editStyles.deleteBtn, (deleting || saving) && { opacity: 0.6 }]}
                  onPress={handleDelete}
                  disabled={deleting || saving}
                >
                  <Ionicons name="trash-outline" size={15} color="#FFF" />
                  <Text style={editStyles.deleteBtnText}>{deleting ? "Deleting…" : "Delete Set"}</Text>
                </Pressable>

                <View style={editStyles.btnRow}>
                  <Pressable style={[editStyles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
                    <Text style={[editStyles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable style={[editStyles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                    <Text style={editStyles.saveBtnText}>{saving ? "Saving…" : "Save"}</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function DbBrowserSection({ colors, onSwitchToUsers }: { colors: ReturnType<typeof useThemeColors>; onSwitchToUsers: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [activeType, setActiveType] = useState<"cards" | "sets" | "users">("cards");

  const [cards, setCards] = useState<DbCard[]>([]);
  const [cardsTotal, setCardsTotal] = useState(0);
  const [cardsPage, setCardsPage] = useState(1);
  const [cardsSearch, setCardsSearch] = useState("");
  const [cardsLoading, setCardsLoading] = useState(false);
  const [editingCard, setEditingCard] = useState<DbCard | null>(null);

  const [sets, setSets] = useState<DbSet[]>([]);
  const [setsTotal, setSetsTotal] = useState(0);
  const [setsPage, setSetsPage] = useState(1);
  const [setsSearch, setSetsSearch] = useState("");
  const [setsLoading, setSetsLoading] = useState(false);
  const [editingSet, setEditingSet] = useState<DbSet | null>(null);

  const loadCards = useCallback(async (page: number, search: string, append = false) => {
    setCardsLoading(true);
    try {
      const url = new URL("/api/admin/db/cards", getApiUrl());
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", "50");
      if (search) url.searchParams.set("search", search);
      const headers = await requireAdminAuthHeader();
      const res = await fetch(url.toString(), { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCardsTotal(data.total);
      setCardsPage(page);
      setCards(prev => append ? [...prev, ...data.cards] : data.cards);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to load cards");
    } finally {
      setCardsLoading(false);
    }
  }, []);

  const loadSets = useCallback(async (page: number, search: string, append = false) => {
    setSetsLoading(true);
    try {
      const url = new URL("/api/admin/db/sets", getApiUrl());
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", "50");
      if (search) url.searchParams.set("search", search);
      const headers = await requireAdminAuthHeader();
      const res = await fetch(url.toString(), { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSetsTotal(data.total);
      setSetsPage(page);
      setSets(prev => append ? [...prev, ...data.sets] : data.sets);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to load sets");
    } finally {
      setSetsLoading(false);
    }
  }, []);

  const handleTypeChange = (t: "cards" | "sets" | "users") => {
    setActiveType(t);
    if (t === "cards" && cards.length === 0) loadCards(1, "");
    if (t === "sets" && sets.length === 0) loadSets(1, "");
  };

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && cards.length === 0) loadCards(1, "");
  };

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.borderLight }}>
      <Pressable onPress={handleExpand} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#0288D122", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="server-outline" size={20} color="#0288D1" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontFamily: "Outfit_700Bold", color: colors.text }}>Browse & Edit</Text>
          <Text style={{ fontSize: 12, fontFamily: "Outfit_400Regular", color: colors.textMuted }}>Directly edit cards, sets, or users</Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
      </Pressable>

      {expanded && (
        <View style={{ marginTop: 14, gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {(["cards", "sets", "users"] as const).map(t => (
              <Pressable
                key={t}
                onPress={() => handleTypeChange(t)}
                style={{
                  flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center",
                  backgroundColor: activeType === t ? "#0288D1" : colors.background,
                  borderWidth: 1, borderColor: activeType === t ? "#0288D1" : colors.borderLight,
                }}
              >
                <Text style={{ fontSize: 12, fontFamily: "Outfit_600SemiBold", color: activeType === t ? "#FFF" : colors.textMuted }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {activeType === "cards" && (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  style={{ flex: 1, backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontFamily: "Outfit_400Regular", color: colors.text }}
                  placeholder="Search by name or ID…"
                  placeholderTextColor={colors.textMuted}
                  value={cardsSearch}
                  onChangeText={setCardsSearch}
                  onSubmitEditing={() => { setCards([]); loadCards(1, cardsSearch); }}
                  returnKeyType="search"
                />
                <Pressable
                  onPress={() => { setCards([]); loadCards(1, cardsSearch); }}
                  style={{ paddingHorizontal: 14, backgroundColor: "#0288D1", borderRadius: 10, alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name="search" size={18} color="#FFF" />
                </Pressable>
              </View>
              <Text style={{ fontSize: 11, fontFamily: "Outfit_400Regular", color: colors.textMuted }}>
                {cardsTotal.toLocaleString()} cards total
              </Text>
              <View style={{ maxHeight: 360 }}>
                <ScrollView showsVerticalScrollIndicator nestedScrollEnabled>
                  {cards.map(card => (
                    <Pressable
                      key={card.id}
                      onPress={() => setEditingCard(card)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.background, borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: colors.borderLight }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontFamily: "Outfit_600SemiBold", color: colors.text }} numberOfLines={1}>{card.name}</Text>
                        <Text style={{ fontSize: 11, fontFamily: "Outfit_400Regular", color: colors.textMuted }} numberOfLines={1}>
                          {card.id} · #{card.number}{card.rarity ? ` · ${card.rarity}` : ""}
                        </Text>
                      </View>
                      <Ionicons name="pencil-outline" size={16} color="#0288D1" />
                    </Pressable>
                  ))}
                  {cardsLoading && (
                    <Text style={{ textAlign: "center", color: colors.textMuted, fontFamily: "Outfit_400Regular", fontSize: 13, paddingVertical: 8 }}>Loading…</Text>
                  )}
                  {!cardsLoading && cards.length < cardsTotal && (
                    <Pressable
                      onPress={() => loadCards(cardsPage + 1, cardsSearch, true)}
                      style={{ paddingVertical: 10, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, alignItems: "center", marginTop: 4 }}
                    >
                      <Text style={{ fontSize: 13, fontFamily: "Outfit_600SemiBold", color: colors.textSecondary }}>Load More</Text>
                    </Pressable>
                  )}
                </ScrollView>
              </View>
            </View>
          )}

          {activeType === "sets" && (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  style={{ flex: 1, backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontFamily: "Outfit_400Regular", color: colors.text }}
                  placeholder="Search by name or ID…"
                  placeholderTextColor={colors.textMuted}
                  value={setsSearch}
                  onChangeText={setSetsSearch}
                  onSubmitEditing={() => { setSets([]); loadSets(1, setsSearch); }}
                  returnKeyType="search"
                />
                <Pressable
                  onPress={() => { setSets([]); loadSets(1, setsSearch); }}
                  style={{ paddingHorizontal: 14, backgroundColor: "#0288D1", borderRadius: 10, alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name="search" size={18} color="#FFF" />
                </Pressable>
              </View>
              <Text style={{ fontSize: 11, fontFamily: "Outfit_400Regular", color: colors.textMuted }}>
                {setsTotal.toLocaleString()} sets total
              </Text>
              <View style={{ maxHeight: 360 }}>
                <ScrollView showsVerticalScrollIndicator nestedScrollEnabled>
                  {sets.map(s => (
                    <Pressable
                      key={s.id}
                      onPress={() => setEditingSet(s)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.background, borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: s.hidden ? "#E6510044" : colors.borderLight }}
                    >
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.hidden ? "#E65100" : "#27AE60" }} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={{ fontSize: 13, fontFamily: "Outfit_600SemiBold", color: colors.text, flexShrink: 1 }} numberOfLines={1}>{s.name}</Text>
                          {(() => {
                            const lang = getSetLang(s.id);
                            const lc = lang === "JP" ? "#E53935" : lang === "KO" ? "#1565C0" : lang === "ZH" ? "#F57F17" : "#2E7D32";
                            return (
                              <View style={{ paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, backgroundColor: lc + "22", borderWidth: 1, borderColor: lc }}>
                                <Text style={{ fontSize: 9, fontFamily: "Outfit_700Bold", color: lc }}>{lang}</Text>
                              </View>
                            );
                          })()}
                        </View>
                        <Text style={{ fontSize: 11, fontFamily: "Outfit_400Regular", color: colors.textMuted }} numberOfLines={1}>
                          {s.id} · {s.cardCount} cards{s.hidden ? " · HIDDEN" : ""}
                        </Text>
                      </View>
                      <Ionicons name="pencil-outline" size={16} color="#0288D1" />
                    </Pressable>
                  ))}
                  {setsLoading && (
                    <Text style={{ textAlign: "center", color: colors.textMuted, fontFamily: "Outfit_400Regular", fontSize: 13, paddingVertical: 8 }}>Loading…</Text>
                  )}
                  {!setsLoading && sets.length < setsTotal && (
                    <Pressable
                      onPress={() => loadSets(setsPage + 1, setsSearch, true)}
                      style={{ paddingVertical: 10, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, alignItems: "center", marginTop: 4 }}
                    >
                      <Text style={{ fontSize: 13, fontFamily: "Outfit_600SemiBold", color: colors.textSecondary }}>Load More</Text>
                    </Pressable>
                  )}
                </ScrollView>
              </View>
            </View>
          )}

          {activeType === "users" && (
            <View style={{ padding: 16, backgroundColor: colors.background, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, gap: 10, alignItems: "center" }}>
              <Ionicons name="people-outline" size={32} color={colors.textMuted} />
              <Text style={{ fontSize: 14, fontFamily: "Outfit_600SemiBold", color: colors.textSecondary, textAlign: "center" }}>
                User management is in the Users tab
              </Text>
              <Text style={{ fontSize: 12, fontFamily: "Outfit_400Regular", color: colors.textMuted, textAlign: "center" }}>
                Search, edit roles, toggle premium, and manage accounts from the dedicated Users tab.
              </Text>
              <Pressable
                onPress={onSwitchToUsers}
                style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: "#0288D1", borderRadius: 10, marginTop: 4 }}
              >
                <Ionicons name="people" size={16} color="#FFF" />
                <Text style={{ fontSize: 13, fontFamily: "Outfit_600SemiBold", color: "#FFF" }}>Go to Users Tab</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      <EditCardModal
        card={editingCard}
        colors={colors}
        visible={!!editingCard}
        onClose={() => setEditingCard(null)}
        onSaved={(updated) => {
          setCards(prev => prev.map(c => c.id === updated.id ? updated : c));
          setEditingCard(null);
        }}
        onDeleted={(id) => {
          setCards(prev => prev.filter(c => c.id !== id));
          setCardsTotal(prev => Math.max(0, prev - 1));
          setEditingCard(null);
        }}
      />
      <EditSetModal
        set={editingSet}
        colors={colors}
        visible={!!editingSet}
        onClose={() => setEditingSet(null)}
        onSaved={(updated) => {
          setSets(prev => prev.map(s => s.id === updated.id ? updated : s));
          setEditingSet(null);
        }}
        onDeleted={(id) => {
          setSets(prev => prev.filter(s => s.id !== id));
          setSetsTotal(prev => Math.max(0, prev - 1));
          setEditingSet(null);
        }}
      />
    </View>
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
    pendingListingCount,
    refreshPendingListingCount,
  } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>("listings");
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [isRefreshingUsers, setIsRefreshingUsers] = useState(false);

  // Collector verification state
  interface VerificationApp {
    id: string;
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    cardId: string;
    cardName: string;
    cardImage: string;
    frontPhoto: string;
    backPhoto: string;
    status: string;
    createdAt: string;
  }
  const [verifications, setVerifications] = useState<VerificationApp[]>([]);
  const [verificationsLoading, setVerificationsLoading] = useState(false);
  const [verificationPhotoModal, setVerificationPhotoModal] = useState<{ front: string; back: string; name: string } | null>(null);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [revenueData, setRevenueData] = useState<{ subscribers: any[]; stats: any } | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(false);

  const [logsSubTab, setLogsSubTab] = useState<"activity" | "allReports">("activity");
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [activityLogsLoading, setActivityLogsLoading] = useState(false);
  const [activityLogsPage, setActivityLogsPage] = useState(1);
  const [activityLogsHasMore, setActivityLogsHasMore] = useState(false);
  const [activityLogsModerator, setActivityLogsModerator] = useState("");
  const [activityLogsDateFrom, setActivityLogsDateFrom] = useState("");
  const [activityLogsDateTo, setActivityLogsDateTo] = useState("");

  const [allReports, setAllReports] = useState<AllReportEntry[]>([]);
  const [allReportsLoading, setAllReportsLoading] = useState(false);
  const [allReportsPage, setAllReportsPage] = useState(1);
  const [allReportsHasMore, setAllReportsHasMore] = useState(false);
  const [allReportsStatus, setAllReportsStatus] = useState("all");
  const [allReportsReporter, setAllReportsReporter] = useState("");
  const [allReportsReviewNotes, setAllReportsReviewNotes] = useState<Record<string, string>>({});
  const [allReportsDateFrom, setAllReportsDateFrom] = useState("");
  const [allReportsDateTo, setAllReportsDateTo] = useState("");

  // Admin marketplace listings (separate from the user-facing `listings` array
  // so admins can see pending + rejected as well as approved).
  const [adminListings, setAdminListings] = useState<MarketListing[]>([]);
  const [adminListingsLoading, setAdminListingsLoading] = useState(false);
  const [listingFilter, setListingFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [reportFilter, setReportFilter] = useState<"pending" | "reviewed" | "dismissed" | "all">("pending");
  const [selectedListing, setSelectedListing] = useState<MarketListing | null>(null);
  const [moderationAction, setModerationAction] = useState<{ listing: MarketListing; status: "approved" | "rejected" } | null>(null);
  const [moderationNote, setModerationNote] = useState("");

  const loadAdminListings = useCallback(async () => {
    setAdminListingsLoading(true);
    try {
      const url = new URL("/api/admin/listings", getApiUrl());
      url.searchParams.set("status", listingFilter);
      const res = await fetch(url.toString(), { headers: await requireAdminAuthHeader() });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setAdminListings(data.listings || []);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to load listings");
    } finally {
      setAdminListingsLoading(false);
    }
  }, [listingFilter]);

  const handleModerateListing = useCallback(
    async (listing: MarketListing, status: "approved" | "rejected", note?: string) => {
      try {
        const url = new URL(`/api/admin/listings/${listing.id}`, getApiUrl());
        const body: { status: "approved" | "rejected"; reviewNote?: string } = { status };
        if (note && note.trim()) body.reviewNote = note.trim();
        const res = await fetch(url.toString(), {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...(await requireAdminAuthHeader()) },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Server error ${res.status}`);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const reviewNote = note?.trim() || null;
        setAdminListings((prev) =>
          listingFilter === "all"
            ? prev.map((l) => (l.id === listing.id ? { ...l, status, reviewNote } : l))
            : prev.filter((l) => l.id !== listing.id)
        );
        setSelectedListing((prev) => (prev && prev.id === listing.id ? { ...prev, status, reviewNote } : prev));
        refreshPendingListingCount().catch(() => {});
      } catch (e: any) {
        Alert.alert("Error", e.message || "Could not update listing");
      }
    },
    [listingFilter, refreshPendingListingCount]
  );

  const handleSaveNote = useCallback(
    async (listing: MarketListing, note: string | null) => {
      try {
        const url = new URL(`/api/admin/listings/${listing.id}`, getApiUrl());
        const res = await fetch(url.toString(), {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...(await requireAdminAuthHeader()) },
          body: JSON.stringify({ reviewNote: note }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Server error ${res.status}`);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const updatedListing: MarketListing = (await res.json()).listing ?? { ...listing, reviewNote: note };
        setAdminListings((prev) =>
          prev.map((l) => (l.id === listing.id ? updatedListing : l))
        );
        setSelectedListing((prev) =>
          prev && prev.id === listing.id ? updatedListing : prev
        );
      } catch (e: any) {
        Alert.alert("Error", e.message || "Could not update note");
      }
    },
    []
  );

  const promptAndModerate = useCallback((listing: MarketListing, status: "approved" | "rejected") => {
    setModerationNote("");
    setModerationAction({ listing, status });
  }, []);

  const confirmModeration = useCallback(async () => {
    if (!moderationAction) return;
    const { listing, status } = moderationAction;
    setModerationAction(null);
    await handleModerateListing(listing, status, moderationNote);
    setModerationNote("");
  }, [moderationAction, moderationNote, handleModerateListing]);

  const handleMessageSeller = useCallback((listing: MarketListing) => {
    router.push({
      pathname: "/messages",
      params: {
        recipientId: listing.userId,
        recipientName: listing.userName,
        recipientUsername: "",
      },
    });
  }, []);
  const [friendIds, setFriendIds] = useState<Record<string, "pending" | "friends">>({});
  const [addingFriendId, setAddingFriendId] = useState<string | null>(null);

  const loadFriends = useCallback(async () => {
    try {
      const data = await socialApi.getFriends();
      const map: Record<string, "pending" | "friends"> = {};
      data.friends.forEach(f => { map[f.id] = "friends"; });
      data.pendingSent.forEach(f => { map[f.id] = "pending"; });
      data.pendingReceived.forEach(f => { map[f.id] = "pending"; });
      setFriendIds(map);
    } catch { }
  }, []);

  React.useEffect(() => { loadFriends(); }, [loadFriends]);
  React.useEffect(() => {
    if (activeTab === "listings") loadAdminListings();
  }, [activeTab, loadAdminListings]);

  // pendingListingCount comes from shared UserContext so profile badge stays in sync.

  const handleAddFriend = useCallback(async (targetUserId: string) => {
    setAddingFriendId(targetUserId);
    try {
      await socialApi.sendFriendRequest(targetUserId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFriendIds(prev => ({ ...prev, [targetUserId]: "pending" }));
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not send friend request");
    } finally {
      setAddingFriendId(null);
    }
  }, []);

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

  const loadRevenue = useCallback(async () => {
    setRevenueLoading(true);
    try {
      const { getSessionToken } = await import("@/lib/storage");
      const token = await getSessionToken();
      const base = getApiUrl();
      const res = await fetch(new URL("/api/admin/subscription-stats", base).href, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRevenueData(data);
      }
    } catch (e) {
      console.error("Failed to load revenue:", e);
    } finally {
      setRevenueLoading(false);
    }
  }, []);

  const loadActivityLogs = useCallback(async (page = 1, append = false) => {
    setActivityLogsLoading(true);
    try {
      const headers = await requireAdminAuthHeader();
      const url = new URL("/api/admin/activity-log", getApiUrl());
      url.searchParams.set("page", String(page));
      url.searchParams.set("limit", "20");
      if (activityLogsModerator) url.searchParams.set("moderator", activityLogsModerator);
      if (activityLogsDateFrom) url.searchParams.set("dateFrom", activityLogsDateFrom);
      if (activityLogsDateTo) url.searchParams.set("dateTo", activityLogsDateTo);
      const res = await fetch(url.toString(), { headers });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setActivityLogs(prev => append ? [...prev, ...(data.logs || [])] : (data.logs || []));
      setActivityLogsPage(page);
      setActivityLogsHasMore(data.hasMore ?? false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to load activity log");
    } finally {
      setActivityLogsLoading(false);
    }
  }, [activityLogsModerator, activityLogsDateFrom, activityLogsDateTo]);

  const loadAllReports = useCallback(async (page = 1, append = false) => {
    setAllReportsLoading(true);
    try {
      const headers = await requireAdminAuthHeader();
      const url = new URL("/api/admin/reports/all", getApiUrl());
      url.searchParams.set("page", String(page));
      url.searchParams.set("limit", "20");
      if (allReportsStatus !== "all") url.searchParams.set("status", allReportsStatus);
      if (allReportsReporter) url.searchParams.set("reporter", allReportsReporter);
      if (allReportsDateFrom) url.searchParams.set("dateFrom", allReportsDateFrom);
      if (allReportsDateTo) url.searchParams.set("dateTo", allReportsDateTo);
      const res = await fetch(url.toString(), { headers });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setAllReports(prev => append ? [...prev, ...(data.reports || [])] : (data.reports || []));
      setAllReportsPage(page);
      setAllReportsHasMore(data.hasMore ?? false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to load reports");
    } finally {
      setAllReportsLoading(false);
    }
  }, [allReportsStatus, allReportsReporter, allReportsDateFrom, allReportsDateTo]);

  const handleUpdateAllReport = useCallback(async (id: string, status: "reviewed" | "dismissed") => {
    try {
      await socialApi.updateReport(id, status, allReportsReviewNotes[id] || undefined);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadAllReports(1);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not update report.");
    }
  }, [allReportsReviewNotes, loadAllReports]);

  React.useEffect(() => {
    if (activeTab === "reports") loadReports();
    if (activeTab === "revenue") loadRevenue();
    if (activeTab === "users") { handleRefreshUsers(); loadVerifications(); }
    if (activeTab === "logs") {
      if (logsSubTab === "activity") loadActivityLogs(1);
      else loadAllReports(1);
    }
  }, [activeTab, loadReports, loadRevenue]);

  React.useEffect(() => {
    if (activeTab === "logs") {
      if (logsSubTab === "activity") loadActivityLogs(1);
      else loadAllReports(1);
    }
  }, [logsSubTab]);

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

  const loadVerifications = useCallback(async () => {
    setVerificationsLoading(true);
    try {
      const url = new URL("/api/admin/collector-verifications", getApiUrl());
      url.searchParams.set("status", "pending");
      const res = await fetch(url.toString(), { headers: await requireAdminAuthHeader() });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setVerifications(data.verifications || []);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to load applications");
    } finally {
      setVerificationsLoading(false);
    }
  }, []);

  const handleVerificationDecision = useCallback(async (id: string, action: "approve" | "reject") => {
    try {
      const url = new URL(`/api/admin/collector-verifications/${id}/${action}`, getApiUrl());
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: await requireAdminAuthHeader(),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setVerifications((prev) => prev.filter((v) => v.id !== id));
      if (action === "approve") await refreshUsers();
    } catch (e: any) {
      Alert.alert("Error", e.message || `Could not ${action}`);
    }
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
      const res = await fetch(url.toString(), { headers: await requireAdminAuthHeader() });
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
          onPress: async () => {
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
            const _adminToken = await getSuperadminToken();
            if (_adminToken) xhr.setRequestHeader("Authorization", `Bearer ${_adminToken}`);
            xhr.send(JSON.stringify({}));
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
          onPress: async () => {
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
            const _adminToken = await getSuperadminToken();
            if (_adminToken) xhr.setRequestHeader("Authorization", `Bearer ${_adminToken}`);
            xhr.send(JSON.stringify({}));
          },
        },
      ]
    );
  }, []);

  interface AdminSet {
    id: string;
    name: string;
    series: string;
    hidden: boolean;
    releaseDate: string | null;
    cardCount: number;
    language: string;
  }
  const [adminSets, setAdminSets] = useState<AdminSet[]>([]);
  const [adminSetsLoading, setAdminSetsLoading] = useState(false);
  const [setFilter, setSetFilter] = useState<"all" | "hidden" | "visible">("all");
  const [setLangFilter, setSetLangFilter] = useState<string>("all");

  const loadAdminSets = useCallback(async () => {
    setAdminSetsLoading(true);
    try {
      const url = new URL("/api/admin/sets", getApiUrl());
      const res = await fetch(url.toString(), { headers: await requireAdminAuthHeader() });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setAdminSets(data.sets || []);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to load sets");
    } finally {
      setAdminSetsLoading(false);
    }
  }, []);

  const toggleSetVisibility = useCallback(async (setIds: string[], hidden: boolean) => {
    try {
      const url = new URL("/api/admin/sets/visibility", getApiUrl());
      const res = await fetch(url.toString(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await requireAdminAuthHeader()) },
        body: JSON.stringify({ setIds, hidden }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setAdminSets(prev => prev.map(s => setIds.includes(s.id) ? { ...s, hidden } : s));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update visibility");
    }
  }, []);

  const filteredAdminSets = useMemo(() => {
    let list = adminSets;
    if (setFilter === "hidden") list = list.filter(s => s.hidden);
    if (setFilter === "visible") list = list.filter(s => !s.hidden);
    if (setLangFilter !== "all") list = list.filter(s => s.language === setLangFilter);
    return list;
  }, [adminSets, setFilter, setLangFilter]);

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
        const res = await fetch(new URL("/api/admin/edit-user", base).href, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...(await requireAdminAuthHeader()) },
        body: JSON.stringify({
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
        moderator: "Moderator",
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

      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <AdminDropdown
          value={activeTab}
          onChange={(v) => setActiveTab(v as Tab)}
          colors={colors}
          options={[
            {
              value: "listings" as Tab,
              label: `Listings${pendingListingCount > 0 ? ` (${pendingListingCount})` : ""}`,
              icon: "store-outline",
              iconLib: "mcc",
            },
            ...((isSuperadminUser || isAdminUser)
              ? [{ value: "users" as Tab, label: `Users (${allUsers.length})`, icon: "people-outline" }]
              : []),
            {
              value: "reports" as Tab,
              label: `Reports${reports.filter(r => r.status === "pending").length > 0 ? ` (${reports.filter(r => r.status === "pending").length})` : ""}`,
              icon: "flag-outline",
            },
            ...((isSuperadminUser || isAdminUser)
              ? [{ value: "logs" as Tab, label: "Logs", icon: "document-text-outline" }]
              : []),
            ...(isSuperadminUser
              ? [
                  { value: "revenue" as Tab, label: "Revenue", icon: "cash-outline" },
                  { value: "database" as Tab, label: "Database", icon: "server-outline" },
                ]
              : []),
          ]}
        />
      </View>

      {activeTab === "listings" && (
        <FlatList
          data={adminListings}
          refreshing={adminListingsLoading}
          onRefresh={loadAdminListings}
          renderItem={({ item }) => (
            <ListingRow
              listing={item}
              colors={colors}
              onView={() => setSelectedListing(item)}
              onRemove={() => handleRemoveListing(item)}
              onApprove={() => promptAndModerate(item, "approved")}
              onReject={() => promptAndModerate(item, "rejected")}
              onMessage={() => handleMessageSeller(item)}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={{ gap: 10 }}>
              <AdminDropdown
                value={listingFilter}
                onChange={(v) => setListingFilter(v as typeof listingFilter)}
                colors={colors}
                icon="filter-outline"
                options={[
                  { value: "pending" as typeof listingFilter, label: "Pending", icon: "time-outline" },
                  { value: "approved" as typeof listingFilter, label: "Approved", icon: "checkmark-circle-outline" },
                  { value: "rejected" as typeof listingFilter, label: "Rejected", icon: "close-circle-outline" },
                  { value: "all" as typeof listingFilter, label: "All Listings", icon: "list-outline" },
                ]}
              />
              {adminListings.length > 0 && (
                <View style={[styles.summaryBar, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                      {adminListings.filter((l) => l.type === "sale").length}
                    </Text>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>For Sale</Text>
                  </View>
                  <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>
                      {adminListings.filter((l) => l.type === "trade").length}
                    </Text>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Trades</Text>
                  </View>
                  <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>{adminListings.length}</Text>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total</Text>
                  </View>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="store-check-outline" size={56} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                {listingFilter === "pending" ? "No Pending Listings" : "No Listings"}
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                {listingFilter === "pending"
                  ? "All caught up - no listings awaiting review"
                  : `No ${listingFilter} listings to display`}
              </Text>
            </View>
          }
        />
      )}

      <ListingDetailModal
        listing={selectedListing}
        colors={colors}
        onClose={() => setSelectedListing(null)}
        onApprove={() => selectedListing && promptAndModerate(selectedListing, "approved")}
        onReject={() => selectedListing && promptAndModerate(selectedListing, "rejected")}
        onMessage={() => {
          if (selectedListing) {
            const l = selectedListing;
            setSelectedListing(null);
            handleMessageSeller(l);
          }
        }}
        onRemove={() => {
          if (selectedListing) {
            const l = selectedListing;
            setSelectedListing(null);
            handleRemoveListing(l);
          }
        }}
        onSaveNote={(note) => selectedListing ? handleSaveNote(selectedListing, note) : Promise.resolve()}
      />

      <Modal
        visible={!!moderationAction}
        transparent
        animationType="fade"
        onRequestClose={() => setModerationAction(null)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", padding: 24 }}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
              <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, gap: 14 }}>
                <Text style={{ fontSize: 17, fontFamily: "Outfit_700Bold", color: colors.text }}>
                  {moderationAction?.status === "approved" ? "Approve Listing" : "Reject Listing"}
                </Text>
                <Text style={{ fontSize: 13, fontFamily: "Outfit_400Regular", color: colors.textMuted }}>
                  {moderationAction?.listing.cardName} — {moderationAction?.listing.userName}
                </Text>
                <View style={{ gap: 6 }}>
                  <Text style={{ fontSize: 12, fontFamily: "Outfit_600SemiBold", color: colors.textSecondary, letterSpacing: 0.5 }}>
                    NOTE FOR SELLER (optional)
                  </Text>
                  <TextInput
                    value={moderationNote}
                    onChangeText={setModerationNote}
                    placeholder={moderationAction?.status === "approved" ? "e.g. Approved — great listing!" : "e.g. Photo quality too low, please resubmit."}
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={3}
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: colors.border,
                      padding: 10,
                      fontSize: 14,
                      fontFamily: "Outfit_400Regular",
                      color: colors.text,
                      minHeight: 72,
                      textAlignVertical: "top",
                    }}
                  />
                </View>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                  <Pressable
                    onPress={() => { setModerationAction(null); setModerationNote(""); }}
                    style={{ flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}
                  >
                    <Text style={{ fontSize: 14, fontFamily: "Outfit_600SemiBold", color: colors.textSecondary }}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={confirmModeration}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 10,
                      backgroundColor: moderationAction?.status === "approved" ? colors.success : colors.error,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 14, fontFamily: "Outfit_700Bold", color: "#FFF" }}>
                      {moderationAction?.status === "approved" ? "Approve" : "Reject"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {activeTab === "reports" && (
        <FlatList
          data={reportFilter === "all" ? reports : reports.filter(r => r.status === reportFilter)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          onRefresh={loadReports}
          refreshing={reportsLoading}
          ListHeaderComponent={
            <View style={{ gap: 10 }}>
              <AdminDropdown
                value={reportFilter}
                onChange={(v) => setReportFilter(v as typeof reportFilter)}
                colors={colors}
                icon="filter-outline"
                options={[
                  { value: "pending" as typeof reportFilter, label: "Pending", icon: "time-outline" },
                  { value: "reviewed" as typeof reportFilter, label: "Reviewed", icon: "checkmark-circle-outline" },
                  { value: "dismissed" as typeof reportFilter, label: "Dismissed", icon: "close-circle-outline" },
                  { value: "all" as typeof reportFilter, label: "All Reports", icon: "list-outline" },
                ]}
              />
              {reports.length > 0 && (
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
              )}
            </View>
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
                <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                  {reportFilter === "all" ? "No Reports" : `No ${reportFilter.charAt(0).toUpperCase() + reportFilter.slice(1)} Reports`}
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                  {reportFilter === "pending" ? "No content reports to review" : `No ${reportFilter} reports to display`}
                </Text>
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

      {activeTab === "logs" && (isSuperadminUser || isAdminUser) && (
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", marginHorizontal: 16, marginBottom: 10, backgroundColor: colors.surface, borderRadius: 12, padding: 3, borderWidth: 1, borderColor: colors.borderLight }}>
            <Pressable
              style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", backgroundColor: logsSubTab === "activity" ? colors.pokemonRed : "transparent" }}
              onPress={() => setLogsSubTab("activity")}
            >
              <Text style={{ fontSize: 13, fontFamily: "Outfit_600SemiBold", color: logsSubTab === "activity" ? "#FFF" : colors.textMuted }}>Mod Activity</Text>
            </Pressable>
            <Pressable
              style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", backgroundColor: logsSubTab === "allReports" ? colors.pokemonRed : "transparent" }}
              onPress={() => setLogsSubTab("allReports")}
            >
              <Text style={{ fontSize: 13, fontFamily: "Outfit_600SemiBold", color: logsSubTab === "allReports" ? "#FFF" : colors.textMuted }}>All Reports</Text>
            </Pressable>
          </View>

          {logsSubTab === "activity" && (
            <FlatList
              data={activityLogs}
              keyExtractor={(item) => item.id}
              refreshing={activityLogsLoading && activityLogsPage === 1}
              onRefresh={() => loadActivityLogs(1)}
              onEndReached={() => { if (activityLogsHasMore && !activityLogsLoading) loadActivityLogs(activityLogsPage + 1, true); }}
              onEndReachedThreshold={0.3}
              contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={{ gap: 8, marginBottom: 8 }}>
                  <TextInput
                    style={{ backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontFamily: "Outfit_400Regular", color: colors.text }}
                    placeholder="Filter by moderator username..."
                    placeholderTextColor={colors.textMuted}
                    value={activityLogsModerator}
                    onChangeText={setActivityLogsModerator}
                    onSubmitEditing={() => loadActivityLogs(1)}
                    returnKeyType="search"
                  />
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TextInput
                      style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontFamily: "Outfit_400Regular", color: colors.text }}
                      placeholder="From (YYYY-MM-DD)"
                      placeholderTextColor={colors.textMuted}
                      value={activityLogsDateFrom}
                      onChangeText={setActivityLogsDateFrom}
                    />
                    <TextInput
                      style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontFamily: "Outfit_400Regular", color: colors.text }}
                      placeholder="To (YYYY-MM-DD)"
                      placeholderTextColor={colors.textMuted}
                      value={activityLogsDateTo}
                      onChangeText={setActivityLogsDateTo}
                    />
                  </View>
                  <Pressable
                    style={{ backgroundColor: colors.pokemonRed, borderRadius: 10, paddingVertical: 9, alignItems: "center" }}
                    onPress={() => loadActivityLogs(1)}
                  >
                    <Text style={{ fontSize: 13, fontFamily: "Outfit_600SemiBold", color: "#FFF" }}>Apply Filter</Text>
                  </Pressable>
                </View>
              }
              ListEmptyComponent={
                activityLogsLoading ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="hourglass-outline" size={48} color={colors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Loading...</Text>
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="document-text-outline" size={56} color={colors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No Activity</Text>
                    <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>No moderation actions recorded yet</Text>
                  </View>
                )
              }
              ListFooterComponent={
                activityLogsHasMore ? (
                  <Pressable
                    style={{ margin: 16, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}
                    onPress={() => loadActivityLogs(activityLogsPage + 1, true)}
                    disabled={activityLogsLoading}
                  >
                    <Text style={{ fontSize: 13, fontFamily: "Outfit_600SemiBold", color: colors.textSecondary }}>{activityLogsLoading ? "Loading..." : "Load More"}</Text>
                  </Pressable>
                ) : null
              }
              renderItem={({ item: log }) => {
                const actionColor = log.action === "approved" ? colors.success : log.action === "rejected" ? colors.error : colors.accent;
                const actionLabel = log.action === "approved" ? "Approved" : log.action === "rejected" ? "Rejected" : "Note Edited";
                const actionIcon: "checkmark-circle-outline" | "close-circle-outline" | "create-outline" =
                  log.action === "approved" ? "checkmark-circle-outline" : log.action === "rejected" ? "close-circle-outline" : "create-outline";
                const handleLogPress = async () => {
                  if (!log.listingId) return;
                  try {
                    const url = new URL("/api/admin/listings", getApiUrl());
                    url.searchParams.set("status", "all");
                    const headers = await requireAdminAuthHeader();
                    const res = await fetch(url.toString(), { headers });
                    if (!res.ok) return;
                    const data = await res.json();
                    const found = (data.listings as MarketListing[] || []).find((l) => l.id === log.listingId);
                    if (found) setSelectedListing(found);
                    else Alert.alert("Listing Not Found", "This listing may have been deleted.");
                  } catch {}
                };
                return (
                  <Pressable style={{ backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, padding: 12, marginBottom: 8 }} onPress={handleLogPress}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: actionColor + "20" }}>
                        <Ionicons name={actionIcon} size={12} color={actionColor} />
                        <Text style={{ fontSize: 11, fontFamily: "Outfit_700Bold", color: actionColor }}>{actionLabel.toUpperCase()}</Text>
                      </View>
                      <Text style={{ flex: 1, fontSize: 11, fontFamily: "Outfit_400Regular", color: colors.textMuted, textAlign: "right" }}>{getTimeAgo(log.createdAt)}</Text>
                      {log.listingId && <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />}
                    </View>
                    <Text style={{ fontSize: 14, fontFamily: "Outfit_600SemiBold", color: colors.text, marginBottom: 2 }}>{log.listingName || "Unknown Listing"}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name="person-outline" size={12} color={colors.textMuted} />
                      <Text style={{ fontSize: 12, fontFamily: "Outfit_400Regular", color: colors.textMuted }}>
                        {log.moderatorDisplayName || log.moderatorUsername || "Unknown"}{log.moderatorUsername ? ` (@${log.moderatorUsername})` : ""}
                      </Text>
                    </View>
                    {log.note ? (
                      <View style={{ marginTop: 6, padding: 8, backgroundColor: colors.background, borderRadius: 8 }}>
                        <Text style={{ fontSize: 11, fontFamily: "Outfit_700Bold", color: colors.textMuted, letterSpacing: 0.5, marginBottom: 2 }}>NOTE</Text>
                        <Text style={{ fontSize: 12, fontFamily: "Outfit_400Regular", color: colors.textSecondary }}>{log.note}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              }}
            />
          )}

          {logsSubTab === "allReports" && (
            <FlatList
              data={allReports}
              keyExtractor={(item) => item.id}
              refreshing={allReportsLoading && allReportsPage === 1}
              onRefresh={() => loadAllReports(1)}
              onEndReached={() => { if (allReportsHasMore && !allReportsLoading) loadAllReports(allReportsPage + 1, true); }}
              onEndReachedThreshold={0.3}
              contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={{ gap: 8, marginBottom: 8 }}>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {(["all", "pending", "reviewed", "dismissed"] as const).map((s) => (
                      <Pressable
                        key={s}
                        style={{ flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: "center", backgroundColor: allReportsStatus === s ? colors.pokemonRed : colors.surface, borderWidth: 1, borderColor: allReportsStatus === s ? colors.pokemonRed : colors.border }}
                        onPress={() => { setAllReportsStatus(s); setAllReports([]); }}
                      >
                        <Text style={{ fontSize: 11, fontFamily: "Outfit_600SemiBold", color: allReportsStatus === s ? "#FFF" : colors.textMuted }}>
                          {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    style={{ backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontFamily: "Outfit_400Regular", color: colors.text }}
                    placeholder="Filter by reporter username..."
                    placeholderTextColor={colors.textMuted}
                    value={allReportsReporter}
                    onChangeText={setAllReportsReporter}
                    onSubmitEditing={() => loadAllReports(1)}
                    returnKeyType="search"
                  />
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TextInput
                      style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontFamily: "Outfit_400Regular", color: colors.text }}
                      placeholder="From (YYYY-MM-DD)"
                      placeholderTextColor={colors.textMuted}
                      value={allReportsDateFrom}
                      onChangeText={setAllReportsDateFrom}
                    />
                    <TextInput
                      style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontFamily: "Outfit_400Regular", color: colors.text }}
                      placeholder="To (YYYY-MM-DD)"
                      placeholderTextColor={colors.textMuted}
                      value={allReportsDateTo}
                      onChangeText={setAllReportsDateTo}
                    />
                  </View>
                  <Pressable
                    style={{ backgroundColor: colors.pokemonRed, borderRadius: 10, paddingVertical: 9, alignItems: "center" }}
                    onPress={() => loadAllReports(1)}
                  >
                    <Text style={{ fontSize: 13, fontFamily: "Outfit_600SemiBold", color: "#FFF" }}>Apply Filter</Text>
                  </Pressable>
                </View>
              }
              ListEmptyComponent={
                allReportsLoading ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="hourglass-outline" size={48} color={colors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Loading...</Text>
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="shield-checkmark-outline" size={56} color={colors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No Reports</Text>
                    <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>No reports match your filter</Text>
                  </View>
                )
              }
              ListFooterComponent={
                allReportsHasMore ? (
                  <Pressable
                    style={{ margin: 16, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}
                    onPress={() => loadAllReports(allReportsPage + 1, true)}
                    disabled={allReportsLoading}
                  >
                    <Text style={{ fontSize: 13, fontFamily: "Outfit_600SemiBold", color: colors.textSecondary }}>{allReportsLoading ? "Loading..." : "Load More"}</Text>
                  </Pressable>
                ) : null
              }
              renderItem={({ item: report }) => {
                const isPending = report.status === "pending";
                const statusColor = isPending ? colors.pokemonRed : report.status === "reviewed" ? colors.success : colors.textMuted;
                type ReportSnapshot = { cardName?: string; cardImage?: string; setName?: string; condition?: string; type?: string; priceGBP?: number; userName?: string; subject?: string; body?: string; senderUsername?: string };
                let snapshot: ReportSnapshot | null = null;
                try { snapshot = report.contentSnapshot ? (JSON.parse(report.contentSnapshot) as ReportSnapshot) : null; } catch {}
                return (
                  <View style={[styles.reportCard, { backgroundColor: colors.card, borderColor: isPending ? colors.pokemonRed : colors.border }]}>
                    <View style={styles.reportCardHeader}>
                      <View style={[styles.reportTypeBadge, { backgroundColor: report.contentType === "message" ? colors.pokemonBlue : colors.success }]}>
                        <Ionicons name={report.contentType === "message" ? "mail-outline" : "pricetag-outline"} size={12} color="#FFF" />
                        <Text style={styles.reportTypeBadgeText}>{report.contentType === "message" ? "MESSAGE" : "LISTING"}</Text>
                      </View>
                      <View style={[styles.reportStatusBadge, { backgroundColor: statusColor + "20" }]}>
                        <Text style={[styles.reportStatusText, { color: statusColor }]}>{report.status.toUpperCase()}</Text>
                      </View>
                      <Text style={[styles.reportTime, { color: colors.textMuted }]}>{getTimeAgo(report.createdAt)}</Text>
                    </View>
                    <View style={styles.reportMeta}>
                      <Ionicons name="person-outline" size={13} color={colors.textMuted} />
                      <Text style={[styles.reportMetaText, { color: colors.textMuted }]}>
                        Reporter: <Text style={{ color: colors.text }}>{report.reporterDisplayName || report.reporterUsername || "Unknown"}</Text>
                        {report.reportedUsername ? <> · Against <Text style={{ color: colors.pokemonRed }}>@{report.reportedUsername}</Text></> : null}
                      </Text>
                    </View>
                    <View style={[styles.reportReasonBox, { backgroundColor: colors.background }]}>
                      <Text style={[styles.reportReasonLabel, { color: colors.textMuted }]}>REASON</Text>
                      <Text style={[styles.reportReasonText, { color: colors.text }]}>{report.reason}</Text>
                    </View>
                    {snapshot && report.contentType === "listing" && (
                      <View style={{ padding: 8, backgroundColor: colors.background, borderRadius: 8, marginTop: 4 }}>
                        <Text style={{ fontSize: 10, fontFamily: "Outfit_700Bold", color: colors.textMuted, letterSpacing: 0.5, marginBottom: 4 }}>LISTING</Text>
                        <Text style={{ fontSize: 13, fontFamily: "Outfit_600SemiBold", color: colors.text }}>{snapshot.cardName}</Text>
                        <Text style={{ fontSize: 11, fontFamily: "Outfit_400Regular", color: colors.textMuted }}>{snapshot.userName}</Text>
                      </View>
                    )}
                    {report.reviewNote && (
                      <View style={[styles.reportNote, { backgroundColor: colors.success + "15", borderColor: colors.success }]}>
                        <Text style={[styles.reportNoteLabel, { color: colors.success }]}>REVIEW NOTE</Text>
                        <Text style={[styles.reportNoteText, { color: colors.text }]}>{report.reviewNote}</Text>
                        {report.reviewedByUsername && <Text style={[styles.reportNoteBy, { color: colors.textMuted }]}>— @{report.reviewedByUsername}</Text>}
                      </View>
                    )}
                    {isPending && (
                      <View style={styles.reportActions}>
                        <TextInput
                          style={[styles.reportNoteInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                          placeholder="Add a review note (optional)..."
                          placeholderTextColor={colors.textMuted}
                          value={allReportsReviewNotes[report.id] || ""}
                          onChangeText={text => setAllReportsReviewNotes(prev => ({ ...prev, [report.id]: text }))}
                          multiline
                        />
                        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                          <Pressable
                            style={[styles.reportActionBtn, { backgroundColor: colors.success, flex: 1 }]}
                            onPress={() => handleUpdateAllReport(report.id, "reviewed")}
                          >
                            <Ionicons name="checkmark-circle-outline" size={16} color="#FFF" />
                            <Text style={styles.reportActionBtnText}>Mark Reviewed</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.reportActionBtn, { backgroundColor: colors.textMuted, flex: 1 }]}
                            onPress={() => handleUpdateAllReport(report.id, "dismissed")}
                          >
                            <Ionicons name="close-circle-outline" size={16} color="#FFF" />
                            <Text style={styles.reportActionBtnText}>Dismiss</Text>
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </View>
                );
              }}
            />
          )}
        </View>
      )}

      {activeTab === "revenue" && isSuperadminUser && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 14 }}
        >
          {revenueLoading && !revenueData ? (
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <Text style={{ color: colors.textMuted, fontFamily: "Outfit_400Regular" }}>Loading revenue data…</Text>
            </View>
          ) : revenueData ? (
            <>
              <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.borderLight }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Ionicons name="trending-up" size={20} color={colors.success} />
                  <Text style={{ fontSize: 17, fontFamily: "Outfit_700Bold", color: colors.text }}>Revenue Overview</Text>
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {[
                    { label: "Today", value: revenueData.stats.dailyRevenue, icon: "today-outline" as const },
                    { label: "This Week", value: revenueData.stats.weeklyRevenue, icon: "calendar-outline" as const },
                    { label: "This Month", value: revenueData.stats.monthlyRevenue, icon: "calendar" as const },
                    { label: "This Year", value: revenueData.stats.yearlyRevenue, icon: "analytics-outline" as const },
                  ].map((item) => (
                    <View key={item.label} style={{ width: "47%", backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.borderLight }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <Ionicons name={item.icon} size={14} color={colors.textMuted} />
                        <Text style={{ fontSize: 11, fontFamily: "Outfit_500Medium", color: colors.textMuted }}>{item.label}</Text>
                      </View>
                      <Text style={{ fontSize: 20, fontFamily: "Outfit_700Bold", color: colors.success }}>£{item.value.toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.borderLight }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Ionicons name="people" size={20} color={colors.accent} />
                  <Text style={{ fontSize: 17, fontFamily: "Outfit_700Bold", color: colors.text }}>Subscriber Breakdown</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.borderLight, alignItems: "center" }}>
                    <Text style={{ fontSize: 28, fontFamily: "Outfit_700Bold", color: colors.text }}>{revenueData.stats.totalActive}</Text>
                    <Text style={{ fontSize: 12, fontFamily: "Outfit_500Medium", color: colors.textMuted }}>Active Total</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.borderLight, alignItems: "center" }}>
                    <Text style={{ fontSize: 28, fontFamily: "Outfit_700Bold", color: colors.accent }}>{revenueData.stats.monthlyCount}</Text>
                    <Text style={{ fontSize: 12, fontFamily: "Outfit_500Medium", color: colors.textMuted }}>Monthly</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.borderLight, alignItems: "center" }}>
                    <Text style={{ fontSize: 28, fontFamily: "Outfit_700Bold", color: colors.gold }}>{revenueData.stats.annualCount}</Text>
                    <Text style={{ fontSize: 12, fontFamily: "Outfit_500Medium", color: colors.textMuted }}>Annual</Text>
                  </View>
                </View>
                <View style={{ marginTop: 10, backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.borderLight, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 13, fontFamily: "Outfit_500Medium", color: colors.textMuted }}>Monthly Recurring Revenue (MRR)</Text>
                  <Text style={{ fontSize: 17, fontFamily: "Outfit_700Bold", color: colors.success }}>£{revenueData.stats.monthlyRecurring.toFixed(2)}</Text>
                </View>
              </View>

              {revenueData.subscribers.length > 0 && (
                <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.borderLight }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Ionicons name="diamond" size={20} color={colors.gold} />
                    <Text style={{ fontSize: 17, fontFamily: "Outfit_700Bold", color: colors.text }}>Paid Subscribers ({revenueData.subscribers.length})</Text>
                  </View>
                  {revenueData.subscribers.map((sub: any) => (
                    <View key={sub.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: sub.status === "active" || sub.status === "canceling" ? colors.success + "20" : colors.error + "20", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                        <Ionicons name={sub.status === "active" || sub.status === "canceling" ? "checkmark-circle" : "close-circle"} size={18} color={sub.status === "active" || sub.status === "canceling" ? colors.success : colors.error} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontFamily: "Outfit_600SemiBold", color: colors.text }}>{sub.displayName}</Text>
                        <Text style={{ fontSize: 11, fontFamily: "Outfit_400Regular", color: colors.textMuted }}>@{sub.username}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <View style={{ backgroundColor: sub.plan === "annual" ? colors.gold : colors.accent, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 10, fontFamily: "Outfit_700Bold", color: "#000" }}>{sub.plan === "annual" ? "ANNUAL" : "MONTHLY"}</Text>
                          </View>
                          <Text style={{ fontSize: 13, fontFamily: "Outfit_600SemiBold", color: colors.text }}>£{sub.price.toFixed(2)}</Text>
                        </View>
                        <Text style={{ fontSize: 10, fontFamily: "Outfit_400Regular", color: colors.textMuted, marginTop: 2 }}>
                          {sub.status === "canceling" ? "Expires" : "Renews"}: {formatRenewalDate(sub.periodEnd)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <Pressable
                onPress={loadRevenue}
                style={{ alignSelf: "center", marginTop: 4, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderLight }}
              >
                <Ionicons name="refresh-outline" size={16} color={colors.text} />
                <Text style={{ fontSize: 13, fontFamily: "Outfit_500Medium", color: colors.text }}>Refresh</Text>
              </Pressable>
            </>
          ) : (
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <Ionicons name="cash-outline" size={40} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontFamily: "Outfit_400Regular", marginTop: 8 }}>No revenue data available</Text>
            </View>
          )}
        </ScrollView>
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

          {/* ─── Browse & Edit ─── */}
          <DbBrowserSection colors={colors} onSwitchToUsers={() => setActiveTab("users")} />

          {/* ─── Set Visibility Management ─── */}
          <View style={[{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.borderLight }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#8E24AA22", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="eye-outline" size={20} color="#8E24AA" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontFamily: "Outfit_700Bold", color: colors.text }}>Set Visibility</Text>
                <Text style={{ fontSize: 12, fontFamily: "Outfit_400Regular", color: colors.textMuted }}>Hide or release sets for users</Text>
              </View>
            </View>

            <Pressable
              style={[{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.background, borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 12 }, adminSetsLoading && { opacity: 0.6 }]}
              onPress={loadAdminSets}
              disabled={adminSetsLoading}
            >
              {adminSetsLoading
                ? <Ionicons name="hourglass-outline" size={18} color={colors.text} />
                : <Ionicons name="refresh-outline" size={18} color={colors.text} />}
              <Text style={{ fontSize: 14, fontFamily: "Outfit_600SemiBold", color: colors.text }}>
                {adminSetsLoading ? "Loading…" : adminSets.length > 0 ? "Refresh Sets" : "Load All Sets"}
              </Text>
            </Pressable>

            {adminSets.length > 0 && (
              <>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
                  <AdminDropdown
                    value={setFilter}
                    onChange={(v) => setSetFilter(v as typeof setFilter)}
                    colors={colors}
                    icon="eye-outline"
                    style={{ flex: 1 }}
                    options={[
                      { value: "all" as typeof setFilter, label: `All (${adminSets.length})`, icon: "list-outline" },
                      { value: "visible" as typeof setFilter, label: `Visible (${adminSets.filter(s => !s.hidden).length})`, icon: "eye-outline" },
                      { value: "hidden" as typeof setFilter, label: `Hidden (${adminSets.filter(s => s.hidden).length})`, icon: "eye-off-outline" },
                    ]}
                  />
                  <AdminDropdown
                    value={setLangFilter}
                    onChange={(v) => setSetLangFilter(v)}
                    colors={colors}
                    icon="language-outline"
                    style={{ flex: 1 }}
                    options={[
                      { value: "all", label: "All Langs", icon: "globe-outline" },
                      { value: "english", label: "English", icon: "language-outline" },
                      { value: "japanese", label: "Japanese", icon: "language-outline" },
                      { value: "korean", label: "Korean", icon: "language-outline" },
                      { value: "chinese", label: "Chinese", icon: "language-outline" },
                    ]}
                  />
                </View>

                {filteredAdminSets.length > 0 && (
                  <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>
                    <Pressable
                      style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#27AE60", borderRadius: 10, paddingVertical: 10 }}
                      onPress={() => {
                        const hiddenIds = filteredAdminSets.filter(s => s.hidden).map(s => s.id);
                        if (hiddenIds.length === 0) { Alert.alert("Info", "No hidden sets in current filter"); return; }
                        Alert.alert("Release Sets", `Release ${hiddenIds.length} hidden set(s) to users?`, [
                          { text: "Cancel", style: "cancel" },
                          { text: "Release", onPress: () => toggleSetVisibility(hiddenIds, false) },
                        ]);
                      }}
                    >
                      <Ionicons name="eye-outline" size={16} color="#FFF" />
                      <Text style={{ fontSize: 12, fontFamily: "Outfit_700Bold", color: "#FFF" }}>Release Filtered</Text>
                    </Pressable>
                    <Pressable
                      style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#E65100", borderRadius: 10, paddingVertical: 10 }}
                      onPress={() => {
                        const visibleIds = filteredAdminSets.filter(s => !s.hidden).map(s => s.id);
                        if (visibleIds.length === 0) { Alert.alert("Info", "No visible sets in current filter"); return; }
                        Alert.alert("Hide Sets", `Hide ${visibleIds.length} visible set(s) from users?`, [
                          { text: "Cancel", style: "cancel" },
                          { text: "Hide", style: "destructive", onPress: () => toggleSetVisibility(visibleIds, true) },
                        ]);
                      }}
                    >
                      <Ionicons name="eye-off-outline" size={16} color="#FFF" />
                      <Text style={{ fontSize: 12, fontFamily: "Outfit_700Bold", color: "#FFF" }}>Hide Filtered</Text>
                    </Pressable>
                  </View>
                )}

                <View style={{ maxHeight: 400 }}>
                  <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
                    {filteredAdminSets.map(s => (
                      <View key={s.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.background, borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: s.hidden ? "#E6510044" : colors.borderLight }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.hidden ? "#E65100" : "#27AE60" }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontFamily: "Outfit_600SemiBold", color: colors.text }} numberOfLines={1}>{s.name}</Text>
                          <Text style={{ fontSize: 11, fontFamily: "Outfit_400Regular", color: colors.textMuted }} numberOfLines={1}>
                            {s.id} · {s.language} · {s.cardCount} cards{s.hidden ? " · HIDDEN" : ""}
                          </Text>
                        </View>
                        <Pressable
                          style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: s.hidden ? "#27AE60" : "#E65100" }}
                          onPress={() => toggleSetVisibility([s.id], !s.hidden)}
                        >
                          <Text style={{ fontSize: 11, fontFamily: "Outfit_700Bold", color: "#FFF" }}>
                            {s.hidden ? "Release" : "Hide"}
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                </View>

                <Text style={{ fontSize: 11, fontFamily: "Outfit_400Regular", color: colors.textMuted, textAlign: "center", marginTop: 8 }}>
                  Showing {filteredAdminSets.length} of {adminSets.length} sets
                </Text>
              </>
            )}
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
          {/* Verified Collector Applications */}
          {verifications.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>
                VERIFIED COLLECTOR APPLICATIONS ({verifications.length})
              </Text>
              {verifications.map((v) => (
                <View
                  key={v.id}
                  style={{ backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#3498DB40" }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    {v.avatarUrl ? (
                      <Image source={{ uri: v.avatarUrl }} style={{ width: 36, height: 36, borderRadius: 18 }} contentFit="cover" />
                    ) : (
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#CC0000", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: "#FFF", fontFamily: "Outfit_700Bold", fontSize: 14 }}>{v.displayName.charAt(0)}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontFamily: "Outfit_700Bold", color: colors.text }}>{v.displayName}</Text>
                      <Text style={{ fontSize: 12, fontFamily: "Outfit_400Regular", color: colors.textMuted }}>@{v.username}</Text>
                    </View>
                    <View style={{ backgroundColor: "#3498DB20", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                      <Text style={{ fontSize: 11, fontFamily: "Outfit_700Bold", color: "#3498DB" }}>PENDING</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    {v.cardImage ? (
                      <Image source={{ uri: v.cardImage }} style={{ width: 36, height: 50, borderRadius: 4 }} contentFit="contain" />
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontFamily: "Outfit_600SemiBold", color: colors.text }} numberOfLines={1}>{v.cardName}</Text>
                      <Text style={{ fontSize: 11, fontFamily: "Outfit_400Regular", color: colors.textMuted }}>{v.cardId}</Text>
                    </View>
                    <Pressable
                      style={{ backgroundColor: colors.surfaceElevated, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: "row", gap: 4, alignItems: "center" }}
                      onPress={() => setVerificationPhotoModal({ front: v.frontPhoto, back: v.backPhoto, name: v.cardName })}
                    >
                      <Ionicons name="images-outline" size={14} color={colors.text} />
                      <Text style={{ fontSize: 12, fontFamily: "Outfit_600SemiBold", color: colors.text }}>Photos</Text>
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Pressable
                      style={{ flex: 1, backgroundColor: "#27AE60", borderRadius: 10, paddingVertical: 10, alignItems: "center" }}
                      onPress={() => Alert.alert("Approve", `Approve verified collector badge for ${v.displayName}?`, [
                        { text: "Cancel", style: "cancel" },
                        { text: "Approve", onPress: () => handleVerificationDecision(v.id, "approve") },
                      ])}
                    >
                      <Text style={{ fontSize: 14, fontFamily: "Outfit_700Bold", color: "#FFF" }}>Approve</Text>
                    </Pressable>
                    <Pressable
                      style={{ flex: 1, backgroundColor: "#CC0000", borderRadius: 10, paddingVertical: 10, alignItems: "center" }}
                      onPress={() => Alert.alert("Reject", `Reject application from ${v.displayName}?`, [
                        { text: "Cancel", style: "cancel" },
                        { text: "Reject", style: "destructive", onPress: () => handleVerificationDecision(v.id, "reject") },
                      ])}
                    >
                      <Text style={{ fontSize: 14, fontFamily: "Outfit_700Bold", color: "#FFF" }}>Reject</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

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
                  onAddFriend={() => handleAddFriend(u.id)}
                  friendStatus={friendIds[u.id] || "none"}
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
                onAddFriend={() => handleAddFriend(u.id)}
                friendStatus={friendIds[u.id] || "none"}
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

      {/* Verification photo preview modal */}
      <Modal
        visible={!!verificationPhotoModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setVerificationPhotoModal(null)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Pressable onPress={() => setVerificationPhotoModal(null)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
            <Text style={{ fontSize: 16, fontFamily: "Outfit_700Bold", color: colors.text }} numberOfLines={1}>
              {verificationPhotoModal?.name}
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            <Text style={{ fontSize: 13, fontFamily: "Outfit_700Bold", color: colors.textMuted, marginBottom: 8 }}>FRONT</Text>
            {verificationPhotoModal?.front && (
              <Image source={{ uri: verificationPhotoModal.front }} style={{ width: "100%", height: 300, borderRadius: 12 }} contentFit="contain" />
            )}
            <Text style={{ fontSize: 13, fontFamily: "Outfit_700Bold", color: colors.textMuted, marginTop: 16, marginBottom: 8 }}>BACK</Text>
            {verificationPhotoModal?.back && (
              <Image source={{ uri: verificationPhotoModal.back }} style={{ width: "100%", height: 300, borderRadius: 12 }} contentFit="contain" />
            )}
          </ScrollView>
        </View>
      </Modal>
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
  adminActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  adminActionBtnText: {
    color: "#FFF",
    fontSize: 11,
    fontFamily: "Outfit_700Bold",
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
