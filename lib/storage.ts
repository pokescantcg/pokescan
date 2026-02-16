import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

export type UserRole = "user" | "moderator" | "admin";

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
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
  USER: "pokescan_user",
  COLLECTION: "pokescan_collection",
  LISTINGS: "pokescan_listings",
  ALL_USERS: "pokescan_all_users",
  ADMIN_CREDENTIALS: "pokescan_admin_creds",
};

const DEFAULT_ADMIN_CREDENTIALS = [
  { username: "admin", password: "admin1234", role: "admin" as UserRole, displayName: "Admin" },
  { username: "moderator", password: "mod1234", role: "moderator" as UserRole, displayName: "Moderator" },
];

export async function getUser(): Promise<UserProfile | null> {
  const data = await AsyncStorage.getItem(KEYS.USER);
  if (!data) return null;
  const user = JSON.parse(data);
  if (!user.role) user.role = "user";
  return user;
}

export async function saveUser(user: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
  await upsertUserInRegistry(user);
}

export async function registerUser(username: string, displayName: string): Promise<UserProfile> {
  const user: UserProfile = {
    id: Crypto.randomUUID(),
    username: username.toLowerCase().trim(),
    displayName: displayName.trim(),
    isPremium: false,
    role: "user",
    createdAt: new Date().toISOString(),
  };
  await saveUser(user);
  return user;
}

export async function adminLogin(username: string, password: string): Promise<UserProfile | null> {
  const cred = DEFAULT_ADMIN_CREDENTIALS.find(
    (c) => c.username.toLowerCase() === username.toLowerCase() && c.password === password
  );
  if (!cred) return null;

  const allUsers = await getAllUsers();
  const existing = allUsers.find((u) => u.username === cred.username && (u.role === "admin" || u.role === "moderator"));

  if (existing) {
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(existing));
    return existing;
  }

  const user: UserProfile = {
    id: Crypto.randomUUID(),
    username: cred.username,
    displayName: cred.displayName,
    isPremium: true,
    role: cred.role,
    createdAt: new Date().toISOString(),
  };
  await saveUser(user);
  return user;
}

export async function togglePremium(): Promise<UserProfile | null> {
  const user = await getUser();
  if (!user) return null;
  user.isPremium = !user.isPremium;
  await saveUser(user);
  return user;
}

export async function logoutUser(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.USER);
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
      await AsyncStorage.setItem(KEYS.USER, JSON.stringify(currentUser));
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
      await AsyncStorage.setItem(KEYS.USER, JSON.stringify(currentUser));
    }
  }
  return users;
}

export async function setUserRole(userId: string, role: UserRole): Promise<UserProfile[]> {
  const users = await getAllUsers();
  const target = users.find((u) => u.id === userId);
  if (target) {
    target.role = role;
    await AsyncStorage.setItem(KEYS.ALL_USERS, JSON.stringify(users));
    const currentUser = await getUser();
    if (currentUser && currentUser.id === userId) {
      currentUser.role = role;
      await AsyncStorage.setItem(KEYS.USER, JSON.stringify(currentUser));
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
