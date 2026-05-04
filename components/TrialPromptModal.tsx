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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useThemeColors } from "@/constants/colors";
import { router } from "expo-router";

interface TrialPromptModalProps {
  visible: boolean;
  onDismiss: () => void;
  trialDaysLeft: number;
  isFinalPrompt?: boolean;
}

export default function TrialPromptModal({
  visible,
  onDismiss,
  trialDaysLeft,
  isFinalPrompt = false
}: TrialPromptModalProps) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const isDark = colorScheme === "dark";

  const getPromptMessage = () => {
    if (isFinalPrompt) {
      return {
        title: "Your Free Trial Ends Soon!",
        message: "Your 7-day free trial of PokeScan Premium is ending in less than 2 hours. Don't lose access to unlimited scanning, AI grading, marketplace features, and more!",
        urgency: "⏰ Time is running out!"
      };
    } else if (trialDaysLeft === 1) {
      return {
        title: "Premium Trial Ending Tomorrow",
        message: "Your 7-day free trial of PokeScan Premium ends tomorrow. Upgrade now to keep unlimited access to all premium features!",
        urgency: "📅 Only 1 day left!"
      };
    } else {
      return {
        title: "Premium Trial Update",
        message: `Your 7-day free trial of PokeScan Premium has ${trialDaysLeft} days remaining. Consider upgrading to ensure uninterrupted access to all features.`,
        urgency: `📊 ${trialDaysLeft} days left in trial`
      };
    }
  };

  const prompt = getPromptMessage();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: isDark ? "#1C2841" : "#FFFFFF" }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.iconRow}>
              <View style={[styles.iconCircle, { backgroundColor: colors.pokemonRed }]}>
                <MaterialCommunityIcons name="crown" size={28} color="#FFDE00" />
              </View>
            </View>

            <Text style={[styles.title, { color: colors.text }]}>
              {prompt.title}
            </Text>

            <Text style={[styles.urgency, { color: colors.warning }]}>
              {prompt.urgency}
            </Text>

            <Text style={[styles.body, { color: colors.textSecondary }]}>
              {prompt.message}
            </Text>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <Text style={[styles.featuresTitle, { color: colors.text }]}>
              What you'll keep with Premium:
            </Text>

            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Ionicons name="camera-outline" size={16} color={colors.success} />
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                  Unlimited card scanning
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="storefront-outline" size={16} color={colors.success} />
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                  Full marketplace access
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="robot-outline" size={16} color={colors.success} />
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                  AI card grading
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="people-outline" size={16} color={colors.success} />
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                  Social features & messaging
                </Text>
              </View>
            </View>

            <View style={styles.buttonRow}>
              <Pressable
                onPress={() => {
                  onDismiss();
                  router.push("/premium");
                }}
                style={({ pressed }) => [
                  styles.upgradeButton,
                  { backgroundColor: colors.pokemonRed, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <MaterialCommunityIcons name="crown" size={16} color="#FFDE00" />
                <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
              </Pressable>

              <Pressable
                onPress={onDismiss}
                style={({ pressed }) => [
                  styles.laterButton,
                  {
                    backgroundColor: isDark ? "#2A3A5A" : "#F5F5F5",
                    borderColor: colors.border,
                    opacity: pressed ? 0.85 : 1
                  },
                ]}
              >
                <Text style={[styles.laterButtonText, { color: colors.textSecondary }]}>
                  Maybe Later
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              Your trial will end automatically if not upgraded. You can upgrade anytime before then.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
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
    fontSize: 20,
    fontFamily: "Outfit_700Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  urgency: {
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
    textAlign: "center",
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    marginVertical: 20,
  },
  featuresTitle: {
    fontSize: 16,
    fontFamily: "Outfit_600SemiBold",
    marginBottom: 12,
  },
  featuresList: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    marginLeft: 8,
    flex: 1,
  },
  buttonRow: {
    gap: 12,
    marginBottom: 16,
  },
  upgradeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  upgradeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Outfit_600SemiBold",
  },
  laterButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
  },
  laterButtonText: {
    fontSize: 14,
    fontFamily: "Outfit_500Medium",
  },
  footerText: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
    lineHeight: 16,
  },
});