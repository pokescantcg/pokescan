import React, { useState, useEffect, useRef } from "react";
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
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { LinearGradient } from "expo-linear-gradient";
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

type Step = "form" | "channel" | "otp";

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

export default function RegisterScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { register, sendRegistrationOtp, verifyOtp, socialRegister } = useUser();

  const [step, setStep] = useState<Step>("form");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [userId, setUserId] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<"email" | "sms" | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [credential, setCredential] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [socialLoading, setSocialLoading] = useState<AuthProvider | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const redirectUri = AuthSession.makeRedirectUri({ preferLocalhost: true });
  const hasSocialProviders = !!(GOOGLE_CLIENT_ID || MICROSOFT_CLIENT_ID || FACEBOOK_APP_ID || TWITTER_CLIENT_ID);

  const [googleRequest, googleResponse, googlePromptAsync] = AuthSession.useAuthRequest(
    GOOGLE_CLIENT_ID
      ? { clientId: GOOGLE_CLIENT_ID, scopes: ["openid", "profile", "email"], redirectUri, responseType: AuthSession.ResponseType.Token }
      : { clientId: "disabled", scopes: [], redirectUri },
    googleDiscovery
  );

  const [microsoftRequest, microsoftResponse, microsoftPromptAsync] = AuthSession.useAuthRequest(
    MICROSOFT_CLIENT_ID
      ? { clientId: MICROSOFT_CLIENT_ID, scopes: ["openid", "profile", "email"], redirectUri, responseType: AuthSession.ResponseType.Token }
      : { clientId: "disabled", scopes: [], redirectUri },
    microsoftDiscovery
  );

  const [facebookRequest, facebookResponse, facebookPromptAsync] = AuthSession.useAuthRequest(
    FACEBOOK_APP_ID
      ? { clientId: FACEBOOK_APP_ID, scopes: ["public_profile", "email"], redirectUri, responseType: AuthSession.ResponseType.Token }
      : { clientId: "disabled", scopes: [], redirectUri },
    facebookDiscovery
  );

  const [twitterRequest, twitterResponse, twitterPromptAsync] = AuthSession.useAuthRequest(
    TWITTER_CLIENT_ID
      ? { clientId: TWITTER_CLIENT_ID, scopes: ["users.read", "tweet.read"], redirectUri, usePKCE: true, responseType: AuthSession.ResponseType.Code }
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
          if (!GOOGLE_CLIENT_ID) { Alert.alert("Not Configured", "Google sign-in is not set up yet."); return; }
          await googlePromptAsync();
          break;
        case "outlook":
          if (!MICROSOFT_CLIENT_ID) { Alert.alert("Not Configured", "Outlook sign-in is not set up yet."); return; }
          await microsoftPromptAsync();
          break;
        case "facebook":
          if (!FACEBOOK_APP_ID) { Alert.alert("Not Configured", "Facebook sign-in is not set up yet."); return; }
          await facebookPromptAsync();
          break;
        case "twitter":
          if (!TWITTER_CLIENT_ID) { Alert.alert("Not Configured", "X sign-in is not set up yet."); return; }
          await twitterPromptAsync();
          break;
      }
    } catch (e) {
      Alert.alert("Error", "Sign in failed. Please try again.");
    }
  };

  const handleRegister = async () => {
    if (!username.trim() || !displayName.trim() || !email.trim() || !mobileNumber.trim()) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }
    if (username.trim().length < 3) {
      Alert.alert("Username Too Short", "Username must be at least 3 characters.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    setIsSubmitting(true);
    try {
      await register(username.trim(), displayName.trim(), email.trim(), mobileNumber.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("409")) {
        const parsed = extractErrorMessage(msg);
        Alert.alert("Account Exists", parsed || "An account already exists with these details.");
      } else {
        Alert.alert("Error", "Failed to create account. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectChannel = async (channel: "email" | "sms") => {
    setSelectedChannel(channel);
    setIsSubmitting(true);
    const cred = channel === "email" ? email.trim() : mobileNumber.trim();
    setCredential(cred);
    try {
      await sendRegistrationOtp(userId, channel);
      setStep("otp");
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("429")) {
        Alert.alert("Slow Down", "Too many requests. Please wait a minute before trying again.");
      } else {
        Alert.alert("Error", "Failed to send verification code. Please try again.");
      }
      setSelectedChannel(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      Alert.alert("Invalid Code", "Please enter the 6-digit verification code.");
      return;
    }
    setIsSubmitting(true);
    try {
      await verifyOtp(credential, otpCode.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = e?.message || "";
      if (msg.includes("429")) {
        Alert.alert("Too Many Attempts", "Please request a new code and try again.");
        setStep("channel");
        setOtpCode("");
      } else if (msg.includes("401")) {
        const parsed = extractErrorMessage(msg);
        Alert.alert("Verification Failed", parsed || "The code is incorrect or has expired.");
      } else {
        Alert.alert("Error", "Verification failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (!selectedChannel) return;
    setIsResending(true);
    try {
      await sendRegistrationOtp(userId, selectedChannel);
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

  const isAnyLoading = isSubmitting || socialLoading !== null;

  const handleBack = () => {
    if (step === "otp") {
      setStep("channel");
      setOtpCode("");
    } else if (step === "channel") {
      setStep("form");
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
          <Ionicons name={step === "form" ? "close" : "arrow-back"} size={24} color={colors.text} />
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

          {step === "form" && (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Join PokeScan</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Sign up to track your collection and trade cards
              </Text>

              <View style={styles.socialSection}>
                <SocialButton label="Continue with Google" iconName="logo-google" bgColor="#FFFFFF" textColor="#1F1F1F" onPress={() => handleSocialPress("google")} isLoading={socialLoading === "google"} disabled={isAnyLoading} configured={!!GOOGLE_CLIENT_ID} />
                <SocialButton label="Continue with Outlook" iconName="mail" bgColor="#0078D4" textColor="#FFFFFF" onPress={() => handleSocialPress("outlook")} isLoading={socialLoading === "outlook"} disabled={isAnyLoading} configured={!!MICROSOFT_CLIENT_ID} />
                <SocialButton label="Continue with Facebook" iconName="logo-facebook" bgColor="#1877F2" textColor="#FFFFFF" onPress={() => handleSocialPress("facebook")} isLoading={socialLoading === "facebook"} disabled={isAnyLoading} configured={!!FACEBOOK_APP_ID} />
                <SocialButton label="Continue with X" iconName="logo-twitter" bgColor="#000000" textColor="#FFFFFF" onPress={() => handleSocialPress("twitter")} isLoading={socialLoading === "twitter"} disabled={isAnyLoading} configured={!!TWITTER_CLIENT_ID} />
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
                  style={[styles.manualSignupBtn, { borderColor: colors.pokemonRed + "50" }]}
                  onPress={() => setShowManualForm(true)}
                >
                  <Ionicons name="create-outline" size={18} color={colors.pokemonRed} />
                  <Text style={[styles.manualSignupText, { color: colors.pokemonRed }]}>
                    Sign up with email & mobile
                  </Text>
                </Pressable>
              ) : (
                <View style={styles.form}>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Display Name</Text>
                    <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.pokemonRed + "30" }]}>
                      <Ionicons name="person-outline" size={18} color={colors.pokemonRed} />
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder="Your display name"
                        placeholderTextColor={colors.textMuted}
                        value={displayName}
                        onChangeText={setDisplayName}
                        autoCapitalize="words"
                        testID="displayName-input"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Username</Text>
                    <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.pokemonRed + "30" }]}>
                      <Ionicons name="at" size={18} color={colors.pokemonRed} />
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder="Choose a username"
                        placeholderTextColor={colors.textMuted}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                        testID="username-input"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email Address</Text>
                    <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.pokemonRed + "30" }]}>
                      <Ionicons name="mail-outline" size={18} color={colors.pokemonRed} />
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder="your@email.com"
                        placeholderTextColor={colors.textMuted}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        testID="email-input"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Mobile Number</Text>
                    <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.pokemonRed + "30" }]}>
                      <Ionicons name="phone-portrait-outline" size={18} color={colors.pokemonRed} />
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder="+44 7700 900000"
                        placeholderTextColor={colors.textMuted}
                        value={mobileNumber}
                        onChangeText={setMobileNumber}
                        keyboardType="phone-pad"
                        testID="mobile-input"
                      />
                    </View>
                  </View>

                  <Pressable
                    style={({ pressed }) => [styles.submitBtn, { opacity: pressed || isSubmitting ? 0.8 : 1 }]}
                    onPress={handleRegister}
                    disabled={isAnyLoading}
                    testID="register-submit-btn"
                  >
                    <LinearGradient colors={["#CC0000", "#8B0000"]} style={styles.submitBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.submitBtnText}>Continue</Text>
                      )}
                    </LinearGradient>
                  </Pressable>
                </View>
              )}
            </>
          )}

          {step === "channel" && (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Verify Your Account</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Choose how you'd like to receive your verification code
              </Text>

              <View style={[styles.form, { width: "100%" }]}>
                <Pressable
                  style={({ pressed }) => [
                    styles.channelBtn,
                    { backgroundColor: colors.surface, borderColor: colors.pokemonRed + "40", opacity: pressed || isSubmitting ? 0.7 : 1 },
                  ]}
                  onPress={() => handleSelectChannel("email")}
                  disabled={isSubmitting}
                  testID="channel-email-btn"
                >
                  <View style={[styles.channelIcon, { backgroundColor: colors.pokemonRed + "15" }]}>
                    <Ionicons name="mail" size={28} color={colors.pokemonRed} />
                  </View>
                  <View style={styles.channelInfo}>
                    <Text style={[styles.channelTitle, { color: colors.text }]}>Send to Email</Text>
                    <Text style={[styles.channelDesc, { color: colors.textMuted }]} numberOfLines={1}>{email}</Text>
                  </View>
                  {isSubmitting && selectedChannel === "email" ? (
                    <ActivityIndicator size="small" color={colors.pokemonRed} />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  )}
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.channelBtn,
                    { backgroundColor: colors.surface, borderColor: colors.pokemonRed + "40", opacity: pressed || isSubmitting ? 0.7 : 1 },
                  ]}
                  onPress={() => handleSelectChannel("sms")}
                  disabled={isSubmitting}
                  testID="channel-sms-btn"
                >
                  <View style={[styles.channelIcon, { backgroundColor: colors.pokemonRed + "15" }]}>
                    <Ionicons name="phone-portrait" size={28} color={colors.pokemonRed} />
                  </View>
                  <View style={styles.channelInfo}>
                    <Text style={[styles.channelTitle, { color: colors.text }]}>Send via SMS</Text>
                    <Text style={[styles.channelDesc, { color: colors.textMuted }]} numberOfLines={1}>{mobileNumber}</Text>
                  </View>
                  {isSubmitting && selectedChannel === "sms" ? (
                    <ActivityIndicator size="small" color={colors.pokemonRed} />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  )}
                </Pressable>
              </View>
            </>
          )}

          {step === "otp" && (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Enter Code</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                We sent a 6-digit code to{"\n"}
                <Text style={{ color: colors.pokemonRed, fontFamily: "Outfit_600SemiBold" }}>
                  {selectedChannel === "email" ? email : mobileNumber}
                </Text>
              </Text>

              <View style={[styles.form, { width: "100%" }]}>
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
                      testID="otp-input"
                    />
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [styles.submitBtn, { opacity: pressed || isSubmitting ? 0.8 : 1 }]}
                  onPress={handleVerifyOtp}
                  disabled={isSubmitting}
                  testID="otp-verify-btn"
                >
                  <LinearGradient colors={["#CC0000", "#8B0000"]} style={styles.submitBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>Verify & Create Account</Text>
                    )}
                  </LinearGradient>
                </Pressable>

                <Pressable
                  style={styles.resendBtn}
                  onPress={handleResendOtp}
                  disabled={isResending || isSubmitting}
                  testID="resend-otp-btn"
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
    borderWidth: 1.5,
    width: "100%",
  },
  manualSignupText: { fontSize: 15, fontFamily: "Outfit_600SemiBold" },
  form: { gap: 16, width: "100%" },
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
  channelBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 14,
  },
  channelIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  channelInfo: { flex: 1 },
  channelTitle: { fontSize: 16, fontFamily: "Outfit_600SemiBold" },
  channelDesc: { fontSize: 13, fontFamily: "Outfit_400Regular", marginTop: 2 },
  resendBtn: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 4,
  },
  resendText: { fontSize: 14, fontFamily: "Outfit_500Medium" },
});
