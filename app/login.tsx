import React, { useState, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/constants/colors";
import { useUser } from "@/lib/user-context";

type LoginMode = "password" | "otp";
type OtpChannel = "email" | "sms";
type OtpStep = "input" | "verify";

export default function LoginScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { loginWithPassword, sendLoginOtp, verifyOtp } = useUser();

  const [mode, setMode] = useState<LoginMode>("password");

  // Password mode
  const [credential, setCredential] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // OTP mode
  const [otpChannel, setOtpChannel] = useState<OtpChannel>("email");
  const [otpCredential, setOtpCredential] = useState("");
  const [otpStep, setOtpStep] = useState<OtpStep>("input");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const otpRefs = [
    useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null),
    useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null),
  ];

  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  // ── Password login ──────────────────────────────────────────────────────────
  const handlePasswordLogin = async () => {
    const cred = credential.trim();
    const pass = password.trim();
    if (!cred || !pass) {
      Alert.alert("Missing Fields", "Please enter your email/username and password.");
      return;
    }
    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await loginWithPassword(cred, pass);
      router.back();
    } catch (err: any) {
      const msg = err?.message || "Login failed";
      Alert.alert("Login Failed", msg.replace(/^Error:\s*/i, "").replace(/\{.*\}/s, "").trim() || msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Send OTP ────────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    const cred = otpCredential.trim();
    if (!cred) {
      Alert.alert("Missing Field", otpChannel === "email" ? "Please enter your email address." : "Please enter your mobile number.");
      return;
    }
    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await sendLoginOtp(cred, otpChannel);
      setOtpStep("verify");
      setOtpDigits(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs[0].current?.focus(), 200);
    } catch (err: any) {
      const msg = err?.message || "Failed to send code";
      Alert.alert("Send Failed", msg.replace(/^Error:\s*/i, "").replace(/\{.*\}/s, "").trim() || msg);
    } finally {
      setLoading(false);
    }
  };

  // ── OTP digit entry ─────────────────────────────────────────────────────────
  const handleDigitChange = (val: string, idx: number) => {
    const digit = val.replace(/[^0-9]/g, "").slice(-1);
    const updated = [...otpDigits];
    updated[idx] = digit;
    setOtpDigits(updated);
    if (digit && idx < 5) otpRefs[idx + 1].current?.focus();
    if (updated.every((d) => d !== "")) handleVerifyOtp(updated.join(""));
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === "Backspace" && !otpDigits[idx] && idx > 0) {
      otpRefs[idx - 1].current?.focus();
    }
  };

  const handleVerifyOtp = async (code?: string) => {
    const finalCode = code ?? otpDigits.join("");
    if (finalCode.length < 6) {
      Alert.alert("Incomplete Code", "Please enter all 6 digits.");
      return;
    }
    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await verifyOtp(otpCredential.trim(), finalCode);
      router.back();
    } catch (err: any) {
      const msg = err?.message || "Invalid or expired code";
      Alert.alert("Verification Failed", msg.replace(/^Error:\s*/i, "").replace(/\{.*\}/s, "").trim() || msg);
      setOtpDigits(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const resetOtp = () => {
    setOtpStep("input");
    setOtpDigits(["", "", "", "", "", ""]);
    setOtpCredential("");
  };

  const switchMode = (newMode: LoginMode) => {
    setMode(newMode);
    resetOtp();
    setCredential("");
    setPassword("");
  };

  const switchChannel = (ch: OtpChannel) => {
    setOtpChannel(ch);
    setOtpCredential("");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient colors={["#1A0A0A", "#0D0D1A"]} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: topPad + 24, paddingBottom: botPad + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
            <Text style={[styles.backText, { color: colors.textMuted }]}>Back</Text>
          </Pressable>

          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoEmoji}>⚡</Text>
            </View>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Welcome back</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Sign in to your PokéScan account</Text>

          {/* Top mode toggle: Password / Code */}
          <View style={[styles.toggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable
              style={[styles.toggleBtn, mode === "password" && { backgroundColor: colors.pokemonRed }]}
              onPress={() => switchMode("password")}
            >
              <Ionicons name="lock-closed-outline" size={15} color={mode === "password" ? "#FFF" : colors.textMuted} />
              <Text style={[styles.toggleText, { color: mode === "password" ? "#FFF" : colors.textMuted }]}>Password</Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, mode === "otp" && { backgroundColor: colors.pokemonRed }]}
              onPress={() => switchMode("otp")}
            >
              <Ionicons name="keypad-outline" size={15} color={mode === "otp" ? "#FFF" : colors.textMuted} />
              <Text style={[styles.toggleText, { color: mode === "otp" ? "#FFF" : colors.textMuted }]}>Send Code</Text>
            </Pressable>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

            {/* ── PASSWORD MODE ─────────────────────────────────────────── */}
            {mode === "password" && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Email or Username</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={credential}
                    onChangeText={setCredential}
                    placeholder="Enter email or username"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="next"
                  />
                </View>

                <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handlePasswordLogin}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
                  </Pressable>
                </View>

                <Pressable style={[styles.actionBtn, loading && styles.btnDisabled]} onPress={handlePasswordLogin} disabled={loading}>
                  {loading ? <ActivityIndicator color="#FFF" size="small" /> : (
                    <>
                      <Ionicons name="log-in-outline" size={20} color="#FFF" />
                      <Text style={styles.actionBtnText}>Sign In</Text>
                    </>
                  )}
                </Pressable>
              </>
            )}

            {/* ── OTP STEP 1: channel + credential input ─────────────────── */}
            {mode === "otp" && otpStep === "input" && (
              <>
                {/* Channel sub-toggle: Email / SMS */}
                <View style={[styles.channelToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Pressable
                    style={[styles.channelBtn, otpChannel === "email" && { backgroundColor: colors.pokemonBlue }]}
                    onPress={() => switchChannel("email")}
                  >
                    <Ionicons name="mail-outline" size={14} color={otpChannel === "email" ? "#FFF" : colors.textMuted} />
                    <Text style={[styles.channelText, { color: otpChannel === "email" ? "#FFF" : colors.textMuted }]}>Email</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.channelBtn, otpChannel === "sms" && { backgroundColor: colors.pokemonBlue }]}
                    onPress={() => switchChannel("sms")}
                  >
                    <Ionicons name="phone-portrait-outline" size={14} color={otpChannel === "sms" ? "#FFF" : colors.textMuted} />
                    <Text style={[styles.channelText, { color: otpChannel === "sms" ? "#FFF" : colors.textMuted }]}>SMS</Text>
                  </Pressable>
                </View>

                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {otpChannel === "email" ? "Email Address" : "Mobile Number"}
                </Text>
                <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons
                    name={otpChannel === "email" ? "mail-outline" : "call-outline"}
                    size={18} color={colors.textMuted} style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={otpCredential}
                    onChangeText={setOtpCredential}
                    placeholder={otpChannel === "email" ? "your@email.com" : "+447700900123"}
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    keyboardType={otpChannel === "email" ? "email-address" : "phone-pad"}
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSendOtp}
                  />
                </View>

                <Text style={[styles.hint, { color: colors.textMuted }]}>
                  {otpChannel === "email"
                    ? "A 6-digit code will be sent to your email."
                    : "A 6-digit code will be sent to your mobile via SMS."}
                </Text>

                <Pressable style={[styles.actionBtn, loading && styles.btnDisabled]} onPress={handleSendOtp} disabled={loading}>
                  {loading ? <ActivityIndicator color="#FFF" size="small" /> : (
                    <>
                      <Ionicons name={otpChannel === "email" ? "mail-outline" : "phone-portrait-outline"} size={20} color="#FFF" />
                      <Text style={styles.actionBtnText}>Send Code</Text>
                    </>
                  )}
                </Pressable>
              </>
            )}

            {/* ── OTP STEP 2: enter the code ─────────────────────────────── */}
            {mode === "otp" && otpStep === "verify" && (
              <>
                <View style={styles.otpHeader}>
                  <Ionicons
                    name={otpChannel === "email" ? "mail-open-outline" : "chatbubble-ellipses-outline"}
                    size={30} color={colors.pokemonRed}
                  />
                  <Text style={[styles.otpTitle, { color: colors.text }]}>Enter your code</Text>
                  <Text style={[styles.otpSubtitle, { color: colors.textMuted }]}>
                    {otpChannel === "email" ? "Sent to your email" : "Sent via SMS to"}{"\n"}
                    <Text style={{ color: colors.text, fontFamily: "Outfit_600SemiBold" }}>{otpCredential}</Text>
                  </Text>
                </View>

                <View style={styles.digitRow}>
                  {otpDigits.map((digit, idx) => (
                    <TextInput
                      key={idx}
                      ref={otpRefs[idx]}
                      style={[
                        styles.digitBox,
                        {
                          backgroundColor: colors.surface,
                          borderColor: digit ? colors.pokemonRed : colors.border,
                          color: colors.text,
                        },
                      ]}
                      value={digit}
                      onChangeText={(val) => handleDigitChange(val, idx)}
                      onKeyPress={(e) => handleKeyPress(e, idx)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                    />
                  ))}
                </View>

                <Pressable
                  style={[styles.actionBtn, { marginTop: 20 }, (loading || otpDigits.some((d) => !d)) && styles.btnDisabled]}
                  onPress={() => handleVerifyOtp()}
                  disabled={loading || otpDigits.some((d) => !d)}
                >
                  {loading ? <ActivityIndicator color="#FFF" size="small" /> : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                      <Text style={styles.actionBtnText}>Verify & Sign In</Text>
                    </>
                  )}
                </Pressable>

                <Pressable onPress={resetOtp} style={styles.resendBtn}>
                  <Text style={[styles.resendText, { color: colors.textMuted }]}>Didn't get it? </Text>
                  <Text style={[styles.resendLink, { color: colors.pokemonRed }]}>Send again</Text>
                </Pressable>
              </>
            )}
          </View>

          <View style={styles.registerRow}>
            <Text style={[styles.registerText, { color: colors.textMuted }]}>Don't have an account?</Text>
            <Pressable onPress={() => { router.back(); router.push("/register"); }}>
              <Text style={styles.registerLink}> Create one</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 20 },
  backBtn: { flexDirection: "row", alignItems: "center", marginBottom: 32, gap: 2 },
  backText: { fontSize: 15, fontFamily: "Outfit_400Regular" },
  logoRow: { alignItems: "center", marginBottom: 28 },
  logoBadge: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: "#CC0000",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#CC0000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  logoEmoji: { fontSize: 36 },
  title: { fontSize: 28, fontFamily: "Outfit_700Bold", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 15, fontFamily: "Outfit_400Regular", textAlign: "center", marginBottom: 20 },
  toggle: {
    flexDirection: "row", borderRadius: 14, borderWidth: 1,
    padding: 4, marginBottom: 20, gap: 4,
  },
  toggleBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  toggleText: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  channelToggle: {
    flexDirection: "row", borderRadius: 10, borderWidth: 1,
    padding: 3, marginBottom: 18, gap: 3,
  },
  channelBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 8, borderRadius: 8,
  },
  channelText: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  card: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 24 },
  label: { fontSize: 12, fontFamily: "Outfit_600SemiBold", letterSpacing: 0.5, marginBottom: 8 },
  inputWrap: {
    flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, height: 50, marginBottom: 18,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, fontFamily: "Outfit_400Regular" },
  eyeBtn: { padding: 4 },
  hint: { fontSize: 13, fontFamily: "Outfit_400Regular", lineHeight: 18, marginBottom: 18, marginTop: -8 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    height: 52, borderRadius: 14, backgroundColor: "#CC0000",
    shadowColor: "#CC0000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { opacity: 0.6 },
  actionBtnText: { fontSize: 17, fontFamily: "Outfit_700Bold", color: "#FFF" },
  otpHeader: { alignItems: "center", marginBottom: 20, gap: 6 },
  otpTitle: { fontSize: 20, fontFamily: "Outfit_700Bold", marginTop: 4 },
  otpSubtitle: { fontSize: 14, fontFamily: "Outfit_400Regular", textAlign: "center", lineHeight: 20 },
  digitRow: { flexDirection: "row", justifyContent: "center", gap: 10 },
  digitBox: {
    width: 44, height: 54, borderRadius: 12, borderWidth: 2,
    textAlign: "center", fontSize: 22, fontFamily: "Outfit_700Bold",
  },
  resendBtn: { flexDirection: "row", justifyContent: "center", marginTop: 16 },
  resendText: { fontSize: 14, fontFamily: "Outfit_400Regular" },
  resendLink: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  registerRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  registerText: { fontSize: 14, fontFamily: "Outfit_400Regular" },
  registerLink: { fontSize: 14, fontFamily: "Outfit_600SemiBold", color: "#FFDE00" },
});
