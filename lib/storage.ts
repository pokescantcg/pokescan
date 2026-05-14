import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import { apiRequest, getApiUrl } from "@/lib/query-client";

export type UserRole = "user" | "moderator" | "admin";

export type AuthProvider = "local" | "google" | "outlook" | "facebook" | "twitter";

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  mobileNumber?: string;
  avatarUrl?: string;
  authProvider?: AuthProvider;
  isPremium: boolean;
  role: UserRole;
  createdAt: string;
  subscriptionStatus?: string | null;
  subscriptionPeriodEnd?: string | null;
  stripePriceId?: string | null;
  chatMutedUntil?: string | null;
  chatBannedUntil?: string | null;
  collectionVisible?: boolean;
  isVerifiedCollector?: boolean;
  emailVerified?: boolean;
}

export type CardVariant = "Non-Holo" | "Holo" | "Reverse Holo";

export interface CollectionItem {
  id?: string;
  cardId: string;
  cardName: string;
  cardImage: string;
  setName: string;
  setId: string;
  rarity: string;
  quantity: number;
  condition: string;
  variant?: CardVariant;
  addedAt: string;
  priceGBP: number | null;
  gradingCompany?: string | null;
  grade?: string | null;
  isVerified?: boolean;
  verifiedAt?: string | null;
}

export interface MarketListing {
  id: string;
  userId: string;
  userName: string;
  cardId: string;
  cardName: string;
  cardImage: string;
  setName: string;
  rarity: string;
  type: "trade" | "sale";
  priceGBP: number | null;
  condition: string;
  description: string;
  photos: string[];
  status: "pending" | "approved" | "rejected";
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  reviewNoteUpdatedBy: string | null;
  reviewNoteUpdatedAt: string | null;
  externalUrl: string | null;
  createdAt: string;
}

const KEYS = {
  COLLECTION: "pokescan_collection",
  COLLECTION_CACHE: "pokescan_collection_cache",
  LISTINGS: "pokescan_listings",
  ALL_USERS: "pokescan_all_users",
  SUPERADMIN_FLAG: "pokescan_superadmin",
  SUPERADMIN_TOKEN: "pokescan_superadmin_token",
  LOCAL_USER: "pokescan_local_user",
};

const SCAN_HISTORY_MAX = 20;

export interface ScanHistoryEntry {
  id: string;
  timestamp: string;
  cardName: string;
  setName: string;
  cardNumber: string;
  language: string;
  thumbnail: string | null;
  priceGBP: number | null;
  identification: {
    englishName: string;
    cardNumber: string;
    setName: string;
    language: string;
    holoType: string;
    rarity: string;
    confidence: string;
    originalName: string;
    notes: string;
  };
  tcgApiResults: any[];
  pcvResults: any[];
}

// Two-key pattern (mirrors collection):
//   cache key  — written only by getScanHistory on successful server fetch
//   offline key — written only by addScanToHistory when server is unreachable
// The keys never overlap so a server read can never erase unsynced offline entries.
// Legacy key (pokescan_scan_history_${userId}) is consumed once during migration.

function scanHistoryCacheKey(userId: string): string {
  return `pokescan_scan_history_cache_${userId}`;
}

function scanHistoryOfflineKey(userId: string): string {
  return `pokescan_scan_history_offline_${userId}`;
}

function scanHistoryLegacyKey(userId: string): string {
  return `pokescan_scan_history_${userId}`;
}

