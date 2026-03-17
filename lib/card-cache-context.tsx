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
  SyncProgress,
} from "./card-cache";

interface CardCacheState {
  cacheStatus: CacheMeta | null;
  isDownloading: boolean;
  progress: SyncProgress | null;
  downloadPercent: number;
  startDownload: () => Promise<void>;
  clearCardCache: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const CardCacheContext = createContext<CardCacheState>({
  cacheStatus: null,
  isDownloading: false,
  progress: null,
  downloadPercent: 0,
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
  const isDownloadingRef = useRef(false);

  const downloadPercent = (() => {
    if (!isDownloading || !progress) return 0;
    if (progress.stage === "sets") return 2;
    return Math.min(99, Math.round(2 + (progress.current / Math.max(progress.total, 1)) * 97));
  })();

  const refreshStatus = useCallback(async () => {
    const status = await getCacheStatus();
    setCacheStatus(status);
  }, []);

  const startDownload = useCallback(async () => {
    if (isDownloadingRef.current) return;
    isDownloadingRef.current = true;
    setIsDownloading(true);
    setProgress(null);
    try {
      const meta = await syncDatabase((p) => setProgress(p), 3);
      setCacheStatus(meta);
    } catch (e) {
      console.error("[CardCache] Download failed:", e);
    } finally {
      isDownloadingRef.current = false;
      setIsDownloading(false);
      setProgress(null);
      // Refresh status after download (success or fail)
      const updated = await getCacheStatus();
      setCacheStatus(updated);
    }
  }, []);

  const clearCardCache = useCallback(async () => {
    await clearCache();
    await refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    // Load cache status, then auto-start if empty (native only — web localStorage is too limited for full card DB)
    getCacheStatus().then((status) => {
      setCacheStatus(status);
      if (Platform.OS !== "web" && status.totalCards === 0 && !isDownloadingRef.current) {
        // Delay slightly so the app can fully render first
        setTimeout(() => startDownload(), 3000);
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
        startDownload,
        clearCardCache,
        refreshStatus,
      }}
    >
      {children}
    </CardCacheContext.Provider>
  );
}
