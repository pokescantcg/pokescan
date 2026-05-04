import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/constants/colors";
import { verifyEmailOtp } from "@/lib/storage";
import { getApiUrl } from "@/lib/query-client";
import { useUser } from "@/lib/user-context";

const CODE_LENGTH = 6;

export default function VerifyEmailScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(""));
  const [justVerified, setJustVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (justVerified && user && user.id) {
      router.replace("/(tabs)");
    }
  }, [justVerified, user]);

  const inputRefs = useRef<Array<TextInput | null>>(Array(CODE_LENGTH).fill(null));

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleDigitChange = (text: string, index: number) => {
    const char = text.replace(/[^0-9]/g, "").slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    if (char && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (next.every((d) => d !== "")) {
      handleVerify(next.join(""));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (codeOverride?: string) => {
    const code = codeOverride ?? digits.join("");
    if (code.length < CODE_LENGTH) {
      Alert.alert("Incomplete Code", "Please enter all 6 digits.");
      return;
    }
    if (!email) {
      Alert.alert("Error", "Email address missing. Please register again.");
      return;
    }
    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await verifyEmailOtp(email, code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setJustVerified(true);
    } catch (err: any) {
      const msg = err?.message || "Verification failed";
      Alert.alert("Verification Failed", msg);
      setDigits(Array(CODE_LENGTH).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending || !email) return;
    try {
      setResending(true);
      const url = new URL("/api/auth/resend-email-verification", getApiUrl());
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        console.warn("Invalid JSON response");
      }
      if (!res.ok) throw new Error(data.error || "Failed to resend");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Code Sent", "A new verification code has been sent to your email.");
      setCooldown(60);
      setDigits(Array(CODE_LENGTH).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + "*".repeat(Math.min(b.length, 4)) + c)
    : "";

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const codeComplete = digits.every((d) => d !== "");

  return (
    <View style={{ flex: 1, backgroundColor: "#0D0D1A" }}>
      <LinearGradient colors={["#1A0A0A", "#0D0D1A"]} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: topPad + 24, paddingBottom: botPad + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.iconRow}>
            <View style={styles.iconBadge}>
              <Ionicons name="mail-unread-outline" size={32} color="#FFDE00" />
            </View>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Check Your Email</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            We've sent a 6-digit verification code to
          </Text>
          <Text style={[styles.emailText, { color: colors.text }]}>{maskedEmail}</Text>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>VERIFICATION CODE</Text>

            <View style={styles.codeRow}>
              {digits.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(r) => { inputRefs.current[i] = r; }}
                  style={[
                    styles.digitInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: digit ? "#CC0000" : colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={digit}
                  onChangeText={(t) => handleDigitChange(t, i)}
                  onKeyPress={(e) => handleKeyPress(e, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  selectTextOnFocus
                  editable={!loading}
                />
              ))}
            </View>

            <Pressable
              style={[styles.verifyBtn, (!codeComplete || loading) && styles.btnDisabled]}
              onPress={() => handleVerify()}
              disabled={!codeComplete || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                  <Text style={styles.verifyBtnText}>Verify Email</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={[styles.resendBtn, (cooldown > 0 || resending) && styles.btnDisabled]}
              onPress={handleResend}
              disabled={cooldown > 0 || resending}
            >
              {resending ? (
                <ActivityIndicator color={colors.textMuted} size="small" />
              ) : (
                <Text style={[styles.resendText, { color: cooldown > 0 ? colors.textMuted : "#FFDE00" }]}>
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                </Text>
              )}
            </Pressable>
          </View>

          <View style={styles.noteRow}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.noteText, { color: colors.textMuted }]}>
              Check your spam folder if you don't see it.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  iconRow: {
    marginBottom: 28,
    marginTop: 16,
  },
  iconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(204,0,0,0.15)",
    borderWidth: 1,
    borderColor: "rgba(204,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontFamily: "Outfit_700Bold",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  emailText: {
    fontSize: 16,
    fontFamily: "Outfit_600SemiBold",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 32,
  },
  card: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    marginBottom: 20,
    alignItems: "center",
  },
  label: {
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
    letterSpacing: 1,
    marginBottom: 20,
  },
  codeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  digitInput: {
    width: 46,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 22,
    fontFamily: "Outfit_700Bold",
  },
  verifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    height: 52,
    borderRadius: 14,
    backgroundColor: "#CC0000",
    marginBottom: 16,
    shadowColor: "#CC0000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  verifyBtnText: {
    fontSize: 17,
    fontFamily: "Outfit_700Bold",
    color: "#FFF",
  },
  resendBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  resendText: {
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
  },
  noteText: {
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    flex: 1,
  },
});
