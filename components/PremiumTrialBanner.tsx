// ============================================================
// components/PremiumTrialBanner.tsx
// React Native / Expo version — uses Modal, not web overlay
// ============================================================

import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from "react-native";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "https://pokemon-card-scan.replit.app";

type TrialStatus =
  | { status: "active"; daysLeft: number; hoursLeft: number }
  | { status: "expired" }
  | { status: "paid" }
  | { status: "ineligible" }
  | { status: "none" }
  | null;

interface Props {
  /** Pass your WIP pop-up's visible state. Banner waits for it to close. */
  wipPopupOpen: boolean;
  /** Auth token for the API call — grab from your auth context/store */
  token: string | null;
  /** Where to send the user when they tap "Upgrade". */
  upgradeUrl?: string;
}

export function PremiumTrialBanner({
  wipPopupOpen,
  token,
  upgradeUrl = "https://your-site.com/upgrade", // ← update this
}: Props) {
  const [trialStatus, setTrialStatus] = useState<TrialStatus>(null);
  const [visible, setVisible] = useState(false);

  // Fetch trial status once we have a token
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/auth/trial-status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: TrialStatus) => setTrialStatus(data))
      .catch(() => setTrialStatus(null));
  }, [token]);

  // Show banner only AFTER the WIP pop-up has closed
  useEffect(() => {
    if (wipPopupOpen) return;
    if (!trialStatus) return;
    if (
      trialStatus.status === "active" ||
      trialStatus.status === "expired"
    ) {
      const timer = setTimeout(() => setVisible(true), 400);
      return () => clearTimeout(timer);
    }
  }, [wipPopupOpen, trialStatus]);

  if (!trialStatus) return null;

  const isExpired = trialStatus.status === "expired";
  const daysLeft  = trialStatus.status === "active" ? trialStatus.daysLeft : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.accentBar} />

          <Text style={styles.icon}>{isExpired ? "⏰" : "⚡"}</Text>

          <Text style={styles.heading}>
            {isExpired
              ? "Your free trial has ended"
              : daysLeft === 1
              ? "1 day left on your free trial"
              : `${daysLeft} days left on your free trial`}
          </Text>

          <Text style={styles.body}>
            {isExpired
              ? "Your collection and scan history are safe. Upgrade to keep premium features."
              : daysLeft <= 1
              ? "Your trial ends tomorrow! Upgrade now so you don't lose access."
              : "Enjoying PokéScan Premium? Upgrade before your trial expires."}
          </Text>

          <TouchableOpacity
            style={styles.upgradeBtn}
            onPress={() => { setVisible(false); Linking.openURL(upgradeUrl); }}
          >
            <Text style={styles.upgradeBtnText}>🚀 Upgrade to Premium</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={() => setVisible(false)}
          >
            <Text style={styles.dismissBtnText}>
              {isExpired ? "Continue with free plan" : "Continue free trial"}
            </Text>
          </TouchableOpacity>

          {!isExpired && (
            <Text style={styles.finePrint}>
              Your collection data is always saved.
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex:              1,
    backgroundColor:   "rgba(0,0,0,0.65)",
    justifyContent:    "center",
    alignItems:        "center",
    paddingHorizontal: 20,
  },
  card: {
    width:           "100%",
    maxWidth:        400,
    backgroundColor: "#1a1a2e",
    borderRadius:    16,
    borderWidth:     1,
    borderColor:     "#CC0000",
    overflow:        "hidden",
    alignItems:      "center",
    paddingBottom:   24,
  },
  accentBar: {
    width:           "100%",
    height:          6,
    backgroundColor: "#CC0000",
    marginBottom:    20,
  },
  icon:    { fontSize: 40, marginBottom: 8 },
  heading: {
    color:            "#ffffff",
    fontSize:         18,
    fontWeight:       "700",
    textAlign:        "center",
    marginHorizontal: 24,
    marginBottom:     10,
  },
  body: {
    color:            "#b0b8c8",
    fontSize:         14,
    textAlign:        "center",
    marginHorizontal: 24,
    lineHeight:       20,
    marginBottom:     20,
  },
  upgradeBtn: {
    width:           "85%",
    backgroundColor: "#CC0000",
    borderRadius:    10,
    paddingVertical: 13,
    alignItems:      "center",
    marginBottom:    10,
  },
  upgradeBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  dismissBtn: {
    width:           "85%",
    borderRadius:    10,
    borderWidth:     1,
    borderColor:     "#333",
    paddingVertical: 11,
    alignItems:      "center",
    marginBottom:    8,
  },
  dismissBtnText: { color: "#888", fontSize: 14 },
  finePrint:      { color: "#555", fontSize: 12, marginTop: 4 },
});
