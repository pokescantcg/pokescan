import { defineConfig } from "drizzle-kit";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:killer89!@127.0.0.1:5433/pokescan";

export default defineConfig({
  out: "./migrations",
  schema: "./backend/shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL,
  },
});
