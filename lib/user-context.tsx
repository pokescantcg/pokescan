import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import {
  UserProfile,
  CollectionItem,
  MarketListing,
  getUser,
  saveUser,
  registerUser,
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
} from "./storage";

interface UserContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  collection: CollectionItem[];
  listings: MarketListing[];
  collectionValue: number;
  register: (username: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  togglePremium: () => Promise<void>;
  addCard: (item: Omit<CollectionItem, "addedAt">) => Promise<void>;
  removeCard: (cardId: string, condition: string) => Promise<void>;
  updateQuantity: (cardId: string, condition: string, quantity: number) => Promise<void>;
  createListing: (listing: Omit<MarketListing, "id" | "createdAt">) => Promise<void>;
  deleteListing: (listingId: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [listings, setListings] = useState<MarketListing[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [userData, collectionData, listingsData] = await Promise.all([
        getUser(),
        getCollection(),
        getListings(),
      ]);
      setUser(userData);
      setCollection(collectionData);
      setListings(listingsData);
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

  const collectionValue = useMemo(() => getCollectionValue(collection), [collection]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      collection,
      listings,
      collectionValue,
      register,
      logout,
      togglePremium: handleTogglePremium,
      addCard,
      removeCard,
      updateQuantity,
      createListing,
      deleteListing,
      refreshData: loadData,
    }),
    [user, isLoading, collection, listings, collectionValue, register, logout, handleTogglePremium, addCard, removeCard, updateQuantity, createListing, deleteListing, loadData]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within UserProvider");
  return context;
}
