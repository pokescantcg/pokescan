import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  FlatList,
  useColorScheme,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/constants/colors";
import {
  searchCards,
  PokemonCard,
  getUKPrice,
  formatGBP,
  identifyCard,
  CardIdentification,
  PCVCard,
  generateEbaySearchUrl,
} from "@/lib/pokemon-api";

function IdentificationCard({
  identification,
  colors,
}: {
  identification: CardIdentification;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const isJapanese = identification.language === "Japanese";
  const isKorean = identification.language === "Korean";
  const isChinese = identification.language === "Chinese";
  const isForeign = isJapanese || isKorean || isChinese;

  const confidenceColor =
    identification.confidence === "high"
      ? colors.success
      : identification.confidence === "medium"
        ? colors.gold
        : colors.error;

  return (
    <View style={[styles.idCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
      <View style={styles.idHeader}>
        <MaterialCommunityIcons name="robot" size={20} color={colors.gold} />
        <Text style={[styles.idTitle, { color: colors.text }]}>AI Identification</Text>
        <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor }]}>
          <Text style={styles.confidenceText}>{identification.confidence}</Text>
        </View>
      </View>

      <View style={styles.idRow}>
        <Text style={[styles.idLabel, { color: colors.textMuted }]}>Name</Text>
        <Text style={[styles.idValue, { color: colors.text }]}>{identification.englishName}</Text>
      </View>

      {isForeign && identification.originalName !== identification.englishName && (
        <View style={styles.idRow}>
          <Text style={[styles.idLabel, { color: colors.textMuted }]}>Original</Text>
          <Text style={[styles.idValue, { color: colors.textSecondary }]}>{identification.originalName}</Text>
        </View>
      )}

      <View style={styles.idRow}>
        <Text style={[styles.idLabel, { color: colors.textMuted }]}>Set</Text>
        <Text style={[styles.idValue, { color: colors.text }]}>{identification.setName}</Text>
      </View>

      <View style={styles.idRow}>
        <Text style={[styles.idLabel, { color: colors.textMuted }]}>Number</Text>
        <Text style={[styles.idValue, { color: colors.text }]}>{identification.cardNumber}</Text>
      </View>

      <View style={styles.idDetailsRow}>
        {identification.language && (
          <View style={[styles.idTag, { backgroundColor: isForeign ? "#4A90D9" : colors.surfaceElevated }]}>
            <Text style={[styles.idTagText, { color: isForeign ? "#FFF" : colors.textSecondary }]}>
              {identification.language}
            </Text>
          </View>
        )}
        {identification.rarity && (
          <View style={[styles.idTag, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.idTagText, { color: colors.gold }]}>{identification.rarity}</Text>
          </View>
        )}
        {identification.holoType && identification.holoType !== "Non-Holo" && (
          <View style={[styles.idTag, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.idTagText, { color: colors.accent }]}>{identification.holoType}</Text>
          </View>
        )}
      </View>

      {identification.notes ? (
        <Text style={[styles.idNotes, { color: colors.textMuted }]}>{identification.notes}</Text>
      ) : null}
    </View>
  );
}