async function getScanHistoryCache(userId: string): Promise<ScanHistoryEntry[]> {
  try {
    const data = await AsyncStorage.getItem(scanHistoryCacheKey(userId));
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function saveScanHistoryCache(userId: string, entries: ScanHistoryEntry[]): Promise<void> {
  try {
    await safeSetItem(scanHistoryCacheKey(userId), JSON.stringify(entries));
  } catch {}
}

async function getOfflineScanHistory(userId: string): Promise<ScanHistoryEntry[]> {
  try {
    const data = await AsyncStorage.getItem(scanHistoryOfflineKey(userId));
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function saveOfflineScanHistory(userId: string, entries: ScanHistoryEntry[]): Promise<void> {
  try {
    await safeSetItem(scanHistoryOfflineKey(userId), JSON.stringify(entries));
  } catch {}
}

function mergeScanHistoryEntries(primary: ScanHistoryEntry[], secondary: ScanHistoryEntry[]): ScanHistoryEntry[] {
  const seen = new Set(primary.map((e) => e.id));
  const merged = [...primary, ...secondary.filter((e) => !seen.has(e.id))];
  merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return merged.slice(0, SCAN_HISTORY_MAX);
}

export async function getScanHistory(userId: string): Promise<ScanHistoryEntry[]> {
  const offlineEntries = await getOfflineScanHistory(userId);
  try {
    const token = await getSessionToken();
    if (token) {
      const url = new URL("/api/scan-history", getApiUrl()).href;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const serverEntries = (data.history ?? []) as ScanHistoryEntry[];
        await saveScanHistoryCache(userId, serverEntries);
        return mergeScanHistoryEntries(serverEntries, offlineEntries);
      }
    }
  } catch {}
  const cacheEntries = await getScanHistoryCache(userId);
  return mergeScanHistoryEntries(cacheEntries, offlineEntries);
}

export async function addScanToHistory(
  userId: string,
  entry: Omit<ScanHistoryEntry, "id" | "timestamp">
): Promise<void> {
  let serverSucceeded = false;
  try {
    const token = await getSessionToken();
    if (token) {
      try {
        const url = new URL("/api/scan-history", getApiUrl()).href;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(entry),
        });
        if (res.ok) {
          const data = await res.json();
          await saveScanHistoryCache(userId, (data.history ?? []) as ScanHistoryEntry[]);
          serverSucceeded = true;
        }
      } catch {
        // Server unavailable — write to offline queue below
      }
    }
    if (!serverSucceeded) {
      const offline = await getOfflineScanHistory(userId);
      const newEntry: ScanHistoryEntry = {
        ...entry,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
        timestamp: new Date().toISOString(),
      };
      await saveOfflineScanHistory(userId, [newEntry, ...offline].slice(0, SCAN_HISTORY_MAX));
    }
  } catch {
    // Non-critical
  }
}

export async function clearScanHistory(userId: string): Promise<void> {
  try {
    const token = await getSessionToken();
    if (token) {
      try {
        const url = new URL("/api/scan-history", getApiUrl()).href;
        await fetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      } catch {
        // Server unavailable — still clear both local stores
      }
    }
    await AsyncStorage.removeItem(scanHistoryCacheKey(userId));
    await AsyncStorage.removeItem(scanHistoryOfflineKey(userId));
    await AsyncStorage.removeItem(scanHistoryLegacyKey(userId));
  } catch {}
}

export async function removeScanHistoryEntry(userId: string, entryId: string): Promise<ScanHistoryEntry[]> {
  try {
    const token = await getSessionToken();
    if (token) {
      try {
        const url = new URL(`/api/scan-history/${entryId}`, getApiUrl()).href;
        const res = await fetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          const serverEntries = (data.history ?? []) as ScanHistoryEntry[];
          await saveScanHistoryCache(userId, serverEntries);
          const offline = await getOfflineScanHistory(userId);
          const updatedOffline = offline.filter((e) => e.id !== entryId);
          await saveOfflineScanHistory(userId, updatedOffline);
          return mergeScanHistoryEntries(serverEntries, updatedOffline);
        }
      } catch {
        // Server unavailable — fall through to local delete
      }
    }
    const [cache, offline] = await Promise.all([getScanHistoryCache(userId), getOfflineScanHistory(userId)]);
    const updatedCache = cache.filter((e) => e.id !== entryId);
    const updatedOffline = offline.filter((e) => e.id !== entryId);
    await Promise.all([saveScanHistoryCache(userId, updatedCache), saveOfflineScanHistory(userId, updatedOffline)]);
    return mergeScanHistoryEntries(updatedCache, updatedOffline);
  } catch {
    const [cache, offline] = await Promise.all([getScanHistoryCache(userId), getOfflineScanHistory(userId)]);
    const updatedCache = cache.filter((e) => e.id !== entryId);
    const updatedOffline = offline.filter((e) => e.id !== entryId);
    await Promise.all([saveScanHistoryCache(userId, updatedCache), saveOfflineScanHistory(userId, updatedOffline)]);
    return mergeScanHistoryEntries(updatedCache, updatedOffline);
  }
}

