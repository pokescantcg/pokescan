import React, { useState, useCallback, useEffect } from "react";
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
  FlatList,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/constants/colors";
import { useUser } from "@/lib/user-context";
import { getApiUrl } from "@/lib/query-client";
import { getSessionToken } from "@/lib/storage";
import { CollectionItem } from "@/lib/storage";

export default function CollectorVerificationScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { user, collection } = useUser();

  const [selectedCard, setSelectedCard] = useState<CollectionItem | null>(null);
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [backPhoto, setBackPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<{
    isVerifiedCollector: boolean;
    application: { id: string; status: string; createdAt: string } | null;
  } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const token = await getSessionToken();
      const url = new URL("/api/collector-verification/status", getApiUrl());
      const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setVerificationStatus(data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchStatus().finally(() => setLoadingStatus(false));
  }, [fetchStatus]);

  const pickPhoto = useCallback(async (side: "front" | "back") => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo library access to pick a photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      const dataUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      if (side === "front") setFrontPhoto(dataUri);
      else setBackPhoto(dataUri);
    }
  }, []);

  const takePhoto = useCallback(async (side: "front" | "back") => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow camera access to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      const dataUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      if (side === "front") setFrontPhoto(dataUri);
      else setBackPhoto(dataUri);
    }
  }, []);

  const handlePhotoAction = useCallback((side: "front" | "back") => {
    Alert.alert("Add Photo", `Choose how to add the ${side} of the card`, [
      { text: "Camera", onPress: () => takePhoto(side) },
      { text: "Photo Library", onPress: () => pickPhoto(side) },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [pickPhoto, takePhoto]);

  const handleSubmit = useCallback(async () => {
    if (!selectedCard) { Alert.alert("Select a Card", "Please pick a card from your collection."); return; }
    if (!frontPhoto) { Alert.alert("Front Photo Required", "Please add a photo of the front of the card."); return; }
    if (!backPhoto) { Alert.alert("Back Photo Required", "Please add a photo of the back of the card."); return; }

    setSubmitting(true);
    try {
      const token = await getSessionToken();
      const url = new URL("/api/collector-verification", getApiUrl());
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          cardId: selectedCard.cardId,
          cardName: selectedCard.cardName,
          cardImage: selectedCard.cardImage,
          frontPhoto,
          backPhoto,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Application Submitted!", "Our admins will review your application and get back to you soon.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not submit application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [selectedCard, frontPhoto, backPhoto]);

  if (loadingStatus) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator style={{ marginTop: 80 }} color={colors.pokemonRed} />
      </View>
    );
  }

  const alreadyVerified = verificationStatus?.isVerifiedCollector;
  const hasPending = verificationStatus?.application?.status === "pending";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={colorScheme === "dark" ? ["#0A1A2A", "#1A1A2E"] : ["#F0F4FF", "#F5F5F5"]}
        style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}
      >
        <View style={styles.titleRow}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Ionicons name="checkmark-circle" size={24} color={colors.pokemonBlue} />
          <Text style={[styles.title, { color: colors.text }]}>Verified Collector</Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 16 }}>
        {alreadyVerified ? (
          <View style={[styles.statusCard, { backgroundColor: colors.pokemonBlue + "15", borderColor: colors.pokemonBlue + "40" }]}>
            <Ionicons name="checkmark-circle" size={40} color={colors.pokemonBlue} />
            <Text style={[styles.statusTitle, { color: colors.pokemonBlue }]}>You're Verified!</Text>
            <Text style={[styles.statusDesc, { color: colors.textSecondary }]}>
              You already have the Verified Collector badge on your profile.
            </Text>
          </View>
        ) : hasPending ? (
          <View style={[styles.statusCard, { backgroundColor: "#E67E22" + "15", borderColor: "#E67E22" + "40" }]}>
            <Ionicons name="hourglass-outline" size={40} color="#E67E22" />
            <Text style={[styles.statusTitle, { color: "#E67E22" }]}>Application Pending</Text>
            <Text style={[styles.statusDesc, { color: colors.textSecondary }]}>
              Your application is under review. We'll notify you once a decision is made.
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
              <Ionicons name="information-circle-outline" size={22} color={colors.pokemonBlue} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoTitle, { color: colors.text }]}>How it works</Text>
                <Text style={[styles.infoDesc, { color: colors.textMuted }]}>
                  Select a graded card from your collection, then upload clear photos of the front and back. Admins will review your application and grant you the Verified Collector badge if approved.
                </Text>
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>SELECT A CARD</Text>
            <Pressable
              style={[styles.cardPicker, { backgroundColor: colors.card, borderColor: selectedCard ? colors.pokemonBlue + "60" : colors.borderLight }]}
              onPress={() => setShowCardPicker(true)}
            >
              {selectedCard ? (
                <View style={styles.selectedCardRow}>
                  <Image source={{ uri: selectedCard.cardImage }} style={styles.cardThumb} contentFit="contain" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>{selectedCard.cardName}</Text>
                    <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{selectedCard.setName}</Text>
                    {selectedCard.gradingCompany && selectedCard.grade && (
                      <View style={[styles.gradeBadge, { backgroundColor: colors.pokemonBlue + "20" }]}>
                        <Text style={[styles.gradeText, { color: colors.pokemonBlue }]}>{selectedCard.gradingCompany} {selectedCard.grade}</Text>
                      </View>
                    )}
                  </View>
                  <Ionicons name="checkmark-circle" size={20} color={colors.pokemonBlue} />
                </View>
              ) : (
                <View style={styles.pickerPlaceholder}>
                  <MaterialCommunityIcons name="cards-outline" size={28} color={colors.textMuted} />
                  <Text style={[styles.pickerPlaceholderText, { color: colors.textMuted }]}>Tap to select a card from your collection</Text>
                </View>
              )}
            </Pressable>

            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>FRONT OF CARD</Text>
            <Pressable
              style={[styles.photoPicker, { backgroundColor: colors.card, borderColor: frontPhoto ? colors.success + "60" : colors.borderLight }]}
              onPress={() => handlePhotoAction("front")}
            >
              {frontPhoto ? (
                <View style={styles.photoContainer}>
                  <Image source={{ uri: frontPhoto }} style={styles.photoPreview} contentFit="cover" />
                  <View style={[styles.changeOverlay]}>
                    <Ionicons name="camera-outline" size={20} color="#FFF" />
                    <Text style={styles.changeText}>Change</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
                  <Text style={[styles.photoPlaceholderText, { color: colors.textMuted }]}>Tap to add front photo</Text>
                </View>
              )}
            </Pressable>

            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>BACK OF CARD</Text>
            <Pressable
              style={[styles.photoPicker, { backgroundColor: colors.card, borderColor: backPhoto ? colors.success + "60" : colors.borderLight }]}
              onPress={() => handlePhotoAction("back")}
            >
              {backPhoto ? (
                <View style={styles.photoContainer}>
                  <Image source={{ uri: backPhoto }} style={styles.photoPreview} contentFit="cover" />
                  <View style={styles.changeOverlay}>
                    <Ionicons name="camera-outline" size={20} color="#FFF" />
                    <Text style={styles.changeText}>Change</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
                  <Text style={[styles.photoPlaceholderText, { color: colors.textMuted }]}>Tap to add back photo</Text>
                </View>
              )}
            </Pressable>

            <Pressable
              style={[styles.submitBtn, { opacity: submitting ? 0.6 : 1 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <LinearGradient colors={["#1A6FCC", "#0A4FA0"]} style={styles.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {submitting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                    <Text style={styles.submitBtnText}>Submit Application</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </>
        )}
      </ScrollView>

      <Modal visible={showCardPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCardPicker(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowCardPicker(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select a Card</Text>
            <View style={{ width: 24 }} />
          </View>
          <FlatList
            data={collection}
            keyExtractor={(item, i) => `${item.cardId}-${i}`}
            contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 10 }}
            ListEmptyComponent={
              <View style={styles.pickerPlaceholder}>
                <Text style={[styles.pickerPlaceholderText, { color: colors.textMuted }]}>No cards in your collection</Text>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.cardRow,
                  { backgroundColor: colors.card, borderColor: selectedCard?.cardId === item.cardId ? colors.pokemonBlue + "60" : colors.borderLight, opacity: pressed ? 0.85 : 1 }
                ]}
                onPress={() => { setSelectedCard(item); setShowCardPicker(false); }}
              >
                <Image source={{ uri: item.cardImage }} style={styles.cardThumb} contentFit="contain" />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>{item.cardName}</Text>
                  <Text style={[styles.cardMeta, { color: colors.textMuted }]}>{item.setName} · {item.condition}</Text>
                  {item.gradingCompany && item.grade && (
                    <View style={[styles.gradeBadge, { backgroundColor: colors.pokemonBlue + "20", alignSelf: "flex-start" }]}>
                      <Text style={[styles.gradeText, { color: colors.pokemonBlue }]}>{item.gradingCompany} {item.grade}</Text>
                    </View>
                  )}
                </View>
                {selectedCard?.cardId === item.cardId && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.pokemonBlue} />
                )}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: { marginRight: 4 },
  title: { fontSize: 22, fontFamily: "Outfit_700Bold", flex: 1 },
  sectionLabel: { fontSize: 11, fontFamily: "Outfit_700Bold", letterSpacing: 1 },
  statusCard: { borderRadius: 16, padding: 24, borderWidth: 1.5, alignItems: "center", gap: 12 },
  statusTitle: { fontSize: 20, fontFamily: "Outfit_700Bold" },
  statusDesc: { fontSize: 14, fontFamily: "Outfit_400Regular", textAlign: "center", lineHeight: 20 },
  infoCard: { borderRadius: 14, padding: 14, borderWidth: 1, flexDirection: "row", gap: 12 },
  infoTitle: { fontSize: 14, fontFamily: "Outfit_700Bold", marginBottom: 4 },
  infoDesc: { fontSize: 13, fontFamily: "Outfit_400Regular", lineHeight: 18 },
  cardPicker: { borderRadius: 14, borderWidth: 1.5, overflow: "hidden", minHeight: 80 },
  selectedCardRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  pickerPlaceholder: { padding: 24, alignItems: "center", gap: 10 },
  pickerPlaceholderText: { fontSize: 14, fontFamily: "Outfit_400Regular", textAlign: "center" },
  cardThumb: { width: 48, height: 68, borderRadius: 4 },
  cardName: { fontSize: 14, fontFamily: "Outfit_700Bold" },
  cardMeta: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  gradeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: "flex-start" },
  gradeText: { fontSize: 11, fontFamily: "Outfit_700Bold" },
  photoPicker: { borderRadius: 14, borderWidth: 1.5, overflow: "hidden", height: 160 },
  photoContainer: { flex: 1, position: "relative" },
  photoPreview: { flex: 1 },
  changeOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  changeText: { fontSize: 13, fontFamily: "Outfit_600SemiBold", color: "#FFF" },
  photoPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  photoPlaceholderText: { fontSize: 14, fontFamily: "Outfit_400Regular" },
  submitBtn: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  submitGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  submitBtnText: { fontSize: 16, fontFamily: "Outfit_700Bold", color: "#FFF" },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16, fontFamily: "Outfit_700Bold" },
  cardRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, padding: 10, borderWidth: 1, gap: 10 },
});
