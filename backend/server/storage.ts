import { randomBytes, randomUUID } from "crypto";
import { Pool } from "pg";
import { DATABASE_POOL_CONFIG } from "./db-config";

const pool = new Pool({
  ...DATABASE_POOL_CONFIG,
});

export interface DbUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  mobileNumber: string;
  passwordHash?: string | null;
  authProvider: string;
  isPremium: boolean;
  role: string;
  avatarUrl?: string | null;
  createdAt: string;
  // Stripe subscription fields
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  subscriptionStatus?: string | null;
  subscriptionPeriodEnd?: Date | string | null;
  // Scan quota & streak fields
  scansUsedToday?: number;
  scanDate?: string | null;
  consecutiveLoginDays?: number;
  lastLoginDate?: string | null;
  bonusScanPools?: string | null;
  chatMutedUntil?: Date | string | null;
  chatBannedUntil?: Date | string | null;
  collectionVisible?: boolean;
  emailVerified?: boolean;
}

export interface IStorage {
  createUser(user: Omit<DbUser, "id" | "createdAt">): Promise<DbUser>;
  importUser(user: Omit<DbUser, "createdAt"> & { passwordHash?: string | null }): Promise<{ status: "created" | "skipped" }>;
  getUserById(id: string): Promise<DbUser | null>;
  getUserByEmail(email: string): Promise<DbUser | null>;
  getUserByMobile(mobile: string): Promise<DbUser | null>;
  getUserByUsername(username: string): Promise<DbUser | null>;
  getAllUsers(): Promise<DbUser[]>;
  updateUser(id: string, fields: Partial<DbUser>): Promise<DbUser | null>;
  setPassword(userId: string, passwordHash: string): Promise<void>;
  createSession(userId: string): Promise<string>;
  validateSession(token: string): Promise<DbUser | null>;
  deleteSession(token: string): Promise<void>;
  deleteAllUserSessions(userId: string): Promise<void>;
  deleteUser(id: string): Promise<void>;
}

