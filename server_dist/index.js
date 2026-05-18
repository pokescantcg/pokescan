var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/utils/card-normalizers.ts
function normalizeFinishType(raw) {
  const s = (raw || "").toLowerCase();
  if (s.includes("master ball")) return "master_ball";
  if (s.includes("poke ball")) return "poke_ball";
  if (s.includes("staff")) return "staff_stamp";
  if (s.includes("prerelease")) return "prerelease_stamp";
  if (s.includes("winner")) return "winner_stamp";
  if (s.includes("league")) return "league_stamp";
  if (s.includes("champion")) return "champion_stamp";
  if (s.includes("stamp")) return "set_stamp";
  if (s.includes("reverse")) return "reverse_holo";
  if (s.includes("cosmos")) return "cosmos_holo";
  if (s.includes("cracked")) return "cracked_ice";
  if (s.includes("holo")) return "holo";
  if (s.includes("non")) return "non_holo";
  return "normal";
}
function normalizeEdition(raw) {
  const s = (raw || "").toLowerCase();
  if (s.includes("1st")) return "1st_edition";
  if (s.includes("shadowless")) return "shadowless";
  if (s.includes("unlimited")) return "unlimited";
  return "standard";
}
function createVariantId(cardId, finishType, editionType, language) {
  return `${cardId}_${finishType}_${editionType}_${language}`.toLowerCase().replace(/\s+/g, "_");
}
var init_card_normalizers = __esm({
  "server/utils/card-normalizers.ts"() {
    "use strict";
  }
});

// server/storage.ts
var storage_exports = {};
__export(storage_exports, {
  PgStorage: () => PgStorage,
  storage: () => storage
});
import { randomBytes, randomUUID } from "crypto";
import { Pool as Pool2 } from "pg";
function mapRow(row) {
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
    bannedUntil: row.banned_until ?? null,
    banReason: row.ban_reason ?? null,
    bannedAt: row.banned_at ?? null,
    bannedBy: row.banned_by ?? null,
    isTrialUsed: row.is_trial_used ?? false,
    collectionVisible: row.collection_visible ?? false,
    emailVerified: row.email_verified ?? false,
    isVerifiedCollector: row.is_verified_collector ?? false
  };
}
function normalizeMobile(mobile) {
  const digits = mobile.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) {
    return "+44" + digits.slice(1);
  }
  if (!mobile.startsWith("+")) {
    return "+" + digits;
  }
  return mobile.trim();
}
var pool2, PgStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    pool2 = new Pool2({
      connectionString: process.env.DATABASE_URL
    });
    PgStorage = class {
      async createUser(user) {
        const id = randomUUID();
        const result = await pool2.query(
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
            user.avatarUrl || null
          ]
        );
        return mapRow(result.rows[0]);
      }
      async importUser(user) {
        const existing = await pool2.query("SELECT id FROM pokescan_users WHERE email = $1", [user.email.toLowerCase().trim()]);
        if (existing.rows.length > 0) return { status: "skipped" };
        await pool2.query(
          `INSERT INTO pokescan_users (id, username, display_name, email, mobile_number, password_hash, auth_provider, is_premium, role, avatar_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (email) DO NOTHING`,
          [
            user.id,
            user.username.toLowerCase().trim(),
            user.displayName.trim(),
            user.email.toLowerCase().trim(),
            user.mobileNumber?.trim() || "",
            user.passwordHash || null,
            user.authProvider || "local",
            user.isPremium || false,
            user.role || "user",
            user.avatarUrl || null
          ]
        );
        return { status: "created" };
      }
      async getUserById(id) {
        const result = await pool2.query(
          "SELECT * FROM pokescan_users WHERE id = $1",
          [id]
        );
        return result.rows[0] ? mapRow(result.rows[0]) : null;
      }
      async getUserByEmail(email) {
        const result = await pool2.query(
          "SELECT * FROM pokescan_users WHERE email = $1",
          [email.toLowerCase().trim()]
        );
        return result.rows[0] ? mapRow(result.rows[0]) : null;
      }
      async getUserByMobile(mobile) {
        const normalized = normalizeMobile(mobile);
        const result = await pool2.query(
          "SELECT * FROM pokescan_users WHERE mobile_number = $1 OR mobile_number = $2",
          [mobile.trim(), normalized]
        );
        return result.rows[0] ? mapRow(result.rows[0]) : null;
      }
      async getUserByUsername(username) {
        const result = await pool2.query(
          "SELECT * FROM pokescan_users WHERE username = $1",
          [username.toLowerCase().trim()]
        );
        return result.rows[0] ? mapRow(result.rows[0]) : null;
      }
      async getAllUsers() {
        const result = await pool2.query(
          "SELECT * FROM pokescan_users ORDER BY created_at DESC"
        );
        return result.rows.map(mapRow);
      }
      async updateUser(id, fields) {
        const sets = [];
        const values = [];
        let idx = 1;
        if (fields.isPremium !== void 0) {
          sets.push(`is_premium = $${idx++}`);
          values.push(fields.isPremium);
        }
        if (fields.role !== void 0) {
          sets.push(`role = $${idx++}`);
          values.push(fields.role);
        }
        if (fields.avatarUrl !== void 0) {
          sets.push(`avatar_url = $${idx++}`);
          values.push(fields.avatarUrl);
        }
        if (fields.displayName !== void 0) {
          sets.push(`display_name = $${idx++}`);
          values.push(fields.displayName);
        }
        if (fields.email !== void 0) {
          sets.push(`email = $${idx++}`);
          values.push(fields.email.toLowerCase().trim());
        }
        if (fields.mobileNumber !== void 0) {
          sets.push(`mobile_number = $${idx++}`);
          values.push(fields.mobileNumber.trim());
        }
        if (fields.stripeCustomerId !== void 0) {
          sets.push(`stripe_customer_id = $${idx++}`);
          values.push(fields.stripeCustomerId);
        }
        if (fields.stripeSubscriptionId !== void 0) {
          sets.push(`stripe_subscription_id = $${idx++}`);
          values.push(fields.stripeSubscriptionId);
        }
        if (fields.stripePriceId !== void 0) {
          sets.push(`stripe_price_id = $${idx++}`);
          values.push(fields.stripePriceId);
        }
        if (fields.subscriptionStatus !== void 0) {
          sets.push(`subscription_status = $${idx++}`);
          values.push(fields.subscriptionStatus);
        }
        if (fields.subscriptionPeriodEnd !== void 0) {
          sets.push(`subscription_period_end = $${idx++}`);
          values.push(fields.subscriptionPeriodEnd);
        }
        if (fields.collectionVisible !== void 0) {
          sets.push(`collection_visible = $${idx++}`);
          values.push(fields.collectionVisible);
        }
        if (fields.emailVerified !== void 0) {
          sets.push(`email_verified = $${idx++}`);
          values.push(fields.emailVerified);
        }
        if (sets.length === 0) return this.getUserById(id);
        values.push(id);
        const result = await pool2.query(
          `UPDATE pokescan_users SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
          values
        );
        return result.rows[0] ? mapRow(result.rows[0]) : null;
      }
      async setPassword(userId, passwordHash) {
        await pool2.query(
          "UPDATE pokescan_users SET password_hash = $1 WHERE id = $2",
          [passwordHash, userId]
        );
      }
      async createSession(userId) {
        const token = randomBytes(32).toString("hex");
        await pool2.query(
          `INSERT INTO pokescan_sessions (token, user_id, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
          [token, userId]
        );
        return token;
      }
      async validateSession(token) {
        const result = await pool2.query(
          `SELECT u.* FROM pokescan_users u
       JOIN pokescan_sessions s ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
          [token]
        );
        return result.rows[0] ? mapRow(result.rows[0]) : null;
      }
      async deleteSession(token) {
        await pool2.query("DELETE FROM pokescan_sessions WHERE token = $1", [token]);
      }
      async deleteAllUserSessions(userId) {
        await pool2.query("DELETE FROM pokescan_sessions WHERE user_id = $1", [userId]);
      }
      async deleteUser(id) {
        await pool2.query("DELETE FROM pokescan_users WHERE id = $1", [id]);
      }
    };
    storage = new PgStorage();
  }
});

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  cardPriceHistory: () => cardPriceHistory,
  cardPricing: () => cardPricing,
  ebayPrices: () => ebayPrices,
  insertUserSchema: () => insertUserSchema,
  pokemonCardVariants: () => pokemonCardVariants,
  pokemonCards: () => pokemonCards,
  pokemonSets: () => pokemonSets,
  pokescanAdminActivityLog: () => pokescanAdminActivityLog,
  pokescanBlockedCredentials: () => pokescanBlockedCredentials,
  pokescanChatroomMessages: () => pokescanChatroomMessages,
  pokescanCollections: () => pokescanCollections,
  pokescanCollectorVerifications: () => pokescanCollectorVerifications,
  pokescanFriendships: () => pokescanFriendships,
  pokescanMarketListings: () => pokescanMarketListings,
  pokescanMessages: () => pokescanMessages,
  pokescanReports: () => pokescanReports,
  pokescanScanHistory: () => pokescanScanHistory,
  pokescanSessions: () => pokescanSessions,
  pokescanUsers: () => pokescanUsers,
  syncStatus: () => syncStatus,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var pokescanUsers, pokescanBlockedCredentials, pokescanSessions, insertUserSchema, users, pokemonSets, pokemonCards, cardPricing, ebayPrices, pokescanFriendships, pokescanMessages, pokescanReports, pokescanMarketListings, pokescanCollections, pokescanChatroomMessages, pokescanAdminActivityLog, pokescanCollectorVerifications, pokescanScanHistory, syncStatus, pokemonCardVariants, cardPriceHistory;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    pokescanUsers = pgTable("pokescan_users", {
      id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::varchar`),
      username: text("username").notNull().unique(),
      displayName: text("display_name").notNull(),
      email: text("email").notNull().unique(),
      mobileNumber: text("mobile_number").notNull().default(""),
      passwordHash: text("password_hash"),
      authProvider: text("auth_provider").notNull().default("local"),
      isPremium: boolean("is_premium").notNull().default(false),
      role: text("role").notNull().default("user"),
      avatarUrl: text("avatar_url"),
      // Stripe subscription fields
      stripeCustomerId: text("stripe_customer_id"),
      stripeSubscriptionId: text("stripe_subscription_id"),
      stripePriceId: text("stripe_price_id"),
      subscriptionStatus: text("subscription_status"),
      // active | canceled | past_due | trialing
      subscriptionPeriodEnd: timestamp("subscription_period_end", { withTimezone: true }),
      // Scan quota & daily login streak fields
      scansUsedToday: integer("scans_used_today").notNull().default(0),
      scanDate: text("scan_date"),
      // YYYY-MM-DD of last scan
      consecutiveLoginDays: integer("consecutive_login_days").notNull().default(0),
      lastLoginDate: text("last_login_date"),
      // YYYY-MM-DD of last checkin
      bonusScanPools: text("bonus_scan_pools"),
      // JSON: [{amount, expiresAt}]
      chatMutedUntil: timestamp("chat_muted_until", { withTimezone: true }),
      chatBannedUntil: timestamp("chat_banned_until", { withTimezone: true }),
      bannedUntil: timestamp("banned_until", { withTimezone: true }),
      banReason: text("ban_reason"),
      bannedAt: timestamp("banned_at", { withTimezone: true }),
      bannedBy: varchar("banned_by", { length: 36 }),
      isTrialUsed: boolean("is_trial_used").notNull().default(false),
      collectionVisible: boolean("collection_visible").notNull().default(false),
      isVerifiedCollector: boolean("is_verified_collector").notNull().default(false),
      emailVerified: boolean("email_verified").notNull().default(false),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`NOW()`)
    });
    pokescanBlockedCredentials = pgTable("pokescan_blocked_credentials", {
      id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::varchar`),
      email: text("email"),
      mobileNumber: text("mobile_number"),
      reason: text("reason").notNull().default("deleted"),
      blockedBy: varchar("blocked_by", { length: 36 }),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`NOW()`)
    });
    pokescanSessions = pgTable("pokescan_sessions", {
      token: varchar("token", { length: 64 }).primaryKey(),
      userId: varchar("user_id", { length: 36 }).notNull().references(() => pokescanUsers.id, { onDelete: "cascade" }),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`NOW()`),
      expiresAt: timestamp("expires_at", { withTimezone: true }).notNull().default(sql`NOW() + INTERVAL '30 days'`)
    });
    insertUserSchema = createInsertSchema(pokescanUsers).pick({
      username: true,
      displayName: true,
      email: true,
      mobileNumber: true
    });
    users = pgTable("users", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      username: text("username").notNull().unique(),
      password: text("password").notNull()
    });
    pokemonSets = pgTable("pokemon_sets", {
      id: varchar("id").primaryKey(),
      name: text("name").notNull(),
      series: text("series").notNull(),
      printedTotal: integer("printed_total"),
      total: integer("total"),
      releaseDate: text("release_date"),
      logoUrl: text("logo_url"),
      symbolUrl: text("symbol_url"),
      imageUrl: text("image_url"),
      hidden: boolean("hidden").default(false),
      syncedAt: timestamp("synced_at").default(sql`CURRENT_TIMESTAMP`),
      deletedAt: timestamp("deleted_at")
    });
    pokemonCards = pgTable("pokemon_cards", {
      id: varchar("id").primaryKey(),
      setId: varchar("set_id").notNull().references(() => pokemonSets.id),
      name: text("name").notNull(),
      number: text("number").notNull(),
      rarity: text("rarity"),
      supertype: text("supertype"),
      subtypes: text("subtypes"),
      imageSmall: text("image_small"),
      imageLarge: text("image_large"),
      artist: text("artist"),
      hp: text("hp"),
      nationalPokedexNumbers: text("national_pokedex_numbers"),
      description: text("description"),
      syncedAt: timestamp("synced_at").default(sql`CURRENT_TIMESTAMP`),
      deletedAt: timestamp("deleted_at")
    });
    cardPricing = pgTable("card_pricing", {
      id: serial("id").primaryKey(),
      variantId: text("variant_id").notNull().unique(),
      source: text("source").default("scrydex"),
      currency: text("currency").default("GBP"),
      tcgLow: real("tcg_low"),
      tcgMid: real("tcg_mid"),
      tcgHigh: real("tcg_high"),
      tcgMarket: real("tcg_market"),
      tcgDirectLow: real("tcg_direct_low"),
      cardmarketAvg: real("cardmarket_avg"),
      cardmarketLow: real("cardmarket_low"),
      cardmarketTrend: real("cardmarket_trend"),
      ebaySoldAverage: real("ebay_sold_average"),
      psa10Price: real("psa10_price"),
      psa9Price: real("psa9_price"),
      rawPrice: real("raw_price"),
      priceGBP: real("price_gbp"),
      confidenceScore: real("confidence_score").default(1),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    ebayPrices = pgTable("ebay_prices", {
      id: serial("id").primaryKey(),
      cardId: varchar("card_id").notNull().references(() => pokemonCards.id),
      title: text("title"),
      price: real("price"),
      currency: text("currency").default("GBP"),
      soldDate: text("sold_date"),
      listingUrl: text("listing_url"),
      isSold: boolean("is_sold").default(true),
      fetchedAt: timestamp("fetched_at").default(sql`CURRENT_TIMESTAMP`),
      variantId: text("variant_id").notNull().unique()
    });
    pokescanFriendships = pgTable("pokescan_friendships", {
      id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::varchar`),
      requesterId: varchar("requester_id", { length: 36 }).notNull().references(() => pokescanUsers.id, { onDelete: "cascade" }),
      addresseeId: varchar("addressee_id", { length: 36 }).notNull().references(() => pokescanUsers.id, { onDelete: "cascade" }),
      status: text("status").notNull().default("pending"),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`NOW()`)
    });
    pokescanMessages = pgTable("pokescan_messages", {
      id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::varchar`),
      senderId: varchar("sender_id", { length: 36 }).notNull().references(() => pokescanUsers.id, { onDelete: "cascade" }),
      recipientId: varchar("recipient_id", { length: 36 }).notNull().references(() => pokescanUsers.id, { onDelete: "cascade" }),
      subject: text("subject").notNull().default(""),
      body: text("body").notNull(),
      isRead: boolean("is_read").notNull().default(false),
      deletedBySender: boolean("deleted_by_sender").notNull().default(false),
      deletedByRecipient: boolean("deleted_by_recipient").notNull().default(false),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`NOW()`)
    });
    pokescanReports = pgTable("pokescan_reports", {
      id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::varchar`),
      reporterId: varchar("reporter_id", { length: 36 }).notNull().references(() => pokescanUsers.id, { onDelete: "cascade" }),
      reportedUserId: varchar("reported_user_id", { length: 36 }).references(() => pokescanUsers.id, { onDelete: "set null" }),
      contentType: text("content_type").notNull(),
      contentId: text("content_id").notNull(),
      reason: text("reason").notNull(),
      contentSnapshot: text("content_snapshot"),
      status: text("status").notNull().default("pending"),
      reviewNote: text("review_note"),
      reviewedBy: varchar("reviewed_by", { length: 36 }).references(() => pokescanUsers.id, { onDelete: "set null" }),
      reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`NOW()`)
    });
    pokescanMarketListings = pgTable("pokescan_market_listings", {
      id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::varchar`),
      userId: varchar("user_id", { length: 36 }).notNull().references(() => pokescanUsers.id, { onDelete: "cascade" }),
      userName: text("user_name").notNull(),
      cardId: text("card_id").notNull(),
      cardName: text("card_name").notNull(),
      cardImage: text("card_image").notNull(),
      setName: text("set_name").notNull(),
      rarity: text("rarity").notNull().default("Unknown"),
      type: text("type").notNull(),
      // "sale" | "trade"
      priceGBP: real("price_gbp"),
      condition: text("condition").notNull(),
      description: text("description").notNull().default(""),
      photos: text("photos").notNull().default("[]"),
      // JSON array of base64 strings (max 6)
      status: text("status").notNull().default("pending"),
      // "pending" | "approved" | "rejected"
      reviewedBy: varchar("reviewed_by", { length: 36 }).references(() => pokescanUsers.id, { onDelete: "set null" }),
      reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
      reviewNote: text("review_note"),
      reviewNoteUpdatedBy: varchar("review_note_updated_by", { length: 36 }).references(() => pokescanUsers.id, { onDelete: "set null" }),
      reviewNoteUpdatedAt: timestamp("review_note_updated_at", { withTimezone: true }),
      externalUrl: text("external_url"),
      // Optional link to eBay / external listing
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`NOW()`)
    });
    pokescanCollections = pgTable("pokescan_collections", {
      id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::varchar`),
      userId: varchar("user_id", { length: 36 }).notNull().references(() => pokescanUsers.id, { onDelete: "cascade" }),
      cardId: text("card_id").notNull(),
      cardName: text("card_name").notNull(),
      cardImage: text("card_image").notNull(),
      setName: text("set_name").notNull(),
      setId: text("set_id").notNull(),
      rarity: text("rarity").notNull().default("Unknown"),
      quantity: integer("quantity").notNull().default(1),
      condition: text("condition").notNull(),
      variantId: varchar("variant_id").references(() => pokemonCardVariants.id),
      priceGBP: real("price_gbp"),
      gradingCompany: varchar("grading_company", { length: 32 }),
      grade: varchar("grade", { length: 16 }),
      addedAt: timestamp("added_at", { withTimezone: true }).notNull().default(sql`NOW()`)
    });
    pokescanChatroomMessages = pgTable("pokescan_chatroom_messages", {
      id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::varchar`),
      senderId: varchar("sender_id", { length: 36 }).notNull().references(() => pokescanUsers.id, { onDelete: "cascade" }),
      senderUsername: text("sender_username").notNull(),
      senderDisplayName: text("sender_display_name").notNull(),
      senderAvatarUrl: text("sender_avatar_url"),
      body: text("body").notNull(),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`NOW()`)
    });
    pokescanAdminActivityLog = pgTable("pokescan_admin_activity_log", {
      id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::varchar`),
      listingId: varchar("listing_id", { length: 36 }),
      listingName: text("listing_name"),
      targetUserId: varchar("target_user_id", { length: 36 }),
      targetUsername: text("target_username"),
      action: text("action").notNull(),
      performedBy: varchar("performed_by", { length: 36 }).references(() => pokescanUsers.id, { onDelete: "set null" }),
      note: text("note"),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`NOW()`)
    });
    pokescanCollectorVerifications = pgTable("pokescan_collector_verifications", {
      id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::varchar`),
      userId: varchar("user_id", { length: 36 }).notNull().references(() => pokescanUsers.id, { onDelete: "cascade" }),
      cardId: text("card_id").notNull(),
      cardName: text("card_name").notNull(),
      cardImage: text("card_image").notNull(),
      frontPhoto: text("front_photo").notNull(),
      backPhoto: text("back_photo").notNull(),
      status: text("status").notNull().default("pending"),
      reviewedBy: varchar("reviewed_by", { length: 36 }).references(() => pokescanUsers.id, { onDelete: "set null" }),
      reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`NOW()`)
    });
    pokescanScanHistory = pgTable("pokescan_scan_history", {
      id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::varchar`),
      userId: varchar("user_id", { length: 36 }).notNull().references(() => pokescanUsers.id, { onDelete: "cascade" }),
      cardName: text("card_name").notNull(),
      setName: text("set_name").notNull(),
      cardNumber: text("card_number").notNull().default(""),
      language: text("language").notNull().default("english"),
      thumbnail: text("thumbnail"),
      priceGBP: real("price_gbp"),
      identification: text("identification").notNull().default("{}"),
      tcgApiResults: text("tcg_api_results").notNull().default("[]"),
      pcvResults: text("pcv_results").notNull().default("[]"),
      scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().default(sql`NOW()`)
    });
    syncStatus = pgTable("sync_status", {
      id: serial("id").primaryKey(),
      totalSets: integer("total_sets").default(0),
      syncedSets: integer("synced_sets").default(0),
      totalCards: integer("total_cards").default(0),
      syncedCards: integer("synced_cards").default(0),
      lastCardSyncAt: timestamp("last_card_sync_at"),
      lastPriceSyncAt: timestamp("last_price_sync_at"),
      isRunning: boolean("is_running").default(false),
      lastError: text("last_error"),
      updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`)
    });
    pokemonCardVariants = pgTable("pokemon_card_variants", {
      id: varchar("id").primaryKey(),
      cardId: varchar("card_id").notNull().references(() => pokemonCards.id),
      finishType: text("finish_type").notNull().default("normal"),
      editionType: text("edition_type").notNull().default("unlimited"),
      language: text("language").notNull().default("english"),
      isPromo: boolean("is_promo").default(false),
      isStamped: boolean("is_stamped").default(false),
      variantLabel: text("variant_label"),
      imageUrl: text("image_url"),
      tcgplayerProductId: text("tcgplayer_product_id"),
      cardmarketId: text("cardmarket_id"),
      collectrId: text("collectr_id"),
      createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`)
    });
    cardPriceHistory = pgTable("card_price_history", {
      id: serial("id").primaryKey(),
      variantId: text("variant_id").notNull().references(() => pokemonCardVariants.id, {
        onDelete: "cascade"
      }),
      source: text("source").notNull(),
      price: real("price"),
      currency: text("currency").default("GBP"),
      fetchedAt: timestamp("fetched_at").default(sql`CURRENT_TIMESTAMP`)
    });
  }
});

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool as Pool3 } from "pg";
async function warmupDb(maxAttempts = 8, delayMs = 2e3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const client = await pool3.connect();
      await client.query("SELECT 1");
      client.release();
      if (attempt > 1) {
        console.log(`[DB] Connected after ${attempt} attempts`);
      }
      return;
    } catch (err) {
      const isNeonColdStart = err?.message?.includes("endpoint has been disabled") || err?.message?.includes("endpoint is disabled") || err?.code === "XX000";
      if (isNeonColdStart && attempt < maxAttempts) {
        console.log(`[DB] Neon cold start, retrying in ${delayMs}ms (attempt ${attempt}/${maxAttempts})...`);
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        console.warn(`[DB] Warmup failed after ${attempt} attempts:`, err?.message);
        return;
      }
    }
  }
}
var pool3, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required");
    }
    pool3 = new Pool3({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 3e4,
      connectionTimeoutMillis: 1e4
    });
    db = drizzle(pool3, { schema: schema_exports });
  }
});

// server/asian-set-seed.ts
var asian_set_seed_exports = {};
__export(asian_set_seed_exports, {
  JAPANESE_SET_SLUGS: () => JAPANESE_SET_SLUGS,
  TOTAL_ASIAN_SETS: () => TOTAL_ASIAN_SETS,
  seedAsianSets: () => seedAsianSets
});
function slugToName(slug) {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ").replace(/\bEx\b/g, "ex").replace(/\bV\b/g, "V").replace(/\bGx\b/g, "GX").replace(/\bVmax\b/g, "VMAX").replace(/\bVstar\b/g, "VSTAR").replace(/\bTag\b/g, "TAG");
}
function inferSeries(id) {
  const lower = id.toLowerCase();
  if (lower.includes("_ja")) return "Japanese";
  if (lower.includes("_ko")) return "Korean";
  if (lower.includes("_zh") || lower.includes("_cn")) return "Chinese";
  if (lower.startsWith("tcgp")) return "TCG Pocket";
  if (lower.startsWith("sv")) return "Scarlet & Violet";
  if (lower.startsWith("swsh")) return "Sword & Shield";
  if (lower.startsWith("sm")) return "Sun & Moon";
  if (lower.startsWith("xy")) return "XY";
  if (lower.startsWith("bw")) return "Black & White";
  if (lower.startsWith("dp")) return "Diamond & Pearl";
  if (lower.startsWith("pt")) return "Platinum";
  if (lower.startsWith("hgss") || lower.startsWith("l1") || lower.startsWith("l2") || lower.startsWith("l3")) return "HeartGold & SoulSilver";
  if (lower.startsWith("neo")) return "Neo";
  if (lower.startsWith("ecard")) return "E-Card";
  if (lower.startsWith("ex") || lower.startsWith("pcg") || lower.startsWith("adv")) return "EX";
  if (lower.startsWith("gym") || lower.startsWith("base")) return "Classic";
  return "Other";
}
async function upsertSet(id, name, series, releaseDate, logoUrl, symbolUrl, total) {
  try {
    await pool3.query(
      `INSERT INTO pokemon_sets (id, name, series, printed_total, total, release_date, logo_url, symbol_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [id, name, series, total, total, releaseDate || null, logoUrl || null, symbolUrl || null]
    );
    return "inserted";
  } catch (e) {
    console.error(`[AsianSeed] Error inserting set ${id}:`, e);
    return "error";
  }
}
async function getExistingSetIds() {
  const result = await pool3.query("SELECT id FROM pokemon_sets");
  return new Set(result.rows.map((r) => r.id));
}
async function seedAsianSets(onProgress) {
  const result = { inserted: 0, skipped: 0, errors: 0, details: [] };
  const log2 = (msg) => {
    result.details.push(msg);
    onProgress?.(msg);
  };
  log2("Fetching existing set IDs from DB...");
  const existing = await getExistingSetIds();
  log2(`Inserting ${JAPANESE_SETS.length} Japanese sets...`);
  for (const { slug, id } of JAPANESE_SETS) {
    if (existing.has(id)) {
      result.skipped++;
      continue;
    }
    const name = slugToName(slug);
    const series = inferSeries(id);
    const logoUrl = `${SCRYDEX_IMAGE_BASE}/${id}-logo/logo`;
    const symbolUrl = `${SCRYDEX_IMAGE_BASE}/${id}-symbol/symbol`;
    const outcome = await upsertSet(id, name, series, "", logoUrl, symbolUrl, 0);
    if (outcome === "inserted") {
      result.inserted++;
      log2(`\u2713 JP: ${name} (${id})`);
    } else if (outcome === "error") result.errors++;
  }
  log2(`Inserting ${KOREAN_SETS.length} Korean sets...`);
  for (const set of KOREAN_SETS) {
    if (existing.has(set.id)) {
      result.skipped++;
      continue;
    }
    const series = inferSeries(set.id);
    const outcome = await upsertSet(set.id, set.name, series, set.releaseDate || "", "", "", 0);
    if (outcome === "inserted") {
      result.inserted++;
      log2(`\u2713 KO: ${set.name} (${set.id})`);
    } else if (outcome === "error") result.errors++;
  }
  log2(`Inserting ${CHINESE_SETS.length} Chinese sets...`);
  for (const set of CHINESE_SETS) {
    if (existing.has(set.id)) {
      result.skipped++;
      continue;
    }
    const series = inferSeries(set.id);
    const outcome = await upsertSet(set.id, set.name, series, set.releaseDate || "", "", "", 0);
    if (outcome === "inserted") {
      result.inserted++;
      log2(`\u2713 ZH: ${set.name} (${set.id})`);
    } else if (outcome === "error") result.errors++;
  }
  log2(`Done. Inserted: ${result.inserted}, Skipped (already existed): ${result.skipped}, Errors: ${result.errors}`);
  return result;
}
var SCRYDEX_IMAGE_BASE, JAPANESE_SETS, KOREAN_SETS, CHINESE_SETS, JAPANESE_SET_SLUGS, TOTAL_ASIAN_SETS;
var init_asian_set_seed = __esm({
  "server/asian-set-seed.ts"() {
    "use strict";
    init_db();
    SCRYDEX_IMAGE_BASE = "https://images.scrydex.com/pokemon";
    JAPANESE_SETS = [
      { slug: "25th-anniversary-collection", id: "swsh8a_ja" },
      { slug: "advent-of-arceus", id: "pt4_ja" },
      { slug: "adv-expansion-pack", id: "adv1_ja" },
      { slug: "adv-promos", id: "advp_ja" },
      { slug: "alolan-moonlight", id: "sm2l_ja" },
      { slug: "alter-genesis", id: "sm12_ja" },
      { slug: "amazing-volt-tackle", id: "swsh4_ja" },
      { slug: "ancient-roar", id: "sv4k_ja" },
      { slug: "awakened-heroes", id: "sm4s_ja" },
      { slug: "awakening-legends", id: "neo3_ja" },
      { slug: "awakening-psychic-king", id: "xy10_ja" },
      { slug: "bandit-ring", id: "xy7_ja" },
      { slug: "base-expansion-pack", id: "ecard1_ja" },
      { slug: "battle-partners", id: "sv9_ja" },
      { slug: "battle-region", id: "swsh9a_ja" },
      { slug: "beat-of-the-frontier", id: "pt3_ja" },
      { slug: "black-bolt", id: "sv11b_ja" },
      { slug: "black-collection", id: "bw1b_ja" },
      { slug: "black-white-promos", id: "bwp_ja" },
      { slug: "blue-shock", id: "xy8b_ja" },
      { slug: "blue-sky-stream", id: "swsh7r_ja" },
      { slug: "bonds-to-the-end-of-time", id: "pt2_ja" },
      { slug: "challenge-from-the-darkness", id: "gym2_ja" },
      { slug: "champion-road", id: "sm6b_ja" },
      { slug: "clash-at-the-summit", id: "l3_ja" },
      { slug: "clash-of-the-blue-sky", id: "pcg2_ja" },
      { slug: "clay-burst", id: "sv2d_ja" },
      { slug: "cold-flare", id: "bw6c_ja" },
      { slug: "collection-moon", id: "sm1m_ja" },
      { slug: "collection-sun", id: "sm1s_ja" },
      { slug: "collection-x", id: "xy1x_ja" },
      { slug: "collection-y", id: "xy1y_ja" },
      { slug: "crimson-haze", id: "sv5a_ja" },
      { slug: "crossing-the-ruins", id: "neo2_ja" },
      { slug: "cruel-traitor", id: "xy11c_ja" },
      { slug: "cry-from-the-mysterious", id: "dp5c_ja" },
      { slug: "cyber-judge", id: "sv5m_ja" },
      { slug: "darkness-and-to-light", id: "neo4_ja" },
      { slug: "darkness-that-consumes-light", id: "sm3n_ja" },
      { slug: "dark-order", id: "sm8a_ja" },
      { slug: "dark-phantasma", id: "swsh10a_ja" },
      { slug: "dark-rush", id: "bw4_ja" },
      { slug: "dawn-dash", id: "dp4d_ja" },
      { slug: "diamond-pearl-promos", id: "dpp_ja" },
      { slug: "double-blaze", id: "sm10_ja" },
      { slug: "dragon-blade", id: "bw5d_ja" },
      { slug: "dragon-blast", id: "bw5s_ja" },
      { slug: "dragon-selection", id: "ds1_ja" },
      { slug: "dragon-storm", id: "sm6a_ja" },
      { slug: "dream-league", id: "sm11b_ja" },
      { slug: "eevee-heroes", id: "swsh6a_ja" },
      { slug: "emerald-break", id: "xy6_ja" },
      { slug: "ex-battle-boost", id: "ebb1_ja" },
      { slug: "expansion-pack-20th-anniversary", id: "cp6_ja" },
      { slug: "expansion-pack", id: "base1_ja" },
      { slug: "explosive-walker", id: "swsh2a_ja" },
      { slug: "facing-a-new-trial", id: "sm2p_ja" },
      { slug: "fairy-rise", id: "sm7b_ja" },
      { slug: "fever-burst-fighter", id: "xy11f_ja" },
      { slug: "flight-of-legends", id: "pcg1_ja" },
      { slug: "forbidden-light", id: "sm6_ja" },
      { slug: "freeze-bolt", id: "bw6f_ja" },
      { slug: "full-metal-wall", id: "sm9b_ja" },
      { slug: "fusion-arts", id: "swsh8_ja" },
      { slug: "future-flash", id: "sv4m_ja" },
      { slug: "gaia-volcano", id: "xy5g_ja" },
      { slug: "galactics-conquest", id: "pt1_ja" },
      { slug: "gg-end", id: "sm10a_ja" },
      { slug: "glory-of-team-rocket", id: "sv10_ja" },
      { slug: "golden-sky-silvery-ocean", id: "pcg4_ja" },
      { slug: "gold-silver-to-a-new-world", id: "neo1_ja" },
      { slug: "gx-battle-boost", id: "sm4p_ja" },
      { slug: "gx-ultra-shiny", id: "sm8b_ja" },
      { slug: "hail-blizzard", id: "bw3h_ja" },
      { slug: "heartgold-collection", id: "l1hg_ja" },
      { slug: "holon-phantom", id: "pcg7_ja" },
      { slug: "holon-research-tower", id: "pcg6_ja" },
      { slug: "hot-air-arena", id: "sv9a_ja" },
      { slug: "incandescent-arcana", id: "swsh11a_ja" },
      { slug: "inferno-x", id: "m2_ja" },
      { slug: "infinity-zone", id: "swsh3_ja" },
      { slug: "intense-fight-in-the-destroyed-sky", id: "dp6_ja" },
      { slug: "islands-await-you", id: "sm2k_ja" },
      { slug: "jet-black-spirit", id: "swsh6k_ja" },
      { slug: "j-promos", id: "miscpj_ja" },
      { slug: "jungle", id: "base2_ja" },
      { slug: "leaders-stadium", id: "gym1_ja" },
      { slug: "legendary-heartbeat", id: "swsh3a_ja" },
      { slug: "legendary-shine-collection", id: "cp2_ja" },
      { slug: "legend-promos", id: "lp_ja" },
      { slug: "lost-abyss", id: "swsh11_ja" },
      { slug: "lost-link", id: "ll1_ja" },
      { slug: "magma-gang-vs-aqua-gang-double-crisis", id: "cp1_ja" },
      { slug: "magma-vs-aqua-two-ambitions", id: "adv4_ja" },
      { slug: "mask-of-change", id: "sv6_ja" },
      { slug: "mega-brave", id: "m1l_ja" },
      { slug: "mega-dream-ex", id: "m2a_ja" },
      { slug: "mega-evolution-promos", id: "mp_ja" },
      { slug: "megalo-cannon", id: "bw9_ja" },
      { slug: "mega-premium-trainer-box", id: "ma_ja" },
      { slug: "mega-symphonia", id: "m1s_ja" },
      { slug: "mew-lucario-gift-box", id: "pcggb1_ja" },
      { slug: "miracle-crystal", id: "pcg8_ja" },
      { slug: "miracle-of-the-desert", id: "adv2_ja" },
      { slug: "miracle-twin", id: "sm11_ja" },
      { slug: "mirage-forest", id: "pcg5_ja" },
      { slug: "moonlit-pursuit", id: "dp4m_ja" },
      { slug: "mysterious-mountains", id: "ecard5_ja" },
      { slug: "mystery-of-the-fossils", id: "base3_ja" },
      { slug: "mythical-legendary-dream-shine-collection", id: "cp5_ja" },
      { slug: "neo-premium-file-1", id: "neo1pf_ja" },
      { slug: "neo-premium-file-2", id: "neo2pf_ja" },
      { slug: "neo-premium-file-3", id: "neo3pf_ja" },
      { slug: "night-unison", id: "sm9a_ja" },
      { slug: "night-wanderer", id: "sv6a_ja" },
      { slug: "nihil-zero", id: "m3_ja" },
      { slug: "ninja-spinner", id: "m4_ja" },
      { slug: "offense-and-defense-of-the-furthest-ends", id: "pcg9_ja" },
      { slug: "paradigm-trigger", id: "swsh12_ja" },
      { slug: "paradise-dragona", id: "sv7a_ja" },
      { slug: "pcg-promos", id: "pcgp_ja" },
      { slug: "peerless-fighters", id: "swsh5a_ja" },
      { slug: "phantom-gate", id: "xy4_ja" },
      { slug: "pikachus-new-friends", id: "sm0_ja" },
      { slug: "plasma-gale", id: "bw7_ja" },
      { slug: "platinum-promos", id: "ptp_ja" },
      { slug: "play-promos", id: "playp_ja" },
      { slug: "pokkyun-collection", id: "cp3_ja" },
      { slug: "pokemon-card-151", id: "sv2a_ja" },
      { slug: "pokemon-go", id: "swsh10b_ja" },
      { slug: "pokemon-vs", id: "vs1_ja" },
      { slug: "pokemon-web", id: "web1_ja" },
      { slug: "ppp-promos", id: "miscppp_ja" },
      { slug: "p-promos", id: "miscpp_ja" },
      { slug: "premium-champion-pack", id: "cp4_ja" },
      { slug: "psycho-drive", id: "bw3p_ja" },
      { slug: "rage-of-the-broken-heavens", id: "xy9_ja" },
      { slug: "raging-surf", id: "sv3a_ja" },
      { slug: "rapid-strike-master", id: "swsh5r_ja" },
      { slug: "rebellion-crash", id: "swsh2_ja" },
      { slug: "red-collection", id: "bw2_ja" },
      { slug: "red-flash", id: "xy8r_ja" },
      { slug: "remix-bout", id: "sm11a_ja" },
      { slug: "reviving-legends", id: "l2_ja" },
      { slug: "rising-fist", id: "xy3_ja" },
      { slug: "rocket-gang", id: "base4_ja" },
      { slug: "rocket-gang-strikes-back", id: "pcg3_ja" },
      { slug: "ruler-of-the-black-flame", id: "sv3_ja" },
      { slug: "rulers-of-the-heavens", id: "adv3_ja" },
      { slug: "scarlet-ex", id: "sv1s_ja" },
      { slug: "scarlet-violet-promos", id: "svp_ja" },
      { slug: "shiny-treasure-ex", id: "sv4a_ja" },
      { slug: "silver-lance", id: "swsh6l_ja" },
      { slug: "single-strike-master", id: "swsh5s_ja" },
      { slug: "skyscraping-perfection", id: "swsh7d_ja" },
      { slug: "sky-splitting-charisma", id: "sm7_ja" },
      { slug: "snow-hazard", id: "sv2p_ja" },
      { slug: "soulsilver-collection", id: "l1ss_ja" },
      { slug: "space-juggler", id: "swsh10p_ja" },
      { slug: "space-time-creation", id: "dp1_ja" },
      { slug: "spiral-force", id: "bw8s_ja" },
      { slug: "split-earth", id: "ecard4_ja" },
      { slug: "star-birth", id: "swsh9_ja" },
      { slug: "stellar-miracle", id: "sv7_ja" },
      { slug: "strength-expansion-pack-sun-moon", id: "sm1p_ja" },
      { slug: "sun-moon-promos", id: "smp_ja" },
      { slug: "super-burst-impact", id: "sm8_ja" },
      { slug: "super-electric-breaker", id: "sv8_ja" },
      { slug: "sword-shield-promos", id: "swshp_ja" },
      { slug: "sword", id: "swsh1w_ja" },
      { slug: "tag-bolt", id: "sm9_ja" },
      { slug: "tag-team-gx-tag-all-stars", id: "sm12a_ja" },
      { slug: "temple-of-anger", id: "dp5t_ja" },
      { slug: "terastal-festival-ex", id: "sv8a_ja" },
      { slug: "the-best-of-xy", id: "xy_ja" },
      { slug: "the-town-on-no-map", id: "ecard2_ja" },
      { slug: "thunderclap-spark", id: "sm7a_ja" },
      { slug: "thunder-knuckle", id: "bw8t_ja" },
      { slug: "tidal-storm", id: "xy5t_ja" },
      { slug: "time-gazer", id: "swsh10d_ja" },
      { slug: "to-have-seen-the-battle-rainbow", id: "sm3h_ja" },
      { slug: "topsun", id: "topsun_ja" },
      { slug: "t-promos", id: "miscpt_ja" },
      { slug: "triplet-beat", id: "sv1a_ja" },
      { slug: "ultradimensional-beasts", id: "sm4a_ja" },
      { slug: "ultra-force", id: "sm5p_ja" },
      { slug: "ultra-moon", id: "sm5m_ja" },
      { slug: "ultra-sun", id: "sm5s_ja" },
      { slug: "undone-seal", id: "adv5_ja" },
      { slug: "unnumbered-promos", id: "miscp_ja" },
      { slug: "vending-machine-series-1-blue", id: "vnd1_ja" },
      { slug: "vending-machine-series-2-red", id: "vnd2_ja" },
      { slug: "vending-machine-series-3-green", id: "vnd3_ja" },
      { slug: "violet-ex", id: "sv1v_ja" },
      { slug: "vmax-climax", id: "swsh8b_ja" },
      { slug: "vmax-rising", id: "swsh1a_ja" },
      { slug: "vstar-universe", id: "swsh12a_ja" },
      { slug: "white-collection", id: "bw1w_ja" },
      { slug: "white-flare", id: "sv11w_ja" },
      { slug: "wild-blaze", id: "xy2_ja" },
      { slug: "wild-force", id: "sv5k_ja" },
      { slug: "wind-from-the-sea", id: "ecard3_ja" },
      { slug: "world-champions-pack", id: "pcg10_ja" },
      { slug: "xy-promos", id: "xyp_ja" }
    ];
    KOREAN_SETS = [
      // Scarlet & Violet era (2023–present)
      { id: "sv1s_ko", name: "Scarlet ex", releaseDate: "2023-01-20" },
      { id: "sv1v_ko", name: "Violet ex", releaseDate: "2023-01-20" },
      { id: "sv1a_ko", name: "Triplet Beat", releaseDate: "2023-03-10" },
      { id: "sv2d_ko", name: "Clay Burst", releaseDate: "2023-04-21" },
      { id: "sv2p_ko", name: "Snow Hazard", releaseDate: "2023-04-21" },
      { id: "sv2a_ko", name: "Pok\xE9mon Card 151", releaseDate: "2023-06-23" },
      { id: "sv3_ko", name: "Ruler of the Black Flame", releaseDate: "2023-07-28" },
      { id: "sv3a_ko", name: "Raging Surf", releaseDate: "2023-09-22" },
      { id: "sv4k_ko", name: "Ancient Roar", releaseDate: "2023-10-27" },
      { id: "sv4m_ko", name: "Future Flash", releaseDate: "2023-10-27" },
      { id: "sv4a_ko", name: "Shiny Treasure ex", releaseDate: "2023-12-01" },
      { id: "sv5k_ko", name: "Wild Force", releaseDate: "2024-01-26" },
      { id: "sv5m_ko", name: "Cyber Judge", releaseDate: "2024-01-26" },
      { id: "sv5a_ko", name: "Crimson Haze", releaseDate: "2024-03-22" },
      { id: "sv6_ko", name: "Mask of Change", releaseDate: "2024-04-26" },
      { id: "sv6a_ko", name: "Night Wanderer", releaseDate: "2024-06-07" },
      { id: "sv7_ko", name: "Stellar Miracle", releaseDate: "2024-07-19" },
      { id: "sv7a_ko", name: "Paradise Dragona", releaseDate: "2024-09-06" },
      { id: "sv8_ko", name: "Super Electric Breaker", releaseDate: "2024-10-18" },
      { id: "sv8a_ko", name: "Terastal Festival ex", releaseDate: "2024-11-08" },
      { id: "sv8pt5_ko", name: "Prismatic Evolutions", releaseDate: "2025-01-17" },
      { id: "sv9_ko", name: "Journey Together", releaseDate: "2025-03-28" },
      { id: "sv9a_ko", name: "Hot Air Arena", releaseDate: "2025-05-23" },
      { id: "sv10_ko", name: "Destined Rivals", releaseDate: "2025-06-27" },
      // Sword & Shield era (2020–2022)
      { id: "swsh1_ko", name: "Sword & Shield", releaseDate: "2020-02-07" },
      { id: "swsh1a_ko", name: "VMAX Rising", releaseDate: "2020-03-13" },
      { id: "swsh2_ko", name: "Rebellion Crash", releaseDate: "2020-04-24" },
      { id: "swsh2a_ko", name: "Explosive Walker", releaseDate: "2020-06-05" },
      { id: "swsh3_ko", name: "Infinity Zone", releaseDate: "2020-07-10" },
      { id: "swsh3a_ko", name: "Legendary Heartbeat", releaseDate: "2020-08-28" },
      { id: "swsh4_ko", name: "Amazing Volt Tackle", releaseDate: "2020-10-16" },
      { id: "swsh4a_ko", name: "Vivid Voltage", releaseDate: "2020-11-13" },
      { id: "swsh5s_ko", name: "Single Strike Master", releaseDate: "2021-01-22" },
      { id: "swsh5r_ko", name: "Rapid Strike Master", releaseDate: "2021-01-22" },
      { id: "swsh5a_ko", name: "Peerless Fighters", releaseDate: "2021-03-19" },
      { id: "swsh6l_ko", name: "Silver Lance", releaseDate: "2021-04-23" },
      { id: "swsh6k_ko", name: "Jet-Black Spirit", releaseDate: "2021-04-23" },
      { id: "swsh6a_ko", name: "Eevee Heroes", releaseDate: "2021-06-18" },
      { id: "swsh7d_ko", name: "Skyscraping Perfection", releaseDate: "2021-07-09" },
      { id: "swsh7r_ko", name: "Blue Sky Stream", releaseDate: "2021-07-09" },
      { id: "swsh8_ko", name: "Fusion Arts", releaseDate: "2021-09-24" },
      { id: "swsh8a_ko", name: "25th Anniversary Collection", releaseDate: "2021-10-22" },
      { id: "swsh8b_ko", name: "VMAX Climax", releaseDate: "2021-12-03" },
      { id: "swsh9_ko", name: "Star Birth", releaseDate: "2022-01-14" },
      { id: "swsh9a_ko", name: "Battle Region", releaseDate: "2022-02-25" },
      { id: "swsh10_ko", name: "Dark Phantasma", releaseDate: "2022-05-13" },
      { id: "swsh10a_ko", name: "Pok\xE9mon GO", releaseDate: "2022-07-01" },
      { id: "swsh10b_ko", name: "Lost Abyss", releaseDate: "2022-07-15" },
      { id: "swsh11_ko", name: "Incandescent Arcana", releaseDate: "2022-09-02" },
      { id: "swsh11a_ko", name: "Paradigm Trigger", releaseDate: "2022-10-21" },
      { id: "swsh12_ko", name: "VSTAR Universe", releaseDate: "2022-12-02" },
      // Sun & Moon era (2017–2019)
      { id: "sm1s_ko", name: "Collection Sun", releaseDate: "2017-01-20" },
      { id: "sm1m_ko", name: "Collection Moon", releaseDate: "2017-01-20" },
      { id: "sm1p_ko", name: "Strength Expansion Pack Sun & Moon", releaseDate: "2017-03-17" },
      { id: "sm2k_ko", name: "Islands Await You", releaseDate: "2017-03-17" },
      { id: "sm2l_ko", name: "Alolan Moonlight", releaseDate: "2017-03-17" },
      { id: "sm2p_ko", name: "Facing a New Trial", releaseDate: "2017-06-16" },
      { id: "sm3n_ko", name: "Darkness that Consumes Light", releaseDate: "2017-08-11" },
      { id: "sm3h_ko", name: "To Have Seen the Battle Rainbow", releaseDate: "2017-08-11" },
      { id: "sm4a_ko", name: "Ultradimensional Beasts", releaseDate: "2017-09-15" },
      { id: "sm4s_ko", name: "Awakened Heroes", releaseDate: "2017-10-20" },
      { id: "sm4p_ko", name: "GX Battle Boost", releaseDate: "2017-10-20" },
      { id: "sm5s_ko", name: "Ultra Sun", releaseDate: "2018-01-19" },
      { id: "sm5m_ko", name: "Ultra Moon", releaseDate: "2018-01-19" },
      { id: "sm5p_ko", name: "Ultra Force", releaseDate: "2018-02-02" },
      { id: "sm6_ko", name: "Forbidden Light", releaseDate: "2018-04-06" },
      { id: "sm6a_ko", name: "Dragon Storm", releaseDate: "2018-05-18" },
      { id: "sm6b_ko", name: "Champion Road", releaseDate: "2018-07-13" },
      { id: "sm7_ko", name: "Sky-Splitting Charisma", releaseDate: "2018-08-03" },
      { id: "sm7a_ko", name: "Thunderclap Spark", releaseDate: "2018-09-07" },
      { id: "sm7b_ko", name: "Fairy Rise", releaseDate: "2018-10-05" },
      { id: "sm8_ko", name: "Super Burst Impact", releaseDate: "2018-11-02" },
      { id: "sm8a_ko", name: "Dark Order", releaseDate: "2018-12-07" },
      { id: "sm8b_ko", name: "GX Ultra Shiny", releaseDate: "2018-11-02" },
      { id: "sm9_ko", name: "TAG BOLT", releaseDate: "2019-01-11" },
      { id: "sm9a_ko", name: "Night Unison", releaseDate: "2019-02-01" },
      { id: "sm9b_ko", name: "Full Metal Wall", releaseDate: "2019-03-01" },
      { id: "sm10_ko", name: "Double Blaze", releaseDate: "2019-04-05" },
      { id: "sm10a_ko", name: "GG End", releaseDate: "2019-05-31" },
      { id: "sm11_ko", name: "Miracle Twin", releaseDate: "2019-06-07" },
      { id: "sm11a_ko", name: "Remix Bout", releaseDate: "2019-08-02" },
      { id: "sm11b_ko", name: "Dream League", releaseDate: "2019-09-06" },
      { id: "sm12_ko", name: "Alter Genesis", releaseDate: "2019-10-04" },
      { id: "sm12a_ko", name: "TAG TEAM GX TAG All Stars", releaseDate: "2019-10-04" },
      // XY era (2014–2016)
      { id: "xy1x_ko", name: "Collection X", releaseDate: "2014-01-25" },
      { id: "xy1y_ko", name: "Collection Y", releaseDate: "2014-01-25" },
      { id: "xy2_ko", name: "Wild Blaze", releaseDate: "2014-03-15" },
      { id: "xy3_ko", name: "Rising Fist", releaseDate: "2014-07-05" },
      { id: "xy4_ko", name: "Phantom Gate", releaseDate: "2014-09-13" },
      { id: "xy5g_ko", name: "Gaia Volcano", releaseDate: "2014-11-15" },
      { id: "xy5t_ko", name: "Tidal Storm", releaseDate: "2014-11-15" },
      { id: "xy6_ko", name: "Emerald Break", releaseDate: "2015-03-14" },
      { id: "xy7_ko", name: "Bandit Ring", releaseDate: "2015-07-18" },
      { id: "xy8r_ko", name: "Red Flash", releaseDate: "2015-10-31" },
      { id: "xy8b_ko", name: "Blue Shock", releaseDate: "2015-10-31" },
      { id: "xy9_ko", name: "Rage of the Broken Heavens", releaseDate: "2016-01-30" },
      { id: "xy10_ko", name: "Awakening Psychic King", releaseDate: "2016-04-09" },
      { id: "xy11c_ko", name: "Cruel Traitor", releaseDate: "2016-07-16" },
      { id: "xy11f_ko", name: "Fever-Burst Fighter", releaseDate: "2016-07-16" },
      { id: "xy12_ko", name: "Evolutions", releaseDate: "2016-11-11" },
      // Black & White era (2011–2013)
      { id: "bw1b_ko", name: "Black Collection", releaseDate: "2011-04-15" },
      { id: "bw1w_ko", name: "White Collection", releaseDate: "2011-04-15" },
      { id: "bw2_ko", name: "Red Collection", releaseDate: "2011-08-20" },
      { id: "bw3h_ko", name: "Hail Blizzard", releaseDate: "2012-01-28" },
      { id: "bw3p_ko", name: "Psycho Drive", releaseDate: "2012-01-28" },
      { id: "bw4_ko", name: "Dark Rush", releaseDate: "2012-04-14" },
      { id: "bw5d_ko", name: "Dragon Blade", releaseDate: "2012-07-14" },
      { id: "bw5s_ko", name: "Dragon Blast", releaseDate: "2012-07-14" },
      { id: "bw6c_ko", name: "Cold Flare", releaseDate: "2012-11-17" },
      { id: "bw6f_ko", name: "Freeze Bolt", releaseDate: "2012-11-17" },
      { id: "bw7_ko", name: "Plasma Gale", releaseDate: "2013-03-09" },
      { id: "bw8s_ko", name: "Spiral Force", releaseDate: "2013-07-13" },
      { id: "bw8t_ko", name: "Thunder Knuckle", releaseDate: "2013-07-13" },
      { id: "bw9_ko", name: "Megalo Cannon", releaseDate: "2013-08-10" },
      // Diamond & Pearl era (2006–2009)
      { id: "dp1_ko", name: "Space-Time Creation", releaseDate: "2007-04-01" },
      { id: "dp4d_ko", name: "Dawn Dash", releaseDate: "2008-04-12" },
      { id: "dp4m_ko", name: "Moonlit Pursuit", releaseDate: "2008-04-12" },
      { id: "dp5c_ko", name: "Cry from the Mysterious", releaseDate: "2008-07-10" },
      { id: "dp5t_ko", name: "Temple of Anger", releaseDate: "2008-07-10" },
      { id: "dp6_ko", name: "Intense Fight in the Destroyed Sky", releaseDate: "2008-11-01" },
      // Platinum era
      { id: "pt1_ko", name: "Galactic's Conquest", releaseDate: "2009-02-11" },
      { id: "pt2_ko", name: "Bonds to the End of Time", releaseDate: "2009-05-09" },
      { id: "pt3_ko", name: "Beat of the Frontier", releaseDate: "2009-09-02" },
      { id: "pt4_ko", name: "Advent of Arceus", releaseDate: "2009-11-11" },
      // HGSS era
      { id: "l1hg_ko", name: "HeartGold Collection", releaseDate: "2010-02-11" },
      { id: "l1ss_ko", name: "SoulSilver Collection", releaseDate: "2010-02-11" },
      { id: "l2_ko", name: "Reviving Legends", releaseDate: "2010-04-14" },
      { id: "l3_ko", name: "Clash at the Summit", releaseDate: "2010-10-27" }
    ];
    CHINESE_SETS = [
      // Scarlet & Violet era (2023–present)
      { id: "sv1s_zh", name: "Scarlet ex", releaseDate: "2023-04-14" },
      { id: "sv1v_zh", name: "Violet ex", releaseDate: "2023-04-14" },
      { id: "sv1a_zh", name: "Triplet Beat", releaseDate: "2023-06-16" },
      { id: "sv2d_zh", name: "Clay Burst", releaseDate: "2023-07-21" },
      { id: "sv2p_zh", name: "Snow Hazard", releaseDate: "2023-07-21" },
      { id: "sv2a_zh", name: "Pok\xE9mon Card 151", releaseDate: "2023-10-27" },
      { id: "sv3_zh", name: "Ruler of the Black Flame", releaseDate: "2023-11-24" },
      { id: "sv3a_zh", name: "Raging Surf", releaseDate: "2024-01-19" },
      { id: "sv4k_zh", name: "Ancient Roar", releaseDate: "2024-02-23" },
      { id: "sv4m_zh", name: "Future Flash", releaseDate: "2024-02-23" },
      { id: "sv4a_zh", name: "Shiny Treasure ex", releaseDate: "2024-04-26" },
      { id: "sv5k_zh", name: "Wild Force", releaseDate: "2024-05-17" },
      { id: "sv5m_zh", name: "Cyber Judge", releaseDate: "2024-05-17" },
      { id: "sv5a_zh", name: "Crimson Haze", releaseDate: "2024-07-19" },
      { id: "sv6_zh", name: "Mask of Change", releaseDate: "2024-08-23" },
      { id: "sv6a_zh", name: "Night Wanderer", releaseDate: "2024-10-18" },
      { id: "sv7_zh", name: "Stellar Miracle", releaseDate: "2024-11-22" },
      { id: "sv7a_zh", name: "Paradise Dragona", releaseDate: "2025-01-17" },
      { id: "sv8_zh", name: "Super Electric Breaker", releaseDate: "2025-02-14" },
      { id: "sv8a_zh", name: "Terastal Festival ex", releaseDate: "2025-04-11" },
      { id: "sv8pt5_zh", name: "Prismatic Evolutions", releaseDate: "2025-05-16" },
      { id: "sv9_zh", name: "Journey Together", releaseDate: "2025-07-11" },
      // Sword & Shield era (2020–2022)
      { id: "swsh1_zh", name: "Sword & Shield", releaseDate: "2020-06-19" },
      { id: "swsh1a_zh", name: "VMAX Rising", releaseDate: "2020-08-28" },
      { id: "swsh2_zh", name: "Rebellion Crash", releaseDate: "2020-10-30" },
      { id: "swsh2a_zh", name: "Explosive Walker", releaseDate: "2021-01-22" },
      { id: "swsh3_zh", name: "Infinity Zone", releaseDate: "2021-04-09" },
      { id: "swsh3a_zh", name: "Legendary Heartbeat", releaseDate: "2021-06-25" },
      { id: "swsh4_zh", name: "Amazing Volt Tackle", releaseDate: "2021-07-30" },
      { id: "swsh5s_zh", name: "Single Strike Master", releaseDate: "2021-10-22" },
      { id: "swsh5r_zh", name: "Rapid Strike Master", releaseDate: "2021-10-22" },
      { id: "swsh5a_zh", name: "Peerless Fighters", releaseDate: "2021-12-24" },
      { id: "swsh6l_zh", name: "Silver Lance", releaseDate: "2022-01-28" },
      { id: "swsh6k_zh", name: "Jet-Black Spirit", releaseDate: "2022-01-28" },
      { id: "swsh6a_zh", name: "Eevee Heroes", releaseDate: "2022-03-25" },
      { id: "swsh7_zh", name: "Evolving Skies", releaseDate: "2022-05-27" },
      { id: "swsh8_zh", name: "Fusion Arts", releaseDate: "2022-07-22" },
      { id: "swsh8b_zh", name: "VMAX Climax", releaseDate: "2022-10-28" },
      { id: "swsh9_zh", name: "Star Birth", releaseDate: "2022-11-25" },
      { id: "swsh10_zh", name: "Lost Abyss", releaseDate: "2023-01-13" },
      { id: "swsh11a_zh", name: "Incandescent Arcana", releaseDate: "2023-02-10" },
      { id: "swsh12_zh", name: "Paradigm Trigger", releaseDate: "2023-03-10" },
      // Sun & Moon era (2017–2019)
      { id: "sm8b_zh", name: "GX Ultra Shiny", releaseDate: "2019-01-25" },
      { id: "sm12a_zh", name: "TAG TEAM GX All Stars", releaseDate: "2019-11-29" },
      // XY era
      { id: "xy1_zh", name: "XY", releaseDate: "2014-05-01" },
      { id: "xy4_zh", name: "Phantom Gate", releaseDate: "2014-12-26" },
      { id: "xy6_zh", name: "Emerald Break", releaseDate: "2015-09-11" },
      { id: "xy9_zh", name: "Rage of the Broken Heavens", releaseDate: "2016-05-20" },
      { id: "xy12_zh", name: "Evolutions", releaseDate: "2017-03-24" }
    ];
    JAPANESE_SET_SLUGS = JAPANESE_SETS;
    TOTAL_ASIAN_SETS = JAPANESE_SETS.length + KOREAN_SETS.length + CHINESE_SETS.length;
  }
});

// server/non-tcg-seed.ts
var non_tcg_seed_exports = {};
__export(non_tcg_seed_exports, {
  seedNonTcgSets: () => seedNonTcgSets
});
async function upsertNonTcgSet(set) {
  try {
    const result = await pool3.query(
      `INSERT INTO pokemon_sets (id, name, series, printed_total, total, release_date, logo_url, symbol_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [
        set.id,
        set.name,
        set.series,
        set.total,
        set.total,
        set.releaseDate || null,
        set.logoUrl || null,
        null
      ]
    );
    const inserted = (result.rowCount ?? 0) > 0;
    return inserted ? "inserted" : "skipped";
  } catch (e) {
    console.error(`[NonTcgSeed] Error inserting ${set.id}:`, e);
    return "error";
  }
}
async function seedNonTcgSets(onProgress) {
  const result = { inserted: 0, skipped: 0, errors: 0, details: [] };
  const log2 = (msg) => {
    result.details.push(msg);
    onProgress?.(msg);
  };
  log2(`[NonTcgSeed] Seeding ${ALL_NON_TCG_SETS.length} non-TCG sets...`);
  for (const set of ALL_NON_TCG_SETS) {
    const outcome = await upsertNonTcgSet(set);
    if (outcome === "inserted") {
      result.inserted++;
      log2(`\u2713 Non-TCG: ${set.name} (${set.id})${set.total > 0 ? ` \u2014 ${set.total} cards` : ""}`);
    } else if (outcome === "skipped") {
      result.skipped++;
    } else {
      result.errors++;
    }
  }
  log2(
    `[NonTcgSeed] Done. Inserted: ${result.inserted}, Skipped: ${result.skipped}, Errors: ${result.errors}`
  );
  return result;
}
var BABANUKI_SETS, MENGKA_SETS, ALL_NON_TCG_SETS;
var init_non_tcg_seed = __esm({
  "server/non-tcg-seed.ts"() {
    "use strict";
    init_db();
    BABANUKI_SETS = [
      {
        id: "babanuki-v1_ja",
        name: "Pok\xE9mon Babanuki",
        series: "Non-TCG",
        releaseDate: "2019-05-11",
        logoUrl: "https://archives.bulbagarden.net/media/upload/a/ac/Pok%C3%A9mon_Babanuki_box_art.png",
        total: 0,
        note: "Official Old Maid card game by The Pok\xE9mon Company. Released exclusively at Pok\xE9mon Center stores in Japan. Ages 4+, 3\u20136 players."
      },
      {
        id: "babanuki-v2_ja",
        name: "Pok\xE9mon Babanuki Super High Tension",
        series: "Non-TCG",
        releaseDate: "2023-08-03",
        logoUrl: "https://archives.bulbagarden.net/media/upload/8/85/Pok%C3%A9mon_Babanuki_Super_High_Tension_box_art.png",
        total: 0,
        note: "Second version of the official Pok\xE9mon Old Maid card game. Released at Pok\xE9mon Center stores in Japan. Ages 4+, 3\u20136 players."
      }
    ];
    MENGKA_SETS = [
      {
        id: "mengka-oor",
        name: "Mengka OOR Series",
        series: "Non-TCG",
        releaseDate: "",
        logoUrl: "",
        total: 19,
        note: "Chinese fan card set. OOR-001 through OOR-019 documented from eBay listings."
      },
      {
        id: "mengka-sr",
        name: "Mengka SR Series",
        series: "Non-TCG",
        releaseDate: "",
        logoUrl: "",
        total: 20,
        note: "Chinese fan card set. Complete set of 20 cards verified from eBay listings."
      },
      {
        id: "mengka-hr",
        name: "Mengka HR Series",
        series: "Non-TCG",
        releaseDate: "",
        logoUrl: "",
        total: 12,
        note: "Chinese fan card set. Complete set of 12 cards verified from eBay listings."
      },
      {
        id: "mengka-ar",
        name: "Mengka AR Eeveelution Series",
        series: "Non-TCG",
        releaseDate: "",
        logoUrl: "",
        total: 9,
        note: "Chinese fan card set. Eevee & Eeveelutions themed. 9 cards (AR-001 to AR-009) verified from eBay."
      },
      {
        id: "mengka-ur",
        name: "Mengka UR Series",
        series: "Non-TCG",
        releaseDate: "",
        logoUrl: "",
        total: 9,
        note: "Chinese fan card set. UR-001 through UR-009 documented from eBay listings."
      },
      {
        id: "mengka-dr",
        name: "Mengka DR Series",
        series: "Non-TCG",
        releaseDate: "",
        logoUrl: "",
        total: 9,
        note: "Chinese fan card set. DR-001 through DR-009 documented from eBay listings."
      },
      {
        id: "mengka-rs",
        name: "Mengka RS Series",
        series: "Non-TCG",
        releaseDate: "",
        logoUrl: "",
        total: 15,
        note: "Chinese fan card set. 15-card lot confirmed from eBay listings."
      },
      {
        id: "mengka-xr",
        name: "Mengka XR Travel Series",
        series: "Non-TCG",
        releaseDate: "",
        logoUrl: "",
        total: 7,
        note: "Chinese fan card set. Travel-themed series of 7 cards verified from eBay."
      },
      {
        id: "mengka-trainer",
        name: "Mengka Trainer Series",
        series: "Non-TCG",
        releaseDate: "",
        logoUrl: "",
        total: 9,
        note: "Chinese fan card set. Trainer Waifu edition, 9 cards verified from eBay."
      },
      {
        id: "mengka-travel",
        name: "Mengka Pok\xE9mon Travel",
        series: "Non-TCG",
        releaseDate: "",
        logoUrl: "",
        total: 10,
        note: "Chinese fan card set. Pok\xE9mon Travel edition, 10-card complete set from eBay."
      }
    ];
    ALL_NON_TCG_SETS = [...BABANUKI_SETS, ...MENGKA_SETS];
  }
});

// server/scrydex-scraper.ts
var scrydex_scraper_exports = {};
__export(scrydex_scraper_exports, {
  runScrydexSync: () => runScrydexSync,
  scrapeScrydexJpSets: () => scrapeScrydexJpSets,
  scrapeScrydexSetCards: () => scrapeScrydexSetCards,
  scrapeScrydexSetDetail: () => scrapeScrydexSetDetail,
  scrapeScrydexSets: () => scrapeScrydexSets,
  scrapeScrydexTcgPocketSets: () => scrapeScrydexTcgPocketSets
});
import { count, inArray, isNull, eq, or, and } from "drizzle-orm";
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
async function fetchPage2(path2) {
  const url = path2.startsWith("http") ? path2 : `${BASE_URL2}${path2}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    },
    signal: AbortSignal.timeout(2e4)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}
function htmlDecode(str) {
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}
function slugToName2(slug) {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
async function scrapeScrydexSets() {
  const html = await fetchPage2("/pokemon/expansions");
  return parseSetsFromHtml(html);
}
async function scrapeScrydexTcgPocketSets() {
  const html = await fetchPage2("/pokemon/tcg-pocket/expansions");
  return parseSetsFromHtml(html);
}
async function scrapeScrydexJpSets() {
  const html = await fetchPage2("/pokemon/jp/expansions");
  return parseSetsFromHtml(html);
}
function parseSetsFromHtml(html) {
  const sets = [];
  const seen = /* @__PURE__ */ new Set();
  const linkRe = /href="\/pokemon\/expansions\/([^"/]+)\/([^"/?\s]+)"/g;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const slug = m[1];
    const id = m[2];
    if (seen.has(id)) continue;
    seen.add(id);
    const start = m.index;
    const block = html.substring(start, start + 2e3);
    const name = slugToName2(slug);
    const series = inferSeries2(id);
    const dateM = block.match(/(\d{4}\/\d{2}\/\d{2}|\d{4}-\d{2}-\d{2})/);
    const releaseDate = dateM ? dateM[1].replace(/\//g, "-") : "";
    const countM = block.match(/(\d+)\s*cards?/i);
    const total = countM ? parseInt(countM[1], 10) : 0;
    const logoUrl = `${IMAGE_BASE}/${id}-logo/logo`;
    const symbolUrl = `${IMAGE_BASE}/${id}-symbol/symbol`;
    sets.push({ id, slug, name, series, releaseDate, total, logoUrl, symbolUrl });
  }
  return sets;
}
async function scrapeScrydexSetDetail(slug, id) {
  const html = await fetchPage2(`/pokemon/expansions/${slug}/${id}`);
  const nameM = html.match(
    /<h1[^>]*class="[^"]*text-heading-32[^"]*"[^>]*>([^<]+)<\/h1>/
  );
  const name = nameM ? htmlDecode(nameM[1].trim()) : slugToName2(slug);
  const seriesM = html.match(
    /<span[^>]*text-heading-16[^>]*>([^<]+)<\/span>[^<]*<span[^>]*text-mono-2[^>]*>[^<]*<\/span>[^<]*<span[^>]*text-heading-16[^>]*>(\d+)\s*cards?<\/span>/
  );
  const series = seriesM ? htmlDecode(seriesM[1].trim()) : inferSeries2(id);
  const total = seriesM ? parseInt(seriesM[2], 10) : 0;
  const dateM = html.match(/(\d{4}\/\d{2}\/\d{2})/);
  const releaseDate = dateM ? dateM[1].replace(/\//g, "-") : "";
  const logoUrl = `${IMAGE_BASE}/${id}-logo/logo`;
  const symbolUrl = `${IMAGE_BASE}/${id}-symbol/symbol`;
  return { id, slug, name, series, releaseDate, total, logoUrl, symbolUrl };
}
async function scrapeScrydexSetCards(slug, setId) {
  const html = await fetchPage2(`/pokemon/expansions/${slug}/${setId}`);
  return parseCardsFromSetHtml(html, setId);
}
function parseCardsFromSetHtml(html, setId) {
  const cards = [];
  const seen = /* @__PURE__ */ new Set();
  const linkRe = /href="\/pokemon\/cards\/([^/]+)\/([^?"]+)\?variant=([^"]+)"/g;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const cardSlug = m[1];
    const cardId = m[2];
    const rawVariant = m[3] || "normal";
    if (!cardId.startsWith(`${setId}-`)) {
      continue;
    }
    const finishType = normalizeFinishType(rawVariant);
    const editionType = normalizeEdition(rawVariant);
    const language = setId.includes("_ja") ? "japanese" : setId.includes("_ko") ? "korean" : setId.includes("_zh") ? "chinese" : "english";
    const variantId = createVariantId(
      cardId,
      finishType,
      editionType,
      language
    );
    const uniqueKey = `${cardId}:${variantId}`;
    if (seen.has(uniqueKey)) {
      continue;
    }
    seen.add(uniqueKey);
    const block = html.substring(m.index, m.index + 1500);
    const imgM = block.match(
      /src="(https:\/\/images\.scrydex\.com\/pokemon\/[^"]+\/medium)"/
    );
    const imageSmall = imgM ? imgM[1] : `${IMAGE_BASE}/${cardId}/medium`;
    const imageLarge = imageSmall.replace(
      "/medium",
      "/large"
    );
    let name = htmlDecode(slugToName2(cardSlug));
    let number = cardId.replace(`${setId}-`, "");
    const nameM = block.match(
      /class="[^"]*text-body-12[^"]*text-white[^"]*"[^>]*>([^<]+)<\/span>/
    );
    if (nameM) {
      const raw = htmlDecode(nameM[1].trim());
      const numMatch = raw.match(/^(.+?)\s*#(\S+)$/);
      if (numMatch) {
        name = numMatch[1].trim();
        number = numMatch[2];
      } else {
        name = raw;
      }
    }
    const priceM = block.match(/\$(\d+\.\d+)/);
    const priceUsd = priceM ? parseFloat(priceM[1]) : null;
    cards.push({
      id: cardId,
      setId,
      name,
      number,
      finishType,
      editionType,
      language,
      variantId,
      imageSmall,
      imageLarge,
      priceUsd
    });
  }
  return cards;
}
function inferSeries2(id) {
  const lower = id.toLowerCase();
  if (lower.includes("_ja")) return "Japanese";
  if (lower.includes("_ko")) return "Korean";
  if (lower.includes("_zh") || lower.includes("_cn")) return "Chinese";
  if (lower.startsWith("tcgp")) return "TCG Pocket";
  if (lower.startsWith("sv")) return "Scarlet & Violet";
  if (lower.startsWith("swsh")) return "Sword & Shield";
  if (lower.startsWith("sm")) return "Sun & Moon";
  if (lower.startsWith("xy")) return "XY";
  if (lower.startsWith("bw")) return "Black & White";
  if (/^me\d/.test(lower)) return "Mega Evolution";
  if (lower.startsWith("rsv") || lower.startsWith("zsv")) return "Scarlet & Violet";
  if (lower.startsWith("me")) return "Mega Evolution";
  if (lower.startsWith("neo")) return "Neo";
  if (lower.startsWith("ecard")) return "E-Card";
  if (lower.startsWith("ex")) return "EX";
  if (lower.startsWith("dp")) return "Diamond & Pearl";
  if (lower.startsWith("pl")) return "Platinum";
  if (lower.startsWith("hgss")) return "HeartGold & SoulSilver";
  if (lower.startsWith("col")) return "Call of Legends";
  if (lower.startsWith("gym")) return "Gym";
  if (lower.startsWith("base")) return "Base";
  if (lower.startsWith("pop")) return "POP Series";
  if (lower.startsWith("wc")) return "World Championships";
  if (lower.startsWith("np")) return "Neo";
  if (lower.startsWith("cel")) return "Sword & Shield";
  return "Other";
}
async function runScrydexSync(onProgress) {
  const progress = {
    phase: "sets",
    setsProcessed: 0,
    setsTotal: 0,
    setsAdded: 0,
    cardsProcessed: 0,
    cardsAdded: 0,
    cardsUpdated: 0
  };
  const report = (patch) => {
    Object.assign(progress, patch);
    onProgress?.(progress);
  };
  try {
    report({ phase: "sets", message: "Fetching set list from scrydex.com..." });
    const [enSets, pocketSets, jpSets] = await Promise.all([
      scrapeScrydexSets(),
      scrapeScrydexTcgPocketSets(),
      scrapeScrydexJpSets()
    ]);
    const allSetsMap = /* @__PURE__ */ new Map();
    for (const s of [...enSets, ...pocketSets, ...jpSets]) {
      if (!allSetsMap.has(s.id)) allSetsMap.set(s.id, s);
    }
    const allSets = [...allSetsMap.values()];
    report({ setsTotal: allSets.length, message: `Found ${allSets.length} sets on scrydex.com (EN + TCG Pocket + JP)` });
    const existingSetRows = await db.select({ id: pokemonSets.id, cardCount: count(pokemonCards.id) }).from(pokemonSets).leftJoin(pokemonCards, eq(pokemonCards.setId, pokemonSets.id)).groupBy(pokemonSets.id);
    const existingSetIds = /* @__PURE__ */ new Set();
    const setsWithCards = /* @__PURE__ */ new Set();
    for (const row of existingSetRows) {
      existingSetIds.add(row.id);
      if (row.cardCount > 0) setsWithCards.add(row.id);
    }
    const setsToProcess = allSets;
    report({
      setsTotal: setsToProcess.length,
      message: `Found ${allSets.length} sets on Scrydex \u2014 ${setsToProcess.length} need processing (new or empty).`
    });
    report({ phase: "cards" });
    for (const set of setsToProcess) {
      report({ currentSet: set.name, setsProcessed: progress.setsProcessed });
      const setId = set.id;
      if (!existingSetIds.has(setId)) {
        try {
          await delay(DELAY_MS);
          const detail = await scrapeScrydexSetDetail(set.slug, set.id);
          await db.insert(pokemonSets).values({
            id: detail.id,
            name: detail.name,
            series: detail.series,
            printedTotal: detail.total,
            total: detail.total,
            releaseDate: detail.releaseDate || null,
            logoUrl: detail.logoUrl,
            symbolUrl: detail.symbolUrl,
            imageUrl: detail.logoUrl
          }).onConflictDoNothing();
          existingSetIds.add(setId);
          report({ setsAdded: progress.setsAdded + 1 });
        } catch (err) {
          console.error(`[Scrydex] Failed to insert set ${setId}:`, err.message);
        }
      }
      try {
        await delay(DELAY_MS);
        const cards = await scrapeScrydexSetCards(set.slug, setId);
        if (cards.length === 0) {
          report({ setsProcessed: progress.setsProcessed + 1 });
          continue;
        }
        const cardIds = cards.map((c) => c.id);
        const existingCardsRes = await db.select({ id: pokemonCards.id, imageSmall: pokemonCards.imageSmall }).from(pokemonCards).where(inArray(pokemonCards.id, cardIds));
        const existingCards = new Map(
          existingCardsRes.map((r) => [r.id, r.imageSmall])
        );
        for (const card2 of cards) {
          if (card2.priceUsd !== null) {
            const convertedValue = Math.round(card2.priceUsd * 0.79 * 100) / 100;
            try {
              await db.insert(cardPricing).values({
                variantId: card2.variantId,
                priceGBP: convertedValue,
                updatedAt: /* @__PURE__ */ new Date()
              }).onConflictDoNothing();
            } catch (err) {
              console.error(
                `[Scrydex] Failed pricing sync for ${card2.id}`,
                err
              );
            }
          }
          progress.cardsProcessed++;
          if (!existingCards.has(card2.id)) {
            if (!existingSetIds.has(setId)) continue;
            try {
              await db.insert(pokemonCards).values({
                id: card2.id,
                setId: card2.setId,
                name: card2.name,
                number: card2.number,
                imageSmall: card2.imageSmall,
                imageLarge: card2.imageLarge
              }).onConflictDoNothing();
              if (card2.priceUsd !== null) {
                const convertedValue = Math.round(card2.priceUsd * 0.79 * 100) / 100;
                try {
                  await db.insert(cardPricing).values({
                    variantId: card2.variantId,
                    priceGBP: convertedValue,
                    updatedAt: /* @__PURE__ */ new Date()
                  }).onConflictDoNothing();
                } catch (err) {
                  console.error(
                    `[Scrydex] Price insert failed for ${card2.id}`,
                    err
                  );
                }
              }
              progress.cardsAdded++;
            } catch (err) {
            }
          } else {
            const existingImg = existingCards.get(card2.id);
            if (!existingImg || existingImg === "") {
              try {
                await db.update(pokemonCards).set({ imageSmall: card2.imageSmall, imageLarge: card2.imageLarge }).where(
                  and(
                    eq(pokemonCards.id, card2.id),
                    or(isNull(pokemonCards.imageSmall), eq(pokemonCards.imageSmall, ""))
                  )
                );
                progress.cardsUpdated++;
              } catch (err) {
              }
            }
          }
        }
        report({ setsProcessed: progress.setsProcessed + 1 });
      } catch (err) {
        console.error(`[Scrydex] Failed to process cards for ${setId}:`, err.message);
        report({ setsProcessed: progress.setsProcessed + 1 });
      }
    }
    try {
      await db.insert(pokemonCardVariants).values({
        id: `${card.id}-holo`,
        cardId: card.id,
        finishType: card.finishType,
        editionType: card.editionType,
        language: card.language,
        imageUrl: card.imageLarge,
        variantLabel: `${card.finishType} ${card.editionType}`
      }).onConflictDoNothing();
    } catch (err) {
      console.error("Variant insert failed", err);
    }
    report({
      phase: "done",
      message: `Sync complete. ${progress.setsAdded} sets added, ${progress.cardsAdded} cards added, ${progress.cardsUpdated} card images updated.`
    });
  } catch (err) {
    report({ phase: "error", message: err.message || "Sync failed" });
  }
  return progress;
}
var BASE_URL2, IMAGE_BASE, DELAY_MS;
var init_scrydex_scraper = __esm({
  "server/scrydex-scraper.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_card_normalizers();
    BASE_URL2 = "https://scrydex.com";
    IMAGE_BASE = "https://images.scrydex.com/pokemon";
    DELAY_MS = 150;
  }
});

// server/ko-zh-seed.ts
var ko_zh_seed_exports = {};
__export(ko_zh_seed_exports, {
  fixEmptyJpSets: () => fixEmptyJpSets,
  seedKoZhCards: () => seedKoZhCards
});
function delay2(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function toJpSetId(setId) {
  if (setId.endsWith("_ko")) return setId.slice(0, -3) + "_ja";
  if (setId.endsWith("_zh")) return setId.slice(0, -3) + "_ja";
  if (setId.endsWith("_cn")) return setId.slice(0, -3) + "_ja";
  return null;
}
function langSuffix(setId) {
  if (setId.endsWith("_ko")) return "ko";
  if (setId.endsWith("_zh")) return "zh";
  return "cn";
}
function toTargetCardId(jpCardId, suffix) {
  return jpCardId.replace(`_ja-`, `_${suffix}-`);
}
async function seedKoZhCards(onProgress) {
  const log2 = (msg) => {
    console.log(`[KoZhSeed] ${msg}`);
    onProgress?.(msg);
  };
  const emptyRes = await pool3.query(`
    SELECT s.id, s.name
    FROM   pokemon_sets s
    WHERE  (s.id LIKE '%_ko' ESCAPE '\\'
         OR s.id LIKE '%_zh' ESCAPE '\\'
         OR s.id LIKE '%_cn' ESCAPE '\\')
    AND    NOT EXISTS (
             SELECT 1 FROM pokemon_cards c WHERE c.set_id = s.id
           )
    ORDER  BY s.id
  `);
  const emptySets = emptyRes.rows;
  if (emptySets.length === 0) {
    log2("All KO/ZH sets already have cards \u2014 nothing to do.");
    return { inserted: 0, skipped: 0, setsProcessed: 0, errors: 0 };
  }
  log2(
    `Found ${emptySets.length} KO/ZH sets with no cards \u2014 mirroring from JP\u2026`
  );
  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  let setsProcessed = 0;
  for (const set of emptySets) {
    const setId = set.id;
    const jpId = toJpSetId(setId);
    const suffix = langSuffix(setId);
    if (!jpId) {
      skipped++;
      continue;
    }
    const jpRes = await pool3.query(
      `SELECT id, name, number, rarity, supertype, subtypes, hp,
              image_small, image_large, artist, national_pokedex_numbers
       FROM   pokemon_cards
       WHERE  set_id = $1
       ORDER  BY id`,
      [jpId]
    );
    if (jpRes.rows.length === 0) {
      skipped++;
      continue;
    }
    let setInserted = 0;
    const chunks = [];
    for (let i = 0; i < jpRes.rows.length; i += CARDS_PER_INSERT_BATCH) {
      chunks.push(jpRes.rows.slice(i, i + CARDS_PER_INSERT_BATCH));
    }
    for (const chunk of chunks) {
      const valueClauses = [];
      const params = [];
      let p = 1;
      for (const jp of chunk) {
        const newId = toTargetCardId(jp.id, suffix);
        valueClauses.push(
          `($${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++},$${p++})`
        );
        params.push(
          newId,
          setId,
          jp.name,
          jp.number,
          jp.rarity,
          jp.supertype,
          jp.subtypes,
          jp.hp,
          jp.image_small,
          // same artwork as JP
          jp.image_large,
          jp.artist
        );
      }
      try {
        const res = await pool3.query(
          `INSERT INTO pokemon_cards
             (id, set_id, name, number, rarity, supertype, subtypes, hp,
              image_small, image_large, artist)
           VALUES ${valueClauses.join(",")}
           ON CONFLICT (id) DO NOTHING`,
          params
        );
        const count2 = res.rowCount ?? 0;
        setInserted += count2;
        inserted += count2;
      } catch (err) {
        console.error(
          `[KoZhSeed] Batch insert error for ${setId}:`,
          err.message
        );
        errors++;
      }
    }
    if (setInserted > 0) {
      await pool3.query(
        `UPDATE pokemon_sets
         SET    printed_total = CASE WHEN printed_total IS NULL OR printed_total = 0
                                     THEN $1 ELSE printed_total END,
                total         = CASE WHEN total IS NULL OR total = 0
                                     THEN $1 ELSE total END
         WHERE  id = $2`,
        [jpRes.rows.length, setId]
      );
    }
    setsProcessed++;
    if (setInserted > 0) {
      log2(`  \u2713 ${setId}: ${setInserted} cards (from ${jpId})`);
    } else if (jpRes.rows.length > 0) {
      log2(`  ~ ${setId}: all ${jpRes.rows.length} cards already present`);
    }
    await delay2(BATCH_PAUSE_MS);
  }
  log2(
    `Done \u2014 ${setsProcessed} sets processed, ${inserted} cards inserted, ${skipped} skipped (no JP source), ${errors} errors`
  );
  return { inserted, skipped, setsProcessed, errors };
}
async function fixEmptyJpSets(onProgress) {
  const log2 = (msg) => {
    console.log(`[JpFix] ${msg}`);
    onProgress?.(msg);
  };
  const targets = [
    { setId: "swsh5s_ja", slug: "single-strike-master", cards: 70 },
    { setId: "swsh6l_ja", slug: "silver-lance", cards: 70 }
  ];
  let inserted = 0;
  let errors = 0;
  for (const target of targets) {
    const countRes = await pool3.query(
      `SELECT COUNT(*) AS n FROM pokemon_cards WHERE set_id = $1`,
      [target.setId]
    );
    if (parseInt(countRes.rows[0].n, 10) > 0) {
      log2(`${target.setId} already has cards \u2014 skipping`);
      continue;
    }
    log2(`Seeding ${target.setId} (${target.cards} cards via Scrydex pattern)\u2026`);
    try {
      const { scrapeScrydexSetCards: scrapeScrydexSetCards2 } = await Promise.resolve().then(() => (init_scrydex_scraper(), scrydex_scraper_exports));
      const cards = await scrapeScrydexSetCards2(target.slug, target.setId);
      if (cards.length > 0) {
        for (const card2 of cards) {
          try {
            await pool3.query(
              `INSERT INTO pokemon_cards (id, set_id, name, number, image_small, image_large)
               VALUES ($1,$2,$3,$4,$5,$6)
               ON CONFLICT (id) DO NOTHING`,
              [card2.id, target.setId, card2.name, card2.number, card2.imageSmall, card2.imageLarge]
            );
            inserted++;
          } catch {
            errors++;
          }
        }
        log2(`  \u2713 ${target.setId}: ${cards.length} cards scraped from Scrydex`);
        continue;
      }
    } catch (err) {
      log2(`  Scrydex scrape failed for ${target.setId}: ${err.message} \u2014 using URL pattern fallback`);
    }
    for (let n = 1; n <= target.cards; n++) {
      const cardId = `${target.setId}-${n}`;
      const imgSmall = `https://images.scrydex.com/pokemon/${cardId}/medium`;
      const imgLarge = `https://images.scrydex.com/pokemon/${cardId}/large`;
      try {
        await pool3.query(
          `INSERT INTO pokemon_cards (id, set_id, name, number, image_small, image_large)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (id) DO NOTHING`,
          [cardId, target.setId, `Card #${n}`, String(n), imgSmall, imgLarge]
        );
        inserted++;
      } catch {
        errors++;
      }
    }
    log2(`  \u2713 ${target.setId}: ${target.cards} cards inserted (URL-pattern fallback)`);
  }
  return { inserted, errors };
}
var BATCH_PAUSE_MS, CARDS_PER_INSERT_BATCH;
var init_ko_zh_seed = __esm({
  "server/ko-zh-seed.ts"() {
    "use strict";
    init_db();
    BATCH_PAUSE_MS = 5;
    CARDS_PER_INSERT_BATCH = 50;
  }
});

// server/stripe-client.ts
var stripe_client_exports = {};
__export(stripe_client_exports, {
  ensureStripeCustomer: () => ensureStripeCustomer,
  getStripePublishableKey: () => getStripePublishableKey,
  getUncachableStripeClient: () => getUncachableStripeClient
});
import Stripe from "stripe";
async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY ? "repl " + process.env.REPL_IDENTITY : process.env.WEB_REPL_RENEWAL ? "depl " + process.env.WEB_REPL_RENEWAL : null;
  if (!xReplitToken || !hostname) {
    const sk = process.env.STRIPE_SECRET_KEY;
    const pk = process.env.STRIPE_PUBLISHABLE_KEY;
    if (sk && pk) return { secretKey: sk, publishableKey: pk };
    throw new Error("Stripe credentials not found. Set up the Stripe connector or STRIPE_SECRET_KEY env var.");
  }
  const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
  const environments = isProduction ? ["production", "development"] : ["development", "production"];
  for (const env of environments) {
    const url = new URL(`https://${hostname}/api/v2/connection`);
    url.searchParams.set("include_secrets", "true");
    url.searchParams.set("connector_names", "stripe");
    url.searchParams.set("environment", env);
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json", "X-Replit-Token": xReplitToken }
    });
    const data = await response.json();
    const conn = data.items?.[0];
    if (conn?.settings?.secret && conn?.settings?.publishable) {
      return { secretKey: conn.settings.secret, publishableKey: conn.settings.publishable };
    }
  }
  throw new Error("Stripe connection not found. Set up the Stripe connector in Replit integrations.");
}
async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey, { apiVersion: "2025-08-27.basil" });
}
async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}
async function ensureStripeCustomer(stripe, user) {
  const { storage: storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
  const stored = user.stripeCustomerId;
  if (stored) {
    try {
      const existing = await stripe.customers.retrieve(stored);
      if (existing && !existing.deleted) {
        return stored;
      }
    } catch (err) {
      console.warn(
        `[Stripe] Stored customer ${stored} invalid for current mode (${err.message}). Recreating...`
      );
    }
  }
  const fresh = await stripe.customers.create({
    email: user.email,
    name: user.displayName,
    metadata: { pokescanUserId: user.id }
  });
  await storage2.updateUser(user.id, { stripeCustomerId: fresh.id });
  return fresh.id;
}
var init_stripe_client = __esm({
  "server/stripe-client.ts"() {
    "use strict";
  }
});

// server/index.ts
import express2 from "express";

// server/routes.ts
import * as cheerio3 from "cheerio";

// server/services/grading.ts
function calculateGrade(input) {
  const { centering, cornerDamage, edgeDamage, surfaceDamage } = input;
  const centerScore = Math.max(0, 10 - centering * 2);
  const cornerScore = Math.max(0, 10 - cornerDamage * 3);
  const edgeScore = Math.max(0, 10 - edgeDamage * 3);
  const surfaceScore = Math.max(0, 10 - surfaceDamage * 3);
  const raw = centerScore * 0.2 + cornerScore * 0.3 + edgeScore * 0.25 + surfaceScore * 0.25;
  const grade = Math.round(raw * 10) / 10;
  let label = "Poor (1)";
  if (grade >= 9.5) label = "Gem Mint (10)";
  else if (grade >= 9) label = "Mint (9)";
  else if (grade >= 8) label = "Near Mint-Mint (8)";
  else if (grade >= 7) label = "Near Mint (7)";
  else if (grade >= 6) label = "Excellent-Near Mint (6)";
  else if (grade >= 5) label = "Excellent (5)";
  else if (grade >= 4) label = "Very Good-Excellent (4)";
  else if (grade >= 3) label = "Very Good (3)";
  else if (grade >= 2) label = "Good (2)";
  return {
    grade,
    label,
    breakdown: {
      centering: centerScore,
      corners: cornerScore,
      edges: edgeScore,
      surface: surfaceScore
    }
  };
}

// server/scan-quota.ts
import { Pool } from "pg";
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var FREE_SCANS_PER_DAY = 25;
var BONUS_EXPIRY_DAYS = 7;
function todayStr() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function yesterdayStr() {
  const d = /* @__PURE__ */ new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
function addDays(dateStr, days) {
  const d = /* @__PURE__ */ new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function parsePools(raw) {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
function filterExpiredPools(pools, today) {
  return pools.filter((p) => p.expiresAt >= today);
}
function sumPools(pools) {
  return pools.reduce((s, p) => s + p.amount, 0);
}
async function getUserQuota(userId) {
  const today = todayStr();
  const row = await pool.query(
    `SELECT scans_used_today, scan_date, consecutive_login_days, last_login_date, bonus_scan_pools
     FROM pokescan_users WHERE id = $1`,
    [userId]
  );
  if (!row.rows[0]) throw new Error("User not found");
  const r = row.rows[0];
  const scansUsedToday = r.scan_date === today ? r.scans_used_today ?? 0 : 0;
  const allPools = parsePools(r.bonus_scan_pools);
  const activePools = filterExpiredPools(allPools, today);
  const bonusAvailable = sumPools(activePools);
  const freeRemaining = Math.max(0, FREE_SCANS_PER_DAY - scansUsedToday);
  return {
    freeScansRemaining: freeRemaining,
    bonusScansAvailable: bonusAvailable,
    totalRemaining: freeRemaining + bonusAvailable,
    consecutiveLoginDays: r.consecutive_login_days ?? 0,
    lastLoginDate: r.last_login_date ?? null,
    bonusPools: activePools,
    alreadyCheckedInToday: r.last_login_date === today,
    bonusEarnedToday: 0
  };
}
async function dailyCheckin(userId) {
  const today = todayStr();
  const yesterday = yesterdayStr();
  const row = await pool.query(
    `SELECT scans_used_today, scan_date, consecutive_login_days, last_login_date, bonus_scan_pools
     FROM pokescan_users WHERE id = $1`,
    [userId]
  );
  if (!row.rows[0]) throw new Error("User not found");
  const r = row.rows[0];
  const lastLogin = r.last_login_date ?? null;
  if (lastLogin === today) {
    const scansUsedToday2 = r.scan_date === today ? r.scans_used_today ?? 0 : 0;
    const activePools = filterExpiredPools(parsePools(r.bonus_scan_pools), today);
    const bonusAvailable2 = sumPools(activePools);
    const freeRemaining2 = Math.max(0, FREE_SCANS_PER_DAY - scansUsedToday2);
    return {
      freeScansRemaining: freeRemaining2,
      bonusScansAvailable: bonusAvailable2,
      totalRemaining: freeRemaining2 + bonusAvailable2,
      consecutiveLoginDays: r.consecutive_login_days ?? 0,
      lastLoginDate: today,
      bonusPools: activePools,
      alreadyCheckedInToday: true,
      bonusEarnedToday: 0,
      streakReset: false
    };
  }
  let currentStreak = r.consecutive_login_days ?? 0;
  let existingPools = parsePools(r.bonus_scan_pools);
  let streakReset = false;
  if (lastLogin === yesterday) {
    currentStreak = currentStreak + 1;
  } else {
    currentStreak = 1;
    streakReset = lastLogin !== null;
  }
  let bonusEarned = 0;
  let newStreak = currentStreak;
  if (currentStreak === 7) {
    bonusEarned = 10;
    newStreak = 0;
  } else {
    bonusEarned = 5;
  }
  const newPool = { amount: bonusEarned, expiresAt: addDays(today, BONUS_EXPIRY_DAYS) };
  const updatedPools = filterExpiredPools([...existingPools, newPool], today);
  await pool.query(
    `UPDATE pokescan_users
     SET consecutive_login_days = $1,
         last_login_date = $2,
         bonus_scan_pools = $3
     WHERE id = $4`,
    [newStreak, today, JSON.stringify(updatedPools), userId]
  );
  const scansUsedToday = r.scan_date === today ? r.scans_used_today ?? 0 : 0;
  const bonusAvailable = sumPools(updatedPools);
  const freeRemaining = Math.max(0, FREE_SCANS_PER_DAY - scansUsedToday);
  return {
    freeScansRemaining: freeRemaining,
    bonusScansAvailable: bonusAvailable,
    totalRemaining: freeRemaining + bonusAvailable,
    consecutiveLoginDays: newStreak,
    lastLoginDate: today,
    bonusPools: updatedPools,
    alreadyCheckedInToday: false,
    bonusEarnedToday: bonusEarned,
    streakReset
  };
}
async function consumeScan(userId) {
  const today = todayStr();
  const row = await pool.query(
    `SELECT scans_used_today, scan_date, bonus_scan_pools FROM pokescan_users WHERE id = $1`,
    [userId]
  );
  if (!row.rows[0]) return { allowed: false, freeRemaining: 0, bonusRemaining: 0 };
  const r = row.rows[0];
  const scansUsedToday = r.scan_date === today ? r.scans_used_today ?? 0 : 0;
  const activePools = filterExpiredPools(parsePools(r.bonus_scan_pools), today);
  const bonusAvailable = sumPools(activePools);
  const freeRemaining = Math.max(0, FREE_SCANS_PER_DAY - scansUsedToday);
  if (freeRemaining + bonusAvailable <= 0) {
    return { allowed: false, freeRemaining: 0, bonusRemaining: 0 };
  }
  let newScansUsed = scansUsedToday;
  let newPools = activePools;
  if (freeRemaining > 0) {
    newScansUsed = scansUsedToday + 1;
  } else {
    let remaining = 1;
    newPools = activePools.map((p) => {
      if (remaining <= 0) return p;
      const use = Math.min(remaining, p.amount);
      remaining -= use;
      return { ...p, amount: p.amount - use };
    }).filter((p) => p.amount > 0);
  }
  await pool.query(
    `UPDATE pokescan_users SET scans_used_today = $1, scan_date = $2, bonus_scan_pools = $3 WHERE id = $4`,
    [newScansUsed, today, JSON.stringify(newPools), userId]
  );
  const newFreeRemaining = Math.max(0, FREE_SCANS_PER_DAY - newScansUsed);
  const newBonusRemaining = sumPools(newPools);
  return { allowed: true, freeRemaining: newFreeRemaining, bonusRemaining: newBonusRemaining };
}

// server/routes.ts
import { createServer } from "node:http";
import express from "express";
import OpenAI from "openai";
import bcrypt from "bcryptjs";

// server/pokecardvalues-scraper.ts
init_card_normalizers();
import * as cheerio from "cheerio";
var BASE_URL = "https://pokecardvalues.co.uk";
var CDN_BASE = "https://doujkbm8mih0s.cloudfront.net/static/images/alt";
var CACHE_TTL = 1e3 * 60 * 60;
var cache = /* @__PURE__ */ new Map();
function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}
function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}
async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; PokeScanTCG/1.0)",
      "Accept": "text/html,application/xhtml+xml"
    }
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}
function parsePrice(text2) {
  const match = text2.match(/£([\d,]+\.?\d*)/);
  if (!match) return null;
  return parseFloat(match[1].replace(",", ""));
}
var SERIES_ORDER = [
  "Mega Evolution",
  "Scarlet & Violet",
  "Sword & Shield",
  "Sun & Moon",
  "XY",
  "Black & White",
  "Call of Legends",
  "HeartGold & SoulSilver",
  "Platinum",
  "Diamond & Pearl",
  "EX",
  "E-Card",
  "Neo",
  "Gym",
  "Base",
  "Other Promos",
  "POP Series",
  "World Championships"
];
async function scrapeSets() {
  const cached = getCached("sets");
  if (cached) return cached;
  try {
    const html = await fetchPage(`${BASE_URL}/sets/`);
    const $ = cheerio.load(html);
    const sets = [];
    $("a[href*='/sets/']").each((_, el) => {
      const $el = $(el);
      const href = $el.attr("href");
      if (!href || href === "/sets/" || href === `${BASE_URL}/sets/`) return;
      const urlMatch = href.match(/\/sets\/([^/]+)\/([^/]+)\/?$/);
      if (!urlMatch) return;
      const setId = urlMatch[1];
      const slug = urlMatch[2];
      const text2 = $el.text().trim();
      const lines = text2.split("\n").map((l) => l.trim()).filter(Boolean);
      let name = "";
      let releaseDate = "";
      let cardCount = 0;
      for (const line of lines) {
        if (line.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)/i)) {
          releaseDate = line;
        } else if (line.match(/^\/?\d+$/)) {
          cardCount = parseInt(line.replace("/", ""), 10);
        } else if (line.length > 1 && !line.match(/^\d+$/) && !name) {
          name = line;
        }
      }
      if (!name) return;
      const $img = $el.find("img");
      let logoUrl = "";
      let symbolUrl = "";
      $img.each((_2, imgEl) => {
        const src = $(imgEl).attr("src") || "";
        if (src.includes("LOGOS")) logoUrl = src;
        else if (src.includes("SYMBOLS")) symbolUrl = src;
      });
      let series = "Other";
      for (const s of SERIES_ORDER) {
        if (href.toLowerCase().includes(s.toLowerCase().replace(/ /g, "-")) || name.toLowerCase().includes(s.toLowerCase())) {
          series = s;
          break;
        }
      }
      if (setId.startsWith("sv")) series = "Scarlet & Violet";
      else if (setId.startsWith("swsh")) series = "Sword & Shield";
      else if (setId.startsWith("sm")) series = "Sun & Moon";
      else if (setId.startsWith("xy")) series = "XY";
      else if (setId.startsWith("bw")) series = "Black & White";
      else if (setId.startsWith("me")) series = "Mega Evolution";
      else if (setId.startsWith("neo")) series = "Neo";
      else if (setId.startsWith("ecard")) series = "E-Card";
      else if (setId.startsWith("ex")) series = "EX";
      else if (setId.startsWith("dp")) series = "Diamond & Pearl";
      else if (setId.startsWith("pl")) series = "Platinum";
      else if (setId.startsWith("hgss")) series = "HeartGold & SoulSilver";
      else if (setId.startsWith("gym")) series = "Gym";
      else if (setId.startsWith("base")) series = "Base";
      else if (setId.startsWith("pop")) series = "POP Series";
      else if (setId.startsWith("wc")) series = "World Championships";
      else if (setId.startsWith("mc")) series = "Other Promos";
      else if (setId.startsWith("tk")) series = "Other Promos";
      else if (setId.startsWith("cel")) series = "Sword & Shield";
      else if (setId.startsWith("tot")) series = "Sword & Shield";
      else if (setId.startsWith("det")) series = "Sun & Moon";
      else if (setId.startsWith("col")) series = "Call of Legends";
      const existing = sets.find((s) => s.id === setId && s.slug === slug);
      if (existing) return;
      sets.push({
        id: setId,
        slug,
        name,
        series,
        releaseDate,
        cardCount,
        logoUrl: logoUrl || `${CDN_BASE}/thumb_lg/LOGOS/${setId}-logo.png`,
        symbolUrl: symbolUrl || `${CDN_BASE}/thumb_xs/SYMBOLS/${setId}-symbol.png`,
        url: `${BASE_URL}/sets/${setId}/${slug}/`
      });
    });
    setCache("sets", sets);
    return sets;
  } catch (error) {
    console.error("Failed to scrape sets:", error);
    throw error;
  }
}
async function scrapeSetCards(setId, slug) {
  const cacheKey = `set-cards-${setId}-${slug}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  try {
    const html = await fetchPage(`${BASE_URL}/sets/${setId}/${slug}/`);
    const $ = cheerio.load(html);
    const cards = [];
    const jsonLdItems = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || "{}");
        if (json["@type"] === "ItemList" && json.itemListElement) {
          for (const item of json.itemListElement) {
            if (item["@type"] === "ListItem" && item.name) {
              jsonLdItems.push({ name: item.name, url: item.url || "" });
            }
          }
        }
      } catch {
      }
    });
    const cardContainers = $(".card-title-info").closest("a[href*='/cards/'], div").parent();
    let cardIndex = 0;
    const cardLinks = $("a[href*='/cards/']").toArray();
    for (const el of cardLinks) {
      const $el = $(el);
      const href = $el.attr("href") || "";
      if (!href.includes("/cards/")) continue;
      const titleDiv = $el.find(".card-title-info");
      const holoEdDiv = $el.find(".card-holo-edition-info");
      const priceDiv = $el.find(".price-info");
      const $parentContainer = $el.parent();
      const holoEdDivAlt = $parentContainer.find(".card-holo-edition-info");
      const priceDivAlt = $parentContainer.find(".price-info");
      let name = "";
      let number = "";
      let holoType = "";
      let rarity = "";
      let edition = "";
      let priceGBP = null;
      const titleText = titleDiv.text().trim();
      if (titleText) {
        const nameNumMatch = titleText.match(/^(.+?)\s*-\s*(\S+)/);
        if (nameNumMatch) {
          name = nameNumMatch[1].trim();
          number = nameNumMatch[2];
        } else {
          name = titleText;
        }
      }
      if (!name && jsonLdItems[cardIndex]) {
        const ldName = jsonLdItems[cardIndex].name;
        const parts = ldName.split(" - ");
        if (parts.length >= 2) {
          name = parts[0].trim();
          number = parts[1].trim();
          if (parts.length >= 3) holoType = parts[2].trim().replace(/\\u002D/g, "-");
          if (parts.length >= 4) edition = parts[3].trim();
          if (parts.length >= 5) rarity = parts[4].trim().replace(" - Pok\xE9mon Card", "");
        }
      }
      const holoEdText = (holoEdDiv.length ? holoEdDiv : holoEdDivAlt).html() || "";
      const holoEdLines = holoEdText.split("<br>").map((l) => cheerio.load(l).text().trim()).filter(Boolean);
      if (holoEdLines.length >= 1 && !holoType) {
        holoType = holoEdLines[0];
      }
      if (holoEdLines.length >= 2) {
        const rarityEdMatch = holoEdLines[1].match(/^(.+?)\s*-\s*(.+)$/);
        if (rarityEdMatch) {
          rarity = rarityEdMatch[1].trim();
          edition = rarityEdMatch[2].trim();
        } else {
          rarity = holoEdLines[1];
        }
      }
      const priceText = (priceDiv.length ? priceDiv : priceDivAlt).text().trim();
      if (priceText) {
        priceGBP = parsePrice(priceText);
      }
      if (!name) {
        const fullText = $el.text().trim();
        const lines = fullText.split("\n").map((l) => l.trim()).filter(Boolean);
        const nameNumMatch2 = lines[0]?.match(/^(.+?)\s*-\s*(\S+)/);
        if (nameNumMatch2) {
          name = nameNumMatch2[1].trim();
          number = nameNumMatch2[2];
        }
        for (const line of lines) {
          if (line.match(/^(Non-Holo|Holo|Reverse Holo)$/i) && !holoType) holoType = line;
          if (line.match(/NM\/M Value:/i) && priceGBP === null) priceGBP = parsePrice(line);
          const rarityEdMatch2 = line.match(/^(Common|Uncommon|Rare|Double Rare|Ultra Rare|Special Illustration Rare|Hyper Rare|ACE SPEC Rare|Promo|Secret Rare|Shining Rare Holo|Rare Holo|Rare Ultra|Rare Rainbow)\s*-\s*(.+)$/i);
          if (rarityEdMatch2 && !rarity) {
            rarity = rarityEdMatch2[1];
            edition = rarityEdMatch2[2];
          }
        }
      }
      if (!name) {
        cardIndex++;
        continue;
      }
      const $img = $el.find("img");
      const imageUrl = $img.first().attr("src") || "";
      cards.push({
        name,
        number,
        holoType,
        rarity,
        edition,
        normalizedFinishType: normalizeFinishType(holoType),
        normalizedEditionType: normalizeEdition(edition),
        priceGBP,
        url: href.startsWith("http") ? href : `${BASE_URL}${href}`,
        setName: slug.replace(/-/g, " "),
        setId,
        imageUrl
      });
      cardIndex++;
    }
    setCache(cacheKey, cards);
    return cards;
  } catch (error) {
    console.error(`Failed to scrape set cards for ${setId}:`, error);
    throw error;
  }
}
async function scrapeTopCards(condition = "ungraded") {
  const cacheKey = `top-cards-${condition}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  try {
    const validConditions = ["ungraded", "psa8", "psa9", "psa10"];
    const cond = validConditions.includes(condition) ? condition : "ungraded";
    const html = await fetchPage(`${BASE_URL}/prices/${cond}/`);
    const $ = cheerio.load(html);
    const topCards = [];
    let rank = 0;
    $("a[href*='/cards/']").each((_, el) => {
      const $el = $(el);
      const href = $el.attr("href") || "";
      if (!href.includes("/cards/")) return;
      rank++;
      const text2 = $el.text().trim();
      const lines = text2.split("\n").map((l) => l.trim()).filter(Boolean);
      let name = "";
      let number = "";
      let rarity = "";
      let holoType = "";
      let edition = "";
      let setName = "";
      let priceGBP = 0;
      for (const line of lines) {
        const nameNumMatch = line.match(/^(.+?)\s*-\s*(\S+)/);
        if (nameNumMatch && !name) {
          name = nameNumMatch[1].trim();
          number = nameNumMatch[2];
        }
        if (line.match(/NM \/ M Value:|NM\/M Value:/i)) {
          const p = parsePrice(line);
          if (p) priceGBP = p;
        }
        const rarityMatch = line.match(/^(Rare Holo|Rare Ultra|Rare Rainbow|Secret Rare|Special Illustration Rare|Shining Rare Holo|Promo|Rare Holo EX)\s*-\s*(.+)$/i);
        if (rarityMatch) {
          rarity = rarityMatch[1];
          holoType = rarityMatch[2];
        }
        const edSetMatch = line.match(/^(Unlimited|1st Edition|Shadowless|1999-2000 Print|Worlds Promo|Staff Prerelease|Stamp Promo|National Championships|Top Sixteen Worlds Promo)\s*-\s*(.+)$/i);
        if (edSetMatch) {
          edition = edSetMatch[1];
          setName = edSetMatch[2];
        }
      }
      if (!name || priceGBP === 0) return;
      const $img = $el.find("img");
      const imageUrl = $img.first().attr("src") || "";
      topCards.push({
        rank,
        name,
        number,
        rarity,
        holoType,
        edition,
        setName,
        priceGBP,
        url: href.startsWith("http") ? href : `${BASE_URL}${href}`,
        imageUrl
      });
    });
    setCache(cacheKey, topCards);
    return topCards;
  } catch (error) {
    console.error(`Failed to scrape top cards:`, error);
    throw error;
  }
}
async function scrapeCardSearch(query) {
  const cacheKey = `search-${query.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  try {
    const html = await fetchPage(`${BASE_URL}/search/?q=${encodeURIComponent(query)}`);
    const $ = cheerio.load(html);
    const cards = [];
    $("a[href*='/cards/']").each((_, el) => {
      const $el = $(el);
      const href = $el.attr("href") || "";
      if (!href.includes("/cards/")) return;
      const text2 = $el.text().trim();
      const lines = text2.split("\n").map((l) => l.trim()).filter(Boolean);
      let name = "";
      let number = "";
      let holoType = "";
      let rarity = "";
      let edition = "";
      let setName = "";
      let priceGBP = null;
      const nameNumMatch = lines[0]?.match(/^(.+?)\s*-\s*(\S+)/);
      if (nameNumMatch) {
        name = nameNumMatch[1].trim();
        number = nameNumMatch[2];
      }
      for (const line of lines) {
        if (line.match(/^(Non-Holo|Holo|Reverse Holo)$/i)) {
          holoType = line;
        }
        if (line.match(/NM\/M Value:/i)) {
          priceGBP = parsePrice(line);
        }
        const rarityEdMatch = line.match(/^(.+?)\s*-\s*(Unlimited|1st Edition|Shadowless|Poke Ball|Master Ball|Stamp Promo)$/i);
        if (rarityEdMatch && !rarity) {
          rarity = rarityEdMatch[1];
          edition = rarityEdMatch[2];
        }
      }
      const slugParts = href.replace(/^\/cards\//, "").replace(/\/$/, "").split("/")[0] || "";
      if (!holoType) {
        if (slugParts.includes("holo-reverse") || slugParts.includes("reverse-holo")) holoType = "Reverse Holo";
        else if (slugParts.includes("non-holo")) holoType = "Non-Holo";
        else if (slugParts.includes("holo")) holoType = "Holo";
      }
      if (!edition) {
        if (slugParts.includes("1st-edition")) edition = "1st Edition";
        else if (slugParts.includes("shadowless")) edition = "Shadowless";
        else if (slugParts.includes("unlimited")) edition = "Unlimited";
      }
      if (!setName) {
        const setMatch = slugParts.match(/(?:unlimited|shadowless|1st-edition|holo|non-holo|reverse-holo)-(.+)$/);
        if (setMatch) {
          setName = setMatch[1].replace(/-\d+$/, "").split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        }
      }
      if (!name) return;
      const $source = $el.find("source[data-srcset]").first();
      const $img = $el.find("img");
      const imageUrl = $source.attr("data-srcset") || $img.first().attr("data-src") || $img.first().attr("src") || "";
      cards.push({
        name,
        number,
        holoType,
        rarity,
        edition,
        priceGBP,
        url: href.startsWith("http") ? href : `${BASE_URL}${href}`,
        setName,
        setId: "",
        imageUrl
      });
    });
    setCache(cacheKey, cards);
    return cards;
  } catch (error) {
    console.error(`Failed to search cards:`, error);
    return [];
  }
}
function generateEbaySearchUrl(cardName, setName, number) {
  let query = `pokemon card ${cardName}`;
  if (setName) query += ` ${setName}`;
  if (number) query += ` ${number}`;
  return `https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(query)}&_sacat=183454&LH_PrefLoc=1`;
}
function generateEbaySoldUrl(cardName, setName, number) {
  let query = `pokemon card ${cardName}`;
  if (setName) query += ` ${setName}`;
  if (number) query += ` ${number}`;
  return `https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(query)}&_sacat=183454&LH_PrefLoc=1&LH_Complete=1&LH_Sold=1`;
}

// server/routes.ts
init_storage();

// server/otp-service.ts
import { randomInt } from "crypto";
import nodemailer from "nodemailer";
var otpStore = /* @__PURE__ */ new Map();
var rateLimitStore = /* @__PURE__ */ new Map();
var MAX_OTP_ATTEMPTS = 5;
var RATE_LIMIT_WINDOW = 60 * 1e3;
var RATE_LIMIT_MAX = 3;
function generateOtp() {
  return randomInt(1e5, 999999).toString();
}
function normalizeCredential(credential) {
  return credential.toLowerCase().trim();
}
function isRateLimited(key) {
  const entry = rateLimitStore.get(key);
  if (!entry) return false;
  if (Date.now() - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitStore.delete(key);
    return false;
  }
  return entry.count >= RATE_LIMIT_MAX;
}
function recordRateLimit(key) {
  const entry = rateLimitStore.get(key);
  if (!entry || Date.now() - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitStore.set(key, { count: 1, windowStart: Date.now() });
  } else {
    entry.count++;
  }
}
function createOtp(credential) {
  const key = normalizeCredential(credential);
  if (isRateLimited(key)) {
    return { code: "", rateLimited: true };
  }
  recordRateLimit(key);
  const code = generateOtp();
  otpStore.set(key, {
    code,
    expiresAt: Date.now() + 10 * 60 * 1e3,
    credential: key,
    attempts: 0
  });
  return { code, rateLimited: false };
}
function verifyOtp(credential, code) {
  const key = normalizeCredential(credential);
  const entry = otpStore.get(key);
  if (!entry) return { valid: false, expired: true, tooManyAttempts: false };
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(key);
    return { valid: false, expired: true, tooManyAttempts: false };
  }
  if (entry.attempts >= MAX_OTP_ATTEMPTS) {
    otpStore.delete(key);
    return { valid: false, expired: false, tooManyAttempts: true };
  }
  entry.attempts++;
  if (entry.code !== code.trim()) {
    return { valid: false, expired: false, tooManyAttempts: false };
  }
  otpStore.delete(key);
  return { valid: true, expired: false, tooManyAttempts: false };
}
function createEmailTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    return null;
  }
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}
async function sendOtpByEmail(email, code) {
  const transporter = createEmailTransport();
  if (!transporter) {
    console.log(`[OTP] No SMTP configured. Code for ${email}: ${code}`);
    return true;
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: "Your PokeScan Verification Code",
      text: `Your PokeScan verification code is: ${code}

This code expires in 10 minutes.`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #CC0000;">PokeScan Verification</h2>
          <p>Your one-time verification code is:</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #CC0000; padding: 16px; background: #FFF0F0; border-radius: 8px; text-align: center;">${code}</div>
          <p style="color: #666; font-size: 13px; margin-top: 16px;">This code expires in 10 minutes. Do not share it with anyone.</p>
        </div>
      `
    });
    return true;
  } catch (err) {
    console.error("Failed to send OTP email:", err);
    console.log(`[OTP] Email failed. Code for ${email}: ${code}`);
    return true;
  }
}
async function sendOtpBySms(mobile, code) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !fromNumber) {
    console.log(`[OTP] No SMS configured. Code for ${mobile}: ${code}`);
    return true;
  }
  try {
    const { default: twilio } = await import("twilio");
    const client = twilio(accountSid, authToken);
    await client.messages.create({
      body: `Your PokeScan verification code is: ${code}. Expires in 10 minutes.`,
      from: fromNumber,
      to: mobile
    });
    return true;
  } catch (err) {
    console.error("Failed to send OTP SMS:", err);
    console.log(`[OTP] SMS failed. Code for ${mobile}: ${code}`);
    return true;
  }
}
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of otpStore.entries()) {
    if (now > entry.expiresAt) otpStore.delete(key);
  }
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW * 2) rateLimitStore.delete(key);
  }
}, 5 * 60 * 1e3);

// server/routes.ts
init_db();
init_schema();
import { eq as eq3, desc, sql as sql4, ilike, or as or2, and as and3, ne, exists, lt, isNull as isNull2, isNotNull } from "drizzle-orm";

// server/card-sync.ts
init_db();
init_schema();
import { eq as eq2, inArray as inArray2, sql as sql2 } from "drizzle-orm";
import * as cheerio2 from "cheerio";
var POKEMON_API = "https://api.pokemontcg.io/v2";
var PRICE_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1e3;
var EBAY_THROTTLE_MS = 2e3;
var GBP_THROTTLE_MS = 1e3;
var TCG_REQUEST_DELAY_MS = 200;
var syncRunning = false;
var priceRefreshTimer = null;
var SYNC_STATUS_ID = 1;
async function getOrCreateSyncStatus() {
  const rows = await db.select().from(syncStatus).where(eq2(syncStatus.id, SYNC_STATUS_ID)).limit(1);
  if (rows.length === 0) {
    const inserted = await db.insert(syncStatus).values({ id: SYNC_STATUS_ID, totalSets: 0, syncedSets: 0, totalCards: 0, syncedCards: 0, isRunning: false }).onConflictDoNothing().returning();
    if (inserted.length > 0) return inserted[0];
    const refetched = await db.select().from(syncStatus).where(eq2(syncStatus.id, SYNC_STATUS_ID)).limit(1);
    return refetched[0];
  }
  return rows[0];
}
async function updateSyncStatus(patch) {
  await db.insert(syncStatus).values({ id: SYNC_STATUS_ID, ...patch }).onConflictDoUpdate({
    target: syncStatus.id,
    set: { ...patch, updatedAt: /* @__PURE__ */ new Date() }
  });
}
function buildTcgHeaders() {
  const headers = { "User-Agent": "PokeScanTCG/1.0" };
  const key = process.env.POKEMON_TCG_API_KEY;
  if (key) headers["X-Api-Key"] = key;
  return headers;
}
async function fetchJson(url, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2e4);
    try {
      const res = await fetch(url, { headers: buildTcgHeaders(), signal: controller.signal });
      clearTimeout(timer);
      if (res.status === 429 || res.status === 503 || res.status === 504) {
        if (attempt < retries) {
          await sleep(1e4 * (attempt + 1));
          continue;
        }
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return res.json();
    } catch (err) {
      clearTimeout(timer);
      if (attempt < retries && (err.name === "AbortError" || err.message?.includes("fetch"))) {
        await sleep(5e3 * (attempt + 1));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`fetchJson exhausted retries for ${url}`);
}
function sleep(ms) {
  return new Promise((resolve2) => setTimeout(resolve2, ms));
}
async function syncAllSets() {
  console.log("[CardSync] Fetching all sets from Pokemon TCG API...");
  const responseData = await fetchJson(`${POKEMON_API}/sets?orderBy=-releaseDate&pageSize=250`);
  const sets = responseData.data ?? [];
  console.log(`[CardSync] Got ${sets.length} sets.`);
  await updateSyncStatus({ totalSets: sets.length });
  for (const set of sets) {
    await new Promise((r) => setTimeout(r, 10));
    try {
      await db.insert(pokemonSets).values({
        id: set.id,
        name: set.name,
        series: set.series ?? "",
        printedTotal: set.printedTotal ?? null,
        total: set.total ?? null,
        releaseDate: set.releaseDate ?? null,
        logoUrl: set.images?.logo ?? null,
        symbolUrl: set.images?.symbol ?? null,
        imageUrl: set.images?.logo ?? null,
        syncedAt: /* @__PURE__ */ new Date()
      }).onConflictDoUpdate({
        target: pokemonSets.id,
        set: {
          name: set.name,
          series: set.series ?? "",
          printedTotal: set.printedTotal ?? null,
          total: set.total ?? null,
          releaseDate: set.releaseDate ?? null,
          logoUrl: set.images?.logo ?? null,
          symbolUrl: set.images?.symbol ?? null,
          imageUrl: set.images?.logo ?? null,
          syncedAt: /* @__PURE__ */ new Date()
        }
      });
    } catch (err) {
      console.error(`[CardSync] Failed to upsert set ${set.id}:`, err);
    }
  }
}
async function syncCardsForSet(setId, setName, force = false) {
  let allCards = [];
  let page = 1;
  while (true) {
    const data = await fetchJson(
      `${POKEMON_API}/cards?q=set.id:${setId}&orderBy=number&page=${page}&pageSize=250`
    );
    const typed = data;
    const cards = typed.data ?? [];
    allCards = allCards.concat(cards);
    if (allCards.length >= (typed.totalCount ?? 0) || cards.length < 250) break;
    page++;
  }
  let existingIds = /* @__PURE__ */ new Set();
  if (!force && allCards.length > 0) {
    const ids = allCards.map((c) => c.id);
    const existing = await db.select({ id: pokemonCards.id }).from(pokemonCards).where(inArray2(pokemonCards.id, ids));
    existingIds = new Set(existing.map((r) => r.id));
  }
  let inserted = 0;
  for (const card2 of allCards) {
    const alreadySynced = !force && existingIds.has(card2.id);
    try {
      await db.insert(pokemonCards).values({
        id: card2.id,
        setId: card2.set?.id ?? setId,
        name: card2.name,
        number: card2.number,
        rarity: card2.rarity ?? null,
        supertype: card2.supertype ?? null,
        subtypes: card2.subtypes ? card2.subtypes.join(",") : null,
        imageSmall: card2.images?.small ?? null,
        imageLarge: card2.images?.large ?? null,
        artist: card2.artist ?? null,
        hp: card2.hp ?? null,
        nationalPokedexNumbers: card2.nationalPokedexNumbers ? card2.nationalPokedexNumbers.join(",") : null,
        syncedAt: /* @__PURE__ */ new Date()
      }).onConflictDoUpdate({
        target: pokemonCards.id,
        set: {
          name: card2.name,
          number: card2.number,
          rarity: card2.rarity ?? null,
          supertype: card2.supertype ?? null,
          subtypes: card2.subtypes ? card2.subtypes.join(",") : null,
          imageSmall: card2.images?.small ?? null,
          imageLarge: card2.images?.large ?? null,
          artist: card2.artist ?? null,
          hp: card2.hp ?? null,
          nationalPokedexNumbers: card2.nationalPokedexNumbers ? card2.nationalPokedexNumbers.join(",") : null,
          syncedAt: /* @__PURE__ */ new Date()
        }
      });
      if (!alreadySynced || force) {
        await syncPricingForCard(card2);
        const existingPricing = await db.select().from(cardPricing).where(eq2(cardPricing.cardId, card2.id)).limit(1);
        const hasAnyPrice = existingPricing[0]?.tcgMarket || existingPricing[0]?.priceGBP || existingPricing[0]?.cardmarketAvg;
        if (!hasAnyPrice) {
          console.log(`[PricingFallback] Using PokecardValues for ${card2.name}`);
          await syncGbpPricingForCard(
            card2.id,
            card2.name,
            card2.number
          );
        }
        await sleep(GBP_THROTTLE_MS);
        await syncGbpPricingForCard(card2.id, card2.name, card2.number);
        await sleep(EBAY_THROTTLE_MS);
        await syncEbayPricesForCard(card2.id, card2.name, setName, card2.number);
      }
      inserted++;
    } catch (err) {
      console.error(`[CardSync] Failed to upsert card ${card2.id}:`, err);
    }
  }
  return inserted;
}
async function syncPricingForCard(card2) {
  const tcgp = card2.tcgplayer?.prices;
  const cm = card2.cardmarket?.prices;
  const tcgNormal = tcgp?.normal ?? tcgp?.holofoil ?? tcgp?.["1stEditionNormal"] ?? tcgp?.["1stEditionHolofoil"] ?? null;
  const tcgLow = tcgNormal?.low ?? null;
  const tcgMid = tcgNormal?.mid ?? null;
  const tcgHigh = tcgNormal?.high ?? null;
  const tcgMarket = tcgNormal?.market ?? null;
  const tcgDirectLow = tcgNormal?.directLow ?? null;
  const cardmarketAvg = cm?.averageSellPrice ?? cm?.avg1 ?? null;
  const cardmarketLow = cm?.lowPrice ?? null;
  const cardmarketTrend = cm?.trendPrice ?? null;
  try {
    await db.insert(cardPricing).values({
      cardId: card2.id,
      tcgLow,
      tcgMid,
      tcgHigh,
      tcgMarket,
      tcgDirectLow,
      cardmarketAvg,
      cardmarketLow,
      cardmarketTrend,
      updatedAt: /* @__PURE__ */ new Date()
    }).onConflictDoUpdate({
      target: cardPricing.cardId,
      set: {
        tcgLow,
        tcgMid,
        tcgHigh,
        tcgMarket,
        tcgDirectLow,
        cardmarketAvg,
        cardmarketLow,
        cardmarketTrend,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
  } catch (err) {
    console.error(`[CardSync] Failed to upsert pricing for card ${card2.id}:`, err);
  }
}
async function syncGbpPricingForCard(cardId, cardName, cardNumber) {
  try {
    const results = await scrapeCardSearch(cardName);
    if (!results || results.length === 0) return;
    const numOnly = String(cardNumber).split("/")[0].replace(/^0+/, "");
    const exactMatch = results.find((c) => {
      const cNum = String(c.number || "").split("/")[0].replace(/^0+/, "");
      return cNum === numOnly;
    });
    const fuzzyMatch = results.find(
      (c) => c.name?.toLowerCase().includes(cardName.toLowerCase())
    );
    const match = exactMatch || fuzzyMatch || results[0];
    if (!match) return;
    const fallbackPrice = match.priceGBP ?? match.price ?? null;
    if (fallbackPrice === null) return;
    await db.insert(cardPricing).values({ cardId, priceGBP: match.priceGBP, updatedAt: /* @__PURE__ */ new Date() }).onConflictDoUpdate({
      target: cardPricing.cardId,
      set: { priceGBP: fallbackPrice, updatedAt: /* @__PURE__ */ new Date() }
    });
  } catch (err) {
    console.error(`[CardSync] GBP price sync failed for card ${cardId}:`, err);
  }
}
async function scrapeEbayListings(url, isSold) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-GB,en;q=0.9"
      }
    });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio2.load(html);
    const listings = [];
    $(".s-item").each((_, el) => {
      const $el = $(el);
      const title = $el.find(".s-item__title").text().trim();
      if (!title || title === "Shop on eBay") return;
      const priceText = $el.find(".s-item__price").text().trim();
      const priceMatch = priceText.match(/[£$€]([\d,]+\.?\d*)/);
      if (!priceMatch) return;
      const price = parseFloat(priceMatch[1].replace(",", ""));
      const currency = priceText.startsWith("\xA3") ? "GBP" : priceText.startsWith("$") ? "USD" : "EUR";
      const soldDate = $el.find(".s-item__caption--row, .POSITIVE, .s-item__endedDate").first().text().trim();
      const listingUrl = $el.find("a.s-item__link").attr("href") ?? "";
      listings.push({ title, price, currency, soldDate, listingUrl, isSold });
    });
    return listings;
  } catch (err) {
    console.error("[CardSync] eBay scrape error:", err);
    return [];
  }
}
async function syncEbayPricesForCard(cardId, cardName, setName, cardNumber) {
  try {
    const soldUrl = generateEbaySoldUrl(cardName, setName, cardNumber);
    const activeUrl = generateEbaySearchUrl(cardName, setName, cardNumber);
    const [soldListings, activeListings] = await Promise.all([
      scrapeEbayListings(soldUrl, true),
      scrapeEbayListings(activeUrl, false)
    ]);
    const allListings = [...soldListings.slice(0, 10), ...activeListings.slice(0, 5)];
    if (allListings.length === 0) return;
    const existingRows = await db.select({ listingUrl: ebayPrices.listingUrl, isSold: ebayPrices.isSold }).from(ebayPrices).where(eq2(ebayPrices.cardId, cardId));
    const existingKeys = new Set(
      existingRows.map((r) => `${r.listingUrl ?? ""}|${r.isSold ? "1" : "0"}`)
    );
    for (const listing of allListings) {
      const key = `${listing.listingUrl}|${listing.isSold ? "1" : "0"}`;
      if (existingKeys.has(key)) continue;
      await db.insert(ebayPrices).values({
        cardId,
        title: listing.title,
        price: listing.price,
        currency: listing.currency,
        soldDate: listing.soldDate || null,
        listingUrl: listing.listingUrl,
        isSold: listing.isSold,
        fetchedAt: /* @__PURE__ */ new Date()
      });
      existingKeys.add(key);
    }
  } catch (err) {
    console.error(`[CardSync] eBay sync failed for card ${cardId}:`, err);
  }
}
async function runFullSync(force = false) {
  if (syncRunning) {
    console.log("[CardSync] Sync already in progress, skipping.");
    return;
  }
  syncRunning = true;
  await updateSyncStatus({ isRunning: true, lastError: null });
  console.log("[CardSync] Starting full card sync...");
  try {
    await syncAllSets();
    const sets = await db.select().from(pokemonSets);
    await updateSyncStatus({ totalSets: sets.length, syncedSets: 0 });
    let totalSynced = 0;
    let syncedSetsCount = 0;
    for (const set of sets) {
      await new Promise((r) => setTimeout(r, 10));
      try {
        const count2 = await syncCardsForSet(set.id, set.name, force);
        totalSynced += count2;
        syncedSetsCount++;
        await updateSyncStatus({ syncedSets: syncedSetsCount, syncedCards: totalSynced });
        console.log(`[CardSync] Set ${set.id} (${set.name}): ${count2} cards synced.`);
      } catch (err) {
        console.error(`[CardSync] Error syncing set ${set.id}:`, err);
      }
    }
    await updateSyncStatus({
      isRunning: false,
      lastCardSyncAt: /* @__PURE__ */ new Date(),
      totalCards: totalSynced,
      syncedCards: totalSynced
    });
    console.log(`[CardSync] Full sync complete. ${totalSynced} cards across ${syncedSetsCount} sets.`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[CardSync] Sync failed:", err);
    await updateSyncStatus({ isRunning: false, lastError: msg });
  } finally {
    syncRunning = false;
  }
}
async function runPriceRefresh() {
  console.log("[CardSync] Starting pricing refresh...");
  try {
    const allSets = await db.select({ id: pokemonSets.id, name: pokemonSets.name }).from(pokemonSets);
    for (const set of allSets) {
      const cards = await db.select({
        id: pokemonCards.id,
        name: pokemonCards.name,
        number: pokemonCards.number,
        rarity: pokemonCards.rarity,
        setId: pokemonCards.setId
      }).from(pokemonCards).where(eq2(pokemonCards.setId, set.id));
      for (const card2 of cards) {
        try {
          const apiData = await fetchJson(`${POKEMON_API}/cards/${card2.id}`);
          const typed = apiData;
          if (typed.data) {
            await syncPricingForCard(typed.data);
          }
          await sleep(TCG_REQUEST_DELAY_MS);
          await sleep(GBP_THROTTLE_MS);
          await syncGbpPricingForCard(card2.id, card2.name, card2.number);
          await sleep(EBAY_THROTTLE_MS);
          await syncEbayPricesForCard(card2.id, card2.name, set.name, card2.number);
        } catch (err) {
          console.error(`[CardSync] Price refresh failed for ${card2.id}:`, err);
        }
      }
    }
    await updateSyncStatus({ lastPriceSyncAt: /* @__PURE__ */ new Date() });
    console.log("[CardSync] Pricing refresh complete.");
  } catch (err) {
    console.error("[CardSync] Pricing refresh error:", err);
  }
}
async function runFastCardSeed() {
  console.log("[CardSync] Starting fast card seed (basic data, no pricing)...");
  const allSets = await db.select({ id: pokemonSets.id, name: pokemonSets.name }).from(pokemonSets);
  const alreadySeededRows = await db.select({ setId: pokemonCards.setId }).from(pokemonCards).groupBy(pokemonCards.setId);
  const alreadySeeded = new Set(alreadySeededRows.map((r) => r.setId));
  const sets = allSets.filter((s) => !alreadySeeded.has(s.id));
  console.log(`[CardSync] ${alreadySeeded.size} sets already seeded, ${sets.length} remaining...`);
  let totalInserted = 0;
  const NO_CARD_PREFIXES = [];
  const isNonTcgApiSet = (id) => id.endsWith("_ko") || id.endsWith("_zh") || id.endsWith("_cn") || id.endsWith("_ja") || id.startsWith("babanuki-") || id.startsWith("mengka-");
  for (const set of sets) {
    await new Promise((r) => setTimeout(r, 10));
    if (isNonTcgApiSet(set.id)) {
      continue;
    }
    if (NO_CARD_PREFIXES.some((p) => set.id.startsWith(p))) {
      console.log(`[CardSync] Skipped set ${set.id} (regional set, no TCG API cards)`);
      await sleep(200);
      continue;
    }
    try {
      let allCards = [];
      let page = 1;
      while (true) {
        let pageData = null;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 12e3);
        try {
          const res = await fetch(
            `${POKEMON_API}/cards?q=set.id:${set.id}&orderBy=number&page=${page}&pageSize=250`,
            { headers: buildTcgHeaders(), signal: ctrl.signal }
          );
          clearTimeout(timer);
          if (res.status === 429) {
            console.log(`[CardSync] Rate limited for ${set.id}, waiting 20s...`);
            await sleep(2e4);
          } else if (res.ok) {
            const ct = res.headers.get("content-type") || "";
            if (ct.includes("application/json")) {
              pageData = await res.json();
            }
          }
        } catch (fetchErr) {
          clearTimeout(timer);
          if (fetchErr.name === "AbortError") {
            console.log(`[CardSync] Timeout for ${set.id} page ${page}, skipping set`);
          }
        }
        if (!pageData) break;
        const cards = pageData.data ?? [];
        allCards = allCards.concat(cards);
        if (allCards.length >= (pageData.totalCount ?? 0) || cards.length < 250) break;
        page++;
        await sleep(1500);
      }
      for (const card2 of allCards) {
        try {
          await db.insert(pokemonCards).values({
            id: card2.id,
            setId: card2.set?.id ?? set.id,
            name: card2.name,
            number: card2.number,
            rarity: card2.rarity ?? null,
            supertype: card2.supertype ?? null,
            subtypes: card2.subtypes ? card2.subtypes.join(",") : null,
            imageSmall: card2.images?.small ?? null,
            imageLarge: card2.images?.large ?? null,
            artist: card2.artist ?? null,
            hp: card2.hp ?? null,
            nationalPokedexNumbers: card2.nationalPokedexNumbers ? card2.nationalPokedexNumbers.join(",") : null,
            syncedAt: /* @__PURE__ */ new Date()
          }).onConflictDoNothing();
          const prices = card2.tcgplayer?.prices || {};
          const variantsToInsert = [];
          if (prices.normal) {
            variantsToInsert.push({
              id: `${card2.id}-normal`,
              cardId: card2.id,
              finishType: "Non-Holo",
              editionType: "Unlimited",
              language: "English",
              variantLabel: "Non-Holo",
              imageUrl: card2.images?.large || card2.images?.small || null,
              isPromo: card2.rarity === "Promo",
              isStamped: false
            });
          }
          if (prices.holofoil) {
            variantsToInsert.push({
              id: `${card2.id}-holo`,
              cardId: card2.id,
              finishType: "Holo",
              editionType: "Unlimited",
              language: "English",
              variantLabel: "Holo",
              imageUrl: card2.images?.large || card2.images?.small || null,
              isPromo: card2.rarity === "Promo",
              isStamped: false
            });
          }
          if (prices.reverseHolofoil) {
            variantsToInsert.push({
              id: `${card2.id}-reverse`,
              cardId: card2.id,
              finishType: "Reverse Holo",
              editionType: "Unlimited",
              language: "English",
              variantLabel: "Reverse Holo",
              imageUrl: card2.images?.large || card2.images?.small || null,
              isPromo: card2.rarity === "Promo",
              isStamped: false
            });
          }
          if (variantsToInsert.length === 0) {
            variantsToInsert.push({
              id: `${card2.id}-default`,
              cardId: card2.id,
              finishType: "Non-Holo",
              editionType: "Unlimited",
              language: "English",
              variantLabel: "Standard",
              imageUrl: card2.images?.large || card2.images?.small || null,
              isPromo: card2.rarity === "Promo",
              isStamped: false
            });
          }
          await db.insert(
            pokemonCardVariants
          ).values(variantsToInsert).onConflictDoNothing();
          totalInserted++;
        } catch (err) {
          console.error(
            `[CardSync] Card insert failed ${card2.id}`,
            err
          );
        }
      }
      if (allCards.length > 0) {
        console.log(`[CardSync] Fast seeded ${allCards.length} cards for set ${set.id} (${set.name})`);
      } else {
        console.log(`[CardSync] Skipped set ${set.id} (no cards available)`);
      }
      await sleep(5e3);
    } catch (err) {
      console.error(`[CardSync] Fast seed error for set ${set.id}:`, err);
      await sleep(1e3);
    }
  }
  await updateSyncStatus({ totalCards: totalInserted, syncedCards: totalInserted, lastCardSyncAt: /* @__PURE__ */ new Date() });
  console.log(`[CardSync] Fast card seed complete \u2014 ${totalInserted} cards in DB.`);
}
async function startSyncService() {
  console.log("[CardSync] Sync service starting...");
  if (priceRefreshTimer) {
    clearInterval(priceRefreshTimer);
  }
  priceRefreshTimer = setInterval(() => {
    runPriceRefresh().catch(
      (err) => console.error("[CardSync] Price refresh interval error:", err)
    );
  }, PRICE_REFRESH_INTERVAL_MS);
  setTimeout(async () => {
    try {
      const [totalSetRows, seededSetRows] = await Promise.all([
        db.select({
          count: sql2`count(*)::int`
        }).from(pokemonSets),
        db.select({
          count: sql2`count(distinct set_id)::int`
        }).from(pokemonCards)
      ]);
      const totalSets = totalSetRows[0]?.count ?? 0;
      const seededSets = seededSetRows[0]?.count ?? 0;
      Promise.resolve().then(() => (init_asian_set_seed(), asian_set_seed_exports)).then(({ seedAsianSets: seedAsianSets2 }) => {
        seedAsianSets2().then(
          (r) => console.log(
            `[AsianSeed] Done \u2014 inserted ${r.inserted}, skipped ${r.skipped}, errors ${r.errors}`
          )
        ).catch(console.error);
      }).catch(console.error);
      Promise.resolve().then(() => (init_non_tcg_seed(), non_tcg_seed_exports)).then(({ seedNonTcgSets: seedNonTcgSets2 }) => {
        seedNonTcgSets2().then(
          (r) => console.log(
            `[NonTcgSeed] Done \u2014 inserted ${r.inserted}, skipped ${r.skipped}, errors ${r.errors}`
          )
        ).catch(console.error);
      }).catch(console.error);
      async function runKoZhAndJpFix() {
        try {
          const { seedKoZhCards: seedKoZhCards2, fixEmptyJpSets: fixEmptyJpSets2 } = await Promise.resolve().then(() => (init_ko_zh_seed(), ko_zh_seed_exports));
          const [jpFix, koZh] = await Promise.all([
            fixEmptyJpSets2(),
            seedKoZhCards2()
          ]);
          if (jpFix.inserted > 0) {
            console.log(
              `[JpFix] Inserted ${jpFix.inserted} cards for empty JP sets`
            );
          }
          if (koZh.inserted > 0) {
            console.log(
              `[KoZhSeed] Done \u2014 ${koZh.setsProcessed} sets, ${koZh.inserted} cards inserted`
            );
          } else {
            console.log(
              `[KoZhSeed] Nothing new to insert (${koZh.skipped} sets skipped \u2014 JP source not ready yet)`
            );
          }
        } catch (err) {
          console.error("[KoZhSeed] Error:", err.message);
        }
      }
      if (totalSets === 0) {
        console.log("[CardSync] DB empty \u2014 seeding sets first...");
        await syncAllSets();
        console.log(
          "[CardSync] Sets seeded. Starting fast card seed in background..."
        );
        await runFastCardSeed();
        await runKoZhAndJpFix();
      } else if (seededSets < totalSets) {
        console.log(
          `[CardSync] ${seededSets}/${totalSets} sets have cards \u2014 seeding missing sets...`
        );
        await runFastCardSeed();
        await runKoZhAndJpFix();
      } else {
        console.log(
          `[CardSync] DB fully seeded: ${seededSets}/${totalSets} sets with cards \u2014 OK.`
        );
        await runKoZhAndJpFix();
      }
    } catch (err) {
      console.error("[CardSync] Auto-seed check failed:", err);
    }
  }, 5e3);
}
async function getSyncStatus() {
  return getOrCreateSyncStatus();
}

// server/full-resync.ts
init_db();
init_scrydex_scraper();
import { sql as sql3 } from "drizzle-orm";
async function runFullResync(onProgress) {
  console.log("Starting full resync...");
  await db.execute(sql3`
    UPDATE pokemon_cards
    SET image_small = NULL,
        image_large = NULL
    WHERE image_small IS NULL
       OR image_small = ''
  `);
  const result = await runScrydexSync((p) => {
    console.log(
      `[FullResync] ${p.phase} | Sets ${p.setsProcessed}/${p.setsTotal} | Cards ${p.cardsProcessed}`
    );
    onProgress?.(p);
  });
  console.log("Full resync complete");
  return result;
}

// server/routes.ts
var resyncState = { running: false, progress: null, error: null, startedAt: null, finishedAt: null };
async function cleanupOldChatroomMessages() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
    const result = await db.delete(pokescanChatroomMessages).where(lt(pokescanChatroomMessages.createdAt, sevenDaysAgo));
    console.log("[Chatroom] Cleaned up old messages");
  } catch (e) {
    console.error("[Chatroom] Cleanup error:", e);
  }
}
var openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
});
var POKEMON_API2 = "https://api.pokemontcg.io/v2";
function tcgHeaders() {
  const h = { "User-Agent": "PokeScanTCG/1.0" };
  if (process.env.POKEMON_TCG_API_KEY) h["X-Api-Key"] = process.env.POKEMON_TCG_API_KEY;
  return h;
}
var setCardsMemCache = /* @__PURE__ */ new Map();
var MEM_CACHE_TTL_MS = 20 * 60 * 1e3;
function getMemCache(key) {
  const e = setCardsMemCache.get(key);
  return e && Date.now() - e.ts < MEM_CACHE_TTL_MS ? e.data : null;
}
function setMemCache(key, data) {
  setCardsMemCache.set(key, { data, ts: Date.now() });
}
var cardMemCache = /* @__PURE__ */ new Map();
function getCardCache(id) {
  const e = cardMemCache.get(id);
  return e && Date.now() - e.ts < MEM_CACHE_TTL_MS ? e.data : null;
}
function setCardCache(id, data) {
  cardMemCache.set(id, { data, ts: Date.now() });
}
function warmCardCache(cards) {
  for (const card2 of cards) {
    if (card2?.id && !cardMemCache.has(card2.id)) {
      setCardCache(card2.id, { data: card2 });
    }
  }
}
function detectSetLanguage(setId) {
  const id = setId.toLowerCase();
  if (id.includes("_ja")) return "japanese";
  if (id.includes("_ko")) return "korean";
  if (id.includes("_zh") || id.includes("_cn")) return "chinese";
  return "english";
}
var _setRefCache = null;
var _setRefCacheAt = 0;
var SET_REF_TTL_MS = 60 * 60 * 1e3;
async function buildSetReferencePrompt() {
  const now = Date.now();
  if (_setRefCache && now - _setRefCacheAt < SET_REF_TTL_MS) return _setRefCache;
  try {
    const sets = await db.select({
      id: pokemonSets.id,
      name: pokemonSets.name,
      printedTotal: pokemonSets.printedTotal,
      total: pokemonSets.total,
      releaseDate: pokemonSets.releaseDate
    }).from(pokemonSets).where(isNull2(pokemonSets.deletedAt)).orderBy(pokemonSets.releaseDate);
    const byLang = {
      english: [],
      japanese: [],
      korean: [],
      chinese: []
    };
    for (const s of sets) byLang[detectSetLanguage(s.id)].push(s);
    const fmt = (s) => {
      const year = s.releaseDate?.substring(0, 4) ?? "?";
      const count2 = s.printedTotal ?? s.total ?? "?";
      return `${s.id}|${s.name}|${count2}|${year}`;
    };
    const lines = [
      "KNOWN SETS DATABASE (use this to identify the exact set from what you read on the card):",
      "Format: setCode|setName|printedTotal|year",
      "",
      "MATCHING PRIORITY \u2014 use this order:",
      "1. SET CODE on card: Many cards print a short set code in the bottom-left corner right before or alongside the collector number (e.g. 'A5C', 'A3a', 'SV09', 'SWSH', 'XY'). Read it carefully \u2014 it matches the setCode column exactly. This is the most reliable identifier.",
      "2. COLLECTOR NUMBER DENOMINATOR: The number after the slash (e.g. 217 in '276/217') usually matches printedTotal exactly. Find the set where printedTotal equals this number.",
      "3. SET SYMBOL + VISUAL CUES: Use the set symbol icon and card design era as a secondary confirmation only.",
      "IMPORTANT: Never guess based on card art alone. If you can read a set code like 'A5C', 'A3a', 'B3a', 'SV09' on the card, look it up in the database below and use that set. Do not override a clearly read set code with a guess based on aesthetics.",
      "",
      "[ENGLISH]",
      ...byLang.english.map(fmt),
      "",
      "[JAPANESE]",
      ...byLang.japanese.map(fmt),
      "",
      "[KOREAN]",
      ...byLang.korean.map(fmt),
      "",
      "[CHINESE]",
      ...byLang.chinese.map(fmt),
      "",
      "When reporting setName, use the human-readable name column (not the code). Match by set code first, then by collector number denominator, then by visual cues."
    ];
    _setRefCache = lines.join("\n");
    _setRefCacheAt = now;
    console.log(`[SetRef] Built set reference prompt: ${sets.length} sets, ${_setRefCache.length} chars`);
    return _setRefCache;
  } catch (e) {
    console.error("[SetRef] Failed to build set reference:", e);
    return "";
  }
}
function dbSetToApiFormat(set) {
  return {
    id: set.id,
    name: set.name,
    series: set.series,
    printedTotal: set.printedTotal,
    total: set.total,
    releaseDate: set.releaseDate,
    language: detectSetLanguage(set.id),
    images: {
      symbol: set.symbolUrl,
      logo: set.logoUrl
    }
  };
}
function getSuperadminEmail() {
  const email = process.env.SUPERADMIN_EMAIL;
  if (!email) {
    console.warn("[superadmin] SUPERADMIN_EMAIL env var is not set. Superadmin features will be unavailable.");
    return "";
  }
  return email.toLowerCase().trim();
}
var SUPERADMIN_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1e3;
var superadminTokens = /* @__PURE__ */ new Map();
async function isSuperadminSessionOnly(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return false;
  const token = auth.slice(7).trim();
  try {
    const user = await storage.validateSession(token);
    const superadminEmail = getSuperadminEmail();
    if (!superadminEmail) return false;
    return !!(user && user.role === "admin" && user.email?.toLowerCase() === superadminEmail);
  } catch {
    return false;
  }
}
async function isSuperadminAuthorized(req) {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    try {
      const user = await storage.validateSession(token);
      if (user && user.role === "admin") return true;
    } catch {
    }
    const exp = superadminTokens.get(token);
    if (exp && exp > Date.now()) return true;
    if (exp && exp <= Date.now()) superadminTokens.delete(token);
  }
  const legacyPw = process.env.SUPERADMIN_PASSWORD;
  if (legacyPw) {
    const provided = req.body && req.body.superadminPassword || req.query.superadminPassword || "";
    if (provided && provided === legacyPw) return true;
  }
  return false;
}
async function seedSuperadmin() {
  try {
    const email = getSuperadminEmail();
    const initialPassword = process.env.SUPERADMIN_INITIAL_PASSWORD || process.env.SUPERADMIN_PASSWORD;
    const existing = await storage.getUserByEmail(email);
    if (!existing) {
      if (!initialPassword) {
        console.warn("[seedSuperadmin] SUPERADMIN_INITIAL_PASSWORD env var not set \u2014 cannot create initial superadmin.");
        return;
      }
      const passwordHash = await bcrypt.hash(initialPassword, 10);
      await storage.createUser({
        username: "superadmin",
        displayName: "Super Admin",
        email,
        mobileNumber: "",
        passwordHash,
        authProvider: "local",
        isPremium: true,
        role: "admin"
      });
      console.log("[seedSuperadmin] Created superadmin user:", email);
    } else {
      const updates = {};
      if (existing.role !== "admin") updates.role = "admin";
      if (!existing.isPremium) updates.isPremium = true;
      if (Object.keys(updates).length > 0) {
        await storage.updateUser(existing.id, updates);
      }
      if (initialPassword) {
        const hash = await bcrypt.hash(initialPassword, 10);
        await storage.setPassword(existing.id, hash);
        console.log("[seedSuperadmin] Synced password for superadmin:", email);
      }
      if (Object.keys(updates).length > 0) {
        console.log("[seedSuperadmin] Updated superadmin user:", email, Object.keys(updates));
      }
    }
  } catch (err) {
    console.error("[seedSuperadmin] error:", err);
  }
}
var appConfig = {
  maintenanceMode: false,
  scannerEnabled: true
};
async function runSchemaMigrations() {
  try {
    await pool3.query(`
      ALTER TABLE pokescan_collections ADD COLUMN IF NOT EXISTS grading_company VARCHAR(32);
      ALTER TABLE pokescan_collections ADD COLUMN IF NOT EXISTS grade VARCHAR(16);
      ALTER TABLE pokescan_collections ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE pokescan_collections ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE pokescan_collections ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
      ALTER TABLE pokescan_users ADD COLUMN IF NOT EXISTS is_verified_collector BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE pokemon_cards ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE pokemon_cards ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
      ALTER TABLE pokemon_sets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
      CREATE TABLE IF NOT EXISTS pokescan_collector_verifications (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        user_id VARCHAR(36) NOT NULL REFERENCES pokescan_users(id) ON DELETE CASCADE,
        card_id TEXT NOT NULL,
        card_name TEXT NOT NULL,
        card_image TEXT NOT NULL,
        front_photo TEXT NOT NULL,
        back_photo TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        reviewed_by VARCHAR(36) REFERENCES pokescan_users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS pokescan_scan_history (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        user_id VARCHAR(36) NOT NULL REFERENCES pokescan_users(id) ON DELETE CASCADE,
        card_name TEXT NOT NULL,
        set_name TEXT NOT NULL,
        card_number TEXT NOT NULL DEFAULT '',
        language TEXT NOT NULL DEFAULT 'english',
        thumbnail TEXT,
        price_gbp REAL,
        identification TEXT NOT NULL DEFAULT '{}',
        tcg_api_results TEXT NOT NULL DEFAULT '[]',
        pcv_results TEXT NOT NULL DEFAULT '[]',
        scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE pokescan_users ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ;
      ALTER TABLE pokescan_users ADD COLUMN IF NOT EXISTS ban_reason TEXT;
      ALTER TABLE pokescan_users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;
      ALTER TABLE pokescan_users ADD COLUMN IF NOT EXISTS banned_by VARCHAR(36);
      ALTER TABLE pokescan_users ADD COLUMN IF NOT EXISTS is_trial_used BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE pokescan_admin_activity_log ADD COLUMN IF NOT EXISTS target_user_id VARCHAR(36);
      ALTER TABLE pokescan_admin_activity_log ADD COLUMN IF NOT EXISTS target_username TEXT;
      CREATE TABLE IF NOT EXISTS pokescan_blocked_credentials (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        email TEXT,
        mobile_number TEXT,
        reason TEXT NOT NULL DEFAULT 'deleted',
        blocked_by VARCHAR(36),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_blocked_creds_email ON pokescan_blocked_credentials(LOWER(email));
      CREATE INDEX IF NOT EXISTS idx_blocked_creds_mobile ON pokescan_blocked_credentials(mobile_number);
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS variant_id TEXT;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'scrydex';
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'GBP';
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS tcg_low REAL;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS tcg_mid REAL;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS tcg_high REAL;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS tcg_market REAL;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS tcg_direct_low REAL;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS cardmarket_avg REAL;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS cardmarket_low REAL;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS cardmarket_trend REAL;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS ebay_sold_average REAL;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS psa10_price REAL;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS psa9_price REAL;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS raw_price REAL;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS price_gbp REAL;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS confidence_score REAL DEFAULT 1;
      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      CREATE UNIQUE INDEX IF NOT EXISTS idx_card_pricing_variant_id ON card_pricing(variant_id) WHERE variant_id IS NOT NULL;
      ALTER TABLE ebay_prices ADD COLUMN IF NOT EXISTS variant_id TEXT;
      ALTER TABLE ebay_prices ADD COLUMN IF NOT EXISTS card_id VARCHAR REFERENCES pokemon_cards(id);
      ALTER TABLE ebay_prices ADD COLUMN IF NOT EXISTS title TEXT;
      ALTER TABLE ebay_prices ADD COLUMN IF NOT EXISTS price REAL;
      ALTER TABLE ebay_prices ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'GBP';
      ALTER TABLE ebay_prices ADD COLUMN IF NOT EXISTS sold_date TEXT;
      ALTER TABLE ebay_prices ADD COLUMN IF NOT EXISTS listing_url TEXT;
      ALTER TABLE ebay_prices ADD COLUMN IF NOT EXISTS is_sold BOOLEAN DEFAULT TRUE;
      ALTER TABLE ebay_prices ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ DEFAULT NOW();
      CREATE UNIQUE INDEX IF NOT EXISTS idx_ebay_prices_variant_id ON ebay_prices(variant_id) WHERE variant_id IS NOT NULL;
      CREATE TABLE IF NOT EXISTS card_price_history (
        id SERIAL PRIMARY KEY,
        variant_id TEXT NOT NULL REFERENCES pokemon_card_variants(id) ON DELETE CASCADE,
        source TEXT NOT NULL,
        price REAL,
        currency TEXT DEFAULT 'GBP',
        fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_card_price_history_variant_id ON card_price_history(variant_id);
      ALTER TABLE card_pricing ALTER COLUMN "variantId" DROP NOT NULL;
    `);
    console.log("[Migration] Schema migrations applied");
  } catch (err) {
    console.error("[Migration] Failed:", err);
  }
}
async function logModAction(opts) {
  try {
    await db.insert(pokescanAdminActivityLog).values({
      action: opts.action,
      performedBy: opts.performedBy,
      targetUserId: opts.targetUserId ?? null,
      targetUsername: opts.targetUsername ?? null,
      listingId: opts.listingId ?? null,
      listingName: opts.listingName ?? null,
      note: opts.note ?? null
    });
  } catch (e) {
    console.warn("[ActivityLog] write failed:", e?.message);
  }
}
async function cancelStripeForUser(userId, immediate = true) {
  try {
    const u = await storage.getUserById(userId);
    if (!u) return;
    const subId = u.stripeSubscriptionId;
    if (subId) {
      try {
        const { getUncachableStripeClient: getUncachableStripeClient2 } = await Promise.resolve().then(() => (init_stripe_client(), stripe_client_exports));
        const stripe = await getUncachableStripeClient2();
        if (immediate) {
          await stripe.subscriptions.cancel(subId);
        } else {
          await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
        }
        console.log(`[Mod] Cancelled Stripe sub ${subId} for user ${userId} (immediate=${immediate})`);
      } catch (e) {
        console.error(`[Mod] Stripe cancel failed for ${userId}:`, e?.message);
      }
    }
    await storage.updateUser(userId, {
      isPremium: false,
      subscriptionStatus: "canceled",
      stripeSubscriptionId: null
    });
  } catch (e) {
    console.warn("[Mod] cancelStripeForUser error:", e?.message);
  }
}
async function isCredentialBlocked(email, mobile) {
  if (!email && !mobile) return false;
  const conds = [];
  const params = [];
  if (email) {
    params.push(email.toLowerCase().trim());
    conds.push(`LOWER(email) = $${params.length}`);
  }
  if (mobile) {
    params.push(mobile.trim());
    conds.push(`mobile_number = $${params.length}`);
  }
  const r = await pool3.query(
    `SELECT 1 FROM pokescan_blocked_credentials WHERE ${conds.join(" OR ")} LIMIT 1`,
    params
  );
  return r.rows.length > 0;
}
async function addBlockedCredential(email, mobile, reason, blockedBy) {
  if (!email && !mobile) return;
  try {
    await pool3.query(
      `INSERT INTO pokescan_blocked_credentials (email, mobile_number, reason, blocked_by) VALUES ($1, $2, $3, $4)`,
      [email ? email.toLowerCase().trim() : null, mobile ? mobile.trim() : null, reason, blockedBy]
    );
  } catch (e) {
    console.warn("[Mod] addBlockedCredential failed:", e?.message);
  }
}
async function registerRoutes(app2) {
  startSyncService().catch((e) => console.error("[CardSync] startSyncService failed:", e));
  seedSuperadmin().catch((e) => console.error("[seedSuperadmin] failed:", e));
  runSchemaMigrations().catch((e) => console.error("[Migration] failed:", e));
  app2.get("/api/config", (_req, res) => {
    res.json(appConfig);
  });
  app2.patch("/api/admin/config", async (req, res) => {
    if (!await isSuperadminAuthorized(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const updates = req.body ?? {};
    if (typeof updates.maintenanceMode === "boolean") {
      appConfig.maintenanceMode = updates.maintenanceMode;
    }
    if (typeof updates.scannerEnabled === "boolean") {
      appConfig.scannerEnabled = updates.scannerEnabled;
    }
    res.json({ success: true, config: appConfig });
  });
  app2.get("/api/pokemon/sets", async (_req, res) => {
    try {
      const dbSets = await db.select().from(pokemonSets).where(
        and3(
          isNull2(pokemonSets.deletedAt),
          exists(
            db.select({ id: pokemonCards.id }).from(pokemonCards).where(and3(eq3(pokemonCards.setId, pokemonSets.id), isNull2(pokemonCards.deletedAt)))
          ),
          or2(eq3(pokemonSets.hidden, false), sql4`${pokemonSets.hidden} IS NULL`)
        )
      ).orderBy(desc(pokemonSets.releaseDate));
      if (dbSets.length > 0) {
        res.json({ data: dbSets.map(dbSetToApiFormat), count: dbSets.length, source: "db" });
        return;
      }
    } catch (dbError) {
      console.error("DB sets query failed, falling back to API:", dbError);
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1e4);
      const response = await fetch(`${POKEMON_API2}/sets?orderBy=-releaseDate&pageSize=250`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`TCG API returned ${response.status}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Failed to fetch sets:", error);
      res.status(500).json({ error: "Failed to fetch sets" });
    }
  });
  app2.get("/api/pokemon/sets/:setId/cards", async (req, res) => {
    try {
      const { setId } = req.params;
      const page = parseInt(req.query.page || "1", 10);
      const pageSize = parseInt(req.query.pageSize || "250", 10);
      const offset = (page - 1) * pageSize;
      const cacheKey = `${setId}:${page}:${pageSize}`;
      const memHit = getMemCache(cacheKey);
      if (memHit) {
        res.json(memHit);
        return;
      }
      const nonEnglishPatterns = ["_ja", "_ko", "_zh", "_cn", "topsun", "babanuki", "mengka", "oldmaid", "hanafuda", "_pocket"];
      const isNonEnglish = nonEnglishPatterns.some((p) => setId.toLowerCase().includes(p));
      try {
        const [totalCountResult, setInfoResult] = await Promise.all([
          db.select({ count: sql4`count(*)::int` }).from(pokemonCards).where(and3(eq3(pokemonCards.setId, setId), isNull2(pokemonCards.deletedAt))),
          db.select().from(pokemonSets).where(and3(eq3(pokemonSets.id, setId), isNull2(pokemonSets.deletedAt))).limit(1)
        ]);
        const totalCount = totalCountResult[0]?.count ?? 0;
        const setRow = setInfoResult[0] ?? null;
        const expectedTotal = setRow?.total ?? 0;
        const hasCards = totalCount > 0;
        const fullySeeded = hasCards && (isNonEnglish || expectedTotal === 0 || totalCount >= Math.floor(expectedTotal * 0.9));
        const dbCards = await db.select({
          variant: pokemonCardVariants,
          card: pokemonCards
        }).from(pokemonCardVariants).innerJoin(
          pokemonCards,
          eq3(pokemonCardVariants.cardId, pokemonCards.id)
        ).where(and3(eq3(pokemonCards.setId, setId), isNull2(pokemonCards.deletedAt))).orderBy(pokemonCards.number).limit(pageSize).offset(offset);
        if (fullySeeded && dbCards.length > 0) {
          const formattedCards = dbCards.map(({ variant, card: card2 }) => {
            const f = dbCardToApiFormat(card2, null);
            f.id = variant.id;
            f.variantId = variant.id;
            f.finishType = variant.finishType;
            f.editionType = variant.editionType;
            f.variantLabel = variant.variantLabel;
            f.isStamped = variant.isStamped;
            f.language = variant.language;
            if (variant.imageUrl) {
              f.images = {
                small: variant.imageUrl,
                large: variant.imageUrl
              };
            }
            if (setRow) {
              f.set = dbSetToApiFormat(setRow);
            }
            return f;
          });
          const payload = {
            data: formattedCards,
            count: formattedCards.length,
            totalCount,
            page,
            source: "db-variants"
          };
          setMemCache(cacheKey, payload);
          warmCardCache(formattedCards);
          res.json(payload);
          return;
        }
      } catch (dbErr) {
        console.error("DB query failed for set cards:", dbErr);
      }
      if (isNonEnglish) {
        const emptyPayload = { data: [], count: 0, totalCount: 0, page, source: "no-data" };
        res.json(emptyPayload);
        return;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3e4);
      const response = await fetch(
        `${POKEMON_API2}/cards?q=set.id:${setId}&orderBy=number&page=${page}&pageSize=${pageSize}`,
        { signal: controller.signal, headers: tcgHeaders() }
      );
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`TCG API ${response.status}`);
      const data = await response.json();
      setMemCache(cacheKey, data);
      warmCardCache(data.data || []);
      res.json(data);
      (async () => {
        try {
          let bgPage = 1;
          let seeded = 0;
          while (true) {
            const ctrl2 = new AbortController();
            const t2 = setTimeout(() => ctrl2.abort(), 3e4);
            const r2 = await fetch(
              `${POKEMON_API2}/cards?q=set.id:${setId}&orderBy=number&page=${bgPage}&pageSize=250`,
              { signal: ctrl2.signal }
            );
            clearTimeout(t2);
            if (!r2.ok) break;
            const d2 = await r2.json();
            const cards2 = d2.data || [];
            if (cards2.length === 0) break;
            for (const card2 of cards2) {
              try {
                await db.insert(pokemonCards).values({
                  id: card2.id,
                  setId: card2.set?.id || setId,
                  name: card2.name,
                  number: card2.number,
                  rarity: card2.rarity || null,
                  supertype: card2.supertype || null,
                  subtypes: Array.isArray(card2.subtypes) ? card2.subtypes.join(",") : null,
                  hp: card2.hp || null,
                  artist: card2.artist || null,
                  imageSmall: card2.images?.small || null,
                  imageLarge: card2.images?.large || null
                }).onConflictDoNothing();
              } catch {
              }
            }
            seeded += cards2.length;
            if (cards2.length < 250) break;
            bgPage++;
          }
          if (seeded > 0) {
            console.log(`[BgSeed] Seeded ${seeded} cards for set ${setId}`);
            for (const k of setCardsMemCache.keys()) {
              if (k.startsWith(`${setId}:`)) setCardsMemCache.delete(k);
            }
          }
        } catch (bgErr) {
        }
      })();
    } catch (error) {
      if (error?.name === "AbortError") {
        res.status(504).json({ error: "Cards took too long to load. Please try again." });
      } else {
        console.error("Failed to fetch set cards:", error);
        res.status(500).json({ error: "Failed to fetch cards. Please try again." });
      }
    }
  });
  app2.get("/api/pokemon/cards/search", async (req, res) => {
    try {
      const query = req.query.q;
      if (!query || query.trim().length < 2) {
        res.json({ data: [], count: 0, totalCount: 0 });
        return;
      }
      const page = parseInt(String(req.query.page || "1"), 10);
      const pageSize = 20;
      const offset = (page - 1) * pageSize;
      try {
        const dbResults = await db.select({ card: pokemonCards, set: pokemonSets }).from(pokemonCards).leftJoin(pokemonSets, eq3(pokemonCards.setId, pokemonSets.id)).where(and3(ilike(pokemonCards.name, `%${query.trim()}%`), isNull2(pokemonCards.deletedAt))).orderBy(desc(pokemonSets.releaseDate)).limit(pageSize).offset(offset);
        if (dbResults.length > 0) {
          const formatted = dbResults.map(({ card: card2, set }) => {
            const base = dbCardToApiFormat(card2, null);
            if (set) {
              base.set = {
                id: set.id,
                name: set.name,
                series: set.series ?? void 0,
                printedTotal: set.printedTotal,
                total: set.total,
                releaseDate: set.releaseDate,
                images: { symbol: set.symbolUrl, logo: set.logoUrl }
              };
            }
            return base;
          });
          const totalCountResult = await db.select({ count: sql4`count(*)::int` }).from(pokemonCards).where(and3(ilike(pokemonCards.name, `%${query.trim()}%`), isNull2(pokemonCards.deletedAt)));
          const totalCount = totalCountResult[0]?.count ?? formatted.length;
          res.json({ data: formatted, count: formatted.length, totalCount, source: "db" });
          return;
        }
      } catch (dbErr) {
        console.error("DB card search failed, falling back to API:", dbErr);
      }
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12e3);
      try {
        const encodedQuery = encodeURIComponent(`name:"${query.trim()}*"`);
        const response = await fetch(
          `${POKEMON_API2}/cards?q=${encodedQuery}&orderBy=-set.releaseDate&page=${page}&pageSize=${pageSize}`,
          { signal: ctrl.signal, headers: tcgHeaders() }
        );
        clearTimeout(timer);
        const text2 = await response.text();
        if (!response.ok) {
          console.error(`Pokemon TCG API error ${response.status}: ${text2.substring(0, 200)}`);
          res.json({ data: [], count: 0, totalCount: 0 });
          return;
        }
        const data = JSON.parse(text2);
        res.json(data);
      } catch (apiErr) {
        clearTimeout(timer);
        if (apiErr.name === "AbortError") {
          res.json({ data: [], count: 0, totalCount: 0, error: "Search timed out" });
        } else {
          console.error("Failed to search cards:", apiErr);
          res.json({ data: [], count: 0, totalCount: 0 });
        }
      }
    } catch (error) {
      console.error("Failed to search cards:", error);
      res.json({ data: [], count: 0, totalCount: 0 });
    }
  });
  app2.get("/api/pokemon/sets/:setId/all-cards", async (req, res) => {
    try {
      const { setId } = req.params;
      const setInfoResult = await db.select({ total: pokemonSets.total }).from(pokemonSets).where(and3(eq3(pokemonSets.id, setId), isNull2(pokemonSets.deletedAt))).limit(1);
      const expectedTotal = setInfoResult[0]?.total ?? 0;
      const dbCountResult = await db.select({ count: sql4`count(*)::int` }).from(pokemonCards).where(and3(eq3(pokemonCards.setId, setId), isNull2(pokemonCards.deletedAt)));
      const dbCount = dbCountResult[0]?.count ?? 0;
      const fullySeeded = expectedTotal > 0 && dbCount >= Math.floor(expectedTotal * 0.9);
      if (fullySeeded) {
        const dbCards = await db.select({
          variant: pokemonCardVariants,
          card: pokemonCards
        }).from(pokemonCardVariants).innerJoin(pokemonCards, eq3(pokemonCardVariants.cardId, pokemonCards.id)).where(and3(eq3(pokemonCards.setId, setId), isNull2(pokemonCards.deletedAt))).orderBy(pokemonCards.number);
        const formattedCards = dbCards.map(({ variant, card: card2 }) => {
          const f = dbCardToApiFormat(card2, null);
          f.id = variant.id;
          f.variantId = variant.id;
          f.finishType = variant.finishType;
          f.editionType = variant.editionType;
          f.variantLabel = variant.variantLabel;
          f.isStamped = variant.isStamped;
          f.language = variant.language;
          if (variant.imageUrl) {
            f.images = {
              small: variant.imageUrl,
              large: variant.imageUrl
            };
          }
          return f;
        });
        res.json({
          data: formattedCards,
          count: formattedCards.length
        });
        return;
      }
      let allCards = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const response = await fetch(
          `${POKEMON_API2}/cards?q=set.id:${setId}&orderBy=number&page=${page}&pageSize=250`
        );
        const text2 = await response.text();
        if (!response.ok) break;
        try {
          const data = JSON.parse(text2);
          const cards = data.data || [];
          allCards = allCards.concat(cards);
          hasMore = allCards.length < (data.totalCount || 0) && cards.length === 250;
          page++;
        } catch {
          break;
        }
      }
      res.json({
        data: allCards,
        count: allCards.length
      });
    } catch (error) {
      console.error("Failed to fetch all set cards:", error);
      res.status(500).json({ error: "Failed to fetch cards" });
    }
  });
  app2.get("/api/pokemon/cards/find", async (req, res) => {
    try {
      const name = req.query.name;
      const number = req.query.number;
      const setId = req.query.setId;
      if (!name) {
        res.status(400).json({ error: "name is required" });
        return;
      }
      let query = `name:"${name}"`;
      if (setId) query += ` set.id:${setId}`;
      const encodedQuery = encodeURIComponent(query);
      const text2 = await fetch(
        `${POKEMON_API2}/cards?q=${encodedQuery}&orderBy=-set.releaseDate&pageSize=20`
      ).then((r) => r.text()).catch(() => null);
      if (!text2) {
        res.json({ data: null });
        return;
      }
      let cards = [];
      try {
        const data = JSON.parse(text2);
        cards = data.data || [];
      } catch {
        res.json({ data: null });
        return;
      }
      if (number && cards.length > 1) {
        const numOnly = String(number).split("/")[0].replace(/^0+/, "");
        const exact = cards.filter((c) => {
          const cn = String(c.number).replace(/^0+/, "");
          return cn === numOnly;
        });
        if (exact.length > 0) cards = exact;
      }
      res.json({ data: cards[0] || null });
    } catch (error) {
      console.error("Failed to find card:", error);
      res.json({ data: null });
    }
  });
  app2.get("/api/pokemon/cards/:cardId", async (req, res) => {
    try {
      const { cardId } = req.params;
      const cached = getCardCache(cardId);
      if (cached) {
        res.json(cached);
        return;
      }
      const dbCard = await db.select().from(pokemonCards).where(and3(eq3(pokemonCards.id, cardId), isNull2(pokemonCards.deletedAt))).limit(1);
      if (dbCard.length > 0) {
        const pricing = await db.select().from(cardPricing).where(eq3(cardPricing.cardId, cardId)).limit(1);
        const ebayData = await db.select().from(ebayPrices).where(eq3(ebayPrices.cardId, cardId)).orderBy(desc(ebayPrices.fetchedAt)).limit(10);
        const formattedCard = dbCardToApiFormat(dbCard[0], pricing[0] ?? null, ebayData);
        const setData = await db.select().from(pokemonSets).where(eq3(pokemonSets.id, dbCard[0].setId)).limit(1);
        if (setData.length > 0) {
          formattedCard.set = dbSetToApiFormat(setData[0]);
        }
        res.json({ data: formattedCard, source: "db" });
        return;
      }
      const cardAbort = new AbortController();
      const cardTimeout = setTimeout(() => cardAbort.abort(), 15e3);
      let response;
      try {
        response = await fetch(`${POKEMON_API2}/cards/${cardId}`, { signal: cardAbort.signal });
      } finally {
        clearTimeout(cardTimeout);
      }
      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.includes("application/json")) {
        res.status(502).json({ error: "Card not available right now. Please try again." });
        return;
      }
      const data = await response.json();
      if (data?.data?.id) {
        setCardCache(data.data.id, data);
      }
      res.json(data);
    } catch (error) {
      if (error?.name === "AbortError") {
        res.status(504).json({ error: "Card took too long to load. Please try again." });
        return;
      }
      console.error("Failed to fetch card:", error);
      res.status(500).json({ error: "Failed to fetch card" });
    }
  });
  app2.get("/api/sync/status", async (_req, res) => {
    try {
      const status = await getSyncStatus();
      res.json({ data: status });
    } catch (error) {
      console.error("Failed to get sync status:", error);
      res.status(500).json({ error: "Failed to get sync status" });
    }
  });
  app2.post("/api/sync/trigger", async (req, res) => {
    try {
      const syncSecret = process.env.SYNC_SECRET;
      const authHeader = req.headers["x-sync-secret"];
      const isDevMode = process.env.NODE_ENV === "development";
      if (syncSecret) {
        if (authHeader !== syncSecret) {
          res.status(401).json({ error: "Unauthorized: valid x-sync-secret header required" });
          return;
        }
      } else if (!isDevMode) {
        res.status(403).json({ error: "Forbidden: set SYNC_SECRET environment variable to enable manual sync in production" });
        return;
      }
      runFullSync(true).catch((err) => console.error("[CardSync] Manual sync error:", err));
      res.json({ message: "Sync triggered", running: true });
    } catch (error) {
      console.error("Failed to trigger sync:", error);
      res.status(500).json({ error: "Failed to trigger sync" });
    }
  });
  app2.get("/api/pcv/sets", async (_req, res) => {
    try {
      const sets = await scrapeSets();
      res.json({ data: sets, count: sets.length });
    } catch (error) {
      console.error("Failed to scrape PCV sets:", error);
      res.status(500).json({ error: "Failed to fetch UK card sets" });
    }
  });
  app2.get("/api/pcv/sets/:setId/:slug/cards", async (req, res) => {
    try {
      const { setId, slug } = req.params;
      const cards = await scrapeSetCards(setId, slug);
      res.json({ data: cards, count: cards.length });
    } catch (error) {
      console.error("Failed to scrape PCV set cards:", error);
      res.status(500).json({ error: "Failed to fetch UK card data" });
    }
  });
  app2.get("/api/pcv/top/:condition", async (req, res) => {
    try {
      const { condition } = req.params;
      const topCards = await scrapeTopCards(condition);
      res.json({ data: topCards, count: topCards.length });
    } catch (error) {
      console.error("Failed to scrape PCV top cards:", error);
      res.status(500).json({ error: "Failed to fetch top valued cards" });
    }
  });
  app2.get("/api/pcv/search", async (req, res) => {
    try {
      const query = req.query.q;
      if (!query) {
        res.json({ data: [], count: 0 });
        return;
      }
      const cards = await scrapeCardSearch(query);
      res.json({ data: cards, count: cards.length });
    } catch (error) {
      console.error("Failed to search PCV cards:", error);
      res.status(500).json({ error: "Failed to search UK cards" });
    }
  });
  app2.get("/api/ebay/search-url", (req, res) => {
    const cardName = req.query.cardName;
    const setName = req.query.setName;
    const number = req.query.number;
    if (!cardName) {
      res.status(400).json({ error: "cardName is required" });
      return;
    }
    res.json({
      searchUrl: generateEbaySearchUrl(cardName, setName, number),
      soldUrl: generateEbaySoldUrl(cardName, setName, number)
    });
  });
  app2.get("/api/ebay/sold-price", async (req, res) => {
    const { cardName, setName, number, cardId } = req.query;
    if (!cardName) {
      res.status(400).json({ error: "cardName required" });
      return;
    }
    async function scrapeEbaySoldPrices(query) {
      const searchParams = new URLSearchParams({
        _nkw: query,
        _sacat: "183454",
        LH_Complete: "1",
        LH_Sold: "1",
        LH_PrefLoc: "1",
        _sop: "13"
      });
      const ebayUrl = `https://www.ebay.co.uk/sch/i.html?${searchParams}`;
      const html = await fetch(ebayUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-GB,en;q=0.9"
        }
      }).then((r) => r.text());
      const prices = [];
      try {
        const $ = cheerio3.load(html);
        $(".s-item__price").each((_, el) => {
          const text2 = $(el).text().trim();
          const match = text2.match(/£([\d,]+\.?\d*)/);
          if (match) {
            const price = parseFloat(match[1].replace(/,/g, ""));
            if (price >= 0.5 && price <= 5e3) prices.push(price);
          }
        });
      } catch (_) {
      }
      if (prices.length === 0) {
        const patterns = [
          /s-item__price[^>]*>\s*£([\d,]+\.?\d*)/g,
          /class="BOLD[^"]*">\s*£([\d,]+\.?\d*)/g,
          /itemprop="price"[^>]*content="([\d.]+)"/g
        ];
        for (const pattern of patterns) {
          for (const m of html.matchAll(pattern)) {
            const price = parseFloat(m[1].replace(/,/g, ""));
            if (price >= 0.5 && price <= 5e3) prices.push(price);
          }
          if (prices.length >= 3) break;
        }
      }
      return [...new Set(prices)].slice(0, 20);
    }
    function computeStats(prices) {
      if (prices.length === 0) return { lowest: null, median: null, highest: null };
      const sorted = [...prices].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      return {
        lowest: Math.round(sorted[0] * 100) / 100,
        median: Math.round(median * 100) / 100,
        highest: Math.round(sorted[sorted.length - 1] * 100) / 100
      };
    }
    async function scrapeGradedMedian(baseQuery, grader, grade) {
      try {
        const altGrader = grader === "Beckett" ? "BGS" : null;
        const query = `${baseQuery} ${altGrader ?? grader} ${grade} pokemon card`;
        const prices = await scrapeEbaySoldPrices(query);
        const stats = computeStats(prices);
        return stats.median;
      } catch {
        return null;
      }
    }
    try {
      let getVal2 = function(r) {
        return r.status === "fulfilled" ? r.value : null;
      };
      var getVal = getVal2;
      if (cardId) {
        const cached = await db.select().from(ebayPrices).where(eq3(ebayPrices.cardId, cardId)).orderBy(desc(ebayPrices.fetchedAt)).limit(20);
        if (cached.length > 0) {
          const cacheAge = Date.now() - new Date(cached[0].fetchedAt).getTime();
          if (cacheAge < 24 * 60 * 60 * 1e3) {
            const prices = cached.map((r) => r.price).filter((p) => p !== null && p > 0);
            if (prices.length > 0) {
              let getValCached2 = function(r) {
                return r.status === "fulfilled" ? r.value : null;
              };
              var getValCached = getValCached2;
              const stats2 = computeStats(prices);
              const cardBase2 = `${cardName}${setName ? " " + setName : ""}`;
              const [psa92, psa102, beckett92, beckett102, ace92, ace102, cgc92, cgc102] = await Promise.allSettled([
                scrapeGradedMedian(cardBase2, "PSA", 9),
                scrapeGradedMedian(cardBase2, "PSA", 10),
                scrapeGradedMedian(cardBase2, "Beckett", 9),
                scrapeGradedMedian(cardBase2, "Beckett", 10),
                scrapeGradedMedian(cardBase2, "ACE", 9),
                scrapeGradedMedian(cardBase2, "ACE", 10),
                scrapeGradedMedian(cardBase2, "CGC", 9),
                scrapeGradedMedian(cardBase2, "CGC", 10)
              ]);
              const gradedPrices2 = {
                PSA: { 9: getValCached2(psa92), 10: getValCached2(psa102) },
                Beckett: { 9: getValCached2(beckett92), 10: getValCached2(beckett102) },
                ACE: { 9: getValCached2(ace92), 10: getValCached2(ace102) },
                CGC: { 9: getValCached2(cgc92), 10: getValCached2(cgc102) }
              };
              res.json({
                price: stats2.median,
                lowestSold: stats2.lowest,
                medianSold: stats2.median,
                highestSold: stats2.highest,
                source: "eBay UK (Sold)",
                count: prices.length,
                cached: true,
                gradedPrices: gradedPrices2
              });
              return;
            }
          }
        }
      }
      const numberFirst = number ? number.split("/")[0].replace(/^0+/, "") : null;
      const queries = [];
      if (setName) queries.push(`${cardName} pokemon ${setName}`);
      if (numberFirst && parseInt(numberFirst, 10) > 0) queries.push(`${cardName} pokemon ${numberFirst}`);
      queries.push(`${cardName} pokemon card`);
      let rawPrices = [];
      for (const q of queries) {
        rawPrices = await scrapeEbaySoldPrices(q);
        if (rawPrices.length >= 3) break;
      }
      if (rawPrices.length === 0) {
        res.json({ price: null, lowestSold: null, medianSold: null, highestSold: null, source: "eBay UK (Sold)", count: 0, gradedPrices: null });
        return;
      }
      const stats = computeStats(rawPrices);
      if (cardId && rawPrices.length > 0) {
        try {
          await db.delete(ebayPrices).where(eq3(ebayPrices.cardId, cardId));
          await db.insert(ebayPrices).values(
            rawPrices.map((price) => ({
              cardId,
              price,
              currency: "GBP",
              isSold: true,
              fetchedAt: /* @__PURE__ */ new Date()
            }))
          );
        } catch (_) {
        }
      }
      const cardBase = `${cardName}${setName ? " " + setName : ""}`;
      const [psa9, psa10, beckett9, beckett10, ace9, ace10, cgc9, cgc10] = await Promise.allSettled([
        scrapeGradedMedian(cardBase, "PSA", 9),
        scrapeGradedMedian(cardBase, "PSA", 10),
        scrapeGradedMedian(cardBase, "Beckett", 9),
        scrapeGradedMedian(cardBase, "Beckett", 10),
        scrapeGradedMedian(cardBase, "ACE", 9),
        scrapeGradedMedian(cardBase, "ACE", 10),
        scrapeGradedMedian(cardBase, "CGC", 9),
        scrapeGradedMedian(cardBase, "CGC", 10)
      ]);
      const gradedPrices = {
        PSA: { 9: getVal2(psa9), 10: getVal2(psa10) },
        Beckett: { 9: getVal2(beckett9), 10: getVal2(beckett10) },
        ACE: { 9: getVal2(ace9), 10: getVal2(ace10) },
        CGC: { 9: getVal2(cgc9), 10: getVal2(cgc10) }
      };
      res.json({
        price: stats.median,
        lowestSold: stats.lowest,
        medianSold: stats.median,
        highestSold: stats.highest,
        source: "eBay UK (Sold)",
        count: rawPrices.length,
        gradedPrices
      });
    } catch (error) {
      console.error("eBay price fetch error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch eBay prices" });
    }
  });
  app2.post("/api/identify-card", express.json({ limit: "15mb" }), async (req, res) => {
    try {
      const { imageBase64, mode } = req.body;
      if (!imageBase64) {
        res.status(400).json({ error: "imageBase64 is required" });
        return;
      }
      const isNumberStripMode = mode === "number-strip";
      const authToken = req.headers.authorization?.replace("Bearer ", "");
      if (isNumberStripMode) {
        let stripResponse;
        try {
          const stripPromise = openai.chat.completions.create({
            model: "gpt-5.2",
            messages: [
              {
                role: "system",
                content: `You are examining a close-up photo of the bottom edge of a Pok\xE9mon card. This strip contains the collector number and possibly a set code and regulation mark.

READ THESE THREE ELEMENTS:

1. COLLECTOR NUMBER (bottom-left area of the strip):
   Formats: "025/198" \xB7 "001/078" \xB7 "SV049" \xB7 "TG15/TG30" \xB7 "SWSH001"
   Japanese modern format: "A5C 043/066" \u2014 the letters/numbers BEFORE the space are the SET CODE, the "043/066" is the collector number.
   Read each digit carefully. Common confusions: 0\u21948, 6\u21949, 1\u21947 \u2014 look at the shape.

2. SET CODE (short alphanumeric code near the collector number):
   Examples: "A5C" "A3a" "B3a" "A1" "SV09" "sv6pt5" "SWSH" "XY" "BW"
   Usually 2-6 characters. May appear before the slash number (Japanese) or stamped near it (English).
   Report EXACTLY what is printed \u2014 do not invent a code.

3. REGULATION MARK (a single letter inside a rounded box or circle):
   Letters used: A B C D E F G H
   Located near the collector number. Very small but clearly stamped.

Respond with valid JSON in this EXACT format:
{
  "cardNumber": "043/066",
  "setCode": "A5C",
  "regulationMark": "H",
  "confidence": "high",
  "notes": "Set code A5C clearly printed before the number"
}

Rules:
- "cardNumber": full collector number as printed. Empty string ONLY if truly unreadable.
- "setCode": code as printed if visible, otherwise "".
- "regulationMark": single letter if visible, otherwise "".
- "confidence": "high"=fully clear \xB7 "medium"=some digits uncertain \xB7 "low"=unreadable.
- NEVER invent digits you cannot see. If a digit is uncertain, use "medium" and note which one.`
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Read the collector number, set code, and regulation mark from this Pok\xE9mon card bottom strip. Return the JSON."
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
                      detail: "high"
                    }
                  }
                ]
              }
            ],
            response_format: { type: "json_object" },
            max_completion_tokens: 300
          });
          const stripTimeoutPromise = new Promise(
            (_, reject) => setTimeout(() => reject(Object.assign(new Error("AI identification timed out. Please try again."), { isTimeout: true })), 3e4)
          );
          stripResponse = await Promise.race([stripPromise, stripTimeoutPromise]);
        } catch (aiErr) {
          if (aiErr.isTimeout || aiErr.name === "AbortError" || aiErr.code === "ERR_CANCELED") {
            res.status(408).json({ error: aiErr.message || "AI identification timed out. Please try again." });
            return;
          }
          throw aiErr;
        }
        const stripContent = stripResponse.choices[0]?.message?.content;
        if (!stripContent) {
          res.status(500).json({ error: "AI returned empty response" });
          return;
        }
        const stripResult = JSON.parse(stripContent);
        res.json({
          cardNumber: stripResult.cardNumber || "",
          setCode: stripResult.setCode || "",
          regulationMark: stripResult.regulationMark || "",
          confidence: stripResult.confidence || "low",
          notes: stripResult.notes || ""
        });
        return;
      }
      const setReference = await buildSetReferencePrompt();
      let response;
      try {
        const aiPromise = openai.chat.completions.create({
          model: "gpt-5.2",
          messages: [
            {
              role: "system",
              content: `You are a Pok\xE9mon TCG card identification system. Your job is to read what is physically printed on the card and return it as structured JSON. Study every visible detail of the image carefully.

\u2550\u2550 CARD LAYOUT \u2014 WHERE EACH ELEMENT LIVES \u2550\u2550

BOTTOM STRIP (examine this area FIRST and most carefully):
\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502 [SET CODE] [Collector No.]   [Rarity \u25CF\u25C6\u2605]  [Reg. Mark \xA9]   \u2502
\u2502 e.g.  "A5C  043/066"   or   "025/198"   or   "SV049"        \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
\u2022 The COLLECTOR NUMBER is at the bottom-LEFT in small (~8pt) text.
\u2022 English format: "025/198" \xB7 "TG15/TG30" \xB7 "SV049" \xB7 "SWSH001"
\u2022 Japanese/Asian format: a short SET CODE (e.g. "A5C") appears directly BEFORE the slash number \u2014 e.g. "A5C 043/066". The code before the space IS the setCode.
\u2022 REGULATION MARK: a single letter (A\u2013H) stamped in a rounded box near the number.

SET SYMBOL (expansion icon):
\u2022 English cards: small logo icon at the BOTTOM-RIGHT of the illustration window (between art and card text).
\u2022 Japanese cards: small icon near the collector number strip.

CARD NAME: large text at the very TOP of the card.
HP: large number at the top-right (e.g. "120 HP"). Do NOT confuse with collector number.

\u2550\u2550 LANGUAGE DETECTION \u2014 DO THIS FIRST \u2550\u2550
\u2022 English: Latin script, "Illus." credit
\u2022 Japanese: hiragana / katakana / kanji characters
\u2022 Korean: Hangul (\uAC00\uB098\uB2E4 style)
\u2022 Chinese (Traditional): Chinese characters, typically no furigana

\u2550\u2550 STEP-BY-STEP IDENTIFICATION \u2550\u2550

Step 1 \u2014 LANGUAGE: Identify from the script on the card.

Step 2 \u2014 COLLECTOR NUMBER: Read the bottom-left text digit by digit.
  \u2022 0 is perfectly round, 8 has two distinct loops, 6 opens to the right, 9 opens to the left, 1 is straight.
  \u2022 Write both parts: e.g. "043" and "066" \u2192 "043/066". Include leading zeros.
  \u2022 If the format has a prefix (like "SV" or "SWSH"), include it: "SV049".

Step 3 \u2014 SET CODE: Report the short printed code (2\u20136 alphanumeric chars) if visible.
  \u2022 Japanese/Korean/Chinese modern: code before the slash number (A5C, A3a, B3a, A1, A2a\u2026)
  \u2022 English: code may be printed near the regulation mark (sv1, sv4pt5, swsh1, xy1, bw1\u2026)
  \u2022 Copy it EXACTLY as printed \u2014 do not guess or invent a code.

Step 4 \u2014 CARD NAME: Read from the top of the card exactly as printed.

Step 5 \u2014 HOLO TYPE from the card's surface finish:
  \u2022 Non-Holo: completely flat/matte
  \u2022 Holo: shiny holographic illustration, matte border
  \u2022 Reverse Holo: shiny/sparkly border, flat illustration
  \u2022 Full Art: illustration bleeds to card edges, no standard border
  \u2022 Special Art Rare / Illustration Rare: large painted full-bleed illustration
  \u2022 Secret Rare / Rainbow Rare / Gold: gold or rainbow texture

\u2550\u2550 CONFIDENCE \u2550\u2550
\u2022 "high": clearly read the full collector number AND card name; set identified
\u2022 "medium": name is clear but number is partially obscured, or set is uncertain
\u2022 "low": image is too blurry, angled, or cut off \u2014 never invent a number

\u2550\u2550 CARD BACK \u2550\u2550
If the image shows the Pok\xE9mon card back (blue oval, Pok\xE9 Ball, "Pok\xE9mon" text), return:
{"isCardBack":true,"englishName":"","cardNumber":"","setCode":"","setName":"","language":"","holoType":"","rarity":"","confidence":"low","originalName":"","notes":"Card back"}

\u2550\u2550 RESPONSE FORMAT \u2550\u2550
{
  "isCardBack": false,
  "englishName": "Pikachu",
  "cardNumber": "025/198",
  "setCode": "sv1",
  "setName": "Scarlet & Violet",
  "language": "English",
  "holoType": "Holo",
  "rarity": "Rare",
  "confidence": "high",
  "originalName": "\u30D4\u30AB\u30C1\u30E5\u30A6",
  "notes": "Regulation mark G; set code sv1 visible near number"
}

\u2022 "englishName": English translation of the card name
\u2022 "originalName": name exactly as printed on the card
\u2022 "setCode": the short printed code (2\u20136 chars). Empty string "" if not visible.
\u2022 "notes": include regulation mark letter, any codes spotted, legibility observations

${setReference}`
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Identify this Pok\xE9mon card. Start by zooming into the BOTTOM-LEFT corner to read the small collector number (e.g. '025/198'). Then read the card name from the top. Return the JSON."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
                    detail: "high"
                  }
                }
              ]
            }
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 800
        });
        const timeoutPromise = new Promise(
          (_, reject) => setTimeout(() => reject(Object.assign(new Error("AI identification timed out. Please try again."), { isTimeout: true })), 3e4)
        );
        response = await Promise.race([aiPromise, timeoutPromise]);
      } catch (aiErr) {
        if (aiErr.isTimeout || aiErr.name === "AbortError" || aiErr.code === "ERR_CANCELED") {
          res.status(408).json({ error: aiErr.message || "AI identification timed out. Please try again." });
          return;
        }
        throw aiErr;
      }
      const content = response.choices[0]?.message?.content;
      if (!content) {
        res.status(500).json({ error: "AI returned empty response" });
        return;
      }
      const identification = JSON.parse(content);
      if (identification.isCardBack === true) {
        res.json({ isCardBack: true });
        return;
      }
      if (authToken) {
        const scanUser = await storage.validateSession(authToken);
        if (scanUser && !scanUser.isPremium) {
          const result = await consumeScan(scanUser.id);
          if (!result.allowed) {
            res.status(429).json({
              error: "Daily scan limit reached",
              freeRemaining: 0,
              bonusRemaining: 0,
              message: "You've used all your scans for today. Come back tomorrow or upgrade to Premium for unlimited scans."
            });
            return;
          }
        }
      }
      let pcvResults = [];
      try {
        pcvResults = await scrapeCardSearch(identification.englishName);
        if (identification.cardNumber && pcvResults.length > 1) {
          const numberOnly = identification.cardNumber.split("/")[0].replace(/^0+/, "");
          const filtered = pcvResults.filter((c) => {
            const cNum = c.number?.split("/")[0].replace(/^0+/, "");
            return cNum === numberOnly;
          });
          if (filtered.length > 0) pcvResults = filtered;
        }
      } catch (e) {
        console.error("PCV search after identification failed:", e);
      }
      let tcgApiResults = [];
      try {
        const cardName = identification.englishName?.trim();
        const origName = identification.originalName?.trim();
        if (cardName && cardName.length >= 2) {
          const nameConditions = [ilike(pokemonCards.name, `%${cardName}%`)];
          if (origName && origName !== cardName) {
            nameConditions.push(ilike(pokemonCards.name, `%${origName}%`));
          }
          const dbMatches = await db.select({ card: pokemonCards, set: pokemonSets, pricing: cardPricing }).from(pokemonCards).leftJoin(pokemonSets, eq3(pokemonCards.setId, pokemonSets.id)).leftJoin(cardPricing, eq3(cardPricing.cardId, pokemonCards.id)).where(and3(or2(...nameConditions), isNull2(pokemonCards.deletedAt))).orderBy(desc(pokemonSets.releaseDate)).limit(20);
          if (dbMatches.length > 0) {
            let formatted = dbMatches.map(({ card: card2, set, pricing }) => {
              const base = dbCardToApiFormat(card2, pricing ?? null);
              if (set) {
                base.set = {
                  id: set.id,
                  name: set.name,
                  series: set.series ?? void 0,
                  printedTotal: set.printedTotal,
                  total: set.total,
                  releaseDate: set.releaseDate,
                  images: { symbol: set.symbolUrl, logo: set.logoUrl }
                };
              }
              return base;
            });
            if (identification.setCode && formatted.length > 1) {
              const aiCode = identification.setCode.toLowerCase().trim();
              const codeMatch = formatted.filter((c) => {
                const dbId = (c.set?.id ?? "").toLowerCase();
                return dbId === aiCode || dbId.startsWith(aiCode) || aiCode.startsWith(dbId);
              });
              if (codeMatch.length > 0) formatted = codeMatch;
            }
            if (identification.setName && formatted.length > 1) {
              const aiSet = identification.setName.toLowerCase();
              const setMatch = formatted.filter((c) => {
                const dbSet = (c.set?.name ?? "").toLowerCase();
                return dbSet.includes(aiSet) || aiSet.includes(dbSet);
              });
              if (setMatch.length > 0) formatted = setMatch;
            }
            if (identification.cardNumber && formatted.length > 1) {
              const numOnly = identification.cardNumber.split("/")[0].replace(/^0+/, "");
              const exactMatch = formatted.filter((c) => {
                const cn = String(c.number).replace(/^0+/, "");
                return cn === numOnly;
              });
              if (exactMatch.length > 0) formatted = exactMatch;
            }
            formatted.sort((a, b) => {
              const aHasImg = a.images?.small ? 1 : 0;
              const bHasImg = b.images?.small ? 1 : 0;
              return bHasImg - aHasImg;
            });
            tcgApiResults = formatted;
          }
        }
      } catch (dbErr) {
        console.error("DB card search after identification failed:", dbErr);
      }
      if (tcgApiResults.length === 0) {
        try {
          const encodedQuery = encodeURIComponent(`name:"${identification.englishName}"`);
          const apiCtrl = new AbortController();
          const apiTimer = setTimeout(() => apiCtrl.abort(), 1e4);
          const tcgRes = await fetch(
            `${POKEMON_API2}/cards?q=${encodedQuery}&orderBy=-set.releaseDate&pageSize=10`,
            { signal: apiCtrl.signal, headers: tcgHeaders() }
          );
          clearTimeout(apiTimer);
          if (tcgRes.ok) {
            const tcgData = await tcgRes.json();
            tcgApiResults = tcgData.data || [];
            if (identification.cardNumber && tcgApiResults.length > 1) {
              const numOnly = identification.cardNumber.split("/")[0].replace(/^0+/, "");
              const exactMatch = tcgApiResults.filter((c) => {
                const cn = String(c.number).replace(/^0+/, "");
                return cn === numOnly;
              });
              if (exactMatch.length > 0) tcgApiResults = exactMatch;
            }
          }
        } catch (e) {
          console.error("TCG API search after identification failed:", e);
        }
      }
      res.json({
        identification,
        pcvResults: pcvResults.slice(0, 10),
        tcgApiResults: tcgApiResults.slice(0, 10)
      });
    } catch (error) {
      console.error("Card identification failed:", error);
      res.status(500).json({ error: error.message || "Failed to identify card" });
    }
  });
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const { username, displayName, email, mobileNumber, password } = req.body;
      if (!username || !displayName || !email || !password) {
        res.status(400).json({ error: "Username, display name, email and password are required" });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        res.status(409).json({ error: "An account with this email already exists" });
        return;
      }
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        res.status(409).json({ error: "Username is already taken" });
        return;
      }
      const blocked = await isCredentialBlocked(email, mobileNumber);
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username: username.toLowerCase().trim(),
        displayName: displayName.trim(),
        email: email.toLowerCase().trim(),
        mobileNumber: mobileNumber?.trim() || "",
        passwordHash,
        authProvider: "local",
        isPremium: false,
        role: "user",
        avatarUrl: null,
        ...blocked ? { isTrialUsed: true } : {}
      });
      const token = await storage.createSession(user.id);
      const { passwordHash: _ph, ...safeUser } = user;
      try {
        const { code } = createOtp(user.email.toLowerCase().trim());
        await sendOtpByEmail(user.email, code);
      } catch (otpErr) {
        console.error("Failed to send verification email:", otpErr);
      }
      res.json({ token, user: safeUser });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ error: error.message || "Registration failed" });
    }
  });
  app2.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        res.status(400).json({ error: "email and code are required" });
        return;
      }
      const normalised = email.toLowerCase().trim();
      const result = verifyOtp(normalised, code);
      if (!result.valid) {
        if (result.tooManyAttempts) {
          res.status(429).json({ error: "Too many incorrect attempts. Please request a new code." });
          return;
        }
        res.status(401).json({ error: result.expired ? "Code expired. Please request a new one." : "Incorrect code. Please try again." });
        return;
      }
      const user = await storage.getUserByEmail(normalised);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      await storage.updateUser(user.id, { emailVerified: true });
      res.json({ success: true });
    } catch (error) {
      console.error("Verify email error:", error);
      res.status(500).json({ error: error.message || "Verification failed" });
    }
  });
  app2.post("/api/auth/resend-email-verification", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: "email is required" });
        return;
      }
      const normalised = email.toLowerCase().trim();
      const user = await storage.getUserByEmail(normalised);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      const { code, rateLimited } = createOtp(normalised);
      if (rateLimited) {
        res.status(429).json({ error: "Please wait before requesting another code." });
        return;
      }
      await sendOtpByEmail(user.email, code);
      res.json({ success: true });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ error: error.message || "Failed to resend code" });
    }
  });
  app2.delete("/api/auth/account", async (req, res) => {
    try {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (!token) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      const caller = await storage.validateSession(token);
      if (!caller) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      if (caller.isPremium && caller.subscriptionStatus === "active") {
        res.status(403).json({ error: "Please cancel your Premium subscription before deleting your account." });
        return;
      }
      await storage.deleteUser(caller.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ error: error.message || "Failed to delete account" });
    }
  });
  app2.post("/api/auth/verify-password", async (req, res) => {
    try {
      const { credential, password } = req.body;
      if (!credential || !password) {
        res.status(400).json({ error: "Email/username and password are required" });
        return;
      }
      let user = await storage.getUserByEmail(credential.toLowerCase().trim());
      if (!user) user = await storage.getUserByUsername(credential.toLowerCase().trim());
      if (!user) {
        res.status(401).json({ error: "Invalid email/username or password" });
        return;
      }
      if (!user.passwordHash) {
        res.status(401).json({ error: "This account does not have a password set. Contact an admin." });
        return;
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Invalid email/username or password" });
        return;
      }
      const maskEmail = (e) => {
        const [local, domain] = e.split("@");
        return local.slice(0, 2) + "***@" + domain;
      };
      const maskMobile = (m) => m.slice(0, -4).replace(/./g, "*") + m.slice(-4);
      res.json({
        userId: user.id,
        hasEmail: !!user.email,
        hasMobile: !!user.mobileNumber,
        maskedEmail: user.email ? maskEmail(user.email) : null,
        maskedMobile: user.mobileNumber ? maskMobile(user.mobileNumber) : null,
        emailCredential: user.email,
        mobileCredential: user.mobileNumber
      });
    } catch (error) {
      console.error("Verify password error:", error);
      res.status(500).json({ error: error.message || "Verification failed" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { credential, password } = req.body;
      if (!credential || !password) {
        res.status(400).json({ error: "Email/username and password are required" });
        return;
      }
      let user = await storage.getUserByEmail(credential.toLowerCase().trim());
      if (!user) user = await storage.getUserByUsername(credential.toLowerCase().trim());
      if (!user) {
        res.status(401).json({ error: "Invalid email/username or password" });
        return;
      }
      if (!user.passwordHash) {
        res.status(401).json({ error: "This account does not have a password set. Contact an admin." });
        return;
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Invalid email/username or password" });
        return;
      }
      const bu = user.bannedUntil;
      if (bu && new Date(bu) > /* @__PURE__ */ new Date()) {
        const reason = user.banReason || "Violation of community guidelines";
        const permanent = new Date(bu).getFullYear() > 2999;
        res.status(403).json({
          error: "Account banned",
          banned: true,
          bannedUntil: bu,
          banReason: reason,
          permanent,
          message: permanent ? `Your account has been permanently banned. Reason: ${reason}` : `Your account is banned until ${new Date(bu).toLocaleString()}. Reason: ${reason}`
        });
        return;
      }
      const token = await storage.createSession(user.id);
      const { passwordHash: _ph, ...safeUser } = user;
      res.json({ token, user: safeUser });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: error.message || "Login failed" });
    }
  });
  app2.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { credential, channel } = req.body;
      if (!credential || !channel) {
        res.status(400).json({ error: "credential and channel are required" });
        return;
      }
      if (channel !== "email" && channel !== "sms") {
        res.status(400).json({ error: "channel must be 'email' or 'sms'" });
        return;
      }
      let user = null;
      if (channel === "email") {
        user = await storage.getUserByEmail(credential);
      } else {
        user = await storage.getUserByMobile(credential);
        if (!user) {
          user = await storage.getUserByEmail(credential);
        }
      }
      if (!user) {
        res.status(404).json({ error: "No account found with this credential" });
        return;
      }
      const { code, rateLimited } = createOtp(credential);
      if (rateLimited) {
        res.status(429).json({ error: "Too many requests. Please wait before requesting another code." });
        return;
      }
      let sent = false;
      if (channel === "email") {
        sent = await sendOtpByEmail(user.email, code);
      } else {
        sent = await sendOtpBySms(user.mobileNumber, code);
      }
      if (!sent) {
        res.status(500).json({ error: "Failed to send verification code" });
        return;
      }
      res.json({ message: "Verification code sent", userId: user.id });
    } catch (error) {
      console.error("Send OTP error:", error);
      res.status(500).json({ error: error.message || "Failed to send OTP" });
    }
  });
  app2.post("/api/auth/send-otp-register", async (req, res) => {
    try {
      const { userId, channel } = req.body;
      if (!userId || !channel) {
        res.status(400).json({ error: "userId and channel are required" });
        return;
      }
      const user = await storage.getUserById(userId);
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      let targetCredential;
      let sent = false;
      if (channel === "email") {
        targetCredential = user.email;
        const { code, rateLimited } = createOtp(targetCredential);
        if (rateLimited) {
          res.status(429).json({ error: "Too many requests. Please wait before requesting another code." });
          return;
        }
        sent = await sendOtpByEmail(user.email, code);
      } else {
        targetCredential = user.mobileNumber;
        const { code, rateLimited } = createOtp(targetCredential);
        if (rateLimited) {
          res.status(429).json({ error: "Too many requests. Please wait before requesting another code." });
          return;
        }
        sent = await sendOtpBySms(user.mobileNumber, code);
      }
      if (!sent) {
        res.status(500).json({ error: "Failed to send verification code" });
        return;
      }
      res.json({ message: "Verification code sent" });
    } catch (error) {
      console.error("Send OTP register error:", error);
      res.status(500).json({ error: error.message || "Failed to send OTP" });
    }
  });
  app2.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { credential, code } = req.body;
      if (!credential || !code) {
        res.status(400).json({ error: "credential and code are required" });
        return;
      }
      const result = verifyOtp(credential, code);
      if (!result.valid) {
        if (result.tooManyAttempts) {
          res.status(429).json({ error: "Too many incorrect attempts. Please request a new code." });
          return;
        }
        res.status(401).json({ error: result.expired ? "Verification code has expired. Please request a new one." : "Incorrect verification code. Please try again." });
        return;
      }
      let user = await storage.getUserByEmail(credential);
      if (!user) {
        user = await storage.getUserByMobile(credential);
      }
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      const bu = user.bannedUntil;
      if (bu && new Date(bu) > /* @__PURE__ */ new Date()) {
        const reason = user.banReason || "Violation of community guidelines";
        const permanent = new Date(bu).getFullYear() > 2999;
        res.status(403).json({
          error: "Account banned",
          banned: true,
          bannedUntil: bu,
          banReason: reason,
          permanent,
          message: permanent ? `Your account has been permanently banned. Reason: ${reason}` : `Your account is banned until ${new Date(bu).toLocaleString()}. Reason: ${reason}`
        });
        return;
      }
      const token = await storage.createSession(user.id);
      res.json({ token, user });
    } catch (error) {
      console.error("Verify OTP error:", error);
      res.status(500).json({ error: error.message || "Verification failed" });
    }
  });
  app2.post("/api/auth/session", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        res.status(400).json({ error: "token is required" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      res.json({ user });
    } catch (error) {
      console.error("Session validation error:", error);
      res.status(500).json({ error: error.message || "Session validation failed" });
    }
  });
  app2.post("/api/auth/logout", async (req, res) => {
    try {
      const { token } = req.body;
      if (token) {
        await storage.deleteSession(token);
      }
      res.json({ message: "Logged out" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: error.message || "Logout failed" });
    }
  });
  app2.get("/api/stripe/config", async (_req, res) => {
    try {
      const { getStripePublishableKey: getStripePublishableKey2 } = await Promise.resolve().then(() => (init_stripe_client(), stripe_client_exports));
      const publishableKey = await getStripePublishableKey2();
      res.json({ publishableKey });
    } catch (err) {
      console.error("[Stripe] Config error:", err.message);
      res.status(500).json({ error: "Stripe not configured" });
    }
  });
  app2.post("/api/stripe/create-checkout", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      const { priceId, successUrl, cancelUrl } = req.body;
      if (!priceId || !successUrl || !cancelUrl) {
        res.status(400).json({ error: "priceId, successUrl and cancelUrl are required" });
        return;
      }
      const { getUncachableStripeClient: getUncachableStripeClient2, ensureStripeCustomer: ensureStripeCustomer2 } = await Promise.resolve().then(() => (init_stripe_client(), stripe_client_exports));
      const stripe = await getUncachableStripeClient2();
      const customerId = await ensureStripeCustomer2(stripe, user);
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data: {
          metadata: { pokescanUserId: user.id }
        },
        allow_promotion_codes: true
      });
      res.json({ url: session.url, sessionId: session.id });
    } catch (err) {
      console.error("[Stripe] Checkout error:", err.message);
      res.status(500).json({ error: err.message || "Failed to create checkout session" });
    }
  });
  app2.post("/api/stripe/portal", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      const { getUncachableStripeClient: getUncachableStripeClient2, ensureStripeCustomer: ensureStripeCustomer2 } = await Promise.resolve().then(() => (init_stripe_client(), stripe_client_exports));
      const stripe = await getUncachableStripeClient2();
      const { returnUrl } = req.body;
      const customerId = await ensureStripeCustomer2(stripe, user);
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl || "https://pokescantcg.replit.app"
      });
      res.json({ url: portalSession.url });
    } catch (err) {
      console.error("[Stripe] Portal error:", err.message);
      res.status(500).json({ error: err.message || "Failed to open billing portal" });
    }
  });
  app2.post("/api/stripe/sync", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      const customerId = user.stripeCustomerId;
      if (!customerId) {
        res.json({ isPremium: false, subscriptionStatus: null });
        return;
      }
      const { getUncachableStripeClient: getUncachableStripeClient2, ensureStripeCustomer: ensureStripeCustomer2 } = await Promise.resolve().then(() => (init_stripe_client(), stripe_client_exports));
      const stripe = await getUncachableStripeClient2();
      let subscriptions;
      try {
        subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "all",
          limit: 5,
          expand: ["data.default_payment_method"]
        });
      } catch (e) {
        console.warn(`[Stripe] Sync failed for customer ${customerId}: ${e.message}. Clearing stored ID.`);
        await storage.updateUser(user.id, { stripeCustomerId: null });
        res.json({ isPremium: false, subscriptionStatus: null });
        return;
      }
      const active = subscriptions.data.find(
        (s) => s.status === "active" || s.status === "trialing"
      );
      if (active) {
        const periodEnd = new Date(active.current_period_end * 1e3);
        const resolvedStatus = active.cancel_at_period_end ? "canceling" : active.status;
        await storage.updateUser(user.id, {
          isPremium: true,
          stripeSubscriptionId: active.id,
          stripePriceId: active.items.data[0]?.price?.id ?? null,
          subscriptionStatus: resolvedStatus,
          subscriptionPeriodEnd: periodEnd
        });
        res.json({ isPremium: true, subscriptionStatus: resolvedStatus, periodEnd: periodEnd.toISOString(), cancelAtPeriodEnd: !!active.cancel_at_period_end });
      } else {
        const latestSub = subscriptions.data[0];
        const storedUser = user;
        const periodEndDate = storedUser.subscriptionPeriodEnd ? new Date(storedUser.subscriptionPeriodEnd) : null;
        const stillInGracePeriod = periodEndDate && periodEndDate > /* @__PURE__ */ new Date();
        if (stillInGracePeriod) {
          await storage.updateUser(user.id, {
            subscriptionStatus: "canceling"
          });
          res.json({ isPremium: true, subscriptionStatus: "canceling", periodEnd: periodEndDate.toISOString(), cancelAtPeriodEnd: true });
        } else {
          await storage.updateUser(user.id, {
            isPremium: false,
            subscriptionStatus: latestSub?.status ?? "canceled"
          });
          res.json({ isPremium: false, subscriptionStatus: latestSub?.status ?? "canceled" });
        }
      }
    } catch (err) {
      console.error("[Stripe] Sync error:", err.message);
      res.status(500).json({ error: err.message || "Sync failed" });
    }
  });
  app2.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const sig = req.headers["stripe-signature"];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      let event;
      try {
        const { getUncachableStripeClient: getUncachableStripeClient2, ensureStripeCustomer: ensureStripeCustomer2 } = await Promise.resolve().then(() => (init_stripe_client(), stripe_client_exports));
        const stripe = await getUncachableStripeClient2();
        if (webhookSecret && sig) {
          event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } else {
          event = JSON.parse(req.body.toString());
        }
      } catch (err) {
        console.error("[Stripe Webhook] Signature error:", err.message);
        res.status(400).json({ error: "Webhook signature verification failed" });
        return;
      }
      try {
        switch (event.type) {
          case "customer.subscription.created":
          case "customer.subscription.updated": {
            const sub = event.data.object;
            const customerId = sub.customer;
            const userRow = await pool3.query(
              `SELECT id FROM pokescan_users WHERE stripe_customer_id = $1`,
              [customerId]
            );
            if (userRow.rows.length > 0) {
              const userId = userRow.rows[0].id;
              const isActive = sub.status === "active" || sub.status === "trialing";
              const periodEnd = new Date(sub.current_period_end * 1e3);
              const resolvedStatus = isActive && sub.cancel_at_period_end ? "canceling" : sub.status;
              await pool3.query(
                `UPDATE pokescan_users
                 SET is_premium = $1, stripe_subscription_id = $2,
                     stripe_price_id = $3, subscription_status = $4,
                     subscription_period_end = $5
                 WHERE id = $6`,
                [isActive, sub.id, sub.items?.data?.[0]?.price?.id ?? null, resolvedStatus, periodEnd, userId]
              );
              console.log(`[Stripe Webhook] Updated user ${userId}: isPremium=${isActive} status=${resolvedStatus} cancelAtPeriodEnd=${sub.cancel_at_period_end}`);
            }
            break;
          }
          case "customer.subscription.deleted": {
            const sub = event.data.object;
            const customerId = sub.customer;
            const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1e3) : /* @__PURE__ */ new Date();
            await pool3.query(
              `UPDATE pokescan_users
               SET is_premium = false, subscription_status = 'canceled',
                   subscription_period_end = $2
               WHERE stripe_customer_id = $1`,
              [customerId, periodEnd]
            );
            console.log(`[Stripe Webhook] Subscription ended for customer ${customerId} \u2014 premium removed`);
            break;
          }
          case "invoice.payment_failed": {
            const invoice = event.data.object;
            const customerId = invoice.customer;
            await pool3.query(
              `UPDATE pokescan_users SET subscription_status = 'past_due' WHERE stripe_customer_id = $1`,
              [customerId]
            );
            break;
          }
        }
        res.json({ received: true });
      } catch (err) {
        console.error("[Stripe Webhook] Handler error:", err.message);
        res.status(500).json({ error: "Webhook handler failed" });
      }
    }
  );
  app2.post("/api/user/cancel-premium", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      if (user.role === "admin" || user.role === "moderator") {
        res.status(403).json({ error: "Staff premium cannot be self-cancelled. Contact a superadmin." });
        return;
      }
      if (!user.isPremium) {
        res.status(400).json({ error: "Account does not have an active premium subscription." });
        return;
      }
      const subscriptionId = user.stripeSubscriptionId;
      if (subscriptionId) {
        try {
          const { getUncachableStripeClient: getUncachableStripeClient2, ensureStripeCustomer: ensureStripeCustomer2 } = await Promise.resolve().then(() => (init_stripe_client(), stripe_client_exports));
          const stripe = await getUncachableStripeClient2();
          await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
          console.log(`[Premium] Stripe subscription ${subscriptionId} set to cancel at period end.`);
          await storage.updateUser(user.id, { subscriptionStatus: "canceling" });
          res.json({ success: true, message: "Subscription will cancel at end of billing period." });
          return;
        } catch (stripeErr) {
          console.error("[Premium] Stripe cancel error:", stripeErr.message);
        }
      }
      const updated = await storage.updateUser(user.id, { isPremium: false });
      if (!updated) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      console.log(`[Premium] User ${user.id} (${user.email || user.username}) cancelled premium.`);
      res.json({ success: true });
    } catch (error) {
      console.error("Cancel premium error:", error);
      res.status(500).json({ error: error.message || "Cancellation failed" });
    }
  });
  function rowToListing(row) {
    return {
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      cardId: row.card_id,
      cardName: row.card_name,
      cardImage: row.card_image,
      setName: row.set_name,
      rarity: row.rarity,
      type: row.type,
      priceGBP: row.price_gbp ?? null,
      condition: row.condition,
      description: row.description ?? "",
      photos: (() => {
        try {
          return JSON.parse(row.photos ?? "[]");
        } catch {
          return [];
        }
      })(),
      status: row.status ?? "approved",
      reviewedBy: row.reviewed_by ?? null,
      reviewedAt: row.reviewed_at ?? null,
      reviewNote: row.review_note ?? null,
      reviewNoteUpdatedBy: row.review_note_updated_by_username ?? row.review_note_updated_by ?? null,
      reviewNoteUpdatedAt: row.review_note_updated_at ?? null,
      externalUrl: row.external_url ?? null,
      createdAt: row.created_at
    };
  }
  app2.get("/api/listings", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      if (!user.isPremium) {
        res.status(403).json({ error: "Premium required to access the marketplace." });
        return;
      }
      const result = await pool3.query(
        `SELECT * FROM pokescan_market_listings
           WHERE status = 'approved' OR user_id = $1
           ORDER BY created_at DESC
           LIMIT 200`,
        [user.id]
      );
      res.json({ listings: result.rows.map(rowToListing) });
    } catch (err) {
      console.error("[Listings] GET error:", err.message);
      res.status(500).json({ error: "Could not fetch listings" });
    }
  });
  app2.post("/api/listings", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      if (!user.isPremium) {
        res.status(403).json({ error: "Premium required to list on the marketplace." });
        return;
      }
      const { cardId, cardName, cardImage, setName, rarity, type, priceGBP, condition, description, photos, externalUrl } = req.body;
      if (!cardId || !cardName || !cardImage || !setName || !type || !condition) {
        res.status(400).json({ error: "Missing required listing fields." });
        return;
      }
      const rawPhotos = Array.isArray(photos) ? photos.slice(0, 6) : [];
      const photosJson = JSON.stringify(rawPhotos);
      const safeExternalUrl = typeof externalUrl === "string" && /^https?:\/\//i.test(externalUrl.trim()) ? externalUrl.trim() : null;
      const isStaff = user.role === "admin" || user.role === "moderator";
      const initialStatus = isStaff ? "approved" : "pending";
      const result = await pool3.query(
        `INSERT INTO pokescan_market_listings
           (user_id, user_name, card_id, card_name, card_image, set_name, rarity, type, price_gbp, condition, description, photos, status, reviewed_by, reviewed_at, external_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         RETURNING *`,
        [
          user.id,
          user.displayName,
          cardId,
          cardName,
          cardImage,
          setName,
          rarity ?? "Unknown",
          type,
          priceGBP ?? null,
          condition,
          description ?? "",
          photosJson,
          initialStatus,
          isStaff ? user.id : null,
          isStaff ? /* @__PURE__ */ new Date() : null,
          safeExternalUrl
        ]
      );
      res.status(201).json({ listing: rowToListing(result.rows[0]) });
    } catch (err) {
      console.error("[Listings] POST error:", err.message);
      res.status(500).json({ error: "Could not create listing" });
    }
  });
  app2.delete("/api/listings/:id", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      const { id } = req.params;
      const existing = await pool3.query(`SELECT user_id FROM pokescan_market_listings WHERE id = $1`, [id]);
      if (existing.rows.length === 0) {
        res.status(404).json({ error: "Listing not found" });
        return;
      }
      const isOwner = existing.rows[0].user_id === user.id;
      const isStaff = user.role === "admin" || user.role === "moderator";
      if (!isOwner && !isStaff) {
        res.status(403).json({ error: "Not authorised to delete this listing" });
        return;
      }
      await pool3.query(`DELETE FROM pokescan_market_listings WHERE id = $1`, [id]);
      res.json({ success: true });
    } catch (err) {
      console.error("[Listings] DELETE error:", err.message);
      res.status(500).json({ error: "Could not delete listing" });
    }
  });
  app2.patch("/api/listings/:id", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      const { id } = req.params;
      const existing = await pool3.query(`SELECT user_id FROM pokescan_market_listings WHERE id = $1`, [id]);
      if (existing.rows.length === 0) {
        res.status(404).json({ error: "Listing not found" });
        return;
      }
      const isOwner = existing.rows[0].user_id === user.id;
      if (!isOwner) {
        res.status(403).json({ error: "Not authorised to edit this listing" });
        return;
      }
      const { priceGBP, condition, description, externalUrl, photos } = req.body;
      if (!condition) {
        res.status(400).json({ error: "Condition is required" });
        return;
      }
      const safeExternalUrl = typeof externalUrl === "string" && /^https?:\/\//i.test(externalUrl.trim()) ? externalUrl.trim() : null;
      const isStaff = user.role === "admin" || user.role === "moderator";
      const newStatus = isStaff ? "approved" : "pending";
      let result;
      if (Array.isArray(photos)) {
        const photosJson = JSON.stringify(photos.slice(0, 6));
        result = await pool3.query(
          `UPDATE pokescan_market_listings
             SET price_gbp = $1, condition = $2, description = $3, external_url = $4,
                 photos = $5,
                 status = $6,
                 reviewed_by = $7, reviewed_at = $8,
                 review_note = NULL
             WHERE id = $9
             RETURNING *`,
          [
            priceGBP ?? null,
            condition,
            description ?? "",
            safeExternalUrl,
            photosJson,
            newStatus,
            isStaff ? user.id : null,
            isStaff ? /* @__PURE__ */ new Date() : null,
            id
          ]
        );
      } else {
        result = await pool3.query(
          `UPDATE pokescan_market_listings
             SET price_gbp = $1, condition = $2, description = $3, external_url = $4,
                 status = $5,
                 reviewed_by = $6, reviewed_at = $7,
                 review_note = NULL
             WHERE id = $8
             RETURNING *`,
          [
            priceGBP ?? null,
            condition,
            description ?? "",
            safeExternalUrl,
            newStatus,
            isStaff ? user.id : null,
            isStaff ? /* @__PURE__ */ new Date() : null,
            id
          ]
        );
      }
      res.json({ listing: rowToListing(result.rows[0]) });
    } catch (err) {
      console.error("[Listings] PATCH error:", err.message);
      res.status(500).json({ error: "Could not update listing" });
    }
  });
  app2.get("/api/admin/listings", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      if (user.role !== "admin" && user.role !== "moderator") {
        res.status(403).json({ error: "Staff access required" });
        return;
      }
      const status = String(req.query.status ?? "all").toLowerCase();
      const allowed = ["pending", "approved", "rejected"];
      const result = allowed.includes(status) ? await pool3.query(
        `SELECT ml.*, u.username AS review_note_updated_by_username
               FROM pokescan_market_listings ml
               LEFT JOIN pokescan_users u ON u.id = ml.review_note_updated_by
              WHERE ml.status = $1
              ORDER BY ml.created_at DESC LIMIT 500`,
        [status]
      ) : await pool3.query(
        `SELECT ml.*, u.username AS review_note_updated_by_username
               FROM pokescan_market_listings ml
               LEFT JOIN pokescan_users u ON u.id = ml.review_note_updated_by
              ORDER BY ml.created_at DESC LIMIT 500`
      );
      res.json({ listings: result.rows.map(rowToListing) });
    } catch (err) {
      console.error("[Admin Listings] GET error:", err.message);
      res.status(500).json({ error: "Could not fetch admin listings" });
    }
  });
  app2.patch("/api/admin/listings/:id", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      if (user.role !== "admin" && user.role !== "moderator") {
        res.status(403).json({ error: "Staff access required" });
        return;
      }
      const { id } = req.params;
      const { status, reviewNote } = req.body ?? {};
      if (status !== void 0 && status !== "approved" && status !== "rejected") {
        res.status(400).json({ error: "status must be 'approved' or 'rejected'" });
        return;
      }
      let result;
      if (status !== void 0) {
        result = await pool3.query(
          `UPDATE pokescan_market_listings
              SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_note = $3
            WHERE id = $4
            RETURNING *`,
          [status, user.id, reviewNote ?? null, id]
        );
      } else {
        result = await pool3.query(
          `WITH upd AS (
              UPDATE pokescan_market_listings
                 SET review_note = $1,
                     review_note_updated_by = $2,
                     review_note_updated_at = NOW()
               WHERE id = $3
             RETURNING *
           )
           SELECT upd.*, u.username AS review_note_updated_by_username
             FROM upd
             LEFT JOIN pokescan_users u ON u.id = upd.review_note_updated_by`,
          [reviewNote ?? null, user.id, id]
        );
      }
      if (result.rows.length === 0) {
        res.status(404).json({ error: "Listing not found" });
        return;
      }
      const row = result.rows[0];
      const action = status !== void 0 ? status : "note_edited";
      try {
        await db.insert(pokescanAdminActivityLog).values({
          listingId: id,
          listingName: row.card_name ?? null,
          action,
          performedBy: user.id,
          note: reviewNote ?? null
        });
      } catch (logErr) {
        console.warn("[ActivityLog] Failed to write log entry:", logErr);
      }
      res.json({ listing: rowToListing(row) });
    } catch (err) {
      console.error("[Admin Listings] PATCH error:", err.message);
      res.status(500).json({ error: "Could not update listing" });
    }
  });
  app2.get("/api/admin/activity-log", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      if (user.role !== "admin" && !await isSuperadminAuthorized(req)) {
        res.status(403).json({ error: "Admin access required" });
        return;
      }
      const page = Math.max(1, parseInt(req.query.page || "1", 10));
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "20", 10)));
      const offset = (page - 1) * limit;
      const moderator = req.query.moderator || "";
      const dateFrom = req.query.dateFrom || "";
      const dateTo = req.query.dateTo || "";
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (dateFrom && (!datePattern.test(dateFrom) || isNaN(Date.parse(dateFrom)))) {
        res.status(400).json({ error: "Invalid dateFrom format \u2014 use YYYY-MM-DD" });
        return;
      }
      if (dateTo && (!datePattern.test(dateTo) || isNaN(Date.parse(dateTo)))) {
        res.status(400).json({ error: "Invalid dateTo format \u2014 use YYYY-MM-DD" });
        return;
      }
      const conditions = [];
      const params = [];
      let pi = 1;
      if (moderator) {
        conditions.push(`u.username ILIKE $${pi++}`);
        params.push(`%${moderator}%`);
      }
      if (dateFrom) {
        conditions.push(`al.created_at >= $${pi++}`);
        params.push(new Date(dateFrom).toISOString());
      }
      if (dateTo) {
        conditions.push(`al.created_at <= $${pi++}`);
        params.push((/* @__PURE__ */ new Date(dateTo + "T23:59:59")).toISOString());
      }
      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const countResult = await pool3.query(
        `SELECT COUNT(*)::int AS total
           FROM pokescan_admin_activity_log al
           LEFT JOIN pokescan_users u ON u.id = al.performed_by
           ${where}`,
        params
      );
      const total = countResult.rows[0]?.total ?? 0;
      const dataResult = await pool3.query(
        `SELECT al.*, u.username AS moderator_username, u.display_name AS moderator_display_name
           FROM pokescan_admin_activity_log al
           LEFT JOIN pokescan_users u ON u.id = al.performed_by
           ${where}
           ORDER BY al.created_at DESC
           LIMIT $${pi++} OFFSET $${pi++}`,
        [...params, limit, offset]
      );
      res.json({
        logs: dataResult.rows.map((r) => ({
          id: r.id,
          listingId: r.listing_id,
          listingName: r.listing_name,
          targetUserId: r.target_user_id,
          targetUsername: r.target_username,
          action: r.action,
          performedBy: r.performed_by,
          moderatorUsername: r.moderator_username,
          moderatorDisplayName: r.moderator_display_name,
          note: r.note,
          createdAt: r.created_at
        })),
        total,
        page,
        limit,
        hasMore: offset + limit < total
      });
    } catch (err) {
      console.error("[ActivityLog] GET error:", err.message);
      res.status(500).json({ error: "Could not fetch activity log" });
    }
  });
  app2.get("/api/admin/reports/all", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      if (user.role !== "admin" && !await isSuperadminAuthorized(req)) {
        res.status(403).json({ error: "Admin access required" });
        return;
      }
      const page = Math.max(1, parseInt(req.query.page || "1", 10));
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "20", 10)));
      const offset = (page - 1) * limit;
      const status = req.query.status || "all";
      const reporter = req.query.reporter || "";
      const dateFrom = req.query.dateFrom || "";
      const dateTo = req.query.dateTo || "";
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (dateFrom && (!datePattern.test(dateFrom) || isNaN(Date.parse(dateFrom)))) {
        res.status(400).json({ error: "Invalid dateFrom format \u2014 use YYYY-MM-DD" });
        return;
      }
      if (dateTo && (!datePattern.test(dateTo) || isNaN(Date.parse(dateTo)))) {
        res.status(400).json({ error: "Invalid dateTo format \u2014 use YYYY-MM-DD" });
        return;
      }
      const conditions = [];
      const params = [];
      let pi = 1;
      const allowedStatuses = ["pending", "reviewed", "dismissed"];
      if (allowedStatuses.includes(status)) {
        conditions.push(`r.status = $${pi++}`);
        params.push(status);
      }
      if (reporter) {
        conditions.push(`reporter.username ILIKE $${pi++}`);
        params.push(`%${reporter}%`);
      }
      if (dateFrom) {
        conditions.push(`r.created_at >= $${pi++}`);
        params.push(new Date(dateFrom).toISOString());
      }
      if (dateTo) {
        conditions.push(`r.created_at <= $${pi++}`);
        params.push((/* @__PURE__ */ new Date(dateTo + "T23:59:59")).toISOString());
      }
      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const countResult = await pool3.query(
        `SELECT COUNT(*)::int AS total
           FROM pokescan_reports r
           LEFT JOIN pokescan_users reporter ON reporter.id = r.reporter_id
           ${where}`,
        params
      );
      const total = countResult.rows[0]?.total ?? 0;
      const dataResult = await pool3.query(
        `SELECT r.*,
                reporter.username AS reporter_username,
                reporter.display_name AS reporter_display_name,
                reported.username AS reported_username,
                reviewed_by_user.username AS reviewed_by_username
           FROM pokescan_reports r
           LEFT JOIN pokescan_users reporter ON reporter.id = r.reporter_id
           LEFT JOIN pokescan_users reported ON reported.id = r.reported_user_id
           LEFT JOIN pokescan_users reviewed_by_user ON reviewed_by_user.id = r.reviewed_by
           ${where}
           ORDER BY r.created_at DESC
           LIMIT $${pi++} OFFSET $${pi++}`,
        [...params, limit, offset]
      );
      res.json({
        reports: dataResult.rows.map((r) => ({
          id: r.id,
          reporterId: r.reporter_id,
          reporterUsername: r.reporter_username,
          reporterDisplayName: r.reporter_display_name,
          reportedUserId: r.reported_user_id,
          reportedUsername: r.reported_username,
          contentType: r.content_type,
          contentId: r.content_id,
          reason: r.reason,
          contentSnapshot: r.content_snapshot,
          status: r.status,
          reviewNote: r.review_note,
          reviewedBy: r.reviewed_by,
          reviewedByUsername: r.reviewed_by_username,
          reviewedAt: r.reviewed_at,
          createdAt: r.created_at
        })),
        total,
        page,
        limit,
        hasMore: offset + limit < total
      });
    } catch (err) {
      console.error("[AllReports] GET error:", err.message);
      res.status(500).json({ error: "Could not fetch reports" });
    }
  });
  app2.post("/api/user/daily-checkin", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      if (user.isPremium) {
        res.json({ isPremium: true, unlimited: true });
        return;
      }
      const result = await dailyCheckin(user.id);
      res.json(result);
    } catch (error) {
      console.error("Daily checkin error:", error);
      res.status(500).json({ error: error.message || "Checkin failed" });
    }
  });
  app2.get("/api/user/scan-quota", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      if (user.isPremium) {
        res.json({ isPremium: true, unlimited: true });
        return;
      }
      const quota = await getUserQuota(user.id);
      res.json(quota);
    } catch (error) {
      console.error("Scan quota error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch quota" });
    }
  });
  app2.post("/api/user/avatar", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      const { base64, mimeType } = req.body;
      if (!base64 || typeof base64 !== "string") {
        res.status(400).json({ error: "base64 image data required" });
        return;
      }
      if (base64.length > 1572864) {
        res.status(400).json({ error: "Image too large. Please choose a smaller image." });
        return;
      }
      const dataUrl = `data:${mimeType || "image/jpeg"};base64,${base64}`;
      const updated = await storage.updateUser(user.id, { avatarUrl: dataUrl });
      if (!updated) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json({ avatarUrl: dataUrl });
    } catch (error) {
      console.error("Avatar upload error:", error);
      res.status(500).json({ error: error.message || "Upload failed" });
    }
  });
  app2.get("/api/scan-history", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      const rows = await db.execute(
        sql4`SELECT * FROM pokescan_scan_history WHERE user_id = ${user.id} ORDER BY scanned_at DESC LIMIT 25`
      );
      const entries = rows.rows.map((r) => ({
        id: r.id,
        timestamp: r.scanned_at,
        cardName: r.card_name,
        setName: r.set_name,
        cardNumber: r.card_number,
        language: r.language,
        thumbnail: r.thumbnail,
        priceGBP: r.price_gbp,
        identification: JSON.parse(r.identification || "{}"),
        tcgApiResults: JSON.parse(r.tcg_api_results || "[]"),
        pcvResults: JSON.parse(r.pcv_results || "[]")
      }));
      res.json({ history: entries });
    } catch (error) {
      console.error("Scan history fetch error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch scan history" });
    }
  });
  app2.post("/api/scan-history", express.json({ limit: "10mb" }), async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      const { cardName, setName, cardNumber, language, thumbnail, priceGBP, identification, tcgApiResults, pcvResults } = req.body;
      if (!cardName) {
        res.status(400).json({ error: "cardName is required" });
        return;
      }
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await db.execute(
        sql4`INSERT INTO pokescan_scan_history (id, user_id, card_name, set_name, card_number, language, thumbnail, price_gbp, identification, tcg_api_results, pcv_results)
            VALUES (${id}, ${user.id}, ${cardName}, ${setName || ""}, ${cardNumber || ""}, ${language || "english"},
                    ${thumbnail || null}, ${priceGBP ?? null},
                    ${JSON.stringify(identification || {})}, ${JSON.stringify(tcgApiResults || [])}, ${JSON.stringify(pcvResults || [])})`
      );
      await db.execute(
        sql4`DELETE FROM pokescan_scan_history WHERE user_id = ${user.id} AND id NOT IN (
              SELECT id FROM pokescan_scan_history WHERE user_id = ${user.id} ORDER BY scanned_at DESC LIMIT 25
            )`
      );
      const rows = await db.execute(
        sql4`SELECT * FROM pokescan_scan_history WHERE user_id = ${user.id} ORDER BY scanned_at DESC LIMIT 25`
      );
      const entries = rows.rows.map((r) => ({
        id: r.id,
        timestamp: r.scanned_at,
        cardName: r.card_name,
        setName: r.set_name,
        cardNumber: r.card_number,
        language: r.language,
        thumbnail: r.thumbnail,
        priceGBP: r.price_gbp,
        identification: JSON.parse(r.identification || "{}"),
        tcgApiResults: JSON.parse(r.tcg_api_results || "[]"),
        pcvResults: JSON.parse(r.pcv_results || "[]")
      }));
      res.json({ history: entries });
    } catch (error) {
      console.error("Scan history add error:", error);
      res.status(500).json({ error: error.message || "Failed to add scan history entry" });
    }
  });
  app2.post("/api/scan-history/bulk", express.json({ limit: "10mb" }), async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      const { entries } = req.body;
      if (!Array.isArray(entries) || entries.length === 0) {
        res.json({ migrated: 0, failed: 0 });
        return;
      }
      let migrated = 0;
      let failed = 0;
      for (const entry of entries) {
        try {
          const existingRows = await db.execute(
            sql4`SELECT id FROM pokescan_scan_history WHERE id = ${entry.id} AND user_id = ${user.id}`
          );
          if (existingRows.rows.length > 0) {
            migrated++;
            continue;
          }
          const scannedAt = entry.timestamp ? new Date(entry.timestamp) : /* @__PURE__ */ new Date();
          await db.execute(
            sql4`INSERT INTO pokescan_scan_history (id, user_id, card_name, set_name, card_number, language, thumbnail, price_gbp, identification, tcg_api_results, pcv_results, scanned_at)
                VALUES (${entry.id}, ${user.id}, ${entry.cardName || ""}, ${entry.setName || ""}, ${entry.cardNumber || ""},
                        ${entry.language || "english"}, ${entry.thumbnail || null}, ${entry.priceGBP ?? null},
                        ${JSON.stringify(entry.identification || {})}, ${JSON.stringify(entry.tcgApiResults || [])}, ${JSON.stringify(entry.pcvResults || [])}, ${scannedAt})`
          );
          migrated++;
        } catch {
          failed++;
        }
      }
      await db.execute(
        sql4`DELETE FROM pokescan_scan_history WHERE user_id = ${user.id} AND id NOT IN (
              SELECT id FROM pokescan_scan_history WHERE user_id = ${user.id} ORDER BY scanned_at DESC LIMIT 25
            )`
      );
      res.json({ migrated, failed });
    } catch (error) {
      console.error("Scan history bulk migrate error:", error);
      res.status(500).json({ error: error.message || "Migration failed" });
    }
  });
  app2.delete("/api/scan-history", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      await db.execute(sql4`DELETE FROM pokescan_scan_history WHERE user_id = ${user.id}`);
      res.json({ history: [] });
    } catch (error) {
      console.error("Scan history clear error:", error);
      res.status(500).json({ error: error.message || "Failed to clear scan history" });
    }
  });
  app2.delete("/api/scan-history/:id", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      const { id } = req.params;
      await db.execute(sql4`DELETE FROM pokescan_scan_history WHERE id = ${id} AND user_id = ${user.id}`);
      const rows = await db.execute(
        sql4`SELECT * FROM pokescan_scan_history WHERE user_id = ${user.id} ORDER BY scanned_at DESC LIMIT 25`
      );
      const entries = rows.rows.map((r) => ({
        id: r.id,
        timestamp: r.scanned_at,
        cardName: r.card_name,
        setName: r.set_name,
        cardNumber: r.card_number,
        language: r.language,
        thumbnail: r.thumbnail,
        priceGBP: r.price_gbp,
        identification: JSON.parse(r.identification || "{}"),
        tcgApiResults: JSON.parse(r.tcg_api_results || "[]"),
        pcvResults: JSON.parse(r.pcv_results || "[]")
      }));
      res.json({ history: entries });
    } catch (error) {
      console.error("Scan history delete error:", error);
      res.status(500).json({ error: error.message || "Failed to delete scan history entry" });
    }
  });
  app2.get("/api/collection", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      const rows = await db.execute(
        sql4`SELECT * FROM pokescan_collections WHERE user_id = ${user.id} ORDER BY added_at DESC`
      );
      const items = rows.rows.map((r) => ({
        id: r.id,
        cardId: r.card_id,
        cardName: r.card_name,
        cardImage: r.card_image,
        setName: r.set_name,
        setId: r.set_id,
        rarity: r.rarity,
        quantity: r.quantity,
        condition: r.condition,
        variant: r.variant || "Non-Holo",
        priceGBP: r.price_gbp,
        gradingCompany: r.grading_company || null,
        grade: r.grade || null,
        isVerified: r.is_verified ?? false,
        verifiedAt: r.verified_at || null,
        addedAt: r.added_at
      }));
      res.json({ collection: items });
    } catch (error) {
      console.error("Collection fetch error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch collection" });
    }
  });
  app2.post("/api/collection", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      const { cardId, cardName, cardImage, setName, setId, rarity, quantity, condition, variant, priceGBP, migrate, gradingCompany, grade } = req.body;
      const v = variant || "Non-Holo";
      const gc = gradingCompany || null;
      const gr = grade || null;
      const existing = await db.execute(
        sql4`SELECT id, quantity FROM pokescan_collections
            WHERE user_id = ${user.id}
              AND card_id = ${cardId}
              AND condition = ${condition}
              AND COALESCE(variant, 'Non-Holo') = ${v}
              AND COALESCE(grading_company, '') = COALESCE(${gc}, '')
              AND COALESCE(grade, '') = COALESCE(${gr}, '')`
      );
      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        const newQty = migrate ? Math.max(row.quantity, quantity || 1) : row.quantity + (quantity || 1);
        await db.execute(
          sql4`UPDATE pokescan_collections SET quantity = ${newQty}, price_gbp = ${priceGBP ?? null} WHERE id = ${row.id}`
        );
      } else {
        await db.execute(
          sql4`INSERT INTO pokescan_collections (user_id, card_id, card_name, card_image, set_name, set_id, rarity, quantity, condition, variant, price_gbp, grading_company, grade) VALUES (${user.id}, ${cardId}, ${cardName}, ${cardImage ?? null}, ${setName || setId || "Unknown"}, ${setId || null}, ${rarity || "Unknown"}, ${quantity || 1}, ${condition}, ${v}, ${priceGBP ?? null}, ${gc}, ${gr})`
        );
      }
      const rows = await db.execute(
        sql4`SELECT * FROM pokescan_collections WHERE user_id = ${user.id} ORDER BY added_at DESC`
      );
      const items = rows.rows.map((r) => ({
        id: r.id,
        cardId: r.card_id,
        cardName: r.card_name,
        cardImage: r.card_image,
        setName: r.set_name,
        setId: r.set_id,
        rarity: r.rarity,
        quantity: r.quantity,
        condition: r.condition,
        variant: r.variant || "Non-Holo",
        priceGBP: r.price_gbp,
        gradingCompany: r.grading_company || null,
        grade: r.grade || null,
        isVerified: r.is_verified ?? false,
        verifiedAt: r.verified_at || null,
        addedAt: r.added_at
      }));
      res.json({ collection: items });
    } catch (error) {
      console.error("Collection add error:", error);
      res.status(500).json({ error: error.message || "Failed to add card" });
    }
  });
  app2.put("/api/collection/:id", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      const { id } = req.params;
      const { quantity, gradingCompany, grade } = req.body;
      if (quantity <= 0) {
        await db.execute(sql4`DELETE FROM pokescan_collections WHERE id = ${id} AND user_id = ${user.id}`);
      } else if (gradingCompany !== void 0) {
        const gc = gradingCompany || null;
        const gr = grade || null;
        await db.execute(sql4`UPDATE pokescan_collections SET quantity = ${quantity}, grading_company = ${gc}, grade = ${gr} WHERE id = ${id} AND user_id = ${user.id}`);
      } else {
        await db.execute(sql4`UPDATE pokescan_collections SET quantity = ${quantity} WHERE id = ${id} AND user_id = ${user.id}`);
      }
      const rows = await db.execute(
        sql4`SELECT * FROM pokescan_collections WHERE user_id = ${user.id} ORDER BY added_at DESC`
      );
      const items = rows.rows.map((r) => ({
        id: r.id,
        cardId: r.card_id,
        cardName: r.card_name,
        cardImage: r.card_image,
        setName: r.set_name,
        setId: r.set_id,
        rarity: r.rarity,
        quantity: r.quantity,
        condition: r.condition,
        variant: r.variant || "Non-Holo",
        priceGBP: r.price_gbp,
        gradingCompany: r.grading_company || null,
        grade: r.grade || null,
        isVerified: r.is_verified ?? false,
        verifiedAt: r.verified_at || null,
        addedAt: r.added_at
      }));
      res.json({ collection: items });
    } catch (error) {
      console.error("Collection update error:", error);
      res.status(500).json({ error: error.message || "Failed to update card" });
    }
  });
  app2.delete("/api/collection/:id", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      const { id } = req.params;
      await db.execute(sql4`DELETE FROM pokescan_collections WHERE id = ${id} AND user_id = ${user.id}`);
      const rows = await db.execute(
        sql4`SELECT * FROM pokescan_collections WHERE user_id = ${user.id} ORDER BY added_at DESC`
      );
      const items = rows.rows.map((r) => ({
        id: r.id,
        cardId: r.card_id,
        cardName: r.card_name,
        cardImage: r.card_image,
        setName: r.set_name,
        setId: r.set_id,
        rarity: r.rarity,
        quantity: r.quantity,
        condition: r.condition,
        variant: r.variant || "Non-Holo",
        priceGBP: r.price_gbp,
        gradingCompany: r.grading_company || null,
        grade: r.grade || null,
        isVerified: r.is_verified ?? false,
        verifiedAt: r.verified_at || null,
        addedAt: r.added_at
      }));
      res.json({ collection: items });
    } catch (error) {
      console.error("Collection delete error:", error);
      res.status(500).json({ error: error.message || "Failed to remove card" });
    }
  });
  app2.post("/api/collection/:id/verify", express.json({ limit: "25mb" }), async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }
      const { id } = req.params;
      const { frontImageBase64, backImageBase64 } = req.body;
      if (!frontImageBase64 || !backImageBase64) {
        res.status(400).json({ error: "Both frontImageBase64 and backImageBase64 are required" });
        return;
      }
      const row = await db.execute(
        sql4`SELECT card_name, set_name, card_id, card_image FROM pokescan_collections WHERE id = ${id} AND user_id = ${user.id}`
      );
      if (!row.rows.length) {
        res.status(404).json({ error: "Collection item not found" });
        return;
      }
      const card2 = row.rows[0];
      const cardNumber = card2.card_id?.split("-").pop() || "";
      const prompt = `You are a Pok\xE9mon TCG card verification expert. A user claims this physical card is:
Card Name: ${card2.card_name}
Set Name: ${card2.set_name}
Card Number: ${cardNumber}

You have been given TWO photos: the first is the FRONT of the physical card, the second is the BACK.

Examine both images carefully and determine whether the physical card shown matches the claimed card.
Check: the card name printed on the card, the artwork/illustration, set symbol, collector number, and overall appearance.
The card back should show the standard Pok\xE9mon TCG card back design (red/blue Pok\xE9 Ball pattern).

Return ONLY valid JSON with no markdown:
{"matches": true, "confidence": "high", "reason": "The card name, artwork and set symbol all match exactly."}

confidence must be "high", "medium", or "low".
matches must be true or false.`;
      const aiRes = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: frontImageBase64, detail: "high" } },
            { type: "image_url", image_url: { url: backImageBase64, detail: "low" } }
          ]
        }]
      });
      const raw = aiRes.choices[0]?.message?.content?.trim() || "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("AI returned invalid response");
      const parsed = JSON.parse(jsonMatch[0]);
      const verified = !!(parsed.matches && parsed.confidence !== "low");
      let verifiedPercent = 0;
      let badgeEarned = false;
      if (verified) {
        await db.execute(
          sql4`UPDATE pokescan_collections SET is_verified = true, verified_at = NOW() WHERE id = ${id} AND user_id = ${user.id}`
        );
        const countRow = await db.execute(
          sql4`SELECT COUNT(*) FILTER (WHERE is_verified = true) AS verified_count, COUNT(*) AS total_count FROM pokescan_collections WHERE user_id = ${user.id}`
        );
        const counts = countRow.rows[0];
        const total = parseInt(counts.total_count) || 0;
        const verifiedCount = parseInt(counts.verified_count) || 0;
        verifiedPercent = total > 0 ? Math.round(verifiedCount / total * 100) : 0;
        if (total > 0 && verifiedCount / total >= 0.9) {
          const alreadyBadged = await db.execute(sql4`SELECT is_verified_collector FROM pokescan_users WHERE id = ${user.id}`);
          if (!alreadyBadged.rows[0]?.is_verified_collector) {
            await db.execute(sql4`UPDATE pokescan_users SET is_verified_collector = true WHERE id = ${user.id}`);
            badgeEarned = true;
          }
        }
      }
      res.json({
        verified,
        confidence: parsed.confidence || "low",
        reason: parsed.reason || "Unable to determine.",
        verifiedPercent,
        badgeEarned
      });
    } catch (err) {
      console.error("Card verify error:", err);
      res.status(500).json({ error: "Verification failed" });
    }
  });
  app2.get("/api/collections/top-verified", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const me = await storage.validateSession(token);
      if (!me) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }
      const result = await db.execute(
        sql4`SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_verified_collector,
                   COUNT(c.id) FILTER (WHERE c.is_verified = true)::int AS verified_count,
                   COUNT(c.id)::int AS total_count,
                   COALESCE(SUM(c.price_gbp * c.quantity) FILTER (WHERE c.is_verified = true), 0) AS verified_value
            FROM pokescan_users u
            JOIN pokescan_collections c ON c.user_id = u.id
            WHERE u.collection_visible = true
            GROUP BY u.id, u.username, u.display_name, u.avatar_url, u.is_verified_collector
            HAVING COUNT(c.id) FILTER (WHERE c.is_verified = true) > 0
            ORDER BY verified_value DESC
            LIMIT 10`
      );
      const top = result.rows.map((r) => ({
        id: r.id,
        username: r.username,
        displayName: r.display_name,
        avatarUrl: r.avatar_url || null,
        isVerifiedCollector: r.is_verified_collector ?? false,
        verifiedCount: r.verified_count,
        totalCount: r.total_count,
        verifiedValue: parseFloat(r.verified_value) || 0,
        verifiedPercent: r.total_count > 0 ? Math.round(r.verified_count / r.total_count * 100) : 0
      }));
      res.json({ top });
    } catch (err) {
      res.status(500).json({ error: err.message || "Failed to fetch top verified" });
    }
  });
  app2.patch("/api/user/collection-visible", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }
      const { visible } = req.body;
      const updated = await storage.updateUser(user.id, { collectionVisible: !!visible });
      res.json({ collectionVisible: updated?.collectionVisible ?? !!visible });
    } catch (error) {
      res.status(500).json({ error: error.message || "Failed to update visibility" });
    }
  });
  app2.patch("/api/collection/privacy", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }
      const { isPublic } = req.body;
      const updated = await storage.updateUser(user.id, { collectionVisible: !!isPublic });
      res.json({ isPublic: updated?.collectionVisible ?? !!isPublic });
    } catch (error) {
      res.status(500).json({ error: error.message || "Failed to update privacy" });
    }
  });
  app2.get("/api/collection/user/:userId", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const me = await storage.validateSession(token);
      if (!me) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }
      const { userId } = req.params;
      const target = await storage.getUserById(userId);
      if (!target) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      if (!target.collectionVisible) {
        res.status(403).json({ error: "This collection is private" });
        return;
      }
      const friendship = await db.execute(
        sql4`SELECT id FROM pokescan_friendships WHERE status = 'accepted' AND (
          (requester_id = ${me.id} AND addressee_id = ${userId}) OR
          (requester_id = ${userId} AND addressee_id = ${me.id})
        )`
      );
      if (friendship.rows.length === 0 && me.id !== userId) {
        res.status(403).json({ error: "You are not friends with this user" });
        return;
      }
      const rows = await db.execute(
        sql4`SELECT * FROM pokescan_collections WHERE user_id = ${userId} ORDER BY added_at DESC`
      );
      const items = rows.rows.map((r) => ({
        id: r.id,
        cardId: r.card_id,
        cardName: r.card_name,
        cardImage: r.card_image,
        setName: r.set_name,
        setId: r.set_id,
        rarity: r.rarity,
        quantity: r.quantity,
        condition: r.condition,
        variant: r.variant || "Non-Holo",
        priceGBP: r.price_gbp,
        gradingCompany: r.grading_company || null,
        grade: r.grade || null,
        isVerified: r.is_verified ?? false,
        verifiedAt: r.verified_at || null,
        addedAt: r.added_at
      }));
      res.json({ collection: items, owner: { id: target.id, displayName: target.displayName, username: target.username, avatarUrl: target.avatarUrl, isVerifiedCollector: target.isVerifiedCollector ?? false } });
    } catch (error) {
      res.status(500).json({ error: error.message || "Failed to fetch collection" });
    }
  });
  app2.get("/api/collections/public", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const me = await storage.validateSession(token);
      if (!me) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }
      const search = (req.query.search || "").trim();
      const page = parseInt(req.query.page || "1", 10);
      const pageSize = 20;
      const offset = (page - 1) * pageSize;
      const searchClause = search ? sql4`AND (u.username ILIKE ${"%" + search + "%"} OR u.display_name ILIKE ${"%" + search + "%"})` : sql4``;
      const result = await db.execute(
        sql4`SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_verified_collector,
                   COUNT(c.id)::int AS card_count,
                   COALESCE(SUM(c.quantity), 0)::int AS total_quantity,
                   COALESCE(SUM(c.price_gbp * c.quantity), 0) AS total_value
            FROM pokescan_users u
            LEFT JOIN pokescan_collections c ON c.user_id = u.id
            WHERE u.collection_visible = true ${searchClause}
            GROUP BY u.id, u.username, u.display_name, u.avatar_url, u.is_verified_collector
            ORDER BY total_value DESC
            LIMIT ${pageSize} OFFSET ${offset}`
      );
      const collectors = result.rows.map((r) => ({
        id: r.id,
        username: r.username,
        displayName: r.display_name,
        avatarUrl: r.avatar_url || null,
        isVerifiedCollector: r.is_verified_collector ?? false,
        cardCount: r.card_count,
        totalQuantity: r.total_quantity,
        totalValue: parseFloat(r.total_value) || 0
      }));
      res.json({ collectors, page, hasMore: collectors.length === pageSize });
    } catch (error) {
      res.status(500).json({ error: error.message || "Failed to fetch public collections" });
    }
  });
  app2.get("/api/collections/public/:userId", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const me = await storage.validateSession(token);
      if (!me) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }
      const { userId } = req.params;
      const target = await storage.getUserById(userId);
      if (!target) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      if (!target.collectionVisible) {
        res.status(403).json({ error: "This collection is private" });
        return;
      }
      const rows = await db.execute(
        sql4`SELECT * FROM pokescan_collections WHERE user_id = ${userId} ORDER BY added_at DESC`
      );
      const items = rows.rows.map((r) => ({
        id: r.id,
        cardId: r.card_id,
        cardName: r.card_name,
        cardImage: r.card_image,
        setName: r.set_name,
        setId: r.set_id,
        rarity: r.rarity,
        quantity: r.quantity,
        condition: r.condition,
        variant: r.variant || "Non-Holo",
        priceGBP: r.price_gbp,
        gradingCompany: r.grading_company || null,
        grade: r.grade || null,
        isVerified: r.is_verified ?? false,
        verifiedAt: r.verified_at || null,
        addedAt: r.added_at
      }));
      res.json({
        collection: items,
        owner: {
          id: target.id,
          displayName: target.displayName,
          username: target.username,
          avatarUrl: target.avatarUrl,
          isVerifiedCollector: target.isVerifiedCollector ?? false
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message || "Failed to fetch collection" });
    }
  });
  app2.post("/api/collector-verification", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }
      const { cardId, cardName, cardImage, frontPhoto, backPhoto } = req.body;
      if (!cardId || !cardName || !frontPhoto || !backPhoto) {
        res.status(400).json({ error: "cardId, cardName, frontPhoto and backPhoto are required" });
        return;
      }
      const cardOwnership = await db.execute(
        sql4`SELECT id, grading_company, grade FROM pokescan_collections
            WHERE user_id = ${user.id} AND card_id = ${cardId}
              AND grading_company IS NOT NULL AND grade IS NOT NULL
            LIMIT 1`
      );
      if (cardOwnership.rows.length === 0) {
        res.status(403).json({ error: "The selected card must be a professionally graded entry in your collection (add it with a grading company and grade first)" });
        return;
      }
      const existing = await db.execute(
        sql4`SELECT id FROM pokescan_collector_verifications WHERE user_id = ${user.id} AND status = 'pending'`
      );
      if (existing.rows.length > 0) {
        res.status(409).json({ error: "You already have a pending verification application" });
        return;
      }
      const userRow = await db.execute(sql4`SELECT is_verified_collector FROM pokescan_users WHERE id = ${user.id}`);
      if (userRow.rows[0]?.is_verified_collector) {
        res.status(409).json({ error: "You are already a Verified Collector" });
        return;
      }
      await db.execute(
        sql4`INSERT INTO pokescan_collector_verifications (user_id, card_id, card_name, card_image, front_photo, back_photo)
            VALUES (${user.id}, ${cardId}, ${cardName}, ${cardImage || ""}, ${frontPhoto}, ${backPhoto})`
      );
      res.json({ success: true, message: "Application submitted" });
    } catch (error) {
      res.status(500).json({ error: error.message || "Failed to submit verification" });
    }
  });
  app2.get("/api/collector-verification/status", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const user = await storage.validateSession(token);
      if (!user) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }
      const row = await db.execute(
        sql4`SELECT id, status, created_at FROM pokescan_collector_verifications WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 1`
      );
      const app3 = row.rows[0];
      res.json({
        isVerifiedCollector: user.isVerifiedCollector ?? false,
        application: app3 ? { id: app3.id, status: app3.status, createdAt: app3.created_at } : null
      });
    } catch (error) {
      res.status(500).json({ error: error.message || "Failed to get verification status" });
    }
  });
  app2.get("/api/admin/collector-verifications", async (req, res) => {
    try {
      const adminToken = req.headers.authorization?.replace("Bearer ", "");
      const admin = adminToken ? await storage.validateSession(adminToken) : null;
      if (!admin || admin.role !== "admin" && admin.role !== "moderator") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const status = req.query.status || "pending";
      const result = await db.execute(
        sql4`SELECT v.*, u.username, u.display_name, u.avatar_url
            FROM pokescan_collector_verifications v
            JOIN pokescan_users u ON u.id = v.user_id
            WHERE v.status = ${status}
            ORDER BY v.created_at DESC`
      );
      const verifications = result.rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        username: r.username,
        displayName: r.display_name,
        avatarUrl: r.avatar_url || null,
        cardId: r.card_id,
        cardName: r.card_name,
        cardImage: r.card_image,
        frontPhoto: r.front_photo,
        backPhoto: r.back_photo,
        status: r.status,
        reviewedBy: r.reviewed_by || null,
        reviewedAt: r.reviewed_at || null,
        createdAt: r.created_at
      }));
      res.json({ verifications });
    } catch (error) {
      res.status(500).json({ error: error.message || "Failed to fetch verifications" });
    }
  });
  app2.post("/api/admin/collector-verifications/:id/approve", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      const reviewer = token ? await storage.validateSession(token) : null;
      if (!reviewer || reviewer.role !== "admin" && reviewer.role !== "moderator") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const { id } = req.params;
      const ver = await db.execute(sql4`SELECT * FROM pokescan_collector_verifications WHERE id = ${id}`);
      if (!ver.rows.length) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const v = ver.rows[0];
      await db.execute(
        sql4`UPDATE pokescan_collector_verifications SET status = 'approved', reviewed_by = ${reviewer?.id || null}, reviewed_at = NOW() WHERE id = ${id}`
      );
      await db.execute(
        sql4`UPDATE pokescan_users SET is_verified_collector = true WHERE id = ${v.user_id}`
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message || "Failed to approve" });
    }
  });
  app2.post("/api/admin/collector-verifications/:id/reject", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      const reviewer = token ? await storage.validateSession(token) : null;
      if (!reviewer || reviewer.role !== "admin" && reviewer.role !== "moderator") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const { id } = req.params;
      await db.execute(
        sql4`UPDATE pokescan_collector_verifications SET status = 'rejected', reviewed_by = ${reviewer?.id || null}, reviewed_at = NOW() WHERE id = ${id}`
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message || "Failed to reject" });
    }
  });
  app2.get("/api/admin/subscription-stats", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const caller = await storage.validateSession(token);
      if (!caller) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }
      if (caller.role !== "admin") {
        res.status(403).json({ error: "Admin required" });
        return;
      }
      const MONTHLY_PRICE = 4.99;
      const ANNUAL_PRICE = 49.99;
      const MONTHLY_ID = "price_1TM7D8K7N6BNdayAPnuINUuU";
      const ANNUAL_ID = "price_1TM7D8K7N6BNdayAB1PFakyH";
      const result = await db.execute(
        sql4`SELECT id, username, display_name, stripe_price_id, subscription_status, subscription_period_end, created_at
            FROM pokescan_users
            WHERE is_premium = true AND subscription_status IS NOT NULL
            ORDER BY subscription_period_end DESC NULLS LAST`
      );
      const subscribers = result.rows.map((r) => {
        const plan = r.stripe_price_id === MONTHLY_ID ? "monthly" : r.stripe_price_id === ANNUAL_ID ? "annual" : "unknown";
        return {
          id: r.id,
          username: r.username,
          displayName: r.display_name,
          plan,
          price: plan === "monthly" ? MONTHLY_PRICE : plan === "annual" ? ANNUAL_PRICE : 0,
          status: r.subscription_status,
          periodEnd: r.subscription_period_end,
          createdAt: r.created_at
        };
      });
      const now = /* @__PURE__ */ new Date();
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(dayStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const yearStart = new Date(now.getFullYear(), 0, 1);
      let dailyRevenue = 0, weeklyRevenue = 0, monthlyRevenue = 0, yearlyRevenue = 0;
      let totalActive = 0, monthlyCount = 0, annualCount = 0;
      for (const s of subscribers) {
        if (s.status === "active" || s.status === "canceling") {
          totalActive++;
          if (s.plan === "monthly") monthlyCount++;
          else annualCount++;
        }
        if (s.periodEnd) {
          const pEnd = new Date(s.periodEnd);
          const periodStart = s.plan === "monthly" ? new Date(pEnd.getTime() - 30 * 24 * 60 * 60 * 1e3) : new Date(pEnd.getTime() - 365 * 24 * 60 * 60 * 1e3);
          if (periodStart >= dayStart) dailyRevenue += s.price;
          if (periodStart >= weekStart) weeklyRevenue += s.price;
          if (periodStart >= monthStart) monthlyRevenue += s.price;
          if (periodStart >= yearStart) yearlyRevenue += s.price;
        }
      }
      const monthlyRecurring = monthlyCount * MONTHLY_PRICE + annualCount * (ANNUAL_PRICE / 12);
      res.json({
        subscribers,
        stats: {
          totalActive,
          monthlyCount,
          annualCount,
          dailyRevenue,
          weeklyRevenue,
          monthlyRevenue,
          yearlyRevenue,
          monthlyRecurring: Math.round(monthlyRecurring * 100) / 100
        }
      });
    } catch (error) {
      console.error("Subscription stats error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch stats" });
    }
  });
  app2.get("/api/auth/users", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const session = await storage.validateSession(token);
      if (!session) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      const caller = await storage.getUserById(session.userId);
      if (!caller || caller.role !== "admin" && caller.role !== "moderator") {
        res.status(403).json({ error: "Insufficient permissions" });
        return;
      }
      const users2 = await storage.getAllUsers();
      res.json({ users: users2 });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: error.message || "Failed to get users" });
    }
  });
  app2.put("/api/auth/users/:userId", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }
      const session = await storage.validateSession(token);
      if (!session) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      const caller = await storage.getUserById(session.userId);
      if (!caller || caller.role !== "admin") {
        res.status(403).json({ error: "Admin access required" });
        return;
      }
      const { userId } = req.params;
      const { isPremium, role } = req.body;
      const updated = await storage.updateUser(userId, { isPremium, role });
      if (!updated) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json({ user: updated });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ error: error.message || "Update failed" });
    }
  });
  app2.patch("/api/admin/edit-user", async (req, res) => {
    try {
      const { superadminPassword, userId, displayName, email, mobileNumber, password, isPremium, role } = req.body;
      if (!await isSuperadminAuthorized(req)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (!userId) {
        res.status(400).json({ error: "userId required" });
        return;
      }
      const callerToken = req.headers.authorization?.replace("Bearer ", "");
      const caller = callerToken ? await storage.validateSession(callerToken) : null;
      const callerId = caller?.id || "system";
      const before = await storage.getUserById(userId);
      if (!before) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      const profileUpdates = {};
      if (displayName !== void 0 && displayName.trim()) profileUpdates.displayName = displayName.trim();
      if (email !== void 0 && email.trim()) profileUpdates.email = email.trim().toLowerCase();
      if (mobileNumber !== void 0) profileUpdates.mobileNumber = mobileNumber.trim();
      if (isPremium !== void 0) profileUpdates.isPremium = isPremium;
      if (role !== void 0) profileUpdates.role = role;
      if (Object.keys(profileUpdates).length === 0 && !password) {
        res.status(400).json({ error: "No fields to update" });
        return;
      }
      if (isPremium === false && before.isPremium) {
        await cancelStripeForUser(userId, true);
      }
      let updated = Object.keys(profileUpdates).length > 0 ? await storage.updateUser(userId, profileUpdates) : await storage.getUserById(userId);
      if (!updated) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      if (password !== void 0 && password.trim().length >= 6) {
        const passwordHash = await bcrypt.hash(password.trim(), 10);
        await storage.setPassword(userId, passwordHash);
      }
      const changes = [];
      if (displayName !== void 0 && displayName !== before.displayName) changes.push(`name: "${before.displayName}" \u2192 "${displayName}"`);
      if (email !== void 0 && email.toLowerCase() !== before.email) changes.push(`email: "${before.email}" \u2192 "${email.toLowerCase()}"`);
      if (mobileNumber !== void 0 && mobileNumber !== before.mobileNumber) changes.push(`mobile changed`);
      if (password) changes.push("password reset");
      if (isPremium !== void 0 && isPremium !== before.isPremium) {
        await logModAction({
          action: isPremium ? "premium_granted" : "premium_revoked",
          performedBy: callerId,
          targetUserId: userId,
          targetUsername: before.username,
          note: isPremium ? "Premium granted by admin" : "Premium revoked by admin (Stripe cancelled)"
        });
      }
      if (role !== void 0 && role !== before.role) {
        await logModAction({
          action: "role_changed",
          performedBy: callerId,
          targetUserId: userId,
          targetUsername: before.username,
          note: `${before.role} \u2192 ${role}`
        });
      }
      if (changes.length > 0) {
        await logModAction({
          action: "user_edited",
          performedBy: callerId,
          targetUserId: userId,
          targetUsername: before.username,
          note: changes.join("; ")
        });
      }
      const { passwordHash: _ph, ...safeUser } = updated;
      res.json({ user: safeUser });
    } catch (error) {
      console.error("Admin edit-user error:", error);
      res.status(500).json({ error: error.message || "Update failed" });
    }
  });
  app2.post("/api/admin/request-otp", (_req, res) => {
    res.status(410).json({ error: "Admin code login has been removed. Please update the app and use the email + password login." });
  });
  app2.post("/api/admin/verify-otp", (_req, res) => {
    res.status(410).json({ error: "Admin code login has been removed. Please update the app and use the email + password login." });
  });
  app2.get("/api/admin/validate-token", async (req, res) => {
    res.json({ valid: await isSuperadminAuthorized(req) });
  });
  app2.post("/api/admin/superadmin-login", (_req, res) => {
    res.status(410).json({
      error: "This sign-in method has been disabled. Please update the app and use the email code login."
    });
  });
  app2.post("/api/admin/create-user", async (req, res) => {
    try {
      const { superadminPassword, username, displayName, email, mobileNumber, password, isPremium, role } = req.body;
      if (!await isSuperadminAuthorized(req)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (!username || !displayName || !email || !password) {
        res.status(400).json({ error: "Username, display name, email and password are required" });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters" });
        return;
      }
      const existing = await storage.getUserByEmail(email.toLowerCase().trim());
      if (existing) {
        res.status(409).json({ error: "An account with this email already exists" });
        return;
      }
      const existingUser = await storage.getUserByUsername(username.toLowerCase().trim());
      if (existingUser) {
        res.status(409).json({ error: "Username is already taken" });
        return;
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username: username.toLowerCase().trim(),
        displayName: displayName.trim(),
        email: email.toLowerCase().trim(),
        mobileNumber: mobileNumber?.trim() || "",
        passwordHash,
        authProvider: "local",
        isPremium: isPremium === true,
        role: role || "user",
        avatarUrl: null
      });
      const { passwordHash: _ph, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (error) {
      console.error("Admin create-user error:", error);
      res.status(500).json({ error: error.message || "Create user failed" });
    }
  });
  app2.get("/api/admin/users", async (req, res) => {
    try {
      const pwd = req.query.superadminPassword;
      if (!await isSuperadminAuthorized(req)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const users2 = await storage.getAllUsers();
      res.json({ users: users2 });
    } catch (error) {
      console.error("Admin get-users error:", error);
      res.status(500).json({ error: error.message || "Failed to get users" });
    }
  });
  app2.delete("/api/admin/delete-user", async (req, res) => {
    try {
      const { superadminPassword, userId } = req.body;
      if (!await isSuperadminAuthorized(req)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (!userId) {
        res.status(400).json({ error: "userId required" });
        return;
      }
      const callerToken = req.headers.authorization?.replace("Bearer ", "");
      const caller = callerToken ? await storage.validateSession(callerToken) : null;
      const callerId = caller?.id || "system";
      const before = await storage.getUserById(userId);
      if (!before) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      await cancelStripeForUser(userId, true);
      await addBlockedCredential(before.email || null, before.mobileNumber || null, "deleted", callerId);
      await db.delete(pokescanSessions).where(eq3(pokescanSessions.userId, userId));
      const deleted = await db.delete(pokescanUsers).where(eq3(pokescanUsers.id, userId)).returning();
      if (!deleted.length) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      await logModAction({
        action: "user_deleted",
        performedBy: callerId,
        targetUserId: userId,
        targetUsername: before.username,
        note: `Deleted @${before.username} (${before.email}); Stripe sub cancelled; email+mobile added to trial blocklist`
      });
      res.json({ success: true, userId });
    } catch (error) {
      console.error("Admin delete-user error:", error);
      res.status(500).json({ error: error.message || "Delete failed" });
    }
  });
  app2.post("/api/admin/users/:id/ban", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const caller = await storage.validateSession(token);
      if (!caller) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }
      if (caller.role !== "admin" && caller.role !== "moderator") {
        res.status(403).json({ error: "Staff only" });
        return;
      }
      const { id } = req.params;
      const { reason, durationHours, banChat } = req.body || {};
      const target = await storage.getUserById(id);
      if (!target) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      if (target.role === "admin" || target.role === "moderator") {
        res.status(403).json({ error: "Cannot ban staff members" });
        return;
      }
      const permanent = durationHours == null || durationHours <= 0;
      const bannedUntil = permanent ? /* @__PURE__ */ new Date("9999-12-31T23:59:59Z") : new Date(Date.now() + Number(durationHours) * 3600 * 1e3);
      const banReason = reason && String(reason).trim() || "Violation of community guidelines";
      await pool3.query(
        `UPDATE pokescan_users SET banned_until = $1, ban_reason = $2, banned_at = NOW(), banned_by = $3 ${banChat ? `, chat_banned_until = $1` : ""} WHERE id = $4`,
        [bannedUntil, banReason, caller.id, id]
      );
      if (target.isPremium) await cancelStripeForUser(id, true);
      await db.delete(pokescanSessions).where(eq3(pokescanSessions.userId, id));
      await logModAction({
        action: "user_banned",
        performedBy: caller.id,
        targetUserId: id,
        targetUsername: target.username,
        note: `${permanent ? "Permanent" : `${durationHours}h`} ban \u2014 Reason: ${banReason}${target.isPremium ? "; Stripe sub cancelled" : ""}`
      });
      res.json({ success: true, bannedUntil: bannedUntil.toISOString(), permanent, banReason });
    } catch (error) {
      console.error("Ban error:", error);
      res.status(500).json({ error: error.message || "Ban failed" });
    }
  });
  app2.post("/api/admin/users/:id/unban", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const caller = await storage.validateSession(token);
      if (!caller) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }
      if (caller.role !== "admin" && caller.role !== "moderator") {
        res.status(403).json({ error: "Staff only" });
        return;
      }
      const { id } = req.params;
      const target = await storage.getUserById(id);
      if (!target) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      await pool3.query(
        `UPDATE pokescan_users SET banned_until = NULL, ban_reason = NULL, banned_at = NULL, banned_by = NULL, chat_banned_until = NULL WHERE id = $1`,
        [id]
      );
      await logModAction({
        action: "user_unbanned",
        performedBy: caller.id,
        targetUserId: id,
        targetUsername: target.username
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Unban error:", error);
      res.status(500).json({ error: error.message || "Unban failed" });
    }
  });
  app2.post("/api/admin/users/:id/mute", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const caller = await storage.validateSession(token);
      if (!caller) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }
      if (caller.role !== "admin" && caller.role !== "moderator") {
        res.status(403).json({ error: "Staff only" });
        return;
      }
      const { id } = req.params;
      const { minutes } = req.body || {};
      const target = await storage.getUserById(id);
      if (!target) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      if (target.role === "admin" || target.role === "moderator") {
        res.status(403).json({ error: "Cannot mute staff" });
        return;
      }
      const mins = Number(minutes);
      if (!mins || mins < 1) {
        res.status(400).json({ error: "minutes (positive) required" });
        return;
      }
      const mutedUntil = new Date(Date.now() + mins * 60 * 1e3);
      await pool3.query(`UPDATE pokescan_users SET chat_muted_until = $1 WHERE id = $2`, [mutedUntil, id]);
      await logModAction({
        action: "user_muted",
        performedBy: caller.id,
        targetUserId: id,
        targetUsername: target.username,
        note: `Muted for ${mins} minutes (until ${mutedUntil.toISOString()})`
      });
      res.json({ success: true, mutedUntil: mutedUntil.toISOString() });
    } catch (error) {
      console.error("Mute error:", error);
      res.status(500).json({ error: error.message || "Mute failed" });
    }
  });
  app2.post("/api/admin/users/:id/unmute", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const caller = await storage.validateSession(token);
      if (!caller) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }
      if (caller.role !== "admin" && caller.role !== "moderator") {
        res.status(403).json({ error: "Staff only" });
        return;
      }
      const { id } = req.params;
      const target = await storage.getUserById(id);
      if (!target) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      await pool3.query(`UPDATE pokescan_users SET chat_muted_until = NULL WHERE id = $1`, [id]);
      await logModAction({
        action: "user_unmuted",
        performedBy: caller.id,
        targetUserId: id,
        targetUsername: target.username
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Unmute error:", error);
      res.status(500).json({ error: error.message || "Unmute failed" });
    }
  });
  app2.post("/api/admin/listings/bulk", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const caller = await storage.validateSession(token);
      if (!caller) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }
      if (caller.role !== "admin" && caller.role !== "moderator") {
        res.status(403).json({ error: "Staff only" });
        return;
      }
      const { ids, action, reviewNote } = req.body || {};
      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ error: "ids array required" });
        return;
      }
      if (action !== "approve" && action !== "reject" && action !== "delete") {
        res.status(400).json({ error: "action must be approve|reject|delete" });
        return;
      }
      let updated = 0;
      if (action === "delete") {
        const r = await pool3.query(
          `DELETE FROM pokescan_market_listings WHERE id = ANY($1::text[]) RETURNING id, card_name`,
          [ids]
        );
        updated = r.rowCount || 0;
        for (const row of r.rows) {
          await logModAction({
            action: "listing_deleted_bulk",
            performedBy: caller.id,
            listingId: row.id,
            listingName: row.card_name,
            note: reviewNote || null
          });
        }
      } else {
        const status = action === "approve" ? "approved" : "rejected";
        const r = await pool3.query(
          `UPDATE pokescan_market_listings
              SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_note = COALESCE($3, review_note)
            WHERE id = ANY($4::text[])
          RETURNING id, card_name`,
          [status, caller.id, reviewNote ?? null, ids]
        );
        updated = r.rowCount || 0;
        for (const row of r.rows) {
          await logModAction({
            action: `bulk_${status}`,
            performedBy: caller.id,
            listingId: row.id,
            listingName: row.card_name,
            note: reviewNote || null
          });
        }
      }
      res.json({ success: true, updated, requested: ids.length });
    } catch (error) {
      console.error("Bulk listings error:", error);
      res.status(500).json({ error: error.message || "Bulk action failed" });
    }
  });
  app2.get("/api/admin/chatroom", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const caller = await storage.validateSession(token);
      if (!caller) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }
      if (caller.role !== "admin" && caller.role !== "moderator") {
        res.status(403).json({ error: "Staff only" });
        return;
      }
      const limit = Math.min(500, Math.max(1, parseInt(req.query.limit || "200", 10)));
      const msgs = await db.select().from(pokescanChatroomMessages).orderBy(desc(pokescanChatroomMessages.createdAt)).limit(limit);
      res.json({ messages: msgs.reverse() });
    } catch (error) {
      console.error("Admin chatroom view error:", error);
      res.status(500).json({ error: error.message || "Failed to load chatroom" });
    }
  });
  app2.get("/api/admin/messages", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const caller = await storage.validateSession(token);
      if (!caller) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }
      if (caller.role !== "admin" && caller.role !== "moderator") {
        res.status(403).json({ error: "Staff only" });
        return;
      }
      const userA = (req.query.userA || "").trim();
      const userB = (req.query.userB || "").trim();
      if (!userA) {
        const r = await pool3.query(
          `SELECT m.*, su.username AS sender_username, su.display_name AS sender_display_name,
                  ru.username AS recipient_username, ru.display_name AS recipient_display_name
             FROM pokescan_messages m
             LEFT JOIN pokescan_users su ON su.id = m.sender_id
             LEFT JOIN pokescan_users ru ON ru.id = m.recipient_id
            ORDER BY m.created_at DESC
            LIMIT 200`
        );
        res.json({ messages: r.rows });
        return;
      }
      let q;
      if (userB) {
        q = await pool3.query(
          `SELECT m.*, su.username AS sender_username, su.display_name AS sender_display_name,
                  ru.username AS recipient_username, ru.display_name AS recipient_display_name
             FROM pokescan_messages m
             LEFT JOIN pokescan_users su ON su.id = m.sender_id
             LEFT JOIN pokescan_users ru ON ru.id = m.recipient_id
            WHERE (m.sender_id = $1 AND m.recipient_id = $2)
               OR (m.sender_id = $2 AND m.recipient_id = $1)
            ORDER BY m.created_at ASC
            LIMIT 500`,
          [userA, userB]
        );
      } else {
        q = await pool3.query(
          `SELECT m.*, su.username AS sender_username, su.display_name AS sender_display_name,
                  ru.username AS recipient_username, ru.display_name AS recipient_display_name
             FROM pokescan_messages m
             LEFT JOIN pokescan_users su ON su.id = m.sender_id
             LEFT JOIN pokescan_users ru ON ru.id = m.recipient_id
            WHERE m.sender_id = $1 OR m.recipient_id = $1
            ORDER BY m.created_at DESC
            LIMIT 500`,
          [userA]
        );
      }
      res.json({ messages: q.rows });
    } catch (error) {
      console.error("Admin messages view error:", error);
      res.status(500).json({ error: error.message || "Failed to load messages" });
    }
  });
  app2.get("/api/admin/blocked-credentials", async (req, res) => {
    try {
      if (!await isSuperadminAuthorized(req)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const r = await pool3.query(
        `SELECT * FROM pokescan_blocked_credentials ORDER BY created_at DESC LIMIT 500`
      );
      res.json({ blocked: r.rows });
    } catch (error) {
      console.error("Blocked creds list error:", error);
      res.status(500).json({ error: error.message || "Failed to load" });
    }
  });
  app2.delete("/api/admin/blocked-credentials/:id", async (req, res) => {
    try {
      if (!await isSuperadminAuthorized(req)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      await pool3.query(`DELETE FROM pokescan_blocked_credentials WHERE id = $1`, [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      console.error("Blocked creds delete error:", error);
      res.status(500).json({ error: error.message || "Failed to remove" });
    }
  });
  app2.post("/api/admin/scrydex-sync", async (req, res) => {
    try {
      const { superadminPassword } = req.body;
      if (!await isSuperadminAuthorized(req)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      const send = (data) => {
        res.write(`data: ${JSON.stringify(data)}

`);
      };
      const { runScrydexSync: runScrydexSync2 } = await Promise.resolve().then(() => (init_scrydex_scraper(), scrydex_scraper_exports));
      const result = await runScrydexSync2((progress) => {
        send(progress);
      });
      send({ ...result, done: true });
      res.end();
    } catch (error) {
      console.error("Scrydex sync error:", error);
      try {
        res.write(
          `data: ${JSON.stringify({ phase: "error", message: error.message || "Sync failed", done: true })}

`
        );
        res.end();
      } catch {
      }
    }
  });
  app2.post("/api/admin/sync-asian-sets", async (req, res) => {
    try {
      const { superadminPassword } = req.body;
      if (!await isSuperadminAuthorized(req)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      const send = (data) => res.write(`data: ${JSON.stringify(data)}

`);
      const { seedAsianSets: seedAsianSets2 } = await Promise.resolve().then(() => (init_asian_set_seed(), asian_set_seed_exports));
      const result = await seedAsianSets2((msg) => {
        send({ phase: "progress", message: msg });
      });
      send({ phase: "seeding-cards", message: "Seeding KO/ZH cards from JP sources\u2026" });
      const { seedKoZhCards: seedKoZhCards2 } = await Promise.resolve().then(() => (init_ko_zh_seed(), ko_zh_seed_exports));
      const koZhResult = await seedKoZhCards2((msg) => {
        send({ phase: "progress", message: msg });
      });
      send({ phase: "progress", message: `KO/ZH cards: ${koZhResult.inserted} inserted, ${koZhResult.skipped} skipped` });
      send({ phase: "done", ...result, koZhInserted: koZhResult.inserted, koZhSkipped: koZhResult.skipped, done: true });
      res.end();
    } catch (error) {
      console.error("Asian set sync error:", error);
      try {
        res.write(`data: ${JSON.stringify({ phase: "error", message: error.message || "Sync failed", done: true })}

`);
        res.end();
      } catch {
      }
    }
  });
  app2.get("/api/admin/sets", async (req, res) => {
    try {
      const pw = req.query.superadminPassword;
      if (!await isSuperadminAuthorized(req)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const allSets = await db.select({
        id: pokemonSets.id,
        name: pokemonSets.name,
        series: pokemonSets.series,
        hidden: pokemonSets.hidden,
        releaseDate: pokemonSets.releaseDate,
        cardCount: sql4`count(${pokemonCards.id})::int`
      }).from(pokemonSets).leftJoin(pokemonCards, and3(eq3(pokemonCards.setId, pokemonSets.id), isNull2(pokemonCards.deletedAt))).where(isNull2(pokemonSets.deletedAt)).groupBy(pokemonSets.id, pokemonSets.name, pokemonSets.series, pokemonSets.hidden, pokemonSets.releaseDate).orderBy(desc(pokemonSets.releaseDate));
      res.json({
        sets: allSets.map((s) => ({
          ...s,
          hidden: s.hidden ?? false,
          language: detectSetLanguage(s.id)
        }))
      });
    } catch (error) {
      res.status(500).json({ error: error.message || "Failed to list sets" });
    }
  });
  app2.patch("/api/admin/sets/visibility", async (req, res) => {
    try {
      const { superadminPassword, setIds, hidden } = req.body;
      if (!await isSuperadminAuthorized(req)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (!Array.isArray(setIds) || setIds.length === 0) {
        res.status(400).json({ error: "setIds is required" });
        return;
      }
      for (const id of setIds) {
        await db.update(pokemonSets).set({ hidden: !!hidden }).where(eq3(pokemonSets.id, id));
      }
      res.json({ updated: setIds.length, hidden: !!hidden });
    } catch (error) {
      res.status(500).json({ error: error.message || "Failed to update visibility" });
    }
  });
  app2.get("/api/admin/scrydex-preview", async (req, res) => {
    try {
      const pw = req.query.superadminPassword;
      if (!await isSuperadminAuthorized(req)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const { scrapeScrydexSets: scrapeScrydexSets2, scrapeScrydexTcgPocketSets: scrapeScrydexTcgPocketSets2, scrapeScrydexJpSets: scrapeScrydexJpSets2 } = await Promise.resolve().then(() => (init_scrydex_scraper(), scrydex_scraper_exports));
      const [enSets, pocketSets, jpSets] = await Promise.all([
        scrapeScrydexSets2(),
        scrapeScrydexTcgPocketSets2(),
        scrapeScrydexJpSets2()
      ]);
      const allSetsMap = /* @__PURE__ */ new Map();
      for (const s of [...enSets, ...pocketSets, ...jpSets]) {
        if (!allSetsMap.has(s.id)) allSetsMap.set(s.id, s);
      }
      const allSets = [...allSetsMap.values()];
      const existingRows = await db.select({ id: pokemonSets.id, card_count: sql4`COUNT(${pokemonCards.id})` }).from(pokemonSets).leftJoin(pokemonCards, eq3(pokemonCards.setId, pokemonSets.id)).groupBy(pokemonSets.id);
      const existingIds = new Set(existingRows.map((r) => r.id));
      const setsWithCards = new Set(
        existingRows.filter((r) => parseInt(r.card_count, 10) > 0).map((r) => r.id)
      );
      const missingSets = allSets.filter((s) => !existingIds.has(s.id));
      const emptySets = allSets.filter((s) => existingIds.has(s.id) && !setsWithCards.has(s.id));
      const setsToProcess = allSets.filter((s) => !existingIds.has(s.id) || !setsWithCards.has(s.id));
      res.json({
        scrydexSetCount: allSets.length,
        dbSetCount: existingIds.size,
        newSetsFound: missingSets.length,
        emptySetsFound: emptySets.length,
        setsToProcess: setsToProcess.length,
        newSets: missingSets.map((s) => ({ id: s.id, name: s.name, series: s.series })),
        emptySets: emptySets.map((s) => ({ id: s.id, name: s.name, series: s.series }))
      });
    } catch (error) {
      res.status(500).json({ error: error.message || "Preview failed" });
    }
  });
  app2.post("/api/admin/import-users", async (req, res) => {
    try {
      const { superadminPassword, users: users2 } = req.body;
      if (!await isSuperadminAuthorized(req)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (!Array.isArray(users2) || users2.length === 0) {
        res.status(400).json({ error: "users array required" });
        return;
      }
      const results = [];
      for (const u of users2) {
        try {
          const result = await storage.importUser({
            id: u.id,
            username: u.username,
            displayName: u.displayName,
            email: u.email,
            mobileNumber: u.mobileNumber || "",
            passwordHash: u.passwordHash || null,
            authProvider: u.authProvider || "local",
            isPremium: u.isPremium || false,
            role: u.role || "user",
            avatarUrl: u.avatarUrl || null
          });
          results.push({ username: u.username, status: result.status });
        } catch (err) {
          results.push({ username: u.username, status: "error", reason: err.message });
        }
      }
      res.json({ results });
    } catch (error) {
      console.error("Admin import-users error:", error);
      res.status(500).json({ error: error.message || "Import failed" });
    }
  });
  async function getUserFromToken(req) {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return null;
    const user = await storage.validateSession(token);
    if (!user) return null;
    return { id: user.id, username: user.username, displayName: user.displayName };
  }
  app2.get("/api/social/friends", async (req, res) => {
    const me = await getUserFromToken(req);
    if (!me) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const rows = await db.select().from(pokescanFriendships).where(
      or2(eq3(pokescanFriendships.requesterId, me.id), eq3(pokescanFriendships.addresseeId, me.id))
    );
    const friendIds = /* @__PURE__ */ new Set();
    for (const r of rows) {
      if (r.status === "accepted") {
        friendIds.add(r.requesterId === me.id ? r.addresseeId : r.requesterId);
      }
    }
    const friendFields = { id: pokescanUsers.id, username: pokescanUsers.username, displayName: pokescanUsers.displayName, avatarUrl: pokescanUsers.avatarUrl, isPremium: pokescanUsers.isPremium, collectionVisible: pokescanUsers.collectionVisible };
    const friends = friendIds.size > 0 ? await db.select(friendFields).from(pokescanUsers).where(or2(...[...friendIds].map((id) => eq3(pokescanUsers.id, id)))) : [];
    const pendingReceived = rows.filter((r) => r.addresseeId === me.id && r.status === "pending");
    const pendingSent = rows.filter((r) => r.requesterId === me.id && r.status === "pending");
    const pendingUsers = pendingReceived.length > 0 ? await db.select(friendFields).from(pokescanUsers).where(or2(...pendingReceived.map((r) => eq3(pokescanUsers.id, r.requesterId)))) : [];
    const sentUsers = pendingSent.length > 0 ? await db.select(friendFields).from(pokescanUsers).where(or2(...pendingSent.map((r) => eq3(pokescanUsers.id, r.addresseeId)))) : [];
    res.json({ friends, pendingReceived: pendingUsers, pendingSent: sentUsers });
  });
  app2.post("/api/social/friend-request", async (req, res) => {
    const me = await getUserFromToken(req);
    if (!me) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { targetUserId } = req.body;
    if (!targetUserId || targetUserId === me.id) {
      res.status(400).json({ error: "Invalid target" });
      return;
    }
    const existing = await db.select().from(pokescanFriendships).where(
      or2(
        and3(eq3(pokescanFriendships.requesterId, me.id), eq3(pokescanFriendships.addresseeId, targetUserId)),
        and3(eq3(pokescanFriendships.requesterId, targetUserId), eq3(pokescanFriendships.addresseeId, me.id))
      )
    );
    if (existing.length > 0) {
      res.status(400).json({ error: "Request already exists" });
      return;
    }
    const [row] = await db.insert(pokescanFriendships).values({ requesterId: me.id, addresseeId: targetUserId, status: "pending" }).returning();
    res.json({ friendship: row });
  });
  app2.post("/api/social/friend-respond", async (req, res) => {
    const me = await getUserFromToken(req);
    if (!me) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { requesterId, action } = req.body;
    if (!requesterId || !["accept", "decline"].includes(action)) {
      res.status(400).json({ error: "Bad request" });
      return;
    }
    const rows = await db.select().from(pokescanFriendships).where(
      and3(eq3(pokescanFriendships.requesterId, requesterId), eq3(pokescanFriendships.addresseeId, me.id), eq3(pokescanFriendships.status, "pending"))
    );
    if (!rows.length) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    if (action === "accept") {
      await db.update(pokescanFriendships).set({ status: "accepted" }).where(eq3(pokescanFriendships.id, rows[0].id));
      res.json({ status: "accepted" });
    } else {
      await db.delete(pokescanFriendships).where(eq3(pokescanFriendships.id, rows[0].id));
      res.json({ status: "declined" });
    }
  });
  app2.delete("/api/social/friend-remove", async (req, res) => {
    const me = await getUserFromToken(req);
    if (!me) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { friendId } = req.body;
    await db.delete(pokescanFriendships).where(
      or2(
        and3(eq3(pokescanFriendships.requesterId, me.id), eq3(pokescanFriendships.addresseeId, friendId)),
        and3(eq3(pokescanFriendships.requesterId, friendId), eq3(pokescanFriendships.addresseeId, me.id))
      )
    );
    res.json({ success: true });
  });
  app2.get("/api/social/user-search", async (req, res) => {
    const me = await getUserFromToken(req);
    if (!me) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const q = (req.query.q || "").trim();
    if (q.length < 2) {
      res.json({ users: [] });
      return;
    }
    const users2 = await db.select({ id: pokescanUsers.id, username: pokescanUsers.username, displayName: pokescanUsers.displayName, avatarUrl: pokescanUsers.avatarUrl }).from(pokescanUsers).where(and3(ne(pokescanUsers.id, me.id), or2(ilike(pokescanUsers.username, `%${q}%`), ilike(pokescanUsers.displayName, `%${q}%`)))).limit(20);
    res.json({ users: users2 });
  });
  app2.get("/api/support/admin", async (_req, res) => {
    try {
      const admins = await db.select({ id: pokescanUsers.id, displayName: pokescanUsers.displayName, username: pokescanUsers.username }).from(pokescanUsers).where(eq3(pokescanUsers.role, "admin")).limit(1);
      if (admins.length === 0) {
        res.json({ admin: null });
        return;
      }
      res.json({ admin: admins[0] });
    } catch (err) {
      res.status(500).json({ error: "Failed to find support contact" });
    }
  });
  app2.get("/api/social/messages/inbox", async (req, res) => {
    const me = await getUserFromToken(req);
    if (!me) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const rows = await db.select({
      id: pokescanMessages.id,
      subject: pokescanMessages.subject,
      body: pokescanMessages.body,
      isRead: pokescanMessages.isRead,
      createdAt: pokescanMessages.createdAt,
      senderId: pokescanMessages.senderId,
      senderUsername: pokescanUsers.username,
      senderDisplayName: pokescanUsers.displayName,
      senderAvatarUrl: pokescanUsers.avatarUrl
    }).from(pokescanMessages).innerJoin(pokescanUsers, eq3(pokescanMessages.senderId, pokescanUsers.id)).where(and3(eq3(pokescanMessages.recipientId, me.id), eq3(pokescanMessages.deletedByRecipient, false))).orderBy(desc(pokescanMessages.createdAt));
    res.json({ messages: rows });
  });
  app2.get("/api/social/messages/sent", async (req, res) => {
    const me = await getUserFromToken(req);
    if (!me) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const rows = await db.select({
      id: pokescanMessages.id,
      subject: pokescanMessages.subject,
      body: pokescanMessages.body,
      isRead: pokescanMessages.isRead,
      createdAt: pokescanMessages.createdAt,
      recipientId: pokescanMessages.recipientId,
      recipientUsername: pokescanUsers.username,
      recipientDisplayName: pokescanUsers.displayName,
      recipientAvatarUrl: pokescanUsers.avatarUrl
    }).from(pokescanMessages).innerJoin(pokescanUsers, eq3(pokescanMessages.recipientId, pokescanUsers.id)).where(and3(eq3(pokescanMessages.senderId, me.id), eq3(pokescanMessages.deletedBySender, false))).orderBy(desc(pokescanMessages.createdAt));
    res.json({ messages: rows });
  });
  app2.get("/api/social/messages/unread-count", async (req, res) => {
    const me = await getUserFromToken(req);
    if (!me) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const result = await db.select({ count: sql4`count(*)::int` }).from(pokescanMessages).where(and3(eq3(pokescanMessages.recipientId, me.id), eq3(pokescanMessages.isRead, false), eq3(pokescanMessages.deletedByRecipient, false)));
    res.json({ count: result[0]?.count ?? 0 });
  });
  app2.post("/api/social/messages/send", async (req, res) => {
    const me = await getUserFromToken(req);
    if (!me) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { recipientId, subject, body } = req.body;
    if (!recipientId || !body?.trim()) {
      res.status(400).json({ error: "recipientId and body required" });
      return;
    }
    const target = await storage.getUserById(recipientId);
    if (!target) {
      res.status(404).json({ error: "Recipient not found" });
      return;
    }
    const [msg] = await db.insert(pokescanMessages).values({
      senderId: me.id,
      recipientId,
      subject: (subject || "").trim(),
      body: body.trim()
    }).returning();
    res.json({ message: msg });
  });
  app2.patch("/api/social/messages/:id/read", async (req, res) => {
    const me = await getUserFromToken(req);
    if (!me) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    await db.update(pokescanMessages).set({ isRead: true }).where(
      and3(eq3(pokescanMessages.id, req.params.id), eq3(pokescanMessages.recipientId, me.id))
    );
    res.json({ success: true });
  });
  app2.delete("/api/social/messages/:id", async (req, res) => {
    const me = await getUserFromToken(req);
    if (!me) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const [msg] = await db.select().from(pokescanMessages).where(eq3(pokescanMessages.id, req.params.id));
    if (!msg) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (msg.senderId === me.id) {
      await db.update(pokescanMessages).set({ deletedBySender: true }).where(eq3(pokescanMessages.id, msg.id));
    } else if (msg.recipientId === me.id) {
      await db.update(pokescanMessages).set({ deletedByRecipient: true }).where(eq3(pokescanMessages.id, msg.id));
    }
    res.json({ success: true });
  });
  app2.post("/api/social/report", async (req, res) => {
    const me = await getUserFromToken(req);
    if (!me) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { contentType, contentId, reason, contentSnapshot, reportedUserId } = req.body;
    if (!contentType || !contentId || !reason?.trim()) {
      res.status(400).json({ error: "contentType, contentId, and reason are required" });
      return;
    }
    const existing = await db.select().from(pokescanReports).where(
      and3(eq3(pokescanReports.reporterId, me.id), eq3(pokescanReports.contentId, contentId), eq3(pokescanReports.status, "pending"))
    );
    if (existing.length > 0) {
      res.status(400).json({ error: "You already reported this content" });
      return;
    }
    const [report] = await db.insert(pokescanReports).values({
      reporterId: me.id,
      reportedUserId: reportedUserId || null,
      contentType,
      contentId,
      reason: reason.trim(),
      contentSnapshot: contentSnapshot ? JSON.stringify(contentSnapshot) : null
    }).returning();
    res.json({ report });
  });
  app2.get("/api/admin/reports", async (req, res) => {
    const pw = req.query.superadminPassword;
    const token = req.headers.authorization?.replace("Bearer ", "");
    let isAuthorized = await isSuperadminAuthorized(req);
    if (!isAuthorized && token) {
      const user = await storage.validateSession(token);
      if (user && (user.role === "admin" || user.role === "moderator")) isAuthorized = true;
    }
    if (!isAuthorized) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const reports = await db.select({
      id: pokescanReports.id,
      contentType: pokescanReports.contentType,
      contentId: pokescanReports.contentId,
      reason: pokescanReports.reason,
      contentSnapshot: pokescanReports.contentSnapshot,
      status: pokescanReports.status,
      reviewNote: pokescanReports.reviewNote,
      reviewedAt: pokescanReports.reviewedAt,
      createdAt: pokescanReports.createdAt,
      reporterUsername: sql4`r_user.username`,
      reporterDisplayName: sql4`r_user.display_name`,
      reportedUserUsername: sql4`ru_user.username`,
      reportedUserDisplayName: sql4`ru_user.display_name`,
      reviewedByUsername: sql4`rev_user.username`
    }).from(pokescanReports).leftJoin(sql4`pokescan_users AS r_user`, sql4`r_user.id = pokescan_reports.reporter_id`).leftJoin(sql4`pokescan_users AS ru_user`, sql4`ru_user.id = pokescan_reports.reported_user_id`).leftJoin(sql4`pokescan_users AS rev_user`, sql4`rev_user.id = pokescan_reports.reviewed_by`).orderBy(desc(pokescanReports.createdAt));
    res.json({ reports });
  });
  app2.patch("/api/admin/reports/:id", async (req, res) => {
    const pw = req.body.superadminPassword;
    const token = req.headers.authorization?.replace("Bearer ", "");
    let reviewerId = null;
    let isAuthorized = await isSuperadminAuthorized(req);
    if (!isAuthorized && token) {
      const user = await storage.validateSession(token);
      if (user && (user.role === "admin" || user.role === "moderator")) {
        isAuthorized = true;
        reviewerId = user.id;
      }
    }
    if (!isAuthorized) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { status, reviewNote } = req.body;
    if (!["reviewed", "dismissed"].includes(status)) {
      res.status(400).json({ error: "status must be 'reviewed' or 'dismissed'" });
      return;
    }
    const [updated] = await db.update(pokescanReports).set({
      status,
      reviewNote: reviewNote?.trim() || null,
      reviewedBy: reviewerId || null,
      reviewedAt: /* @__PURE__ */ new Date()
    }).where(eq3(pokescanReports.id, req.params.id)).returning();
    if (!updated) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    res.json({ report: updated });
  });
  app2.post("/api/admin/card-reseed", async (req, res) => {
    const { superadminPassword } = req.body;
    if (!await isSuperadminAuthorized(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const status = await getSyncStatus();
    if (status?.isRunning) {
      res.status(409).json({ error: "Sync already running", status });
      return;
    }
    runFullSync(false).catch((err) => console.error("[CardReseed] Error:", err));
    res.json({ message: "Card reseed started in background \u2014 monitor server logs for progress.", running: true });
  });
  app2.post("/api/grade", express.json({ limit: "25mb" }), async (req, res) => {
    try {
      const { centering, cornerDamage, edgeDamage, surfaceDamage, frontImageBase64, backImageBase64, imageBase64 } = req.body;
      const frontImg = frontImageBase64 || imageBase64;
      if (frontImg) {
        const prompt = `You are an expert Pok\xE9mon TCG card grader with experience equivalent to PSA/BGS professional grading. You have been given ${backImageBase64 ? "TWO images: the FRONT of the card followed by the BACK of the card" : "ONE image: the FRONT of the card"}. Analyse both surfaces thoroughly.

Score each criterion 0\u20135 (0 = perfect, 5 = severe damage):
- centering: how off-centre the print is on the card stock
- cornerDamage: wear, fraying, bending on any corner
- edgeDamage: nicks, chips, roughness on any edge
- surfaceDamage: scratches, print lines, scuffs, stains on front or back

Also provide:
- centeringRatios: estimate the border-space percentages for each side. topPct + bottomPct = 100, leftPct + rightPct = 100. Perfect centering = 50/50.
- findings: one detailed sentence per criterion describing exactly what you see, including which specific corners/edges/areas are affected and the severity.
- gradingComments: a 2\u20133 sentence professional assessment of the overall card quality, likely PSA/BGS grade range, and what the main deductions are.
- overallNotes: one concise sentence summary.

Return ONLY valid JSON in exactly this format with no markdown:
{
  "centering": 0,
  "cornerDamage": 0,
  "edgeDamage": 0,
  "surfaceDamage": 0,
  "centeringRatios": { "topPct": 50, "bottomPct": 50, "leftPct": 50, "rightPct": 50 },
  "findings": {
    "centering": "detailed centering observation",
    "corners": "detailed corner observation",
    "edges": "detailed edge observation",
    "frontSurface": "detailed front surface observation",
    "backSurface": "detailed back surface observation or N/A if only front provided"
  },
  "gradingComments": "professional 2-3 sentence overall assessment with likely grade range",
  "overallNotes": "one sentence summary"
}`;
        const imageContent = [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: frontImg, detail: "high" } }
        ];
        if (backImageBase64) {
          imageContent.push({ type: "image_url", image_url: { url: backImageBase64, detail: "high" } });
        }
        const aiRes = await openai.chat.completions.create({
          model: "gpt-4o",
          max_tokens: 800,
          messages: [{ role: "user", content: imageContent }]
        });
        const raw = aiRes.choices[0]?.message?.content?.trim() || "";
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("AI returned invalid response");
        const parsed = JSON.parse(jsonMatch[0]);
        const result2 = calculateGrade({
          centering: Math.max(0, Math.min(5, parsed.centering ?? 0)),
          cornerDamage: Math.max(0, Math.min(5, parsed.cornerDamage ?? 0)),
          edgeDamage: Math.max(0, Math.min(5, parsed.edgeDamage ?? 0)),
          surfaceDamage: Math.max(0, Math.min(5, parsed.surfaceDamage ?? 0))
        });
        const cr = parsed.centeringRatios;
        const centeringRatios = cr ? {
          topPct: Math.round(Math.max(1, Math.min(99, cr.topPct ?? 50))),
          bottomPct: Math.round(Math.max(1, Math.min(99, cr.bottomPct ?? 50))),
          leftPct: Math.round(Math.max(1, Math.min(99, cr.leftPct ?? 50))),
          rightPct: Math.round(Math.max(1, Math.min(99, cr.rightPct ?? 50)))
        } : null;
        return res.json({
          ...result2,
          aiAssessed: true,
          aiNotes: parsed.overallNotes ?? null,
          centeringRatios,
          findings: parsed.findings ?? null,
          gradingComments: parsed.gradingComments ?? null
        });
      }
      const result = calculateGrade({ centering, cornerDamage, edgeDamage, surfaceDamage });
      res.json(result);
    } catch (err) {
      console.error("Grading error:", err);
      res.status(500).json({ error: "Grading failed" });
    }
  });
  cleanupOldChatroomMessages();
  setInterval(cleanupOldChatroomMessages, 60 * 60 * 1e3);
  const isStaffRole = (role) => role === "admin" || role === "moderator";
  app2.get("/api/chatroom/messages", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const caller = await storage.validateSession(token);
      if (!caller) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }
      if (!caller.isPremium && !isStaffRole(caller.role)) {
        res.status(403).json({ error: "Premium membership required" });
        return;
      }
      if (caller.chatBannedUntil && new Date(caller.chatBannedUntil) > /* @__PURE__ */ new Date()) {
        res.status(403).json({ error: "You are banned from the chat", bannedUntil: caller.chatBannedUntil });
        return;
      }
      const msgs = await db.select().from(pokescanChatroomMessages).orderBy(desc(pokescanChatroomMessages.createdAt)).limit(200);
      res.json({ messages: msgs.reverse() });
    } catch (error) {
      console.error("Chatroom get error:", error);
      res.status(500).json({ error: error.message || "Failed to load chatroom" });
    }
  });
  app2.post("/api/chatroom/messages", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const caller = await storage.validateSession(token);
      if (!caller) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }
      if (!caller.isPremium && !isStaffRole(caller.role)) {
        res.status(403).json({ error: "Premium membership required" });
        return;
      }
      if (caller.chatBannedUntil && new Date(caller.chatBannedUntil) > /* @__PURE__ */ new Date()) {
        res.status(403).json({ error: "You are banned from the chat", bannedUntil: caller.chatBannedUntil });
        return;
      }
      if (caller.chatMutedUntil && new Date(caller.chatMutedUntil) > /* @__PURE__ */ new Date()) {
        res.status(403).json({ error: "You are muted", mutedUntil: caller.chatMutedUntil });
        return;
      }
      const { body } = req.body;
      if (!body || typeof body !== "string" || !body.trim()) {
        res.status(400).json({ error: "Message body is required" });
        return;
      }
      const trimmed = body.trim().substring(0, 2e3);
      const [msg] = await db.insert(pokescanChatroomMessages).values({
        senderId: caller.id,
        senderUsername: caller.username,
        senderDisplayName: caller.displayName || caller.username,
        senderAvatarUrl: caller.avatarUrl || null,
        body: trimmed
      }).returning();
      res.json({ message: msg });
    } catch (error) {
      console.error("Chatroom send error:", error);
      res.status(500).json({ error: error.message || "Failed to send message" });
    }
  });
  app2.delete("/api/chatroom/messages/:id", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const caller = await storage.validateSession(token);
      if (!caller) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }
      if (!caller.isPremium && !isStaffRole(caller.role)) {
        res.status(403).json({ error: "Premium membership required" });
        return;
      }
      if (caller.chatBannedUntil && new Date(caller.chatBannedUntil) > /* @__PURE__ */ new Date() && !isStaffRole(caller.role)) {
        res.status(403).json({ error: "You are banned from the chat", bannedUntil: caller.chatBannedUntil });
        return;
      }
      const msgId = req.params.id;
      const [existing] = await db.select().from(pokescanChatroomMessages).where(eq3(pokescanChatroomMessages.id, msgId));
      if (!existing) {
        res.status(404).json({ error: "Message not found" });
        return;
      }
      if (existing.senderId !== caller.id && !isStaffRole(caller.role)) {
        res.status(403).json({ error: "Not allowed" });
        return;
      }
      await db.delete(pokescanChatroomMessages).where(eq3(pokescanChatroomMessages.id, msgId));
      res.json({ success: true });
    } catch (error) {
      console.error("Chatroom delete error:", error);
      res.status(500).json({ error: error.message || "Failed to delete message" });
    }
  });
  app2.post("/api/chatroom/mute", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const caller = await storage.validateSession(token);
      if (!caller) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }
      if (!isStaffRole(caller.role)) {
        res.status(403).json({ error: "Staff only" });
        return;
      }
      const { userId, minutes } = req.body;
      if (!userId || !minutes || typeof minutes !== "number" || minutes < 1) {
        res.status(400).json({ error: "userId and minutes (positive number) required" });
        return;
      }
      const target = await storage.getUserById(userId);
      if (!target) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      if (isStaffRole(target.role)) {
        res.status(403).json({ error: "Cannot mute staff members" });
        return;
      }
      const mutedUntil = new Date(Date.now() + minutes * 60 * 1e3);
      await pool3.query("UPDATE pokescan_users SET chat_muted_until = $1 WHERE id = $2", [mutedUntil, userId]);
      res.json({ success: true, mutedUntil: mutedUntil.toISOString() });
    } catch (error) {
      console.error("Mute error:", error);
      res.status(500).json({ error: error.message || "Failed to mute user" });
    }
  });
  app2.post("/api/chatroom/unmute", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const caller = await storage.validateSession(token);
      if (!caller) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }
      if (!isStaffRole(caller.role)) {
        res.status(403).json({ error: "Staff only" });
        return;
      }
      const { userId } = req.body;
      if (!userId) {
        res.status(400).json({ error: "userId required" });
        return;
      }
      await pool3.query("UPDATE pokescan_users SET chat_muted_until = NULL WHERE id = $1", [userId]);
      res.json({ success: true });
    } catch (error) {
      console.error("Unmute error:", error);
      res.status(500).json({ error: error.message || "Failed to unmute user" });
    }
  });
  app2.post("/api/chatroom/ban", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const caller = await storage.validateSession(token);
      if (!caller) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }
      if (!isStaffRole(caller.role)) {
        res.status(403).json({ error: "Staff only" });
        return;
      }
      const { userId, minutes } = req.body;
      if (!userId || !minutes || typeof minutes !== "number" || minutes < 1) {
        res.status(400).json({ error: "userId and minutes (positive number) required" });
        return;
      }
      const target = await storage.getUserById(userId);
      if (!target) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      if (isStaffRole(target.role)) {
        res.status(403).json({ error: "Cannot ban staff members" });
        return;
      }
      const bannedUntil = new Date(Date.now() + minutes * 60 * 1e3);
      await pool3.query("UPDATE pokescan_users SET chat_banned_until = $1 WHERE id = $2", [bannedUntil, userId]);
      res.json({ success: true, bannedUntil: bannedUntil.toISOString() });
    } catch (error) {
      console.error("Ban error:", error);
      res.status(500).json({ error: error.message || "Failed to ban user" });
    }
  });
  app2.post("/api/chatroom/unban", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const caller = await storage.validateSession(token);
      if (!caller) {
        res.status(401).json({ error: "Invalid session" });
        return;
      }
      if (!isStaffRole(caller.role)) {
        res.status(403).json({ error: "Staff only" });
        return;
      }
      const { userId } = req.body;
      if (!userId) {
        res.status(400).json({ error: "userId required" });
        return;
      }
      await pool3.query("UPDATE pokescan_users SET chat_banned_until = NULL WHERE id = $1", [userId]);
      res.json({ success: true });
    } catch (error) {
      console.error("Unban error:", error);
      res.status(500).json({ error: error.message || "Failed to unban user" });
    }
  });
  app2.get("/api/admin/db/cards", async (req, res) => {
    if (!await isSuperadminSessionOnly(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || "50", 10)));
    const search = (req.query.search || "").trim();
    const setIdFilter = (req.query.setId || "").trim();
    const trash = req.query.trash === "1";
    const offset = (page - 1) * pageSize;
    const deletedFilter = trash ? isNotNull(pokemonCards.deletedAt) : isNull2(pokemonCards.deletedAt);
    let condition;
    if (search && setIdFilter) {
      condition = and3(
        deletedFilter,
        or2(ilike(pokemonCards.name, `%${search}%`), ilike(pokemonCards.id, `%${search}%`)),
        eq3(pokemonCards.setId, setIdFilter)
      );
    } else if (search) {
      condition = and3(deletedFilter, or2(ilike(pokemonCards.name, `%${search}%`), ilike(pokemonCards.id, `%${search}%`)));
    } else if (setIdFilter) {
      condition = and3(deletedFilter, eq3(pokemonCards.setId, setIdFilter));
    } else {
      condition = deletedFilter;
    }
    const [countResult, rows] = await Promise.all([
      db.select({ count: sql4`count(*)::int` }).from(pokemonCards).where(condition),
      db.select({
        id: pokemonCards.id,
        setId: pokemonCards.setId,
        setName: pokemonSets.name,
        name: pokemonCards.name,
        number: pokemonCards.number,
        rarity: pokemonCards.rarity,
        supertype: pokemonCards.supertype,
        subtypes: pokemonCards.subtypes,
        imageSmall: pokemonCards.imageSmall,
        imageLarge: pokemonCards.imageLarge,
        artist: pokemonCards.artist,
        hp: pokemonCards.hp,
        nationalPokedexNumbers: pokemonCards.nationalPokedexNumbers,
        description: pokemonCards.description,
        deletedAt: pokemonCards.deletedAt
      }).from(pokemonCards).leftJoin(pokemonSets, eq3(pokemonCards.setId, pokemonSets.id)).where(condition).orderBy(pokemonCards.number).limit(pageSize).offset(offset)
    ]);
    res.json({ cards: rows, total: countResult[0]?.count ?? 0, page, pageSize });
  });
  app2.patch("/api/admin/db/cards/:id", async (req, res) => {
    if (!await isSuperadminSessionOnly(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    const { name, number, rarity, imageSmall, imageLarge, artist, hp, supertype, subtypes, description } = req.body;
    const updates = {};
    if (typeof name === "string") {
      if (!name.trim()) {
        res.status(400).json({ error: "Card name cannot be empty" });
        return;
      }
      updates.name = name.trim();
    }
    if (typeof number === "string") updates.number = number.trim() || void 0;
    if (Object.prototype.hasOwnProperty.call(req.body, "rarity")) updates.rarity = typeof rarity === "string" ? rarity.trim() || null : null;
    if (Object.prototype.hasOwnProperty.call(req.body, "imageSmall")) updates.image_small = typeof imageSmall === "string" ? imageSmall.trim() || null : null;
    if (Object.prototype.hasOwnProperty.call(req.body, "imageLarge")) updates.image_large = typeof imageLarge === "string" ? imageLarge.trim() || null : null;
    if (Object.prototype.hasOwnProperty.call(req.body, "artist")) updates.artist = typeof artist === "string" ? artist.trim() || null : null;
    if (Object.prototype.hasOwnProperty.call(req.body, "hp")) updates.hp = typeof hp === "string" ? hp.trim() || null : null;
    if (Object.prototype.hasOwnProperty.call(req.body, "supertype")) updates.supertype = typeof supertype === "string" ? supertype.trim() || null : null;
    if (Object.prototype.hasOwnProperty.call(req.body, "subtypes")) updates.subtypes = typeof subtypes === "string" ? subtypes.trim() || null : null;
    if (Object.prototype.hasOwnProperty.call(req.body, "description")) updates.description = typeof description === "string" ? description.trim() || null : null;
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }
    const drizzleUpdates = {};
    if (updates.name !== void 0) drizzleUpdates.name = updates.name;
    if (updates.number !== void 0) drizzleUpdates.number = updates.number;
    if (Object.prototype.hasOwnProperty.call(updates, "rarity")) drizzleUpdates.rarity = updates.rarity;
    if (Object.prototype.hasOwnProperty.call(updates, "image_small")) drizzleUpdates.imageSmall = updates.image_small;
    if (Object.prototype.hasOwnProperty.call(updates, "image_large")) drizzleUpdates.imageLarge = updates.image_large;
    if (Object.prototype.hasOwnProperty.call(updates, "artist")) drizzleUpdates.artist = updates.artist;
    if (Object.prototype.hasOwnProperty.call(updates, "hp")) drizzleUpdates.hp = updates.hp;
    if (Object.prototype.hasOwnProperty.call(updates, "supertype")) drizzleUpdates.supertype = updates.supertype;
    if (Object.prototype.hasOwnProperty.call(updates, "subtypes")) drizzleUpdates.subtypes = updates.subtypes;
    if (Object.prototype.hasOwnProperty.call(updates, "description")) drizzleUpdates.description = updates.description;
    const [updated] = await db.update(pokemonCards).set(drizzleUpdates).where(and3(eq3(pokemonCards.id, id), isNull2(pokemonCards.deletedAt))).returning();
    if (!updated) {
      res.status(404).json({ error: "Card not found" });
      return;
    }
    res.json({ card: updated });
  });
  app2.get("/api/admin/db/sets", async (req, res) => {
    if (!await isSuperadminSessionOnly(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize || "50", 10)));
    const search = (req.query.search || "").trim();
    const trash = req.query.trash === "1";
    const offset = (page - 1) * pageSize;
    const deletedFilter = trash ? isNotNull(pokemonSets.deletedAt) : isNull2(pokemonSets.deletedAt);
    const condition = search ? and3(deletedFilter, or2(ilike(pokemonSets.name, `%${search}%`), ilike(pokemonSets.id, `%${search}%`))) : deletedFilter;
    const [countResult, sets] = await Promise.all([
      db.select({ count: sql4`count(*)::int` }).from(pokemonSets).where(condition),
      db.select({
        id: pokemonSets.id,
        name: pokemonSets.name,
        series: pokemonSets.series,
        releaseDate: pokemonSets.releaseDate,
        hidden: pokemonSets.hidden,
        total: pokemonSets.total,
        deletedAt: pokemonSets.deletedAt,
        cardCount: sql4`count(${pokemonCards.id})::int`
      }).from(pokemonSets).leftJoin(pokemonCards, and3(eq3(pokemonCards.setId, pokemonSets.id), isNull2(pokemonCards.deletedAt))).where(condition).groupBy(pokemonSets.id).orderBy(desc(pokemonSets.releaseDate)).limit(pageSize).offset(offset)
    ]);
    res.json({ sets, total: countResult[0]?.count ?? 0, page, pageSize });
  });
  app2.patch("/api/admin/db/sets/:id", async (req, res) => {
    if (!await isSuperadminSessionOnly(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    const { name, releaseDate, hidden } = req.body;
    const updates = {};
    if (typeof name === "string") {
      if (!name.trim()) {
        res.status(400).json({ error: "Set name cannot be empty" });
        return;
      }
      updates.name = name.trim();
    }
    if (typeof releaseDate === "string") updates.releaseDate = releaseDate.trim() || null;
    if (typeof hidden === "boolean") updates.hidden = hidden;
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }
    const [updated] = await db.update(pokemonSets).set(updates).where(and3(eq3(pokemonSets.id, id), isNull2(pokemonSets.deletedAt))).returning();
    if (!updated) {
      res.status(404).json({ error: "Set not found" });
      return;
    }
    res.json({ set: updated });
  });
  app2.delete("/api/admin/db/cards/:id", async (req, res) => {
    if (!await isSuperadminSessionOnly(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    const existing = await db.select({ id: pokemonCards.id }).from(pokemonCards).where(and3(eq3(pokemonCards.id, id), isNull2(pokemonCards.deletedAt))).limit(1);
    if (existing.length === 0) {
      res.status(404).json({ error: "Card not found" });
      return;
    }
    await db.update(pokemonCards).set({ deletedAt: /* @__PURE__ */ new Date() }).where(eq3(pokemonCards.id, id));
    res.json({ success: true });
  });
  app2.post("/api/admin/db/cards/:id/restore", async (req, res) => {
    if (!await isSuperadminSessionOnly(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    const existing = await db.select({ id: pokemonCards.id }).from(pokemonCards).where(and3(eq3(pokemonCards.id, id), isNotNull(pokemonCards.deletedAt))).limit(1);
    if (existing.length === 0) {
      res.status(404).json({ error: "Card not found in trash" });
      return;
    }
    await db.update(pokemonCards).set({ deletedAt: null }).where(eq3(pokemonCards.id, id));
    res.json({ success: true });
  });
  app2.delete("/api/admin/db/sets/:id", async (req, res) => {
    if (!await isSuperadminSessionOnly(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    const existing = await db.select({ id: pokemonSets.id }).from(pokemonSets).where(and3(eq3(pokemonSets.id, id), isNull2(pokemonSets.deletedAt))).limit(1);
    if (existing.length === 0) {
      res.status(404).json({ error: "Set not found" });
      return;
    }
    const now = /* @__PURE__ */ new Date();
    await db.transaction(async (tx) => {
      await tx.update(pokemonCards).set({ deletedAt: now }).where(eq3(pokemonCards.setId, id));
      await tx.update(pokemonSets).set({ deletedAt: now }).where(eq3(pokemonSets.id, id));
    });
    res.json({ success: true });
  });
  app2.post("/api/admin/db/sets/:id/restore", async (req, res) => {
    if (!await isSuperadminSessionOnly(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { id } = req.params;
    const existing = await db.select({ id: pokemonSets.id }).from(pokemonSets).where(and3(eq3(pokemonSets.id, id), isNotNull(pokemonSets.deletedAt))).limit(1);
    if (existing.length === 0) {
      res.status(404).json({ error: "Set not found in trash" });
      return;
    }
    await db.transaction(async (tx) => {
      await tx.update(pokemonCards).set({ deletedAt: null }).where(and3(eq3(pokemonCards.setId, id), isNotNull(pokemonCards.deletedAt)));
      await tx.update(pokemonSets).set({ deletedAt: null }).where(eq3(pokemonSets.id, id));
    });
    res.json({ success: true });
  });
  const ADMIN_DB_TABLES = {
    pokescan_users: { pk: "id", searchCols: ["username", "email", "display_name"] },
    pokescan_blocked_credentials: { pk: "id", searchCols: ["email", "mobile_number", "reason"] },
    pokescan_sessions: { pk: "token", searchCols: ["user_id"] },
    pokemon_sets: { pk: "id", searchCols: ["name", "series"] },
    pokemon_cards: { pk: "id", searchCols: ["name", "set_id"] },
    card_pricing: { pk: "id", searchCols: ["card_id"] },
    ebay_prices: { pk: "id", searchCols: ["card_id", "title"] },
    pokescan_friendships: { pk: "id", searchCols: ["requester_id", "addressee_id", "status"] },
    pokescan_messages: { pk: "id", searchCols: ["sender_id", "recipient_id", "subject", "body"] },
    pokescan_reports: { pk: "id", searchCols: ["reason", "content_type", "status"] },
    pokescan_market_listings: { pk: "id", searchCols: ["card_name", "user_name", "status"] },
    pokescan_collections: { pk: "id", searchCols: ["card_name", "user_id", "set_name"] },
    pokescan_chatroom_messages: { pk: "id", searchCols: ["sender_username", "body"] },
    pokescan_admin_activity_log: { pk: "id", searchCols: ["action", "target_username", "listing_name"] },
    pokescan_collector_verifications: { pk: "id", searchCols: ["user_id", "card_name", "status"] },
    pokescan_scan_history: { pk: "id", searchCols: ["card_name", "set_name"] },
    sync_status: { pk: "id", searchCols: [] },
    users: { pk: "id", searchCols: ["username"] }
  };
  app2.get("/api/admin/db/table/:tableName/schema", async (req, res) => {
    if (!await isSuperadminSessionOnly(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { tableName } = req.params;
    if (!ADMIN_DB_TABLES[tableName]) {
      res.status(400).json({ error: "Unknown table" });
      return;
    }
    const result = await pool3.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_name = $1 AND table_schema = 'public'
       ORDER BY ordinal_position`,
      [tableName]
    );
    res.json({ columns: result.rows, pk: ADMIN_DB_TABLES[tableName].pk });
  });
  app2.get("/api/admin/db/table/:tableName", async (req, res) => {
    if (!await isSuperadminSessionOnly(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { tableName } = req.params;
    const tbl = ADMIN_DB_TABLES[tableName];
    if (!tbl) {
      res.status(400).json({ error: "Unknown table" });
      return;
    }
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || "50", 10)));
    const search = (req.query.search || "").trim();
    const offset = (page - 1) * pageSize;
    const values = [];
    let whereClause = "";
    if (search && tbl.searchCols.length > 0) {
      const conditions = tbl.searchCols.map((col, i) => `"${col}"::text ILIKE $${i + 1}`);
      whereClause = `WHERE (${conditions.join(" OR ")})`;
      values.push(...tbl.searchCols.map(() => `%${search}%`));
    }
    const countResult = await pool3.query(`SELECT COUNT(*) as count FROM "${tableName}" ${whereClause}`, values);
    const dataResult = await pool3.query(
      `SELECT * FROM "${tableName}" ${whereClause} ORDER BY "${tbl.pk}" DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pageSize, offset]
    );
    res.json({ rows: dataResult.rows, total: parseInt(countResult.rows[0].count, 10), page, pageSize });
  });
  app2.get("/api/admin/db/tables", async (req, res) => {
    if (!await isSuperadminSessionOnly(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const tables = await Promise.all(
      Object.keys(ADMIN_DB_TABLES).map(async (t) => {
        const r = await pool3.query(`SELECT COUNT(*) as count FROM "${t}"`);
        return { name: t, rowCount: parseInt(r.rows[0].count, 10) };
      })
    );
    res.json({ tables });
  });
  app2.patch("/api/admin/db/table/:tableName/:id", express.json({ limit: "2mb" }), async (req, res) => {
    if (!await isSuperadminSessionOnly(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { tableName, id } = req.params;
    const tbl = ADMIN_DB_TABLES[tableName];
    if (!tbl) {
      res.status(400).json({ error: "Unknown table" });
      return;
    }
    const body = req.body;
    const schemaResult = await pool3.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'`,
      [tableName]
    );
    const validCols = new Set(schemaResult.rows.map((r) => r.column_name));
    const updates = Object.entries(body).filter(([k]) => k !== tbl.pk && validCols.has(k));
    if (updates.length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }
    const setClauses = updates.map(([col], i) => `"${col}" = $${i + 1}`);
    const values = [...updates.map(([, v]) => v === "" ? null : v), id];
    await pool3.query(`UPDATE "${tableName}" SET ${setClauses.join(", ")} WHERE "${tbl.pk}" = $${values.length}`, values);
    const updated = await pool3.query(`SELECT * FROM "${tableName}" WHERE "${tbl.pk}" = $1`, [id]);
    res.json({ row: updated.rows[0] || null });
  });
  app2.delete("/api/admin/db/table/:tableName/:id", async (req, res) => {
    if (!await isSuperadminSessionOnly(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { tableName, id } = req.params;
    const tbl = ADMIN_DB_TABLES[tableName];
    if (!tbl) {
      res.status(400).json({ error: "Unknown table" });
      return;
    }
    await pool3.query(`DELETE FROM "${tableName}" WHERE "${tbl.pk}" = $1`, [id]);
    res.json({ success: true });
  });
  app2.post("/api/admin/db/table/:tableName", express.json({ limit: "2mb" }), async (req, res) => {
    if (!await isSuperadminSessionOnly(req)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { tableName } = req.params;
    const tbl = ADMIN_DB_TABLES[tableName];
    if (!tbl) {
      res.status(400).json({ error: "Unknown table" });
      return;
    }
    const body = req.body;
    const schemaResult = await pool3.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'`,
      [tableName]
    );
    const validCols = new Set(schemaResult.rows.map((r) => r.column_name));
    const entries = Object.entries(body).filter(([k]) => validCols.has(k) && body[k] !== "" && body[k] !== null && body[k] !== void 0);
    if (entries.length === 0) {
      res.status(400).json({ error: "No valid fields provided" });
      return;
    }
    const cols = entries.map(([k]) => `"${k}"`).join(", ");
    const placeholders = entries.map((_, i) => `$${i + 1}`).join(", ");
    const values = entries.map(([, v]) => v);
    const result = await pool3.query(`INSERT INTO "${tableName}" (${cols}) VALUES (${placeholders}) RETURNING *`, values);
    res.json({ row: result.rows[0] });
  });
  const httpServer = createServer(app2);
  app2.get("/api/admin/resync-progress", (_req, res) => {
    res.json(resyncState);
  });
  app2.post("/api/admin/full-resync", async (_req, res) => {
    if (resyncState.running) {
      return res.status(409).json({
        success: false,
        error: "Resync already running"
      });
    }
    resyncState = {
      running: true,
      progress: null,
      error: null,
      startedAt: /* @__PURE__ */ new Date(),
      finishedAt: null
    };
    res.json({
      success: true,
      message: "Full resync started"
    });
    void runFullResync((p) => {
      resyncState.progress = p;
    }).then(() => {
      resyncState.running = false;
      resyncState.finishedAt = /* @__PURE__ */ new Date();
    }).catch((err) => {
      console.error("[FullResync] failed:", err);
      resyncState.running = false;
      resyncState.error = err?.message || "Full resync failed";
      resyncState.finishedAt = /* @__PURE__ */ new Date();
    });
  });
  return httpServer;
}

// server/index.ts
init_db();
import * as fs from "fs";
import * as path from "path";
var app = express2();
app.get("/api/users", (req, res) => {
  res.json([{ id: 1, email: "test@example.com" }]);
});
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express2.json({
      limit: "15mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express2.urlencoded({ extended: false, limit: "15mb" }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path2 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path2.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  app2.use("/assets", express2.static(path.resolve(process.cwd(), "assets")));
  app2.use(express2.static(path.resolve(process.cwd(), "static-build")));
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
}
process.on("uncaughtException", (err) => {
  console.error("[Server] Uncaught exception \u2014 keeping process alive:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[Server] Unhandled promise rejection \u2014 keeping process alive:", reason);
});
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  await warmupDb();
  const server = await registerRoutes(app);
  setupErrorHandler(app);
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", ts: Date.now() });
  });
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`express server serving on port ${port}`);
    }
  );
})().catch((err) => {
  console.error("[Server] Fatal startup error:", err);
  setTimeout(() => process.exit(1), 500);
});
