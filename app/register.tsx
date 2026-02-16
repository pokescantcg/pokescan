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
import { useThemeColors } from "@/constants/colors";
import { useUser } from "@/lib/user-context";

export default function RegisterScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { register } = useUser();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const handleRegister = async () => {
    if (!username.trim() || !displayName.trim()) {
      Alert.alert("Missing Fields", "Please fill in both username and display name.");
      return;
    }
    if (username.trim().length < 3) {
      Alert.alert("Username Too Short", "Username must be at least 3 characters.");
      return;
    }
    setIsSubmitting(true);
    try {
      await register(username.trim(), displayName.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      Alert.alert("Error", "Failed to create account. Please try again.");
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
        <View style={[styles.iconCircle, { backgroundColor: colors.gold }]}>
          <Ionicons name="person-add" size={32} color="#000" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Join PokeScan TCG to track your collection
        </Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Display Name</Text>
            <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="person-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Your display name"
                placeholderTextColor={colors.textMuted}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Username</Text>
            <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="at" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Choose a username"
                placeholderTextColor={colors.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              { backgroundColor: colors.gold, opacity: pressed || isSubmitting ? 0.8 : 1 },
            ]}
            onPress={handleRegister}
            disabled={isSubmitting}
          >
            <Text style={styles.submitBtnText}>
              {isSubmitting ? "Creating..." : "Create Account"}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  closeBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  content: { flex: 1, paddingHorizontal: 24, alignItems: "center", paddingTop: 40 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 26, fontFamily: "Outfit_700Bold", marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: "Outfit_400Regular", textAlign: "center", marginBottom: 32 },
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
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: { fontSize: 16, fontFamily: "Outfit_700Bold", color: "#000" },
});
