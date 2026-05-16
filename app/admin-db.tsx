import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useThemeColors } from "@/constants/colors";
import { getSuperadminToken } from "@/lib/storage";
import { getApiUrl } from "@/lib/query-client";

type DbColumn = {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
};
type DbRow = Record<string, any>;

const TABLES = [
  { name: "pokescan_users",                   label: "Users",         icon: "people-outline" as const },
  { name: "pokescan_market_listings",          label: "Listings",      icon: "cart-outline" as const },
  { name: "pokescan_collections",              label: "Collections",   icon: "albums-outline" as const },
  { name: "pokescan_messages",                 label: "Messages",      icon: "mail-outline" as const },
  { name: "pokescan_friendships",              label: "Friendships",   icon: "heart-outline" as const },
  { name: "pokescan_reports",                  label: "Reports",       icon: "flag-outline" as const },
  { name: "pokescan_chatroom_messages",        label: "Chat",          icon: "chatbubbles-outline" as const },
  { name: "pokescan_admin_activity_log",       label: "Audit Log",     icon: "list-outline" as const },
  { name: "pokescan_scan_history",             label: "Scans",         icon: "scan-outline" as const },
  { name: "pokescan_blocked_credentials",      label: "Blocklist",     icon: "ban-outline" as const },
  { name: "pokescan_sessions",                 label: "Sessions",      icon: "key-outline" as const },
  { name: "pokescan_collector_verifications",  label: "Verifications", icon: "ribbon-outline" as const },
  { name: "pokemon_sets",                      label: "TCG Sets",      icon: "library-outline" as const },
  { name: "pokemon_cards",                     label: "TCG Cards",     icon: "card-outline" as const },
  { name: "card_pricing",                      label: "Pricing",       icon: "pricetag-outline" as const },
  { name: "ebay_prices",                       label: "eBay",          icon: "cash-outline" as const },
  { name: "sync_status",                       label: "Sync Status",   icon: "sync-outline" as const },
  { name: "users",                             label: "Legacy Users",  icon: "person-outline" as const },
];

async function adminFetch(path: string, opts?: RequestInit) {
  const token = await getSuperadminToken();
  if (!token) throw new Error("Not authenticated");
  const base = getApiUrl();
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts?.headers || {}) },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json;
}

function formatCellValue(val: any): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "true" : "false";
  const s = String(val);
  if (s.length > 60) return s.slice(0, 57) + "…";
  return s;
}

function getPrimaryDisplayCols(columns: DbColumn[], pk: string): string[] {
  const skip = new Set([pk, "password_hash", "password", "avatar_url", "front_photo", "back_photo", "photos", "identification", "tcg_api_results", "pcv_results", "thumbnail", "image_small", "image_large", "logo_url", "symbol_url", "image_url"]);
  const preferred = ["username", "email", "display_name", "card_name", "name", "action", "status", "role", "body", "subject", "sender_username", "user_name", "card_id", "user_id", "requester_id"];
  const cols = columns.map(c => c.column_name).filter(c => !skip.has(c));
  const ordered: string[] = [];
  for (const p of preferred) { if (cols.includes(p)) ordered.push(p); }
  for (const c of cols) { if (!ordered.includes(c)) ordered.push(c); }
  return ordered.slice(0, 4);
}

