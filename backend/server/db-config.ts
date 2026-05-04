import type { PoolConfig } from "pg";

const PG_HOST = process.env.PGHOST || process.env.DB_HOST || "127.0.0.1";
const PG_PORT = process.env.PGPORT || process.env.DB_PORT || "5433";
const PG_USER = process.env.PGUSER || process.env.DB_USER || "postgres";
const PG_PASSWORD = process.env.PGPASSWORD || process.env.DB_PASSWORD || "killer89!";
const PG_DATABASE = process.env.PGDATABASE || process.env.DB_NAME || "pokescan";

export const DATABASE_URL =
  process.env.DATABASE_URL ||
  `postgres://${PG_USER}:${encodeURIComponent(PG_PASSWORD)}@${PG_HOST}:${PG_PORT}/${PG_DATABASE}`;

const sslEnabled =
  process.env.DATABASE_SSL === "true" ||
  process.env.PGSSLMODE === "require" ||
  process.env.PGSSLMODE === "verify-ca" ||
  process.env.PGSSLMODE === "verify-full";

export const DATABASE_POOL_CONFIG: PoolConfig = {
  connectionString: DATABASE_URL,
  ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
};
