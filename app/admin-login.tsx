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

export default function AdminLoginScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { loginWithPassword, logout } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const handleSignIn = async () => {
    const e = email.trim();
    const p = password.trim();
    if (!e || !p) {
      Alert.alert("Missing Details", "Enter both email and password.");
      return;
    }
    setIsSubmitting(true);
    try {
      await loginWithPassword(e, p);
      // The user-context updates `user` after loginWithPassword resolves.
      // Verify the account has admin privileges; if not, sign out and reject.
      const { getUser } = await import("@/lib/storage");
      const profile = await getUser();
      if (!profile || profile.role !== "admin") {
        await logout();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Access Denied", "This account does not have admin privileges.");
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/admin-panel");
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Sign-in Failed", err?.message || "Invalid email or password.");
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
        <Text style={[styles.title, { color: colors.text }]}>Admin Sign In</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Sign in with your admin email and password.
        </Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email</Text>
            <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="admin email address"
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

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Password</Text>
            <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Enter password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!showPassword}
                editable={!isSubmitting}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              { opacity: pressed || isSubmitting ? 0.8 : 1 },
            ]}
            onPress={handleSignIn}
            disabled={isSubmitting}
          >
            <LinearGradient
              colors={["#E74C3C", "#C0392B"]}
              style={styles.submitBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="shield-checkmark" size={18} color="#FFF" />
              <Text style={styles.submitBtnText}>
                {isSubmitting ? "Signing in..." : "Sign In"}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>

        <View style={[styles.infoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            This area is restricted to accounts with the Admin role. Unauthorised access attempts are logged.
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
