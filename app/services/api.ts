import Constants from "expo-constants";
import { Platform } from "react-native";

const DEFAULT_BASE_URL = "https://pokescantcg.onrender.com";
const DEV_LOCAL_URL = Platform.OS === "android" ? "http://10.0.2.2:5000" : "http://localhost:5000";

export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  (process.env.NODE_ENV === "development" ? DEV_LOCAL_URL : DEFAULT_BASE_URL);

function defaultHeaders(body: unknown, extraHeaders?: Record<string, string>) {
  const headers: Record<string, string> = {
    ...(extraHeaders ?? {}),
  };

  if (body !== undefined && !(body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

export async function apiFetch<T = any>(route: string, options?: {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}): Promise<T> {
  const url = new URL(route, BASE_URL).toString();
  const bodyValue: BodyInit | undefined =
    options?.body === undefined
      ? undefined
      : options?.body instanceof FormData
      ? options.body
      : JSON.stringify(options.body as any);

  const init: RequestInit = {
    method: options?.method ?? "GET",
    headers: defaultHeaders(options?.body, options?.headers),
    body: bodyValue,
    credentials: "include",
  };

  const res = await fetch(url, init);
  const text = await res.text();

  let payload: any = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!res.ok) {
    const message = payload?.error || payload?.message || text || res.statusText;
    throw new Error(message);
  }

  return payload ?? ({} as T);
}

export default BASE_URL;