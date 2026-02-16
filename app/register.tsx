import React, { useState, useEffect } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useThemeColors } from "@/constants/colors";
import { useUser } from "@/lib/user-context";
import { AuthProvider } from "@/lib/storage";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
const MICROSOFT_CLIENT_ID = process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID;
const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;
const TWITTER_CLIENT_ID = process.env.EXPO_PUBLIC_TWITTER_CLIENT_ID;

const googleDiscovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  userInfoEndpoint: "https://www.googleapis.com/oauth2/v3/userinfo",
};

const microsoftDiscovery = {
  authorizationEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
  tokenEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
};

const facebookDiscovery = {
  authorizationEndpoint: "https://www.facebook.com/v18.0/dialog/oauth",
  tokenEndpoint: "https://graph.facebook.com/v18.0/oauth/access_token",
};

const twitterDiscovery = {
  authorizationEndpoint: "https://twitter.com/i/oauth2/authorize",
  tokenEndpoint: "https://api.twitter.com/2/oauth2/token",
};

interface SocialButtonProps {
  label: string;
  iconName: string;
  bgColor: string;
  textColor: string;
  onPress: () => void;
  isLoading: boolean;
  disabled: boolean;
  configured: boolean;
}

function SocialButton({ label, iconName, bgColor, textColor, onPress, isLoading, disabled, configured }: SocialButtonProps) {
  if (!configured) return null;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.socialBtn,
        { backgroundColor: bgColor, opacity: pressed || disabled ? 0.7 : 1 },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Ionicons name={iconName as any} size={20} color={textColor} />
      )}
      <Text style={[styles.socialBtnText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

export default function RegisterScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { register, socialRegister } = useUser();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<AuthProvider | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const redirectUri = AuthSession.makeRedirectUri({ preferLocalhost: true });

  const hasSocialProviders = !!(GOOGLE_CLIENT_ID || MICROSOFT_CLIENT_ID || FACEBOOK_APP_ID || TWITTER_CLIENT_ID);

  const [googleRequest, googleResponse, googlePromptAsync] = AuthSession.useAuthRequest(
    GOOGLE_CLIENT_ID
      ? {
          clientId: GOOGLE_CLIENT_ID,
          scopes: ["openid", "profile", "email"],
          redirectUri,
          responseType: AuthSession.ResponseType.Token,
        }
      : { clientId: "disabled", scopes: [], redirectUri },
    googleDiscovery
  );

  const [microsoftRequest, microsoftResponse, microsoftPromptAsync] = AuthSession.useAuthRequest(
    MICROSOFT_CLIENT_ID
      ? {
          clientId: MICROSOFT_CLIENT_ID,
          scopes: ["openid", "profile", "email"],
          redirectUri,
          responseType: AuthSession.ResponseType.Token,
        }
      : { clientId: "disabled", scopes: [], redirectUri },
    microsoftDiscovery
  );

  const [facebookRequest, facebookResponse, facebookPromptAsync] = AuthSession.useAuthRequest(
    FACEBOOK_APP_ID
      ? {
          clientId: FACEBOOK_APP_ID,
          scopes: ["public_profile", "email"],
          redirectUri,
          responseType: AuthSession.ResponseType.Token,
        }
      : { clientId: "disabled", scopes: [], redirectUri },
    facebookDiscovery
  );

  const [twitterRequest, twitterResponse, twitterPromptAsync] = AuthSession.useAuthRequest(
    TWITTER_CLIENT_ID
      ? {
          clientId: TWITTER_CLIENT_ID,
          scopes: ["users.read", "tweet.read"],
          redirectUri,
          usePKCE: true,
          responseType: AuthSession.ResponseType.Code,
        }
      : { clientId: "disabled", scopes: [], redirectUri },
    twitterDiscovery
  );

  useEffect(() => {
    if (googleResponse?.type === "success" && googleResponse.authentication?.accessToken) {
      handleGoogleSuccess(googleResponse.authentication.accessToken);
    }
  }, [googleResponse]);

  useEffect(() => {
    if (microsoftResponse?.type === "success" && microsoftResponse.authentication?.accessToken) {
      handleMicrosoftSuccess(microsoftResponse.authentication.accessToken);
    }
  }, [microsoftResponse]);

  useEffect(() => {
    if (facebookResponse?.type === "success" && facebookResponse.authentication?.accessToken) {
      handleFacebookSuccess(facebookResponse.authentication.accessToken);
    }
  }, [facebookResponse]);

  useEffect(() => {
    if (twitterResponse?.type === "success" && twitterResponse.authentication?.accessToken) {
      handleTwitterSuccess(twitterResponse.authentication.accessToken);
    }
  }, [twitterResponse]);

  const handleGoogleSuccess = async (accessToken: string) => {
    try {
      setSocialLoading("google");
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      await socialRegister("google", data.name || "Google User", data.email, data.picture);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      Alert.alert("Error", "Failed to sign in with Google. Please try again.");
    } finally {
      setSocialLoading(null);
    }
  };

  const handleMicrosoftSuccess = async (accessToken: string) => {
    try {
      setSocialLoading("outlook");
      const res = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      await socialRegister("outlook", data.displayName || "Outlook User", data.mail || data.userPrincipalName);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      Alert.alert("Error", "Failed to sign in with Outlook. Please try again.");
    } finally {
      setSocialLoading(null);
    }
  };

  const handleFacebookSuccess = async (accessToken: string) => {
    try {
      setSocialLoading("facebook");
      const res = await fetch(`https://graph.facebook.com/me?fields=name,email,picture.type(large)&access_token=${accessToken}`);
      const data = await res.json();
      const pictureUrl = data.picture?.data?.url;
      await socialRegister("facebook", data.name || "Facebook User", data.email, pictureUrl);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      Alert.alert("Error", "Failed to sign in with Facebook. Please try again.");
    } finally {
      setSocialLoading(null);
    }
  };

  const handleTwitterSuccess = async (accessToken: string) => {
    try {
      setSocialLoading("twitter");
      const res = await fetch("https://api.twitter.com/2/users/me?user.fields=name,profile_image_url", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      const data = json.data;
      await socialRegister("twitter", data?.name || "X User", undefined, data?.profile_image_url);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      Alert.alert("Error", "Failed to sign in with X. Please try again.");
    } finally {
      setSocialLoading(null);
    }
  };

  const handleSocialPress = async (provider: AuthProvider) => {
    try {
      switch (provider) {
        case "google":
          if (!GOOGLE_CLIENT_ID) {
            Alert.alert("Not Configured", "Google sign-in is not set up yet.");
            return;
          }
          await googlePromptAsync();
          break;
        case "outlook":
          if (!MICROSOFT_CLIENT_ID) {
            Alert.alert("Not Configured", "Outlook sign-in is not set up yet.");
            return;
          }
          await microsoftPromptAsync();
          break;
        case "facebook":
          if (!FACEBOOK_APP_ID) {
            Alert.alert("Not Configured", "Facebook sign-in is not set up yet.");
            return;
          }
          await facebookPromptAsync();
          break;
        case "twitter":
          if (!TWITTER_CLIENT_ID) {
            Alert.alert("Not Configured", "X sign-in is not set up yet.");
            return;
          }
          await twitterPromptAsync();
          break;
      }
    } catch (e) {
      Alert.alert("Error", "Sign in failed. Please try again.");
    }
  };

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

  const isAnyLoading = isSubmitting || socialLoading !== null;

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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: colors.gold }]}>
            <Ionicons name="person-add" size={32} color="#000" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Join PokeScan</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign up to track your collection and trade cards
          </Text>

          <View style={styles.socialSection}>
            <SocialButton
              label="Continue with Google"
              iconName="logo-google"
              bgColor="#FFFFFF"
              textColor="#1F1F1F"
              onPress={() => handleSocialPress("google")}
              isLoading={socialLoading === "google"}
              disabled={isAnyLoading}
              configured={!!GOOGLE_CLIENT_ID}
            />
            <SocialButton
              label="Continue with Outlook"
              iconName="mail"
              bgColor="#0078D4"
              textColor="#FFFFFF"
              onPress={() => handleSocialPress("outlook")}
              isLoading={socialLoading === "outlook"}
              disabled={isAnyLoading}
              configured={!!MICROSOFT_CLIENT_ID}
            />
            <SocialButton
              label="Continue with Facebook"
              iconName="logo-facebook"
              bgColor="#1877F2"
              textColor="#FFFFFF"
              onPress={() => handleSocialPress("facebook")}
              isLoading={socialLoading === "facebook"}
              disabled={isAnyLoading}
              configured={!!FACEBOOK_APP_ID}
            />
            <SocialButton
              label="Continue with X"
              iconName="logo-twitter"
              bgColor="#000000"
              textColor="#FFFFFF"
              onPress={() => handleSocialPress("twitter")}
              isLoading={socialLoading === "twitter"}
              disabled={isAnyLoading}
              configured={!!TWITTER_CLIENT_ID}
            />
          </View>

          {hasSocialProviders && (
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>
          )}

          {!showManualForm && hasSocialProviders ? (
            <Pressable
              style={[styles.manualSignupBtn, { borderColor: colors.border }]}
              onPress={() => setShowManualForm(true)}
            >
              <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.manualSignupText, { color: colors.textSecondary }]}>
                Sign up with username
              </Text>
            </Pressable>
          ) : (
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
                disabled={isAnyLoading}
              >
                <Text style={styles.submitBtnText}>
                  {isSubmitting ? "Creating..." : "Create Account"}
                </Text>
              </Pressable>
            </View>
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
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 26, fontFamily: "Outfit_700Bold", marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: "Outfit_400Regular", textAlign: "center", marginBottom: 28 },
  socialSection: { width: "100%", gap: 10 },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
  },
  socialBtnText: { fontSize: 15, fontFamily: "Outfit_600SemiBold" },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontFamily: "Outfit_400Regular" },
  manualSignupBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    width: "100%",
  },
  manualSignupText: { fontSize: 15, fontFamily: "Outfit_500Medium" },
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
