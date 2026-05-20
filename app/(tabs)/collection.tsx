import React, { useState, useCallback, useMemo, useRef } from "react";
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
  Animated,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/constants/colors";
import { useUser } from "@/lib/user-context";
import { formatGBP } from "@/lib/pokemon-api";
import { CollectionItem, getSessionToken } from "@/lib/storage";
import { getApiUrl } from "@/lib/query-client";
import { calculateConditionPrice, getConditionMultiplierDisplay } from "@/lib/condition-pricing";
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
  onEditGrading,
  onVerify,
  localVerified,
}: {
  item: CollectionItem;
  colors: ReturnType<typeof useThemeColors>;
  onRemove: () => void;
  onUpdateQty: (qty: number) => void;
  onEditGrading: () => void;
  onVerify: () => void;
  localVerified: boolean;
}) {
  const verified = item.isVerified || localVerified;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.cardItem,
        {
          backgroundColor: colors.card,
          borderColor: verified ? "#2ECC71" + "60" : colors.borderLight,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
      onPress={() => router.push({ pathname: "/card/[id]", params: { id: item.cardId } })}
    >
      {/* Card thumbnail with optional verified overlay */}
      <View style={{ position: "relative" }}>
        <Image source={{ uri: item.cardImage }} style={styles.cardImage} contentFit="contain" />
        {verified && (
          <View style={styles.verifiedBadgeImg}>
            <Ionicons name="checkmark-circle" size={16} color="#2ECC71" />
          </View>
        )}
      </View>

      <View style={styles.cardInfo}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={[styles.cardName, { color: colors.text, flex: 1 }]} numberOfLines={1}>
            {item.cardName}
          </Text>
          {verified && (
            <View style={[styles.verifiedPill, { backgroundColor: "#2ECC7115" }]}>
              <Ionicons name="shield-checkmark" size={10} color="#2ECC71" />
              <Text style={[styles.verifiedPillText, { color: "#2ECC71" }]}>Verified</Text>
            </View>
          )}
        </View>
        <Text style={[styles.cardCondition, { color: colors.textMuted }]}>
          {item.variant && item.variant !== "Non-Holo" ? `${item.variant} · ` : ""}{item.condition}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
          <Pressable
            onPress={(e) => { e.stopPropagation(); onEditGrading(); }}
            hitSlop={6}
          >
            {item.gradingCompany && item.grade ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#3498DB22", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ fontSize: 10, fontFamily: "Outfit_700Bold", color: "#3498DB" }}>
                  {item.gradingCompany} {item.grade}
                </Text>
                <Ionicons name="pencil" size={9} color="#3498DB" />
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.surfaceElevated, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 }}>
                <Ionicons name="ribbon-outline" size={9} color={colors.textMuted} />
                <Text style={{ fontSize: 9, fontFamily: "Outfit_400Regular", color: colors.textMuted }}>Add grade</Text>
              </View>
            )}
          </Pressable>
          {!verified && (
            <Pressable
              onPress={(e) => { e.stopPropagation(); onVerify(); }}
              hitSlop={6}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#2ECC7115", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 }}>
                <Ionicons name="shield-outline" size={9} color="#2ECC71" />
                <Text style={{ fontSize: 9, fontFamily: "Outfit_600SemiBold", color: "#2ECC71" }}>Verify</Text>
              </View>
            </Pressable>
          )}
        </View>
        <View style={{ gap: 2 }}>
          <Text style={[styles.cardPrice, { color: item.priceGBP ? colors.success : colors.textMuted }]}>
            {formatGBP(calculateConditionPrice(item.priceGBP, item.condition))} each
          </Text>
          {item.priceGBP && item.condition !== "Near Mint" && (
            <Text style={[styles.conditionAdjustment, { color: colors.textMuted }]}>
              {getConditionMultiplierDisplay(item.condition)} of NM ({formatGBP(item.priceGBP)})
            </Text>
          )}
        </View>
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

// ─── Verify Card Modal ────────────────────────────────────────────────────────

interface VerifyCaptured { uri: string; base64: string }

