import type { PoolConfig } from "pg";

// ✅ Ensure DATABASE_URL exists in production
if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL is required in production");
}

// ✅ Use Supabase / Render DB in production
// ✅ Fallback ONLY for local development
const DATABASE_URL =
  process.env.DATABASE_URL ||
  `postgres://postgres:killer89!@127.0.0.1:5433/pokescan`;

// ✅ Enable SSL automatically for hosted DBs
const isProduction = process.env.NODE_ENV === "production";

export const DATABASE_POOL_CONFIG: PoolConfig = {
  connectionString: DATABASE_URL,
  ssl: isProduction
    ? { rejectUnauthorized: false }
    : undefined,
};

// ✅ Safe debug log (won’t expose password)
console.log(
  "DB connected to:",
  DATABASE_URL?.includes("supabase")
    ? "Supabase"
    : DATABASE_URL?.includes("127.0.0.1")
    ? "Localhost"
    : "Unknown"
);