import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  useColorScheme,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/constants/colors";
import { useUser } from "@/lib/user-context";

type Step = "credential" | "channel" | "otp";

function extractErrorMessage(msg: string): string {
  try {
    const jsonStart = msg.indexOf("{");
    if (jsonStart >= 0) {
      const json = JSON.parse(msg.slice(jsonStart));
      return json.error || "";
    }
  } catch {}
  return msg.replace(/^\d+:\s*/, "");
}

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { sendLoginOtp, verifyOtp } = useUser();

  const [step, setStep] = useState<Step>("credential");
  const [credential, setCredential] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<"email" | "sms" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [maskedMobile, setMaskedMobile] = useState("");

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const handleContinue = async () => {
    const cred = credential.trim();
    if (!cred) {
      Alert.alert("Required", "Please enter your email or mobile number.");
      return;
    }
    setIsSubmitting(true);
    try {
      const isEmail = cred.includes("@");
      const channel: "email" | "sms" = isEmail ? "email" : "sms";
      await sendLoginOtp(cred, channel);
      if (isEmail) {
        setMaskedEmail(cred);
        setMaskedMobile("");
      } else {
        setMaskedMobile(cred);
        setMaskedEmail("");
      }
      setSelectedChannel(channel);
      setStep("otp");
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("404")) {
        Alert.alert("Not Found", "No account found with this email or mobile number.");
      } else if (msg.includes("429")) {
        Alert.alert("Slow Down", "Too many requests. Please wait a minute before trying again.");
      } else {
        Alert.alert("Error", "Failed to send code. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      Alert.alert("Invalid Code", "Please enter the 6-digit verification code.");
      return;
    }
    setIsSubmitting(true);
    try {
      await verifyOtp(credential.trim(), otpCode.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = e?.message || "";
      if (msg.includes("429")) {
        Alert.alert("Too Many Attempts", "Please request a new code and try again.");
        setStep("credential");
        setOtpCode("");
      } else if (msg.includes("401")) {
        const parsed = extractErrorMessage(msg);
        Alert.alert("Verification Failed", parsed || "The code is incorrect or has expired.");
      } else {
        Alert.alert("Error", "Login failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!selectedChannel) return;
    setIsResending(true);
    try {
      await sendLoginOtp(credential.trim(), selectedChannel);
      setOtpCode("");
      Alert.alert("Code Sent", "A new verification code has been sent.");
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("429")) {
        Alert.alert("Slow Down", "Please wait a minute before requesting another code.");
      } else {
        Alert.alert("Error", "Failed to resend code. Please try again.");
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleBack = () => {
    if (step === "otp") {
      setStep("credential");
      setOtpCode("");
      setSelectedChannel(null);
    } else {
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.header, { paddingTop: (insets.top || webTopInset) + 4 }]}>
        <Pressable onPress={handleBack} style={styles.closeBtn}>
          <Ionicons name={step === "credential" ? "close" : "arrow-back"} size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <LinearGradient colors={["#CC0000", "#8B0000"]} style={styles.iconCircle}>
            <MaterialCommunityIcons name="pokeball" size={36} color="#FFF" />
          </LinearGradient>

          {step === "credential" && (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Enter your email or mobile number to sign in
              </Text>

              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email or Mobile</Text>
                  <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.pokemonRed + "30" }]}>
                    <Ionicons name="person-outline" size={18} color={colors.pokemonRed} />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Email or mobile number"
                      placeholderTextColor={colors.textMuted}
                      value={credential}
                      onChangeText={setCredential}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      autoFocus
                      testID="login-credential-input"
                    />
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.submitBtn, { opacity: pressed || isSubmitting ? 0.8 : 1 }]}
                  onPress={handleContinue}
                  disabled={isSubmitting}
                  testID="login-continue-btn"
                >
                  <LinearGradient colors={["#CC0000", "#8B0000"]} style={styles.submitBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>Send Code</Text>
                    )}
                  </LinearGradient>
                </Pressable>

                <View style={styles.signupRow}>
                  <Text style={[styles.signupPrompt, { color: colors.textMuted }]}>Don't have an account?</Text>
                  <Pressable onPress={() => router.replace("/register")}>
                    <Text style={[styles.signupLink, { color: colors.pokemonRed }]}>Sign up</Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}

          {step === "otp" && (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Enter Code</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                We sent a 6-digit code to{"\n"}
                <Text style={{ color: colors.pokemonRed, fontFamily: "Outfit_600SemiBold" }}>
                  {selectedChannel === "email" ? maskedEmail : maskedMobile}
                </Text>
              </Text>

              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Verification Code</Text>
                  <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.pokemonRed + "30" }]}>
                    <Ionicons name="keypad-outline" size={18} color={colors.pokemonRed} />
                    <TextInput
                      style={[styles.input, styles.otpInput, { color: colors.text }]}
                      placeholder="000000"
                      placeholderTextColor={colors.textMuted}
                      value={otpCode}
                      onChangeText={(t) => setOtpCode(t.replace(/\D/g, "").slice(0, 6))}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                      testID="login-otp-input"
                    />
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.submitBtn, { opacity: pressed || isSubmitting ? 0.8 : 1 }]}
                  onPress={handleVerify}
                  disabled={isSubmitting}
                  testID="login-verify-btn"
                >
                  <LinearGradient colors={["#CC0000", "#8B0000"]} style={styles.submitBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>Sign In</Text>
                    )}
                  </LinearGradient>
                </Pressable>

                <Pressable
                  style={styles.resendBtn}
                  onPress={handleResend}
                  disabled={isResending || isSubmitting}
                  testID="login-resend-btn"
                >
                  {isResending ? (
                    <ActivityIndicator size="small" color={colors.pokemonRed} />
                  ) : (
                    <Text style={[styles.resendText, { color: colors.pokemonRed }]}>
                      Didn't receive it? Resend code
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  closeBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  content: { paddingHorizontal: 24, alignItems: "center", paddingTop: 24 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 26, fontFamily: "Outfit_700Bold", marginBottom: 4, textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "Outfit_400Regular", textAlign: "center", marginBottom: 28 },
  form: { width: "100%", gap: 16 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 13, fontFamily: "Outfit_500Medium", paddingLeft: 4 },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    gap: 10,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Outfit_400Regular", padding: 0 },
  otpInput: { fontSize: 22, fontFamily: "Outfit_700Bold", letterSpacing: 6 },
  submitBtn: { marginTop: 4 },
  submitBtnGradient: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
  },
  submitBtnText: { fontSize: 16, fontFamily: "Outfit_700Bold", color: "#FFF" },
  resendBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  resendText: { fontSize: 14, fontFamily: "Outfit_500Medium" },
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  signupPrompt: { fontSize: 13, fontFamily: "Outfit_400Regular" },
  signupLink: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
});