export async function migrateLocalScanHistoryToServer(userId: string): Promise<void> {
  try {
    const token = await getSessionToken();
    if (!token) return;
    // Read from offline queue AND legacy key (for entries written before this change)
    const [offlineEntries, legacyEntries] = await Promise.all([
      getOfflineScanHistory(userId),
      (async () => {
        try {
          const data = await AsyncStorage.getItem(scanHistoryLegacyKey(userId));
          return data ? (JSON.parse(data) as ScanHistoryEntry[]) : [];
        } catch { return []; }
      })(),
    ]);
    const allEntries = mergeScanHistoryEntries(offlineEntries, legacyEntries);
    if (allEntries.length === 0) return;
    const url = new URL("/api/scan-history/bulk", getApiUrl()).href;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ entries: allEntries }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({ failed: 1 }));
      if ((data.failed ?? 0) === 0) {
        await AsyncStorage.removeItem(scanHistoryOfflineKey(userId));
        await AsyncStorage.removeItem(scanHistoryLegacyKey(userId));
      }
    }
  } catch (err) {
    console.error("Scan history migration error:", err);
  }
}

const SESSION_KEY = "pokescan_session_token";

/**
 * Returns the auth token used for admin API requests. The superadmin now logs
 * in via the regular email+password flow, so the admin endpoints accept the
 * regular session token (the server checks role === "admin").
 */
export async function getSuperadminToken(): Promise<string | null> {
  return getSessionToken();
}

async function clearSuperadminToken(): Promise<void> {
  try { await AsyncStorage.removeItem(KEYS.SUPERADMIN_TOKEN); } catch {}
}

async function safeSetItem(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (err: any) {
    if (err?.message?.includes?.("SQLITE_FULL") || err?.message?.includes?.("disk is full")) {
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const cacheKeys = allKeys.filter((k) => k.startsWith("pokescan_cache_cards_"));
        if (cacheKeys.length > 0) {
          await AsyncStorage.multiRemove(cacheKeys);
          console.log(`[Storage] Cleared ${cacheKeys.length} card cache entries to free space`);
          await AsyncStorage.setItem(key, value);
          return;
        }
      } catch {}
      console.warn("[Storage] AsyncStorage full, could not write:", key);
    } else {
      throw err;
    }
  }
}

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    await safeSetItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getSessionToken(): Promise<string | null> {
  return secureGet(SESSION_KEY);
}

export async function saveSessionToken(token: string): Promise<void> {
  await secureSet(SESSION_KEY, token);
}

export async function clearSessionToken(): Promise<void> {
  await secureDelete(SESSION_KEY);
}

export async function restoreSession(): Promise<UserProfile | null> {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    const url = new URL("/api/auth/session", getApiUrl()).href;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (res.status === 401 || res.status === 403) {
      await clearSessionToken();
      return null;
    }
    if (!res.ok) {
      const localUser = await getUser();
      return localUser;
    }
    const data = await res.json();
    if (data.user) {
      const user = dbUserToProfile(data.user);
      await saveLocalUser(user);
      return user;
    }
    await clearSessionToken();
    return null;
  } catch {
    const localUser = await getUser();
    return localUser;
  }
}

export async function registerWithPassword(
  username: string,
  displayName: string,
  email: string,
  password: string,
  mobileNumber?: string
): Promise<{ user: UserProfile; userId: string }> {
  const url = new URL("/api/auth/register", getApiUrl());
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, displayName, email, password, mobileNumber: mobileNumber || "" }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Registration failed");
  }
  const user = dbUserToProfile(data.user);
  await saveSessionToken(data.token);
  await saveLocalUser(user);
  return { user, userId: data.user.id };
}

export async function verifyEmailOtp(email: string, code: string): Promise<void> {
  const url = new URL("/api/auth/verify-email", getApiUrl());
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Verification failed");
}

export async function loginWithPassword(
  credential: string,
  password: string
): Promise<{ user: UserProfile }> {
  const url = new URL("/api/auth/login", getApiUrl());
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Login failed");
  }
  const user = dbUserToProfile(data.user);
  await saveSessionToken(data.token);
  await saveLocalUser(user);
  return { user };
}

export async function verifyPasswordOnly(
  credential: string,
  password: string
): Promise<{
  userId: string;
  hasEmail: boolean;
  hasMobile: boolean;
  maskedEmail: string | null;
  maskedMobile: string | null;
  emailCredential: string | null;
  mobileCredential: string | null;
}> {
  const url = new URL("/api/auth/verify-password", getApiUrl());
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Password verification failed");
  }
  return data;
}

export async function registerUserWithOtp(
  username: string,
  displayName: string,
  email: string,
  mobileNumber: string
): Promise<{ user: UserProfile }> {
  return registerWithPassword(username, displayName, email, "changeme", mobileNumber);
}

export async function sendOtpForRegistration(
  userId: string,
  channel: "email" | "sms"
): Promise<void> {
  const url = new URL("/api/auth/send-otp-register", getApiUrl());
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, channel }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to send verification code");
  }
}

