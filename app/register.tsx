import React, { useState } from "react";
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

export default function RegisterScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { registerWithPassword } = useUser();

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const u = username.trim();
    const d = displayName.trim();
    const e = email.trim();
    const p = password.trim();
    const cp = confirmPassword.trim();

    if (!u || !d || !e || !p) {
      Alert.alert("Missing Fields", "Username, display name, email, and password are required.");
      return;
    }
    if (p.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }
    if (p !== cp) {
      Alert.alert("Password Mismatch", "Passwords do not match.");
      return;
    }
    if (!/^[a-z0-9_]+$/i.test(u)) {
      Alert.alert("Invalid Username", "Username can only contain letters, numbers and underscores.");
      return;
    }

    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await registerWithPassword(u, d, e, p, mobileNumber.trim() || undefined);
      router.back();
    } catch (err: any) {
      const msg = err?.message || "Registration failed";
      const clean = msg.replace(/^Error:\s*/i, "").replace(/\{.*\}/s, "").trim();
      Alert.alert("Registration Failed", clean || msg);
    } finally {
      setLoading(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={["#1A0A0A", "#0D0D1A"]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: topPad + 24, paddingBottom: botPad + 24 },
          ]}
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

          <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Join PokéScan TCG and start collecting
          </Text>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FieldInput
              label="Username *"
              icon="at-outline"
              value={username}
              onChangeText={setUsername}
              placeholder="e.g. ashketchum"
              autoCapitalize="none"
              returnKeyType="next"
              colors={colors}
            />

            <FieldInput
              label="Display Name *"
              icon="person-outline"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="e.g. Ash Ketchum"
              returnKeyType="next"
              colors={colors}
            />

            <FieldInput
              label="Email *"
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              colors={colors}
            />

            <FieldInput
              label="Mobile Number (optional)"
              icon="call-outline"
              value={mobileNumber}
              onChangeText={setMobileNumber}
              placeholder="+447700900123"
              keyboardType="phone-pad"
              returnKeyType="next"
              colors={colors}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Password *</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 6 characters"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm Password *</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
              <Pressable onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <Pressable
              style={[styles.registerBtn, loading && styles.registerBtnDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={20} color="#FFF" />
                  <Text style={styles.registerBtnText}>Create Account</Text>
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.loginRow}>
            <Text style={[styles.loginText, { color: colors.textMuted }]}>
              Already have an account?
            </Text>
            <Pressable onPress={() => { router.back(); router.push("/login"); }}>
              <Text style={styles.loginLink}> Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function FieldInput({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  returnKeyType,
  colors,
}: any) {
  return (
    <>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name={icon} size={18} color={colors.textMuted} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? "words"}
          autoCorrect={false}
          returnKeyType={returnKeyType}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
    gap: 2,
  },
  backText: {
    fontSize: 15,
    fontFamily: "Outfit_400Regular",
  },
  logoRow: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#CC0000",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#CC0000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  logoEmoji: {
    fontSize: 36,
  },
  title: {
    fontSize: 28,
    fontFamily: "Outfit_700Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
    marginBottom: 32,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontFamily: "Outfit_600SemiBold",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 50,
    marginBottom: 18,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Outfit_400Regular",
  },
  eyeBtn: {
    padding: 4,
  },
  registerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#CC0000",
    marginTop: 4,
    shadowColor: "#CC0000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  registerBtnDisabled: {
    opacity: 0.6,
  },
  registerBtnText: {
    fontSize: 17,
    fontFamily: "Outfit_700Bold",
    color: "#FFF",
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
  },
  loginLink: {
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
    color: "#FFDE00",
  },
});
