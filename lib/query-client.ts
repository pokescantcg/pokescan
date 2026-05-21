import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";
<<<<<<< HEAD

const API_URL = "https://pokemon-card-scan.replit.app";

export function getApiUrl(): string {
  return API_URL;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url.toString(), {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
=======
import { BASE_URL } from "@/lib/api";

// -------------------- BASE URL --------------------
export function getApiUrl(): string {
  return BASE_URL;
}

// -------------------- ERROR HANDLER --------------------
async function throwIfResNotOk(res: Response) {
  if (res.status === 401) {
    return null; // ✅ Prevent crashes on unauthenticated
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error: ${res.status} - ${text}`);
  }
}

// -------------------- API REQUEST --------------------
export async function apiRequest(
  method: string,
  route: string,
  data?: unknown
) {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl).toString();

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  // ✅ Handle 401 safely
  if (res.status === 401) {
    return null;
  }

  // ✅ Handle other errors
  await throwIfResNotOk(res);

  return res.json();
}

// -------------------- REACT QUERY --------------------
type UnauthorizedBehavior = "returnNull" | "throw";

>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url.toString(), {
      credentials: "include",
    });

<<<<<<< HEAD
    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
=======
    // ✅ Prevent crash on unauthenticated
    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null as any;
    }

    await throwIfResNotOk(res);

    return res.json();
  };

// -------------------- QUERY CLIENT --------------------
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }), // ✅ CRITICAL FIX
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
<<<<<<< HEAD
});
=======
});
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
