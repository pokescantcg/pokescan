import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { Platform } from "react-native";
import {
  getCacheStatus,
  syncDatabase,
  clearCache,
  CacheMeta,
  LangFilter,
  SyncProgress,
} from "./card-cache";

interface CardCacheState {
  cacheStatus: CacheMeta | null;
  isDownloading: boolean;
  progress: SyncProgress | null;
  downloadPercent: number;
  selectedLanguages: LangFilter[];
  setSelectedLanguages: (langs: LangFilter[]) => void;
  startDownload: (langs?: LangFilter[]) => Promise<void>;
  clearCardCache: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const CardCacheContext = createContext<CardCacheState>({
  cacheStatus: null,
  isDownloading: false,
  progress: null,
  downloadPercent: 0,
  selectedLanguages: ["english"],
  setSelectedLanguages: () => {},
  startDownload: async () => {},
  clearCardCache: async () => {},
  refreshStatus: async () => {},
});

export function useCardCache() {
  return useContext(CardCacheContext);
}

export function CardCacheProvider({ children }: { children: React.ReactNode }) {
  const [cacheStatus, setCacheStatus] = useState<CacheMeta | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [selectedLanguages, setSelectedLanguagesState] = useState<LangFilter[]>(["english"]);
  const isDownloadingRef = useRef(false);

  const downloadPercent = (() => {
    if (!isDownloading || !progress) return 0;
    if (progress.stage === "sets") return 2;
    return Math.min(99, Math.round(2 + (progress.current / Math.max(progress.total, 1)) * 97));
  })();

  const refreshStatus = useCallback(async () => {
    const status = await getCacheStatus();
    setCacheStatus(status);
    // Restore selected languages from last download if any
    if (status.selectedLanguages && status.selectedLanguages.length > 0) {
      setSelectedLanguagesState(status.selectedLanguages);
    }
  }, []);

  const setSelectedLanguages = useCallback((langs: LangFilter[]) => {
    setSelectedLanguagesState(langs);
  }, []);

  const startDownload = useCallback(async (langs?: LangFilter[]) => {
    if (isDownloadingRef.current) return;
    const activeLangs = langs ?? selectedLanguages;
    isDownloadingRef.current = true;
    setIsDownloading(true);
    setProgress(null);
    try {
      const meta = await syncDatabase(
        (p) => setProgress(p),
        3,
        activeLangs.length > 0 ? activeLangs : undefined
      );
      setCacheStatus(meta);
    } catch (e) {
      console.error("[CardCache] Download failed:", e);
      throw e;
    } finally {
      isDownloadingRef.current = false;
      setIsDownloading(false);
      setProgress(null);
      const updated = await getCacheStatus();
      setCacheStatus(updated);
    }
  }, [selectedLanguages]);

  const clearCardCache = useCallback(async () => {
    await clearCache();
    await refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    // Load cache status on mount — no auto-download, user chooses languages first
    getCacheStatus().then((status) => {
      setCacheStatus(status);
      if (status.selectedLanguages && status.selectedLanguages.length > 0) {
        setSelectedLanguagesState(status.selectedLanguages);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <CardCacheContext.Provider
      value={{
        cacheStatus,
        isDownloading,
        progress,
        downloadPercent,
        selectedLanguages,
        setSelectedLanguages,
        startDownload,
        clearCardCache,
        refreshStatus,
      }}
    >
      {children}
    </CardCacheContext.Provider>
  );
}
