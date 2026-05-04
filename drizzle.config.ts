import { defineConfig } from "drizzle-kit";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:ThePokemonKing26!@db.iaugjjkbmydlroifpdho.supabase.co:5432/postgres";

export default defineConfig({
  out: "./migrations",
  schema: "./backend/shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL,
  },
});
