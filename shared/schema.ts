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
