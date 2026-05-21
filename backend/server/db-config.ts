import type { PoolConfig } from "pg";

// ✅ Ensure DATABASE_URL exists in production
if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL is required in production");
}

const DATABASE_URL =
  process.env.DATABASE_URL ||
  `postgres://postgres:killer89!@127.0.0.1:5433/pokescan`;

const isLocalDb =
  DATABASE_URL.includes("127.0.0.1") ||
  DATABASE_URL.includes("localhost") ||
  DATABASE_URL.includes("::1");

const useSsl = !isLocalDb;

export const DATABASE_POOL_CONFIG: PoolConfig = {
  connectionString: DATABASE_URL,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
};

// ✅ Safe debug log (won’t expose password)
console.log(
  "DB connected to:",
  DATABASE_URL?.includes("supabase")
    ? "Supabase"
    : isLocalDb
    ? "Localhost"
    : "Remote DB"
);