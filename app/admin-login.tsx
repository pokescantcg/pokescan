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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColors } from "@/constants/colors";
import { useUser } from "@/lib/user-context";

type Step = "email" | "code";

export default function AdminLoginScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { requestAdminOtp, verifyAdminOtp } = useUser();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert("Missing Email", "Please enter the superadmin email address.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await requestAdminOtp(email.trim());
      if (result.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setStep("code");
        // Don't reveal whether the email is the right one — but tell the user where to look.
        Alert.alert(
          "Code Sent",
          "If this email is registered as the superadmin, a 6-digit code has been sent. Check your inbox (and spam).",
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Error", result.error || "Failed to send code.");
      }
    } catch {
      Alert.alert("Error", "Failed to send code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (!code.trim()) {
      Alert.alert("Missing Code", "Please enter the 6-digit code from your email.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await verifyAdminOtp(email.trim(), code.trim());
      if (result.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/admin-panel");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Access Denied", result.error || "Invalid code.");
      }
    } catch {
      Alert.alert("Error", "Verification failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.header, { paddingTop: (insets.top || webTopInset) + 4 }]}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <LinearGradient
          colors={["#E74C3C", "#C0392B"]}
          style={styles.iconCircle}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="shield-checkmark" size={36} color="#FFF" />
        </LinearGradient>
        <Text style={[styles.title, { color: colors.text }]}>Superadmin Login</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {step === "email"
            ? "Enter the superadmin email — we'll send a one-time code."
            : "Enter the 6-digit code we sent to your email."}
        </Text>

        <View style={styles.form}>
          {step === "email" ? (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email</Text>
              <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="superadmin email address"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!isSubmitting}
                />
              </View>
            </View>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email</Text>
                <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border, opacity: 0.6 }]}>
                  <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
                  <Text style={[styles.input, { color: colors.text }]} numberOfLines={1}>{email}</Text>
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>6-Digit Code</Text>
                <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="key-outline" size={18} color={colors.textMuted} />
                  <TextInput
                    style={[styles.input, { color: colors.text, letterSpacing: 6, fontSize: 20 }]}
                    placeholder="000000"
                    placeholderTextColor={colors.textMuted}
                    value={code}
                    onChangeText={(t) => setCode(t.replace(/[^0-9]/g, "").slice(0, 6))}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!isSubmitting}
                  />
                </View>
              </View>
            </>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              { opacity: pressed || isSubmitting ? 0.8 : 1 },
            ]}
            onPress={step === "email" ? handleSendCode : handleVerify}
            disabled={isSubmitting}
          >
            <LinearGradient
              colors={["#E74C3C", "#C0392B"]}
              style={styles.submitBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons
                name={step === "email" ? "send-outline" : "shield-checkmark"}
                size={18}
                color="#FFF"
              />
              <Text style={styles.submitBtnText}>
                {isSubmitting
                  ? step === "email" ? "Sending..." : "Verifying..."
                  : step === "email" ? "Send Code" : "Verify & Sign In"}
              </Text>
            </LinearGradient>
          </Pressable>

          {step === "code" && (
            <Pressable
              onPress={() => { setStep("email"); setCode(""); }}
              disabled={isSubmitting}
              style={styles.linkBtn}
            >
              <Text style={[styles.linkText, { color: colors.textSecondary }]}>
                Use a different email
              </Text>
            </Pressable>
          )}
        </View>

        <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            This area is restricted to the app owner. Codes expire after 10 minutes. Unauthorised access attempts are logged.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  closeBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  content: { flex: 1, paddingHorizontal: 24, alignItems: "center", paddingTop: 30 },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 26, fontFamily: "Outfit_700Bold", marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: "Outfit_400Regular", textAlign: "center", marginBottom: 32, paddingHorizontal: 12 },
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
  submitBtn: { marginTop: 8 },
  submitBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  submitBtnText: { fontSize: 16, fontFamily: "Outfit_700Bold", color: "#FFF" },
  linkBtn: { alignItems: "center", paddingVertical: 8 },
  linkText: { fontSize: 14, fontFamily: "Outfit_500Medium", textDecorationLine: "underline" },
  infoBox: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 32,
    width: "100%",
    alignItems: "flex-start",
  },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Outfit_400Regular", lineHeight: 16 },
});
