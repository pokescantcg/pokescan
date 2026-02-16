import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, useColorScheme, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React from "react";
import { useThemeColors } from "@/constants/colors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "rectangle.stack", selected: "rectangle.stack.fill" }} />
        <Label>Browse</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="scanner">
        <Icon sf={{ default: "camera.viewfinder", selected: "camera.viewfinder" }} />
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
          backgroundColor: isIOS ? "transparent" : isDark ? "#0F1629" : colors.surface,
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
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "#0F1629" : colors.surface }]} />
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
            <MaterialCommunityIcons name={focused ? "cards" : "cards-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: "Scan",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? tabStyles.scanActive : undefined}>
              <Ionicons name={focused ? "scan" : "scan-outline"} size={24} color={focused ? "#FFF" : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: "Collection",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? "pokeball" : "circle-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: "Market",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "storefront" : "storefront-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={24} color={color} />
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
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
