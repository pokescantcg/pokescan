import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { getApiUrl } from "./query-client";

export interface AppConfig {
  maintenanceMode: boolean;
  scannerEnabled: boolean;
}

interface AppConfigContextValue extends AppConfig {
  loaded: boolean;
  refresh: () => Promise<void>;
}

const DEFAULT_CONFIG: AppConfig = {
  maintenanceMode: false,
  scannerEnabled: true,
};

const POLL_INTERVAL_MS = 30_000;

const AppConfigContext = createContext<AppConfigContextValue | null>(null);

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const url = new URL("/api/config", getApiUrl()).toString();
      const res = await fetch(url, { method: "GET" });
      if (!res.ok) return;
      const data = await res.json();
      setConfig({
        maintenanceMode: typeof data?.maintenanceMode === "boolean" ? data.maintenanceMode : false,
        scannerEnabled: typeof data?.scannerEnabled === "boolean" ? data.scannerEnabled : true,
      });
    } catch {
      // Silent: keep last known config on network errors so the app stays usable
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    const id = setInterval(fetchConfig, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchConfig]);

  return (
    <AppConfigContext.Provider value={{ ...config, loaded, refresh: fetchConfig }}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig(): AppConfigContextValue {
  const ctx = useContext(AppConfigContext);
  if (!ctx) {
    return { ...DEFAULT_CONFIG, loaded: false, refresh: async () => {} };
  }
  return ctx;
}
