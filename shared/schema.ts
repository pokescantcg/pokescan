import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, real, timestamp, boolean, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const pokescanUsers = pgTable("pokescan_users", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()::varchar`),
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
  subscriptionStatus: text("subscription_status"),   // active | canceled | past_due | trialing
  subscriptionPeriodEnd: timestamp("subscription_period_end", { withTimezone: true }),
  // Scan quota & daily login streak fields
  scansUsedToday: integer("scans_used_today").notNull().default(0),
  scanDate: text("scan_date"),                        // YYYY-MM-DD of last scan
  consecutiveLoginDays: integer("consecutive_login_days").notNull().default(0),
  lastLoginDate: text("last_login_date"),             // YYYY-MM-DD of last checkin
  bonusScanPools: text("bonus_scan_pools"),           // JSON: [{amount, expiresAt}]
  chatMutedUntil: timestamp("chat_muted_until", { withTimezone: true }),
  chatBannedUntil: timestamp("chat_banned_until", { withTimezone: true }),
  collectionVisible: boolean("collection_visible").notNull().default(false),
  isVerifiedCollector: boolean("is_verified_collector").notNull().default(false),
  emailVerified: boolean("email_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`NOW()`),
});

export const pokescanSessions = pgTable("pokescan_sessions", {
  token: varchar("token", { length: 64 }).primaryKey(),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => pokescanUsers.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`NOW()`),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull().default(sql`NOW() + INTERVAL '30 days'`),
});

export const insertUserSchema = createInsertSchema(pokescanUsers).pick({
  username: true,
  displayName: true,
  email: true,
  mobileNumber: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type PokescanUser = typeof pokescanUsers.$inferSelect;
export type PokescanSession = typeof pokescanSessions.$inferSelect;

export type UserRole = "user" | "moderator" | "admin";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});
export type User = typeof users.$inferSelect;

export const pokemonSets = pgTable("pokemon_sets", {
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
});

export const pokemonCards = pgTable("pokemon_cards", {
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
});

export const cardPricing = pgTable(
  "card_pricing",
  {
    id: serial("id").primaryKey(),
    cardId: varchar("card_id").notNull().references(() => pokemonCards.id),
    tcgLow: real("tcg_low"),
    tcgMid: real("tcg_mid"),
    tcgHigh: real("tcg_high"),
    tcgMarket: real("tcg_market"),
    tcgDirectLow: real("tcg_direct_low"),
    cardmarketAvg: real("cardmarket_avg"),
    cardmarketLow: real("cardmarket_low"),
    cardmarketTrend: real("cardmarket_trend"),
    priceGBP: real("price_gbp"),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [unique("card_pricing_card_id_unique").on(t.cardId)]
);

export const ebayPrices = pgTable("ebay_prices", {
  id: serial("id").primaryKey(),
  cardId: varchar("card_id").notNull().references(() => pokemonCards.id),
  title: text("title"),
  price: real("price"),
  currency: text("currency").default("GBP"),
  soldDate: text("sold_date"),
  listingUrl: text("listing_url"),
  isSold: boolean("is_sold").default(true),
  fetchedAt: timestamp("fetched_at").default(sql`CURRENT_TIMESTAMP`),
});

export const pokescanFriendships = pgTable("pokescan_friendships", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::varchar`),
  requesterId: varchar("requester_id", { length: 36 }).notNull().references(() => pokescanUsers.id, { onDelete: "cascade" }),
  addresseeId: varchar("addressee_id", { length: 36 }).notNull().references(() => pokescanUsers.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`NOW()`),
});