async function pickVerifyImage(source: "camera" | "gallery"): Promise<VerifyCaptured | null> {
  if (source === "camera") {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission Required", "Camera access is needed."); return null; }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [3, 4], base64: true });
    if (res.canceled || !res.assets[0]) return null;
    const a = res.assets[0];
    const b64 = a.base64 ? (a.base64.startsWith("data:") ? a.base64 : `data:image/jpeg;base64,${a.base64}`)
      : `data:image/jpeg;base64,${await FileSystem.readAsStringAsync(a.uri, { encoding: "base64" as any })}`;
    return { uri: a.uri, base64: b64 };
  } else {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true, aspect: [3, 4], base64: true });
    if (res.canceled || !res.assets[0]) return null;
    const a = res.assets[0];
    let b64: string;
    if (a.base64) {
      b64 = a.base64.startsWith("data:") ? a.base64 : `data:image/jpeg;base64,${a.base64}`;
    } else if (Platform.OS === "web") {
      const resp = await fetch(a.uri); const blob = await resp.blob();
      b64 = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onloadend = () => resolve(r.result as string); r.onerror = reject; r.readAsDataURL(blob); });
    } else {
      b64 = `data:image/jpeg;base64,${await FileSystem.readAsStringAsync(a.uri, { encoding: "base64" as any })}`;
    }
    return { uri: a.uri, base64: b64 };
  }
}

