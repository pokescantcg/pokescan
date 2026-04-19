/**
 * PokeScan Premium — Subscription Checkout Screen
 *
 * Plans:
 *   Monthly  £4.99 / month
 *   Annual   £39.99 / year  (~33% saving = ~£3.33/mo)
 *
 * Flow:
 *   1. User picks a plan
 *   2. App calls POST /api/stripe/create-checkout with the Stripe Price ID
 *   3. Server creates a Stripe Checkout Session and returns the URL
 *   4. App opens the URL in the system browser (WebBrowser.openAuthSessionAsync)
 *   5. On return, app calls POST /api/stripe/sync to refresh premium status
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useThemeColors } from "@/constants/colors";
import { useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { getApiUrl } from "@/lib/query-client";
import { getSessionToken } from "@/lib/storage";
import { fetch } from "expo/fetch";
import { useUser } from "@/lib/user-context";

// ─── Stripe Price IDs ─────────────────────────────────────────────────────────
// Stripe Price IDs for PokeScan Premium recurring plans
const STRIPE_PRICE_MONTHLY = "price_1TM7D8K7N6BNdayAPnuINUuU";
const STRIPE_PRICE_ANNUAL  = "price_1TM7D8K7N6BNdayAB1PFakyH";

// ─── Feature list ─────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: "storefront-outline",    label: "Full Marketplace access — buy, sell, trade" },
  { icon: "albums-outline",        label: "Unlimited collection management" },
  { icon: "robot-outline",         label: "AI Card Grader (PSA-style grading)", premium: true },
  { icon: "chatbubbles-outline",   label: "Direct messaging with other collectors" },
  { icon: "people-outline",        label: "Friends system & social features" },
  { icon: "camera-outline",        label: "Advanced card scanner with price lookup" },
  { icon: "person-circle-outline", label: "Custom profile picture upload" },
  { icon: "pricetag-outline",      label: "Real-time GBP pricing on every card" },
] as const;

type Plan = "monthly" | "annual";

export default function PremiumScreen() {
  const colorScheme   = useColorScheme() ?? "dark";
  const colors        = useThemeColors(colorScheme);
  const insets        = useSafeAreaInsets();
  const { user, refreshData } = useUser();
  const [plan, setPlan]       = useState<Plan>("annual");
  const [loading, setLoading] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBotInset = Platform.OS === "web" ? 34 : 0;

  const handleSubscribe = useCallback(async () => {
    if (!user) {
      Alert.alert("Sign in required", "Please log in to subscribe to PokeScan Premium.");
      return;
    }

    setLoading(true);
    try {
      const token = await getSessionToken();
      if (!token) throw new Error("No session token found. Please log in again.");

      const priceId      = plan === "monthly" ? STRIPE_PRICE_MONTHLY : STRIPE_PRICE_ANNUAL;
      const domain       = getApiUrl();
      const successUrl   = `${domain}/api/stripe/success?plan=${plan}`;
      // Use the same /api/stripe/success path with a canceled flag so the in-app
      // browser detects the redirect and dismisses cleanly (same prefix as redirect URL).
      const cancelUrl    = `${domain}/api/stripe/success?canceled=1`;

      const checkoutUrl = new URL("/api/stripe/create-checkout", domain).href;
      const res = await fetch(checkoutUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ priceId, successUrl, cancelUrl }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);

      if (!data.url) throw new Error(data.error ?? "Checkout URL not returned");

      // Open Stripe Checkout in in-app browser. Both success and cancel
      // redirects share the /api/stripe/success prefix so the browser closes
      // cleanly without showing a 404/white screen on cancel.
      const result = await WebBrowser.openAuthSessionAsync(data.url, successUrl);

      // Detect a user-initiated cancel: Stripe redirected to ?canceled=1, or
      // the user dismissed the in-app browser themselves.
      const wasCanceled =
        (result.type === "success" && result.url?.includes("canceled=1")) ||
        result.type === "cancel" ||
        result.type === "dismiss";

      if (wasCanceled) {
        // Return to profile so we don't leave the user on a stale checkout screen.
        router.replace("/(tabs)/profile");
        return;
      }

      if (result.type === "success") {
        // Sync subscription status — user may have completed payment
        try {
          const { apiRequest } = await import("@/lib/query-client");
          await apiRequest("POST", "/api/stripe/sync", {});
          await refreshData();
        } catch { /* ignore sync errors — user can re-open the screen */ }

        const freshUser = user; // refreshed via context
        if (freshUser?.isPremium) {
          Alert.alert("Welcome to Premium! 🎉", "Your PokeScan Premium subscription is now active.", [
            { text: "Let's go!", onPress: () => router.back() },
          ]);
        } else {
          // Payment may still be processing
          Alert.alert(
            "Almost there!",
            "Payment is being processed. Your Premium features will unlock shortly — tap Refresh on your profile if they haven't appeared yet."
          );
        }
      }
    } catch (err: any) {
      Alert.alert("Payment Error", err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user, plan, refreshData]);

  const handleManageSubscription = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getSessionToken();
      if (!token) throw new Error("No session token found. Please log in again.");
      const domain = getApiUrl();
      const portalUrl = new URL("/api/stripe/portal", domain).href;
      const portalRes = await fetch(portalUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ returnUrl: domain }),
      });
      const data = await portalRes.json() as { url?: string; error?: string };
      if (!portalRes.ok) throw new Error(data.error ?? `Error ${portalRes.status}`);
      if (!data.url) throw new Error(data.error ?? "Portal URL not returned");
      await WebBrowser.openBrowserAsync(data.url);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not open billing portal");
    } finally {
      setLoading(false);
    }
  }, []);

  if (user?.isPremium) {
    return (
      <ActivePremiumScreen
        colors={colors}
        insets={insets}
        webTopInset={webTopInset}
        webBotInset={webBotInset}
        onManage={handleManageSubscription}
        loading={loading}
        subscriptionStatus={user.subscriptionStatus ?? null}
        subscriptionPeriodEnd={user.subscriptionPeriodEnd ?? null}
      />
    );
  }

  const monthlyPrice = "£4.99";
  const annualPrice  = "£49.99";
  const annualMonthly = "£4.17";
  const annualSaving  = "Save 17%";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={["#CC0000", "#880000"]}
        style={[styles.header, { paddingTop: (insets.top || webTopInset) + 12 }]}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons name="star-circle" size={36} color="#FFDE00" />
          <Text style={styles.headerTitle}>PokeScan Premium</Text>
          <Text style={styles.headerSub}>Unlock the full PokéDex experience</Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: (insets.bottom || webBotInset) + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Plan Selector */}
        <View style={styles.plansRow}>
          {/* Monthly */}
          <Pressable
            style={[
              styles.planCard,
              { backgroundColor: colors.card, borderColor: plan === "monthly" ? colors.pokemonRed : colors.borderLight },
              plan === "monthly" && styles.planCardSelected,
            ]}
            onPress={() => setPlan("monthly")}
          >
            <Text style={[styles.planLabel, { color: colors.textSecondary }]}>Monthly</Text>
            <Text style={[styles.planPrice, { color: colors.text }]}>{monthlyPrice}</Text>
            <Text style={[styles.planPer, { color: colors.textMuted }]}>per month</Text>
          </Pressable>

          {/* Annual — highlighted */}
          <Pressable
            style={[
              styles.planCard,
              { backgroundColor: colors.card, borderColor: plan === "annual" ? colors.pokemonRed : colors.borderLight },
              plan === "annual" && styles.planCardSelected,
            ]}
            onPress={() => setPlan("annual")}
          >
            <View style={[styles.saveBadge, { backgroundColor: colors.pokemonRed }]}>
              <Text style={styles.saveBadgeText}>{annualSaving}</Text>
            </View>
            <Text style={[styles.planLabel, { color: colors.textSecondary }]}>Annual</Text>
            <Text style={[styles.planPrice, { color: colors.text }]}>{annualPrice}</Text>
            <Text style={[styles.planPer, { color: colors.textMuted }]}>per year</Text>
            <Text style={[styles.planNote, { color: colors.pokemonRed }]}>
              Just {annualMonthly}/mo
            </Text>
          </Pressable>
        </View>

        {/* CTA Button */}
        <Pressable
          style={({ pressed }) => [
            styles.ctaBtn,
            { opacity: pressed || loading ? 0.85 : 1 },
          ]}
          onPress={handleSubscribe}
          disabled={loading}
        >
          <LinearGradient colors={["#CC0000", "#990000"]} style={styles.ctaGradient}>
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="star" size={20} color="#FFDE00" />
                <Text style={styles.ctaBtnText}>
                  {plan === "monthly"
                    ? `Subscribe — ${monthlyPrice}/month`
                    : `Subscribe — ${annualPrice}/year`}
                </Text>
              </>
            )}
          </LinearGradient>
        </Pressable>

        <Text style={[styles.secureNote, { color: colors.textMuted }]}>
          🔒 Secure payment via Stripe · Cancel anytime
        </Text>

        {/* Features */}
        <View style={[styles.featuresCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <Text style={[styles.featuresTitle, { color: colors.text }]}>Everything included</Text>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <View style={[styles.featureIconBg, { backgroundColor: colors.pokemonRed + "20" }]}>
                <Ionicons name={f.icon as any} size={18} color={colors.pokemonRed} />
              </View>
              <Text style={[styles.featureText, { color: colors.textSecondary }]} numberOfLines={2}>
                {f.label}
              </Text>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            </View>
          ))}
        </View>

        {/* Fine print */}
        <Text style={[styles.finePrint, { color: colors.textMuted }]}>
          Subscriptions renew automatically. Cancel at any time through Stripe's billing portal.
          Prices shown in GBP. By subscribing you agree to our Terms of Service.
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── Active Premium view ───────────────────────────────────────────────────────

