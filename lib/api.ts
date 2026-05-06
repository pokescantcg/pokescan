// ======================================================
// API CONFIG + FETCH WRAPPER (CLEAN + STABLE)
// Location: lib/api.ts
// ======================================================

import { Platform } from "react-native";

// ------------------------------------------------------
// BASE URL (AUTO SWITCHING)
// ------------------------------------------------------

const DEV_LOCAL_URL =
  Platform.OS === "android"
    ? "http://10.0.2.2:5000" // Android emulator fix
    : "http://localhost:5000";

const PROD_URL = "https://pokescantcg.onrender.com";

// ✅ ONLY uses NODE_ENV (no env override bugs)
export const BASE_URL =
  process.env.NODE_ENV === "development"
    ? DEV_LOCAL_URL
    : PROD_URL;

// Debug log (keep this)
console.log("🌐 API BASE URL:", BASE_URL);

// ------------------------------------------------------
// HEADERS BUILDER
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
// FETCH WRAPPER
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

    // -----------------------------
    // HANDLE AUTH FAIL
    // -----------------------------
    if (response.status === 401) {
      console.warn("🔒 Unauthorized:", url);
      return null as T;
    }

    // -----------------------------
    // HANDLE ERRORS
    // -----------------------------
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