function RowEditorModal({
  visible,
  row,
  columns,
  pk,
  tableName,
  colors,
  onClose,
  onSaved,
  onDeleted,
}: {
  visible: boolean;
  row: DbRow | null;
  columns: DbColumn[];
  pk: string;
  tableName: string;
  colors: ReturnType<typeof useThemeColors>;
  onClose: () => void;
  onSaved: (row: DbRow) => void;
  onDeleted: (id: string) => void;
}) {
  const isNew = !row;
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      const init: Record<string, string> = {};
      for (const col of columns) {
        if (row) init[col.column_name] = row[col.column_name] === null || row[col.column_name] === undefined ? "" : String(row[col.column_name]);
        else init[col.column_name] = "";
      }
      setForm(init);
    }
  }, [visible, row, columns]);

  const editableCols = columns.filter(c => {
    if (isNew) return c.column_name !== pk || !c.column_default;
    return c.column_name !== pk;
  });

  const isLong = (col: DbColumn) => ["text", "character varying"].includes(col.data_type);

  const handleSave = async () => {
    setSaving(true);
    try {
      const pkVal = row?.[pk];
      let result: any;
      if (isNew) {
        const body: Record<string, any> = {};
        for (const [k, v] of Object.entries(form)) { if (v !== "") body[k] = v; }
        result = await adminFetch(`/api/admin/db/table/${tableName}`, { method: "POST", body: JSON.stringify(body) });
      } else {
        const body: Record<string, any> = {};
        for (const col of editableCols) { body[col.column_name] = form[col.column_name] === "" ? null : form[col.column_name]; }
        result = await adminFetch(`/api/admin/db/table/${tableName}/${pkVal}`, { method: "PATCH", body: JSON.stringify(body) });
      }
      onSaved(result.row);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    const pkVal = row?.[pk];
    Alert.alert("Delete Row", `Permanently delete this row (${pk}: ${pkVal})?\n\nThis cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          setDeleting(true);
          try {
            await adminFetch(`/api/admin/db/table/${tableName}/${pkVal}`, { method: "DELETE" });
            onDeleted(String(pkVal));
          } catch (e: any) {
            Alert.alert("Error", e.message || "Delete failed");
          } finally {
            setDeleting(false);
          }
        }
      }
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[s.modalHeader, { paddingTop: insets.top + 16, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Pressable onPress={onClose} style={s.modalBack}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[s.modalTitle, { color: colors.text }]}>{isNew ? "New Row" : "Edit Row"}</Text>
              <Text style={[s.modalSub, { color: colors.textMuted }]}>{tableName}</Text>
            </View>
            {!isNew && (
              <Pressable
                onPress={handleDelete}
                disabled={deleting}
                style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(231,76,60,0.15)", alignItems: "center", justifyContent: "center", marginRight: 8 }}
              >
                {deleting ? <ActivityIndicator size="small" color="#E74C3C" /> : <Ionicons name="trash-outline" size={18} color="#E74C3C" />}
              </Pressable>
            )}
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.accent, flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="checkmark" size={16} color="#FFF" />}
              <Text style={{ fontFamily: "Outfit_700Bold", fontSize: 14, color: "#FFF" }}>Save</Text>
            </Pressable>
          </View>

          {!isNew && row && (
            <View style={{ backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontFamily: "Outfit_400Regular", fontSize: 12, color: colors.textMuted }}>
                {pk}: <Text style={{ color: colors.text, fontFamily: "Outfit_500Medium" }}>{String(row[pk])}</Text>
              </Text>
            </View>
          )}

          <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
            {editableCols.map(col => {
              const isReadonly = !isNew && col.column_name === pk;
              const multiline = isLong(col) && (form[col.column_name]?.length ?? 0) > 60;
              return (
                <View key={col.column_name} style={{ gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontFamily: "Outfit_600SemiBold", fontSize: 13, color: colors.text }}>{col.column_name}</Text>
                    <Text style={{ fontFamily: "Outfit_400Regular", fontSize: 11, color: colors.textMuted }}>{col.data_type}</Text>
                    {col.is_nullable === "NO" && <Text style={{ fontSize: 10, color: colors.error, fontFamily: "Outfit_700Bold" }}>required</Text>}
                  </View>
                  <TextInput
                    value={form[col.column_name] ?? ""}
                    onChangeText={v => setForm(prev => ({ ...prev, [col.column_name]: v }))}
                    editable={!isReadonly}
                    multiline={multiline}
                    numberOfLines={multiline ? 4 : 1}
                    placeholder={col.column_default ? `default: ${col.column_default.slice(0, 40)}` : col.is_nullable === "YES" ? "null" : "required"}
                    placeholderTextColor={colors.textMuted}
                    style={[
                      s.fieldInput,
                      { backgroundColor: isReadonly ? colors.surface : colors.card, borderColor: colors.border, color: isReadonly ? colors.textMuted : colors.text },
                      multiline && { minHeight: 80, textAlignVertical: "top", paddingTop: 10 },
                    ]}
                  />
                </View>
              );
            })}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function AdminDbScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const [tableRowCounts, setTableRowCounts] = useState<Record<string, number>>({});
  const [countsLoading, setCountsLoading] = useState(true);

  const [selectedTable, setSelectedTable] = useState<string>(TABLES[0].name);
  const [columns, setColumns] = useState<DbColumn[]>([]);
  const [pk, setPk] = useState<string>("id");
  const [rows, setRows] = useState<DbRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<string>("");

  const [editorVisible, setEditorVisible] = useState(false);
  const [editingRow, setEditingRow] = useState<DbRow | null>(null);

  const PAGE_SIZE = 50;

  useEffect(() => {
    adminFetch("/api/admin/db/tables")
      .then((d: any) => {
        const counts: Record<string, number> = {};
        for (const t of d.tables) counts[t.name] = t.rowCount;
        setTableRowCounts(counts);
      })
      .catch(() => {})
      .finally(() => setCountsLoading(false));
  }, []);

  const loadSchema = useCallback(async (table: string) => {
    try {
      const d = await adminFetch(`/api/admin/db/table/${table}/schema`);
      setColumns(d.columns);
      setPk(d.pk);
    } catch (e: any) {
      Alert.alert("Schema Error", e.message);
    }
  }, []);

  const loadRows = useCallback(async (table: string, p: number, q: string, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE), search: q });
      const d = await adminFetch(`/api/admin/db/table/${table}?${params}`);
      setTotal(d.total);
      if (append) setRows(prev => [...prev, ...d.rows]);
      else setRows(d.rows);
    } catch (e: any) {
      Alert.alert("Load Error", e.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const selectTable = useCallback(async (name: string) => {
    setSelectedTable(name);
    setSearch("");
    searchRef.current = "";
    setPage(1);
    setRows([]);
    await Promise.all([loadSchema(name), loadRows(name, 1, "")]);
  }, [loadSchema, loadRows]);

  useEffect(() => { selectTable(TABLES[0].name); }, []);

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    searchRef.current = q;
    setPage(1);
    loadRows(selectedTable, 1, q);
  }, [selectedTable, loadRows]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || rows.length >= total) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadRows(selectedTable, nextPage, searchRef.current, true);
  }, [loadingMore, rows.length, total, page, selectedTable, loadRows]);

  const openEditor = (row: DbRow | null) => {
    setEditingRow(row);
    setEditorVisible(true);
  };

  const handleSaved = (savedRow: DbRow) => {
    setEditorVisible(false);
    if (editingRow) {
      setRows(prev => prev.map(r => r[pk] === savedRow[pk] ? savedRow : r));
    } else {
      setRows(prev => [savedRow, ...prev]);
      setTotal(prev => prev + 1);
    }
    setTableRowCounts(prev => ({ ...prev, [selectedTable]: (prev[selectedTable] ?? 0) + (editingRow ? 0 : 1) }));
  };

  const handleDeleted = (id: string) => {
    setEditorVisible(false);
    setRows(prev => prev.filter(r => String(r[pk]) !== id));
    setTotal(prev => prev - 1);
    setTableRowCounts(prev => ({ ...prev, [selectedTable]: Math.max(0, (prev[selectedTable] ?? 1) - 1) }));
  };

  const [resyncVisible, setResyncVisible] = useState(false);
  const [resyncState, setResyncState] = useState<{
    running: boolean;
    phase: string;
    setsProcessed: number;
    setsTotal: number;
    cardsProcessed: number;
    message: string;
    error: string | null;
    done: boolean;
  }>({ running: false, phase: "", setsProcessed: 0, setsTotal: 0, cardsProcessed: 0, message: "", error: null, done: false });
  const resyncPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const stopResyncPoll = useCallback(() => {
    if (resyncPollRef.current) { clearInterval(resyncPollRef.current); resyncPollRef.current = null; }
  }, []);

  const pollResync = useCallback(async () => {
    try {
      const d = await adminFetch("/api/admin/resync-progress");
      const p = d.progress;
      const running = d.running as boolean;
      const error = d.error as string | null;
      const done = !running && d.finishedAt != null;

      const setsProcessed = p?.setsProcessed ?? 0;
      const setsTotal = p?.setsTotal ?? 0;
      const cardsProcessed = p?.cardsProcessed ?? 0;
      const phase = p?.phase ?? (running ? "starting" : "");
      const message = p?.message ?? "";

      const pct = setsTotal > 0 ? Math.min(setsProcessed / setsTotal, 1) : (running ? 0.02 : (done ? 1 : 0));
      Animated.timing(progressAnim, { toValue: pct, duration: 300, useNativeDriver: false }).start();

      setResyncState({ running, phase, setsProcessed, setsTotal, cardsProcessed, message, error, done });

      if (!running) { stopResyncPoll(); }
    } catch { stopResyncPoll(); }
  }, [progressAnim, stopResyncPoll]);

  const handleFullResync = () => {
    Alert.alert(
      "Full Resync",
      "This will clear and rebuild card variants and pricing data. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Resync",
          style: "destructive",
          onPress: async () => {
            try {
              await adminFetch("/api/admin/full-resync", { method: "POST" });
              progressAnim.setValue(0);
              setResyncState({ running: true, phase: "starting", setsProcessed: 0, setsTotal: 0, cardsProcessed: 0, message: "Initialising…", error: null, done: false });
              setResyncVisible(true);
              stopResyncPoll();
              resyncPollRef.current = setInterval(pollResync, 1500);
            } catch (e: any) {
              Alert.alert("Resync Failed", e.message || "Full resync failed");
            }
          },
        },
      ]
    );
  };

  useEffect(() => () => stopResyncPoll(), [stopResyncPoll]);

  const displayCols = getPrimaryDisplayCols(columns, pk);
  const tableInfo = TABLES.find(t => t.name === selectedTable);

  const renderRow = ({ item }: { item: DbRow }) => (
    <Pressable
      onPress={() => openEditor(item)}
      style={({ pressed }) => [s.rowCard, { backgroundColor: pressed ? colors.surface : colors.card, borderColor: colors.border }]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        {displayCols.map((col, idx) => (
          <View key={col} style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
            <Text style={{ fontFamily: "Outfit_500Medium", fontSize: 11, color: colors.textMuted, minWidth: 80 }} numberOfLines={1}>{col}</Text>
            <Text style={{ fontFamily: idx === 0 ? "Outfit_600SemiBold" : "Outfit_400Regular", fontSize: idx === 0 ? 13 : 12, color: idx === 0 ? colors.text : colors.textSecondary, flex: 1 }} numberOfLines={1}>
              {formatCellValue(item[col])}
            </Text>
          </View>
        ))}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { paddingTop: insets.top + 10, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>Database Editor</Text>
          <Text style={[s.headerSub, { color: colors.textMuted }]}>{selectedTable} · {total.toLocaleString()} rows</Text>
        </View>
        <Pressable
          onPress={() => openEditor(null)}
          style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="add" size={20} color="#FFF" />
        </Pressable>
        <Pressable
          onPress={handleFullResync}
          style={{ marginLeft: 8, paddingHorizontal: 12, height: 36, borderRadius: 10, backgroundColor: colors.pokemonRed, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}
        >
          <Ionicons name="refresh" size={18} color="#FFF" />
          <Text style={{ fontFamily: "Outfit_700Bold", fontSize: 13, color: "#FFF" }}>Full Resync</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}
        style={{ maxHeight: 56, borderBottomWidth: 1, borderBottomColor: colors.border }}
      >
        {TABLES.map(t => {
          const active = t.name === selectedTable;
          const count = tableRowCounts[t.name];
          return (
            <Pressable
              key={t.name}
              onPress={() => selectTable(t.name)}
              style={[s.tableChip, { backgroundColor: active ? colors.accent : colors.surface, borderColor: active ? colors.accent : colors.border }]}
            >
              <Ionicons name={t.icon} size={14} color={active ? "#FFF" : colors.text} />
              <Text style={{ fontFamily: "Outfit_600SemiBold", fontSize: 12, color: active ? "#FFF" : colors.text }}>{t.label}</Text>
              {count !== undefined && (
                <View style={{ backgroundColor: active ? "rgba(255,255,255,0.25)" : colors.background, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 }}>
                  <Text style={{ fontFamily: "Outfit_700Bold", fontSize: 10, color: active ? "#FFF" : colors.textMuted }}>{count.toLocaleString()}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={[s.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={handleSearch}
            placeholder={`Search ${tableInfo?.label ?? selectedTable}…`}
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, fontFamily: "Outfit_400Regular", fontSize: 14, color: colors.text }}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => handleSearch("")}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={{ fontFamily: "Outfit_400Regular", fontSize: 14, color: colors.textMuted }}>Loading {tableInfo?.label}…</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => String(r[pk])}
          renderItem={renderRow}
          contentContainerStyle={{ padding: 12, gap: 6, paddingBottom: insets.bottom + 80 }}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: "center", gap: 12 }}>
              <Ionicons name="server-outline" size={40} color={colors.textMuted} />
              <Text style={{ fontFamily: "Outfit_600SemiBold", fontSize: 16, color: colors.text }}>No rows found</Text>
              <Text style={{ fontFamily: "Outfit_400Regular", fontSize: 13, color: colors.textMuted, textAlign: "center" }}>
                {search ? "Try a different search term." : "This table is empty."}
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16, alignItems: "center" }}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : rows.length < total && rows.length > 0 ? (
              <Pressable
                onPress={handleLoadMore}
                style={{ margin: 12, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}
              >
                <Text style={{ fontFamily: "Outfit_600SemiBold", fontSize: 14, color: colors.accent }}>
                  Load more ({total - rows.length} remaining)
                </Text>
              </Pressable>
            ) : rows.length > 0 ? (
              <Text style={{ textAlign: "center", padding: 16, fontFamily: "Outfit_400Regular", fontSize: 12, color: colors.textMuted }}>
                All {total.toLocaleString()} rows loaded
              </Text>
            ) : null
          }
        />
      )}

      <RowEditorModal
        visible={editorVisible}
        row={editingRow}
        columns={columns}
        pk={pk}
        tableName={selectedTable}
        colors={colors}
        onClose={() => setEditorVisible(false)}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />

      {/* ── Full Resync Progress Modal ── */}
      <Modal visible={resyncVisible} transparent animationType="fade" onRequestClose={() => { if (!resyncState.running) setResyncVisible(false); }}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View style={{ width: "100%", maxWidth: 360, backgroundColor: colors.card, borderRadius: 20, padding: 24, gap: 16 }}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              {resyncState.running
                ? <ActivityIndicator color={colors.accent} size="small" />
                : resyncState.error
                  ? <Ionicons name="close-circle" size={20} color={colors.error} />
                  : <Ionicons name="checkmark-circle" size={20} color="#2ECC71" />
              }
              <Text style={{ fontFamily: "Outfit_700Bold", fontSize: 17, color: colors.text, flex: 1 }}>
                {resyncState.running ? "Full Resync Running" : resyncState.error ? "Resync Failed" : "Resync Complete"}
              </Text>
            </View>

            {/* Progress bar */}
            <View style={{ height: 8, backgroundColor: colors.surface, borderRadius: 4, overflow: "hidden" }}>
              <Animated.View style={{
                height: "100%",
                borderRadius: 4,
                backgroundColor: resyncState.error ? colors.error : resyncState.done ? "#2ECC71" : colors.accent,
                width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
              }} />
            </View>

            {/* Stats */}
            <View style={{ gap: 6 }}>
              {resyncState.setsTotal > 0 && (
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontFamily: "Outfit_400Regular", fontSize: 13, color: colors.textMuted }}>Sets</Text>
                  <Text style={{ fontFamily: "Outfit_600SemiBold", fontSize: 13, color: colors.text }}>
                    {resyncState.setsProcessed.toLocaleString()} / {resyncState.setsTotal.toLocaleString()}
                  </Text>
                </View>
              )}
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: "Outfit_400Regular", fontSize: 13, color: colors.textMuted }}>Cards processed</Text>
                <Text style={{ fontFamily: "Outfit_600SemiBold", fontSize: 13, color: colors.text }}>{resyncState.cardsProcessed.toLocaleString()}</Text>
              </View>
              {resyncState.phase !== "" && (
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontFamily: "Outfit_400Regular", fontSize: 13, color: colors.textMuted }}>Phase</Text>
                  <Text style={{ fontFamily: "Outfit_600SemiBold", fontSize: 13, color: colors.text, textTransform: "capitalize" }}>{resyncState.phase}</Text>
                </View>
              )}
            </View>

            {/* Status message */}
            {(resyncState.message || resyncState.error) && (
              <View style={{ backgroundColor: resyncState.error ? "rgba(231,76,60,0.1)" : colors.surface, borderRadius: 10, padding: 10 }}>
                <Text style={{ fontFamily: "Outfit_400Regular", fontSize: 12, color: resyncState.error ? colors.error : colors.textSecondary }} numberOfLines={3}>
                  {resyncState.error || resyncState.message}
                </Text>
              </View>
            )}

            {/* Close button — only shown when not running */}
            {!resyncState.running && (
              <Pressable
                onPress={() => setResyncVisible(false)}
                style={{ paddingVertical: 12, borderRadius: 12, backgroundColor: resyncState.error ? colors.error : colors.accent, alignItems: "center" }}
              >
                <Text style={{ fontFamily: "Outfit_700Bold", fontSize: 15, color: "#FFF" }}>
                  {resyncState.error ? "Dismiss" : "Done"}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
  },
  headerSub: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
  },
  tableChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  modalBack: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
  },
  modalSub: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
  },
  fieldInput: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
