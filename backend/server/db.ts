import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";
import { DATABASE_POOL_CONFIG } from "./db-config";

export const pool = new Pool({
  ...DATABASE_POOL_CONFIG,
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
        console.log(`[DB] Neon cold start, retrying in ${delayMs}ms (attempt ${attempt}/${maxAttempts})...`);
        await new Promise(r => setTimeout(r, delayMs));
      } else {
        console.warn(`[DB] Warmup failed after ${attempt} attempts:`, err?.message);
        return;
      }
    }
  }
}
