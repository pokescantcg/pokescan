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
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/constants/colors";
import { searchCards, PokemonCard, getUKPrice, formatGBP } from "@/lib/pokemon-api";

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

  const handleSearch = useCallback(async () => {
    if (!searchText.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
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
        setCapturedImage(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
          "Card Captured",
          "Card image captured! Type the card name in the search box to find it in our database and get pricing info.",
        );
      }
    } catch (e) {
      console.error("Camera error:", e);
    }
  }, []);

  const handleGallery = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.8,
        allowsEditing: true,
        aspect: [3, 4],
      });
      if (!result.canceled && result.assets[0]) {
        setCapturedImage(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
          "Card Selected",
          "Card image selected! Type the card name in the search box to find it in our database.",
        );
      }
    } catch (e) {
      console.error("Gallery error:", e);
    }
  }, []);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}>
        <Text style={[styles.title, { color: colors.text }]}>Card Scanner</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Capture or search for any Pokemon card
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
            <Text style={styles.scanButtonText}>Take Photo</Text>
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

        {capturedImage && (
          <View style={[styles.capturedPreview, { borderColor: colors.border }]}>
            <Image source={{ uri: capturedImage }} style={styles.capturedImage} contentFit="contain" />
            <Pressable
              style={[styles.clearCapture, { backgroundColor: colors.error }]}
              onPress={() => setCapturedImage(null)}
            >
              <Ionicons name="close" size={16} color="#FFF" />
            </Pressable>
          </View>
        )}

        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search card name..."
            placeholderTextColor={colors.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <Pressable onPress={() => { setSearchText(""); setResults([]); setHasSearched(false); }}>
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
      ) : (
        <FlatList
          data={results}
          renderItem={({ item }) => <SearchResultCard card={item} colors={colors} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.resultsList, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            hasSearched ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No cards found
                </Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="scan-outline" size={56} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                  Scan or Search
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                  Take a photo of your card or search by name to find pricing and details
                </Text>
              </View>
            )
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
    height: 160,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
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
  resultRarity: { fontSize: 11, fontFamily: "Outfit_500Medium" },
  resultPrice: { fontSize: 14, fontFamily: "Outfit_700Bold", marginTop: 2 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "Outfit_400Regular" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 18, fontFamily: "Outfit_600SemiBold" },
  emptyText: { fontSize: 16, fontFamily: "Outfit_500Medium" },
  emptySubtext: { fontSize: 13, fontFamily: "Outfit_400Regular", textAlign: "center", paddingHorizontal: 40 },
});
