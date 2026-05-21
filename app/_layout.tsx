import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { Ionicons } from "@expo/vector-icons";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
<<<<<<< HEAD
import { UserProvider } from "@/lib/user-context";
import { CardCacheProvider } from "@/lib/card-cache-context";
import { AppConfigProvider, useAppConfig } from "@/lib/app-config-context";
=======
import { UserProvider, useUser } from "@/lib/user-context";
import { CardCacheProvider } from "@/lib/card-cache-context";
import { AppConfigProvider, useAppConfig } from "@/lib/app-config-context";
import TrialPromptModal from "@/components/TrialPromptModal";
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
import { useFonts, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from "@expo-google-fonts/outfit";

SplashScreen.preventAutoHideAsync();

function MaintenanceScreen({ onAdmin }: { onAdmin: () => void }) {
  return (
    <View style={maintStyles.wrap}>
      <Ionicons name="construct-outline" size={72} color="#FF6B6B" />
      <Text style={maintStyles.title}>We'll be right back</Text>
      <Text style={maintStyles.body}>
        PokeScan is undergoing scheduled maintenance. The app will be available again shortly.
      </Text>
      <Pressable style={maintStyles.btn} onPress={onAdmin}>
        <Text style={maintStyles.btnText}>Admin sign-in</Text>
      </Pressable>
    </View>
  );
}

<<<<<<< HEAD
const maintStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: "#0E0E12" },
  title: { fontSize: 24, fontWeight: "700", color: "#fff", marginTop: 24, textAlign: "center" },
  body: { fontSize: 16, color: "#B5B5BD", marginTop: 12, textAlign: "center", lineHeight: 22 },
  btn: { marginTop: 32, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "#3A3A45" },
  btnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
=======
function TrialPromptChecker() {
  const { user } = useUser();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = React.useState(0);
  const [isFinalPrompt, setIsFinalPrompt] = React.useState(false);

  useEffect(() => {
    if (!user || !user.trialEndDate) return;

    const now = new Date();
    const trialEnd = new Date(user.trialEndDate);
    const timeDiff = trialEnd.getTime() - now.getTime();
    const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    const hoursLeft = timeDiff / (1000 * 60 * 60);

    // Check if we should show a prompt
    let shouldShowPrompt = false;
    let finalPrompt = false;

    if (hoursLeft <= 2 && !user.trialPromptedFinal) {
      // Final prompt: 2 hours before trial ends
      shouldShowPrompt = true;
      finalPrompt = true;
    } else if (daysLeft === 1 && !user.trialPromptedDay6) {
      // Day 6 prompt: 1 day left
      shouldShowPrompt = true;
    } else if (daysLeft === 2 && !user.trialPromptedDay5) {
      // Day 5 prompt: 2 days left
      shouldShowPrompt = true;
    }

    if (shouldShowPrompt) {
      setTrialDaysLeft(Math.max(0, daysLeft));
      setIsFinalPrompt(finalPrompt);
      setModalVisible(true);
    }
  }, [user]);

  if (!user || !user.trialEndDate) return null;

  return (
    <TrialPromptModal
      visible={modalVisible}
      onDismiss={() => setModalVisible(false)}
      trialDaysLeft={trialDaysLeft}
      isFinalPrompt={isFinalPrompt}
    />
  );
}
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f

function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { maintenanceMode, loaded } = useAppConfig();
  const pathname = usePathname() || "";

  // Always allow admin routes through, even during maintenance, so a superadmin
  // can still sign in and disable the maintenance flag.
  const isAdminRoute = pathname.startsWith("/admin-login") || pathname.startsWith("/admin-panel");

  if (loaded && maintenanceMode && !isAdminRoute) {
    return <MaintenanceScreen onAdmin={() => router.push("/admin-login")} />;
  }
  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <MaintenanceGate>
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="set/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="card/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="login" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="admin-login" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="admin-panel" options={{ headerShown: false }} />
      </Stack>
    </MaintenanceGate>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

<<<<<<< HEAD
=======
  useEffect(() => {
    const globalAny = global as any;
    if (typeof globalAny.ErrorUtils?.setGlobalHandler === "function") {
      globalAny.ErrorUtils.setGlobalHandler((error: any, isFatal: boolean) => {
        console.log("GLOBAL ERROR:", error);
      });
    }
  }, []);

>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView>
          <KeyboardProvider>
            <CardCacheProvider>
              <UserProvider>
                <AppConfigProvider>
                  <RootLayoutNav />
<<<<<<< HEAD
=======
                  <TrialPromptChecker />
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
                </AppConfigProvider>
              </UserProvider>
            </CardCacheProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
