import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/constants/colors";

export default function RefundPolicyScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient colors={["#1A0A0A", "#0D0D1A"]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Refund Policy</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.updated, { color: colors.textMuted }]}>Last updated: April 2025</Text>

        <Section title="Overview" colors={colors}>
          We aim to provide a fair and transparent experience for all users of our premium services.
        </Section>

        <Section title="Monthly Premium Subscription" colors={colors}>
          Refund requests for the 1-month premium subscription must be submitted within 7 days of the original purchase date. Requests made after this period will not be eligible for a refund.
        </Section>

        <Section title="Annual Premium Subscription" colors={colors}>
          Refund requests for the yearly premium subscription must be submitted within 30 days of the original purchase date. Requests made after this period will not be eligible for a refund.
        </Section>

        <Section title="General Conditions" colors={colors}>
          {"• Refunds are only applicable to the initial purchase of a subscription.\n"}
          {"• Renewals are non-refundable unless required by applicable law.\n"}
          {"• To request a refund, users must contact support with proof of purchase.\n"}
          {"• Refunds may take several business days to process depending on your payment provider (e.g., app store)."}
        </Section>

        <Section title="Third-Party Purchases" colors={colors}>
          If the subscription was purchased through a third-party platform (such as Google Play or Apple App Store), refunds may be subject to their respective policies and must be requested directly through those platforms.
        </Section>

        <Section title="Contact Us" colors={colors}>
          {"To request a refund or for any questions about this policy, please contact us at:\n\nEmail: pokescantcg@gmail.com"}
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Outfit_600SemiBold",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  updated: {
    fontSize: 12,
    fontFamily: "Outfit_400Regular",
    marginBottom: 24,
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Outfit_700Bold",
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    lineHeight: 22,
  },
});
