import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  FlatList,
  TextInput,
  Modal,
  ActivityIndicator,
  ScrollView,
  useColorScheme,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useThemeColors } from "@/constants/colors";
import { useUser } from "@/lib/user-context";
import { socialApi, InboxMessage, SentMessage, SocialUser, FriendsData, ChatroomMessage } from "@/lib/social-api";

const CHAT_RULES_KEY = "pokescan_chat_rules_accepted_v1";

type Tab = "inbox" | "sent" | "friends" | "chat";

function Avatar({ uri, name, size = 40, colors }: { uri?: string | null; name: string; size?: number; colors: any }) {
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.pokemonRed + "30", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: size * 0.4, fontFamily: "Outfit_700Bold", color: colors.pokemonRed }}>{name?.[0]?.toUpperCase() ?? "?"}</Text>
    </View>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ─── Compose Modal ────────────────────────────────────────────────────────────
function ComposeModal({
  visible,
  onClose,
  onSent,
  prefilledRecipient,
  colors,
  colorScheme,
}: {
  visible: boolean;
  onClose: () => void;
  onSent: () => void;
  prefilledRecipient?: SocialUser | null;
  colors: any;
  colorScheme: "dark" | "light" | null | undefined;
}) {
  const [recipient, setRecipient] = useState<SocialUser | null>(prefilledRecipient ?? null);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<SocialUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setRecipient(prefilledRecipient ?? null);
      setSearchQ("");
      setSearchResults([]);
      setSubject("");
      setBody("");
    }
  }, [visible, prefilledRecipient]);

  const handleSearchChange = (q: string) => {
    setSearchQ(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const data = await socialApi.searchUsers(q);
        setSearchResults(data.users);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 400);
  };

  const handleSend = async () => {
    if (!recipient) { Alert.alert("No recipient", "Search for and select a recipient."); return; }
    if (!body.trim()) { Alert.alert("Empty message", "Please write a message."); return; }
    setSending(true);
    try {
      await socialApi.sendMessage(recipient.id, subject.trim(), body.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSent();
      onClose();
    } catch (e: any) {
      Alert.alert("Failed to send", e.message || "Could not send message.");
    } finally { setSending(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[styles.composeHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Pressable onPress={onClose} style={styles.composeClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.composeTitle, { color: colors.text }]}>New Message</Text>
            <View style={styles.composeSendBtn} />
          </View>

          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
            <View style={[styles.composeField, { borderColor: colors.border }]}>
              <Text style={[styles.composeLabel, { color: colors.textMuted }]}>To</Text>
              {recipient ? (
                <View style={styles.recipientChip}>
                  <Avatar uri={recipient.avatarUrl} name={recipient.displayName} size={24} colors={colors} />
                  <Text style={[styles.recipientChipText, { color: colors.text }]}>{recipient.displayName}</Text>
                  <Pressable onPress={() => { setRecipient(null); setSearchQ(""); }}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
              ) : (
                <TextInput
                  style={[styles.composeInput, { color: colors.text }]}
                  placeholder="Search username..."
                  placeholderTextColor={colors.textMuted}
                  value={searchQ}
                  onChangeText={handleSearchChange}
                  autoCapitalize="none"
                />
              )}
            </View>

            {!recipient && (searchResults.length > 0 || searching) && (
              <View style={[styles.searchDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {searching && <ActivityIndicator size="small" color={colors.pokemonRed} style={{ padding: 8 }} />}
                {searchResults.map(u => (
                  <Pressable key={u.id} style={styles.searchResultRow} onPress={() => { setRecipient(u); setSearchQ(""); setSearchResults([]); }}>
                    <Avatar uri={u.avatarUrl} name={u.displayName} size={32} colors={colors} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.searchResultName, { color: colors.text }]}>{u.displayName}</Text>
                      <Text style={[styles.searchResultUser, { color: colors.textMuted }]}>@{u.username}</Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={20} color={colors.pokemonRed} />
                  </Pressable>
                ))}
              </View>
            )}

            <View style={[styles.composeField, { borderColor: colors.border }]}>
              <Text style={[styles.composeLabel, { color: colors.textMuted }]}>Subject</Text>
              <TextInput
                style={[styles.composeInput, { color: colors.text }]}
                placeholder="Optional subject..."
                placeholderTextColor={colors.textMuted}
                value={subject}
                onChangeText={setSubject}
              />
            </View>

            <View style={[styles.composeBodyWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                style={[styles.composeBody, { color: colors.text }]}
                placeholder="Write your message..."
                placeholderTextColor={colors.textMuted}
                value={body}
                onChangeText={setBody}
                multiline
                textAlignVertical="top"
              />
              <Pressable
                onPress={handleSend}
                disabled={sending || !body.trim() || !recipient}
                style={[
                  styles.composeBodySendBtn,
                  { backgroundColor: (sending || !body.trim() || !recipient) ? colors.border : colors.pokemonRed },
                ]}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#FFF" />
                    <Text style={styles.composeBodySendText}>Send</Text>
                  </>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const MESSAGE_REPORT_REASONS = ["Harassment or abuse", "Spam", "Threats", "Inappropriate content", "Other"];

// ─── Message Detail Modal ─────────────────────────────────────────────────────
function MessageDetailModal({
  message,
  isSent,
  onClose,
  onDelete,
  onReply,
  onReport,
  colors,
}: {
  message: InboxMessage | SentMessage | null;
  isSent: boolean;
  onClose: () => void;
  onDelete: () => void;
  onReply?: () => void;
  onReport?: (reason: string) => void;
  colors: any;
}) {
  if (!message) return null;
  const name = isSent ? (message as SentMessage).recipientDisplayName : (message as InboxMessage).senderDisplayName;
  const username = isSent ? (message as SentMessage).recipientUsername : (message as InboxMessage).senderUsername;
  const avatarUrl = isSent ? (message as SentMessage).recipientAvatarUrl : (message as InboxMessage).senderAvatarUrl;

  const handleReport = () => {
    if (!onReport) return;
    Alert.alert(
      "Report Message",
      "Why are you reporting this message?",
      [
        ...MESSAGE_REPORT_REASONS.map(reason => ({
          text: reason,
          onPress: () => onReport(reason),
        })),
        { text: "Cancel", style: "cancel" as const },
      ]
    );
  };

  return (
    <Modal visible={!!message} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.composeHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} style={styles.composeClose}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.composeTitle, { color: colors.text }]} numberOfLines={1}>
            {message.subject || "(no subject)"}
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {!isSent && onReport && (
              <Pressable onPress={handleReport}>
                <Ionicons name="flag-outline" size={20} color={colors.error} />
              </Pressable>
            )}
            {!isSent && onReply && (
              <Pressable onPress={onReply}>
                <Ionicons name="return-up-back-outline" size={22} color={colors.pokemonBlue} />
              </Pressable>
            )}
            <Pressable onPress={onDelete}>
              <Ionicons name="trash-outline" size={22} color={colors.error} />
            </Pressable>
          </View>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <View style={[styles.msgDetailHeader, { backgroundColor: colors.card }]}>
            <Avatar uri={avatarUrl} name={name} size={44} colors={colors} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.msgDetailName, { color: colors.text }]}>{name}</Text>
              <Text style={[styles.msgDetailUser, { color: colors.textMuted }]}>@{username} · {timeAgo(message.createdAt)}</Text>
            </View>
          </View>
          <Text style={[styles.msgDetailBody, { color: colors.text }]}>{message.body}</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MessagesScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const params = useLocalSearchParams<{ recipientId?: string; recipientName?: string; recipientUsername?: string }>();

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const [activeTab, setActiveTab] = useState<Tab>("inbox");
  const [inbox, setInbox] = useState<InboxMessage[]>([]);
  const [sent, setSent] = useState<SentMessage[]>([]);
  const [friends, setFriends] = useState<FriendsData>({ friends: [], pendingReceived: [], pendingSent: [] });
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [prefilledRecipient, setPrefilledRecipient] = useState<SocialUser | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | SentMessage | null>(null);
  const [selectedIsSent, setSelectedIsSent] = useState(false);

  const [friendSearchQ, setFriendSearchQ] = useState("");
  const [friendSearchResults, setFriendSearchResults] = useState<SocialUser[]>([]);
  const [friendSearching, setFriendSearching] = useState(false);
  const [requestingIds, setRequestingIds] = useState<Set<string>>(new Set());
  const friendSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [chatroomMessages, setChatroomMessages] = useState<ChatroomMessage[]>([]);
  const [chatroomInput, setChatroomInput] = useState("");
  const [chatroomSending, setChatroomSending] = useState(false);
  const [chatroomLoading, setChatroomLoading] = useState(false);
  const [chatroomError, setChatroomError] = useState<string | null>(null);
  const [showChatRules, setShowChatRules] = useState(false);
  const chatroomPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatListRef = useRef<FlatList>(null);

  const isStaff = user?.role === "admin" || user?.role === "moderator";

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [inboxData, sentData, friendsData] = await Promise.all([
        socialApi.getInbox(),
        socialApi.getSent(),
        socialApi.getFriends(),
      ]);
      setInbox(inboxData.messages);
      setSent(sentData.messages);
      setFriends(friendsData);
    } catch (e) {
      console.error("Social load error:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const loadChatroom = useCallback(async () => {
    if (!user?.isPremium && !isStaff) return;
    try {
      const data = await socialApi.getChatroomMessages();
      setChatroomMessages(data.messages);
      setChatroomError(null);
    } catch (e: any) {
      if (e.message?.includes("banned")) {
        setChatroomError("banned");
      }
    }
  }, [user, isStaff]);

  useEffect(() => {
    if (activeTab === "chat") {
      AsyncStorage.getItem(CHAT_RULES_KEY).then(val => {
        if (!val) setShowChatRules(true);
      });
      setChatroomLoading(true);
      loadChatroom().finally(() => setChatroomLoading(false));
      chatroomPollRef.current = setInterval(loadChatroom, 10000);
    }
    return () => {
      if (chatroomPollRef.current) {
        clearInterval(chatroomPollRef.current);
        chatroomPollRef.current = null;
      }
    };
  }, [activeTab, loadChatroom]);

  const handleAcceptChatRules = useCallback(async () => {
    await AsyncStorage.setItem(CHAT_RULES_KEY, "1");
    setShowChatRules(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleSendChatroom = useCallback(async () => {
    if (!chatroomInput.trim() || chatroomSending) return;
    setChatroomSending(true);
    try {
      const { message: newMsg } = await socialApi.sendChatroomMessage(chatroomInput.trim());
      setChatroomMessages(prev => [...prev, newMsg]);
      setChatroomInput("");
      setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      const msg = e.message || "Failed to send message";
      if (msg.includes("muted")) {
        Alert.alert("Muted", "You are currently muted and cannot send messages.");
      } else if (msg.includes("banned")) {
        Alert.alert("Banned", "You are banned from the chat.");
      } else {
        Alert.alert("Error", msg);
      }
    } finally {
      setChatroomSending(false);
    }
  }, [chatroomInput, chatroomSending]);

  const handleDeleteChatroomMsg = useCallback((msgId: string) => {
    Alert.alert("Delete message", "Remove this message?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await socialApi.deleteChatroomMessage(msgId);
            setChatroomMessages(prev => prev.filter(m => m.id !== msgId));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } catch { }
        },
      },
    ]);
  }, []);

  const showModActions = useCallback((senderId: string, senderName: string) => {
    if (!isStaff || senderId === user?.id) return;
    const MUTE_OPTIONS = [
      { text: "5 minutes", minutes: 5 },
      { text: "15 minutes", minutes: 15 },
      { text: "30 minutes", minutes: 30 },
      { text: "1 hour", minutes: 60 },
      { text: "6 hours", minutes: 360 },
      { text: "24 hours", minutes: 1440 },
    ];
    const BAN_OPTIONS = [
      { text: "1 hour", minutes: 60 },
      { text: "6 hours", minutes: 360 },
      { text: "24 hours", minutes: 1440 },
      { text: "3 days", minutes: 4320 },
      { text: "7 days", minutes: 10080 },
      { text: "30 days", minutes: 43200 },
    ];

    Alert.alert(
      `Moderate ${senderName}`,
      "Choose an action:",
      [
        {
          text: "Mute (can't send)",
          onPress: () => {
            Alert.alert("Mute Duration", `How long to mute ${senderName}?`, [
              ...MUTE_OPTIONS.map(opt => ({
                text: opt.text,
                onPress: async () => {
                  try {
                    await socialApi.muteChatUser(senderId, opt.minutes);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    Alert.alert("Muted", `${senderName} muted for ${opt.text}`);
                  } catch (e: any) { Alert.alert("Error", e.message || "Failed to mute"); }
                },
              })),
              { text: "Cancel", style: "cancel" },
            ]);
          },
        },
        {
          text: "Ban (can't access chat)",
          style: "destructive",
          onPress: () => {
            Alert.alert("Ban Duration", `How long to ban ${senderName}?`, [
              ...BAN_OPTIONS.map(opt => ({
                text: opt.text,
                onPress: async () => {
                  try {
                    await socialApi.banChatUser(senderId, opt.minutes);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    Alert.alert("Banned", `${senderName} banned for ${opt.text}`);
                  } catch (e: any) { Alert.alert("Error", e.message || "Failed to ban"); }
                },
              })),
              { text: "Cancel", style: "cancel" },
            ]);
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  }, [isStaff, user]);

  // Handle deep link from market "Message Now"
  useEffect(() => {
    if (params.recipientId && params.recipientName) {
      setPrefilledRecipient({
        id: params.recipientId,
        displayName: params.recipientName,
        username: params.recipientUsername ?? "",
      });
      setComposeOpen(true);
    }
  }, [params.recipientId]);

  const handleOpenMessage = useCallback(async (msg: InboxMessage | SentMessage, isSent: boolean) => {
    setSelectedMessage(msg);
    setSelectedIsSent(isSent);
    if (!isSent && !(msg as InboxMessage).isRead) {
      await socialApi.markRead(msg.id).catch(() => {});
      setInbox(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
    }
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (!selectedMessage) return;
    Alert.alert("Delete message", "Remove this message?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await socialApi.deleteMessage(selectedMessage.id).catch(() => {});
          if (selectedIsSent) setSent(prev => prev.filter(m => m.id !== selectedMessage.id));
          else setInbox(prev => prev.filter(m => m.id !== selectedMessage.id));
          setSelectedMessage(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  }, [selectedMessage, selectedIsSent]);

  const handleReply = useCallback(() => {
    if (!selectedMessage || selectedIsSent) return;
    const msg = selectedMessage as InboxMessage;
    setPrefilledRecipient({ id: msg.senderId, displayName: msg.senderDisplayName, username: msg.senderUsername, avatarUrl: msg.senderAvatarUrl });
    setSelectedMessage(null);
    setComposeOpen(true);
  }, [selectedMessage, selectedIsSent]);

  const handleFriendSearch = (q: string) => {
    setFriendSearchQ(q);
    if (friendSearchTimer.current) clearTimeout(friendSearchTimer.current);
    if (q.trim().length < 2) { setFriendSearchResults([]); return; }
    setFriendSearching(true);
    friendSearchTimer.current = setTimeout(async () => {
      try {
        const data = await socialApi.searchUsers(q);
        setFriendSearchResults(data.users);
      } catch { setFriendSearchResults([]); }
      finally { setFriendSearching(false); }
    }, 400);
  };

  const handleSendRequest = async (targetId: string) => {
    setRequestingIds(prev => new Set([...prev, targetId]));
    try {
      await socialApi.sendFriendRequest(targetId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadAll();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not send request.");
    } finally {
      setRequestingIds(prev => { const n = new Set(prev); n.delete(targetId); return n; });
    }
  };

  const handleRespondFriend = async (requesterId: string, action: "accept" | "decline") => {
    try {
      await socialApi.respondToFriend(requesterId, action);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadAll();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not respond.");
    }
  };

  const handleRemoveFriend = (friendId: string, name: string) => {
    Alert.alert("Remove Friend", `Remove ${name} from your friends?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          await socialApi.removeFriend(friendId).catch(() => {});
          await loadAll();
        },
      },
    ]);
  };

  const unread = inbox.filter(m => !m.isRead).length;
  const pendingCount = friends.pendingReceived.length;

  const allFriendIds = new Set([
    ...friends.friends.map(f => f.id),
    ...friends.pendingSent.map(f => f.id),
    ...friends.pendingReceived.map(f => f.id),
  ]);

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8, backgroundColor: colors.card }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="mail-outline" size={56} color={colors.pokemonRed + "40"} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Sign In Required</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={colorScheme === "dark" ? ["#2A0A0A", "#1A1A2E"] : ["#FFF0F0", "#F5F5F5"]}
        style={[styles.header, { paddingTop: (insets.top || webTopInset) + 8 }]}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.tabRow}>
          {([
            { key: "inbox" as Tab, label: "Inbox", badge: unread },
            { key: "sent" as Tab, label: "Sent", badge: 0 },
            { key: "friends" as Tab, label: "Friends", badge: pendingCount },
            { key: "chat" as Tab, label: "Chat", badge: 0 },
          ]).map(({ key, label, badge }) => (
            <Pressable
              key={key}
              style={[styles.tab, activeTab === key && { backgroundColor: colors.pokemonRed }]}
              onPress={() => setActiveTab(key)}
            >
              <Text style={[styles.tabText, { color: activeTab === key ? "#FFF" : colors.textSecondary }]}>{label}</Text>
              {badge > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: activeTab === key ? "#FFF" : colors.pokemonRed }]}>
                  <Text style={[styles.tabBadgeText, { color: activeTab === key ? colors.pokemonRed : "#FFF" }]}>{badge}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.emptyContainer}><ActivityIndicator size="large" color={colors.pokemonRed} /></View>
      ) : (
        <>
          {/* ── Inbox ── */}
          {activeTab === "inbox" && (
            <>
              <FlatList
                data={inbox}
                keyExtractor={m => m.id}
                contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="mail-outline" size={48} color={colors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>No messages yet</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <Pressable
                    style={[styles.msgRow, { backgroundColor: colors.card, borderColor: item.isRead ? colors.border : colors.pokemonRed }]}
                    onPress={() => handleOpenMessage(item, false)}
                  >
                    <Avatar uri={item.senderAvatarUrl} name={item.senderDisplayName} size={42} colors={colors} />
                    <View style={styles.msgContent}>
                      <View style={styles.msgTopRow}>
                        <Text style={[styles.msgSender, { color: colors.text, fontFamily: item.isRead ? "Outfit_500Medium" : "Outfit_700Bold" }]}>
                          {item.senderDisplayName}
                        </Text>
                        <Text style={[styles.msgTime, { color: colors.textMuted }]}>{timeAgo(item.createdAt)}</Text>
                      </View>
                      {item.subject ? <Text style={[styles.msgSubject, { color: item.isRead ? colors.textSecondary : colors.text }]} numberOfLines={1}>{item.subject}</Text> : null}
                      <Text style={[styles.msgPreview, { color: colors.textMuted }]} numberOfLines={1}>{item.body}</Text>
                    </View>
                    {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.pokemonRed }]} />}
                  </Pressable>
                )}
              />
              <Pressable
                style={[styles.fab, { backgroundColor: colors.pokemonRed }]}
                onPress={() => { setPrefilledRecipient(null); setComposeOpen(true); }}
              >
                <Ionicons name="create-outline" size={24} color="#FFF" />
              </Pressable>
            </>
          )}

          {/* ── Sent ── */}
          {activeTab === "sent" && (
            <>
              <FlatList
                data={sent}
                keyExtractor={m => m.id}
                contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="send-outline" size={48} color={colors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>Nothing sent yet</Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <Pressable
                    style={[styles.msgRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handleOpenMessage(item, true)}
                  >
                    <Avatar uri={item.recipientAvatarUrl} name={item.recipientDisplayName} size={42} colors={colors} />
                    <View style={styles.msgContent}>
                      <View style={styles.msgTopRow}>
                        <Text style={[styles.msgSender, { color: colors.text }]}>To: {item.recipientDisplayName}</Text>
                        <Text style={[styles.msgTime, { color: colors.textMuted }]}>{timeAgo(item.createdAt)}</Text>
                      </View>
                      {item.subject ? <Text style={[styles.msgSubject, { color: colors.textSecondary }]} numberOfLines={1}>{item.subject}</Text> : null}
                      <Text style={[styles.msgPreview, { color: colors.textMuted }]} numberOfLines={1}>{item.body}</Text>
                    </View>
                  </Pressable>
                )}
              />
              <Pressable
                style={[styles.fab, { backgroundColor: colors.pokemonRed }]}
                onPress={() => { setPrefilledRecipient(null); setComposeOpen(true); }}
              >
                <Ionicons name="create-outline" size={24} color="#FFF" />
              </Pressable>
            </>
          )}

          {/* ── Friends ── */}
          {activeTab === "friends" && (
            <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }} showsVerticalScrollIndicator={false}>
              <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={18} color={colors.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search users to add..."
                  placeholderTextColor={colors.textMuted}
                  value={friendSearchQ}
                  onChangeText={handleFriendSearch}
                  autoCapitalize="none"
                />
                {friendSearching && <ActivityIndicator size="small" color={colors.pokemonRed} />}
              </View>

              {friendSearchResults.length > 0 && (
                <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
                  <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>RESULTS</Text>
                  {friendSearchResults.map(u => {
                    const already = allFriendIds.has(u.id);
                    return (
                      <View key={u.id} style={[styles.friendRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Avatar uri={u.avatarUrl} name={u.displayName} size={40} colors={colors} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.friendName, { color: colors.text }]}>{u.displayName}</Text>
                          <Text style={[styles.friendUser, { color: colors.textMuted }]}>@{u.username}</Text>
                        </View>
                        {!already ? (
                          <Pressable
                            style={[styles.friendAction, { backgroundColor: colors.pokemonRed }]}
                            onPress={() => handleSendRequest(u.id)}
                            disabled={requestingIds.has(u.id)}
                          >
                            {requestingIds.has(u.id)
                              ? <ActivityIndicator size="small" color="#FFF" />
                              : <Ionicons name="person-add-outline" size={16} color="#FFF" />}
                          </Pressable>
                        ) : (
                          <View style={[styles.friendAction, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
                            <Ionicons name="checkmark" size={16} color={colors.textMuted} />
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {friends.pendingReceived.length > 0 && (
                <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
                  <Text style={[styles.sectionHeader, { color: colors.pokemonRed }]}>REQUESTS ({friends.pendingReceived.length})</Text>
                  {friends.pendingReceived.map(u => (
                    <View key={u.id} style={[styles.friendRow, { backgroundColor: colors.card, borderColor: colors.pokemonRed }]}>
                      <Avatar uri={u.avatarUrl} name={u.displayName} size={40} colors={colors} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.friendName, { color: colors.text }]}>{u.displayName}</Text>
                        <Text style={[styles.friendUser, { color: colors.textMuted }]}>@{u.username}</Text>
                      </View>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <Pressable style={[styles.friendAction, { backgroundColor: colors.success }]} onPress={() => handleRespondFriend(u.id, "accept")}>
                          <Ionicons name="checkmark" size={16} color="#FFF" />
                        </Pressable>
                        <Pressable style={[styles.friendAction, { backgroundColor: colors.error }]} onPress={() => handleRespondFriend(u.id, "decline")}>
                          <Ionicons name="close" size={16} color="#FFF" />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {friends.pendingSent.length > 0 && (
                <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
                  <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>PENDING SENT</Text>
                  {friends.pendingSent.map(u => (
                    <View key={u.id} style={[styles.friendRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Avatar uri={u.avatarUrl} name={u.displayName} size={40} colors={colors} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.friendName, { color: colors.text }]}>{u.displayName}</Text>
                        <Text style={[styles.friendUser, { color: colors.textMuted }]}>@{u.username}</Text>
                      </View>
                      <Text style={[styles.pendingLabel, { color: colors.textMuted }]}>Pending</Text>
                    </View>
                  ))}
                </View>
              )}

              {friends.friends.length > 0 && (
                <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
                  <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>FRIENDS ({friends.friends.length})</Text>
                  {friends.friends.map(u => (
                    <Pressable
                      key={u.id}
                      style={[styles.friendRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onLongPress={() => handleRemoveFriend(u.id, u.displayName)}
                    >
                      <Avatar uri={u.avatarUrl} name={u.displayName} size={40} colors={colors} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.friendName, { color: colors.text }]}>{u.displayName}</Text>
                        <Text style={[styles.friendUser, { color: colors.textMuted }]}>@{u.username}</Text>
                      </View>
                      {u.collectionVisible && (
                        <Pressable
                          style={[styles.friendAction, { backgroundColor: colors.success }]}
                          onPress={() => router.push({ pathname: "/friend-collection", params: { userId: u.id, displayName: u.displayName } })}
                        >
                          <Ionicons name="albums-outline" size={16} color="#FFF" />
                        </Pressable>
                      )}
                      <Pressable
                        style={[styles.friendAction, { backgroundColor: colors.pokemonBlue }]}
                        onPress={() => {
                          setPrefilledRecipient(u);
                          setComposeOpen(true);
                        }}
                      >
                        <Ionicons name="mail-outline" size={16} color="#FFF" />
                      </Pressable>
                    </Pressable>
                  ))}
                  <Text style={[styles.hint, { color: colors.textMuted }]}>Long press a friend to remove them</Text>
                </View>
              )}

              {friends.friends.length === 0 && friends.pendingReceived.length === 0 && friends.pendingSent.length === 0 && friendSearchResults.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={48} color={colors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>No friends yet</Text>
                  <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Search for users above to send a friend request</Text>
                </View>
              )}
            </ScrollView>
          )}

          {activeTab === "chat" && (
            user?.isPremium || isStaff ? (
              <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
                {chatroomLoading ? (
                  <View style={styles.emptyContainer}><ActivityIndicator size="large" color={colors.pokemonRed} /></View>
                ) : (
                  <>
                    <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Ionicons name="diamond" size={14} color={colors.gold} />
                        <Text style={{ fontSize: 13, fontFamily: "Outfit_600SemiBold", color: colors.text }}>Premium Chat</Text>
                        <Text style={{ fontSize: 11, fontFamily: "Outfit_400Regular", color: colors.textMuted, flex: 1 }}>Messages kept for 7 days</Text>
                        {isStaff && <Ionicons name="shield-checkmark" size={14} color="#E67E22" />}
                      </View>
                      {isStaff && (
                        <Text style={{ fontSize: 10, fontFamily: "Outfit_400Regular", color: "#E67E22", marginTop: 2 }}>
                          Long press a message to moderate
                        </Text>
                      )}
                    </View>
                    <FlatList
                      ref={chatListRef}
                      data={chatroomMessages}
                      keyExtractor={m => m.id}
                      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, flexGrow: 1 }}
                      showsVerticalScrollIndicator={false}
                      onContentSizeChange={() => chatListRef.current?.scrollToEnd({ animated: false })}
                      ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                          <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
                          <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>No messages yet</Text>
                          <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Start the conversation with fellow collectors!</Text>
                        </View>
                      }
                      renderItem={({ item }) => {
                        const isOwn = item.senderId === user?.id;
                        return (
                          <Pressable
                            style={{ flexDirection: "row", alignItems: isOwn ? "flex-end" : "flex-start", marginBottom: 10, justifyContent: isOwn ? "flex-end" : "flex-start" }}
                            onLongPress={() => {
                              if (isOwn) {
                                handleDeleteChatroomMsg(item.id);
                              } else if (isStaff) {
                                Alert.alert(
                                  item.senderDisplayName,
                                  "What would you like to do?",
                                  [
                                    { text: "Delete Message", onPress: () => handleDeleteChatroomMsg(item.id) },
                                    { text: "Moderate User", onPress: () => showModActions(item.senderId, item.senderDisplayName) },
                                    { text: "Cancel", style: "cancel" },
                                  ]
                                );
                              }
                            }}
                          >
                            {!isOwn && (
                              <Avatar uri={item.senderAvatarUrl} name={item.senderDisplayName} size={32} colors={colors} />
                            )}
                            <View style={{
                              maxWidth: "75%",
                              marginLeft: isOwn ? 0 : 8,
                              marginRight: isOwn ? 8 : 0,
                              backgroundColor: isOwn ? colors.pokemonRed : colors.card,
                              borderRadius: 16,
                              borderTopLeftRadius: isOwn ? 16 : 4,
                              borderTopRightRadius: isOwn ? 4 : 16,
                              padding: 10,
                              paddingHorizontal: 14,
                              borderWidth: isOwn ? 0 : 1,
                              borderColor: colors.border,
                            }}>
                              {!isOwn && (
                                <Text style={{ fontSize: 11, fontFamily: "Outfit_600SemiBold", color: colors.pokemonRed, marginBottom: 2 }}>
                                  {item.senderDisplayName}
                                </Text>
                              )}
                              <Text style={{ fontSize: 14, fontFamily: "Outfit_400Regular", color: isOwn ? "#FFF" : colors.text }}>
                                {item.body}
                              </Text>
                              <Text style={{ fontSize: 10, fontFamily: "Outfit_400Regular", color: isOwn ? "rgba(255,255,255,0.6)" : colors.textMuted, marginTop: 4, alignSelf: "flex-end" }}>
                                {timeAgo(item.createdAt)}
                              </Text>
                            </View>
                            {isOwn && (
                              <Avatar uri={user?.avatarUrl} name={user?.displayName || "?"} size={32} colors={colors} />
                            )}
                          </Pressable>
                        );
                      }}
                    />
                    <View style={{
                      flexDirection: "row", alignItems: "center", gap: 8,
                      paddingHorizontal: 16, paddingVertical: 10,
                      backgroundColor: colors.card,
                      borderTopWidth: 1, borderTopColor: colors.border,
                      paddingBottom: Platform.OS === "web" ? 44 : Math.max(insets.bottom, 10),
                    }}>
                      <TextInput
                        style={{
                          flex: 1, backgroundColor: colors.background,
                          borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
                          fontSize: 14, fontFamily: "Outfit_400Regular", color: colors.text,
                          borderWidth: 1, borderColor: colors.border,
                        }}
                        placeholder="Say something..."
                        placeholderTextColor={colors.textMuted}
                        value={chatroomInput}
                        onChangeText={setChatroomInput}
                        onSubmitEditing={handleSendChatroom}
                        returnKeyType="send"
                        maxLength={2000}
                      />
                      <Pressable
                        style={{
                          width: 40, height: 40, borderRadius: 20,
                          backgroundColor: chatroomInput.trim() ? colors.pokemonRed : colors.border,
                          alignItems: "center", justifyContent: "center",
                        }}
                        onPress={handleSendChatroom}
                        disabled={!chatroomInput.trim() || chatroomSending}
                      >
                        {chatroomSending
                          ? <ActivityIndicator size="small" color="#FFF" />
                          : <Ionicons name="send" size={18} color="#FFF" />}
                      </Pressable>
                    </View>
                  </>
                )}
              </KeyboardAvoidingView>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="lock-closed-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>Premium Only</Text>
                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Upgrade to Premium to join the chat room and discuss Pokémon with other collectors</Text>
                <Pressable
                  style={{ marginTop: 12, backgroundColor: colors.pokemonRed, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 }}
                  onPress={() => router.push("/premium")}
                >
                  <Text style={{ color: "#FFF", fontFamily: "Outfit_600SemiBold", fontSize: 14 }}>View Plans</Text>
                </Pressable>
              </View>
            )
          )}
        </>
      )}

      <ComposeModal
        visible={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSent={loadAll}
        prefilledRecipient={prefilledRecipient}
        colors={colors}
        colorScheme={colorScheme}
      />

      <MessageDetailModal
        message={selectedMessage}
        isSent={selectedIsSent}
        onClose={() => setSelectedMessage(null)}
        onDelete={handleDeleteSelected}
        onReply={handleReply}
        onReport={async (reason) => {
          if (!selectedMessage) return;
          const msg = selectedMessage as InboxMessage;
          try {
            await socialApi.submitReport(
              "message",
              msg.id,
              reason,
              { subject: msg.subject, body: msg.body, senderUsername: msg.senderUsername },
              msg.senderId
            );
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setSelectedMessage(null);
            Alert.alert("Reported", "Thanks for the report. Our moderation team will review it.");
          } catch (e: any) {
            Alert.alert("Error", e.message === "You already reported this content" ? "You have already reported this message." : "Could not submit report.");
          }
        }}
        colors={colors}
      />

      <Modal visible={showChatRules} transparent animationType="fade" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 20, overflow: "hidden", width: "100%", maxWidth: 380 }}>
            <LinearGradient
              colors={[colors.pokemonRed, "#B71C1C"]}
              style={{ paddingTop: 28, paddingBottom: 20, paddingHorizontal: 24, alignItems: "center" }}
            >
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Ionicons name="shield-checkmark" size={30} color="#FFF" />
              </View>
              <Text style={{ fontSize: 20, fontFamily: "Outfit_700Bold", color: "#FFF", textAlign: "center" }}>
                Moderated Chat
              </Text>
              <Text style={{ fontSize: 13, fontFamily: "Outfit_400Regular", color: "rgba(255,255,255,0.85)", textAlign: "center", marginTop: 4 }}>
                This chat is actively monitored
              </Text>
            </LinearGradient>

            <View style={{ padding: 24, gap: 14 }}>
              {[
                { icon: "happy-outline" as const, text: "Keep it family friendly — no offensive or inappropriate language" },
                { icon: "eye-outline" as const, text: "All messages are checked by our moderation team" },
                { icon: "ban-outline" as const, text: "Mutes and bans will be issued for rule violations" },
                { icon: "card-outline" as const, text: "Keep discussions Pokémon and trading related" },
                { icon: "person-outline" as const, text: "Treat every collector with respect" },
              ].map((rule, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.pokemonRed + "18", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <Ionicons name={rule.icon} size={16} color={colors.pokemonRed} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 13, fontFamily: "Outfit_400Regular", color: colors.text, lineHeight: 20 }}>
                    {rule.text}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
              <Pressable
                onPress={handleAcceptChatRules}
                style={{ backgroundColor: colors.pokemonRed, borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
              >
                <Text style={{ fontSize: 15, fontFamily: "Outfit_700Bold", color: "#FFF" }}>
                  I Understand — Enter Chat
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 0 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 18, fontFamily: "Outfit_700Bold" },
  tabRow: { flexDirection: "row", gap: 8, paddingBottom: 12 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, borderRadius: 10 },
  tabText: { fontSize: 13, fontFamily: "Outfit_600SemiBold" },
  tabBadge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  tabBadgeText: { fontSize: 10, fontFamily: "Outfit_700Bold" },
  msgRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 16, marginTop: 8, padding: 12,
    borderRadius: 12, borderWidth: 1,
  },
  msgContent: { flex: 1 },
  msgTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  msgSender: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  msgTime: { fontSize: 11, fontFamily: "Outfit_400Regular" },
  msgSubject: { fontSize: 13, fontFamily: "Outfit_600SemiBold", marginTop: 2 },
  msgPreview: { fontSize: 12, fontFamily: "Outfit_400Regular", marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 4 },
  fab: { position: "absolute", bottom: 100, right: 20, width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", elevation: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontFamily: "Outfit_600SemiBold" },
  emptySubtext: { fontSize: 13, fontFamily: "Outfit_400Regular", textAlign: "center", paddingHorizontal: 32 },
  composeHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  composeClose: { width: 36 },
  composeTitle: { flex: 1, textAlign: "center", fontSize: 16, fontFamily: "Outfit_700Bold" },
  composeSendBtn: { width: 36, alignItems: "flex-end" },
  composeField: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 8 },
  composeLabel: { fontSize: 13, fontFamily: "Outfit_600SemiBold", width: 52 },
  composeInput: { flex: 1, fontSize: 14, fontFamily: "Outfit_400Regular" },
  composeBodyWrap: { margin: 16, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  composeBody: { padding: 14, fontSize: 15, fontFamily: "Outfit_400Regular", minHeight: 180 },
  composeBodySendBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, margin: 10, borderRadius: 10 },
  composeBodySendText: { color: "#FFF", fontSize: 14, fontFamily: "Outfit_700Bold" },
  recipientChip: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  recipientChipText: { flex: 1, fontSize: 14, fontFamily: "Outfit_500Medium" },
  searchDropdown: { marginHorizontal: 16, marginTop: -4, borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  searchResultRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  searchResultName: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  searchResultUser: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, margin: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Outfit_400Regular" },
  sectionHeader: { fontSize: 11, fontFamily: "Outfit_700Bold", letterSpacing: 1, marginBottom: 8 },
  friendRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  friendName: { fontSize: 14, fontFamily: "Outfit_600SemiBold" },
  friendUser: { fontSize: 12, fontFamily: "Outfit_400Regular" },
  friendAction: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  pendingLabel: { fontSize: 12, fontFamily: "Outfit_500Medium" },
  hint: { fontSize: 11, fontFamily: "Outfit_400Regular", textAlign: "center", marginTop: 4 },
  msgDetailHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, marginBottom: 16 },
  msgDetailName: { fontSize: 15, fontFamily: "Outfit_700Bold" },
  msgDetailUser: { fontSize: 12, fontFamily: "Outfit_400Regular", marginTop: 2 },
  msgDetailBody: { fontSize: 15, fontFamily: "Outfit_400Regular", lineHeight: 22 },
});
