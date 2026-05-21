import { defineConfig } from "drizzle-kit";

<<<<<<< HEAD
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
=======
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:ThePokemonKing26!@db.iaugjjkbmydlroifpdho.supabase.co:5432/postgres";

export default defineConfig({
  out: "./migrations",
  schema: "./backend/shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL,
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
  },
});
