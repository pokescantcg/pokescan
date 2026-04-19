import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import {
  UserProfile,
  UserRole,
  AuthProvider,
  CardVariant,
  CollectionItem,
  MarketListing,
  getUser,
  saveLocalUser,
  registerSocialUser,
  requestSuperadminOtp,
  verifySuperadminOtp,
  isSuperadmin,
  togglePremium as togglePremiumStorage,
  logoutUser,
  getCollection,
  loadCollectionCache,
  addToCollection,
  removeFromCollection,
  updateCollectionQuantity,
  migrateLocalCollectionToServer,
  getListings,
  addListing,
  removeListing,
  getCollectionValue,
  getAllUsers,
  grantPremiumToUser,
  revokePremiumFromUser,
  setUserRole,
  adminUpdateUser,
  deleteUserFromRegistry,
  isAdminOrMod,
  isAdmin,
  restoreSession,
  verifyOtpAndLogin,
  registerUserWithOtp,
  registerWithPassword as registerWithPasswordStorage,
  loginWithPassword as loginWithPasswordStorage,
  upsertUserInRegistry,
  sendOtpForRegistration,
  sendOtpForLogin,
  updateUserAvatar,
  fetchAllUsersFromServer,
} from "./storage";

interface UserContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  collection: CollectionItem[];
  listings: MarketListing[];
  collectionValue: number;
  allUsers: UserProfile[];
  register: (username: string, displayName: string, email: string, mobileNumber: string) => Promise<{ user: UserProfile }>;
  registerWithPassword: (username: string, displayName: string, email: string, password: string, mobileNumber?: string) => Promise<{ userId: string; email: string }>;
  loginWithPassword: (credential: string, password: string) => Promise<void>;
  sendRegistrationOtp: (userId: string, channel: "email" | "sms") => Promise<void>;
  sendLoginOtp: (credential: string, channel: "email" | "sms") => Promise<{ userId: string }>;
  verifyOtp: (credential: string, code: string) => Promise<void>;
  socialRegister: (provider: AuthProvider, displayName: string, email?: string, avatarUrl?: string) => Promise<void>;
  requestAdminOtp: (email: string) => Promise<{ ok: boolean; error?: string }>;
  verifyAdminOtp: (email: string, code: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  togglePremium: () => Promise<void>;
  addCard: (item: Omit<CollectionItem, "id" | "addedAt">) => Promise<void>;
  removeCard: (cardId: string, condition: string, variant?: CardVariant) => Promise<void>;
  updateQuantity: (cardId: string, condition: string, quantity: number, variant?: CardVariant) => Promise<void>;
  createListing: (listing: Omit<MarketListing, "id" | "createdAt">) => Promise<void>;
  deleteListing: (listingId: string) => Promise<void>;
  grantPremium: (userId: string) => Promise<void>;
  revokePremium: (userId: string) => Promise<void>;
  changeUserRole: (userId: string, role: UserRole) => Promise<void>;
  editUserAccount: (userId: string, updates: { displayName?: string; email?: string; mobileNumber?: string }) => Promise<void>;
  updateAvatar: (avatarUri: string) => Promise<void>;
  deleteUserAccount: (userId: string) => Promise<void>;
  refreshData: () => Promise<void>;
  refreshUsers: () => Promise<void>;
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
      // Load cached collection immediately so the UI renders without waiting for the server
      const cachedCollection = await loadCollectionCache();
      if (cachedCollection.length > 0) {
        setCollection(cachedCollection);
      }

      let userData: UserProfile | null = null;

      const restoredUser = await restoreSession();
      if (restoredUser) {
        userData = restoredUser;
        migrateLocalCollectionToServer().catch(() => {});
      } else {
        const localUser = await getUser();
        if (localUser && localUser.authProvider !== "local") {
          userData = localUser;
        }
      }

      const [listingsData, localUsersData, saFlag] = await Promise.all([
        getListings(),
        getAllUsers(),
        isSuperadmin(),
      ]);

      setUser(userData);
      setListings(listingsData);
      setAllUsers(localUsersData);
      setSuperadminFlag(saFlag);

      // Always sync users from server — merges server-registered users into local registry
      fetchAllUsersFromServer().then(async () => {
        const merged = await getAllUsers();
        setAllUsers(merged);
      }).catch(() => {});

      // Background-sync collection from server only when authenticated
      // (prevents empty-array overwrite when the user isn't logged in)
      if (userData) {
        getCollection().then(setCollection).catch(() => {});
      }
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
    const { user: newUser } = await registerUserWithOtp(username, displayName, email, mobileNumber);
    setUser(newUser);
    await upsertUserInRegistry(newUser);
    const users = await getAllUsers();
    setAllUsers(users);
    return { user: newUser };
  }, []);

  const registerWithPassword = useCallback(async (username: string, displayName: string, email: string, password: string, mobileNumber?: string) => {
    const { user: newUser, userId } = await registerWithPasswordStorage(username, displayName, email, password, mobileNumber);
    setUser(newUser);
    await upsertUserInRegistry(newUser);
    const users = await getAllUsers();
    setAllUsers(users);
    return { userId, email };
  }, []);

  const loginWithPassword = useCallback(async (credential: string, password: string) => {
    const { user: newUser } = await loginWithPasswordStorage(credential, password);
    setUser(newUser);
    await upsertUserInRegistry(newUser);
    const [users, saFlag] = await Promise.all([getAllUsers(), isSuperadmin()]);
    setAllUsers(users);
    setSuperadminFlag(saFlag);
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
    migrateLocalCollectionToServer().then(() => getCollection().then(setCollection)).catch(() => {});
    const [users, saFlag] = await Promise.all([getAllUsers(), isSuperadmin()]);
    setAllUsers(users);
    setSuperadminFlag(saFlag);
  }, []);

  const handleSocialRegister = useCallback(async (provider: AuthProvider, displayName: string, email?: string, avatarUrl?: string) => {
    const newUser = await registerSocialUser(provider, displayName, email, avatarUrl);
    setUser(newUser);
    migrateLocalCollectionToServer().then(() => getCollection().then(setCollection)).catch(() => {});
    const users = await getAllUsers();
    setAllUsers(users);
  }, []);

  const handleRequestAdminOtp = useCallback(async (email: string) => {
    return requestSuperadminOtp(email);
  }, []);

  const handleVerifyAdminOtp = useCallback(async (email: string, code: string) => {
    const result = await verifySuperadminOtp(email, code);
    if (result.ok) {
      const userData = await getUser();
      setUser(userData);
      setSuperadminFlag(true);
      const users = await getAllUsers();
      setAllUsers(users);
    }
    return result;
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

  const addCard = useCallback(async (item: Omit<CollectionItem, "id" | "addedAt">) => {
    const updated = await addToCollection(item);
    setCollection(updated);
  }, []);

  const removeCard = useCallback(async (cardId: string, condition: string, variant?: CardVariant) => {
    const updated = await removeFromCollection(cardId, condition, variant);
    setCollection(updated);
  }, []);

  const updateQuantity = useCallback(async (cardId: string, condition: string, quantity: number, variant?: CardVariant) => {
    const updated = await updateCollectionQuantity(cardId, condition, quantity, variant);
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

  const handleRefreshUsers = useCallback(async () => {
    await fetchAllUsersFromServer();
    const merged = await getAllUsers();
    setAllUsers(merged);
  }, []);

  const handleUpdateAvatar = useCallback(async (avatarUri: string) => {
    if (!user) return;
    const updated = await updateUserAvatar(user.id, avatarUri);
    if (updated) setUser(updated);
  }, [user]);

  const handleDeleteUserAccount = useCallback(async (targetUserId: string) => {
    const updatedUsers = await deleteUserFromRegistry(targetUserId);
    setAllUsers(updatedUsers);
    setUser((prev) => {
      if (prev && prev.id === targetUserId) return null;
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
      registerWithPassword,
      loginWithPassword,
      sendRegistrationOtp: handleSendRegistrationOtp,
      sendLoginOtp: handleSendLoginOtp,
      verifyOtp: handleVerifyOtp,
      socialRegister: handleSocialRegister,
      requestAdminOtp: handleRequestAdminOtp,
      verifyAdminOtp: handleVerifyAdminOtp,
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
      updateAvatar: handleUpdateAvatar,
      deleteUserAccount: handleDeleteUserAccount,
      refreshData: loadData,
      refreshUsers: handleRefreshUsers,
      isStaff,
      isAdminUser,
      isSuperadminUser: superadminFlag,
    }),
    [user, isLoading, collection, listings, collectionValue, allUsers, register, handleSendRegistrationOtp, handleSendLoginOtp, handleVerifyOtp, handleSocialRegister, handleAdminLogin, logout, handleTogglePremium, addCard, removeCard, updateQuantity, createListing, handleDeleteListing, handleGrantPremium, handleRevokePremium, handleChangeUserRole, handleEditUserAccount, handleUpdateAvatar, handleDeleteUserAccount, loadData, handleRefreshUsers, isStaff, isAdminUser, superadminFlag]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error("useUser must be used within UserProvider");
  return context;
}
