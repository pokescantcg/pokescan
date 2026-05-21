import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
<<<<<<< HEAD
import {
  Platform,
  StyleSheet,
  useColorScheme,
  View,
  Text,
  Animated,
} from "react-native";
=======
import { Platform, StyleSheet, useColorScheme, View, Text, Animated } from "react-native";
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useEffect, useRef } from "react";
import { useThemeColors } from "@/constants/colors";
import { useCardCache } from "@/lib/card-cache-context";
import WelcomeModal from "@/components/WelcomeModal";
<<<<<<< HEAD
import { PremiumTrialBanner } from "@/components/PremiumTrialBanner";
=======
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f

function DownloadBanner() {
  const { isDownloading, downloadPercent, progress } = useCardCache();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: isDownloading ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isDownloading]);

  if (!isDownloading && downloadPercent === 0) return null;

<<<<<<< HEAD
  const label =
    progress?.stage === "cards" && progress.setName
      ? `Saving cards: ${progress.setName} (${progress.current}/${progress.total})`
      : "Downloading card database...";
=======
  const label = progress?.stage === "cards" && progress.setName
    ? `Saving cards: ${progress.setName} (${progress.current}/${progress.total})`
    : "Downloading card database...";
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f

  return (
    <Animated.View
      style={[
        bannerStyles.wrap,
<<<<<<< HEAD
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [-24, 0],
              }),
            },
          ],
        },
=======
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }] },
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
      ]}
      pointerEvents="none"
    >
      <View style={bannerStyles.row}>
<<<<<<< HEAD
        <MaterialCommunityIcons
          name="database-arrow-down"
          size={13}
          color="#FFF"
        />
        <Text style={bannerStyles.label} numberOfLines={1}>
          {label}
        </Text>
        <Text style={bannerStyles.pct}>{downloadPercent}%</Text>
      </View>
      <View style={bannerStyles.track}>
        <View
          style={[bannerStyles.bar, { width: `${downloadPercent}%` as any }]}
        />
=======
        <MaterialCommunityIcons name="database-arrow-down" size={13} color="#FFF" />
        <Text style={bannerStyles.label} numberOfLines={1}>{label}</Text>
        <Text style={bannerStyles.pct}>{downloadPercent}%</Text>
      </View>
      <View style={bannerStyles.track}>
        <View style={[bannerStyles.bar, { width: `${downloadPercent}%` as any }]} />
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
      </View>
    </Animated.View>
  );
}

const bannerStyles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1A1A2E",
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 4,
    zIndex: 999,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
<<<<<<< HEAD
  label: {
    flex: 1,
    fontSize: 10,
    fontFamily: "Outfit_500Medium",
    color: "#CCC",
  },
  pct: { fontSize: 10, fontFamily: "Outfit_700Bold", color: "#FFDE00" },
  track: {
    height: 2,
    backgroundColor: "#333",
    borderRadius: 1,
    overflow: "hidden",
  },
=======
  label: { flex: 1, fontSize: 10, fontFamily: "Outfit_500Medium", color: "#CCC" },
  pct: { fontSize: 10, fontFamily: "Outfit_700Bold", color: "#FFDE00" },
  track: { height: 2, backgroundColor: "#333", borderRadius: 1, overflow: "hidden" },
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
  bar: { height: 2, backgroundColor: "#FFDE00", borderRadius: 1 },
});

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
<<<<<<< HEAD
        <Icon
          sf={{ default: "rectangle.stack", selected: "rectangle.stack.fill" }}
        />
        <Label>Browse</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="scanner">
        <Icon
          sf={{ default: "camera.viewfinder", selected: "camera.viewfinder" }}
        />
=======
        <Icon sf={{ default: "rectangle.stack", selected: "rectangle.stack.fill" }} />
        <Label>Browse</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="scanner">
        <Icon sf={{ default: "camera.viewfinder", selected: "camera.viewfinder" }} />
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
        <Label>Scan</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="collection">
        <Icon sf={{ default: "folder", selected: "folder.fill" }} />
        <Label>Collection</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="market">
        <Icon sf={{ default: "storefront", selected: "storefront.fill" }} />
        <Label>Market</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const isDark = colorScheme === "dark";
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.pokemonRed,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          position: "absolute" as const,
<<<<<<< HEAD
          backgroundColor: isIOS
            ? "transparent"
            : isDark
              ? "#0F1629"
              : colors.surface,
=======
          backgroundColor: isIOS ? "transparent" : isDark ? "#0F1629" : colors.surface,
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
          borderTopWidth: isDark ? 0 : 1,
          borderTopColor: isDark ? "transparent" : colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
<<<<<<< HEAD
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: isDark ? "#0F1629" : colors.surface },
              ]}
            />
=======
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "#0F1629" : colors.surface }]} />
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Outfit_600SemiBold",
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Browse",
          tabBarIcon: ({ color, focused }) => (
<<<<<<< HEAD
            <MaterialCommunityIcons
              name={focused ? "cards" : "cards-outline"}
              size={24}
              color={color}
            />
=======
            <MaterialCommunityIcons name={focused ? "cards" : "cards-outline"} size={24} color={color} />
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: "Scan",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? tabStyles.scanActive : undefined}>
<<<<<<< HEAD
              <Ionicons
                name={focused ? "scan" : "scan-outline"}
                size={24}
                color={focused ? "#FFF" : color}
              />
=======
              <Ionicons name={focused ? "scan" : "scan-outline"} size={24} color={focused ? "#FFF" : color} />
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: "Collection",
          tabBarIcon: ({ color, focused }) => (
<<<<<<< HEAD
            <MaterialCommunityIcons
              name={focused ? "pokeball" : "circle-outline"}
              size={24}
              color={color}
            />
=======
            <MaterialCommunityIcons name={focused ? "pokeball" : "circle-outline"} size={24} color={color} />
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
          ),
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: "Market",
          tabBarIcon: ({ color, focused }) => (
<<<<<<< HEAD
            <Ionicons
              name={focused ? "storefront" : "storefront-outline"}
              size={22}
              color={color}
            />
=======
            <Ionicons name={focused ? "storefront" : "storefront-outline"} size={22} color={color} />
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
<<<<<<< HEAD
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              size={24}
              color={color}
            />
=======
            <Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={24} color={color} />
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
          ),
        }}
      />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  scanActive: {
    backgroundColor: "#CC0000",
    borderRadius: 12,
    padding: 6,
    marginTop: -4,
  },
});

export default function TabLayout() {
<<<<<<< HEAD
  const [wipVisible, setWipVisible] = React.useState(true);

=======
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
  return (
    <View style={{ flex: 1 }}>
      {isLiquidGlassAvailable() ? <NativeTabLayout /> : <ClassicTabLayout />}
      <DownloadBanner />
<<<<<<< HEAD
      <WelcomeModal onClose={() => setWipVisible(false)} />
      <PremiumTrialBanner wipPopupOpen={wipVisible} token={null} />
=======
      <WelcomeModal />
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
    </View>
  );
}
