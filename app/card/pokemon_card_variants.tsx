import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/constants/colors";
import { pokemonCardVariants } from "@/shared/schema";

export default function PokemonCardVariantsRoute() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32 }}>
      <Text style={[styles.title, { color: colors.text }]}>pokemon_card_variants</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Table name</Text>
        <Text style={[styles.value, { color: colors.text }]}>pokemon_card_variants</Text>
        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>Schema</Text>
        <Text style={[styles.value, { color: colors.text }]} numberOfLines={0}>
          {JSON.stringify(Object.keys(pokemonCardVariants), null, 2)}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16 },
  label: { fontSize: 12, fontWeight: "600", textTransform: "uppercase" },
  value: { fontSize: 14, marginTop: 4 },
});