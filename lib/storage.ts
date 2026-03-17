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
}

export interface CollectionItem {
  cardId: string;
  cardName: string;
  cardImage: string;
  setName: string;
  setId: string;
  rarity: string;
  quantity: number;
  condition: string;
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
  createdAt: string;
}

const KEYS = {
  COLLECTION: "pokescan_collection",
  LISTINGS: "pokescan_listings",
  ALL_USERS: "pokescan_all_users",
  SUPERADMIN_FLAG: "pokescan_superadmin",
  LOCAL_USER: "pokescan_local_user",
};

const SESSION_KEY = "pokescan_session_token";
const SUPERADMIN_EMAIL = "richiett17@hotmail.com";
const SUPERADMIN_PASSWORD = "killer89!";

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, value);
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
    const res = await apiRequest("POST", "/api/auth/session", { token });
    const data = await res.json();
    if (data.user) {
      const user = dbUserToProfile(data.user);
      await saveLocalUser(user);
      return user;
    }
    return null;
  } catch {
    await clearSessionToken();
    return null;
  }
}

export async function registerUserWithOtp(
  username: string,
  displayName: string,
  email: string,
  mobileNumber: string
): Promise<{ userId: string }> {
  const res = await apiRequest("POST", "/api/auth/register", {
    username,
    displayName,
    email,
    mobileNumber,
  });
  return res.json();
}

export async function sendOtpForRegistration(
  userId: string,
  channel: "email" | "sms"
): Promise<void> {
  await apiRequest("POST", "/api/auth/send-otp-register", { userId, channel });
}

export async function sendOtpForLogin(
  credential: string,
  channel: "email" | "sms"
): Promise<{ userId: string }> {
  const res = await apiRequest("POST", "/api/auth/send-otp", { credential, channel });
  return res.json();
}

export async function verifyOtpAndLogin(
  credential: string,
  code: string
): Promise<{ token: string; user: UserProfile }> {
  const res = await apiRequest("POST", "/api/auth/verify-otp", { credential, code });
  const data = await res.json();
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
}

function dbUserToProfile(dbUser: any): UserProfile {
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
  };
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
    await AsyncStorage.setItem(KEYS.LOCAL_USER, JSON.stringify(existing));
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
    await AsyncStorage.setItem(KEYS.LOCAL_USER, JSON.stringify(user));
    await upsertUserInRegistry(user);
  }

  await AsyncStorage.setItem(KEYS.SUPERADMIN_FLAG, "true");
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
  await AsyncStorage.setItem(KEYS.LOCAL_USER, JSON.stringify(user));
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
      await AsyncStorage.setItem(KEYS.LOCAL_USER, JSON.stringify(existing));
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
  await AsyncStorage.setItem(KEYS.LOCAL_USER, JSON.stringify(user));
  await upsertUserInRegistry(user);
  return user;
}

export async function isSuperadmin(): Promise<boolean> {
  const flag = await AsyncStorage.getItem(KEYS.SUPERADMIN_FLAG);
  const user = await getUser();
  return flag === "true" && user?.username === "superadmin";
}

export async function togglePremium(): Promise<UserProfile | null> {
  const user = await getUser();
  if (!user) return null;
  user.isPremium = !user.isPremium;
  await AsyncStorage.setItem(KEYS.LOCAL_USER, JSON.stringify(user));
  return user;
}

export async function getCollection(): Promise<CollectionItem[]> {
  const data = await AsyncStorage.getItem(KEYS.COLLECTION);
  return data ? JSON.parse(data) : [];
}

export async function addToCollection(item: Omit<CollectionItem, "addedAt">): Promise<CollectionItem[]> {
  const collection = await getCollection();
  const existing = collection.find(
    (c) => c.cardId === item.cardId && c.condition === item.condition
  );
  if (existing) {
    existing.quantity += item.quantity;
    existing.priceGBP = item.priceGBP;
  } else {
    collection.push({ ...item, addedAt: new Date().toISOString() });
  }
  await AsyncStorage.setItem(KEYS.COLLECTION, JSON.stringify(collection));
  return collection;
}

export async function removeFromCollection(cardId: string, condition: string): Promise<CollectionItem[]> {
  let collection = await getCollection();
  collection = collection.filter(
    (c) => !(c.cardId === cardId && c.condition === condition)
  );
  await AsyncStorage.setItem(KEYS.COLLECTION, JSON.stringify(collection));
  return collection;
}

