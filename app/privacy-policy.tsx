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

export default function PrivacyPolicyScreen() {
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Privacy Policy</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.updated, { color: colors.textMuted }]}>Last updated: April 2025</Text>

        <Section title="1. Who We Are" colors={colors}>
          PokeScan TCG ("we", "us", "our") is a mobile application for scanning, identifying, and managing Pokémon Trading Card Game collections. We are committed to protecting the privacy of our users.
        </Section>

        <Section title="2. Information We Collect" colors={colors}>
          We collect information you provide directly when you create an account, including your username, display name, email address, and optionally your mobile number and profile photo.{"\n\n"}
          We also collect information about how you use the app, such as cards you scan, cards in your collection, marketplace listings, and messages sent within the platform.
        </Section>

        <Section title="3. How We Use Your Information" colors={colors}>
          We use the information we collect to:{"\n\n"}
          • Provide, operate, and maintain the app{"\n"}
          • Process transactions and manage your subscription{"\n"}
          • Send you verification codes and account-related communications{"\n"}
          • Enable social features such as messaging and friend connections{"\n"}
          • Improve and personalise your experience{"\n"}
          • Respond to support requests{"\n"}
          • Detect and prevent fraud or abuse
        </Section>

        <Section title="4. Data Storage & Security" colors={colors}>
          Your data is stored securely on our servers. We use industry-standard encryption for data in transit (HTTPS) and at rest. Passwords are hashed using bcrypt and are never stored in plain text.{"\n\n"}
          We retain your data for as long as your account is active. You may request deletion of your account and associated data by contacting us at pokescantcg@gmail.com.
        </Section>

        <Section title="5. Third-Party Services" colors={colors}>
          We use the following third-party services:{"\n\n"}
          • <Text style={{ fontFamily: "Outfit_600SemiBold" }}>Stripe</Text> — for processing subscription payments. Your payment details are handled directly by Stripe and never stored on our servers.{"\n"}
          • <Text style={{ fontFamily: "Outfit_600SemiBold" }}>OpenAI</Text> — for AI-powered card grading and scanning. Card images may be sent to OpenAI for analysis.{"\n"}
          • <Text style={{ fontFamily: "Outfit_600SemiBold" }}>Twilio</Text> — for SMS verification (coming soon).{"\n\n"}
          Each third-party service has its own privacy policy which we encourage you to review.
        </Section>

        <Section title="6. Card Images" colors={colors}>
          Photos taken for card scanning are transmitted to our AI service for identification and grading purposes. Images uploaded to marketplace listings are stored on our servers and visible to other users of the app.
        </Section>

        <Section title="7. Your Rights" colors={colors}>
          You have the right to:{"\n\n"}
          • Access the personal data we hold about you{"\n"}
          • Request correction of inaccurate data{"\n"}
          • Request deletion of your data{"\n"}
          • Withdraw consent at any time{"\n\n"}
          To exercise any of these rights, please contact us at pokescantcg@gmail.com.
        </Section>

        <Section title="8. Children's Privacy" colors={colors}>
          PokeScan TCG is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us immediately.
        </Section>

        <Section title="9. Changes to This Policy" colors={colors}>
          We may update this Privacy Policy from time to time. We will notify you of significant changes via email or an in-app notification. Continued use of the app after changes constitutes acceptance of the updated policy.
        </Section>

        <Section title="10. Contact Us" colors={colors}>
          If you have any questions about this Privacy Policy, please contact us at:{"\n\n"}
          Email: pokescantcg@gmail.com
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