function VerifyCardModal({
  item,
  colors,
  insets,
  onClose,
  onVerified,
}: {
  item: CollectionItem;
  colors: ReturnType<typeof useThemeColors>;
  insets: ReturnType<typeof import("react-native-safe-area-context").useSafeAreaInsets>;
  onClose: () => void;
  onVerified: (itemId: string) => void;
}) {
  const [front, setFront] = useState<VerifyCaptured | null>(null);
  const [back, setBack]   = useState<VerifyCaptured | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ verified: boolean; reason: string; badgeEarned?: boolean; verifiedPercent?: number } | null>(null);

  const capture = async (side: "front" | "back", source: "camera" | "gallery") => {
    try {
      const img = await pickVerifyImage(source);
      if (!img) return;
      if (side === "front") setFront(img);
      else setBack(img);
      setResult(null);
    } catch {}
  };

  const handleVerify = async () => {
    if (!front || !back || !item.id) return;
    setLoading(true);
    setResult(null);
    try {
      const token = await getSessionToken();
      const url = new URL(`/api/collection/${item.id}/verify`, getApiUrl());
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ frontImageBase64: front.base64, backImageBase64: back.base64 }),
      });
      const data = await res.json();
      setResult({
        verified: !!data.verified,
        reason: data.reason || "",
        badgeEarned: !!data.badgeEarned,
        verifiedPercent: data.verifiedPercent ?? undefined,
      });
      if (data.verified) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onVerified(item.id!);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      Alert.alert("Error", "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const canVerify = !!(front && back && !loading);

  return (
    <Pressable style={verifyStyles.overlay} onPress={onClose}>
      <Pressable
        onPress={() => {}}
        style={[verifyStyles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 24 }]}
      >
        <View style={[verifyStyles.handle, { backgroundColor: colors.borderLight }]} />

        {/* Header */}
        <View style={verifyStyles.header}>
          <View style={[verifyStyles.headerIcon, { backgroundColor: "#2ECC7120" }]}>
            <Ionicons name="shield-checkmark" size={20} color="#2ECC71" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[verifyStyles.title, { color: colors.text }]}>Verify Card</Text>
            <Text style={[verifyStyles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
              {item.cardName} · {item.setName}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Database card reference */}
        <View style={[verifyStyles.referenceRow, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <Image source={{ uri: item.cardImage }} style={verifyStyles.referenceImage} contentFit="contain" />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[verifyStyles.refLabel, { color: colors.textMuted }]}>Database Card</Text>
            <Text style={[verifyStyles.refName, { color: colors.text }]}>{item.cardName}</Text>
            <Text style={[verifyStyles.refSet, { color: colors.textMuted }]}>{item.setName}</Text>
            <Text style={[verifyStyles.refHint, { color: colors.textMuted }]}>
              Your photos must match this card exactly
            </Text>
          </View>
        </View>

        {/* Photo panels */}
        <Text style={[verifyStyles.sectionLabel, { color: colors.textSecondary }]}>
          Your Physical Card Photos
        </Text>
        <View style={verifyStyles.panelsRow}>
          {(["front", "back"] as const).map((side) => {
            const img = side === "front" ? front : back;
            return (
              <View key={side} style={verifyStyles.panel}>
                <Text style={[verifyStyles.panelLabel, { color: colors.textMuted }]}>
                  {side === "front" ? "Front" : "Back"}
                </Text>
                {img ? (
                  <View style={[verifyStyles.panelImg, { borderColor: "#2ECC7180" }]}>
                    <Image source={{ uri: img.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                    <Pressable style={verifyStyles.panelClear} onPress={() => side === "front" ? setFront(null) : setBack(null)}>
                      <Ionicons name="close-circle" size={20} color="#FFF" />
                    </Pressable>
                  </View>
                ) : (
                  <View style={[verifyStyles.panelPlaceholder, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                    <Ionicons name="card-outline" size={28} color={colors.textMuted} />
                  </View>
                )}
                <View style={verifyStyles.panelBtns}>
                  <Pressable style={[verifyStyles.panelBtn, { backgroundColor: colors.pokemonRed }]} onPress={() => capture(side, "camera")} disabled={loading}>
                    <Ionicons name="camera" size={14} color="#FFF" />
                  </Pressable>
                  <Pressable style={[verifyStyles.panelBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight }]} onPress={() => capture(side, "gallery")} disabled={loading}>
                    <Ionicons name="images" size={14} color={colors.text} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        {/* Result */}
        {result && (
          <>
            <View style={[verifyStyles.resultBox, {
              backgroundColor: result.verified ? "#2ECC7115" : "#E74C3C15",
              borderColor: result.verified ? "#2ECC7160" : "#E74C3C60",
            }]}>
              <Ionicons name={result.verified ? "shield-checkmark" : "close-circle"} size={20} color={result.verified ? "#2ECC71" : "#E74C3C"} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontFamily: "Outfit_700Bold", color: result.verified ? "#2ECC71" : "#E74C3C" }}>
                  {result.verified ? "Card Verified" : "Could Not Verify"}
                </Text>
                <Text style={{ fontSize: 12, fontFamily: "Outfit_400Regular", color: colors.textSecondary, marginTop: 2, lineHeight: 17 }}>
                  {result.reason}
                </Text>
              </View>
            </View>
            {result.verified && result.verifiedPercent !== undefined && (
              <View style={[verifyStyles.resultBox, { backgroundColor: "#3498DB15", borderColor: "#3498DB40" }]}>
                <Ionicons name="analytics" size={18} color="#3498DB" />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 12, fontFamily: "Outfit_700Bold", color: "#3498DB" }}>
                    Collection Progress: {result.verifiedPercent}% verified
                  </Text>
                  <View style={[verifyStyles.progressBar, { backgroundColor: "#3498DB20" }]}>
                    <View style={[verifyStyles.progressFill, { width: `${Math.min(result.verifiedPercent, 100)}%` as any, backgroundColor: result.verifiedPercent >= 90 ? "#2ECC71" : "#3498DB" }]} />
                  </View>
                  <Text style={{ fontSize: 11, fontFamily: "Outfit_400Regular", color: colors.textMuted }}>
                    {result.verifiedPercent >= 90 ? "90% reached — Verified Collector badge earned!" : `Verify ${90 - result.verifiedPercent}% more to earn the Verified Collector badge`}
                  </Text>
                </View>
              </View>
            )}
            {result.badgeEarned && (
              <View style={[verifyStyles.resultBox, { backgroundColor: "#FFD70015", borderColor: "#FFD70060" }]}>
                <Text style={{ fontSize: 20 }}>🏆</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontFamily: "Outfit_700Bold", color: "#FFD700" }}>Verified Collector Badge Earned!</Text>
                  <Text style={{ fontSize: 12, fontFamily: "Outfit_400Regular", color: colors.textSecondary, marginTop: 2 }}>
                    You've verified 90%+ of your collection. The badge is now shown on your profile.
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* Verify button */}
        {!result?.verified && (
          <Pressable
            style={({ pressed }) => [verifyStyles.verifyBtn, { opacity: (!canVerify || pressed) ? 0.6 : 1 }]}
            onPress={handleVerify}
            disabled={!canVerify}
          >
            <LinearGradient colors={["#27AE60", "#1E8449"]} style={verifyStyles.verifyBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              {loading ? (
                <><ActivityIndicator color="#FFF" size="small" /><Text style={verifyStyles.verifyBtnText}>AI Checking…</Text></>
              ) : (
                <><Ionicons name="shield-checkmark" size={18} color="#FFF" /><Text style={verifyStyles.verifyBtnText}>Verify Card</Text></>
              )}
            </LinearGradient>
          </Pressable>
        )}
        {result?.verified && (
          <Pressable style={[verifyStyles.verifyBtn]} onPress={onClose}>
            <LinearGradient colors={["#27AE60", "#1E8449"]} style={verifyStyles.verifyBtnInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="checkmark" size={18} color="#FFF" />
              <Text style={verifyStyles.verifyBtnText}>Done</Text>
            </LinearGradient>
          </Pressable>
        )}

        <Text style={[verifyStyles.disclaimer, { color: colors.textMuted }]}>
          AI checks that your photo matches the database card. Both sides must be clearly visible.
        </Text>
      </Pressable>
    </Pressable>
  );
}

function SetHeader({
  section,
  isCollapsed,
  onToggle,
  onNavigate,
  colors,
}: {
  section: SetSection;
  isCollapsed: boolean;
  onToggle: () => void;
  onNavigate: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const rotateAnim = useRef(new Animated.Value(isCollapsed ? 0 : 1)).current;

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const handleToggle = () => {
    Animated.timing(rotateAnim, {
      toValue: isCollapsed ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    onToggle();
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.setHeader,
        {
          backgroundColor: colors.card,
          borderColor: isCollapsed ? colors.borderLight : colors.pokemonRed + "40",
          opacity: pressed ? 0.9 : 1,
        },
      ]}
      onPress={handleToggle}
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
      <View style={styles.setHeaderRight}>
        <Pressable
          style={[styles.setNavBtn, { backgroundColor: colors.surfaceElevated }]}
          onPress={(e) => {
            e.stopPropagation();
            onNavigate();
          }}
          hitSlop={8}
        >
          <Ionicons name="grid-outline" size={14} color={colors.textSecondary} />
        </Pressable>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        </Animated.View>
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

const GRADING_COMPANIES = ["None", "PSA", "Beckett", "CGC", "ACE"] as const;

export default function CollectionScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { user, collection, collectionValue, removeCard, updateQuantity, updateGrading } = useUser();
  const [sortBy, setSortBy] = useState<"name" | "value" | "recent">("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [collapsedSets, setCollapsedSets] = useState<Set<string>>(new Set());

  // Grading edit modal
  const [gradingItem, setGradingItem] = useState<CollectionItem | null>(null);
  const [editCompany, setEditCompany] = useState("");
  const [editGrade, setEditGrade] = useState("");
  const [gradingSaving, setGradingSaving] = useState(false);

  // Verify modal
  const [verifyItem, setVerifyItem] = useState<CollectionItem | null>(null);
  const [localVerifiedIds, setLocalVerifiedIds] = useState<Set<string>>(new Set());

  const openGradingModal = useCallback((item: CollectionItem) => {
    setGradingItem(item);
    setEditCompany(item.gradingCompany || "");
    setEditGrade(item.grade || "");
  }, []);

  const closeGradingModal = useCallback(() => {
    setGradingItem(null);
    setEditCompany("");
    setEditGrade("");
  }, []);

  const saveGrading = useCallback(async () => {
    if (!gradingItem?.id) return;
    setGradingSaving(true);
    try {
      const gc = editCompany && editCompany !== "None" ? editCompany : null;
      const gr = gc && editGrade.trim() ? editGrade.trim() : null;
      await updateGrading(gradingItem.id, gc, gr);
      closeGradingModal();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to update grading. Please try again.");
    } finally {
      setGradingSaving(false);
    }
  }, [gradingItem, editCompany, editGrade, updateGrading, closeGradingModal]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  }, []);

  const toggleSet = useCallback((setId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCollapsedSets((prev) => {
      const next = new Set(prev);
      if (next.has(setId)) {
        next.delete(setId);
      } else {
        next.add(setId);
      }
      return next;
    });
  }, []);

  const rawSections: SetSection[] = useMemo(() => {
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
      g.setValue += calculateConditionPrice(item.priceGBP, item.condition) * item.quantity;
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
      result.forEach(s => s.data.sort((a, b) => (calculateConditionPrice(b.priceGBP, b.condition) - calculateConditionPrice(a.priceGBP, a.condition))));
    } else {
      result.sort((a, b) => new Date(b.latestAdded).getTime() - new Date(a.latestAdded).getTime());
      result.forEach(s => s.data.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()));
    }

    return result;
  }, [collection, sortBy]);

  const filteredSections: SetSection[] = useMemo(() => {
    if (!searchQuery.trim()) return rawSections;
    const q = searchQuery.trim().toLowerCase();
    return rawSections
      .map((section) => {
        const setMatches = section.setName.toLowerCase().includes(q);
        const matchingCards = section.data.filter(
          (item) => setMatches || item.cardName.toLowerCase().includes(q)
        );
        if (matchingCards.length === 0) return null;
        return { ...section, data: matchingCards };
      })
      .filter((s): s is SetSection => s !== null);
  }, [rawSections, searchQuery]);

  const sections = useMemo(() =>
    filteredSections.map(s => ({
      ...s,
      data: (searchQuery.trim() || !collapsedSets.has(s.setId)) ? s.data : ([] as CollectionItem[]),
    })),
    [filteredSections, collapsedSets, searchQuery]
  );

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
            <Text style={[styles.priceSource, { color: colors.textMuted }]}>TCGPlayer</Text>
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
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search cards or sets…"
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </LinearGradient>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id ?? `${item.cardId}-${item.condition}-${item.variant || "Non-Holo"}-${item.gradingCompany || ""}-${item.grade || ""}`}
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
          <SetHeader
            section={section as SetSection}
            isCollapsed={collapsedSets.has((section as SetSection).setId)}
            onToggle={() => toggleSet((section as SetSection).setId)}
            onNavigate={() => router.push({ pathname: "/set/[id]", params: { id: section.setId, name: section.setName } })}
            colors={colors}
          />
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
                  onPress: () => removeCard(item.cardId, item.condition, item.variant, item.id),
                },
              ]);
            }}
            onUpdateQty={(qty) => updateQuantity(item.cardId, item.condition, qty, item.variant, item.id)}
            onEditGrading={() => openGradingModal(item)}
            onVerify={() => setVerifyItem(item)}
            localVerified={item.id ? localVerifiedIds.has(item.id) : false}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {searchQuery.trim() ? (
              <>
                <Ionicons name="search-outline" size={52} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No Results</Text>
                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                  No cards or sets match "{searchQuery.trim()}"
                </Text>
              </>
            ) : (
              <>
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
              </>
            )}
          </View>
        }
      />

      {/* Verify card modal */}
      {verifyItem && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setVerifyItem(null)}>
          <VerifyCardModal
            item={verifyItem}
            colors={colors}
            insets={insets}
            onClose={() => setVerifyItem(null)}
            onVerified={(itemId) => {
              setLocalVerifiedIds((prev) => new Set([...prev, itemId]));
              setVerifyItem(null);
            }}
          />
        </Modal>
      )}

      {/* Grading Edit Modal */}
      <Modal visible={!!gradingItem} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={closeGradingModal}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }} onPress={closeGradingModal}>
            <Pressable onPress={() => {}} style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24 }}>
              <View style={{ width: 40, height: 4, backgroundColor: colors.borderLight, borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
              <Text style={{ fontSize: 18, fontFamily: "Outfit_700Bold", color: colors.text, marginBottom: 4 }}>
                {gradingItem?.gradingCompany ? "Edit Grading" : "Add Grading"}
              </Text>
              <Text style={{ fontSize: 13, fontFamily: "Outfit_400Regular", color: colors.textMuted, marginBottom: 18 }}>
                {gradingItem?.cardName}
              </Text>

              <Text style={{ fontSize: 13, fontFamily: "Outfit_600SemiBold", color: colors.textSecondary, marginBottom: 8 }}>Grading Company</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 18 }}>
                {GRADING_COMPANIES.map((co) => {
                  const isSelected = co === "None" ? editCompany === "" : editCompany === co;
                  return (
                    <Pressable
                      key={co}
                      style={{
                        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                        backgroundColor: isSelected ? "#3498DB" : colors.card,
                        borderWidth: 1, borderColor: isSelected ? "#3498DB" : colors.borderLight,
                      }}
                      onPress={() => {
                        setEditCompany(co === "None" ? "" : co);
                        if (co === "None") setEditGrade("");
                      }}
                    >
                      <Text style={{ fontSize: 14, fontFamily: "Outfit_600SemiBold", color: isSelected ? "#FFF" : colors.textSecondary }}>{co}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {editCompany !== "" && (
                <>
                  <Text style={{ fontSize: 13, fontFamily: "Outfit_600SemiBold", color: colors.textSecondary, marginBottom: 8 }}>Grade</Text>
                  <TextInput
                    style={{
                      backgroundColor: colors.card, borderWidth: 1,
                      borderColor: editGrade ? "#3498DB80" : colors.borderLight,
                      borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
                      color: colors.text, fontFamily: "Outfit_400Regular", fontSize: 16, marginBottom: 6,
                    }}
                    placeholder={editCompany === "Beckett" ? "e.g. 9.5" : "e.g. 9"}
                    placeholderTextColor={colors.textMuted}
                    value={editGrade}
                    onChangeText={(t) => setEditGrade(t.replace(/[^0-9.]/g, ""))}
                    keyboardType="decimal-pad"
                    maxLength={4}
                    autoFocus
                  />
                  {editGrade !== "" && (() => {
                    const n = parseFloat(editGrade);
                    const valid = !isNaN(n) && n >= 1 && n <= 10 &&
                      (editCompany === "Beckett" ? (n * 2) % 1 === 0 : Number.isInteger(n));
                    return (
                      <Text style={{ fontSize: 11, fontFamily: "Outfit_400Regular", color: valid ? "#27AE60" : colors.pokemonRed, marginBottom: 12 }}>
                        {valid ? `Valid ${editCompany} grade` : editCompany === "Beckett" ? "Beckett: 1–10 in 0.5 steps" : "Whole number 1–10"}
                      </Text>
                    );
                  })()}
                </>
              )}

              <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                <Pressable
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.surfaceElevated, alignItems: "center" }}
                  onPress={closeGradingModal}
                >
                  <Text style={{ fontSize: 15, fontFamily: "Outfit_600SemiBold", color: colors.textSecondary }}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => ({ flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: gradingSaving ? "#3498DB80" : "#3498DB", alignItems: "center", opacity: pressed ? 0.85 : 1 })}
                  onPress={saveGrading}
                  disabled={gradingSaving}
                >
                  <Text style={{ fontSize: 15, fontFamily: "Outfit_700Bold", color: "#FFF" }}>
                    {gradingSaving ? "Saving…" : editCompany ? "Save Grading" : "Remove Grading"}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
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
  priceSource: { fontSize: 9, fontFamily: "Outfit_500Medium", marginTop: 2 },
  conditionAdjustment: { fontSize: 9, fontFamily: "Outfit_400Regular", fontStyle: "italic" },
  sortRow: { flexDirection: "row", gap: 8 },
  sortBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  sortBtnText: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    marginTop: 8,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Outfit_400Regular", padding: 0 },
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
  setHeaderRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  setNavBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
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
  verifiedBadgeImg: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#1A1A2E",
    borderRadius: 8,
    padding: 1,
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedPillText: { fontSize: 9, fontFamily: "Outfit_700Bold" },
});

const verifyStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontFamily: "Outfit_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Outfit_400Regular", marginTop: 1 },
  referenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  referenceImage: { width: 52, height: 74, borderRadius: 6 },
  refLabel: { fontSize: 10, fontFamily: "Outfit_400Regular", textTransform: "uppercase", letterSpacing: 0.5 },
  refName: { fontSize: 14, fontFamily: "Outfit_700Bold" },
  refSet: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  refHint: { fontSize: 11, fontFamily: "Outfit_400Regular", fontStyle: "italic", marginTop: 2 },
  sectionLabel: { fontSize: 12, fontFamily: "Outfit_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  panelsRow: { flexDirection: "row", gap: 12 },
  panel: { flex: 1, alignItems: "center", gap: 8 },
  panelLabel: { fontSize: 12, fontFamily: "Outfit_600SemiBold" },
  panelImg: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    position: "relative",
  },
  panelPlaceholder: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  panelClear: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 10,
  },
  panelBtns: { flexDirection: "row", gap: 8 },
  panelBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  resultBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  verifyBtn: { borderRadius: 14, overflow: "hidden" },
  verifyBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  verifyBtnText: { fontSize: 16, fontFamily: "Outfit_700Bold", color: "#FFF" },
  disclaimer: {
    fontSize: 11,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
    lineHeight: 16,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    width: "100%",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
});
