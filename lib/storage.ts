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
  createdAt: string;
}

const KEYS = {
  COLLECTION: "pokescan_collection",
  COLLECTION_CACHE: "pokescan_collection_cache",
  LISTINGS: "pokescan_listings",
  ALL_USERS: "pokescan_all_users",
  SUPERADMIN_FLAG: "pokescan_superadmin",
  LOCAL_USER: "pokescan_local_user",
};

const SESSION_KEY = "pokescan_session_token";
const SUPERADMIN_EMAIL = "richiett17@hotmail.com";
const SUPERADMIN_PASSWORD = "killer89!";

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
    emailVerified: dbUser.emailVerified ?? dbUser.email_verified ?? false,
  };
}

export async function fetchAllUsersFromServer(): Promise<UserProfile[]> {
  try {
    const base = getApiUrl();
    const res = await fetch(`${base}/api/admin/users?superadminPassword=killer89!`);
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

export async function superadminLogin(email: string, password: string): Promise<boolean> {
  if (email.toLowerCase().trim() !== SUPERADMIN_EMAIL || password !== SUPERADMIN_PASSWORD) {
    return false;
  }

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

  await safeSetItem(KEYS.SUPERADMIN_FLAG, "true");
  return true;
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
  // Local superadmin login path (flag + username)
  const flag = await AsyncStorage.getItem(KEYS.SUPERADMIN_FLAG);
  if (flag === "true" && user.username === "superadmin") return true;
  // Server login path — recognise by email
  return user.email?.toLowerCase().trim() === SUPERADMIN_EMAIL;
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

export async function removeFromCollection(cardId: string, condition: string, variant?: CardVariant): Promise<CollectionItem[]> {
  try {
    const token = await getSessionToken();
    if (!token) throw new Error("Not authenticated");
    const collection = await loadCollectionCache().then(c => c.length ? c : getCollection());
    const v = variant || "Non-Holo";
    const target = collection.find(
      (c) => c.cardId === cardId && c.condition === condition && (c.variant || "Non-Holo") === v
    );
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
    collection = collection.filter(
      (c) => !(c.cardId === cardId && c.condition === condition && (c.variant || "Non-Holo") === v)
    );
    await safeSetItem(KEYS.COLLECTION, JSON.stringify(collection));
    return collection;
  }
}

export async function updateCollectionQuantity(cardId: string, condition: string, quantity: number, variant?: CardVariant): Promise<CollectionItem[]> {
  if (quantity <= 0) return removeFromCollection(cardId, condition, variant);
  try {
    const token = await getSessionToken();
    if (!token) throw new Error("Not authenticated");
    const collection = await loadCollectionCache().then(c => c.length ? c : getCollection());
    const v = variant || "Non-Holo";
    const target = collection.find(
      (c) => c.cardId === cardId && c.condition === condition && (c.variant || "Non-Holo") === v
    );
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
    const item = collection.find(
      (c) => c.cardId === cardId && c.condition === condition && (c.variant || "Non-Holo") === v
    );
    if (item) item.quantity = quantity;
    await safeSetItem(KEYS.COLLECTION, JSON.stringify(collection));
    return collection;
  }
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
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    users[idx] = user;
  } else {
    users.push(user);
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
    const base = getApiUrl();
    await fetch(`${base}/api/admin/edit-user`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ superadminPassword: "killer89!", userId, ...fields }),
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
    const base = getApiUrl();
    await fetch(`${base}/api/admin/edit-user`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        superadminPassword: "killer89!",
        userId,
        ...updates,
      }),
    });
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
    const base = getApiUrl();
    await fetch(`${base}/api/admin/delete-user`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ superadminPassword: "killer89!", userId }),
    });
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