function ActivePremiumScreen({
  colors,
  insets,
  webTopInset,
  webBotInset,
  onManage,
  loading,
  subscriptionStatus,
  subscriptionPeriodEnd,
}: {
  colors: ReturnType<typeof useThemeColors>;
  insets: ReturnType<typeof useSafeAreaInsets>;
  webTopInset: number;
  webBotInset: number;
  onManage: () => void;
  loading: boolean;
  subscriptionStatus: string | null;
  subscriptionPeriodEnd: string | null;
}) {
  const isCanceling = subscriptionStatus === "canceling";
  const periodEndDate = subscriptionPeriodEnd ? new Date(subscriptionPeriodEnd) : null;
  const formattedEnd = periodEndDate
    ? periodEndDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#CC0000", "#880000"]}
        style={[styles.header, { paddingTop: (insets.top || webTopInset) + 12 }]}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        <View style={styles.headerCenter}>
          <MaterialCommunityIcons name="star-circle" size={36} color="#FFDE00" />
          <Text style={styles.headerTitle}>{isCanceling ? "Premium Cancelling" : "Premium Active"}</Text>
          <Text style={styles.headerSub}>
            {isCanceling && formattedEnd
              ? `Access until ${formattedEnd}`
              : "You have full access to all features"}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: (insets.bottom || webBotInset) + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {isCanceling && formattedEnd && (
          <View style={{
            backgroundColor: "#FF6B0020",
            borderColor: "#FF6B00",
            borderWidth: 1,
            borderRadius: 12,
            padding: 16,
            marginHorizontal: 20,
            marginTop: 16,
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 12,
          }}>
            <Ionicons name="time-outline" size={22} color="#FF6B00" style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Outfit_700Bold", fontSize: 14, color: "#FF6B00", marginBottom: 4 }}>
                Subscription Cancelled
              </Text>
              <Text style={{ fontFamily: "Outfit_400Regular", fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
                Your premium access remains active until{" "}
                <Text style={{ fontFamily: "Outfit_700Bold", color: colors.text }}>{formattedEnd}</Text>
                . After that date your account will revert to the free plan.
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.activeCard, { backgroundColor: colors.card, borderColor: isCanceling ? "#FF6B0060" : "#FFDE0060" }]}>
          <MaterialCommunityIcons name="crown" size={48} color={isCanceling ? "#FF6B00" : "#FFDE00"} />
          <Text style={[styles.activeTitle, { color: colors.text }]}>
            {isCanceling ? "Still enjoying Premium" : "You're a Premium member!"}
          </Text>
          <Text style={[styles.activeSub, { color: colors.textSecondary }]}>
            {isCanceling && formattedEnd
              ? `All features unlocked until ${formattedEnd}.`
              : "All features are unlocked. Enjoy the full PokeScan experience."}
          </Text>
        </View>

        <View style={[styles.featuresCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <Text style={[styles.featuresTitle, { color: colors.text }]}>Your Premium perks</Text>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <View style={[styles.featureIconBg, { backgroundColor: colors.pokemonRed + "20" }]}>
                <Ionicons name={f.icon as any} size={18} color={colors.pokemonRed} />
              </View>
              <Text style={[styles.featureText, { color: colors.textSecondary }]} numberOfLines={2}>
                {f.label}
              </Text>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            </View>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.manageBtn, { backgroundColor: colors.surfaceElevated, opacity: pressed ? 0.8 : 1 }]}
          onPress={onManage}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.textSecondary} />
          ) : (
            <>
              <Ionicons name="card-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.manageBtnText, { color: colors.textSecondary }]}>Manage Subscription</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  headerCenter: { alignItems: "center", gap: 6 },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Outfit_700Bold",
    color: "#FFF",
  },
  headerSub: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
  },

  scroll: { padding: 16, gap: 14 },

  plansRow: { flexDirection: "row", gap: 12 },
  planCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    alignItems: "center",
    gap: 4,
    position: "relative",
  },
  planCardSelected: {
    shadowColor: "#CC0000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBadge: {
    position: "absolute",
    top: -10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  saveBadgeText: { fontSize: 10, fontFamily: "Outfit_700Bold", color: "#FFF" },
  planLabel: { fontSize: 12, fontFamily: "Outfit_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  planPrice: { fontSize: 28, fontFamily: "Outfit_700Bold" },
  planPer:   { fontSize: 12, fontFamily: "Outfit_400Regular" },
  planNote:  { fontSize: 12, fontFamily: "Outfit_700Bold", marginTop: 2 },

  ctaBtn: { borderRadius: 16, overflow: "hidden" },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  ctaBtnText: { fontSize: 17, fontFamily: "Outfit_700Bold", color: "#FFF" },

  secureNote: { textAlign: "center", fontSize: 12, fontFamily: "Outfit_400Regular" },

  featuresCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  featuresTitle: { fontSize: 16, fontFamily: "Outfit_700Bold", marginBottom: 4 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  featureText: { flex: 1, fontSize: 13, fontFamily: "Outfit_500Medium", lineHeight: 18 },

  finePrint: { fontSize: 11, fontFamily: "Outfit_400Regular", textAlign: "center", lineHeight: 16 },

  activeCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  activeTitle: { fontSize: 22, fontFamily: "Outfit_700Bold", textAlign: "center" },
  activeSub:   { fontSize: 14, fontFamily: "Outfit_400Regular", textAlign: "center" },

  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    gap: 10,
  },
  manageBtnText: { flex: 1, fontSize: 15, fontFamily: "Outfit_600SemiBold" },
});
