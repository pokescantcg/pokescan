import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  useColorScheme,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useThemeColors } from "@/constants/colors";

const WELCOME_KEY = "@pokescan_welcome_shown_v1";

export default function WelcomeModal() {
  const [visible, setVisible] = useState(false);
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const isDark = colorScheme === "dark";

  useEffect(() => {
    AsyncStorage.getItem(WELCOME_KEY).then((val) => {
      if (!val) setVisible(true);
    });
  }, []);

  const dismiss = () => {
    setVisible(false);
    AsyncStorage.setItem(WELCOME_KEY, "true");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: isDark ? "#1C2841" : "#FFFFFF" }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.iconRow}>
              <View style={[styles.iconCircle, { backgroundColor: colors.pokemonRed }]}>
                <Ionicons name="sparkles" size={28} color="#FFDE00" />
              </View>
            </View>

            <Text style={[styles.title, { color: colors.text }]}>
              Welcome to PokeScan TCG!
            </Text>

            <Text style={[styles.body, { color: colors.textSecondary }]}>
              Thank you for choosing PokeScan as your go-to app for managing your Pok{"\u00E9"}mon card collection, tracking prices, and discovering new sets. Whether you're trying us out or making this your permanent companion, we're glad you're here!
            </Text>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.infoRow}>
              <Ionicons name="construct-outline" size={18} color={colors.warning} />
              <Text style={[styles.infoTitle, { color: colors.text }]}>
                Work in Progress
              </Text>
            </View>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              PokeScan is under constant updates and development. We're always working to improve the experience and add new features.
            </Text>

            <View style={styles.infoRow}>
              <Ionicons name="information-circle-outline" size={18} color={colors.pokemonBlue} />
              <Text style={[styles.infoTitle, { color: colors.text }]}>
                A Note on Asian Sets
              </Text>
            </View>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              Chinese and Korean sets currently display artwork from the Japanese versions, as the card artwork is identical. In some sets the language shown on the card image may not match, but the card data (name, number, set) is correct. We're working on sourcing region-specific images over time.
            </Text>

            <Pressable
              onPress={dismiss}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.pokemonRed, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.buttonText}>Got it, let's go!</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 20,
    padding: 24,
    maxHeight: "85%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
      web: { boxShadow: "0 8px 32px rgba(0,0,0,0.3)" },
    }),
  },
  iconRow: {
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontFamily: "Outfit_700Bold",
    textAlign: "center",
    marginBottom: 12,
  },
  body: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    lineHeight: 21,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  infoTitle: {
    fontSize: 15,
    fontFamily: "Outfit_600SemiBold",
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Outfit_700Bold",
  },
});