export async function sendOtpForLogin(
  credential: string,
  channel: "email" | "sms"
): Promise<{ userId: string }> {
  const url = new URL("/api/auth/send-otp", getApiUrl());
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential, channel }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to send verification code");
  }
  return data;
}

export async function verifyOtpAndLogin(
  credential: string,
  code: string
): Promise<{ token: string; user: UserProfile }> {
  const url = new URL("/api/auth/verify-otp", getApiUrl());
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential, code }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Verification failed");
  }
  const user = dbUserToProfile(data.user);
  await saveSessionToken(data.token);
  await saveLocalUser(user);
  return { token: data.token, user };
}

export async function logoutUser(): Promise<void> {
  const token = await getSessionToken();
  if (token) {
    try {
      await apiRequest("POST", "/api/auth/logout", { token });
    } catch {}
  }
  await clearSessionToken();
  await clearSuperadminToken();
  await AsyncStorage.removeItem(KEYS.SUPERADMIN_FLAG);
  await AsyncStorage.removeItem(KEYS.LOCAL_USER);
  await AsyncStorage.removeItem(KEYS.COLLECTION_CACHE);
}

function dbUserToProfile(dbUser: any): UserProfile {
  const periodEnd = dbUser.subscriptionPeriodEnd ?? dbUser.subscription_period_end ?? null;
  return {
    id: dbUser.id,
    username: dbUser.username,
    displayName: dbUser.displayName ?? dbUser.display_name,
    email: dbUser.email,
    mobileNumber: dbUser.mobileNumber ?? dbUser.mobile_number,
    authProvider: (dbUser.authProvider ?? dbUser.auth_provider ?? "local") as AuthProvider,
    isPremium: dbUser.isPremium ?? dbUser.is_premium ?? false,
    role: (dbUser.role ?? "user") as UserRole,
    avatarUrl: dbUser.avatarUrl ?? dbUser.avatar_url,
    createdAt: dbUser.createdAt ?? dbUser.created_at ?? new Date().toISOString(),
    subscriptionStatus: dbUser.subscriptionStatus ?? dbUser.subscription_status ?? null,
    subscriptionPeriodEnd: periodEnd ? new Date(periodEnd).toISOString() : null,
    stripePriceId: dbUser.stripePriceId ?? dbUser.stripe_price_id ?? null,
    chatMutedUntil: dbUser.chatMutedUntil ?? dbUser.chat_muted_until ?? null,
    chatBannedUntil: dbUser.chatBannedUntil ?? dbUser.chat_banned_until ?? null,
    collectionVisible: dbUser.collectionVisible ?? dbUser.collection_visible ?? false,
    isVerifiedCollector: dbUser.isVerifiedCollector ?? dbUser.is_verified_collector ?? false,
    emailVerified: dbUser.emailVerified ?? dbUser.email_verified ?? false,
  };
}

