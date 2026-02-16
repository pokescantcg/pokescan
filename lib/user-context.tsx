import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import {
  UserProfile,
  UserRole,
  CollectionItem,
  MarketListing,
  getUser,
  saveUser,
  registerUser,
  adminLogin as adminLoginStorage,
  togglePremium as togglePremiumStorage,
  logoutUser,
  getCollection,
  addToCollection,
  removeFromCollection,
  updateCollectionQuantity,
  getListings,
  addListing,
  removeListing,
  getCollectionValue,
  getAllUsers,
  grantPremiumToUser,
  revokePremiumFromUser,
  isAdminOrMod,
  isAdmin,
} from "./storage";

interface UserContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  collection: CollectionItem[];
  listings: MarketListing[];
  collectionValue: number;
  allUsers: UserProfile[];
  register: (username: string, displayName: string) => Promise<void>;
  adminLogin: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  togglePremium: () => Promise<void>;
  addCard: (item: Omit<CollectionItem, "addedAt">) => Promise<void>;
  removeCard: (cardId: string, condition: string) => Promise<void>;
  updateQuantity: (cardId: string, condition: string, quantity: number) => Promise<void>;
  createListing: (listing: Omit<MarketListing, "id" | "createdAt">) => Promise<void>;
  deleteListing: (listingId: string) => Promise<void>;
  grantPremium: (userId: string) => Promise<void>;
  revokePremium: (userId: string) => Promise<void>;
  refreshData: () => Promise<void>;
  isStaff: boolean;
  isAdminUser: boolean;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [userData, collectionData, listingsData, usersData] = await Promise.all([
        getUser(),
        getCollection(),
        getListings(),
        getAllUsers(),
      ]);
      setUser(userData);
      setCollection(collectionData);
      setListings(listingsData);
      setAllUsers(usersData);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const register = useCallback(async (username: string, displayName: string) => {
    const newUser = await registerUser(username, displayName);
    setUser(newUser);
    const users = await getAllUsers();
    setAllUsers(users);
  }, []);

  const handleAdminLogin = useCallback(async (username: string, password: string): Promise<boolean> => {
    const adminUser = await adminLoginStorage(username, password);
    if (adminUser) {
      setUser(adminUser);
      const users = await getAllUsers();
      setAllUsers(users);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
  }, []);

  const handleTogglePremium = useCallback(async () => {
    const updated = await togglePremiumStorage();
    if (updated) setUser(updated);
  }, []);

  const addCard = useCallback(async (item: Omit<CollectionItem, "addedAt">) => {
    const updated = await addToCollection(item);
    setCollection(updated);
  }, []);

  const removeCard = useCallback(async (cardId: string, condition: string) => {
    const updated = await removeFromCollection(cardId, condition);
    setCollection(updated);
  }, []);

  const updateQuantity = useCallback(async (cardId: string, condition: string, quantity: number) => {
    const updated = await updateCollectionQuantity(cardId, condition, quantity);
    setCollection(updated);
  }, []);

  const createListing = useCallback(async (listing: Omit<MarketListing, "id" | "createdAt">) => {
    const updated = await addListing(listing);
    setListings(updated);
  }, []);

  const deleteListing = useCallback(async (listingId: string) => {
    const updated = await removeListing(listingId);
    setListings(updated);
  }, []);

  const handleGrantPremium = useCallback(async (userId: string) => {
    const updatedUsers = await grantPremiumToUser(userId);
    setAllUsers(updatedUsers);
    const currentUser = await getUser();
    if (currentUser) setUser(currentUser);
  }, []);

  const handleRevokePremium = useCallback(async (userId: string) => {
    const updatedUsers = await revokePremiumFromUser(userId);
    setAllUsers(updatedUsers);
    const currentUser = await getUser();
    if (currentUser) setUser(currentUser);
  }, []);

  const collectionValue = useMemo(() => getCollectionValue(collection), [collection]);

  const isStaff = useMemo(() => isAdminOrMod(user), [user]);
  const isAdminUser = useMemo(() => isAdmin(user), [user]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      collection,
      listings,
      collectionValue,
      allUsers,
      register,
      adminLogin: handleAdminLogin,
      logout,
      togglePremium: handleTogglePremium,
      addCard,
      removeCard,
      updateQuantity,
      createListing,
      deleteListing,
      grantPremium: handleGrantPremium,
      revokePremium: handleRevokePremium,
      refreshData: loadData,
      isStaff,
      isAdminUser,
    }),
    [user, isLoading, collection, listings, collectionValue, allUsers, register, handleAdminLogin, logout, handleTogglePremium, addCard, removeCard, updateQuantity, createListing, deleteListing, handleGrantPremium, handleRevokePremium, loadData, isStaff, isAdminUser]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within UserProvider");
  return context;
}