function PCVResultCard({ card, colors }: { card: PCVCard; colors: ReturnType<typeof useThemeColors> }) {
  const handlePress = () => {
    if (card.url) {
      Linking.openURL(card.url);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.resultCard,
        { backgroundColor: colors.card, borderColor: colors.borderLight, opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={handlePress}
    >
      <View style={styles.resultInfo}>
        <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>
          {card.name}
        </Text>
        <Text style={[styles.resultSet, { color: colors.textSecondary }]} numberOfLines={1}>
          {card.setName || card.setId} #{card.number}
        </Text>
        <View style={styles.resultMeta}>
          {card.holoType ? (
            <Text style={[styles.resultRarity, { color: colors.accent }]} numberOfLines={1}>
              {card.holoType}
            </Text>
          ) : null}
          {card.rarity ? (
            <Text style={[styles.resultRarity, { color: colors.gold }]} numberOfLines={1}>
              {card.rarity}
            </Text>
          ) : null}
          {card.edition && card.edition !== "Unlimited" ? (
            <Text style={[styles.resultRarity, { color: colors.textMuted }]} numberOfLines={1}>
              {card.edition}
            </Text>
          ) : null}
        </View>
      </View>
      <Text
        style={[
          styles.resultPrice,
          { color: card.priceGBP ? colors.success : colors.textMuted },
        ]}
      >
        {formatGBP(card.priceGBP)}
      </Text>
      <Ionicons name="open-outline" size={14} color={colors.textMuted} />
    </Pressable>
  );
}

function SearchResultCard({ card, colors }: { card: PokemonCard; colors: ReturnType<typeof useThemeColors> }) {
  const priceData = getUKPrice(card);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.resultCard,
        { backgroundColor: colors.card, borderColor: colors.borderLight, opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={() => router.push({ pathname: "/card/[id]", params: { id: card.id } })}
    >
      <Image source={{ uri: card.images.small }} style={styles.resultImage} contentFit="contain" />
      <View style={styles.resultInfo}>
        <Text style={[styles.resultName, { color: colors.text }]} numberOfLines={1}>
          {card.name}
        </Text>
        <Text style={[styles.resultSet, { color: colors.textSecondary }]} numberOfLines={1}>
          {card.set.name} #{card.number}
        </Text>
        {card.rarity && (
          <Text style={[styles.resultRarity, { color: colors.gold }]} numberOfLines={1}>
            {card.rarity}
          </Text>
        )}
        <Text
          style={[
            styles.resultPrice,
            { color: priceData.price ? colors.success : colors.textMuted },
          ]}
        >
          {formatGBP(priceData.price)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export default function ScannerScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<PokemonCard[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identification, setIdentification] = useState<CardIdentification | null>(null);
  const [pcvResults, setPcvResults] = useState<PCVCard[]>([]);
  const [identifyError, setIdentifyError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchText.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    setIdentification(null);
    setPcvResults([]);
    try {
      const { cards } = await searchCards(searchText.trim());
      setResults(cards);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.error("Search failed:", e);
      Alert.alert("Search Error", "Failed to search for cards. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }, [searchText]);

  const processImage = useCallback(async (uri: string) => {
    setCapturedImage(uri);
    setIsIdentifying(true);
    setIdentifyError(null);
    setIdentification(null);
    setPcvResults([]);
    setResults([]);
    setHasSearched(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let base64: string;
      if (Platform.OS === "web") {
        const response = await fetch(uri);
        const blob = await response.blob();
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        const fileBase64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        base64 = `data:image/jpeg;base64,${fileBase64}`;
      }

      const result = await identifyCard(base64);
      setIdentification(result.identification);
      setPcvResults(result.pcvResults || []);
      setSearchText(result.identification.englishName);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      console.error("Identification failed:", e);
      setIdentifyError(e.message || "Failed to identify card");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsIdentifying(false);
    }
  }, []);

  const handleCameraCapture = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera access is needed to scan cards.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true,
        aspect: [3, 4],
      });
      if (!result.canceled && result.assets[0]) {
        processImage(result.assets[0].uri);
      }
    } catch (e) {
      console.error("Camera error:", e);
    }
  }, [processImage]);

  const handleGallery = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.8,
        allowsEditing: true,
        aspect: [3, 4],
      });
      if (!result.canceled && result.assets[0]) {
        processImage(result.assets[0].uri);
      }
    } catch (e) {
      console.error("Gallery error:", e);
    }
  }, [processImage]);

  const handleEbaySearch = useCallback(() => {
    if (!identification) return;
    const url = generateEbaySearchUrl(
      identification.englishName,
      identification.setName,
      identification.cardNumber
    );
    Linking.openURL(url);
  }, [identification]);

  const clearAll = useCallback(() => {
    setCapturedImage(null);
    setIdentification(null);
    setPcvResults([]);
    setIdentifyError(null);
    setResults([]);
    setHasSearched(false);
    setSearchText("");
  }, []);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const renderHeader = () => (
    <>
      {capturedImage && (
        <View style={[styles.capturedPreview, { borderColor: colors.border }]}>
          <Image source={{ uri: capturedImage }} style={styles.capturedImage} contentFit="contain" />
          <Pressable
            style={[styles.clearCapture, { backgroundColor: colors.error }]}
            onPress={clearAll}
          >
            <Ionicons name="close" size={16} color="#FFF" />
          </Pressable>
        </View>
      )}

      {isIdentifying && (
        <View style={[styles.identifyingCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <ActivityIndicator size="small" color={colors.gold} />
          <Text style={[styles.identifyingText, { color: colors.textSecondary }]}>
            AI is analysing your card...
          </Text>
          <Text style={[styles.identifyingSubtext, { color: colors.textMuted }]}>
            Works with English, Japanese, Korean & Chinese cards
          </Text>
        </View>
      )}

      {identifyError && !isIdentifying && (
        <View style={[styles.errorCard, { backgroundColor: colors.card, borderColor: colors.error }]}>
          <Ionicons name="alert-circle" size={20} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{identifyError}</Text>
          <Pressable onPress={clearAll}>
            <Text style={[styles.retryText, { color: colors.accent }]}>Try again</Text>
          </Pressable>
        </View>
      )}

      {identification && !isIdentifying && (
        <>
          <IdentificationCard identification={identification} colors={colors} />
          {identification.englishName && (
            <Pressable
              style={({ pressed }) => [
                styles.ebayButton,
                { backgroundColor: "#E53238", opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={handleEbaySearch}
            >
              <MaterialCommunityIcons name="shopping" size={18} color="#FFF" />
              <Text style={styles.ebayButtonText}>Search eBay UK</Text>
            </Pressable>
          )}
        </>
      )}

      {pcvResults.length > 0 && (
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          UK Price Matches ({pcvResults.length})
        </Text>
      )}
    </>
  );

  const allPcvShown = pcvResults.length > 0;
  const allSearchShown = results.length > 0 && !allPcvShown;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}>
        <Text style={[styles.title, { color: colors.text }]}>Card Scanner</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          AI-powered card identification
        </Text>
      </View>

      <View style={styles.scanSection}>
        <View style={styles.scanButtons}>
          <Pressable
            style={({ pressed }) => [
              styles.scanButton,
              { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleCameraCapture}
          >
            <Ionicons name="camera" size={24} color="#FFF" />
            <Text style={styles.scanButtonText}>Scan Card</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.scanButton,
              { backgroundColor: colors.surfaceElevated, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleGallery}
          >
            <Ionicons name="images" size={24} color={colors.text} />
            <Text style={[styles.scanButtonText, { color: colors.text }]}>Gallery</Text>
          </Pressable>
        </View>

        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Or type card name..."
            placeholderTextColor={colors.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <Pressable onPress={clearAll}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
          <Pressable
            style={[styles.searchSubmit, { backgroundColor: colors.gold }]}
            onPress={handleSearch}
          >
            <Ionicons name="arrow-forward" size={16} color="#000" />
          </Pressable>
        </View>
      </View>

      {isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.gold} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Searching...</Text>
        </View>
      ) : allPcvShown ? (
        <FlatList
          data={pcvResults}
          renderItem={({ item }) => <PCVResultCard card={item} colors={colors} />}
          keyExtractor={(item, i) => `${item.url}-${i}`}
          contentContainerStyle={[styles.resultsList, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
        />
      ) : allSearchShown ? (
        <FlatList
          data={results}
          renderItem={({ item }) => <SearchResultCard card={item} colors={colors} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.resultsList, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={[]}
          renderItem={() => null}
          contentContainerStyle={[styles.resultsList, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            hasSearched ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No cards found</Text>
              </View>
            ) : !capturedImage && !identification ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="cards-outline" size={56} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                  Scan Any Card
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                  Take a photo or pick from gallery. AI identifies the card name, set & number automatically
                </Text>
                <View style={styles.languageRow}>
                  <View style={[styles.langBadge, { backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[styles.langText, { color: colors.textSecondary }]}>English</Text>
                  </View>
                  <View style={[styles.langBadge, { backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[styles.langText, { color: colors.textSecondary }]}>Japanese</Text>
                  </View>
                  <View style={[styles.langBadge, { backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[styles.langText, { color: colors.textSecondary }]}>Korean</Text>
                  </View>
                  <View style={[styles.langBadge, { backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[styles.langText, { color: colors.textSecondary }]}>Chinese</Text>
                  </View>
                </View>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontSize: 28, fontFamily: "Outfit_700Bold", marginBottom: 2 },
  subtitle: { fontSize: 14, fontFamily: "Outfit_400Regular" },
  scanSection: { paddingHorizontal: 20, gap: 12, paddingBottom: 8 },
  scanButtons: { flexDirection: "row", gap: 12 },
  scanButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  scanButtonText: { fontSize: 14, fontFamily: "Outfit_600SemiBold", color: "#FFF" },
  capturedPreview: {
    height: 200,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 8,
  },
  capturedImage: { width: "100%", height: "100%" },
  clearCapture: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Outfit_400Regular", padding: 0 },
  searchSubmit: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  identifyingCard: {
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  identifyingText: { fontSize: 15, fontFamily: "Outfit_600SemiBold" },
  identifyingSubtext: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  errorCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Outfit_500Medium" },
  retryText: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  idCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    gap: 10,
    marginBottom: 8,
  },
  idHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  idTitle: { flex: 1, fontSize: 16, fontFamily: "Outfit_700Bold" },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  confidenceText: { fontSize: 11, fontFamily: "Outfit_600SemiBold", color: "#FFF", textTransform: "capitalize" as const },
  idRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  idLabel: { fontSize: 13, fontFamily: "Outfit_500Medium" },
  idValue: { fontSize: 14, fontFamily: "Outfit_600SemiBold", flex: 1, textAlign: "right" as const },
  idDetailsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  idTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  idTagText: { fontSize: 11, fontFamily: "Outfit_500Medium" },
  idNotes: { fontSize: 12, fontFamily: "Outfit_400Regular", fontStyle: "italic" as const },
  ebayButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 8,
  },
  ebayButtonText: { fontSize: 14, fontFamily: "Outfit_600SemiBold", color: "#FFF" },
  sectionTitle: { fontSize: 16, fontFamily: "Outfit_700Bold", marginBottom: 8 },
  resultsList: { paddingHorizontal: 20, paddingTop: 8 },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
  },
  resultImage: { width: 52, height: 72, borderRadius: 6 },
  resultInfo: { flex: 1, gap: 2 },
  resultName: { fontSize: 15, fontFamily: "Outfit_600SemiBold" },
  resultSet: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  resultMeta: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  resultRarity: { fontSize: 11, fontFamily: "Outfit_500Medium" },
  resultPrice: { fontSize: 14, fontFamily: "Outfit_700Bold", marginTop: 2 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "Outfit_400Regular" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 18, fontFamily: "Outfit_600SemiBold" },
  emptyText: { fontSize: 16, fontFamily: "Outfit_500Medium" },
  emptySubtext: { fontSize: 13, fontFamily: "Outfit_400Regular", textAlign: "center", paddingHorizontal: 32 },
  languageRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 8 },
  langBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  langText: { fontSize: 12, fontFamily: "Outfit_500Medium" },
});