export async function fetchAllUsersFromServer(): Promise<UserProfile[]> {
  try {
    const token = await getSuperadminToken();
    if (!token) return [];
    const base = getApiUrl();
    const res = await fetch(`${base}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const serverUsers: UserProfile[] = (data.users || []).map(dbUserToProfile);
    // Merge into local registry so future reads include them
    for (const u of serverUsers) {
      await upsertUserInRegistry(u);
    }
    return serverUsers;
  } catch {
    return [];
  }
}

/** @deprecated Admin login uses email+password now. Kept for backward import compat. */
export async function requestSuperadminOtp(email: string): Promise<{ ok: boolean; error?: string }> {
  const normEmail = email.toLowerCase().trim();
  if (!normEmail) return { ok: false, error: "Email is required" };
  try {
    const url = new URL("/api/admin/request-otp", getApiUrl());
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normEmail }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      let msg = "Failed to send code";
      try { msg = (await res.json())?.error || msg; } catch {}
      return { ok: false, error: msg };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Network error. Please check your connection." };
  }
}

/** @deprecated Admin login uses email+password now. Kept for backward import compat. */
export async function verifySuperadminOtp(email: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const normEmail = email.toLowerCase().trim();
  const normCode = code.trim();
  if (!normEmail || !normCode) return { ok: false, error: "Email and code are required" };

  let token: string | undefined;
  try {
    const url = new URL("/api/admin/verify-otp", getApiUrl());
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normEmail, code: normCode }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.token) {
      return { ok: false, error: data?.error || "Invalid code" };
    }
    token = data.token as string;
  } catch {
    return { ok: false, error: "Network error. Please check your connection." };
  }

  await setSuperadminToken(token);

  // Keep the currently logged-in user (so their server session stays valid for
  // chat, friends, marketplace, etc.) and just grant the superadmin flag on top.
  const currentUser = await getUser();
  if (currentUser) {
    currentUser.role = "admin";
    currentUser.isPremium = true;
    await safeSetItem(KEYS.LOCAL_USER, JSON.stringify(currentUser));
    await upsertUserInRegistry(currentUser);
  } else {
    // No one logged in — create a local-only superadmin profile so the admin
    // panel works. (Chat/friend features need a real account to function.)
    const allUsers = await getAllUsers();
    const existing = allUsers.find((u) => u.username === "superadmin");
    if (existing) {
      existing.role = "admin";
      existing.isPremium = true;
      await safeSetItem(KEYS.LOCAL_USER, JSON.stringify(existing));
      await upsertUserInRegistry(existing);
    } else {
      const user: UserProfile = {
        id: Crypto.randomUUID(),
        username: "superadmin",
        displayName: "Super Admin",
        isPremium: true,
        role: "admin",
        createdAt: new Date().toISOString(),
      };
      await safeSetItem(KEYS.LOCAL_USER, JSON.stringify(user));
      await upsertUserInRegistry(user);
    }
  }

  await safeSetItem(KEYS.SUPERADMIN_FLAG, "true");
  return { ok: true };
}

export async function getUser(): Promise<UserProfile | null> {
  const data = await AsyncStorage.getItem(KEYS.LOCAL_USER);
  if (!data) return null;
  const user = JSON.parse(data);
  if (!user.role) user.role = "user";
  return user;
}

export async function saveLocalUser(user: UserProfile): Promise<void> {
  await safeSetItem(KEYS.LOCAL_USER, JSON.stringify(user));
}

export async function registerSocialUser(
  provider: AuthProvider,
  displayName: string,
  email?: string,
  avatarUrl?: string
): Promise<UserProfile> {
  const allUsers = await getAllUsers();
  if (email) {
    const existing = allUsers.find(
      (u) => u.email === email.toLowerCase().trim()
    );
    if (existing) {
      await safeSetItem(KEYS.LOCAL_USER, JSON.stringify(existing));
      return existing;
    }
  }

  const baseUsername = (displayName || email || provider)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 12);
  const suffix = Math.random().toString(36).slice(2, 6);
  const username = `${baseUsername}${suffix}`;

  const user: UserProfile = {
    id: Crypto.randomUUID(),
    username,
    displayName: displayName.trim(),
    email: email?.toLowerCase().trim(),
    avatarUrl,
    authProvider: provider,
    isPremium: false,
    role: "user",
    createdAt: new Date().toISOString(),
  };
  await safeSetItem(KEYS.LOCAL_USER, JSON.stringify(user));
  await upsertUserInRegistry(user);
  return user;
}

export async function isSuperadmin(): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;
  // Primary path — superadmin flag was granted via /admin-login.
  const flag = await AsyncStorage.getItem(KEYS.SUPERADMIN_FLAG);
  if (flag === "true") return true;
  // Server login path — recognise by email or admin role.
  if (user.email?.toLowerCase().trim() === SUPERADMIN_EMAIL) return true;
  if (user.role === "admin") return true;
  return false;
}

export async function togglePremium(): Promise<UserProfile | null> {
  const user = await getUser();
  if (!user) return null;
  user.isPremium = !user.isPremium;
  await safeSetItem(KEYS.LOCAL_USER, JSON.stringify(user));
  return user;
}

export async function loadCollectionCache(): Promise<CollectionItem[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.COLLECTION_CACHE);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function saveCollectionCache(items: CollectionItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.COLLECTION_CACHE, JSON.stringify(items));
  } catch {}
}

export async function clearCollectionCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEYS.COLLECTION_CACHE);
  } catch {}
}

export async function getCollection(): Promise<CollectionItem[]> {
  try {
    const token = await getSessionToken();
    if (!token) {
      const data = await AsyncStorage.getItem(KEYS.COLLECTION);
      return data ? JSON.parse(data) : [];
    }
    const url = new URL("/api/collection", getApiUrl()).href;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return await loadCollectionCache();
    const data = await res.json();
    const items = (data.collection ?? []) as CollectionItem[];
    saveCollectionCache(items);
    return items;
  } catch {
    return await loadCollectionCache();
  }
}

export async function addToCollection(item: Omit<CollectionItem, "id" | "addedAt">): Promise<CollectionItem[]> {
  try {
    const token = await getSessionToken();
    if (!token) throw new Error("Not authenticated");
    const url = new URL("/api/collection", getApiUrl()).href;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to add card");
    }
    const data = await res.json();
    const items = (data.collection ?? []) as CollectionItem[];
    saveCollectionCache(items);
    return items;
  } catch (err) {
    console.error("addToCollection server error, falling back to local:", err);
    const collection = await getCollectionLocal();
    const existing = collection.find(
      (c) => c.cardId === item.cardId && c.condition === item.condition && (c.variant || "Non-Holo") === (item.variant || "Non-Holo")
    );
    if (existing) {
      existing.quantity += item.quantity;
      existing.priceGBP = item.priceGBP;
    } else {
      collection.push({ ...item, addedAt: new Date().toISOString() });
    }
    await safeSetItem(KEYS.COLLECTION, JSON.stringify(collection));
    return collection;
  }
}

export async function removeFromCollection(cardId: string, condition: string, variant?: CardVariant, itemId?: string): Promise<CollectionItem[]> {
  try {
    const token = await getSessionToken();
    if (!token) throw new Error("Not authenticated");
    const collection = await loadCollectionCache().then(c => c.length ? c : getCollection());
    const v = variant || "Non-Holo";
    // Prefer matching by server-assigned id (handles graded/raw coexistence)
    const target = itemId
      ? collection.find((c) => c.id === itemId)
      : collection.find((c) => c.cardId === cardId && c.condition === condition && (c.variant || "Non-Holo") === v);
    if (!target || !target.id) throw new Error("Item not found");
    const url = new URL(`/api/collection/${target.id}`, getApiUrl()).href;
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to remove card");
    const data = await res.json();
    const items = (data.collection ?? []) as CollectionItem[];
    saveCollectionCache(items);
    return items;
  } catch {
    let collection = await getCollectionLocal();
    const v = variant || "Non-Holo";
    collection = itemId
      ? collection.filter((c) => c.id !== itemId)
      : collection.filter((c) => !(c.cardId === cardId && c.condition === condition && (c.variant || "Non-Holo") === v));
    await safeSetItem(KEYS.COLLECTION, JSON.stringify(collection));
    return collection;
  }
}

export async function updateCollectionQuantity(cardId: string, condition: string, quantity: number, variant?: CardVariant, itemId?: string): Promise<CollectionItem[]> {
  if (quantity <= 0) return removeFromCollection(cardId, condition, variant, itemId);
  try {
    const token = await getSessionToken();
    if (!token) throw new Error("Not authenticated");
    const collection = await loadCollectionCache().then(c => c.length ? c : getCollection());
    const v = variant || "Non-Holo";
    // Prefer matching by server-assigned id (handles graded/raw coexistence)
    const target = itemId
      ? collection.find((c) => c.id === itemId)
      : collection.find((c) => c.cardId === cardId && c.condition === condition && (c.variant || "Non-Holo") === v);
    if (!target || !target.id) throw new Error("Item not found");
    const url = new URL(`/api/collection/${target.id}`, getApiUrl()).href;
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ quantity }),
    });
    if (!res.ok) throw new Error("Failed to update card");
    const data = await res.json();
    const items = (data.collection ?? []) as CollectionItem[];
    saveCollectionCache(items);
    return items;
  } catch {
    const collection = await getCollectionLocal();
    const v = variant || "Non-Holo";
    const item = itemId
      ? collection.find((c) => c.id === itemId)
      : collection.find((c) => c.cardId === cardId && c.condition === condition && (c.variant || "Non-Holo") === v);
    if (item) item.quantity = quantity;
    await safeSetItem(KEYS.COLLECTION, JSON.stringify(collection));
    return collection;
  }
}

export async function updateCollectionGrading(itemId: string, gradingCompany: string | null, grade: string | null): Promise<CollectionItem[]> {
  const token = await getSessionToken();
  if (!token) throw new Error("Not authenticated");
  const collection = await loadCollectionCache().then(c => c.length ? c : getCollection());
  const target = collection.find((c) => c.id === itemId);
  if (!target) throw new Error("Item not found");
  const url = new URL(`/api/collection/${itemId}`, getApiUrl()).href;
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ quantity: target.quantity, gradingCompany, grade }),
  });
  if (!res.ok) throw new Error("Failed to update grading");
  const data = await res.json();
  const items = (data.collection ?? []) as CollectionItem[];
  saveCollectionCache(items);
  return items;
}

async function getCollectionLocal(): Promise<CollectionItem[]> {
  const data = await AsyncStorage.getItem(KEYS.COLLECTION);
  return data ? JSON.parse(data) : [];
}

export async function migrateLocalCollectionToServer(): Promise<void> {
  try {
    const token = await getSessionToken();
    if (!token) return;
    const localItems = await getCollectionLocal();
    if (localItems.length === 0) return;
    const url = new URL("/api/collection", getApiUrl()).href;
    let allSucceeded = true;
    for (const item of localItems) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            cardId: item.cardId,
            cardName: item.cardName,
            cardImage: item.cardImage,
            setName: item.setName,
            setId: item.setId,
            rarity: item.rarity,
            quantity: item.quantity,
            condition: item.condition,
            variant: item.variant || "Non-Holo",
            priceGBP: item.priceGBP,
            migrate: true,
          }),
        });
        if (!res.ok) allSucceeded = false;
      } catch {
        allSucceeded = false;
      }
    }
    if (allSucceeded) {
      await AsyncStorage.removeItem(KEYS.COLLECTION);
    }
  } catch (err) {
    console.error("Collection migration error:", err);
  }
}

export async function getListings(): Promise<MarketListing[]> {
  try {
    const token = await getSessionToken();
    if (!token) return [];
    const url = new URL("/api/listings", getApiUrl()).href;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.listings ?? []) as MarketListing[];
  } catch {
    return [];
  }
}

export async function addListing(listing: Omit<MarketListing, "id" | "createdAt">): Promise<MarketListing[]> {
  const token = await getSessionToken();
  if (!token) throw new Error("Not authenticated");
  const url = new URL("/api/listings", getApiUrl()).href;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(listing),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? "Failed to create listing");
  }
  return getListings();
}

export async function updateListing(
  listingId: string,
  updates: { priceGBP?: number | null; condition: string; description?: string; externalUrl?: string | null; photos?: string[] }
): Promise<MarketListing[]> {
  const token = await getSessionToken();
  if (!token) throw new Error("Not authenticated");
  const url = new URL(`/api/listings/${listingId}`, getApiUrl()).href;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? "Failed to update listing");
  }
  return getListings();
}

export async function removeListing(listingId: string): Promise<MarketListing[]> {
  const token = await getSessionToken();
  if (!token) throw new Error("Not authenticated");
  const url = new URL(`/api/listings/${listingId}`, getApiUrl()).href;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? "Failed to delete listing");
  }
  return getListings();
}

export function getCollectionValue(collection: CollectionItem[]): number {
  return collection.reduce((total, item) => {
    if (item.priceGBP) {
      return total + item.priceGBP * item.quantity;
    }
    return total;
  }, 0);
}

export async function upsertUserInRegistry(user: UserProfile): Promise<void> {
  const users = await getAllUsers();
  const byId = users.findIndex((u) => u.id === user.id);
  if (byId >= 0) {
    users[byId] = user;
  } else {
    // Also deduplicate by username — prevents a locally-generated phantom entry
    // (e.g. a temp superadmin UUID) from coexisting with the server's real record.
    const byUsername = users.findIndex(
      (u) => u.username && u.username === user.username
    );
    if (byUsername >= 0) {
      users[byUsername] = user;
    } else {
      users.push(user);
    }
  }
  await safeSetItem(KEYS.ALL_USERS, JSON.stringify(users));
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const data = await AsyncStorage.getItem(KEYS.ALL_USERS);
  if (!data) return [];
  const users: UserProfile[] = JSON.parse(data);
  return users.map((u) => ({ ...u, role: u.role || "user" }));
}

async function serverAdminUpdateUser(userId: string, fields: { isPremium?: boolean; role?: string }): Promise<void> {
  try {
    const token = await getSuperadminToken();
    if (!token) return; // No superadmin session — silently skip server sync
    const base = getApiUrl();
    await fetch(`${base}/api/admin/edit-user`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, ...fields }),
    });
  } catch {
    // Non-fatal: local update already applied
  }
}

export async function grantPremiumToUser(userId: string): Promise<UserProfile[]> {
  const users = await getAllUsers();
  const target = users.find((u) => u.id === userId);
  if (target) {
    target.isPremium = true;
    await safeSetItem(KEYS.ALL_USERS, JSON.stringify(users));
    const currentUser = await getUser();
    if (currentUser && currentUser.id === userId) {
      currentUser.isPremium = true;
      await safeSetItem(KEYS.LOCAL_USER, JSON.stringify(currentUser));
    }
  }
  await serverAdminUpdateUser(userId, { isPremium: true });
  return users;
}

export async function revokePremiumFromUser(userId: string): Promise<UserProfile[]> {
  const users = await getAllUsers();
  const target = users.find((u) => u.id === userId);
  if (target) {
    target.isPremium = false;
    await safeSetItem(KEYS.ALL_USERS, JSON.stringify(users));
    const currentUser = await getUser();
    if (currentUser && currentUser.id === userId) {
      currentUser.isPremium = false;
      await safeSetItem(KEYS.LOCAL_USER, JSON.stringify(currentUser));
    }
  }
  await serverAdminUpdateUser(userId, { isPremium: false });
  return users;
}

export async function setUserRole(userId: string, role: UserRole): Promise<UserProfile[]> {
  const users = await getAllUsers();
  const target = users.find((u) => u.id === userId);
  const isPremiumForRole = role === "admin" || role === "moderator";
  if (target) {
    target.role = role;
    if (isPremiumForRole) target.isPremium = true;
    await safeSetItem(KEYS.ALL_USERS, JSON.stringify(users));
    const currentUser = await getUser();
    if (currentUser && currentUser.id === userId) {
      currentUser.role = role;
      if (isPremiumForRole) currentUser.isPremium = true;
      await safeSetItem(KEYS.LOCAL_USER, JSON.stringify(currentUser));
    }
  }
  await serverAdminUpdateUser(userId, { role, ...(isPremiumForRole ? { isPremium: true } : {}) });
  return users;
}

export async function updateUserAvatar(userId: string, avatarUrl: string): Promise<UserProfile | null> {
  const users = await getAllUsers();
  const target = users.find((u) => u.id === userId);
  if (target) {
    target.avatarUrl = avatarUrl;
    await safeSetItem(KEYS.ALL_USERS, JSON.stringify(users));
  }
  const currentUser = await getUser();
  if (currentUser && currentUser.id === userId) {
    currentUser.avatarUrl = avatarUrl;
    await safeSetItem(KEYS.LOCAL_USER, JSON.stringify(currentUser));
    return currentUser;
  }
  return target || null;
}

export async function adminUpdateUser(
  userId: string,
  updates: { displayName?: string; email?: string; mobileNumber?: string; avatarUrl?: string }
): Promise<UserProfile[]> {
  // Update in local registry
  const users = await getAllUsers();
  const target = users.find((u) => u.id === userId);
  if (target) {
    if (updates.displayName) target.displayName = updates.displayName;
    if (updates.email !== undefined) target.email = updates.email;
    if (updates.mobileNumber !== undefined) target.mobileNumber = updates.mobileNumber;
    if (updates.avatarUrl !== undefined) target.avatarUrl = updates.avatarUrl;
    await safeSetItem(KEYS.ALL_USERS, JSON.stringify(users));
    // If this user is the currently logged-in user, update local user too
    const currentUser = await getUser();
    if (currentUser && currentUser.id === userId) {
      if (updates.displayName) currentUser.displayName = updates.displayName;
      if (updates.email !== undefined) currentUser.email = updates.email;
      if (updates.mobileNumber !== undefined) currentUser.mobileNumber = updates.mobileNumber;
      if (updates.avatarUrl !== undefined) currentUser.avatarUrl = updates.avatarUrl;
      await safeSetItem(KEYS.LOCAL_USER, JSON.stringify(currentUser));
    }
  }
  // Also update in PostgreSQL (if user is server-registered)
  try {
    const token = await getSuperadminToken();
    if (token) {
      const base = getApiUrl();
      await fetch(`${base}/api/admin/edit-user`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, ...updates }),
      });
    }
  } catch {
    // Non-critical — local update is source of truth for local users
  }
  return getAllUsers();
}

export async function deleteUserFromRegistry(userId: string): Promise<UserProfile[]> {
  // Remove from local registry
  const users = await getAllUsers();
  const filtered = users.filter((u) => u.id !== userId);
  await safeSetItem(KEYS.ALL_USERS, JSON.stringify(filtered));
  // Also delete from PostgreSQL
  try {
    const token = await getSuperadminToken();
    if (token) {
      const base = getApiUrl();
      await fetch(`${base}/api/admin/delete-user`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId }),
      });
    }
  } catch {
    // Non-critical
  }
  return filtered;
}

export function isAdminOrMod(user: UserProfile | null): boolean {
  if (!user) return false;
  return user.role === "admin" || user.role === "moderator";
}

export function isAdmin(user: UserProfile | null): boolean {
  if (!user) return false;
  return user.role === "admin";
}
