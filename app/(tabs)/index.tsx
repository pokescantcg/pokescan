import React, { useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  TextInput,
  useColorScheme,
  Platform,
  RefreshControl,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/constants/colors";
import { fetchSets, PokemonSet } from "@/lib/pokemon-api";
import PokeBackground from "@/components/PokeBackground";

// ── Language detection ────────────────────────────────────────────────────────

type LangId = "english" | "japanese" | "korean" | "chinese";

function detectLanguage(setId: string): LangId {
  const id = setId.toLowerCase();
  // Suffix-based detection (most reliable)
  if (id.includes("_ja")) return "japanese";
  if (id.includes("_ko")) return "korean";
  if (id.includes("_zh") || id.includes("_cn")) return "chinese";
  // Chinese TCG prefixes (Simplified Chinese official sets)
  if (/^(me|zsv|rsv)\d/.test(id)) return "chinese";
  return "english";
}

interface Language {
  id: LangId;
  label: string;
  native: string;
  flag: string;
  gradient: [string, string];
  noDataMsg: string;
}

const LANGUAGES: Language[] = [
  {
    id: "english",
    label: "English",
    native: "English",
    flag: "🇬🇧",
    gradient: ["#CC0000", "#8B0000"],
    noDataMsg: "",
  },
  {
    id: "japanese",
    label: "Japanese",
    native: "日本語",
    flag: "🇯🇵",
    gradient: ["#BC002D", "#7A0019"],
    noDataMsg: "Japanese card sets are not yet available in the database.\n\nUse the Scanner tab to identify any Japanese card — the AI will recognise it and show you its details and UK pricing.",
  },
  {
    id: "korean",
    label: "Korean",
    native: "한국어",
    flag: "🇰🇷",
    gradient: ["#003478", "#002055"],
    noDataMsg: "Korean card sets are not yet available in the database.\n\nUse the Scanner tab to identify any Korean card — the AI will recognise it and show you its details and UK pricing.",
  },
  {
    id: "chinese",
    label: "Chinese",
    native: "中文",
    flag: "🇨🇳",
    gradient: ["#DE2910", "#9A1C0A"],
    noDataMsg: "Chinese card sets are not yet available in the database.\n\nUse the Scanner tab to identify any Chinese card — the AI will recognise it and show you its details and UK pricing.",
  },
];

// ── SetCard ───────────────────────────────────────────────────────────────────

function SetCard({ set, colors }: { set: PokemonSet; colors: ReturnType<typeof useThemeColors> }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.setCard,
        { backgroundColor: colors.card, borderColor: colors.borderLight, opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={() => router.push({ pathname: "/set/[id]", params: { id: set.id, name: set.name } })}
    >
      <Image
        source={{ uri: set.images?.logo || "" }}
        style={styles.setLogo}
        contentFit="contain"
        placeholder={{ color: colors.surface } as any}
      />
      <View style={styles.setInfo}>
        <Text style={[styles.setSeries, { color: colors.pokemonRed }]} numberOfLines={1}>
          {set.series}
        </Text>
        <Text style={[styles.setName, { color: colors.text }]} numberOfLines={1}>
          {set.name}
        </Text>
        <View style={styles.setMeta}>
          <View style={styles.setMetaItem}>
            <MaterialCommunityIcons name="cards-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.setMetaText, { color: colors.textSecondary }]}>
              {set.total || set.printedTotal || "?"} cards
            </Text>
          </View>
          {set.releaseDate ? (
            <View style={styles.setMetaItem}>
              <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.setMetaText, { color: colors.textSecondary }]}>
                {set.releaseDate}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <Image
        source={{ uri: set.images?.symbol || "" }}
        style={styles.setSymbol}
        contentFit="contain"
        placeholder={{ color: colors.surface } as any}
      />
    </Pressable>
  );
}

// ── LanguageCard ──────────────────────────────────────────────────────────────

function LanguageCard({
  lang,
  count,
  colors,
  onPress,
}: {
  lang: Language;
  count: number;
  colors: ReturnType<typeof useThemeColors>;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.langCard, { opacity: pressed ? 0.88 : 1 }]}
      onPress={onPress}
    >
      <LinearGradient
        colors={lang.gradient}
        style={styles.langCardInner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.langFlag}>{lang.flag}</Text>
        <Text style={styles.langLabel}>{lang.label}</Text>
        <Text style={styles.langNative}>{lang.native}</Text>
        <View style={styles.langBadge}>
          {count > 0 ? (
            <>
              <MaterialCommunityIcons name="cards-outline" size={11} color="rgba(255,255,255,0.9)" />
              <Text style={styles.langBadgeText}>{count} sets</Text>
            </>
          ) : (
            <>
              <Ionicons name="scan-outline" size={11} color="rgba(255,255,255,0.9)" />
              <Text style={styles.langBadgeText}>Scanner</Text>
            </>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

// ── BrowseScreen ──────────────────────────────────────────────────────────────

export default function BrowseScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [selectedLang, setSelectedLang] = useState<LangId | null>(null);

  const { data: sets, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["tcg-sets"],
    queryFn: fetchSets,
    staleTime: 1000 * 60 * 60,
  });

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  // Group sets by language
  const setsByLang = useMemo(() => {
    const groups: Record<LangId, PokemonSet[]> = { english: [], japanese: [], korean: [], chinese: [] };
    (sets || []).forEach((s) => {
      groups[detectLanguage(s.id)].push(s);
    });
    return groups;
  }, [sets]);

  const currentLangDef = LANGUAGES.find((l) => l.id === selectedLang);

  const filteredSets = useMemo(() => {
    if (!selectedLang) return [];
    const langSets = setsByLang[selectedLang] || [];
    if (!search.trim()) return langSets;
    const q = search.toLowerCase();
    return langSets.filter(
      (s) => s.name.toLowerCase().includes(q) || s.series.toLowerCase().includes(q)
    );
  }, [selectedLang, setsByLang, search]);

  const renderItem = useCallback(
    ({ item }: { item: PokemonSet }) => <SetCard set={item} colors={colors} />,
    [colors]
  );

  const handleSelectLang = (lang: Language) => {
    setSearch("");
    setSelectedLang(lang.id);
  };

  const handleBack = () => {
    setSearch("");
    setSelectedLang(null);
  };

  // ── Language Selector Screen ─────────────────────────────────────────────

  if (!selectedLang) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={colorScheme === "dark" ? ["#2A0A0A", "#1A1A2E"] : ["#FFF0F0", "#F5F5F5"]}
          style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}
        >
          <View style={styles.titleRow}>
            <MaterialCommunityIcons name="pokeball" size={26} color={colors.pokemonRed} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>Card Sets</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Choose a language to browse
              </Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={styles.langGrid}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.langSectionTitle, { color: colors.textMuted }]}>
            SELECT LANGUAGE
          </Text>

          <View style={styles.langRow}>
            {LANGUAGES.slice(0, 2).map((lang) => (
              <LanguageCard
                key={lang.id}
                lang={lang}
                count={setsByLang[lang.id]?.length || 0}
                colors={colors}
                onPress={() => handleSelectLang(lang)}
              />
            ))}
          </View>
          <View style={styles.langRow}>
            {LANGUAGES.slice(2, 4).map((lang) => (
              <LanguageCard
                key={lang.id}
                lang={lang}
                count={setsByLang[lang.id]?.length || 0}
                colors={colors}
                onPress={() => handleSelectLang(lang)}
              />
            ))}
          </View>

          <View style={[styles.totalBadge, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <MaterialCommunityIcons name="cards-outline" size={16} color={colors.pokemonRed} />
            <Text style={[styles.totalText, { color: colors.textSecondary }]}>
              {sets?.length || 0} total sets available
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Set List Screen ──────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PokeBackground opacity={colorScheme === "dark" ? 0.18 : 0.12} />
      <LinearGradient
        colors={colorScheme === "dark" ? ["#2A0A0A", "#1A1A2E"] : ["#FFF0F0", "#F5F5F5"]}
        style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}
      >
        <View style={styles.titleRow}>
          <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.langFlagHeader}>{currentLangDef?.flag}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>{currentLangDef?.label}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {(setsByLang[selectedLang!]?.length ?? 0) > 0
                ? `${setsByLang[selectedLang!]?.length || 0} sets`
                : "No sets in database"}
            </Text>
          </View>
          <Pressable onPress={() => refetch()} style={styles.refreshIconBtn} disabled={isRefetching}>
            <Ionicons name="refresh" size={20} color={isRefetching ? colors.textMuted : colors.text} />
          </Pressable>
        </View>

        {(setsByLang[selectedLang!]?.length ?? 0) > 0 && (
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.pokemonRed + "40" }]}>
            <Ionicons name="search" size={17} color={colors.pokemonRed} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={`Search ${currentLangDef?.label} sets...`}
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={17} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        )}
      </LinearGradient>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="pokeball" size={48} color={colors.pokemonRed} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading sets...</Text>
        </View>
      ) : (setsByLang[selectedLang!]?.length ?? 0) === 0 ? (
        // No data state for Japanese / Korean / Chinese
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataFlag}>{currentLangDef?.flag}</Text>
          <Text style={[styles.noDataTitle, { color: colors.text }]}>
            {currentLangDef?.label} Sets
          </Text>
          <Text style={[styles.noDataMsg, { color: colors.textSecondary }]}>
            {currentLangDef?.noDataMsg}
          </Text>
          <Pressable
            style={[styles.scannerBtn, { backgroundColor: colors.pokemonRed }]}
            onPress={() => router.push("/(tabs)/scanner")}
          >
            <Ionicons name="scan-outline" size={18} color="#FFF" />
            <Text style={styles.scannerBtnText}>Open Scanner</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredSets}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.pokemonRed}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="cards-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {search ? "No sets match your search" : "No sets available"}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: { padding: 2 },
  refreshIconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  langFlagHeader: { fontSize: 24 },
  title: { fontSize: 26, fontFamily: "Outfit_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Outfit_400Regular", marginTop: 2 },
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

  // Language grid
  langGrid: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100, gap: 14 },
  langSectionTitle: {
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: -4,
  },
  langRow: { flexDirection: "row", gap: 12 },
  langCard: { flex: 1 },
  langCardInner: {
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
    gap: 6,
    minHeight: 140,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  langFlag: { fontSize: 40, lineHeight: 48 },
  langLabel: { fontSize: 16, fontFamily: "Outfit_700Bold", color: "#FFF" },
  langNative: { fontSize: 12, fontFamily: "Outfit_400Regular", color: "rgba(255,255,255,0.75)" },
  langBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 4,
  },
  langBadgeText: { fontSize: 11, fontFamily: "Outfit_600SemiBold", color: "rgba(255,255,255,0.9)" },
  totalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
    marginTop: 4,
  },
  totalText: { fontSize: 14, fontFamily: "Outfit_500Medium" },

  // Set list
  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  setCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
  },
  setLogo: { width: 80, height: 48, borderRadius: 6 },
  setInfo: { flex: 1, gap: 2 },
  setSeries: { fontSize: 11, fontFamily: "Outfit_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  setName: { fontSize: 16, fontFamily: "Outfit_700Bold" },
  setMeta: { flexDirection: "row", gap: 12, alignItems: "center", marginTop: 3 },
  setMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  setMetaText: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  setSymbol: { width: 32, height: 32 },

  // Loading / empty
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 14 },
  loadingText: { fontSize: 15, fontFamily: "Outfit_500Medium" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Outfit_500Medium" },

  // No data (Japanese / Korean)
  noDataContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
    gap: 16,
    paddingBottom: 60,
  },
  noDataFlag: { fontSize: 64, lineHeight: 76 },
  noDataTitle: { fontSize: 22, fontFamily: "Outfit_700Bold", textAlign: "center" },
  noDataMsg: {
    fontSize: 15,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  scannerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    marginTop: 8,
  },
  scannerBtnText: { fontSize: 15, fontFamily: "Outfit_700Bold", color: "#FFF" },
});
