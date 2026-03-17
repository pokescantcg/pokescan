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
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
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
  generateEbaySoldUrl,
  fetchPCVSearch,
  findCard,
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
        ? colors.pokemonYellow
        : colors.error;

  return (
    <View style={[styles.idCard, { backgroundColor: colors.card, borderColor: colors.pokemonRed + "60" }]}>
      <LinearGradient
        colors={[colors.pokemonRed + "15", "transparent"]}
        style={styles.idGradient}
      />
      <View style={styles.idHeader}>
        <View style={[styles.aiIconBg, { backgroundColor: colors.pokemonRed + "20" }]}>
          <MaterialCommunityIcons name="robot" size={18} color={colors.pokemonRed} />
        </View>
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
          <View style={[styles.idTag, { backgroundColor: isForeign ? colors.pokemonBlue : colors.surfaceElevated }]}>
            <Text style={[styles.idTagText, { color: isForeign ? "#FFF" : colors.textSecondary }]}>
              {identification.language}
            </Text>
          </View>
        )}
        {identification.rarity && (
          <View style={[styles.idTag, { backgroundColor: colors.pokemonYellow + "30" }]}>
            <Text style={[styles.idTagText, { color: colors.pokemonYellow }]}>{identification.rarity}</Text>
          </View>
        )}
        {identification.holoType && identification.holoType !== "Non-Holo" && (
          <View style={[styles.idTag, { backgroundColor: colors.pokemonRed + "20" }]}>
            <Text style={[styles.idTagText, { color: colors.pokemonRed }]}>{identification.holoType}</Text>
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
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const found = await findCard(card.name, card.number, card.setId || undefined);
      if (found) {
        router.push({ pathname: "/card/[id]", params: { id: found.id } });
      } else {
        Alert.alert(
          card.name,
          `Card details:\nSet: ${card.setName || card.setId}\nNumber: #${card.number}\n${card.holoType ? `Type: ${card.holoType}\n` : ""}UK Value: ${formatGBP(card.priceGBP)}`,
          [{ text: "OK" }]
        );
      }
    } catch {
      Alert.alert("Error", "Could not load card details. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.resultCard,
        { backgroundColor: colors.card, borderColor: colors.borderLight, opacity: pressed || isLoading ? 0.7 : 1 },
      ]}
      onPress={handlePress}
      disabled={isLoading}
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
            <Text style={[styles.resultRarity, { color: colors.pokemonRed }]} numberOfLines={1}>
              {card.holoType}
            </Text>
          ) : null}
          {card.rarity ? (
            <Text style={[styles.resultRarity, { color: colors.pokemonYellow }]} numberOfLines={1}>
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
      {isLoading ? (
        <MaterialCommunityIcons name="pokeball" size={14} color={colors.pokemonRed} />
      ) : (
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

function DatabaseMatchCard({
  card,
  pcvCard,
  identification,
  colors,
  onEbayListings,
  onEbaySold,
}: {
  card: PokemonCard;
  pcvCard: PCVCard | null;
  identification: CardIdentification;
  colors: ReturnType<typeof useThemeColors>;
  onEbayListings: () => void;
  onEbaySold: () => void;
}) {
  const tcgPrice = getUKPrice(card);
  const displayPrice = pcvCard?.priceGBP || tcgPrice.price;

  return (
    <View style={[dbMatchStyles.wrap, { backgroundColor: colors.card, borderColor: colors.success + "60" }]}>
      <LinearGradient colors={[colors.success + "18", "transparent"]} style={dbMatchStyles.gradient} />

      <View style={dbMatchStyles.header}>
        <View style={[dbMatchStyles.badgeBg, { backgroundColor: colors.success + "20" }]}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={[dbMatchStyles.badgeText, { color: colors.success }]}>Database Match</Text>
        </View>
        {displayPrice ? (
          <Text style={[dbMatchStyles.price, { color: colors.success }]}>{formatGBP(displayPrice)}</Text>
        ) : null}
      </View>

      <Pressable
        style={({ pressed }) => [dbMatchStyles.cardRow, { opacity: pressed ? 0.85 : 1 }]}
        onPress={() => router.push({ pathname: "/card/[id]", params: { id: card.id } })}
      >
        <Image source={{ uri: card.images.small }} style={dbMatchStyles.cardImage} contentFit="contain" />
        <View style={dbMatchStyles.cardInfo}>
          <Text style={[dbMatchStyles.cardName, { color: colors.text }]} numberOfLines={2}>{card.name}</Text>
          <Text style={[dbMatchStyles.cardSet, { color: colors.textSecondary }]} numberOfLines={1}>
            {card.set.name}
          </Text>
          <Text style={[dbMatchStyles.cardNumber, { color: colors.textMuted }]}>
            #{card.number}
          </Text>
          {card.rarity && (
            <Text style={[dbMatchStyles.cardRarity, { color: colors.pokemonYellow }]} numberOfLines={1}>
              {card.rarity}
            </Text>
          )}
          <View style={dbMatchStyles.viewRow}>
            <Text style={[dbMatchStyles.viewText, { color: colors.pokemonRed }]}>View Full Details</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.pokemonRed} />
          </View>
        </View>
      </Pressable>

      <View style={dbMatchStyles.ebayRow}>
        <Pressable
          style={({ pressed }) => [dbMatchStyles.ebayBtn, { backgroundColor: "#E53238", opacity: pressed ? 0.85 : 1 }]}
          onPress={onEbayListings}
        >
          <Ionicons name="search" size={14} color="#FFF" />
          <Text style={dbMatchStyles.ebayBtnText}>eBay Listings</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [dbMatchStyles.ebayBtn, { backgroundColor: "#0064D2", opacity: pressed ? 0.85 : 1 }]}
          onPress={onEbaySold}
        >
          <Ionicons name="checkmark-done" size={14} color="#FFF" />
          <Text style={dbMatchStyles.ebayBtnText}>Sold Items</Text>
        </Pressable>
      </View>
    </View>
  );
}

const dbMatchStyles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  gradient: { position: "absolute", top: 0, left: 0, right: 0, height: 70 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badgeBg: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontFamily: "Outfit_700Bold" },
  price: { fontSize: 20, fontFamily: "Outfit_700Bold" },
  cardRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  cardImage: { width: 72, height: 100, borderRadius: 8 },
  cardInfo: { flex: 1, gap: 3 },
  cardName: { fontSize: 16, fontFamily: "Outfit_700Bold" },
  cardSet: { fontSize: 13, fontFamily: "Outfit_500Medium" },
  cardNumber: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  cardRarity: { fontSize: 12, fontFamily: "Outfit_600SemiBold" },
  viewRow: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 4 },
  viewText: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  ebayRow: { flexDirection: "row", gap: 8 },
  ebayBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 10, gap: 6 },
  ebayBtnText: { fontSize: 12, fontFamily: "Outfit_700Bold", color: "#FFF" },
});

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
          <Text style={[styles.resultRarity, { color: colors.pokemonYellow }]} numberOfLines={1}>
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
  const [tcgApiResults, setTcgApiResults] = useState<PokemonCard[]>([]);
  const [identifyError, setIdentifyError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchText.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    setIdentification(null);
    setPcvResults([]);
    setTcgApiResults([]);
    try {
      const pcvSearchResults = await fetchPCVSearch(searchText.trim());
      if (pcvSearchResults.length > 0) {
        setPcvResults(pcvSearchResults);
        setResults([]);
      } else {
        try {
          const { cards } = await searchCards(searchText.trim());
          setResults(cards);
        } catch {
          setResults([]);
        }
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.error("Search failed:", e);
      try {
        const { cards } = await searchCards(searchText.trim());
        setResults(cards);
      } catch {
        Alert.alert("Search Error", "Failed to search for cards. Please try again.");
      }
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
    setTcgApiResults([]);
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
          encoding: "base64" as any,
        });
        base64 = `data:image/jpeg;base64,${fileBase64}`;
      }

      const result = await identifyCard(base64);
      setIdentification(result.identification);
      setPcvResults(result.pcvResults || []);
      setTcgApiResults(result.tcgApiResults || []);
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

  const handleEbayListings = useCallback((name: string, setName?: string, number?: string) => {
    const url = generateEbaySearchUrl(name, setName, number);
    Linking.openURL(url);
  }, []);

  const handleEbaySold = useCallback((name: string, setName?: string, number?: string) => {
    const url = generateEbaySoldUrl(name, setName, number);
    Linking.openURL(url);
  }, []);

  const clearAll = useCallback(() => {
    setCapturedImage(null);
    setIdentification(null);
    setPcvResults([]);
    setTcgApiResults([]);
    setIdentifyError(null);
    setResults([]);
    setHasSearched(false);
    setSearchText("");
  }, []);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const renderHeader = () => (
    <>
      {capturedImage && (
        <View style={[styles.capturedPreview, { borderColor: colors.pokemonRed + "60" }]}>
          <Image source={{ uri: capturedImage }} style={styles.capturedImage} contentFit="contain" />
          <Pressable
            style={[styles.clearCapture, { backgroundColor: colors.pokemonRed }]}
            onPress={clearAll}
          >
            <Ionicons name="close" size={16} color="#FFF" />
          </Pressable>
        </View>
      )}

      {isIdentifying && (
        <View style={[styles.identifyingCard, { backgroundColor: colors.card, borderColor: colors.pokemonRed + "40" }]}>
          <MaterialCommunityIcons name="pokeball" size={28} color={colors.pokemonRed} />
          <Text style={[styles.identifyingText, { color: colors.text }]}>
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
            <Text style={[styles.retryText, { color: colors.pokemonRed }]}>Try again</Text>
          </Pressable>
        </View>
      )}

      {identification && !isIdentifying && (
        <>
          <IdentificationCard identification={identification} colors={colors} />

          {tcgApiResults.length > 0 ? (
            <DatabaseMatchCard
              card={tcgApiResults[0]}
              pcvCard={pcvResults[0] || null}
              identification={identification}
              colors={colors}
              onEbayListings={() => handleEbayListings(identification.englishName, identification.setName, identification.cardNumber)}
              onEbaySold={() => handleEbaySold(identification.englishName, identification.setName, identification.cardNumber)}
            />
          ) : identification.englishName ? (
            <View style={[styles.ebaySection, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
              <View style={styles.ebaySectionHeader}>
                <Ionicons name="globe-outline" size={16} color="#E53238" />
                <Text style={[styles.ebaySectionTitle, { color: colors.text }]}>eBay UK Search</Text>
              </View>
              <Text style={[styles.ebaySectionDesc, { color: colors.textSecondary }]}>
                No exact database match found — search eBay UK directly
              </Text>
              <View style={styles.ebayBtns}>
                <Pressable
                  style={({ pressed }) => [styles.ebayBtn, { backgroundColor: "#E53238", opacity: pressed ? 0.85 : 1 }]}
                  onPress={() => handleEbayListings(identification.englishName, identification.setName, identification.cardNumber)}
                >
                  <Ionicons name="search" size={15} color="#FFF" />
                  <Text style={styles.ebayBtnText}>Active Listings</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.ebayBtn, { backgroundColor: "#0064D2", opacity: pressed ? 0.85 : 1 }]}
                  onPress={() => handleEbaySold(identification.englishName, identification.setName, identification.cardNumber)}
                >
                  <Ionicons name="checkmark-done" size={15} color="#FFF" />
                  <Text style={styles.ebayBtnText}>Sold Items</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </>
      )}

      {pcvResults.length > 1 && (
        <View style={styles.resultsHeaderRow}>
          <View style={[styles.resultsHeaderDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            UK Price Options ({pcvResults.length})
          </Text>
        </View>
      )}
    </>
  );

  const hasIdentifiedResults = pcvResults.length > 0 || (tcgApiResults.length > 0 && !!identification);
  const allSearchShown = results.length > 0 && !hasIdentifiedResults;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={colorScheme === "dark" ? ["#2A0A0A", "#1A1A2E"] : ["#FFF0F0", "#F5F5F5"]}
        style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}
      >
        <View style={styles.titleRow}>
          <Ionicons name="scan" size={22} color={colors.pokemonRed} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>Card Scanner</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              AI-powered card identification
            </Text>
          </View>
          <Image
            source={{ uri: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/479.png" }}
            style={styles.rotomMascot}
            contentFit="contain"
          />
        </View>
      </LinearGradient>

      <View style={styles.scanSection}>
        <View style={styles.scanButtons}>
          <Pressable
            style={({ pressed }) => [
              styles.scanButton,
              { opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleCameraCapture}
          >
            <LinearGradient
              colors={["#CC0000", "#8B0000"]}
              style={styles.scanButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="camera" size={24} color="#FFF" />
              <Text style={styles.scanButtonText}>Scan Card</Text>
            </LinearGradient>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.scanButton,
              { opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleGallery}
          >
            <View style={[styles.scanButtonGradient, { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.borderLight }]}>
              <Ionicons name="images" size={24} color={colors.text} />
              <Text style={[styles.scanButtonText, { color: colors.text }]}>Gallery</Text>
            </View>
          </Pressable>
        </View>

        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.pokemonRed + "40" }]}>
          <Ionicons name="search" size={18} color={colors.pokemonRed} />
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
            style={[styles.searchSubmit, { backgroundColor: colors.pokemonRed }]}
            onPress={handleSearch}
          >
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
          </Pressable>
        </View>
      </View>

      {isSearching ? (
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="pokeball" size={40} color={colors.pokemonRed} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Searching...</Text>
        </View>
      ) : hasIdentifiedResults && pcvResults.length > 0 ? (
        <FlatList
          data={pcvResults}
          renderItem={({ item }) => <PCVResultCard card={item} colors={colors} />}
          keyExtractor={(item, i) => `${item.url}-${i}`}
          contentContainerStyle={[styles.resultsList, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
        />
      ) : hasIdentifiedResults && tcgApiResults.length > 1 ? (
        <FlatList
          data={tcgApiResults.slice(1)}
          renderItem={({ item }) => <SearchResultCard card={item} colors={colors} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.resultsList, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <>
              {renderHeader()}
              <View style={styles.resultsHeaderRow}>
                <View style={[styles.resultsHeaderDot, { backgroundColor: colors.pokemonBlue }]} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Other Versions ({tcgApiResults.length - 1})
                </Text>
              </View>
            </>
          )}
        />
      ) : hasIdentifiedResults ? (
        <FlatList
          data={[]}
          renderItem={() => null}
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
                <MaterialCommunityIcons name="pokeball" size={64} color={colors.pokemonRed + "40"} />
                <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                  Scan Any Card
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                  Take a photo or pick from gallery. AI identifies the card name, set & number automatically
                </Text>
                <View style={styles.languageRow}>
                  {["English", "Japanese", "Korean", "Chinese"].map((lang) => (
                    <View key={lang} style={[styles.langBadge, { backgroundColor: colors.pokemonRed + "15", borderColor: colors.pokemonRed + "30", borderWidth: 1 }]}>
                      <Text style={[styles.langText, { color: colors.pokemonRed }]}>{lang}</Text>
                    </View>
                  ))}
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
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  title: { fontSize: 28, fontFamily: "Outfit_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Outfit_400Regular", marginTop: 2 },
  rotomMascot: { width: 64, height: 64 },
  scanSection: { paddingHorizontal: 20, gap: 12, paddingBottom: 8 },
  scanButtons: { flexDirection: "row", gap: 12 },
  scanButton: {
    flex: 1,
  },
  scanButtonGradient: {
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
    borderWidth: 2,
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
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Outfit_400Regular", padding: 0 },
  searchSubmit: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  identifyingCard: {
    borderRadius: 14,
    padding: 20,
    borderWidth: 1.5,
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
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    gap: 8,
    marginBottom: 8,
    overflow: "hidden",
  },
  idGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  idHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  aiIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  idTitle: { flex: 1, fontSize: 15, fontFamily: "Outfit_700Bold" },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  confidenceText: { fontSize: 11, fontFamily: "Outfit_700Bold", color: "#FFF", textTransform: "uppercase" },
  idRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  idLabel: { fontSize: 13, fontFamily: "Outfit_400Regular" },
  idValue: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  idDetailsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  idTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  idTagText: { fontSize: 11, fontFamily: "Outfit_600SemiBold" },
  idNotes: { fontSize: 12, fontFamily: "Outfit_400Regular", fontStyle: "italic", marginTop: 4 },
  ebaySection: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  ebaySectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  ebaySectionTitle: { fontSize: 14, fontFamily: "Outfit_700Bold" },
  ebaySectionDesc: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  ebayBtns: { flexDirection: "row", gap: 8 },
  ebayBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  ebayBtnText: { fontSize: 12, fontFamily: "Outfit_600SemiBold", color: "#FFF" },
  resultsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  resultsHeaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: { fontSize: 16, fontFamily: "Outfit_700Bold" },
  resultsList: { paddingHorizontal: 20, paddingTop: 8 },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    gap: 10,
  },
  resultImage: { width: 40, height: 56, borderRadius: 6 },
  resultInfo: { flex: 1, gap: 2 },
  resultMeta: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  resultName: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  resultSet: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  resultRarity: { fontSize: 11, fontFamily: "Outfit_500Medium" },
  resultPrice: { fontSize: 14, fontFamily: "Outfit_700Bold" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "Outfit_500Medium" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 40, gap: 10 },
  emptyTitle: { fontSize: 20, fontFamily: "Outfit_700Bold" },
  emptyText: { fontSize: 16, fontFamily: "Outfit_500Medium" },
  emptySubtext: { fontSize: 13, fontFamily: "Outfit_400Regular", textAlign: "center", paddingHorizontal: 32 },
  languageRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 8 },
  langBadge: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  langText: { fontSize: 12, fontFamily: "Outfit_600SemiBold" },
});
