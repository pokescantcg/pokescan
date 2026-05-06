import React, { useState, useRef, useEffect } from "react";
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
import { verifyPasswordOnly } from "@/lib/storage";

type Step = "password" | "channel" | "code";
type OtpChannel = "email" | "sms";

interface ChannelInfo {
  hasEmail: boolean;
  hasMobile: boolean;
  maskedEmail: string | null;
  maskedMobile: string | null;
  emailCredential: string | null;
  mobileCredential: string | null;
}

export default function LoginScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { sendLoginOtp, verifyOtp, user } = useUser();

  const [step, setStep] = useState<Step>("password");
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  // Step 1 — password
  const [credential, setCredential] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 2 — channel picker (populated after password verified)
  const [channelInfo, setChannelInfo] = useState<ChannelInfo | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<OtpChannel>("email");
  const [otpCredential, setOtpCredential] = useState("");

  // Step 3 — OTP entry
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const otpRefs = [
    useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null),
    useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null),
  ];

  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    if (justLoggedIn && user && user.id) {
      router.replace("/(tabs)");
    }
  }, [justLoggedIn, user]);

  // ── Step 1: verify password ────────────────────────────────────────────────
  const handleVerifyPassword = async () => {
    const cred = credential.trim();
    const pass = password.trim();
    if (!cred || !pass) {
      Alert.alert("Missing Fields", "Please enter your email/username and password.");
      return;
    }
    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const info = await verifyPasswordOnly(cred, pass);
      setChannelInfo(info);
      // Pre-select a channel based on what the user has
      if (info.hasEmail) {
        setSelectedChannel("email");
        setOtpCredential(info.emailCredential || "");
      } else if (info.hasMobile) {
        setSelectedChannel("sms");
        setOtpCredential(info.mobileCredential || "");
      }
      setStep("channel");
    } catch (err: any) {
      const msg = err?.message || "Login failed";
      Alert.alert("Login Failed", msg.replace(/^Error:\s*/i, "").replace(/\{.*\}/s, "").trim() || msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: send OTP to chosen channel ────────────────────────────────────
  const handleSendOtp = async () => {
    const cred = otpCredential.trim();
    if (!cred) return;
    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await sendLoginOtp(cred, selectedChannel);
      setOtpDigits(["", "", "", "", "", ""]);
      setStep("code");
      setTimeout(() => otpRefs[0].current?.focus(), 200);
    } catch (err: any) {
      const msg = err?.message || "Failed to send code";
      Alert.alert("Send Failed", msg.replace(/^Error:\s*/i, "").replace(/\{.*\}/s, "").trim() || msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChannel = (ch: OtpChannel) => {
    setSelectedChannel(ch);
    if (ch === "email") setOtpCredential(channelInfo?.emailCredential || "");
    else setOtpCredential(channelInfo?.mobileCredential || "");
  };

  // ── Step 3: verify OTP and complete login ─────────────────────────────────
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
      setJustLoggedIn(true);
    } catch (err: any) {
      const msg = err?.message || "Invalid or expired code";
      Alert.alert("Verification Failed", msg.replace(/^Error:\s*/i, "").replace(/\{.*\}/s, "").trim() || msg);
      setOtpDigits(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const resetToPassword = () => {
    setStep("password");
    setChannelInfo(null);
    setOtpDigits(["", "", "", "", "", ""]);
    setOtpCredential("");
  };

  const displayCredential = selectedChannel === "email"
    ? channelInfo?.maskedEmail
    : channelInfo?.maskedMobile;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient colors={["#1A0A0A", "#0D0D1A"]} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: topPad + 24, paddingBottom: botPad + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            onPress={step === "password" ? () => router.back() : resetToPassword}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
            <Text style={[styles.backText, { color: colors.textMuted }]}>
              {step === "password" ? "Back" : "Start over"}
            </Text>
          </Pressable>

          <View style={styles.logoRow}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoEmoji}>⚡</Text>
            </View>
          </View>

          {/* ── STEP 1: Password ───────────────────────────────────────────── */}
          {step === "password" && (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Welcome back</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>Sign in to your PokéScan account</Text>

              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                    onSubmitEditing={handleVerifyPassword}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
                  </Pressable>
                </View>

                <Pressable style={[styles.actionBtn, loading && styles.btnDisabled]} onPress={handleVerifyPassword} disabled={loading}>
                  {loading ? <ActivityIndicator color="#FFF" size="small" /> : (
                    <>
                      <Ionicons name="arrow-forward-outline" size={20} color="#FFF" />
                      <Text style={styles.actionBtnText}>Continue</Text>
                    </>
                  )}
                </Pressable>
              </View>

              <View style={styles.registerRow}>
                <Text style={[styles.registerText, { color: colors.textMuted }]}>Don't have an account?</Text>
                <Pressable onPress={() => { router.back(); router.push("/register"); }}>
                  <Text style={styles.registerLink}> Create one</Text>
                </Pressable>
              </View>
            </>
          )}

          {/* ── STEP 2: Choose channel ─────────────────────────────────────── */}
          {step === "channel" && channelInfo && (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Verify it's you</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                Choose how to receive your one-time code
              </Text>

              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {channelInfo.hasEmail && (
                  <Pressable
                    onPress={() => handleSelectChannel("email")}
                    style={[
                      styles.channelOption,
                      {
                        borderColor: selectedChannel === "email" ? colors.pokemonRed : colors.border,
                        backgroundColor: selectedChannel === "email"
                          ? (colors.pokemonRed + "18")
                          : colors.surface,
                      },
                    ]}
                  >
                    <View style={[styles.channelIcon, { backgroundColor: selectedChannel === "email" ? colors.pokemonRed : colors.border }]}>
                      <Ionicons name="mail-outline" size={20} color="#FFF" />
                    </View>
                    <View style={styles.channelText}>
                      <Text style={[styles.channelTitle, { color: colors.text }]}>Email</Text>
                      <Text style={[styles.channelSub, { color: colors.textMuted }]}>{channelInfo.maskedEmail}</Text>
                    </View>
                    {selectedChannel === "email" && (
                      <Ionicons name="checkmark-circle" size={22} color={colors.pokemonRed} />
                    )}
                  </Pressable>
                )}

                {channelInfo.hasMobile && (
                  <View
                    style={[
                      styles.channelOption,
                      {
                        borderColor: colors.borderLight,
                        backgroundColor: colors.surface,
                        marginTop: channelInfo.hasEmail ? 12 : 0,
                        opacity: 0.6,
                      },
                    ]}
                  >
                    <View style={[styles.channelIcon, { backgroundColor: colors.border }]}>
                      <Ionicons name="phone-portrait-outline" size={20} color="#FFF" />
                    </View>
                    <View style={styles.channelText}>
                      <Text style={[styles.channelTitle, { color: colors.text }]}>SMS</Text>
                      <Text style={[styles.channelSub, { color: colors.textMuted }]}>{channelInfo.maskedMobile}</Text>
                    </View>
                    <View style={[styles.comingSoonBadge, { backgroundColor: colors.pokemonYellow + "30", borderColor: colors.pokemonYellow + "60" }]}>
                      <Text style={[styles.comingSoonText, { color: colors.pokemonYellow }]}>Soon</Text>
                    </View>
                  </View>
                )}

                {!channelInfo.hasEmail && !channelInfo.hasMobile && (
                  <Text style={[styles.noContactNote, { color: colors.textMuted }]}>
                    No email or phone number linked to this account. Please contact support.
                  </Text>
                )}

                {!channelInfo.hasEmail && channelInfo.hasMobile && (
                  <Text style={[styles.noContactNote, { color: colors.textMuted }]}>
                    SMS login is coming soon. Please add an email address to your account or contact support.
                  </Text>
                )}

                {channelInfo.hasEmail && (
                  <Pressable
                    style={[styles.actionBtn, { marginTop: 20 }, loading && styles.btnDisabled]}
                    onPress={handleSendOtp}
                    disabled={loading}
                  >
                    {loading ? <ActivityIndicator color="#FFF" size="small" /> : (
                      <>
                        <Ionicons name="send-outline" size={20} color="#FFF" />
                        <Text style={styles.actionBtnText}>Send Code</Text>
                      </>
                    )}
                  </Pressable>
                )}
              </View>
            </>
          )}

          {/* ── STEP 3: Enter OTP ──────────────────────────────────────────── */}
          {step === "code" && (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Enter your code</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {selectedChannel === "email" ? "Sent to " : "Sent via SMS to "}
                <Text style={{ color: colors.text, fontFamily: "Outfit_600SemiBold" }}>{displayCredential}</Text>
              </Text>

              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.codeIconRow}>
                  <Ionicons
                    name={selectedChannel === "email" ? "mail-open-outline" : "chatbubble-ellipses-outline"}
                    size={32} color={colors.pokemonRed}
                  />
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
                  style={[styles.actionBtn, { marginTop: 24 }, (loading || otpDigits.some((d) => !d)) && styles.btnDisabled]}
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

                <Pressable
                  onPress={() => { setStep("channel"); setOtpDigits(["", "", "", "", "", ""]); }}
                  style={styles.resendBtn}
                >
                  <Text style={[styles.resendText, { color: colors.textMuted }]}>Didn't get it? </Text>
                  <Text style={[styles.resendLink, { color: colors.pokemonRed }]}>Send again</Text>
                </Pressable>
              </View>
            </>
          )}
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
  subtitle: { fontSize: 15, fontFamily: "Outfit_400Regular", textAlign: "center", marginBottom: 24 },
  card: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 24 },
  label: { fontSize: 12, fontFamily: "Outfit_600SemiBold", letterSpacing: 0.5, marginBottom: 8 },
  inputWrap: {
    flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, height: 50, marginBottom: 18,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, fontFamily: "Outfit_400Regular" },
  eyeBtn: { padding: 4 },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    height: 52, borderRadius: 14, backgroundColor: "#CC0000",
    shadowColor: "#CC0000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  btnDisabled: { opacity: 0.6 },
  actionBtnText: { fontSize: 17, fontFamily: "Outfit_700Bold", color: "#FFF" },
  channelOption: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderWidth: 2, borderRadius: 16, padding: 16,
  },
  channelIcon: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: "center", justifyContent: "center",
  },
  channelText: { flex: 1 },
  channelTitle: { fontSize: 16, fontFamily: "Outfit_600SemiBold", marginBottom: 2 },
  channelSub: { fontSize: 13, fontFamily: "Outfit_400Regular" },
  noContactNote: { fontSize: 14, fontFamily: "Outfit_400Regular", textAlign: "center", lineHeight: 20 },
  comingSoonBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  comingSoonText: { fontSize: 11, fontFamily: "Outfit_600SemiBold" },
  codeIconRow: { alignItems: "center", marginBottom: 20 },
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
