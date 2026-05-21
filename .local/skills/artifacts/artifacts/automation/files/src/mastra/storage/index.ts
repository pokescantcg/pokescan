import { PostgresStore } from "@mastra/pg";

// Create a single shared PostgreSQL storage instance
export const sharedPostgresStorage = new PostgresStore({
  id: "main-postgres-store",
  connectionString:
<<<<<<< HEAD
    process.env.DATABASE_URL || "postgresql://localhost:5432/mastra",
=======
    process.env.DATABASE_URL || "postgresql://localhost:5433/mastra",
>>>>>>> 702a2984a1522fbb24b0279bbb3a88bed8270a9f
});
