import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import {
  UserProfile,
  UserRole,
  AuthProvider,
  CollectionItem,
  MarketListing,
  getUser,
  saveLocalUser,
  registerSocialUser,
  superadminLogin,
  isSuperadmin,
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
  setUserRole,
  adminUpdateUser,
  isAdminOrMod,
  isAdmin,
  restoreSession,
  verifyOtpAndLogin,
  registerUserWithOtp,
  sendOtpForRegistration,
  sendOtpForLogin,
} from "./storage";

interface UserContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  collection: CollectionItem[];
  listings: MarketListing[];
  collectionValue: number;
  allUsers: UserProfile[];
  register: (username: string, displayName: string, email: string, mobileNumber: string) => Promise<{ userId: string }>;
  sendRegistrationOtp: (userId: string, channel: "email" | "sms") => Promise<void>;
  sendLoginOtp: (credential: string, channel: "email" | "sms") => Promise<{ userId: string }>;
  verifyOtp: (credential: string, code: string) => Promise<void>;
  socialRegister: (provider: AuthProvider, displayName: string, email?: string, avatarUrl?: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  togglePremium: () => Promise<void>;
  addCard: (item: Omit<CollectionItem, "addedAt">) => Promise<void>;
  removeCard: (cardId: string, condition: string) => Promise<void>;
  updateQuantity: (cardId: string, condition: string, quantity: number) => Promise<void>;
  createListing: (listing: Omit<MarketListing, "id" | "createdAt">) => Promise<void>;
  deleteListing: (listingId: string) => Promise<void>;
  grantPremium: (userId: string) => Promise<void>;
  revokePremium: (userId: string) => Promise<void>;
  changeUserRole: (userId: string, role: UserRole) => Promise<void>;
  editUserAccount: (userId: string, updates: { displayName?: string; email?: string; mobileNumber?: string }) => Promise<void>;
  refreshData: () => Promise<void>;
  isStaff: boolean;
  isAdminUser: boolean;
  isSuperadminUser: boolean;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [superadminFlag, setSuperadminFlag] = useState(false);

  const loadData = useCallback(async () => {
    try {
      let userData: UserProfile | null = null;

      const restoredUser = await restoreSession();
      if (restoredUser) {
        userData = restoredUser;
      } else {
        const localUser = await getUser();
        if (localUser && localUser.authProvider !== "local") {
          userData = localUser;
        }
      }

      const [collectionData, listingsData, usersData, saFlag] = await Promise.all([
        getCollection(),
        getListings(),
        getAllUsers(),
        isSuperadmin(),
      ]);
      setUser(userData);
      setCollection(collectionData);
      setListings(listingsData);
      setAllUsers(usersData);
      setSuperadminFlag(saFlag);
    } catch (e) {
      console.error("Failed to load data:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const register = useCallback(async (username: string, displayName: string, email: string, mobileNumber: string) => {
    return registerUserWithOtp(username, displayName, email, mobileNumber);
  }, []);

  const handleSendRegistrationOtp = useCallback(async (userId: string, channel: "email" | "sms") => {
    await sendOtpForRegistration(userId, channel);
  }, []);

  const handleSendLoginOtp = useCallback(async (credential: string, channel: "email" | "sms") => {
    return sendOtpForLogin(credential, channel);
  }, []);

  const handleVerifyOtp = useCallback(async (credential: string, code: string) => {
    const { user: newUser } = await verifyOtpAndLogin(credential, code);
    setUser(newUser);
    const users = await getAllUsers();
    setAllUsers(users);
  }, []);

  const handleSocialRegister = useCallback(async (provider: AuthProvider, displayName: string, email?: string, avatarUrl?: string) => {
    const newUser = await registerSocialUser(provider, displayName, email, avatarUrl);
    setUser(newUser);
    const users = await getAllUsers();
    setAllUsers(users);
  }, []);

  const handleAdminLogin = useCallback(async (email: string, password: string): Promise<boolean> => {
    const success = await superadminLogin(email, password);
    if (success) {
      const userData = await getUser();
      setUser(userData);
      setSuperadminFlag(true);
      const users = await getAllUsers();
      setAllUsers(users);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
    setSuperadminFlag(false);
  }, []);

  const handleTogglePremium = useCallback(async () => {
    const updated = await togglePremiumStorage();
    if (updated) {
      setUser(updated);
    } else {
      setUser((prev) => prev ? { ...prev, isPremium: !prev.isPremium } : prev);
    }
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

  const handleDeleteListing = useCallback(async (listingId: string) => {
    const updated = await removeListing(listingId);
    setListings(updated);
  }, []);

  const handleGrantPremium = useCallback(async (targetUserId: string) => {
    const updatedUsers = await grantPremiumToUser(targetUserId);
    setAllUsers(updatedUsers);
    setUser((prev) => {
      if (prev && prev.id === targetUserId) return { ...prev, isPremium: true };
      return prev;
    });
  }, []);

  const handleRevokePremium = useCallback(async (targetUserId: string) => {
    const updatedUsers = await revokePremiumFromUser(targetUserId);
    setAllUsers(updatedUsers);
    setUser((prev) => {
      if (prev && prev.id === targetUserId) return { ...prev, isPremium: false };
      return prev;
    });
  }, []);

  const handleEditUserAccount = useCallback(async (targetUserId: string, updates: { displayName?: string; email?: string; mobileNumber?: string }) => {
    const updatedUsers = await adminUpdateUser(targetUserId, updates);
    setAllUsers(updatedUsers);
    setUser((prev) => {
      if (prev && prev.id === targetUserId) return { ...prev, ...updates };
      return prev;
    });
  }, []);

  const handleChangeUserRole = useCallback(async (targetUserId: string, role: UserRole) => {
    const updatedUsers = await setUserRole(targetUserId, role);
    setAllUsers(updatedUsers);
    setUser((prev) => {
      if (prev && prev.id === targetUserId) {
        const isPremium = role === "admin" || role === "moderator" ? true : prev.isPremium;
        return { ...prev, role, isPremium };
      }
      return prev;
    });
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
      sendRegistrationOtp: handleSendRegistrationOtp,
      sendLoginOtp: handleSendLoginOtp,
      verifyOtp: handleVerifyOtp,
      socialRegister: handleSocialRegister,
      adminLogin: handleAdminLogin,
      logout,
      togglePremium: handleTogglePremium,
      addCard,
      removeCard,
      updateQuantity,
      createListing,
      deleteListing: handleDeleteListing,
      grantPremium: handleGrantPremium,
      revokePremium: handleRevokePremium,
      changeUserRole: handleChangeUserRole,
      editUserAccount: handleEditUserAccount,
      refreshData: loadData,
      isStaff,
      isAdminUser,
      isSuperadminUser: superadminFlag,
    }),
    [user, isLoading, collection, listings, collectionValue, allUsers, register, handleSendRegistrationOtp, handleSendLoginOtp, handleVerifyOtp, handleSocialRegister, handleAdminLogin, logout, handleTogglePremium, addCard, removeCard, updateQuantity, createListing, handleDeleteListing, handleGrantPremium, handleRevokePremium, handleChangeUserRole, handleEditUserAccount, loadData, isStaff, isAdminUser, superadminFlag]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within UserProvider");
  return context;
}
