iimport { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

// ✅ Safety check (VERY important)
if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required in production");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });

export async function warmupDb(maxAttempts = 8, delayMs = 2000): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const client = await pool.connect();
      await client.query("SELECT 1");
      client.release();

      if (attempt > 1) {
        console.log(`[DB] Connected after ${attempt} attempts`);
      }

      return;
    } catch (err: any) {
      const isNeonColdStart =
        err?.message?.includes("endpoint has been disabled") ||
        err?.message?.includes("endpoint is disabled") ||
        err?.code === "XX000";

      if (isNeonColdStart && attempt < maxAttempts) {
        console.log(
          `[DB] Neon cold start, retrying in ${delayMs}ms (attempt ${attempt}/${maxAttempts})...`
        );
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        console.warn(
          `[DB] Warmup failed after ${attempt} attempts:`,
          err?.message
        );
        return;
      }
    }
  }
}