export const pokescanMessages = pgTable("pokescan_messages", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::varchar`),
  senderId: varchar("sender_id", { length: 36 }).notNull().references(() => pokescanUsers.id, { onDelete: "cascade" }),
  recipientId: varchar("recipient_id", { length: 36 }).notNull().references(() => pokescanUsers.id, { onDelete: "cascade" }),
  subject: text("subject").notNull().default(""),
  body: text("body").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  deletedBySender: boolean("deleted_by_sender").notNull().default(false),
  deletedByRecipient: boolean("deleted_by_recipient").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`NOW()`),
});

export type PokescanFriendship = typeof pokescanFriendships.$inferSelect;
export type PokescanMessage = typeof pokescanMessages.$inferSelect;

export const pokescanReports = pgTable("pokescan_reports", {
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`NOW()`),
});

export type PokescanReport = typeof pokescanReports.$inferSelect;

export const pokescanMarketListings = pgTable("pokescan_market_listings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::varchar`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => pokescanUsers.id, { onDelete: "cascade" }),
  userName: text("user_name").notNull(),
  cardId: text("card_id").notNull(),
  cardName: text("card_name").notNull(),
  cardImage: text("card_image").notNull(),
  setName: text("set_name").notNull(),
  rarity: text("rarity").notNull().default("Unknown"),
  type: text("type").notNull(),                 // "sale" | "trade"
  priceGBP: real("price_gbp"),
  condition: text("condition").notNull(),
  description: text("description").notNull().default(""),
  photos: text("photos").notNull().default("[]"),  // JSON array of base64 strings (max 6)
  status: text("status").notNull().default("pending"), // "pending" | "approved" | "rejected"
  reviewedBy: varchar("reviewed_by", { length: 36 }).references(() => pokescanUsers.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewNote: text("review_note"),
  reviewNoteUpdatedBy: varchar("review_note_updated_by", { length: 36 }).references(() => pokescanUsers.id, { onDelete: "set null" }),
  reviewNoteUpdatedAt: timestamp("review_note_updated_at", { withTimezone: true }),
  externalUrl: text("external_url"),   // Optional link to eBay / external listing
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`NOW()`),
});

export type PokescanMarketListing = typeof pokescanMarketListings.$inferSelect;

export const pokescanCollections = pgTable("pokescan_collections", {
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
  variant: text("variant").default("Non-Holo"),
  priceGBP: real("price_gbp"),
  gradingCompany: varchar("grading_company", { length: 32 }),
  grade: varchar("grade", { length: 16 }),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().default(sql`NOW()`),
});

export type PokescanCollection = typeof pokescanCollections.$inferSelect;

export const pokescanChatroomMessages = pgTable("pokescan_chatroom_messages", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::varchar`),
  senderId: varchar("sender_id", { length: 36 }).notNull().references(() => pokescanUsers.id, { onDelete: "cascade" }),
  senderUsername: text("sender_username").notNull(),
  senderDisplayName: text("sender_display_name").notNull(),
  senderAvatarUrl: text("sender_avatar_url"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`NOW()`),
});

export type PokescanChatroomMessage = typeof pokescanChatroomMessages.$inferSelect;

export const pokescanAdminActivityLog = pgTable("pokescan_admin_activity_log", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()::varchar`),
  listingId: varchar("listing_id", { length: 36 }),
  listingName: text("listing_name"),
  action: text("action").notNull(),
  performedBy: varchar("performed_by", { length: 36 }).references(() => pokescanUsers.id, { onDelete: "set null" }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`NOW()`),
});

export type PokescanAdminActivityLog = typeof pokescanAdminActivityLog.$inferSelect;

export const pokescanCollectorVerifications = pgTable("pokescan_collector_verifications", {
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`NOW()`),
});

export type PokescanCollectorVerification = typeof pokescanCollectorVerifications.$inferSelect;

export const syncStatus = pgTable("sync_status", {
  id: serial("id").primaryKey(),
  totalSets: integer("total_sets").default(0),
  syncedSets: integer("synced_sets").default(0),
  totalCards: integer("total_cards").default(0),
  syncedCards: integer("synced_cards").default(0),
  lastCardSyncAt: timestamp("last_card_sync_at"),
  lastPriceSyncAt: timestamp("last_price_sync_at"),
  isRunning: boolean("is_running").default(false),
  lastError: text("last_error"),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});
