import { Platform } from "react-native";

const PROD_URL = "https://pokescan.onrender.com"; // ← your Render URL
const LOCAL_IP = "192.168.1.107"; // only used in dev

export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (__DEV__
    ? (Platform.OS === "android"
        ? "http://10.0.2.2:5000"
        : `http://${LOCAL_IP}:5000`)
    : PROD_URL);

console.log("API BASE URL:", BASE_URL);
export const apiFetch = async (
  path: string,
  options?: RequestInit
) => {
  const url = `${BASE_URL}${path}`;

  console.log("API REQUEST:", url);

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error: ${res.status} - ${text}`);
  }

  return res.json();
};