export class PgStorage implements IStorage {
  async createUser(user: Omit<DbUser, "id" | "createdAt">): Promise<DbUser> {
    const id = randomUUID();
    const result = await pool.query(
      `INSERT INTO pokescan_users (id, username, display_name, email, mobile_number, password_hash, auth_provider, is_premium, role, avatar_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        id,
        user.username.toLowerCase().trim(),
        user.displayName.trim(),
        user.email.toLowerCase().trim(),
        user.mobileNumber?.trim() || "",
        user.passwordHash || null,
        user.authProvider || "local",
        user.isPremium || false,
        user.role || "user",
        user.avatarUrl || null,
      ]
    );
    return mapRow(result.rows[0]);
  }

  async importUser(user: Omit<DbUser, "createdAt"> & { passwordHash?: string | null }): Promise<{ status: "created" | "skipped" }> {
    // Skip if email already exists
    const existing = await pool.query("SELECT id FROM pokescan_users WHERE email = $1", [user.email.toLowerCase().trim()]);
    if (existing.rows.length > 0) return { status: "skipped" };
    await pool.query(
      `INSERT INTO pokescan_users (id, username, display_name, email, mobile_number, password_hash, auth_provider, is_premium, role, avatar_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (email) DO NOTHING`,
      [user.id, user.username.toLowerCase().trim(), user.displayName.trim(), user.email.toLowerCase().trim(),
       user.mobileNumber?.trim() || "", user.passwordHash || null, user.authProvider || "local",
       user.isPremium || false, user.role || "user", user.avatarUrl || null]
    );
    return { status: "created" };
  }

  async getUserById(id: string): Promise<DbUser | null> {
    const result = await pool.query(
      "SELECT * FROM pokescan_users WHERE id = $1",
      [id]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async getUserByEmail(email: string): Promise<DbUser | null> {
    const result = await pool.query(
      "SELECT * FROM pokescan_users WHERE email = $1",
      [email.toLowerCase().trim()]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async getUserByMobile(mobile: string): Promise<DbUser | null> {
    const normalized = normalizeMobile(mobile);
    const result = await pool.query(
      "SELECT * FROM pokescan_users WHERE mobile_number = $1 OR mobile_number = $2",
      [mobile.trim(), normalized]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async getUserByUsername(username: string): Promise<DbUser | null> {
    const result = await pool.query(
      "SELECT * FROM pokescan_users WHERE username = $1",
      [username.toLowerCase().trim()]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async getAllUsers(): Promise<DbUser[]> {
    const result = await pool.query(
      "SELECT * FROM pokescan_users ORDER BY created_at DESC"
    );
    return result.rows.map(mapRow);
  }

  async updateUser(id: string, fields: Partial<DbUser>): Promise<DbUser | null> {
    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (fields.isPremium !== undefined) {
      sets.push(`is_premium = $${idx++}`);
      values.push(fields.isPremium);
    }
    if (fields.role !== undefined) {
      sets.push(`role = $${idx++}`);
      values.push(fields.role);
    }
    if (fields.avatarUrl !== undefined) {
      sets.push(`avatar_url = $${idx++}`);
      values.push(fields.avatarUrl);
    }
    if (fields.displayName !== undefined) {
      sets.push(`display_name = $${idx++}`);
      values.push(fields.displayName);
    }
    if (fields.email !== undefined) {
      sets.push(`email = $${idx++}`);
      values.push(fields.email.toLowerCase().trim());
    }
    if (fields.mobileNumber !== undefined) {
      sets.push(`mobile_number = $${idx++}`);
      values.push(fields.mobileNumber.trim());
    }
    if ((fields as any).stripeCustomerId !== undefined) {
      sets.push(`stripe_customer_id = $${idx++}`);
      values.push((fields as any).stripeCustomerId);
    }
    if ((fields as any).stripeSubscriptionId !== undefined) {
      sets.push(`stripe_subscription_id = $${idx++}`);
      values.push((fields as any).stripeSubscriptionId);
    }
    if ((fields as any).stripePriceId !== undefined) {
      sets.push(`stripe_price_id = $${idx++}`);
      values.push((fields as any).stripePriceId);
    }
    if ((fields as any).subscriptionStatus !== undefined) {
      sets.push(`subscription_status = $${idx++}`);
      values.push((fields as any).subscriptionStatus);
    }
    if ((fields as any).subscriptionPeriodEnd !== undefined) {
      sets.push(`subscription_period_end = $${idx++}`);
      values.push((fields as any).subscriptionPeriodEnd);
    }
    if (fields.collectionVisible !== undefined) {
      sets.push(`collection_visible = $${idx++}`);
      values.push(fields.collectionVisible);
    }
    if (fields.emailVerified !== undefined) {
      sets.push(`email_verified = $${idx++}`);
      values.push(fields.emailVerified);
    }

    if (sets.length === 0) return this.getUserById(id);

    values.push(id);
    const result = await pool.query(
      `UPDATE pokescan_users SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async setPassword(userId: string, passwordHash: string): Promise<void> {
    await pool.query(
      "UPDATE pokescan_users SET password_hash = $1 WHERE id = $2",
      [passwordHash, userId]
    );
  }

  async createSession(userId: string): Promise<string> {
    const token = randomBytes(32).toString("hex");
    await pool.query(
      `INSERT INTO pokescan_sessions (token, user_id, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [token, userId]
    );
    return token;
  }

  async validateSession(token: string): Promise<DbUser | null> {
    const result = await pool.query(
      `SELECT u.* FROM pokescan_users u
       JOIN pokescan_sessions s ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async deleteSession(token: string): Promise<void> {
    await pool.query("DELETE FROM pokescan_sessions WHERE token = $1", [token]);
  }

  async deleteAllUserSessions(userId: string): Promise<void> {
    await pool.query("DELETE FROM pokescan_sessions WHERE user_id = $1", [userId]);
  }

  async deleteUser(id: string): Promise<void> {
    await pool.query("DELETE FROM pokescan_users WHERE id = $1", [id]);
  }
}

function mapRow(row: any): DbUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    email: row.email,
    mobileNumber: row.mobile_number,
    passwordHash: row.password_hash,
    authProvider: row.auth_provider,
    isPremium: row.is_premium,
    role: row.role,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    stripeCustomerId: row.stripe_customer_id ?? null,
    stripeSubscriptionId: row.stripe_subscription_id ?? null,
    stripePriceId: row.stripe_price_id ?? null,
    subscriptionStatus: row.subscription_status ?? null,
    subscriptionPeriodEnd: row.subscription_period_end ?? null,
    scansUsedToday: row.scans_used_today ?? 0,
    scanDate: row.scan_date ?? null,
    consecutiveLoginDays: row.consecutive_login_days ?? 0,
    lastLoginDate: row.last_login_date ?? null,
    bonusScanPools: row.bonus_scan_pools ?? null,
    chatMutedUntil: row.chat_muted_until ?? null,
    chatBannedUntil: row.chat_banned_until ?? null,
    collectionVisible: row.collection_visible ?? false,
    emailVerified: row.email_verified ?? false,
  };
}

function normalizeMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) {
    return "+44" + digits.slice(1);
  }
  if (!mobile.startsWith("+")) {
    return "+" + digits;
  }
  return mobile.trim();
}

export const storage = new PgStorage();
