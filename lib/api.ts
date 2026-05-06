// ======================================================
// API CONFIG + FETCH WRAPPER (EXPO SAFE + DEBUG READY)
// Location: lib/api.ts
// ======================================================

import Constants from "expo-constants";
import { Platform } from "react-native";

// ------------------------------------------------------
// BASE URL CONFIG
// ------------------------------------------------------

const DEFAULT_BASE_URL = "https://pokescantcg.onrender.com";

const DEV_LOCAL_URL =
  Platform.OS === "android"
    ? "http://10.0.2.2:5000"
    : "http://localhost:5000";

// Final resolved API URL
export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  (process.env.NODE_ENV === "development"
    ? DEV_LOCAL_URL
    : DEFAULT_BASE_URL);

// 👇 Useful debug log (keep this)
console.log("🌐 API BASE URL:", BASE_URL);

// ------------------------------------------------------
// DEFAULT HEADERS BUILDER
// ------------------------------------------------------

function buildHeaders(
  body: unknown,
  extraHeaders?: Record<string, string>
): Record<string, string> {
  const headers: Record<string, string> = {
    ...(extraHeaders ?? {}),
  };

  if (
    body !== undefined &&
    !(body instanceof FormData) &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

// ------------------------------------------------------
// MAIN FETCH WRAPPER
// ------------------------------------------------------

export async function apiFetch<T = any>(
  route: string,
  options?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  }
): Promise<T> {
  const url = new URL(route, BASE_URL).toString();

  try {
    const response = await fetch(url, {
      method: options?.method ?? "GET",
      headers: buildHeaders(options?.body, options?.headers),
      body:
        options?.body === undefined
          ? undefined
          : options.body instanceof FormData
          ? options.body
          : JSON.stringify(options.body),
      credentials: "include",
    });

    const text = await response.text();

    let data: any = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    // --------------------------------------------------
    // HANDLE AUTH FAIL (IMPORTANT FOR YOUR APP)
    // --------------------------------------------------

    if (response.status === 401) {
      console.warn("🔒 Unauthorized request:", url);
      return null as T;
    }

    // --------------------------------------------------
    // HANDLE OTHER ERRORS
    // --------------------------------------------------

    if (!response.ok) {
      const message =
        data?.error ||
        data?.message ||
        text ||
        response.statusText;

      console.error("❌ API ERROR:", url, message);
      throw new Error(message);
    }

    return data ?? ({} as T);
  } catch (err: any) {
    console.error("🔥 NETWORK ERROR:", url, err.message);
    throw new Error(err.message || "Network request failed");
  }
}