export async function updateCollectionQuantity(cardId: string, condition: string, quantity: number): Promise<CollectionItem[]> {
  const collection = await getCollection();
  const item = collection.find(
    (c) => c.cardId === cardId && c.condition === condition
  );
  if (item) {
    item.quantity = quantity;
    if (quantity <= 0) {
      return removeFromCollection(cardId, condition);
    }
  }
  await AsyncStorage.setItem(KEYS.COLLECTION, JSON.stringify(collection));
  return collection;
}

export async function getListings(): Promise<MarketListing[]> {
  const data = await AsyncStorage.getItem(KEYS.LISTINGS);
  return data ? JSON.parse(data) : [];
}

export async function addListing(listing: Omit<MarketListing, "id" | "createdAt">): Promise<MarketListing[]> {
  const listings = await getListings();
  listings.unshift({
    ...listing,
    id: Crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
  await AsyncStorage.setItem(KEYS.LISTINGS, JSON.stringify(listings));
  return listings;
}

export async function removeListing(listingId: string): Promise<MarketListing[]> {
  let listings = await getListings();
  listings = listings.filter((l) => l.id !== listingId);
  await AsyncStorage.setItem(KEYS.LISTINGS, JSON.stringify(listings));
  return listings;
}

export function getCollectionValue(collection: CollectionItem[]): number {
  return collection.reduce((total, item) => {
    if (item.priceGBP) {
      return total + item.priceGBP * item.quantity;
    }
    return total;
  }, 0);
}

async function upsertUserInRegistry(user: UserProfile): Promise<void> {
  const users = await getAllUsers();
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    users[idx] = user;
  } else {
    users.push(user);
  }
  await AsyncStorage.setItem(KEYS.ALL_USERS, JSON.stringify(users));
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const data = await AsyncStorage.getItem(KEYS.ALL_USERS);
  if (!data) return [];
  const users: UserProfile[] = JSON.parse(data);
  return users.map((u) => ({ ...u, role: u.role || "user" }));
}

export async function grantPremiumToUser(userId: string): Promise<UserProfile[]> {
  const users = await getAllUsers();
  const target = users.find((u) => u.id === userId);
  if (target) {
    target.isPremium = true;
    await AsyncStorage.setItem(KEYS.ALL_USERS, JSON.stringify(users));
    const currentUser = await getUser();
    if (currentUser && currentUser.id === userId) {
      currentUser.isPremium = true;
      await AsyncStorage.setItem(KEYS.LOCAL_USER, JSON.stringify(currentUser));
    }
  }
  return users;
}

export async function revokePremiumFromUser(userId: string): Promise<UserProfile[]> {
  const users = await getAllUsers();
  const target = users.find((u) => u.id === userId);
  if (target) {
    target.isPremium = false;
    await AsyncStorage.setItem(KEYS.ALL_USERS, JSON.stringify(users));
    const currentUser = await getUser();
    if (currentUser && currentUser.id === userId) {
      currentUser.isPremium = false;
      await AsyncStorage.setItem(KEYS.LOCAL_USER, JSON.stringify(currentUser));
    }
  }
  return users;
}

export async function setUserRole(userId: string, role: UserRole): Promise<UserProfile[]> {
  const users = await getAllUsers();
  const target = users.find((u) => u.id === userId);
  if (target) {
    target.role = role;
    if (role === "admin" || role === "moderator") {
      target.isPremium = true;
    }
    await AsyncStorage.setItem(KEYS.ALL_USERS, JSON.stringify(users));
    const currentUser = await getUser();
    if (currentUser && currentUser.id === userId) {
      currentUser.role = role;
      if (role === "admin" || role === "moderator") {
        currentUser.isPremium = true;
      }
      await AsyncStorage.setItem(KEYS.LOCAL_USER, JSON.stringify(currentUser));
    }
  }
  return users;
}

export function isAdminOrMod(user: UserProfile | null): boolean {
  if (!user) return false;
  return user.role === "admin" || user.role === "moderator";
}

export function isAdmin(user: UserProfile | null): boolean {
  if (!user) return false;
  return user.role === "admin";
}
