"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
var cheerio = require("cheerio");
var grading_1 = require("./services/grading");
var scan_quota_1 = require("./scan-quota");
var node_http_1 = require("node:http");
var express_1 = require("express");
var openai_1 = require("openai");
var bcryptjs_1 = require("bcryptjs");
var pokecardvalues_scraper_1 = require("./pokecardvalues-scraper");
var storage_1 = require("./storage");
var otp_service_1 = require("./otp-service");
var crypto_1 = require("crypto");
var db_1 = require("./db");
var schema_1 = require("@shared/schema");
var drizzle_orm_1 = require("drizzle-orm");
var card_sync_1 = require("./card-sync");
var full_resync_1 = require("./full-resync");
var resyncState = { running: false, progress: null, error: null, startedAt: null, finishedAt: null };
function cleanupOldChatroomMessages() {
    return __awaiter(this, void 0, void 0, function () {
        var sevenDaysAgo, result, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                    return [4 /*yield*/, db_1.db.delete(schema_1.pokescanChatroomMessages)
                            .where((0, drizzle_orm_1.lt)(schema_1.pokescanChatroomMessages.createdAt, sevenDaysAgo))];
                case 1:
                    result = _a.sent();
                    console.log("[Chatroom] Cleaned up old messages");
                    return [3 /*break*/, 3];
                case 2:
                    e_1 = _a.sent();
                    console.error("[Chatroom] Cleanup error:", e_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
var openai = new openai_1.default({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});
var POKEMON_API = "https://api.pokemontcg.io/v2";
function tcgHeaders() {
    var h = { "User-Agent": "PokeScanTCG/1.0" };
    if (process.env.POKEMON_TCG_API_KEY)
        h["X-Api-Key"] = process.env.POKEMON_TCG_API_KEY;
    return h;
}
// In-memory cache for set cards (avoids repeated TCG API hits within a server session)
var setCardsMemCache = new Map();
var MEM_CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes
function getMemCache(key) {
    var e = setCardsMemCache.get(key);
    return e && Date.now() - e.ts < MEM_CACHE_TTL_MS ? e.data : null;
}
function setMemCache(key, data) {
    setCardsMemCache.set(key, { data: data, ts: Date.now() });
}
// Individual card cache — populated when set cards are loaded so tapping a card
// from a freshly-loaded set never needs a second API call.
var cardMemCache = new Map();
function getCardCache(id) {
    var e = cardMemCache.get(id);
    return e && Date.now() - e.ts < MEM_CACHE_TTL_MS ? e.data : null;
}
function setCardCache(id, data) {
    cardMemCache.set(id, { data: data, ts: Date.now() });
}
// Bulk-populate card cache from a set response (call after any set load)
function warmCardCache(cards) {
    for (var _i = 0, cards_1 = cards; _i < cards_1.length; _i++) {
        var card = cards_1[_i];
        if ((card === null || card === void 0 ? void 0 : card.id) && !cardMemCache.has(card.id)) {
            setCardCache(card.id, { data: card });
        }
    }
}
function detectSetLanguage(setId) {
    var id = setId.toLowerCase();
    if (id.includes("_ja"))
        return "japanese";
    if (id.includes("_ko"))
        return "korean";
    if (id.includes("_zh") || id.includes("_cn"))
        return "chinese";
    // me*, rsv*, zsv* sets have English names and belong in English
    return "english";
}
// ── Set reference cache — built from DB, injected into AI prompt ────────────
var _setRefCache = null;
var _setRefCacheAt = 0;
var SET_REF_TTL_MS = 60 * 60 * 1000; // rebuild once per hour
function buildSetReferencePrompt() {
    return __awaiter(this, void 0, void 0, function () {
        var now, sets, byLang, _i, sets_1, s, fmt, lines, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    now = Date.now();
                    if (_setRefCache && now - _setRefCacheAt < SET_REF_TTL_MS)
                        return [2 /*return*/, _setRefCache];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, db_1.db
                            .select({
                            id: schema_1.pokemonSets.id,
                            name: schema_1.pokemonSets.name,
                            printedTotal: schema_1.pokemonSets.printedTotal,
                            total: schema_1.pokemonSets.total,
                            releaseDate: schema_1.pokemonSets.releaseDate,
                        })
                            .from(schema_1.pokemonSets)
                            .where((0, drizzle_orm_1.isNull)(schema_1.pokemonSets.deletedAt))
                            .orderBy(schema_1.pokemonSets.releaseDate)];
                case 2:
                    sets = _a.sent();
                    byLang = {
                        english: [], japanese: [], korean: [], chinese: [],
                    };
                    for (_i = 0, sets_1 = sets; _i < sets_1.length; _i++) {
                        s = sets_1[_i];
                        byLang[detectSetLanguage(s.id)].push(s);
                    }
                    fmt = function (s) {
                        var _a, _b, _c, _d;
                        var year = (_b = (_a = s.releaseDate) === null || _a === void 0 ? void 0 : _a.substring(0, 4)) !== null && _b !== void 0 ? _b : "?";
                        var count = (_d = (_c = s.printedTotal) !== null && _c !== void 0 ? _c : s.total) !== null && _d !== void 0 ? _d : "?";
                        return "".concat(s.id, "|").concat(s.name, "|").concat(count, "|").concat(year);
                    };
                    lines = __spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray(__spreadArray([
                        "KNOWN SETS DATABASE (use this to identify the exact set from what you read on the card):",
                        "Format: setCode|setName|printedTotal|year",
                        "",
                        "MATCHING PRIORITY — use this order:",
                        "1. SET CODE on card: Many cards print a short set code in the bottom-left corner right before or alongside the collector number (e.g. 'A5C', 'A3a', 'SV09', 'SWSH', 'XY'). Read it carefully — it matches the setCode column exactly. This is the most reliable identifier.",
                        "2. COLLECTOR NUMBER DENOMINATOR: The number after the slash (e.g. 217 in '276/217') usually matches printedTotal exactly. Find the set where printedTotal equals this number.",
                        "3. SET SYMBOL + VISUAL CUES: Use the set symbol icon and card design era as a secondary confirmation only.",
                        "IMPORTANT: Never guess based on card art alone. If you can read a set code like 'A5C', 'A3a', 'B3a', 'SV09' on the card, look it up in the database below and use that set. Do not override a clearly read set code with a guess based on aesthetics.",
                        "",
                        "[ENGLISH]"
                    ], byLang.english.map(fmt), true), [
                        "",
                        "[JAPANESE]"
                    ], false), byLang.japanese.map(fmt), true), [
                        "",
                        "[KOREAN]"
                    ], false), byLang.korean.map(fmt), true), [
                        "",
                        "[CHINESE]"
                    ], false), byLang.chinese.map(fmt), true), [
                        "",
                        "When reporting setName, use the human-readable name column (not the code). Match by set code first, then by collector number denominator, then by visual cues.",
                    ], false);
                    _setRefCache = lines.join("\n");
                    _setRefCacheAt = now;
                    console.log("[SetRef] Built set reference prompt: ".concat(sets.length, " sets, ").concat(_setRefCache.length, " chars"));
                    return [2 /*return*/, _setRefCache];
                case 3:
                    e_2 = _a.sent();
                    console.error("[SetRef] Failed to build set reference:", e_2);
                    return [2 /*return*/, ""];
                case 4: return [2 /*return*/];
            }
        });
    });
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
            logo: set.logoUrl,
        },
    };
}
function dbVariantToApiFormat(card, pricing, ebay) {
    var base = {
        id: card.id,
        name: card.name,
        number: card.number,
        rarity: card.rarity,
        supertype: card.supertype,
        subtypes: card.subtypes ? card.subtypes.split(",") : [],
        images: {
            small: card.imageSmall,
            large: card.imageLarge,
        },
        artist: card.artist,
        hp: card.hp,
        set: { id: card.setId },
    };
    if (pricing) {
        base.tcgplayer = {
            prices: {
                normal: {
                    low: pricing.tcgLow,
                    mid: pricing.tcgMid,
                    high: pricing.tcgHigh,
                    market: pricing.tcgMarket,
                    directLow: pricing.tcgDirectLow,
                },
            },
        };
        base.cardmarket = {
            prices: {
                averageSellPrice: pricing.cardmarketAvg,
                lowPrice: pricing.cardmarketLow,
                trendPrice: pricing.cardmarketTrend,
            },
        };
        base.priceGBP = pricing.priceGBP;
    }
    if (ebay && ebay.length > 0) {
        base.ebayListings = ebay.map(function (e) { return ({
            title: e.title,
            price: e.price,
            currency: e.currency,
            soldDate: e.soldDate,
            listingUrl: e.listingUrl,
            isSold: e.isSold,
        }); });
    }
    return base;
}
// ---------- Superadmin auth helpers ----------
function getSuperadminEmail() {
    var email = process.env.SUPERADMIN_EMAIL;
    if (!email) {
        console.warn("[superadmin] SUPERADMIN_EMAIL env var is not set. Superadmin features will be unavailable.");
        return "";
    }
    return email.toLowerCase().trim();
}
var SUPERADMIN_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
var superadminTokens = new Map(); // token -> expiresAt
function issueSuperadminToken() {
    var token = (0, crypto_1.randomBytes)(32).toString("hex");
    superadminTokens.set(token, Date.now() + SUPERADMIN_TOKEN_TTL_MS);
    return token;
}
// Strict superadmin-only check: requires a valid session token AND
// the authenticated user must match the designated superadmin email
// (set via the SUPERADMIN_EMAIL env var).
function isSuperadminSessionOnly(req) {
    return __awaiter(this, void 0, void 0, function () {
        var auth, token, user, superadminEmail, _a;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    auth = req.headers.authorization || "";
                    if (!auth.startsWith("Bearer "))
                        return [2 /*return*/, false];
                    token = auth.slice(7).trim();
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, storage_1.storage.validateSession(token)];
                case 2:
                    user = _c.sent();
                    superadminEmail = getSuperadminEmail();
                    if (!superadminEmail)
                        return [2 /*return*/, false];
                    return [2 /*return*/, !!(user && user.role === "admin" && ((_b = user.email) === null || _b === void 0 ? void 0 : _b.toLowerCase()) === superadminEmail)];
                case 3:
                    _a = _c.sent();
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function isSuperadminAuthorized(req) {
    return __awaiter(this, void 0, void 0, function () {
        var auth, token, user, _a, exp, legacyPw, provided;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    auth = req.headers.authorization || "";
                    if (!auth.startsWith("Bearer ")) return [3 /*break*/, 5];
                    token = auth.slice(7).trim();
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, storage_1.storage.validateSession(token)];
                case 2:
                    user = _b.sent();
                    if (user && user.role === "admin")
                        return [2 /*return*/, true];
                    return [3 /*break*/, 4];
                case 3:
                    _a = _b.sent();
                    return [3 /*break*/, 4];
                case 4:
                    exp = superadminTokens.get(token);
                    if (exp && exp > Date.now())
                        return [2 /*return*/, true];
                    if (exp && exp <= Date.now())
                        superadminTokens.delete(token);
                    _b.label = 5;
                case 5:
                    legacyPw = process.env.SUPERADMIN_PASSWORD;
                    if (legacyPw) {
                        provided = (req.body && req.body.superadminPassword) ||
                            req.query.superadminPassword ||
                            "";
                        if (provided && provided === legacyPw)
                            return [2 /*return*/, true];
                    }
                    return [2 /*return*/, false];
            }
        });
    });
}
function seedSuperadmin() {
    return __awaiter(this, void 0, void 0, function () {
        var email, initialPassword, existing, passwordHash, updates, hash, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 11, , 12]);
                    email = getSuperadminEmail();
                    initialPassword = process.env.SUPERADMIN_INITIAL_PASSWORD || process.env.SUPERADMIN_PASSWORD;
                    return [4 /*yield*/, storage_1.storage.getUserByEmail(email)];
                case 1:
                    existing = _a.sent();
                    if (!!existing) return [3 /*break*/, 4];
                    if (!initialPassword) {
                        console.warn("[seedSuperadmin] SUPERADMIN_INITIAL_PASSWORD env var not set — cannot create initial superadmin.");
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, bcryptjs_1.default.hash(initialPassword, 10)];
                case 2:
                    passwordHash = _a.sent();
                    return [4 /*yield*/, storage_1.storage.createUser({
                            username: "superadmin",
                            displayName: "Super Admin",
                            email: email,
                            mobileNumber: "",
                            passwordHash: passwordHash,
                            authProvider: "local",
                            isPremium: true,
                            role: "admin",
                        })];
                case 3:
                    _a.sent();
                    console.log("[seedSuperadmin] Created superadmin user:", email);
                    return [3 /*break*/, 10];
                case 4:
                    updates = {};
                    if (existing.role !== "admin")
                        updates.role = "admin";
                    if (!existing.isPremium)
                        updates.isPremium = true;
                    if (!(Object.keys(updates).length > 0)) return [3 /*break*/, 6];
                    return [4 /*yield*/, storage_1.storage.updateUser(existing.id, updates)];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6:
                    if (!initialPassword) return [3 /*break*/, 9];
                    return [4 /*yield*/, bcryptjs_1.default.hash(initialPassword, 10)];
                case 7:
                    hash = _a.sent();
                    return [4 /*yield*/, storage_1.storage.setPassword(existing.id, hash)];
                case 8:
                    _a.sent();
                    console.log("[seedSuperadmin] Synced password for superadmin:", email);
                    _a.label = 9;
                case 9:
                    if (Object.keys(updates).length > 0) {
                        console.log("[seedSuperadmin] Updated superadmin user:", email, Object.keys(updates));
                    }
                    _a.label = 10;
                case 10: return [3 /*break*/, 12];
                case 11:
                    err_1 = _a.sent();
                    console.error("[seedSuperadmin] error:", err_1);
                    return [3 /*break*/, 12];
                case 12: return [2 /*return*/];
            }
        });
    });
}
// ---------- Runtime app config (toggled from external admin panel) ----------
var appConfig = {
    maintenanceMode: false,
    scannerEnabled: true,
};
function runSchemaMigrations() {
    return __awaiter(this, void 0, void 0, function () {
        var err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, db_1.pool.query("\n      ALTER TABLE pokescan_collections ADD COLUMN IF NOT EXISTS grading_company VARCHAR(32);\n      ALTER TABLE pokescan_collections ADD COLUMN IF NOT EXISTS grade VARCHAR(16);\n      ALTER TABLE pokescan_collections ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;\n      ALTER TABLE pokescan_collections ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;\n      ALTER TABLE pokescan_collections ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;\n      ALTER TABLE pokescan_users ADD COLUMN IF NOT EXISTS is_verified_collector BOOLEAN NOT NULL DEFAULT FALSE;\n      ALTER TABLE pokemon_cards ADD COLUMN IF NOT EXISTS description TEXT;\n      ALTER TABLE pokemon_cards ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;\n      ALTER TABLE pokemon_sets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;\n      CREATE TABLE IF NOT EXISTS pokescan_collector_verifications (\n        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,\n        user_id VARCHAR(36) NOT NULL REFERENCES pokescan_users(id) ON DELETE CASCADE,\n        card_id TEXT NOT NULL,\n        card_name TEXT NOT NULL,\n        card_image TEXT NOT NULL,\n        front_photo TEXT NOT NULL,\n        back_photo TEXT NOT NULL,\n        status TEXT NOT NULL DEFAULT 'pending',\n        reviewed_by VARCHAR(36) REFERENCES pokescan_users(id) ON DELETE SET NULL,\n        reviewed_at TIMESTAMPTZ,\n        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n      );\n      CREATE TABLE IF NOT EXISTS pokescan_scan_history (\n        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,\n        user_id VARCHAR(36) NOT NULL REFERENCES pokescan_users(id) ON DELETE CASCADE,\n        card_name TEXT NOT NULL,\n        set_name TEXT NOT NULL,\n        card_number TEXT NOT NULL DEFAULT '',\n        language TEXT NOT NULL DEFAULT 'english',\n        thumbnail TEXT,\n        price_gbp REAL,\n        identification TEXT NOT NULL DEFAULT '{}',\n        tcg_api_results TEXT NOT NULL DEFAULT '[]',\n        pcv_results TEXT NOT NULL DEFAULT '[]',\n        scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n      );\n      ALTER TABLE pokescan_users ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ;\n      ALTER TABLE pokescan_users ADD COLUMN IF NOT EXISTS ban_reason TEXT;\n      ALTER TABLE pokescan_users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;\n      ALTER TABLE pokescan_users ADD COLUMN IF NOT EXISTS banned_by VARCHAR(36);\n      ALTER TABLE pokescan_users ADD COLUMN IF NOT EXISTS is_trial_used BOOLEAN NOT NULL DEFAULT FALSE;\n      ALTER TABLE pokescan_admin_activity_log ADD COLUMN IF NOT EXISTS target_user_id VARCHAR(36);\n      ALTER TABLE pokescan_admin_activity_log ADD COLUMN IF NOT EXISTS target_username TEXT;\n      CREATE TABLE IF NOT EXISTS pokescan_blocked_credentials (\n        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,\n        email TEXT,\n        mobile_number TEXT,\n        reason TEXT NOT NULL DEFAULT 'deleted',\n        blocked_by VARCHAR(36),\n        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n      );\n      CREATE INDEX IF NOT EXISTS idx_blocked_creds_email ON pokescan_blocked_credentials(LOWER(email));\n      CREATE INDEX IF NOT EXISTS idx_blocked_creds_mobile ON pokescan_blocked_credentials(mobile_number);\n      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS variant_id TEXT;\n      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'scrydex';\n      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'GBP';\n      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS tcg_low REAL;\n      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS tcg_mid REAL;\n      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS tcg_high REAL;\n      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS tcg_market REAL;\n      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS tcg_direct_low REAL;\n      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS cardmarket_avg REAL;\n      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS cardmarket_low REAL;\n      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS cardmarket_trend REAL;\n      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS ebay_sold_average REAL;\n      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS psa10_price REAL;\n      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS psa9_price REAL;\n      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS raw_price REAL;\n      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS price_gbp REAL;\n      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS confidence_score REAL DEFAULT 1;\n      ALTER TABLE card_pricing ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();\n      CREATE UNIQUE INDEX IF NOT EXISTS idx_card_pricing_variant_id ON card_pricing(variant_id) WHERE variant_id IS NOT NULL;\n      ALTER TABLE ebay_prices ADD COLUMN IF NOT EXISTS variant_id TEXT;\n      ALTER TABLE ebay_prices ADD COLUMN IF NOT EXISTS card_id VARCHAR REFERENCES pokemon_cards(id);\n      ALTER TABLE ebay_prices ADD COLUMN IF NOT EXISTS title TEXT;\n      ALTER TABLE ebay_prices ADD COLUMN IF NOT EXISTS price REAL;\n      ALTER TABLE ebay_prices ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'GBP';\n      ALTER TABLE ebay_prices ADD COLUMN IF NOT EXISTS sold_date TEXT;\n      ALTER TABLE ebay_prices ADD COLUMN IF NOT EXISTS listing_url TEXT;\n      ALTER TABLE ebay_prices ADD COLUMN IF NOT EXISTS is_sold BOOLEAN DEFAULT TRUE;\n      ALTER TABLE ebay_prices ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ DEFAULT NOW();\n      CREATE UNIQUE INDEX IF NOT EXISTS idx_ebay_prices_variant_id ON ebay_prices(variant_id) WHERE variant_id IS NOT NULL;\n      CREATE TABLE IF NOT EXISTS card_price_history (\n        id SERIAL PRIMARY KEY,\n        variant_id TEXT NOT NULL REFERENCES pokemon_card_variants(id) ON DELETE CASCADE,\n        source TEXT NOT NULL,\n        price REAL,\n        currency TEXT DEFAULT 'GBP',\n        fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n      );\n      CREATE INDEX IF NOT EXISTS idx_card_price_history_variant_id ON card_price_history(variant_id);\n      ALTER TABLE card_pricing ALTER COLUMN \"variantId\" DROP NOT NULL;\n    ")];
                case 1:
                    _a.sent();
                    console.log("[Migration] Schema migrations applied");
                    return [3 /*break*/, 3];
                case 2:
                    err_2 = _a.sent();
                    console.error("[Migration] Failed:", err_2);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// ─── Moderation helpers ───────────────────────────────────────────────────────
function logModAction(opts) {
    return __awaiter(this, void 0, void 0, function () {
        var e_3;
        var _a, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    _f.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, db_1.db.insert(schema_1.pokescanAdminActivityLog).values({
                            action: opts.action,
                            performedBy: opts.performedBy,
                            targetUserId: (_a = opts.targetUserId) !== null && _a !== void 0 ? _a : null,
                            targetUsername: (_b = opts.targetUsername) !== null && _b !== void 0 ? _b : null,
                            listingId: (_c = opts.listingId) !== null && _c !== void 0 ? _c : null,
                            listingName: (_d = opts.listingName) !== null && _d !== void 0 ? _d : null,
                            note: (_e = opts.note) !== null && _e !== void 0 ? _e : null,
                        })];
                case 1:
                    _f.sent();
                    return [3 /*break*/, 3];
                case 2:
                    e_3 = _f.sent();
                    console.warn("[ActivityLog] write failed:", e_3 === null || e_3 === void 0 ? void 0 : e_3.message);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function cancelStripeForUser(userId_1) {
    return __awaiter(this, arguments, void 0, function (userId, immediate) {
        var u, subId, getUncachableStripeClient, stripe, e_4, e_5;
        if (immediate === void 0) { immediate = true; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 12, , 13]);
                    return [4 /*yield*/, storage_1.storage.getUserById(userId)];
                case 1:
                    u = _a.sent();
                    if (!u)
                        return [2 /*return*/];
                    subId = u.stripeSubscriptionId;
                    if (!subId) return [3 /*break*/, 10];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 9, , 10]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("./stripe-client"); })];
                case 3:
                    getUncachableStripeClient = (_a.sent()).getUncachableStripeClient;
                    return [4 /*yield*/, getUncachableStripeClient()];
                case 4:
                    stripe = _a.sent();
                    if (!immediate) return [3 /*break*/, 6];
                    return [4 /*yield*/, stripe.subscriptions.cancel(subId)];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 8];
                case 6: return [4 /*yield*/, stripe.subscriptions.update(subId, { cancel_at_period_end: true })];
                case 7:
                    _a.sent();
                    _a.label = 8;
                case 8:
                    console.log("[Mod] Cancelled Stripe sub ".concat(subId, " for user ").concat(userId, " (immediate=").concat(immediate, ")"));
                    return [3 /*break*/, 10];
                case 9:
                    e_4 = _a.sent();
                    console.error("[Mod] Stripe cancel failed for ".concat(userId, ":"), e_4 === null || e_4 === void 0 ? void 0 : e_4.message);
                    return [3 /*break*/, 10];
                case 10: return [4 /*yield*/, storage_1.storage.updateUser(userId, {
                        isPremium: false,
                        subscriptionStatus: "canceled",
                        stripeSubscriptionId: null,
                    })];
                case 11:
                    _a.sent();
                    return [3 /*break*/, 13];
                case 12:
                    e_5 = _a.sent();
                    console.warn("[Mod] cancelStripeForUser error:", e_5 === null || e_5 === void 0 ? void 0 : e_5.message);
                    return [3 /*break*/, 13];
                case 13: return [2 /*return*/];
            }
        });
    });
}
function isCredentialBlocked(email, mobile) {
    return __awaiter(this, void 0, void 0, function () {
        var conds, params, r;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!email && !mobile)
                        return [2 /*return*/, false];
                    conds = [];
                    params = [];
                    if (email) {
                        params.push(email.toLowerCase().trim());
                        conds.push("LOWER(email) = $".concat(params.length));
                    }
                    if (mobile) {
                        params.push(mobile.trim());
                        conds.push("mobile_number = $".concat(params.length));
                    }
                    return [4 /*yield*/, db_1.pool.query("SELECT 1 FROM pokescan_blocked_credentials WHERE ".concat(conds.join(" OR "), " LIMIT 1"), params)];
                case 1:
                    r = _a.sent();
                    return [2 /*return*/, r.rows.length > 0];
            }
        });
    });
}
function addBlockedCredential(email, mobile, reason, blockedBy) {
    return __awaiter(this, void 0, void 0, function () {
        var e_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!email && !mobile)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, db_1.pool.query("INSERT INTO pokescan_blocked_credentials (email, mobile_number, reason, blocked_by) VALUES ($1, $2, $3, $4)", [email ? email.toLowerCase().trim() : null, mobile ? mobile.trim() : null, reason, blockedBy])];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_6 = _a.sent();
                    console.warn("[Mod] addBlockedCredential failed:", e_6 === null || e_6 === void 0 ? void 0 : e_6.message);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function registerRoutes(app) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            (0, card_sync_1.startSyncService)().catch(function (e) { return console.error("[CardSync] startSyncService failed:", e); });
            seedSuperadmin().catch(function (e) { return console.error("[seedSuperadmin] failed:", e); });
            runSchemaMigrations().catch(function (e) { return console.error("[Migration] failed:", e); });
            app.get("/api/config", function (_req, res) {
                res.json(appConfig);
            });
            app.patch("/api/admin/config", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var updates;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, isSuperadminAuthorized(req)];
                        case 1:
                            if (!(_b.sent())) {
                                res.status(403).json({ error: "Forbidden" });
                                return [2 /*return*/];
                            }
                            updates = (_a = req.body) !== null && _a !== void 0 ? _a : {};
                            if (typeof updates.maintenanceMode === "boolean") {
                                appConfig.maintenanceMode = updates.maintenanceMode;
                            }
                            if (typeof updates.scannerEnabled === "boolean") {
                                appConfig.scannerEnabled = updates.scannerEnabled;
                            }
                            res.json({ success: true, config: appConfig });
                            return [2 /*return*/];
                    }
                });
            }); });
            app.get("/api/pokemon/sets", function (_req, res) { return __awaiter(_this, void 0, void 0, function () {
                var dbSets, dbError_1, controller_1, timeout, response, data, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, db_1.db
                                    .select()
                                    .from(schema_1.pokemonSets)
                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.isNull)(schema_1.pokemonSets.deletedAt), (0, drizzle_orm_1.exists)(db_1.db
                                    .select({ id: schema_1.pokemonCards.id })
                                    .from(schema_1.pokemonCards)
                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokemonCards.setId, schema_1.pokemonSets.id), (0, drizzle_orm_1.isNull)(schema_1.pokemonCards.deletedAt)))), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.pokemonSets.hidden, false), (0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["", " IS NULL"], ["", " IS NULL"])), schema_1.pokemonSets.hidden))))
                                    .orderBy((0, drizzle_orm_1.desc)(schema_1.pokemonSets.releaseDate))];
                        case 1:
                            dbSets = _a.sent();
                            if (dbSets.length > 0) {
                                res.json({ data: dbSets.map(dbSetToApiFormat), count: dbSets.length, source: "db" });
                                return [2 /*return*/];
                            }
                            return [3 /*break*/, 3];
                        case 2:
                            dbError_1 = _a.sent();
                            console.error("DB sets query failed, falling back to API:", dbError_1);
                            return [3 /*break*/, 3];
                        case 3:
                            _a.trys.push([3, 6, , 7]);
                            controller_1 = new AbortController();
                            timeout = setTimeout(function () { return controller_1.abort(); }, 10000);
                            return [4 /*yield*/, fetch("".concat(POKEMON_API, "/sets?orderBy=-releaseDate&pageSize=250"), { signal: controller_1.signal })];
                        case 4:
                            response = _a.sent();
                            clearTimeout(timeout);
                            if (!response.ok)
                                throw new Error("TCG API returned ".concat(response.status));
                            return [4 /*yield*/, response.json()];
                        case 5:
                            data = _a.sent();
                            res.json(data);
                            return [3 /*break*/, 7];
                        case 6:
                            error_1 = _a.sent();
                            console.error("Failed to fetch sets:", error_1);
                            res.status(500).json({ error: "Failed to fetch sets" });
                            return [3 /*break*/, 7];
                        case 7: return [2 /*return*/];
                    }
                });
            }); });
            app.get("/api/pokemon/sets/:setId/cards", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                // ─── Market Listings ────────────────────────────────────────────────────────────
                // Helper to parse a DB row into a client-safe listing object
                function rowToListing(row) {
                    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
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
                        priceGBP: (_a = row.price_gbp) !== null && _a !== void 0 ? _a : null,
                        condition: row.condition,
                        description: (_b = row.description) !== null && _b !== void 0 ? _b : "",
                        photos: (function () { var _a; try {
                            return JSON.parse((_a = row.photos) !== null && _a !== void 0 ? _a : "[]");
                        }
                        catch (_b) {
                            return [];
                        } })(),
                        status: (_c = row.status) !== null && _c !== void 0 ? _c : "approved",
                        reviewedBy: (_d = row.reviewed_by) !== null && _d !== void 0 ? _d : null,
                        reviewedAt: (_e = row.reviewed_at) !== null && _e !== void 0 ? _e : null,
                        reviewNote: (_f = row.review_note) !== null && _f !== void 0 ? _f : null,
                        reviewNoteUpdatedBy: (_h = (_g = row.review_note_updated_by_username) !== null && _g !== void 0 ? _g : row.review_note_updated_by) !== null && _h !== void 0 ? _h : null,
                        reviewNoteUpdatedAt: (_j = row.review_note_updated_at) !== null && _j !== void 0 ? _j : null,
                        externalUrl: (_k = row.external_url) !== null && _k !== void 0 ? _k : null,
                        createdAt: row.created_at,
                    };
                }
                // ─── Social helpers ──────────────────────────────────────────────────────────
                function getUserFromToken(req) {
                    return __awaiter(this, void 0, void 0, function () {
                        var token, user;
                        var _a;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                    if (!token)
                                        return [2 /*return*/, null];
                                    return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                case 1:
                                    user = _b.sent();
                                    if (!user)
                                        return [2 /*return*/, null];
                                    return [2 /*return*/, { id: user.id, username: user.username, displayName: user.displayName }];
                            }
                        });
                    });
                }
                var setId_1, page, pageSize, offset, cacheKey, memHit, nonEnglishPatterns, isNonEnglish, _a, totalCountResult, setInfoResult, totalCount, setRow, expectedTotal, hasCards, fullySeeded, dbCards, cardMap, _i, dbCards_1, _b, card, variant, existing, formattedCards, payload, controller_2, timeout, response, data, error_2, isStaffRole_1, ADMIN_DB_TABLES_1, httpServer;
                var _this = this;
                var _c, _d, _e, _f;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0:
                            _g.trys.push([0, , 10, 11]);
                            setId_1 = req.params.setId;
                            page = parseInt(req.query.page || "1", 10);
                            pageSize = parseInt(req.query.pageSize || "250", 10);
                            offset = (page - 1) * pageSize;
                            cacheKey = "".concat(setId_1, ":").concat(page, ":").concat(pageSize);
                            memHit = getMemCache(cacheKey);
                            if (memHit) {
                                res.json(memHit);
                                return [2 /*return*/];
                            }
                            nonEnglishPatterns = ["_ja", "_ko", "_zh", "_cn", "topsun", "babanuki", "mengka", "oldmaid", "hanafuda", "_pocket"];
                            isNonEnglish = nonEnglishPatterns.some(function (p) { return setId_1.toLowerCase().includes(p); });
                            _g.label = 1;
                        case 1:
                            _g.trys.push([1, 8, , 9]);
                            return [4 /*yield*/, Promise.all([
                                    db_1.db.select({ count: (0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["count(*)::int"], ["count(*)::int"]))) }).from(schema_1.pokemonCards).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokemonCards.setId, setId_1), (0, drizzle_orm_1.isNull)(schema_1.pokemonCards.deletedAt))),
                                    db_1.db.select().from(schema_1.pokemonSets).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokemonSets.id, setId_1), (0, drizzle_orm_1.isNull)(schema_1.pokemonSets.deletedAt))).limit(1),
                                ])];
                        case 2:
                            _a = _g.sent(), totalCountResult = _a[0], setInfoResult = _a[1];
                            totalCount = (_d = (_c = totalCountResult[0]) === null || _c === void 0 ? void 0 : _c.count) !== null && _d !== void 0 ? _d : 0;
                            setRow = (_e = setInfoResult[0]) !== null && _e !== void 0 ? _e : null;
                            expectedTotal = (_f = setRow === null || setRow === void 0 ? void 0 : setRow.total) !== null && _f !== void 0 ? _f : 0;
                            hasCards = totalCount > 0;
                            fullySeeded = hasCards && (isNonEnglish || expectedTotal === 0 || totalCount >= Math.floor(expectedTotal * 0.9));
                            return [4 /*yield*/, db_1.db
                                    .select({
                                    card: schema_1.pokemonCards,
                                    variant: schema_1.pokemonCardVariants,
                                })
                                    .from(schema_1.pokemonCards)
                                    .leftJoin(schema_1.pokemonCardVariants, (0, drizzle_orm_1.eq)(schema_1.pokemonCardVariants.cardId, schema_1.pokemonCards.id))
                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokemonCards.setId, setId_1), (0, drizzle_orm_1.isNull)(schema_1.pokemonCards.deletedAt)))
                                    .orderBy(schema_1.pokemonCards.number)];
                        case 3:
                            dbCards = _g.sent();
                            console.log("[SetCards] ".concat(setId_1, ": dbCards=").concat(totalCount, " expected=").concat(expectedTotal, " rows=").concat(dbCards.length, " fullySeeded=").concat(fullySeeded));
                            if (!(fullySeeded && dbCards.length > 0)) return [3 /*break*/, 4];
                            cardMap = new Map();
                            for (_i = 0, dbCards_1 = dbCards; _i < dbCards_1.length; _i++) {
                                _b = dbCards_1[_i], card = _b.card, variant = _b.variant;
                                existing = cardMap.get(card.id);
                                if (!existing) {
                                    existing = __assign(__assign({}, dbVariantToApiFormat(card, null)), { cardId: card.id, variants: [] });
                                    if (setRow) {
                                        existing.set = dbSetToApiFormat(setRow);
                                    }
                                    cardMap.set(card.id, existing);
                                }
                                // Push variant data
                                existing.variants.push({
                                    variantId: (variant === null || variant === void 0 ? void 0 : variant.id) || "".concat(card.id, "-standard"),
                                    finishType: (variant === null || variant === void 0 ? void 0 : variant.finishType) || "Non-Holo",
                                    editionType: (variant === null || variant === void 0 ? void 0 : variant.editionType) || "Standard",
                                    variantLabel: (variant === null || variant === void 0 ? void 0 : variant.variantLabel) || "Standard",
                                    isStamped: (variant === null || variant === void 0 ? void 0 : variant.isStamped) || false,
                                    language: (variant === null || variant === void 0 ? void 0 : variant.language) || "EN",
                                    images: (variant === null || variant === void 0 ? void 0 : variant.imageUrl)
                                        ? {
                                            small: variant.imageUrl,
                                            large: variant.imageUrl,
                                        }
                                        : existing.images,
                                });
                            }
                            formattedCards = Array.from(cardMap.values());
                            console.log("[SetCards] ".concat(setId_1, ": serving ").concat(formattedCards.length, " grouped cards from DB"));
                            payload = {
                                data: formattedCards,
                                count: formattedCards.length,
                                totalCount: formattedCards.length,
                                page: page,
                                source: "db-variants",
                            };
                            setMemCache(cacheKey, payload);
                            warmCardCache(formattedCards);
                            res.json(payload);
                            return [2 /*return*/];
                        case 4:
                            controller_2 = new AbortController();
                            timeout = setTimeout(function () { return controller_2.abort(); }, 30000);
                            return [4 /*yield*/, fetch("".concat(POKEMON_API, "/cards?q=set.id:").concat(setId_1, "&orderBy=number&page=").concat(page, "&pageSize=").concat(pageSize), { signal: controller_2.signal, headers: tcgHeaders() })];
                        case 5:
                            response = _g.sent();
                            clearTimeout(timeout);
                            if (!response.ok)
                                throw new Error("TCG API ".concat(response.status));
                            return [4 /*yield*/, response.json()];
                        case 6:
                            data = _g.sent();
                            // Cache the result and warm the individual card cache
                            setMemCache(cacheKey, data);
                            warmCardCache(data.data || []);
                            res.json(data);
                            // 4. Background: seed all pages of this set's cards into DB for future fast loads
                            (function () { return __awaiter(_this, void 0, void 0, function () {
                                var bgPage, seeded, _loop_1, state_1, _i, _a, k, bgErr_1;
                                var _b, _c, _d;
                                return __generator(this, function (_e) {
                                    switch (_e.label) {
                                        case 0:
                                            _e.trys.push([0, 4, , 5]);
                                            bgPage = 1;
                                            seeded = 0;
                                            _loop_1 = function () {
                                                var ctrl2, t2, r2, d2, cards2, _f, cards2_1, card, _g;
                                                return __generator(this, function (_h) {
                                                    switch (_h.label) {
                                                        case 0:
                                                            ctrl2 = new AbortController();
                                                            t2 = setTimeout(function () { return ctrl2.abort(); }, 30000);
                                                            return [4 /*yield*/, fetch("".concat(POKEMON_API, "/cards?q=set.id:").concat(setId_1, "&orderBy=number&page=").concat(bgPage, "&pageSize=250"), { signal: ctrl2.signal })];
                                                        case 1:
                                                            r2 = _h.sent();
                                                            clearTimeout(t2);
                                                            if (!r2.ok)
                                                                return [2 /*return*/, "break"];
                                                            return [4 /*yield*/, r2.json()];
                                                        case 2:
                                                            d2 = _h.sent();
                                                            cards2 = d2.data || [];
                                                            if (cards2.length === 0)
                                                                return [2 /*return*/, "break"];
                                                            _f = 0, cards2_1 = cards2;
                                                            _h.label = 3;
                                                        case 3:
                                                            if (!(_f < cards2_1.length)) return [3 /*break*/, 8];
                                                            card = cards2_1[_f];
                                                            _h.label = 4;
                                                        case 4:
                                                            _h.trys.push([4, 6, , 7]);
                                                            return [4 /*yield*/, db_1.db.insert(schema_1.pokemonCards).values({
                                                                    id: card.id,
                                                                    setId: ((_b = card.set) === null || _b === void 0 ? void 0 : _b.id) || setId_1,
                                                                    name: card.name,
                                                                    number: card.number,
                                                                    rarity: card.rarity || null,
                                                                    supertype: card.supertype || null,
                                                                    subtypes: Array.isArray(card.subtypes) ? card.subtypes.join(",") : null,
                                                                    hp: card.hp || null,
                                                                    artist: card.artist || null,
                                                                    imageSmall: ((_c = card.images) === null || _c === void 0 ? void 0 : _c.small) || null,
                                                                    imageLarge: ((_d = card.images) === null || _d === void 0 ? void 0 : _d.large) || null,
                                                                }).onConflictDoNothing()];
                                                        case 5:
                                                            _h.sent();
                                                            return [3 /*break*/, 7];
                                                        case 6:
                                                            _g = _h.sent();
                                                            return [3 /*break*/, 7];
                                                        case 7:
                                                            _f++;
                                                            return [3 /*break*/, 3];
                                                        case 8:
                                                            seeded += cards2.length;
                                                            if (cards2.length < 250)
                                                                return [2 /*return*/, "break"];
                                                            bgPage++;
                                                            return [2 /*return*/];
                                                    }
                                                });
                                            };
                                            _e.label = 1;
                                        case 1:
                                            if (!true) return [3 /*break*/, 3];
                                            return [5 /*yield**/, _loop_1()];
                                        case 2:
                                            state_1 = _e.sent();
                                            if (state_1 === "break")
                                                return [3 /*break*/, 3];
                                            return [3 /*break*/, 1];
                                        case 3:
                                            if (seeded > 0) {
                                                console.log("[BgSeed] Seeded ".concat(seeded, " cards for set ").concat(setId_1));
                                                // Invalidate mem cache so next request reads from DB
                                                for (_i = 0, _a = setCardsMemCache.keys(); _i < _a.length; _i++) {
                                                    k = _a[_i];
                                                    if (k.startsWith("".concat(setId_1, ":")))
                                                        setCardsMemCache.delete(k);
                                                }
                                            }
                                            return [3 /*break*/, 5];
                                        case 4:
                                            bgErr_1 = _e.sent();
                                            return [3 /*break*/, 5];
                                        case 5: return [2 /*return*/];
                                    }
                                });
                            }); });
                            _g.label = 7;
                        case 7: return [3 /*break*/, 9];
                        case 8:
                            error_2 = _g.sent();
                            if ((error_2 === null || error_2 === void 0 ? void 0 : error_2.name) === "AbortError") {
                                res.status(504).json({ error: "Cards took too long to load. Please try again." });
                            }
                            else {
                                console.error("Failed to fetch set cards:", error_2);
                                res.status(500).json({ error: "Failed to fetch cards. Please try again." });
                            }
                            return [3 /*break*/, 9];
                        case 9:
                            app.get("/api/pokemon/cards/search", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var query, page_1, pageSize_1, offset_1, dbResults, formatted, totalCountResult, totalCount, dbErr_1, ctrl_1, timer, encodedQuery, response, text, data, apiErr_1, error_3;
                                var _a, _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _c.trys.push([0, 12, , 13]);
                                            query = req.query.q;
                                            if (!query || query.trim().length < 2) {
                                                res.json({ data: [], count: 0, totalCount: 0 });
                                                return [2 /*return*/];
                                            }
                                            page_1 = parseInt(String(req.query.page || "1"), 10);
                                            pageSize_1 = 20;
                                            offset_1 = (page_1 - 1) * pageSize_1;
                                            _c.label = 1;
                                        case 1:
                                            _c.trys.push([1, 5, , 6]);
                                            return [4 /*yield*/, db_1.db
                                                    .select({ card: schema_1.pokemonCards, set: schema_1.pokemonSets })
                                                    .from(schema_1.pokemonCards)
                                                    .leftJoin(schema_1.pokemonSets, (0, drizzle_orm_1.eq)(schema_1.pokemonCards.setId, schema_1.pokemonSets.id))
                                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.ilike)(schema_1.pokemonCards.name, "%".concat(query.trim(), "%")), (0, drizzle_orm_1.isNull)(schema_1.pokemonCards.deletedAt)))
                                                    .orderBy((0, drizzle_orm_1.desc)(schema_1.pokemonSets.releaseDate))
                                                    .limit(pageSize_1)
                                                    .offset(offset_1)];
                                        case 2:
                                            dbResults = _c.sent();
                                            if (!(dbResults.length > 0)) return [3 /*break*/, 4];
                                            formatted = dbResults.map(function (_a) {
                                                var _b;
                                                var card = _a.card, set = _a.set;
                                                var base = dbVariantToApiFormat(card, null);
                                                if (set) {
                                                    base.set = {
                                                        id: set.id,
                                                        name: set.name,
                                                        series: (_b = set.series) !== null && _b !== void 0 ? _b : undefined,
                                                        printedTotal: set.printedTotal,
                                                        total: set.total,
                                                        releaseDate: set.releaseDate,
                                                        images: { symbol: set.symbolUrl, logo: set.logoUrl },
                                                    };
                                                }
                                                return base;
                                            });
                                            return [4 /*yield*/, db_1.db
                                                    .select({ count: (0, drizzle_orm_1.sql)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["count(*)::int"], ["count(*)::int"]))) })
                                                    .from(schema_1.pokemonCards)
                                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.ilike)(schema_1.pokemonCards.name, "%".concat(query.trim(), "%")), (0, drizzle_orm_1.isNull)(schema_1.pokemonCards.deletedAt)))];
                                        case 3:
                                            totalCountResult = _c.sent();
                                            totalCount = (_b = (_a = totalCountResult[0]) === null || _a === void 0 ? void 0 : _a.count) !== null && _b !== void 0 ? _b : formatted.length;
                                            res.json({ data: formatted, count: formatted.length, totalCount: totalCount, source: "db" });
                                            return [2 /*return*/];
                                        case 4: return [3 /*break*/, 6];
                                        case 5:
                                            dbErr_1 = _c.sent();
                                            console.error("DB card search failed, falling back to API:", dbErr_1);
                                            return [3 /*break*/, 6];
                                        case 6:
                                            ctrl_1 = new AbortController();
                                            timer = setTimeout(function () { return ctrl_1.abort(); }, 12000);
                                            _c.label = 7;
                                        case 7:
                                            _c.trys.push([7, 10, , 11]);
                                            encodedQuery = encodeURIComponent("name:\"".concat(query.trim(), "*\""));
                                            return [4 /*yield*/, fetch("".concat(POKEMON_API, "/cards?q=").concat(encodedQuery, "&orderBy=-set.releaseDate&page=").concat(page_1, "&pageSize=").concat(pageSize_1), { signal: ctrl_1.signal, headers: tcgHeaders() })];
                                        case 8:
                                            response = _c.sent();
                                            clearTimeout(timer);
                                            return [4 /*yield*/, response.text()];
                                        case 9:
                                            text = _c.sent();
                                            if (!response.ok) {
                                                console.error("Pokemon TCG API error ".concat(response.status, ": ").concat(text.substring(0, 200)));
                                                res.json({ data: [], count: 0, totalCount: 0 });
                                                return [2 /*return*/];
                                            }
                                            data = JSON.parse(text);
                                            res.json(data);
                                            return [3 /*break*/, 11];
                                        case 10:
                                            apiErr_1 = _c.sent();
                                            clearTimeout(timer);
                                            if (apiErr_1.name === "AbortError") {
                                                res.json({ data: [], count: 0, totalCount: 0, error: "Search timed out" });
                                            }
                                            else {
                                                console.error("Failed to search cards:", apiErr_1);
                                                res.json({ data: [], count: 0, totalCount: 0 });
                                            }
                                            return [3 /*break*/, 11];
                                        case 11: return [3 /*break*/, 13];
                                        case 12:
                                            error_3 = _c.sent();
                                            console.error("Failed to search cards:", error_3);
                                            res.json({ data: [], count: 0, totalCount: 0 });
                                            return [3 /*break*/, 13];
                                        case 13: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.get("/api/pokemon/sets/:setId/all-cards", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var setId_2, setInfoResult, expectedTotal, dbCountResult, dbCount, fullySeeded, dbCards, formattedCards, allCards, page_2, hasMore, response, text, data, cards, error_4;
                                var _a, _b, _c, _d;
                                return __generator(this, function (_e) {
                                    switch (_e.label) {
                                        case 0:
                                            _e.trys.push([0, 9, , 10]);
                                            setId_2 = req.params.setId;
                                            return [4 /*yield*/, db_1.db
                                                    .select({ total: schema_1.pokemonSets.total })
                                                    .from(schema_1.pokemonSets)
                                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokemonSets.id, setId_2), (0, drizzle_orm_1.isNull)(schema_1.pokemonSets.deletedAt)))
                                                    .limit(1)];
                                        case 1:
                                            setInfoResult = _e.sent();
                                            expectedTotal = (_b = (_a = setInfoResult[0]) === null || _a === void 0 ? void 0 : _a.total) !== null && _b !== void 0 ? _b : 0;
                                            return [4 /*yield*/, db_1.db
                                                    .select({ count: (0, drizzle_orm_1.sql)(templateObject_4 || (templateObject_4 = __makeTemplateObject(["count(*)::int"], ["count(*)::int"]))) })
                                                    .from(schema_1.pokemonCards)
                                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokemonCards.setId, setId_2), (0, drizzle_orm_1.isNull)(schema_1.pokemonCards.deletedAt)))];
                                        case 2:
                                            dbCountResult = _e.sent();
                                            dbCount = (_d = (_c = dbCountResult[0]) === null || _c === void 0 ? void 0 : _c.count) !== null && _d !== void 0 ? _d : 0;
                                            fullySeeded = expectedTotal > 0 && dbCount >= Math.floor(expectedTotal * 0.9);
                                            if (!fullySeeded) return [3 /*break*/, 4];
                                            return [4 /*yield*/, db_1.db
                                                    .select({
                                                    card: schema_1.pokemonCards,
                                                    variant: schema_1.pokemonCardVariants,
                                                })
                                                    .from(schema_1.pokemonCards)
                                                    .leftJoin(schema_1.pokemonCardVariants, (0, drizzle_orm_1.eq)(schema_1.pokemonCardVariants.cardId, schema_1.pokemonCards.id))
                                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokemonCards.setId, setId_2), (0, drizzle_orm_1.isNull)(schema_1.pokemonCards.deletedAt)))
                                                    .orderBy(schema_1.pokemonCards.number)];
                                        case 3:
                                            dbCards = _e.sent();
                                            formattedCards = dbCards.map(function (_a) {
                                                var card = _a.card, variant = _a.variant;
                                                var f = dbVariantToApiFormat(card, null);
                                                // Keep card.id — do NOT overwrite with variant.id
                                                f.cardId = card.id;
                                                if (variant) {
                                                    f.variantId = variant.id;
                                                    f.finishType = variant.finishType;
                                                    f.editionType = variant.editionType;
                                                    f.variantLabel = variant.variantLabel;
                                                    f.isStamped = variant.isStamped;
                                                    f.language = variant.language;
                                                    if (variant.imageUrl) {
                                                        f.images = { small: variant.imageUrl, large: variant.imageUrl };
                                                    }
                                                }
                                                else {
                                                    f.finishType = "Non-Holo";
                                                    f.variantLabel = "Standard";
                                                }
                                                return f;
                                            });
                                            res.json({
                                                data: formattedCards,
                                                count: formattedCards.length,
                                            });
                                            return [2 /*return*/];
                                        case 4:
                                            allCards = [];
                                            page_2 = 1;
                                            hasMore = true;
                                            _e.label = 5;
                                        case 5:
                                            if (!hasMore) return [3 /*break*/, 8];
                                            return [4 /*yield*/, fetch("".concat(POKEMON_API, "/cards?q=set.id:").concat(setId_2, "&orderBy=number&page=").concat(page_2, "&pageSize=250"))];
                                        case 6:
                                            response = _e.sent();
                                            return [4 /*yield*/, response.text()];
                                        case 7:
                                            text = _e.sent();
                                            if (!response.ok)
                                                return [3 /*break*/, 8];
                                            try {
                                                data = JSON.parse(text);
                                                cards = data.data || [];
                                                allCards = allCards.concat(cards);
                                                hasMore =
                                                    allCards.length < (data.totalCount || 0) &&
                                                        cards.length === 250;
                                                page_2++;
                                            }
                                            catch (_f) {
                                                return [3 /*break*/, 8];
                                            }
                                            return [3 /*break*/, 5];
                                        case 8:
                                            res.json({
                                                data: allCards,
                                                count: allCards.length,
                                            });
                                            return [3 /*break*/, 10];
                                        case 9:
                                            error_4 = _e.sent();
                                            console.error("Failed to fetch all set cards:", error_4);
                                            res.status(500).json({ error: "Failed to fetch cards" });
                                            return [3 /*break*/, 10];
                                        case 10: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.get("/api/pokemon/cards/find", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var name_1, number, setId_3, query, encodedQuery, text, cards, data, numOnly_1, exact, error_5;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 2, , 3]);
                                            name_1 = req.query.name;
                                            number = req.query.number;
                                            setId_3 = req.query.setId;
                                            if (!name_1) {
                                                res.status(400).json({ error: "name is required" });
                                                return [2 /*return*/];
                                            }
                                            query = "name:\"".concat(name_1, "\"");
                                            if (setId_3)
                                                query += " set.id:".concat(setId_3);
                                            encodedQuery = encodeURIComponent(query);
                                            return [4 /*yield*/, fetch("".concat(POKEMON_API, "/cards?q=").concat(encodedQuery, "&orderBy=-set.releaseDate&pageSize=20")).then(function (r) { return r.text(); }).catch(function () { return null; })];
                                        case 1:
                                            text = _a.sent();
                                            if (!text) {
                                                res.json({ data: null });
                                                return [2 /*return*/];
                                            }
                                            cards = [];
                                            try {
                                                data = JSON.parse(text);
                                                cards = data.data || [];
                                            }
                                            catch (_b) {
                                                res.json({ data: null });
                                                return [2 /*return*/];
                                            }
                                            if (number && cards.length > 1) {
                                                numOnly_1 = String(number).split("/")[0].replace(/^0+/, "");
                                                exact = cards.filter(function (c) {
                                                    var cn = String(c.number).replace(/^0+/, "");
                                                    return cn === numOnly_1;
                                                });
                                                if (exact.length > 0)
                                                    cards = exact;
                                            }
                                            res.json({ data: cards[0] || null });
                                            return [3 /*break*/, 3];
                                        case 2:
                                            error_5 = _a.sent();
                                            console.error("Failed to find card:", error_5);
                                            res.json({ data: null });
                                            return [3 /*break*/, 3];
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.get("/api/pokemon/cards/:cardId", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var cardId, cached, resolvedCardId, dbCard, pricing, ebayData, formattedCard, setData, cardAbort_1, cardTimeout, response, contentType, data, error_6;
                                var _a, _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _c.trys.push([0, 11, , 12]);
                                            cardId = req.params.cardId;
                                            cached = getCardCache(cardId);
                                            if (cached) {
                                                res.json(cached);
                                                return [2 /*return*/];
                                            }
                                            resolvedCardId = cardId.replace(/-(normal|holo|holofoil|reverse|reverseHolofoil|default|non-holo|1stEditionHolofoil|1stEditionNormal)$/i, "");
                                            return [4 /*yield*/, db_1.db
                                                    .select()
                                                    .from(schema_1.pokemonCards)
                                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokemonCards.id, resolvedCardId), (0, drizzle_orm_1.isNull)(schema_1.pokemonCards.deletedAt)))
                                                    .limit(1)];
                                        case 1:
                                            dbCard = _c.sent();
                                            if (!(dbCard.length > 0)) return [3 /*break*/, 5];
                                            return [4 /*yield*/, db_1.db
                                                    .select()
                                                    .from(schema_1.cardPricing)
                                                    .where((0, drizzle_orm_1.eq)(schema_1.cardPricing.variantId, resolvedCardId))
                                                    .limit(1)];
                                        case 2:
                                            pricing = _c.sent();
                                            return [4 /*yield*/, db_1.db
                                                    .select()
                                                    .from(schema_1.ebayPrices)
                                                    .where((0, drizzle_orm_1.eq)(schema_1.ebayPrices.cardId, resolvedCardId))
                                                    .orderBy((0, drizzle_orm_1.desc)(schema_1.ebayPrices.fetchedAt))
                                                    .limit(10)];
                                        case 3:
                                            ebayData = _c.sent();
                                            formattedCard = dbVariantToApiFormat(dbCard[0], (_a = pricing[0]) !== null && _a !== void 0 ? _a : null, ebayData);
                                            return [4 /*yield*/, db_1.db
                                                    .select()
                                                    .from(schema_1.pokemonSets)
                                                    .where((0, drizzle_orm_1.eq)(schema_1.pokemonSets.id, dbCard[0].setId))
                                                    .limit(1)];
                                        case 4:
                                            setData = _c.sent();
                                            if (setData.length > 0) {
                                                formattedCard.set = dbSetToApiFormat(setData[0]);
                                            }
                                            res.json({ data: formattedCard, source: "db" });
                                            return [2 /*return*/];
                                        case 5:
                                            cardAbort_1 = new AbortController();
                                            cardTimeout = setTimeout(function () { return cardAbort_1.abort(); }, 15000);
                                            response = void 0;
                                            _c.label = 6;
                                        case 6:
                                            _c.trys.push([6, , 8, 9]);
                                            return [4 /*yield*/, fetch("".concat(POKEMON_API, "/cards/").concat(resolvedCardId), { signal: cardAbort_1.signal })];
                                        case 7:
                                            response = _c.sent();
                                            return [3 /*break*/, 9];
                                        case 8:
                                            clearTimeout(cardTimeout);
                                            return [7 /*endfinally*/];
                                        case 9:
                                            contentType = response.headers.get("content-type") || "";
                                            if (!response.ok || !contentType.includes("application/json")) {
                                                res.status(502).json({ error: "Card not available right now. Please try again." });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, response.json()];
                                        case 10:
                                            data = _c.sent();
                                            // Cache the fetched card so retries and subsequent views are instant
                                            if ((_b = data === null || data === void 0 ? void 0 : data.data) === null || _b === void 0 ? void 0 : _b.id) {
                                                setCardCache(data.data.id, data);
                                            }
                                            res.json(data);
                                            return [3 /*break*/, 12];
                                        case 11:
                                            error_6 = _c.sent();
                                            if ((error_6 === null || error_6 === void 0 ? void 0 : error_6.name) === "AbortError") {
                                                res.status(504).json({ error: "Card took too long to load. Please try again." });
                                                return [2 /*return*/];
                                            }
                                            console.error("Failed to fetch card:", error_6);
                                            res.status(500).json({ error: "Failed to fetch card" });
                                            return [3 /*break*/, 12];
                                        case 12: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.get("/api/sync/status", function (_req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var status_1, error_7;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 2, , 3]);
                                            return [4 /*yield*/, (0, card_sync_1.getSyncStatus)()];
                                        case 1:
                                            status_1 = _a.sent();
                                            res.json({ data: status_1 });
                                            return [3 /*break*/, 3];
                                        case 2:
                                            error_7 = _a.sent();
                                            console.error("Failed to get sync status:", error_7);
                                            res.status(500).json({ error: "Failed to get sync status" });
                                            return [3 /*break*/, 3];
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/sync/trigger", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var syncSecret, authHeader, isDevMode;
                                return __generator(this, function (_a) {
                                    try {
                                        syncSecret = process.env.SYNC_SECRET;
                                        authHeader = req.headers["x-sync-secret"];
                                        isDevMode = process.env.NODE_ENV === "development";
                                        if (syncSecret) {
                                            if (authHeader !== syncSecret) {
                                                res.status(401).json({ error: "Unauthorized: valid x-sync-secret header required" });
                                                return [2 /*return*/];
                                            }
                                        }
                                        else if (!isDevMode) {
                                            res.status(403).json({ error: "Forbidden: set SYNC_SECRET environment variable to enable manual sync in production" });
                                            return [2 /*return*/];
                                        }
                                        (0, card_sync_1.runFullSync)(true).catch(function (err) { return console.error("[CardSync] Manual sync error:", err); });
                                        res.json({ message: "Sync triggered", running: true });
                                    }
                                    catch (error) {
                                        console.error("Failed to trigger sync:", error);
                                        res.status(500).json({ error: "Failed to trigger sync" });
                                    }
                                    return [2 /*return*/];
                                });
                            }); });
                            app.get("/api/pcv/sets", function (_req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var sets, error_8;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 2, , 3]);
                                            return [4 /*yield*/, (0, pokecardvalues_scraper_1.scrapeSets)()];
                                        case 1:
                                            sets = _a.sent();
                                            res.json({ data: sets, count: sets.length });
                                            return [3 /*break*/, 3];
                                        case 2:
                                            error_8 = _a.sent();
                                            console.error("Failed to scrape PCV sets:", error_8);
                                            res.status(500).json({ error: "Failed to fetch UK card sets" });
                                            return [3 /*break*/, 3];
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.get("/api/pcv/sets/:setId/:slug/cards", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var _a, setId_4, slug, cards, error_9;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 2, , 3]);
                                            _a = req.params, setId_4 = _a.setId, slug = _a.slug;
                                            return [4 /*yield*/, (0, pokecardvalues_scraper_1.scrapeSetCards)(setId_4, slug)];
                                        case 1:
                                            cards = _b.sent();
                                            res.json({ data: cards, count: cards.length });
                                            return [3 /*break*/, 3];
                                        case 2:
                                            error_9 = _b.sent();
                                            console.error("Failed to scrape PCV set cards:", error_9);
                                            res.status(500).json({ error: "Failed to fetch UK card data" });
                                            return [3 /*break*/, 3];
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.get("/api/pcv/top/:condition", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var condition, topCards, error_10;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 2, , 3]);
                                            condition = req.params.condition;
                                            return [4 /*yield*/, (0, pokecardvalues_scraper_1.scrapeTopCards)(condition)];
                                        case 1:
                                            topCards = _a.sent();
                                            res.json({ data: topCards, count: topCards.length });
                                            return [3 /*break*/, 3];
                                        case 2:
                                            error_10 = _a.sent();
                                            console.error("Failed to scrape PCV top cards:", error_10);
                                            res.status(500).json({ error: "Failed to fetch top valued cards" });
                                            return [3 /*break*/, 3];
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.get("/api/pcv/search", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var query, cards, error_11;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 2, , 3]);
                                            query = req.query.q;
                                            if (!query) {
                                                res.json({ data: [], count: 0 });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, (0, pokecardvalues_scraper_1.scrapeCardSearch)(query)];
                                        case 1:
                                            cards = _a.sent();
                                            res.json({ data: cards, count: cards.length });
                                            return [3 /*break*/, 3];
                                        case 2:
                                            error_11 = _a.sent();
                                            console.error("Failed to search PCV cards:", error_11);
                                            res.status(500).json({ error: "Failed to search UK cards" });
                                            return [3 /*break*/, 3];
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.get("/api/ebay/search-url", function (req, res) {
                                var cardName = req.query.cardName;
                                var setName = req.query.setName;
                                var number = req.query.number;
                                if (!cardName) {
                                    res.status(400).json({ error: "cardName is required" });
                                    return;
                                }
                                res.json({
                                    searchUrl: (0, pokecardvalues_scraper_1.generateEbaySearchUrl)(cardName, setName, number),
                                    soldUrl: (0, pokecardvalues_scraper_1.generateEbaySoldUrl)(cardName, setName, number),
                                });
                            });
                            app.get("/api/ebay/sold-price", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                function scrapeEbaySoldPrices(query) {
                                    return __awaiter(this, void 0, void 0, function () {
                                        var searchParams, ebayUrl, html, prices, $_1, patterns, _i, patterns_1, pattern, _a, _b, m, price;
                                        return __generator(this, function (_c) {
                                            switch (_c.label) {
                                                case 0:
                                                    searchParams = new URLSearchParams({
                                                        _nkw: query,
                                                        _sacat: "183454",
                                                        LH_Complete: "1",
                                                        LH_Sold: "1",
                                                        LH_PrefLoc: "1",
                                                        _sop: "13",
                                                    });
                                                    ebayUrl = "https://www.ebay.co.uk/sch/i.html?".concat(searchParams);
                                                    return [4 /*yield*/, fetch(ebayUrl, {
                                                            headers: {
                                                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                                                                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                                                                "Accept-Language": "en-GB,en;q=0.9",
                                                            },
                                                        }).then(function (r) { return r.text(); })];
                                                case 1:
                                                    html = _c.sent();
                                                    prices = [];
                                                    // Primary: cheerio with the correct eBay price selector
                                                    try {
                                                        $_1 = cheerio.load(html);
                                                        $_1(".s-item__price").each(function (_, el) {
                                                            var text = $_1(el).text().trim();
                                                            // Handle ranges like "£3.50 to £5.00" — take the lower value
                                                            var match = text.match(/£([\d,]+\.?\d*)/);
                                                            if (match) {
                                                                var price = parseFloat(match[1].replace(/,/g, ""));
                                                                if (price >= 0.5 && price <= 5000)
                                                                    prices.push(price);
                                                            }
                                                        });
                                                    }
                                                    catch (_) { }
                                                    // Fallback regex patterns if cheerio found nothing
                                                    if (prices.length === 0) {
                                                        patterns = [
                                                            /s-item__price[^>]*>\s*£([\d,]+\.?\d*)/g,
                                                            /class="BOLD[^"]*">\s*£([\d,]+\.?\d*)/g,
                                                            /itemprop="price"[^>]*content="([\d.]+)"/g,
                                                        ];
                                                        for (_i = 0, patterns_1 = patterns; _i < patterns_1.length; _i++) {
                                                            pattern = patterns_1[_i];
                                                            for (_a = 0, _b = html.matchAll(pattern); _a < _b.length; _a++) {
                                                                m = _b[_a];
                                                                price = parseFloat(m[1].replace(/,/g, ""));
                                                                if (price >= 0.5 && price <= 5000)
                                                                    prices.push(price);
                                                            }
                                                            if (prices.length >= 3)
                                                                break;
                                                        }
                                                    }
                                                    // Deduplicate and cap
                                                    return [2 /*return*/, __spreadArray([], new Set(prices), true).slice(0, 20)];
                                            }
                                        });
                                    });
                                }
                                function computeStats(prices) {
                                    if (prices.length === 0)
                                        return { lowest: null, median: null, highest: null };
                                    var sorted = __spreadArray([], prices, true).sort(function (a, b) { return a - b; });
                                    var mid = Math.floor(sorted.length / 2);
                                    var median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
                                    return {
                                        lowest: Math.round(sorted[0] * 100) / 100,
                                        median: Math.round(median * 100) / 100,
                                        highest: Math.round(sorted[sorted.length - 1] * 100) / 100,
                                    };
                                }
                                function scrapeGradedMedian(baseQuery, grader, grade) {
                                    return __awaiter(this, void 0, void 0, function () {
                                        var altGrader, query, prices, stats, _a;
                                        return __generator(this, function (_b) {
                                            switch (_b.label) {
                                                case 0:
                                                    _b.trys.push([0, 2, , 3]);
                                                    altGrader = grader === "Beckett" ? "BGS" : null;
                                                    query = "".concat(baseQuery, " ").concat(altGrader !== null && altGrader !== void 0 ? altGrader : grader, " ").concat(grade, " pokemon card");
                                                    return [4 /*yield*/, scrapeEbaySoldPrices(query)];
                                                case 1:
                                                    prices = _b.sent();
                                                    stats = computeStats(prices);
                                                    return [2 /*return*/, stats.median];
                                                case 2:
                                                    _a = _b.sent();
                                                    return [2 /*return*/, null];
                                                case 3: return [2 /*return*/];
                                            }
                                        });
                                    });
                                }
                                function getValCached(r) {
                                    return r.status === "fulfilled" ? r.value : null;
                                }
                                function getVal(r) {
                                    return r.status === "fulfilled" ? r.value : null;
                                }
                                var _a, cardName, setName, number, cardId, cached, cacheAge, prices, stats_1, cardBase_1, _b, psa9_1, psa10_1, beckett9_1, beckett10_1, ace9_1, ace10_1, cgc9_1, cgc10_1, gradedPrices_1, numberFirst, queries, rawPrices, _i, queries_1, q, stats, _1, cardBase, _c, psa9, psa10, beckett9, beckett10, ace9, ace10, cgc9, cgc10, gradedPrices, error_12;
                                return __generator(this, function (_d) {
                                    switch (_d.label) {
                                        case 0:
                                            _a = req.query, cardName = _a.cardName, setName = _a.setName, number = _a.number, cardId = _a.cardId;
                                            if (!cardName) {
                                                res.status(400).json({ error: "cardName required" });
                                                return [2 /*return*/];
                                            }
                                            _d.label = 1;
                                        case 1:
                                            _d.trys.push([1, 15, , 16]);
                                            if (!cardId) return [3 /*break*/, 4];
                                            return [4 /*yield*/, db_1.db
                                                    .select()
                                                    .from(schema_1.ebayPrices)
                                                    .where((0, drizzle_orm_1.eq)(schema_1.ebayPrices.cardId, cardId))
                                                    .orderBy((0, drizzle_orm_1.desc)(schema_1.ebayPrices.fetchedAt))
                                                    .limit(20)];
                                        case 2:
                                            cached = _d.sent();
                                            if (!(cached.length > 0)) return [3 /*break*/, 4];
                                            cacheAge = Date.now() - new Date(cached[0].fetchedAt).getTime();
                                            if (!(cacheAge < 24 * 60 * 60 * 1000)) return [3 /*break*/, 4];
                                            prices = cached.map(function (r) { return r.price; }).filter(function (p) { return p !== null && p > 0; });
                                            if (!(prices.length > 0)) return [3 /*break*/, 4];
                                            stats_1 = computeStats(prices);
                                            cardBase_1 = "".concat(cardName).concat(setName ? " " + setName : "");
                                            return [4 /*yield*/, Promise.allSettled([
                                                    scrapeGradedMedian(cardBase_1, "PSA", 9),
                                                    scrapeGradedMedian(cardBase_1, "PSA", 10),
                                                    scrapeGradedMedian(cardBase_1, "Beckett", 9),
                                                    scrapeGradedMedian(cardBase_1, "Beckett", 10),
                                                    scrapeGradedMedian(cardBase_1, "ACE", 9),
                                                    scrapeGradedMedian(cardBase_1, "ACE", 10),
                                                    scrapeGradedMedian(cardBase_1, "CGC", 9),
                                                    scrapeGradedMedian(cardBase_1, "CGC", 10),
                                                ])];
                                        case 3:
                                            _b = _d.sent(), psa9_1 = _b[0], psa10_1 = _b[1], beckett9_1 = _b[2], beckett10_1 = _b[3], ace9_1 = _b[4], ace10_1 = _b[5], cgc9_1 = _b[6], cgc10_1 = _b[7];
                                            gradedPrices_1 = {
                                                PSA: { 9: getValCached(psa9_1), 10: getValCached(psa10_1) },
                                                Beckett: { 9: getValCached(beckett9_1), 10: getValCached(beckett10_1) },
                                                ACE: { 9: getValCached(ace9_1), 10: getValCached(ace10_1) },
                                                CGC: { 9: getValCached(cgc9_1), 10: getValCached(cgc10_1) },
                                            };
                                            res.json({
                                                price: stats_1.median,
                                                lowestSold: stats_1.lowest,
                                                medianSold: stats_1.median,
                                                highestSold: stats_1.highest,
                                                source: "eBay UK (Sold)",
                                                count: prices.length,
                                                cached: true,
                                                gradedPrices: gradedPrices_1,
                                            });
                                            return [2 /*return*/];
                                        case 4:
                                            numberFirst = number ? number.split("/")[0].replace(/^0+/, "") : null;
                                            queries = [];
                                            if (setName)
                                                queries.push("".concat(cardName, " pokemon ").concat(setName));
                                            if (numberFirst && parseInt(numberFirst, 10) > 0)
                                                queries.push("".concat(cardName, " pokemon ").concat(numberFirst));
                                            queries.push("".concat(cardName, " pokemon card"));
                                            rawPrices = [];
                                            _i = 0, queries_1 = queries;
                                            _d.label = 5;
                                        case 5:
                                            if (!(_i < queries_1.length)) return [3 /*break*/, 8];
                                            q = queries_1[_i];
                                            return [4 /*yield*/, scrapeEbaySoldPrices(q)];
                                        case 6:
                                            rawPrices = _d.sent();
                                            if (rawPrices.length >= 3)
                                                return [3 /*break*/, 8];
                                            _d.label = 7;
                                        case 7:
                                            _i++;
                                            return [3 /*break*/, 5];
                                        case 8:
                                            if (rawPrices.length === 0) {
                                                res.json({ price: null, lowestSold: null, medianSold: null, highestSold: null, source: "eBay UK (Sold)", count: 0, gradedPrices: null });
                                                return [2 /*return*/];
                                            }
                                            stats = computeStats(rawPrices);
                                            if (!(cardId && rawPrices.length > 0)) return [3 /*break*/, 13];
                                            _d.label = 9;
                                        case 9:
                                            _d.trys.push([9, 12, , 13]);
                                            return [4 /*yield*/, db_1.db.delete(schema_1.ebayPrices).where((0, drizzle_orm_1.eq)(schema_1.ebayPrices.cardId, cardId))];
                                        case 10:
                                            _d.sent();
                                            return [4 /*yield*/, db_1.db.insert(schema_1.ebayPrices).values(rawPrices.map(function (price) { return ({
                                                    cardId: cardId,
                                                    price: price,
                                                    currency: "GBP",
                                                    isSold: true,
                                                    fetchedAt: new Date(),
                                                }); }))];
                                        case 11:
                                            _d.sent();
                                            return [3 /*break*/, 13];
                                        case 12:
                                            _1 = _d.sent();
                                            return [3 /*break*/, 13];
                                        case 13:
                                            cardBase = "".concat(cardName).concat(setName ? " " + setName : "");
                                            return [4 /*yield*/, Promise.allSettled([
                                                    scrapeGradedMedian(cardBase, "PSA", 9),
                                                    scrapeGradedMedian(cardBase, "PSA", 10),
                                                    scrapeGradedMedian(cardBase, "Beckett", 9),
                                                    scrapeGradedMedian(cardBase, "Beckett", 10),
                                                    scrapeGradedMedian(cardBase, "ACE", 9),
                                                    scrapeGradedMedian(cardBase, "ACE", 10),
                                                    scrapeGradedMedian(cardBase, "CGC", 9),
                                                    scrapeGradedMedian(cardBase, "CGC", 10),
                                                ])];
                                        case 14:
                                            _c = _d.sent(), psa9 = _c[0], psa10 = _c[1], beckett9 = _c[2], beckett10 = _c[3], ace9 = _c[4], ace10 = _c[5], cgc9 = _c[6], cgc10 = _c[7];
                                            gradedPrices = {
                                                PSA: { 9: getVal(psa9), 10: getVal(psa10) },
                                                Beckett: { 9: getVal(beckett9), 10: getVal(beckett10) },
                                                ACE: { 9: getVal(ace9), 10: getVal(ace10) },
                                                CGC: { 9: getVal(cgc9), 10: getVal(cgc10) },
                                            };
                                            res.json({
                                                price: stats.median,
                                                lowestSold: stats.lowest,
                                                medianSold: stats.median,
                                                highestSold: stats.highest,
                                                source: "eBay UK (Sold)",
                                                count: rawPrices.length,
                                                gradedPrices: gradedPrices,
                                            });
                                            return [3 /*break*/, 16];
                                        case 15:
                                            error_12 = _d.sent();
                                            console.error("eBay price fetch error:", error_12);
                                            res.status(500).json({ error: error_12.message || "Failed to fetch eBay prices" });
                                            return [3 /*break*/, 16];
                                        case 16: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/identify-card", express_1.default.json({ limit: "15mb" }), function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var _a, imageBase64, mode, isNumberStripMode, authToken, stripResponse, stripPromise, stripTimeoutPromise, aiErr_1, stripContent, stripResult, setReference, response, aiPromise, timeoutPromise, aiErr_2, content, identification, scanUser, result, pcvResults, numberOnly_1, filtered, e_7, tcgApiResults, cardName, origName, nameConditions, dbMatches, formatted, aiCode_1, codeMatch, aiSet_1, setMatch, numOnly_2, exactMatch, dbErr_2, encodedQuery, apiCtrl_1, apiTimer, tcgRes, tcgData, numOnly_3, exactMatch, e_8, error_13;
                                var _b, _c, _d, _e, _f, _g, _h;
                                return __generator(this, function (_j) {
                                    switch (_j.label) {
                                        case 0:
                                            _j.trys.push([0, 29, , 30]);
                                            _a = req.body, imageBase64 = _a.imageBase64, mode = _a.mode;
                                            if (!imageBase64) {
                                                res.status(400).json({ error: "imageBase64 is required" });
                                                return [2 /*return*/];
                                            }
                                            isNumberStripMode = mode === "number-strip";
                                            authToken = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", "");
                                            if (!isNumberStripMode) return [3 /*break*/, 5];
                                            stripResponse = void 0;
                                            _j.label = 1;
                                        case 1:
                                            _j.trys.push([1, 3, , 4]);
                                            stripPromise = openai.chat.completions.create({
                                                model: "gpt-5.2",
                                                messages: [
                                                    {
                                                        role: "system",
                                                        content: "You are examining a close-up photo of the bottom edge of a Pok\u00E9mon card. This strip contains the collector number and possibly a set code and regulation mark.\n\nREAD THESE THREE ELEMENTS:\n\n1. COLLECTOR NUMBER (bottom-left area of the strip):\n   Formats: \"025/198\" \u00B7 \"001/078\" \u00B7 \"SV049\" \u00B7 \"TG15/TG30\" \u00B7 \"SWSH001\"\n   Japanese modern format: \"A5C 043/066\" \u2014 the letters/numbers BEFORE the space are the SET CODE, the \"043/066\" is the collector number.\n   Read each digit carefully. Common confusions: 0\u21948, 6\u21949, 1\u21947 \u2014 look at the shape.\n\n2. SET CODE (short alphanumeric code near the collector number):\n   Examples: \"A5C\" \"A3a\" \"B3a\" \"A1\" \"SV09\" \"sv6pt5\" \"SWSH\" \"XY\" \"BW\"\n   Usually 2-6 characters. May appear before the slash number (Japanese) or stamped near it (English).\n   Report EXACTLY what is printed \u2014 do not invent a code.\n\n3. REGULATION MARK (a single letter inside a rounded box or circle):\n   Letters used: A B C D E F G H\n   Located near the collector number. Very small but clearly stamped.\n\nRespond with valid JSON in this EXACT format:\n{\n  \"cardNumber\": \"043/066\",\n  \"setCode\": \"A5C\",\n  \"regulationMark\": \"H\",\n  \"confidence\": \"high\",\n  \"notes\": \"Set code A5C clearly printed before the number\"\n}\n\nRules:\n- \"cardNumber\": full collector number as printed. Empty string ONLY if truly unreadable.\n- \"setCode\": code as printed if visible, otherwise \"\".\n- \"regulationMark\": single letter if visible, otherwise \"\".\n- \"confidence\": \"high\"=fully clear \u00B7 \"medium\"=some digits uncertain \u00B7 \"low\"=unreadable.\n- NEVER invent digits you cannot see. If a digit is uncertain, use \"medium\" and note which one."
                                                    },
                                                    {
                                                        role: "user",
                                                        content: [
                                                            {
                                                                type: "text",
                                                                text: "Read the collector number, set code, and regulation mark from this Pokémon card bottom strip. Return the JSON."
                                                            },
                                                            {
                                                                type: "image_url",
                                                                image_url: {
                                                                    url: imageBase64.startsWith("data:") ? imageBase64 : "data:image/jpeg;base64,".concat(imageBase64),
                                                                    detail: "high"
                                                                }
                                                            }
                                                        ]
                                                    }
                                                ],
                                                response_format: { type: "json_object" },
                                                max_completion_tokens: 300,
                                            });
                                            stripTimeoutPromise = new Promise(function (_, reject) {
                                                return setTimeout(function () { return reject(Object.assign(new Error("AI identification timed out. Please try again."), { isTimeout: true })); }, 30000);
                                            });
                                            return [4 /*yield*/, Promise.race([stripPromise, stripTimeoutPromise])];
                                        case 2:
                                            stripResponse = _j.sent();
                                            return [3 /*break*/, 4];
                                        case 3:
                                            aiErr_1 = _j.sent();
                                            if (aiErr_1.isTimeout || aiErr_1.name === "AbortError" || aiErr_1.code === "ERR_CANCELED") {
                                                res.status(408).json({ error: aiErr_1.message || "AI identification timed out. Please try again." });
                                                return [2 /*return*/];
                                            }
                                            throw aiErr_1;
                                        case 4:
                                            stripContent = (_d = (_c = stripResponse.choices[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content;
                                            if (!stripContent) {
                                                res.status(500).json({ error: "AI returned empty response" });
                                                return [2 /*return*/];
                                            }
                                            stripResult = JSON.parse(stripContent);
                                            res.json({
                                                cardNumber: stripResult.cardNumber || "",
                                                setCode: stripResult.setCode || "",
                                                regulationMark: stripResult.regulationMark || "",
                                                confidence: stripResult.confidence || "low",
                                                notes: stripResult.notes || "",
                                            });
                                            return [2 /*return*/];
                                        case 5: return [4 /*yield*/, buildSetReferencePrompt()];
                                        case 6:
                                            setReference = _j.sent();
                                            response = void 0;
                                            _j.label = 7;
                                        case 7:
                                            _j.trys.push([7, 9, , 10]);
                                            aiPromise = openai.chat.completions.create({
                                                model: "gpt-5.2",
                                                messages: [
                                                    {
                                                        role: "system",
                                                        content: "You are a Pok\u00E9mon TCG card identification system. Your job is to read what is physically printed on the card and return it as structured JSON. Study every visible detail of the image carefully.\n\n\u2550\u2550 CARD LAYOUT \u2014 WHERE EACH ELEMENT LIVES \u2550\u2550\n\nBOTTOM STRIP (examine this area FIRST and most carefully):\n\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n\u2502 [SET CODE] [Collector No.]   [Rarity \u25CF\u25C6\u2605]  [Reg. Mark \u00A9]   \u2502\n\u2502 e.g.  \"A5C  043/066\"   or   \"025/198\"   or   \"SV049\"        \u2502\n\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\n\u2022 The COLLECTOR NUMBER is at the bottom-LEFT in small (~8pt) text.\n\u2022 English format: \"025/198\" \u00B7 \"TG15/TG30\" \u00B7 \"SV049\" \u00B7 \"SWSH001\"\n\u2022 Japanese/Asian format: a short SET CODE (e.g. \"A5C\") appears directly BEFORE the slash number \u2014 e.g. \"A5C 043/066\". The code before the space IS the setCode.\n\u2022 REGULATION MARK: a single letter (A\u2013H) stamped in a rounded box near the number.\n\nSET SYMBOL (expansion icon):\n\u2022 English cards: small logo icon at the BOTTOM-RIGHT of the illustration window (between art and card text).\n\u2022 Japanese cards: small icon near the collector number strip.\n\nCARD NAME: large text at the very TOP of the card.\nHP: large number at the top-right (e.g. \"120 HP\"). Do NOT confuse with collector number.\n\n\u2550\u2550 LANGUAGE DETECTION \u2014 DO THIS FIRST \u2550\u2550\n\u2022 English: Latin script, \"Illus.\" credit\n\u2022 Japanese: hiragana / katakana / kanji characters\n\u2022 Korean: Hangul (\uAC00\uB098\uB2E4 style)\n\u2022 Chinese (Traditional): Chinese characters, typically no furigana\n\n\u2550\u2550 STEP-BY-STEP IDENTIFICATION \u2550\u2550\n\nStep 1 \u2014 LANGUAGE: Identify from the script on the card.\n\nStep 2 \u2014 COLLECTOR NUMBER: Read the bottom-left text digit by digit.\n  \u2022 0 is perfectly round, 8 has two distinct loops, 6 opens to the right, 9 opens to the left, 1 is straight.\n  \u2022 Write both parts: e.g. \"043\" and \"066\" \u2192 \"043/066\". Include leading zeros.\n  \u2022 If the format has a prefix (like \"SV\" or \"SWSH\"), include it: \"SV049\".\n\nStep 3 \u2014 SET CODE: Report the short printed code (2\u20136 alphanumeric chars) if visible.\n  \u2022 Japanese/Korean/Chinese modern: code before the slash number (A5C, A3a, B3a, A1, A2a\u2026)\n  \u2022 English: code may be printed near the regulation mark (sv1, sv4pt5, swsh1, xy1, bw1\u2026)\n  \u2022 Copy it EXACTLY as printed \u2014 do not guess or invent a code.\n\nStep 4 \u2014 CARD NAME: Read from the top of the card exactly as printed.\n\nStep 5 \u2014 HOLO TYPE from the card's surface finish:\n  \u2022 Non-Holo: completely flat/matte\n  \u2022 Holo: shiny holographic illustration, matte border\n  \u2022 Reverse Holo: shiny/sparkly border, flat illustration\n  \u2022 Full Art: illustration bleeds to card edges, no standard border\n  \u2022 Special Art Rare / Illustration Rare: large painted full-bleed illustration\n  \u2022 Secret Rare / Rainbow Rare / Gold: gold or rainbow texture\n\n\u2550\u2550 CONFIDENCE \u2550\u2550\n\u2022 \"high\": clearly read the full collector number AND card name; set identified\n\u2022 \"medium\": name is clear but number is partially obscured, or set is uncertain\n\u2022 \"low\": image is too blurry, angled, or cut off \u2014 never invent a number\n\n\u2550\u2550 CARD BACK \u2550\u2550\nIf the image shows the Pok\u00E9mon card back (blue oval, Pok\u00E9 Ball, \"Pok\u00E9mon\" text), return:\n{\"isCardBack\":true,\"englishName\":\"\",\"cardNumber\":\"\",\"setCode\":\"\",\"setName\":\"\",\"language\":\"\",\"holoType\":\"\",\"rarity\":\"\",\"confidence\":\"low\",\"originalName\":\"\",\"notes\":\"Card back\"}\n\n\u2550\u2550 RESPONSE FORMAT \u2550\u2550\n{\n  \"isCardBack\": false,\n  \"englishName\": \"Pikachu\",\n  \"cardNumber\": \"025/198\",\n  \"setCode\": \"sv1\",\n  \"setName\": \"Scarlet & Violet\",\n  \"language\": \"English\",\n  \"holoType\": \"Holo\",\n  \"rarity\": \"Rare\",\n  \"confidence\": \"high\",\n  \"originalName\": \"\u30D4\u30AB\u30C1\u30E5\u30A6\",\n  \"notes\": \"Regulation mark G; set code sv1 visible near number\"\n}\n\n\u2022 \"englishName\": English translation of the card name\n\u2022 \"originalName\": name exactly as printed on the card\n\u2022 \"setCode\": the short printed code (2\u20136 chars). Empty string \"\" if not visible.\n\u2022 \"notes\": include regulation mark letter, any codes spotted, legibility observations\n\n".concat(setReference)
                                                    },
                                                    {
                                                        role: "user",
                                                        content: [
                                                            {
                                                                type: "text",
                                                                text: "Identify this Pokémon card. Start by zooming into the BOTTOM-LEFT corner to read the small collector number (e.g. '025/198'). Then read the card name from the top. Return the JSON."
                                                            },
                                                            {
                                                                type: "image_url",
                                                                image_url: {
                                                                    url: imageBase64.startsWith("data:") ? imageBase64 : "data:image/jpeg;base64,".concat(imageBase64),
                                                                    detail: "high"
                                                                }
                                                            }
                                                        ]
                                                    }
                                                ],
                                                response_format: { type: "json_object" },
                                                max_completion_tokens: 800,
                                            });
                                            timeoutPromise = new Promise(function (_, reject) {
                                                return setTimeout(function () { return reject(Object.assign(new Error("AI identification timed out. Please try again."), { isTimeout: true })); }, 30000);
                                            });
                                            return [4 /*yield*/, Promise.race([aiPromise, timeoutPromise])];
                                        case 8:
                                            response = _j.sent();
                                            return [3 /*break*/, 10];
                                        case 9:
                                            aiErr_2 = _j.sent();
                                            if (aiErr_2.isTimeout || aiErr_2.name === "AbortError" || aiErr_2.code === "ERR_CANCELED") {
                                                res.status(408).json({ error: aiErr_2.message || "AI identification timed out. Please try again." });
                                                return [2 /*return*/];
                                            }
                                            throw aiErr_2;
                                        case 10:
                                            content = (_f = (_e = response.choices[0]) === null || _e === void 0 ? void 0 : _e.message) === null || _f === void 0 ? void 0 : _f.content;
                                            if (!content) {
                                                res.status(500).json({ error: "AI returned empty response" });
                                                return [2 /*return*/];
                                            }
                                            identification = JSON.parse(content);
                                            // ── Card back detected — return early, no quota consumed ──────────────
                                            if (identification.isCardBack === true) {
                                                res.json({ isCardBack: true });
                                                return [2 /*return*/];
                                            }
                                            if (!authToken) return [3 /*break*/, 13];
                                            return [4 /*yield*/, storage_1.storage.validateSession(authToken)];
                                        case 11:
                                            scanUser = _j.sent();
                                            if (!(scanUser && !scanUser.isPremium)) return [3 /*break*/, 13];
                                            return [4 /*yield*/, (0, scan_quota_1.consumeScan)(scanUser.id)];
                                        case 12:
                                            result = _j.sent();
                                            if (!result.allowed) {
                                                res.status(429).json({
                                                    error: "Daily scan limit reached",
                                                    freeRemaining: 0,
                                                    bonusRemaining: 0,
                                                    message: "You've used all your scans for today. Come back tomorrow or upgrade to Premium for unlimited scans.",
                                                });
                                                return [2 /*return*/];
                                            }
                                            _j.label = 13;
                                        case 13:
                                            pcvResults = [];
                                            _j.label = 14;
                                        case 14:
                                            _j.trys.push([14, 16, , 17]);
                                            return [4 /*yield*/, (0, pokecardvalues_scraper_1.scrapeCardSearch)(identification.englishName)];
                                        case 15:
                                            pcvResults = _j.sent();
                                            if (identification.cardNumber && pcvResults.length > 1) {
                                                numberOnly_1 = identification.cardNumber.split("/")[0].replace(/^0+/, "");
                                                filtered = pcvResults.filter(function (c) {
                                                    var _a;
                                                    var cNum = (_a = c.number) === null || _a === void 0 ? void 0 : _a.split("/")[0].replace(/^0+/, "");
                                                    return cNum === numberOnly_1;
                                                });
                                                if (filtered.length > 0)
                                                    pcvResults = filtered;
                                            }
                                            return [3 /*break*/, 17];
                                        case 16:
                                            e_7 = _j.sent();
                                            console.error("PCV search after identification failed:", e_7);
                                            return [3 /*break*/, 17];
                                        case 17:
                                            tcgApiResults = [];
                                            _j.label = 18;
                                        case 18:
                                            _j.trys.push([18, 21, , 22]);
                                            cardName = (_g = identification.englishName) === null || _g === void 0 ? void 0 : _g.trim();
                                            origName = (_h = identification.originalName) === null || _h === void 0 ? void 0 : _h.trim();
                                            if (!(cardName && cardName.length >= 2)) return [3 /*break*/, 20];
                                            nameConditions = [(0, drizzle_orm_1.ilike)(schema_1.pokemonCards.name, "%".concat(cardName, "%"))];
                                            if (origName && origName !== cardName) {
                                                nameConditions.push((0, drizzle_orm_1.ilike)(schema_1.pokemonCards.name, "%".concat(origName, "%")));
                                            }
                                            return [4 /*yield*/, db_1.db
                                                    .select({ card: schema_1.pokemonCards, set: schema_1.pokemonSets, pricing: schema_1.cardPricing })
                                                    .from(schema_1.pokemonCards)
                                                    .leftJoin(schema_1.pokemonSets, (0, drizzle_orm_1.eq)(schema_1.pokemonCards.setId, schema_1.pokemonSets.id))
                                                    .leftJoin(schema_1.cardPricing, (0, drizzle_orm_1.eq)(schema_1.cardPricing.variantId, schema_1.pokemonCards.id))
                                                    .where((0, drizzle_orm_1.and)(drizzle_orm_1.or.apply(void 0, nameConditions), (0, drizzle_orm_1.isNull)(schema_1.pokemonCards.deletedAt)))
                                                    .orderBy((0, drizzle_orm_1.desc)(schema_1.pokemonSets.releaseDate))
                                                    .limit(20)];
                                        case 19:
                                            dbMatches = _j.sent();
                                            if (dbMatches.length > 0) {
                                                formatted = dbMatches.map(function (_a) {
                                                    var _b;
                                                    var card = _a.card, set = _a.set, pricing = _a.pricing;
                                                    var base = dbVariantToApiFormat(card, pricing !== null && pricing !== void 0 ? pricing : null);
                                                    if (set) {
                                                        base.set = {
                                                            id: set.id,
                                                            name: set.name,
                                                            series: (_b = set.series) !== null && _b !== void 0 ? _b : undefined,
                                                            printedTotal: set.printedTotal,
                                                            total: set.total,
                                                            releaseDate: set.releaseDate,
                                                            images: { symbol: set.symbolUrl, logo: set.logoUrl },
                                                        };
                                                    }
                                                    return base;
                                                });
                                                // 1a. Filter by set CODE (most precise — exact ID match)
                                                if (identification.setCode && formatted.length > 1) {
                                                    aiCode_1 = identification.setCode.toLowerCase().trim();
                                                    codeMatch = formatted.filter(function (c) {
                                                        var _a, _b;
                                                        var dbId = ((_b = (_a = c.set) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : "").toLowerCase();
                                                        return dbId === aiCode_1 || dbId.startsWith(aiCode_1) || aiCode_1.startsWith(dbId);
                                                    });
                                                    if (codeMatch.length > 0)
                                                        formatted = codeMatch;
                                                }
                                                // 1b. Filter by set name if still multiple matches
                                                if (identification.setName && formatted.length > 1) {
                                                    aiSet_1 = identification.setName.toLowerCase();
                                                    setMatch = formatted.filter(function (c) {
                                                        var _a, _b;
                                                        var dbSet = ((_b = (_a = c.set) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "").toLowerCase();
                                                        return dbSet.includes(aiSet_1) || aiSet_1.includes(dbSet);
                                                    });
                                                    if (setMatch.length > 0)
                                                        formatted = setMatch;
                                                }
                                                // 1c. Filter by card number
                                                if (identification.cardNumber && formatted.length > 1) {
                                                    numOnly_2 = identification.cardNumber.split("/")[0].replace(/^0+/, "");
                                                    exactMatch = formatted.filter(function (c) {
                                                        var cn = String(c.number).replace(/^0+/, "");
                                                        return cn === numOnly_2;
                                                    });
                                                    if (exactMatch.length > 0)
                                                        formatted = exactMatch;
                                                }
                                                // 1c. Sort: prefer cards that have a card image (imageSmall not null)
                                                formatted.sort(function (a, b) {
                                                    var _a, _b;
                                                    var aHasImg = ((_a = a.images) === null || _a === void 0 ? void 0 : _a.small) ? 1 : 0;
                                                    var bHasImg = ((_b = b.images) === null || _b === void 0 ? void 0 : _b.small) ? 1 : 0;
                                                    return bHasImg - aHasImg;
                                                });
                                                tcgApiResults = formatted;
                                            }
                                            _j.label = 20;
                                        case 20: return [3 /*break*/, 22];
                                        case 21:
                                            dbErr_2 = _j.sent();
                                            console.error("DB card search after identification failed:", dbErr_2);
                                            return [3 /*break*/, 22];
                                        case 22:
                                            if (!(tcgApiResults.length === 0)) return [3 /*break*/, 28];
                                            _j.label = 23;
                                        case 23:
                                            _j.trys.push([23, 27, , 28]);
                                            encodedQuery = encodeURIComponent("name:\"".concat(identification.englishName, "\""));
                                            apiCtrl_1 = new AbortController();
                                            apiTimer = setTimeout(function () { return apiCtrl_1.abort(); }, 10000);
                                            return [4 /*yield*/, fetch("".concat(POKEMON_API, "/cards?q=").concat(encodedQuery, "&orderBy=-set.releaseDate&pageSize=10"), { signal: apiCtrl_1.signal, headers: tcgHeaders() })];
                                        case 24:
                                            tcgRes = _j.sent();
                                            clearTimeout(apiTimer);
                                            if (!tcgRes.ok) return [3 /*break*/, 26];
                                            return [4 /*yield*/, tcgRes.json()];
                                        case 25:
                                            tcgData = _j.sent();
                                            tcgApiResults = tcgData.data || [];
                                            if (identification.cardNumber && tcgApiResults.length > 1) {
                                                numOnly_3 = identification.cardNumber.split("/")[0].replace(/^0+/, "");
                                                exactMatch = tcgApiResults.filter(function (c) {
                                                    var cn = String(c.number).replace(/^0+/, "");
                                                    return cn === numOnly_3;
                                                });
                                                if (exactMatch.length > 0)
                                                    tcgApiResults = exactMatch;
                                            }
                                            _j.label = 26;
                                        case 26: return [3 /*break*/, 28];
                                        case 27:
                                            e_8 = _j.sent();
                                            console.error("TCG API search after identification failed:", e_8);
                                            return [3 /*break*/, 28];
                                        case 28:
                                            res.json({
                                                identification: identification,
                                                pcvResults: pcvResults.slice(0, 10),
                                                tcgApiResults: tcgApiResults.slice(0, 10),
                                            });
                                            return [3 /*break*/, 30];
                                        case 29:
                                            error_13 = _j.sent();
                                            console.error("Card identification failed:", error_13);
                                            res.status(500).json({ error: error_13.message || "Failed to identify card" });
                                            return [3 /*break*/, 30];
                                        case 30: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/auth/register", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var _a, username, displayName, email, mobileNumber, password, existingEmail, existingUsername, blocked, passwordHash, user, token, _b, _ph, safeUser, code, otpErr_1, error_14;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _c.trys.push([0, 11, , 12]);
                                            _a = req.body, username = _a.username, displayName = _a.displayName, email = _a.email, mobileNumber = _a.mobileNumber, password = _a.password;
                                            if (!username || !displayName || !email || !password) {
                                                res.status(400).json({ error: "Username, display name, email and password are required" });
                                                return [2 /*return*/];
                                            }
                                            if (password.length < 6) {
                                                res.status(400).json({ error: "Password must be at least 6 characters" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.getUserByEmail(email)];
                                        case 1:
                                            existingEmail = _c.sent();
                                            if (existingEmail) {
                                                res.status(409).json({ error: "An account with this email already exists" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.getUserByUsername(username)];
                                        case 2:
                                            existingUsername = _c.sent();
                                            if (existingUsername) {
                                                res.status(409).json({ error: "Username is already taken" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, isCredentialBlocked(email, mobileNumber)];
                                        case 3:
                                            blocked = _c.sent();
                                            return [4 /*yield*/, bcryptjs_1.default.hash(password, 10)];
                                        case 4:
                                            passwordHash = _c.sent();
                                            return [4 /*yield*/, storage_1.storage.createUser(__assign({ username: username.toLowerCase().trim(), displayName: displayName.trim(), email: email.toLowerCase().trim(), mobileNumber: (mobileNumber === null || mobileNumber === void 0 ? void 0 : mobileNumber.trim()) || "", passwordHash: passwordHash, authProvider: "local", isPremium: false, role: "user", avatarUrl: null }, (blocked ? { isTrialUsed: true } : {})))];
                                        case 5:
                                            user = _c.sent();
                                            return [4 /*yield*/, storage_1.storage.createSession(user.id)];
                                        case 6:
                                            token = _c.sent();
                                            _b = user, _ph = _b.passwordHash, safeUser = __rest(_b, ["passwordHash"]);
                                            _c.label = 7;
                                        case 7:
                                            _c.trys.push([7, 9, , 10]);
                                            code = (0, otp_service_1.createOtp)(user.email.toLowerCase().trim()).code;
                                            return [4 /*yield*/, (0, otp_service_1.sendOtpByEmail)(user.email, code)];
                                        case 8:
                                            _c.sent();
                                            return [3 /*break*/, 10];
                                        case 9:
                                            otpErr_1 = _c.sent();
                                            console.error("Failed to send verification email:", otpErr_1);
                                            return [3 /*break*/, 10];
                                        case 10:
                                            res.json({ token: token, user: safeUser });
                                            return [3 /*break*/, 12];
                                        case 11:
                                            error_14 = _c.sent();
                                            console.error("Register error:", error_14);
                                            res.status(500).json({ error: error_14.message || "Registration failed" });
                                            return [3 /*break*/, 12];
                                        case 12: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/auth/verify-email", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var _a, email, code, normalised, result, user, error_15;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 3, , 4]);
                                            _a = req.body, email = _a.email, code = _a.code;
                                            if (!email || !code) {
                                                res.status(400).json({ error: "email and code are required" });
                                                return [2 /*return*/];
                                            }
                                            normalised = email.toLowerCase().trim();
                                            result = (0, otp_service_1.verifyOtp)(normalised, code);
                                            if (!result.valid) {
                                                if (result.tooManyAttempts) {
                                                    res.status(429).json({ error: "Too many incorrect attempts. Please request a new code." });
                                                    return [2 /*return*/];
                                                }
                                                res.status(401).json({ error: result.expired ? "Code expired. Please request a new one." : "Incorrect code. Please try again." });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.getUserByEmail(normalised)];
                                        case 1:
                                            user = _b.sent();
                                            if (!user) {
                                                res.status(404).json({ error: "User not found" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.updateUser(user.id, { emailVerified: true })];
                                        case 2:
                                            _b.sent();
                                            res.json({ success: true });
                                            return [3 /*break*/, 4];
                                        case 3:
                                            error_15 = _b.sent();
                                            console.error("Verify email error:", error_15);
                                            res.status(500).json({ error: error_15.message || "Verification failed" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/auth/resend-email-verification", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var email, normalised, user, _a, code, rateLimited, error_16;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 3, , 4]);
                                            email = req.body.email;
                                            if (!email) {
                                                res.status(400).json({ error: "email is required" });
                                                return [2 /*return*/];
                                            }
                                            normalised = email.toLowerCase().trim();
                                            return [4 /*yield*/, storage_1.storage.getUserByEmail(normalised)];
                                        case 1:
                                            user = _b.sent();
                                            if (!user) {
                                                res.status(404).json({ error: "User not found" });
                                                return [2 /*return*/];
                                            }
                                            _a = (0, otp_service_1.createOtp)(normalised), code = _a.code, rateLimited = _a.rateLimited;
                                            if (rateLimited) {
                                                res.status(429).json({ error: "Please wait before requesting another code." });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, (0, otp_service_1.sendOtpByEmail)(user.email, code)];
                                        case 2:
                                            _b.sent();
                                            res.json({ success: true });
                                            return [3 /*break*/, 4];
                                        case 3:
                                            error_16 = _b.sent();
                                            console.error("Resend verification error:", error_16);
                                            res.status(500).json({ error: error_16.message || "Failed to resend code" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.delete("/api/auth/account", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var authHeader, token, caller, error_17;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 3, , 4]);
                                            authHeader = req.headers.authorization || "";
                                            token = authHeader.replace(/^Bearer\s+/i, "").trim();
                                            if (!token) {
                                                res.status(401).json({ error: "Not authenticated" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            caller = _a.sent();
                                            if (!caller) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            if (caller.isPremium && caller.subscriptionStatus === "active") {
                                                res.status(403).json({ error: "Please cancel your Premium subscription before deleting your account." });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.deleteUser(caller.id)];
                                        case 2:
                                            _a.sent();
                                            res.json({ success: true });
                                            return [3 /*break*/, 4];
                                        case 3:
                                            error_17 = _a.sent();
                                            console.error("Delete account error:", error_17);
                                            res.status(500).json({ error: error_17.message || "Failed to delete account" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // Verify password only — used for the first step of 2FA.
                            // Returns masked contact info so the client can show channel options.
                            // Does NOT create a session.
                            app.post("/api/auth/verify-password", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var _a, credential, password, user, valid, maskEmail, maskMobile, error_18;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 5, , 6]);
                                            _a = req.body, credential = _a.credential, password = _a.password;
                                            if (!credential || !password) {
                                                res.status(400).json({ error: "Email/username and password are required" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.getUserByEmail(credential.toLowerCase().trim())];
                                        case 1:
                                            user = _b.sent();
                                            if (!!user) return [3 /*break*/, 3];
                                            return [4 /*yield*/, storage_1.storage.getUserByUsername(credential.toLowerCase().trim())];
                                        case 2:
                                            user = _b.sent();
                                            _b.label = 3;
                                        case 3:
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid email/username or password" });
                                                return [2 /*return*/];
                                            }
                                            if (!user.passwordHash) {
                                                res.status(401).json({ error: "This account does not have a password set. Contact an admin." });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, bcryptjs_1.default.compare(password, user.passwordHash)];
                                        case 4:
                                            valid = _b.sent();
                                            if (!valid) {
                                                res.status(401).json({ error: "Invalid email/username or password" });
                                                return [2 /*return*/];
                                            }
                                            maskEmail = function (e) {
                                                var _a = e.split("@"), local = _a[0], domain = _a[1];
                                                return local.slice(0, 2) + "***@" + domain;
                                            };
                                            maskMobile = function (m) { return m.slice(0, -4).replace(/./g, "*") + m.slice(-4); };
                                            res.json({
                                                userId: user.id,
                                                hasEmail: !!user.email,
                                                hasMobile: !!user.mobileNumber,
                                                maskedEmail: user.email ? maskEmail(user.email) : null,
                                                maskedMobile: user.mobileNumber ? maskMobile(user.mobileNumber) : null,
                                                emailCredential: user.email,
                                                mobileCredential: user.mobileNumber,
                                            });
                                            return [3 /*break*/, 6];
                                        case 5:
                                            error_18 = _b.sent();
                                            console.error("Verify password error:", error_18);
                                            res.status(500).json({ error: error_18.message || "Verification failed" });
                                            return [3 /*break*/, 6];
                                        case 6: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/auth/login", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var _a, credential, password, user, valid, bu, reason, permanent, token, _b, _ph, safeUser, error_19;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _c.trys.push([0, 6, , 7]);
                                            _a = req.body, credential = _a.credential, password = _a.password;
                                            if (!credential || !password) {
                                                res.status(400).json({ error: "Email/username and password are required" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.getUserByEmail(credential.toLowerCase().trim())];
                                        case 1:
                                            user = _c.sent();
                                            if (!!user) return [3 /*break*/, 3];
                                            return [4 /*yield*/, storage_1.storage.getUserByUsername(credential.toLowerCase().trim())];
                                        case 2:
                                            user = _c.sent();
                                            _c.label = 3;
                                        case 3:
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid email/username or password" });
                                                return [2 /*return*/];
                                            }
                                            if (!user.passwordHash) {
                                                res.status(401).json({ error: "This account does not have a password set. Contact an admin." });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, bcryptjs_1.default.compare(password, user.passwordHash)];
                                        case 4:
                                            valid = _c.sent();
                                            if (!valid) {
                                                res.status(401).json({ error: "Invalid email/username or password" });
                                                return [2 /*return*/];
                                            }
                                            bu = user.bannedUntil;
                                            if (bu && new Date(bu) > new Date()) {
                                                reason = user.banReason || "Violation of community guidelines";
                                                permanent = new Date(bu).getFullYear() > 2999;
                                                res.status(403).json({
                                                    error: "Account banned",
                                                    banned: true,
                                                    bannedUntil: bu,
                                                    banReason: reason,
                                                    permanent: permanent,
                                                    message: permanent
                                                        ? "Your account has been permanently banned. Reason: ".concat(reason)
                                                        : "Your account is banned until ".concat(new Date(bu).toLocaleString(), ". Reason: ").concat(reason),
                                                });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.createSession(user.id)];
                                        case 5:
                                            token = _c.sent();
                                            _b = user, _ph = _b.passwordHash, safeUser = __rest(_b, ["passwordHash"]);
                                            res.json({ token: token, user: safeUser });
                                            return [3 /*break*/, 7];
                                        case 6:
                                            error_19 = _c.sent();
                                            console.error("Login error:", error_19);
                                            res.status(500).json({ error: error_19.message || "Login failed" });
                                            return [3 /*break*/, 7];
                                        case 7: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/auth/send-otp", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var _a, credential, channel, user, _b, code, rateLimited, sent, error_20;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _c.trys.push([0, 10, , 11]);
                                            _a = req.body, credential = _a.credential, channel = _a.channel;
                                            if (!credential || !channel) {
                                                res.status(400).json({ error: "credential and channel are required" });
                                                return [2 /*return*/];
                                            }
                                            if (channel !== "email" && channel !== "sms") {
                                                res.status(400).json({ error: "channel must be 'email' or 'sms'" });
                                                return [2 /*return*/];
                                            }
                                            user = null;
                                            if (!(channel === "email")) return [3 /*break*/, 2];
                                            return [4 /*yield*/, storage_1.storage.getUserByEmail(credential)];
                                        case 1:
                                            user = _c.sent();
                                            return [3 /*break*/, 5];
                                        case 2: return [4 /*yield*/, storage_1.storage.getUserByMobile(credential)];
                                        case 3:
                                            user = _c.sent();
                                            if (!!user) return [3 /*break*/, 5];
                                            return [4 /*yield*/, storage_1.storage.getUserByEmail(credential)];
                                        case 4:
                                            user = _c.sent();
                                            _c.label = 5;
                                        case 5:
                                            if (!user) {
                                                res.status(404).json({ error: "No account found with this credential" });
                                                return [2 /*return*/];
                                            }
                                            _b = (0, otp_service_1.createOtp)(credential), code = _b.code, rateLimited = _b.rateLimited;
                                            if (rateLimited) {
                                                res.status(429).json({ error: "Too many requests. Please wait before requesting another code." });
                                                return [2 /*return*/];
                                            }
                                            sent = false;
                                            if (!(channel === "email")) return [3 /*break*/, 7];
                                            return [4 /*yield*/, (0, otp_service_1.sendOtpByEmail)(user.email, code)];
                                        case 6:
                                            sent = _c.sent();
                                            return [3 /*break*/, 9];
                                        case 7: return [4 /*yield*/, (0, otp_service_1.sendOtpBySms)(user.mobileNumber, code)];
                                        case 8:
                                            sent = _c.sent();
                                            _c.label = 9;
                                        case 9:
                                            if (!sent) {
                                                res.status(500).json({ error: "Failed to send verification code" });
                                                return [2 /*return*/];
                                            }
                                            res.json({ message: "Verification code sent", userId: user.id });
                                            return [3 /*break*/, 11];
                                        case 10:
                                            error_20 = _c.sent();
                                            console.error("Send OTP error:", error_20);
                                            res.status(500).json({ error: error_20.message || "Failed to send OTP" });
                                            return [3 /*break*/, 11];
                                        case 11: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/auth/send-otp-register", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var _a, userId, channel, user, targetCredential, sent, _b, code, rateLimited, _c, code, rateLimited, error_21;
                                return __generator(this, function (_d) {
                                    switch (_d.label) {
                                        case 0:
                                            _d.trys.push([0, 6, , 7]);
                                            _a = req.body, userId = _a.userId, channel = _a.channel;
                                            if (!userId || !channel) {
                                                res.status(400).json({ error: "userId and channel are required" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.getUserById(userId)];
                                        case 1:
                                            user = _d.sent();
                                            if (!user) {
                                                res.status(404).json({ error: "User not found" });
                                                return [2 /*return*/];
                                            }
                                            targetCredential = void 0;
                                            sent = false;
                                            if (!(channel === "email")) return [3 /*break*/, 3];
                                            targetCredential = user.email;
                                            _b = (0, otp_service_1.createOtp)(targetCredential), code = _b.code, rateLimited = _b.rateLimited;
                                            if (rateLimited) {
                                                res.status(429).json({ error: "Too many requests. Please wait before requesting another code." });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, (0, otp_service_1.sendOtpByEmail)(user.email, code)];
                                        case 2:
                                            sent = _d.sent();
                                            return [3 /*break*/, 5];
                                        case 3:
                                            targetCredential = user.mobileNumber;
                                            _c = (0, otp_service_1.createOtp)(targetCredential), code = _c.code, rateLimited = _c.rateLimited;
                                            if (rateLimited) {
                                                res.status(429).json({ error: "Too many requests. Please wait before requesting another code." });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, (0, otp_service_1.sendOtpBySms)(user.mobileNumber, code)];
                                        case 4:
                                            sent = _d.sent();
                                            _d.label = 5;
                                        case 5:
                                            if (!sent) {
                                                res.status(500).json({ error: "Failed to send verification code" });
                                                return [2 /*return*/];
                                            }
                                            res.json({ message: "Verification code sent" });
                                            return [3 /*break*/, 7];
                                        case 6:
                                            error_21 = _d.sent();
                                            console.error("Send OTP register error:", error_21);
                                            res.status(500).json({ error: error_21.message || "Failed to send OTP" });
                                            return [3 /*break*/, 7];
                                        case 7: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/auth/verify-otp", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var _a, credential, code, result, user, bu, reason, permanent, token, error_22;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 5, , 6]);
                                            _a = req.body, credential = _a.credential, code = _a.code;
                                            if (!credential || !code) {
                                                res.status(400).json({ error: "credential and code are required" });
                                                return [2 /*return*/];
                                            }
                                            result = (0, otp_service_1.verifyOtp)(credential, code);
                                            if (!result.valid) {
                                                if (result.tooManyAttempts) {
                                                    res.status(429).json({ error: "Too many incorrect attempts. Please request a new code." });
                                                    return [2 /*return*/];
                                                }
                                                res.status(401).json({ error: result.expired ? "Verification code has expired. Please request a new one." : "Incorrect verification code. Please try again." });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.getUserByEmail(credential)];
                                        case 1:
                                            user = _b.sent();
                                            if (!!user) return [3 /*break*/, 3];
                                            return [4 /*yield*/, storage_1.storage.getUserByMobile(credential)];
                                        case 2:
                                            user = _b.sent();
                                            _b.label = 3;
                                        case 3:
                                            if (!user) {
                                                res.status(404).json({ error: "User not found" });
                                                return [2 /*return*/];
                                            }
                                            bu = user.bannedUntil;
                                            if (bu && new Date(bu) > new Date()) {
                                                reason = user.banReason || "Violation of community guidelines";
                                                permanent = new Date(bu).getFullYear() > 2999;
                                                res.status(403).json({
                                                    error: "Account banned",
                                                    banned: true,
                                                    bannedUntil: bu,
                                                    banReason: reason,
                                                    permanent: permanent,
                                                    message: permanent
                                                        ? "Your account has been permanently banned. Reason: ".concat(reason)
                                                        : "Your account is banned until ".concat(new Date(bu).toLocaleString(), ". Reason: ").concat(reason),
                                                });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.createSession(user.id)];
                                        case 4:
                                            token = _b.sent();
                                            res.json({ token: token, user: user });
                                            return [3 /*break*/, 6];
                                        case 5:
                                            error_22 = _b.sent();
                                            console.error("Verify OTP error:", error_22);
                                            res.status(500).json({ error: error_22.message || "Verification failed" });
                                            return [3 /*break*/, 6];
                                        case 6: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/auth/session", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, error_23;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 2, , 3]);
                                            token = req.body.token;
                                            if (!token) {
                                                res.status(400).json({ error: "token is required" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _a.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            res.json({ user: user });
                                            return [3 /*break*/, 3];
                                        case 2:
                                            error_23 = _a.sent();
                                            console.error("Session validation error:", error_23);
                                            res.status(500).json({ error: error_23.message || "Session validation failed" });
                                            return [3 /*break*/, 3];
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/auth/logout", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, error_24;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 3, , 4]);
                                            token = req.body.token;
                                            if (!token) return [3 /*break*/, 2];
                                            return [4 /*yield*/, storage_1.storage.deleteSession(token)];
                                        case 1:
                                            _a.sent();
                                            _a.label = 2;
                                        case 2:
                                            res.json({ message: "Logged out" });
                                            return [3 /*break*/, 4];
                                        case 3:
                                            error_24 = _a.sent();
                                            console.error("Logout error:", error_24);
                                            res.status(500).json({ error: error_24.message || "Logout failed" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Stripe — publishable key ─────────────────────────────────────────────────
                            app.get("/api/stripe/config", function (_req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var getStripePublishableKey, publishableKey, err_3;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 3, , 4]);
                                            return [4 /*yield*/, Promise.resolve().then(function () { return require("./stripe-client"); })];
                                        case 1:
                                            getStripePublishableKey = (_a.sent()).getStripePublishableKey;
                                            return [4 /*yield*/, getStripePublishableKey()];
                                        case 2:
                                            publishableKey = _a.sent();
                                            res.json({ publishableKey: publishableKey });
                                            return [3 /*break*/, 4];
                                        case 3:
                                            err_3 = _a.sent();
                                            console.error("[Stripe] Config error:", err_3.message);
                                            res.status(500).json({ error: "Stripe not configured" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Stripe — create checkout session ─────────────────────────────────────────
                            // POST /api/stripe/create-checkout  body: { priceId, successUrl, cancelUrl }
                            app.post("/api/stripe/create-checkout", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, _a, priceId, successUrl, cancelUrl, _b, getUncachableStripeClient, ensureStripeCustomer, stripe, customerId, session, err_4;
                                var _c;
                                return __generator(this, function (_d) {
                                    switch (_d.label) {
                                        case 0:
                                            _d.trys.push([0, 6, , 7]);
                                            token = (_c = req.headers.authorization) === null || _c === void 0 ? void 0 : _c.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _d.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            _a = req.body, priceId = _a.priceId, successUrl = _a.successUrl, cancelUrl = _a.cancelUrl;
                                            if (!priceId || !successUrl || !cancelUrl) {
                                                res.status(400).json({ error: "priceId, successUrl and cancelUrl are required" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, Promise.resolve().then(function () { return require("./stripe-client"); })];
                                        case 2:
                                            _b = _d.sent(), getUncachableStripeClient = _b.getUncachableStripeClient, ensureStripeCustomer = _b.ensureStripeCustomer;
                                            return [4 /*yield*/, getUncachableStripeClient()];
                                        case 3:
                                            stripe = _d.sent();
                                            return [4 /*yield*/, ensureStripeCustomer(stripe, user)];
                                        case 4:
                                            customerId = _d.sent();
                                            return [4 /*yield*/, stripe.checkout.sessions.create({
                                                    customer: customerId,
                                                    payment_method_types: ["card"],
                                                    mode: "subscription",
                                                    line_items: [{ price: priceId, quantity: 1 }],
                                                    success_url: successUrl,
                                                    cancel_url: cancelUrl,
                                                    subscription_data: {
                                                        metadata: { pokescanUserId: user.id },
                                                    },
                                                    allow_promotion_codes: true,
                                                })];
                                        case 5:
                                            session = _d.sent();
                                            res.json({ url: session.url, sessionId: session.id });
                                            return [3 /*break*/, 7];
                                        case 6:
                                            err_4 = _d.sent();
                                            console.error("[Stripe] Checkout error:", err_4.message);
                                            res.status(500).json({ error: err_4.message || "Failed to create checkout session" });
                                            return [3 /*break*/, 7];
                                        case 7: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Stripe — create billing portal session ────────────────────────────────────
                            // POST /api/stripe/portal  body: { returnUrl }
                            app.post("/api/stripe/portal", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, _a, getUncachableStripeClient, ensureStripeCustomer, stripe, returnUrl, customerId, portalSession, err_5;
                                var _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _c.trys.push([0, 6, , 7]);
                                            token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _c.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, Promise.resolve().then(function () { return require("./stripe-client"); })];
                                        case 2:
                                            _a = _c.sent(), getUncachableStripeClient = _a.getUncachableStripeClient, ensureStripeCustomer = _a.ensureStripeCustomer;
                                            return [4 /*yield*/, getUncachableStripeClient()];
                                        case 3:
                                            stripe = _c.sent();
                                            returnUrl = req.body.returnUrl;
                                            return [4 /*yield*/, ensureStripeCustomer(stripe, user)];
                                        case 4:
                                            customerId = _c.sent();
                                            return [4 /*yield*/, stripe.billingPortal.sessions.create({
                                                    customer: customerId,
                                                    return_url: returnUrl || "https://pokescantcg.replit.app",
                                                })];
                                        case 5:
                                            portalSession = _c.sent();
                                            res.json({ url: portalSession.url });
                                            return [3 /*break*/, 7];
                                        case 6:
                                            err_5 = _c.sent();
                                            console.error("[Stripe] Portal error:", err_5.message);
                                            res.status(500).json({ error: err_5.message || "Failed to open billing portal" });
                                            return [3 /*break*/, 7];
                                        case 7: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Stripe — sync subscription status for current user ───────────────────────
                            // POST /api/stripe/sync  — call after returning from Stripe Checkout success
                            app.post("/api/stripe/sync", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, customerId, _a, getUncachableStripeClient, ensureStripeCustomer, stripe, subscriptions, e_9, active, periodEnd, resolvedStatus, latestSub, storedUser, periodEndDate, stillInGracePeriod, err_6;
                                var _b, _c, _d, _e, _f, _g;
                                return __generator(this, function (_h) {
                                    switch (_h.label) {
                                        case 0:
                                            _h.trys.push([0, 15, , 16]);
                                            token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _h.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            customerId = user.stripeCustomerId;
                                            if (!customerId) {
                                                res.json({ isPremium: false, subscriptionStatus: null });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, Promise.resolve().then(function () { return require("./stripe-client"); })];
                                        case 2:
                                            _a = _h.sent(), getUncachableStripeClient = _a.getUncachableStripeClient, ensureStripeCustomer = _a.ensureStripeCustomer;
                                            return [4 /*yield*/, getUncachableStripeClient()];
                                        case 3:
                                            stripe = _h.sent();
                                            subscriptions = void 0;
                                            _h.label = 4;
                                        case 4:
                                            _h.trys.push([4, 6, , 8]);
                                            return [4 /*yield*/, stripe.subscriptions.list({
                                                    customer: customerId,
                                                    status: "all",
                                                    limit: 5,
                                                    expand: ["data.default_payment_method"],
                                                })];
                                        case 5:
                                            subscriptions = _h.sent();
                                            return [3 /*break*/, 8];
                                        case 6:
                                            e_9 = _h.sent();
                                            // Stale customer (e.g. test->live mode switch) — clear it so the next purchase recreates one.
                                            console.warn("[Stripe] Sync failed for customer ".concat(customerId, ": ").concat(e_9.message, ". Clearing stored ID."));
                                            return [4 /*yield*/, storage_1.storage.updateUser(user.id, { stripeCustomerId: null })];
                                        case 7:
                                            _h.sent();
                                            res.json({ isPremium: false, subscriptionStatus: null });
                                            return [2 /*return*/];
                                        case 8:
                                            active = subscriptions.data.find(function (s) { return s.status === "active" || s.status === "trialing"; });
                                            if (!active) return [3 /*break*/, 10];
                                            periodEnd = new Date(active.current_period_end * 1000);
                                            resolvedStatus = active.cancel_at_period_end ? "canceling" : active.status;
                                            return [4 /*yield*/, storage_1.storage.updateUser(user.id, {
                                                    isPremium: true,
                                                    stripeSubscriptionId: active.id,
                                                    stripePriceId: (_e = ((_d = (_c = active.items.data[0]) === null || _c === void 0 ? void 0 : _c.price) === null || _d === void 0 ? void 0 : _d.id)) !== null && _e !== void 0 ? _e : null,
                                                    subscriptionStatus: resolvedStatus,
                                                    subscriptionPeriodEnd: periodEnd,
                                                })];
                                        case 9:
                                            _h.sent();
                                            res.json({ isPremium: true, subscriptionStatus: resolvedStatus, periodEnd: periodEnd.toISOString(), cancelAtPeriodEnd: !!active.cancel_at_period_end });
                                            return [3 /*break*/, 14];
                                        case 10:
                                            latestSub = subscriptions.data[0];
                                            storedUser = user;
                                            periodEndDate = storedUser.subscriptionPeriodEnd
                                                ? new Date(storedUser.subscriptionPeriodEnd)
                                                : null;
                                            stillInGracePeriod = periodEndDate && periodEndDate > new Date();
                                            if (!stillInGracePeriod) return [3 /*break*/, 12];
                                            // Stripe cancelled the sub but the billing period hasn't expired yet — keep premium
                                            return [4 /*yield*/, storage_1.storage.updateUser(user.id, {
                                                    subscriptionStatus: "canceling",
                                                })];
                                        case 11:
                                            // Stripe cancelled the sub but the billing period hasn't expired yet — keep premium
                                            _h.sent();
                                            res.json({ isPremium: true, subscriptionStatus: "canceling", periodEnd: periodEndDate.toISOString(), cancelAtPeriodEnd: true });
                                            return [3 /*break*/, 14];
                                        case 12: 
                                        // Fully expired
                                        return [4 /*yield*/, storage_1.storage.updateUser(user.id, {
                                                isPremium: false,
                                                subscriptionStatus: (_f = latestSub === null || latestSub === void 0 ? void 0 : latestSub.status) !== null && _f !== void 0 ? _f : "canceled",
                                            })];
                                        case 13:
                                            // Fully expired
                                            _h.sent();
                                            res.json({ isPremium: false, subscriptionStatus: (_g = latestSub === null || latestSub === void 0 ? void 0 : latestSub.status) !== null && _g !== void 0 ? _g : "canceled" });
                                            _h.label = 14;
                                        case 14: return [3 /*break*/, 16];
                                        case 15:
                                            err_6 = _h.sent();
                                            console.error("[Stripe] Sync error:", err_6.message);
                                            res.status(500).json({ error: err_6.message || "Sync failed" });
                                            return [3 /*break*/, 16];
                                        case 16: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Stripe — webhook ─────────────────────────────────────────────────────────
                            // POST /api/stripe/webhook  — raw body required (express.raw middleware)
                            app.post("/api/stripe/webhook", express_1.default.raw({ type: "application/json" }), function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var sig, webhookSecret, event, _a, getUncachableStripeClient, ensureStripeCustomer, stripe, err_7, _b, sub, customerId, userRow, userId, isActive, periodEnd, resolvedStatus, sub, customerId, periodEnd, invoice, customerId, err_8;
                                var _c, _d, _e, _f, _g;
                                return __generator(this, function (_h) {
                                    switch (_h.label) {
                                        case 0:
                                            sig = req.headers["stripe-signature"];
                                            webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
                                            _h.label = 1;
                                        case 1:
                                            _h.trys.push([1, 4, , 5]);
                                            return [4 /*yield*/, Promise.resolve().then(function () { return require("./stripe-client"); })];
                                        case 2:
                                            _a = _h.sent(), getUncachableStripeClient = _a.getUncachableStripeClient, ensureStripeCustomer = _a.ensureStripeCustomer;
                                            return [4 /*yield*/, getUncachableStripeClient()];
                                        case 3:
                                            stripe = _h.sent();
                                            if (webhookSecret && sig) {
                                                event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
                                            }
                                            else {
                                                event = JSON.parse(req.body.toString());
                                            }
                                            return [3 /*break*/, 5];
                                        case 4:
                                            err_7 = _h.sent();
                                            console.error("[Stripe Webhook] Signature error:", err_7.message);
                                            res.status(400).json({ error: "Webhook signature verification failed" });
                                            return [2 /*return*/];
                                        case 5:
                                            _h.trys.push([5, 15, , 16]);
                                            _b = event.type;
                                            switch (_b) {
                                                case "customer.subscription.created": return [3 /*break*/, 6];
                                                case "customer.subscription.updated": return [3 /*break*/, 6];
                                                case "customer.subscription.deleted": return [3 /*break*/, 10];
                                                case "invoice.payment_failed": return [3 /*break*/, 12];
                                            }
                                            return [3 /*break*/, 14];
                                        case 6:
                                            sub = event.data.object;
                                            customerId = sub.customer;
                                            return [4 /*yield*/, db_1.pool.query("SELECT id FROM pokescan_users WHERE stripe_customer_id = $1", [customerId])];
                                        case 7:
                                            userRow = _h.sent();
                                            if (!(userRow.rows.length > 0)) return [3 /*break*/, 9];
                                            userId = userRow.rows[0].id;
                                            isActive = sub.status === "active" || sub.status === "trialing";
                                            periodEnd = new Date(sub.current_period_end * 1000);
                                            resolvedStatus = isActive && sub.cancel_at_period_end
                                                ? "canceling"
                                                : sub.status;
                                            return [4 /*yield*/, db_1.pool.query("UPDATE pokescan_users\n                 SET is_premium = $1, stripe_subscription_id = $2,\n                     stripe_price_id = $3, subscription_status = $4,\n                     subscription_period_end = $5\n                 WHERE id = $6", [isActive, sub.id, (_g = (_f = (_e = (_d = (_c = sub.items) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.price) === null || _f === void 0 ? void 0 : _f.id) !== null && _g !== void 0 ? _g : null, resolvedStatus, periodEnd, userId])];
                                        case 8:
                                            _h.sent();
                                            console.log("[Stripe Webhook] Updated user ".concat(userId, ": isPremium=").concat(isActive, " status=").concat(resolvedStatus, " cancelAtPeriodEnd=").concat(sub.cancel_at_period_end));
                                            _h.label = 9;
                                        case 9: return [3 /*break*/, 14];
                                        case 10:
                                            sub = event.data.object;
                                            customerId = sub.customer;
                                            periodEnd = sub.current_period_end
                                                ? new Date(sub.current_period_end * 1000)
                                                : new Date();
                                            return [4 /*yield*/, db_1.pool.query("UPDATE pokescan_users\n               SET is_premium = false, subscription_status = 'canceled',\n                   subscription_period_end = $2\n               WHERE stripe_customer_id = $1", [customerId, periodEnd])];
                                        case 11:
                                            _h.sent();
                                            console.log("[Stripe Webhook] Subscription ended for customer ".concat(customerId, " \u2014 premium removed"));
                                            return [3 /*break*/, 14];
                                        case 12:
                                            invoice = event.data.object;
                                            customerId = invoice.customer;
                                            return [4 /*yield*/, db_1.pool.query("UPDATE pokescan_users SET subscription_status = 'past_due' WHERE stripe_customer_id = $1", [customerId])];
                                        case 13:
                                            _h.sent();
                                            return [3 /*break*/, 14];
                                        case 14:
                                            res.json({ received: true });
                                            return [3 /*break*/, 16];
                                        case 15:
                                            err_8 = _h.sent();
                                            console.error("[Stripe Webhook] Handler error:", err_8.message);
                                            res.status(500).json({ error: "Webhook handler failed" });
                                            return [3 /*break*/, 16];
                                        case 16: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Cancel premium (user-initiated) ─────────────────────────────────────────
                            // POST /api/user/cancel-premium — cancels via Stripe if subscribed, else removes flag.
                            app.post("/api/user/cancel-premium", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, subscriptionId, _a, getUncachableStripeClient, ensureStripeCustomer, stripe, stripeErr_1, updated, error_25;
                                var _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _c.trys.push([0, 10, , 11]);
                                            token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _c.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            if (user.role === "admin" || user.role === "moderator") {
                                                res.status(403).json({ error: "Staff premium cannot be self-cancelled. Contact a superadmin." });
                                                return [2 /*return*/];
                                            }
                                            if (!user.isPremium) {
                                                res.status(400).json({ error: "Account does not have an active premium subscription." });
                                                return [2 /*return*/];
                                            }
                                            subscriptionId = user.stripeSubscriptionId;
                                            if (!subscriptionId) return [3 /*break*/, 8];
                                            _c.label = 2;
                                        case 2:
                                            _c.trys.push([2, 7, , 8]);
                                            return [4 /*yield*/, Promise.resolve().then(function () { return require("./stripe-client"); })];
                                        case 3:
                                            _a = _c.sent(), getUncachableStripeClient = _a.getUncachableStripeClient, ensureStripeCustomer = _a.ensureStripeCustomer;
                                            return [4 /*yield*/, getUncachableStripeClient()];
                                        case 4:
                                            stripe = _c.sent();
                                            // Cancel at period end (not immediately) so user keeps access until paid period ends
                                            return [4 /*yield*/, stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true })];
                                        case 5:
                                            // Cancel at period end (not immediately) so user keeps access until paid period ends
                                            _c.sent();
                                            console.log("[Premium] Stripe subscription ".concat(subscriptionId, " set to cancel at period end."));
                                            return [4 /*yield*/, storage_1.storage.updateUser(user.id, { subscriptionStatus: "canceling" })];
                                        case 6:
                                            _c.sent();
                                            res.json({ success: true, message: "Subscription will cancel at end of billing period." });
                                            return [2 /*return*/];
                                        case 7:
                                            stripeErr_1 = _c.sent();
                                            console.error("[Premium] Stripe cancel error:", stripeErr_1.message);
                                            return [3 /*break*/, 8];
                                        case 8: return [4 /*yield*/, storage_1.storage.updateUser(user.id, { isPremium: false })];
                                        case 9:
                                            updated = _c.sent();
                                            if (!updated) {
                                                res.status(404).json({ error: "User not found" });
                                                return [2 /*return*/];
                                            }
                                            console.log("[Premium] User ".concat(user.id, " (").concat(user.email || user.username, ") cancelled premium."));
                                            res.json({ success: true });
                                            return [3 /*break*/, 11];
                                        case 10:
                                            error_25 = _c.sent();
                                            console.error("Cancel premium error:", error_25);
                                            res.status(500).json({ error: error_25.message || "Cancellation failed" });
                                            return [3 /*break*/, 11];
                                        case 11: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // GET /api/listings — approved listings only (premium required)
                            app.get("/api/listings", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, result, err_9;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 3, , 4]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _b.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            if (!user.isPremium) {
                                                res.status(403).json({ error: "Premium required to access the marketplace." });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.pool.query("SELECT * FROM pokescan_market_listings\n           WHERE status = 'approved' OR user_id = $1\n           ORDER BY created_at DESC\n           LIMIT 200", [user.id])];
                                        case 2:
                                            result = _b.sent();
                                            res.json({ listings: result.rows.map(rowToListing) });
                                            return [3 /*break*/, 4];
                                        case 3:
                                            err_9 = _b.sent();
                                            console.error("[Listings] GET error:", err_9.message);
                                            res.status(500).json({ error: "Could not fetch listings" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // POST /api/listings — create a listing (premium required). New listings are
                            // pending until an admin/moderator approves them, to limit fake/scam posts.
                            app.post("/api/listings", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, _a, cardId, cardName, cardImage, setName, rarity, type, priceGBP, condition, description, photos, externalUrl, rawPhotos, photosJson, safeExternalUrl, isStaff, initialStatus, result, err_10;
                                var _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _c.trys.push([0, 3, , 4]);
                                            token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _c.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            if (!user.isPremium) {
                                                res.status(403).json({ error: "Premium required to list on the marketplace." });
                                                return [2 /*return*/];
                                            }
                                            _a = req.body, cardId = _a.cardId, cardName = _a.cardName, cardImage = _a.cardImage, setName = _a.setName, rarity = _a.rarity, type = _a.type, priceGBP = _a.priceGBP, condition = _a.condition, description = _a.description, photos = _a.photos, externalUrl = _a.externalUrl;
                                            if (!cardId || !cardName || !cardImage || !setName || !type || !condition) {
                                                res.status(400).json({ error: "Missing required listing fields." });
                                                return [2 /*return*/];
                                            }
                                            rawPhotos = Array.isArray(photos) ? photos.slice(0, 6) : [];
                                            photosJson = JSON.stringify(rawPhotos);
                                            safeExternalUrl = (typeof externalUrl === "string" && /^https?:\/\//i.test(externalUrl.trim()))
                                                ? externalUrl.trim()
                                                : null;
                                            isStaff = user.role === "admin" || user.role === "moderator";
                                            initialStatus = isStaff ? "approved" : "pending";
                                            return [4 /*yield*/, db_1.pool.query("INSERT INTO pokescan_market_listings\n           (user_id, user_name, card_id, card_name, card_image, set_name, rarity, type, price_gbp, condition, description, photos, status, reviewed_by, reviewed_at, external_url)\n         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)\n         RETURNING *", [
                                                    user.id, user.displayName,
                                                    cardId, cardName, cardImage, setName,
                                                    rarity !== null && rarity !== void 0 ? rarity : "Unknown",
                                                    type,
                                                    priceGBP !== null && priceGBP !== void 0 ? priceGBP : null,
                                                    condition,
                                                    description !== null && description !== void 0 ? description : "",
                                                    photosJson,
                                                    initialStatus,
                                                    isStaff ? user.id : null,
                                                    isStaff ? new Date() : null,
                                                    safeExternalUrl,
                                                ])];
                                        case 2:
                                            result = _c.sent();
                                            res.status(201).json({ listing: rowToListing(result.rows[0]) });
                                            return [3 /*break*/, 4];
                                        case 3:
                                            err_10 = _c.sent();
                                            console.error("[Listings] POST error:", err_10.message);
                                            res.status(500).json({ error: "Could not create listing" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // DELETE /api/listings/:id — owner or staff can delete
                            app.delete("/api/listings/:id", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, id, existing, isOwner, isStaff, err_11;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 4, , 5]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _b.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            id = req.params.id;
                                            return [4 /*yield*/, db_1.pool.query("SELECT user_id FROM pokescan_market_listings WHERE id = $1", [id])];
                                        case 2:
                                            existing = _b.sent();
                                            if (existing.rows.length === 0) {
                                                res.status(404).json({ error: "Listing not found" });
                                                return [2 /*return*/];
                                            }
                                            isOwner = existing.rows[0].user_id === user.id;
                                            isStaff = user.role === "admin" || user.role === "moderator";
                                            if (!isOwner && !isStaff) {
                                                res.status(403).json({ error: "Not authorised to delete this listing" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.pool.query("DELETE FROM pokescan_market_listings WHERE id = $1", [id])];
                                        case 3:
                                            _b.sent();
                                            res.json({ success: true });
                                            return [3 /*break*/, 5];
                                        case 4:
                                            err_11 = _b.sent();
                                            console.error("[Listings] DELETE error:", err_11.message);
                                            res.status(500).json({ error: "Could not delete listing" });
                                            return [3 /*break*/, 5];
                                        case 5: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // PATCH /api/listings/:id — owner can edit editable fields; resets to pending
                            app.patch("/api/listings/:id", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, id, existing, isOwner, _a, priceGBP, condition, description, externalUrl, photos, safeExternalUrl, isStaff, newStatus, result, photosJson, err_12;
                                var _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _c.trys.push([0, 7, , 8]);
                                            token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _c.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            id = req.params.id;
                                            return [4 /*yield*/, db_1.pool.query("SELECT user_id FROM pokescan_market_listings WHERE id = $1", [id])];
                                        case 2:
                                            existing = _c.sent();
                                            if (existing.rows.length === 0) {
                                                res.status(404).json({ error: "Listing not found" });
                                                return [2 /*return*/];
                                            }
                                            isOwner = existing.rows[0].user_id === user.id;
                                            if (!isOwner) {
                                                res.status(403).json({ error: "Not authorised to edit this listing" });
                                                return [2 /*return*/];
                                            }
                                            _a = req.body, priceGBP = _a.priceGBP, condition = _a.condition, description = _a.description, externalUrl = _a.externalUrl, photos = _a.photos;
                                            if (!condition) {
                                                res.status(400).json({ error: "Condition is required" });
                                                return [2 /*return*/];
                                            }
                                            safeExternalUrl = (typeof externalUrl === "string" && /^https?:\/\//i.test(externalUrl.trim()))
                                                ? externalUrl.trim()
                                                : null;
                                            isStaff = user.role === "admin" || user.role === "moderator";
                                            newStatus = isStaff ? "approved" : "pending";
                                            result = void 0;
                                            if (!Array.isArray(photos)) return [3 /*break*/, 4];
                                            photosJson = JSON.stringify(photos.slice(0, 6));
                                            return [4 /*yield*/, db_1.pool.query("UPDATE pokescan_market_listings\n             SET price_gbp = $1, condition = $2, description = $3, external_url = $4,\n                 photos = $5,\n                 status = $6,\n                 reviewed_by = $7, reviewed_at = $8,\n                 review_note = NULL\n             WHERE id = $9\n             RETURNING *", [
                                                    priceGBP !== null && priceGBP !== void 0 ? priceGBP : null,
                                                    condition,
                                                    description !== null && description !== void 0 ? description : "",
                                                    safeExternalUrl,
                                                    photosJson,
                                                    newStatus,
                                                    isStaff ? user.id : null,
                                                    isStaff ? new Date() : null,
                                                    id,
                                                ])];
                                        case 3:
                                            result = _c.sent();
                                            return [3 /*break*/, 6];
                                        case 4: return [4 /*yield*/, db_1.pool.query("UPDATE pokescan_market_listings\n             SET price_gbp = $1, condition = $2, description = $3, external_url = $4,\n                 status = $5,\n                 reviewed_by = $6, reviewed_at = $7,\n                 review_note = NULL\n             WHERE id = $8\n             RETURNING *", [
                                                priceGBP !== null && priceGBP !== void 0 ? priceGBP : null,
                                                condition,
                                                description !== null && description !== void 0 ? description : "",
                                                safeExternalUrl,
                                                newStatus,
                                                isStaff ? user.id : null,
                                                isStaff ? new Date() : null,
                                                id,
                                            ])];
                                        case 5:
                                            result = _c.sent();
                                            _c.label = 6;
                                        case 6:
                                            res.json({ listing: rowToListing(result.rows[0]) });
                                            return [3 /*break*/, 8];
                                        case 7:
                                            err_12 = _c.sent();
                                            console.error("[Listings] PATCH error:", err_12.message);
                                            res.status(500).json({ error: "Could not update listing" });
                                            return [3 /*break*/, 8];
                                        case 8: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Admin: market listing moderation ─────────────────────────────────────
                            // GET /api/admin/listings?status=pending|approved|rejected|all (default: all)
                            app.get("/api/admin/listings", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, status_2, allowed, result, _a, err_13;
                                var _b, _c;
                                return __generator(this, function (_d) {
                                    switch (_d.label) {
                                        case 0:
                                            _d.trys.push([0, 6, , 7]);
                                            token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _d.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            if (user.role !== "admin" && user.role !== "moderator") {
                                                res.status(403).json({ error: "Staff access required" });
                                                return [2 /*return*/];
                                            }
                                            status_2 = String((_c = req.query.status) !== null && _c !== void 0 ? _c : "all").toLowerCase();
                                            allowed = ["pending", "approved", "rejected"];
                                            if (!allowed.includes(status_2)) return [3 /*break*/, 3];
                                            return [4 /*yield*/, db_1.pool.query("SELECT ml.*, u.username AS review_note_updated_by_username\n               FROM pokescan_market_listings ml\n               LEFT JOIN pokescan_users u ON u.id = ml.review_note_updated_by\n              WHERE ml.status = $1\n              ORDER BY ml.created_at DESC LIMIT 500", [status_2])];
                                        case 2:
                                            _a = _d.sent();
                                            return [3 /*break*/, 5];
                                        case 3: return [4 /*yield*/, db_1.pool.query("SELECT ml.*, u.username AS review_note_updated_by_username\n               FROM pokescan_market_listings ml\n               LEFT JOIN pokescan_users u ON u.id = ml.review_note_updated_by\n              ORDER BY ml.created_at DESC LIMIT 500")];
                                        case 4:
                                            _a = _d.sent();
                                            _d.label = 5;
                                        case 5:
                                            result = _a;
                                            res.json({ listings: result.rows.map(rowToListing) });
                                            return [3 /*break*/, 7];
                                        case 6:
                                            err_13 = _d.sent();
                                            console.error("[Admin Listings] GET error:", err_13.message);
                                            res.status(500).json({ error: "Could not fetch admin listings" });
                                            return [3 /*break*/, 7];
                                        case 7: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // PATCH /api/admin/listings/:id — set status to approved or rejected
                            app.patch("/api/admin/listings/:id", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, id, _a, status_3, reviewNote, result, row, action, logErr_1, err_14;
                                var _b, _c, _d;
                                return __generator(this, function (_e) {
                                    switch (_e.label) {
                                        case 0:
                                            _e.trys.push([0, 10, , 11]);
                                            token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _e.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            if (user.role !== "admin" && user.role !== "moderator") {
                                                res.status(403).json({ error: "Staff access required" });
                                                return [2 /*return*/];
                                            }
                                            id = req.params.id;
                                            _a = (_c = req.body) !== null && _c !== void 0 ? _c : {}, status_3 = _a.status, reviewNote = _a.reviewNote;
                                            if (status_3 !== undefined && status_3 !== "approved" && status_3 !== "rejected") {
                                                res.status(400).json({ error: "status must be 'approved' or 'rejected'" });
                                                return [2 /*return*/];
                                            }
                                            result = void 0;
                                            if (!(status_3 !== undefined)) return [3 /*break*/, 3];
                                            return [4 /*yield*/, db_1.pool.query("UPDATE pokescan_market_listings\n              SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_note = $3\n            WHERE id = $4\n            RETURNING *", [status_3, user.id, reviewNote !== null && reviewNote !== void 0 ? reviewNote : null, id])];
                                        case 2:
                                            result = _e.sent();
                                            return [3 /*break*/, 5];
                                        case 3: return [4 /*yield*/, db_1.pool.query("WITH upd AS (\n              UPDATE pokescan_market_listings\n                 SET review_note = $1,\n                     review_note_updated_by = $2,\n                     review_note_updated_at = NOW()\n               WHERE id = $3\n             RETURNING *\n           )\n           SELECT upd.*, u.username AS review_note_updated_by_username\n             FROM upd\n             LEFT JOIN pokescan_users u ON u.id = upd.review_note_updated_by", [reviewNote !== null && reviewNote !== void 0 ? reviewNote : null, user.id, id])];
                                        case 4:
                                            result = _e.sent();
                                            _e.label = 5;
                                        case 5:
                                            if (result.rows.length === 0) {
                                                res.status(404).json({ error: "Listing not found" });
                                                return [2 /*return*/];
                                            }
                                            row = result.rows[0];
                                            action = status_3 !== undefined ? status_3 : "note_edited";
                                            _e.label = 6;
                                        case 6:
                                            _e.trys.push([6, 8, , 9]);
                                            return [4 /*yield*/, db_1.db.insert(schema_1.pokescanAdminActivityLog).values({
                                                    listingId: id,
                                                    listingName: (_d = row.card_name) !== null && _d !== void 0 ? _d : null,
                                                    action: action,
                                                    performedBy: user.id,
                                                    note: reviewNote !== null && reviewNote !== void 0 ? reviewNote : null,
                                                })];
                                        case 7:
                                            _e.sent();
                                            return [3 /*break*/, 9];
                                        case 8:
                                            logErr_1 = _e.sent();
                                            console.warn("[ActivityLog] Failed to write log entry:", logErr_1);
                                            return [3 /*break*/, 9];
                                        case 9:
                                            res.json({ listing: rowToListing(row) });
                                            return [3 /*break*/, 11];
                                        case 10:
                                            err_14 = _e.sent();
                                            console.error("[Admin Listings] PATCH error:", err_14.message);
                                            res.status(500).json({ error: "Could not update listing" });
                                            return [3 /*break*/, 11];
                                        case 11: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // GET /api/admin/activity-log — paginated moderation activity log.
                            // Admin/superadmin only (not plain moderators): the Logs tab in the admin UI is also
                            // restricted to admins/superadmins. Moderators use the Reports tab for their queue.
                            // Note: seedSuperadmin always sets the superadmin email's role to "admin", so
                            // user.role === "admin" already covers superadmins. isSuperadminAuthorized is called
                            // explicitly as a belt-and-suspenders check for legacy superadmin token paths.
                            app.get("/api/admin/activity-log", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, _a, page_3, limit, offset_2, moderator, dateFrom, dateTo, datePattern, conditions, params, pi, where, countResult, total, dataResult, err_15;
                                var _b, _c, _d;
                                return __generator(this, function (_e) {
                                    switch (_e.label) {
                                        case 0:
                                            _e.trys.push([0, 6, , 7]);
                                            token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _e.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            _a = user.role !== "admin";
                                            if (!_a) return [3 /*break*/, 3];
                                            return [4 /*yield*/, isSuperadminAuthorized(req)];
                                        case 2:
                                            _a = !(_e.sent());
                                            _e.label = 3;
                                        case 3:
                                            if (_a) {
                                                res.status(403).json({ error: "Admin access required" });
                                                return [2 /*return*/];
                                            }
                                            page_3 = Math.max(1, parseInt(req.query.page || "1", 10));
                                            limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "20", 10)));
                                            offset_2 = (page_3 - 1) * limit;
                                            moderator = req.query.moderator || "";
                                            dateFrom = req.query.dateFrom || "";
                                            dateTo = req.query.dateTo || "";
                                            datePattern = /^\d{4}-\d{2}-\d{2}$/;
                                            if (dateFrom && (!datePattern.test(dateFrom) || isNaN(Date.parse(dateFrom)))) {
                                                res.status(400).json({ error: "Invalid dateFrom format — use YYYY-MM-DD" });
                                                return [2 /*return*/];
                                            }
                                            if (dateTo && (!datePattern.test(dateTo) || isNaN(Date.parse(dateTo)))) {
                                                res.status(400).json({ error: "Invalid dateTo format — use YYYY-MM-DD" });
                                                return [2 /*return*/];
                                            }
                                            conditions = [];
                                            params = [];
                                            pi = 1;
                                            if (moderator) {
                                                conditions.push("u.username ILIKE $".concat(pi++));
                                                params.push("%".concat(moderator, "%"));
                                            }
                                            if (dateFrom) {
                                                conditions.push("al.created_at >= $".concat(pi++));
                                                params.push(new Date(dateFrom).toISOString());
                                            }
                                            if (dateTo) {
                                                conditions.push("al.created_at <= $".concat(pi++));
                                                params.push(new Date(dateTo + "T23:59:59").toISOString());
                                            }
                                            where = conditions.length > 0 ? "WHERE ".concat(conditions.join(" AND ")) : "";
                                            return [4 /*yield*/, db_1.pool.query("SELECT COUNT(*)::int AS total\n           FROM pokescan_admin_activity_log al\n           LEFT JOIN pokescan_users u ON u.id = al.performed_by\n           ".concat(where), params)];
                                        case 4:
                                            countResult = _e.sent();
                                            total = (_d = (_c = countResult.rows[0]) === null || _c === void 0 ? void 0 : _c.total) !== null && _d !== void 0 ? _d : 0;
                                            return [4 /*yield*/, db_1.pool.query("SELECT al.*, u.username AS moderator_username, u.display_name AS moderator_display_name\n           FROM pokescan_admin_activity_log al\n           LEFT JOIN pokescan_users u ON u.id = al.performed_by\n           ".concat(where, "\n           ORDER BY al.created_at DESC\n           LIMIT $").concat(pi++, " OFFSET $").concat(pi++), __spreadArray(__spreadArray([], params, true), [limit, offset_2], false))];
                                        case 5:
                                            dataResult = _e.sent();
                                            res.json({
                                                logs: dataResult.rows.map(function (r) { return ({
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
                                                    createdAt: r.created_at,
                                                }); }),
                                                total: total,
                                                page: page_3,
                                                limit: limit,
                                                hasMore: offset_2 + limit < total,
                                            });
                                            return [3 /*break*/, 7];
                                        case 6:
                                            err_15 = _e.sent();
                                            console.error("[ActivityLog] GET error:", err_15.message);
                                            res.status(500).json({ error: "Could not fetch activity log" });
                                            return [3 /*break*/, 7];
                                        case 7: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // GET /api/admin/reports/all — all reports with pagination and optional status filter.
                            // Admin/superadmin only, same rationale as /api/admin/activity-log above.
                            app.get("/api/admin/reports/all", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, _a, page_4, limit, offset_3, status_4, reporter, dateFrom, dateTo, datePattern, conditions, params, pi, allowedStatuses, where, countResult, total, dataResult, err_16;
                                var _b, _c, _d;
                                return __generator(this, function (_e) {
                                    switch (_e.label) {
                                        case 0:
                                            _e.trys.push([0, 6, , 7]);
                                            token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _e.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            _a = user.role !== "admin";
                                            if (!_a) return [3 /*break*/, 3];
                                            return [4 /*yield*/, isSuperadminAuthorized(req)];
                                        case 2:
                                            _a = !(_e.sent());
                                            _e.label = 3;
                                        case 3:
                                            if (_a) {
                                                res.status(403).json({ error: "Admin access required" });
                                                return [2 /*return*/];
                                            }
                                            page_4 = Math.max(1, parseInt(req.query.page || "1", 10));
                                            limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "20", 10)));
                                            offset_3 = (page_4 - 1) * limit;
                                            status_4 = req.query.status || "all";
                                            reporter = req.query.reporter || "";
                                            dateFrom = req.query.dateFrom || "";
                                            dateTo = req.query.dateTo || "";
                                            datePattern = /^\d{4}-\d{2}-\d{2}$/;
                                            if (dateFrom && (!datePattern.test(dateFrom) || isNaN(Date.parse(dateFrom)))) {
                                                res.status(400).json({ error: "Invalid dateFrom format — use YYYY-MM-DD" });
                                                return [2 /*return*/];
                                            }
                                            if (dateTo && (!datePattern.test(dateTo) || isNaN(Date.parse(dateTo)))) {
                                                res.status(400).json({ error: "Invalid dateTo format — use YYYY-MM-DD" });
                                                return [2 /*return*/];
                                            }
                                            conditions = [];
                                            params = [];
                                            pi = 1;
                                            allowedStatuses = ["pending", "reviewed", "dismissed"];
                                            if (allowedStatuses.includes(status_4)) {
                                                conditions.push("r.status = $".concat(pi++));
                                                params.push(status_4);
                                            }
                                            if (reporter) {
                                                conditions.push("reporter.username ILIKE $".concat(pi++));
                                                params.push("%".concat(reporter, "%"));
                                            }
                                            if (dateFrom) {
                                                conditions.push("r.created_at >= $".concat(pi++));
                                                params.push(new Date(dateFrom).toISOString());
                                            }
                                            if (dateTo) {
                                                conditions.push("r.created_at <= $".concat(pi++));
                                                params.push(new Date(dateTo + "T23:59:59").toISOString());
                                            }
                                            where = conditions.length > 0 ? "WHERE ".concat(conditions.join(" AND ")) : "";
                                            return [4 /*yield*/, db_1.pool.query("SELECT COUNT(*)::int AS total\n           FROM pokescan_reports r\n           LEFT JOIN pokescan_users reporter ON reporter.id = r.reporter_id\n           ".concat(where), params)];
                                        case 4:
                                            countResult = _e.sent();
                                            total = (_d = (_c = countResult.rows[0]) === null || _c === void 0 ? void 0 : _c.total) !== null && _d !== void 0 ? _d : 0;
                                            return [4 /*yield*/, db_1.pool.query("SELECT r.*,\n                reporter.username AS reporter_username,\n                reporter.display_name AS reporter_display_name,\n                reported.username AS reported_username,\n                reviewed_by_user.username AS reviewed_by_username\n           FROM pokescan_reports r\n           LEFT JOIN pokescan_users reporter ON reporter.id = r.reporter_id\n           LEFT JOIN pokescan_users reported ON reported.id = r.reported_user_id\n           LEFT JOIN pokescan_users reviewed_by_user ON reviewed_by_user.id = r.reviewed_by\n           ".concat(where, "\n           ORDER BY r.created_at DESC\n           LIMIT $").concat(pi++, " OFFSET $").concat(pi++), __spreadArray(__spreadArray([], params, true), [limit, offset_3], false))];
                                        case 5:
                                            dataResult = _e.sent();
                                            res.json({
                                                reports: dataResult.rows.map(function (r) { return ({
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
                                                    createdAt: r.created_at,
                                                }); }),
                                                total: total,
                                                page: page_4,
                                                limit: limit,
                                                hasMore: offset_3 + limit < total,
                                            });
                                            return [3 /*break*/, 7];
                                        case 6:
                                            err_16 = _e.sent();
                                            console.error("[AllReports] GET error:", err_16.message);
                                            res.status(500).json({ error: "Could not fetch reports" });
                                            return [3 /*break*/, 7];
                                        case 7: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Daily checkin (login streak + bonus scans) ───────────────────────────────
                            app.post("/api/user/daily-checkin", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, result, error_26;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 3, , 4]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _b.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            if (user.isPremium) {
                                                res.json({ isPremium: true, unlimited: true });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, (0, scan_quota_1.dailyCheckin)(user.id)];
                                        case 2:
                                            result = _b.sent();
                                            res.json(result);
                                            return [3 /*break*/, 4];
                                        case 3:
                                            error_26 = _b.sent();
                                            console.error("Daily checkin error:", error_26);
                                            res.status(500).json({ error: error_26.message || "Checkin failed" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // GET /api/user/scan-quota — returns current scan quota for the authed user
                            app.get("/api/user/scan-quota", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, quota, error_27;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 3, , 4]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _b.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            if (user.isPremium) {
                                                res.json({ isPremium: true, unlimited: true });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, (0, scan_quota_1.getUserQuota)(user.id)];
                                        case 2:
                                            quota = _b.sent();
                                            res.json(quota);
                                            return [3 /*break*/, 4];
                                        case 3:
                                            error_27 = _b.sent();
                                            console.error("Scan quota error:", error_27);
                                            res.status(500).json({ error: error_27.message || "Failed to fetch quota" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Avatar upload ────────────────────────────────────────────────────────────
                            app.post("/api/user/avatar", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, _a, base64, mimeType, dataUrl, updated, error_28;
                                var _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _c.trys.push([0, 3, , 4]);
                                            token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _c.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            _a = req.body, base64 = _a.base64, mimeType = _a.mimeType;
                                            if (!base64 || typeof base64 !== "string") {
                                                res.status(400).json({ error: "base64 image data required" });
                                                return [2 /*return*/];
                                            }
                                            // ~1.5 MB base64 cap (~1.1 MB raw image)
                                            if (base64.length > 1572864) {
                                                res.status(400).json({ error: "Image too large. Please choose a smaller image." });
                                                return [2 /*return*/];
                                            }
                                            dataUrl = "data:".concat(mimeType || "image/jpeg", ";base64,").concat(base64);
                                            return [4 /*yield*/, storage_1.storage.updateUser(user.id, { avatarUrl: dataUrl })];
                                        case 2:
                                            updated = _c.sent();
                                            if (!updated) {
                                                res.status(404).json({ error: "User not found" });
                                                return [2 /*return*/];
                                            }
                                            res.json({ avatarUrl: dataUrl });
                                            return [3 /*break*/, 4];
                                        case 3:
                                            error_28 = _c.sent();
                                            console.error("Avatar upload error:", error_28);
                                            res.status(500).json({ error: error_28.message || "Upload failed" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Scan History CRUD ───────────────────────────────────────────────────────
                            app.get("/api/scan-history", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, rows, entries, error_29;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 3, , 4]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _b.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_5 || (templateObject_5 = __makeTemplateObject(["SELECT * FROM pokescan_scan_history WHERE user_id = ", " ORDER BY scanned_at DESC LIMIT 25"], ["SELECT * FROM pokescan_scan_history WHERE user_id = ", " ORDER BY scanned_at DESC LIMIT 25"])), user.id))];
                                        case 2:
                                            rows = _b.sent();
                                            entries = rows.rows.map(function (r) { return ({
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
                                                pcvResults: JSON.parse(r.pcv_results || "[]"),
                                            }); });
                                            res.json({ history: entries });
                                            return [3 /*break*/, 4];
                                        case 3:
                                            error_29 = _b.sent();
                                            console.error("Scan history fetch error:", error_29);
                                            res.status(500).json({ error: error_29.message || "Failed to fetch scan history" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/scan-history", express_1.default.json({ limit: "10mb" }), function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, _a, cardName, setName, cardNumber, language, thumbnail, priceGBP, identification, tcgApiResults, pcvResults, id, rows, entries, error_30;
                                var _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _c.trys.push([0, 5, , 6]);
                                            token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _c.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            _a = req.body, cardName = _a.cardName, setName = _a.setName, cardNumber = _a.cardNumber, language = _a.language, thumbnail = _a.thumbnail, priceGBP = _a.priceGBP, identification = _a.identification, tcgApiResults = _a.tcgApiResults, pcvResults = _a.pcvResults;
                                            if (!cardName) {
                                                res.status(400).json({ error: "cardName is required" });
                                                return [2 /*return*/];
                                            }
                                            id = "".concat(Date.now(), "-").concat(Math.random().toString(36).substr(2, 9));
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_6 || (templateObject_6 = __makeTemplateObject(["INSERT INTO pokescan_scan_history (id, user_id, card_name, set_name, card_number, language, thumbnail, price_gbp, identification, tcg_api_results, pcv_results)\n            VALUES (", ", ", ", ", ", ", ", ", ", ", ",\n                    ", ", ", ",\n                    ", ", ", ", ", ")"], ["INSERT INTO pokescan_scan_history (id, user_id, card_name, set_name, card_number, language, thumbnail, price_gbp, identification, tcg_api_results, pcv_results)\n            VALUES (", ", ", ", ", ", ", ", ", ", ", ",\n                    ", ", ", ",\n                    ", ", ", ", ", ")"])), id, user.id, cardName, setName || "", cardNumber || "", language || "english", thumbnail || null, priceGBP !== null && priceGBP !== void 0 ? priceGBP : null, JSON.stringify(identification || {}), JSON.stringify(tcgApiResults || []), JSON.stringify(pcvResults || [])))];
                                        case 2:
                                            _c.sent();
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_7 || (templateObject_7 = __makeTemplateObject(["DELETE FROM pokescan_scan_history WHERE user_id = ", " AND id NOT IN (\n              SELECT id FROM pokescan_scan_history WHERE user_id = ", " ORDER BY scanned_at DESC LIMIT 25\n            )"], ["DELETE FROM pokescan_scan_history WHERE user_id = ", " AND id NOT IN (\n              SELECT id FROM pokescan_scan_history WHERE user_id = ", " ORDER BY scanned_at DESC LIMIT 25\n            )"])), user.id, user.id))];
                                        case 3:
                                            _c.sent();
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_8 || (templateObject_8 = __makeTemplateObject(["SELECT * FROM pokescan_scan_history WHERE user_id = ", " ORDER BY scanned_at DESC LIMIT 25"], ["SELECT * FROM pokescan_scan_history WHERE user_id = ", " ORDER BY scanned_at DESC LIMIT 25"])), user.id))];
                                        case 4:
                                            rows = _c.sent();
                                            entries = rows.rows.map(function (r) { return ({
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
                                                pcvResults: JSON.parse(r.pcv_results || "[]"),
                                            }); });
                                            res.json({ history: entries });
                                            return [3 /*break*/, 6];
                                        case 5:
                                            error_30 = _c.sent();
                                            console.error("Scan history add error:", error_30);
                                            res.status(500).json({ error: error_30.message || "Failed to add scan history entry" });
                                            return [3 /*break*/, 6];
                                        case 6: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/scan-history/bulk", express_1.default.json({ limit: "10mb" }), function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, entries, migrated, failed, _i, entries_1, entry, existingRows, scannedAt, _a, error_31;
                                var _b, _c;
                                return __generator(this, function (_d) {
                                    switch (_d.label) {
                                        case 0:
                                            _d.trys.push([0, 10, , 11]);
                                            token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _d.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            entries = req.body.entries;
                                            if (!Array.isArray(entries) || entries.length === 0) {
                                                res.json({ migrated: 0, failed: 0 });
                                                return [2 /*return*/];
                                            }
                                            migrated = 0;
                                            failed = 0;
                                            _i = 0, entries_1 = entries;
                                            _d.label = 2;
                                        case 2:
                                            if (!(_i < entries_1.length)) return [3 /*break*/, 8];
                                            entry = entries_1[_i];
                                            _d.label = 3;
                                        case 3:
                                            _d.trys.push([3, 6, , 7]);
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_9 || (templateObject_9 = __makeTemplateObject(["SELECT id FROM pokescan_scan_history WHERE id = ", " AND user_id = ", ""], ["SELECT id FROM pokescan_scan_history WHERE id = ", " AND user_id = ", ""])), entry.id, user.id))];
                                        case 4:
                                            existingRows = _d.sent();
                                            if (existingRows.rows.length > 0) {
                                                migrated++;
                                                return [3 /*break*/, 7];
                                            }
                                            scannedAt = entry.timestamp ? new Date(entry.timestamp) : new Date();
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_10 || (templateObject_10 = __makeTemplateObject(["INSERT INTO pokescan_scan_history (id, user_id, card_name, set_name, card_number, language, thumbnail, price_gbp, identification, tcg_api_results, pcv_results, scanned_at)\n                VALUES (", ", ", ", ", ", ", ", ", ",\n                        ", ", ", ", ", ",\n                        ", ", ", ", ", ", ", ")"], ["INSERT INTO pokescan_scan_history (id, user_id, card_name, set_name, card_number, language, thumbnail, price_gbp, identification, tcg_api_results, pcv_results, scanned_at)\n                VALUES (", ", ", ", ", ", ", ", ", ",\n                        ", ", ", ", ", ",\n                        ", ", ", ", ", ", ", ")"])), entry.id, user.id, entry.cardName || "", entry.setName || "", entry.cardNumber || "", entry.language || "english", entry.thumbnail || null, (_c = entry.priceGBP) !== null && _c !== void 0 ? _c : null, JSON.stringify(entry.identification || {}), JSON.stringify(entry.tcgApiResults || []), JSON.stringify(entry.pcvResults || []), scannedAt))];
                                        case 5:
                                            _d.sent();
                                            migrated++;
                                            return [3 /*break*/, 7];
                                        case 6:
                                            _a = _d.sent();
                                            failed++;
                                            return [3 /*break*/, 7];
                                        case 7:
                                            _i++;
                                            return [3 /*break*/, 2];
                                        case 8: return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_11 || (templateObject_11 = __makeTemplateObject(["DELETE FROM pokescan_scan_history WHERE user_id = ", " AND id NOT IN (\n              SELECT id FROM pokescan_scan_history WHERE user_id = ", " ORDER BY scanned_at DESC LIMIT 25\n            )"], ["DELETE FROM pokescan_scan_history WHERE user_id = ", " AND id NOT IN (\n              SELECT id FROM pokescan_scan_history WHERE user_id = ", " ORDER BY scanned_at DESC LIMIT 25\n            )"])), user.id, user.id))];
                                        case 9:
                                            _d.sent();
                                            res.json({ migrated: migrated, failed: failed });
                                            return [3 /*break*/, 11];
                                        case 10:
                                            error_31 = _d.sent();
                                            console.error("Scan history bulk migrate error:", error_31);
                                            res.status(500).json({ error: error_31.message || "Migration failed" });
                                            return [3 /*break*/, 11];
                                        case 11: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.delete("/api/scan-history", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, error_32;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 3, , 4]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _b.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_12 || (templateObject_12 = __makeTemplateObject(["DELETE FROM pokescan_scan_history WHERE user_id = ", ""], ["DELETE FROM pokescan_scan_history WHERE user_id = ", ""])), user.id))];
                                        case 2:
                                            _b.sent();
                                            res.json({ history: [] });
                                            return [3 /*break*/, 4];
                                        case 3:
                                            error_32 = _b.sent();
                                            console.error("Scan history clear error:", error_32);
                                            res.status(500).json({ error: error_32.message || "Failed to clear scan history" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.delete("/api/scan-history/:id", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, id, rows, entries, error_33;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 4, , 5]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _b.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            id = req.params.id;
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_13 || (templateObject_13 = __makeTemplateObject(["DELETE FROM pokescan_scan_history WHERE id = ", " AND user_id = ", ""], ["DELETE FROM pokescan_scan_history WHERE id = ", " AND user_id = ", ""])), id, user.id))];
                                        case 2:
                                            _b.sent();
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_14 || (templateObject_14 = __makeTemplateObject(["SELECT * FROM pokescan_scan_history WHERE user_id = ", " ORDER BY scanned_at DESC LIMIT 25"], ["SELECT * FROM pokescan_scan_history WHERE user_id = ", " ORDER BY scanned_at DESC LIMIT 25"])), user.id))];
                                        case 3:
                                            rows = _b.sent();
                                            entries = rows.rows.map(function (r) { return ({
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
                                                pcvResults: JSON.parse(r.pcv_results || "[]"),
                                            }); });
                                            res.json({ history: entries });
                                            return [3 /*break*/, 5];
                                        case 4:
                                            error_33 = _b.sent();
                                            console.error("Scan history delete error:", error_33);
                                            res.status(500).json({ error: error_33.message || "Failed to delete scan history entry" });
                                            return [3 /*break*/, 5];
                                        case 5: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Collection CRUD ─────────────────────────────────────────────────────────
                            app.get("/api/collection", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, rows, items, error_34;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 3, , 4]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _b.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_15 || (templateObject_15 = __makeTemplateObject(["SELECT * FROM pokescan_collections WHERE user_id = ", " ORDER BY added_at DESC"], ["SELECT * FROM pokescan_collections WHERE user_id = ", " ORDER BY added_at DESC"])), user.id))];
                                        case 2:
                                            rows = _b.sent();
                                            items = rows.rows.map(function (r) {
                                                var _a;
                                                return ({
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
                                                    isVerified: (_a = r.is_verified) !== null && _a !== void 0 ? _a : false,
                                                    verifiedAt: r.verified_at || null,
                                                    addedAt: r.added_at,
                                                });
                                            });
                                            res.json({ collection: items });
                                            return [3 /*break*/, 4];
                                        case 3:
                                            error_34 = _b.sent();
                                            console.error("Collection fetch error:", error_34);
                                            res.status(500).json({ error: error_34.message || "Failed to fetch collection" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/collection", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, _a, cardId, cardName, cardImage, setName, setId_5, rarity, quantity, condition, variant, priceGBP, migrate, gradingCompany, grade, v, gc_1, gr, existing, row, newQty, rows, items, error_35;
                                var _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _c.trys.push([0, 8, , 9]);
                                            token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _c.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            _a = req.body, cardId = _a.cardId, cardName = _a.cardName, cardImage = _a.cardImage, setName = _a.setName, setId_5 = _a.setId, rarity = _a.rarity, quantity = _a.quantity, condition = _a.condition, variant = _a.variant, priceGBP = _a.priceGBP, migrate = _a.migrate, gradingCompany = _a.gradingCompany, grade = _a.grade;
                                            v = variant || "Non-Holo";
                                            gc_1 = gradingCompany || null;
                                            gr = grade || null;
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_16 || (templateObject_16 = __makeTemplateObject(["SELECT id, quantity FROM pokescan_collections\n            WHERE user_id = ", "\n              AND card_id = ", "\n              AND condition = ", "\n              AND COALESCE(variant, 'Non-Holo') = ", "\n              AND COALESCE(grading_company, '') = COALESCE(", ", '')\n              AND COALESCE(grade, '') = COALESCE(", ", '')"], ["SELECT id, quantity FROM pokescan_collections\n            WHERE user_id = ", "\n              AND card_id = ", "\n              AND condition = ", "\n              AND COALESCE(variant, 'Non-Holo') = ", "\n              AND COALESCE(grading_company, '') = COALESCE(", ", '')\n              AND COALESCE(grade, '') = COALESCE(", ", '')"])), user.id, cardId, condition, v, gc_1, gr))];
                                        case 2:
                                            existing = _c.sent();
                                            if (!(existing.rows.length > 0)) return [3 /*break*/, 4];
                                            row = existing.rows[0];
                                            newQty = migrate ? Math.max(row.quantity, quantity || 1) : row.quantity + (quantity || 1);
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_17 || (templateObject_17 = __makeTemplateObject(["UPDATE pokescan_collections SET quantity = ", ", price_gbp = ", " WHERE id = ", ""], ["UPDATE pokescan_collections SET quantity = ", ", price_gbp = ", " WHERE id = ", ""])), newQty, priceGBP !== null && priceGBP !== void 0 ? priceGBP : null, row.id))];
                                        case 3:
                                            _c.sent();
                                            return [3 /*break*/, 6];
                                        case 4: return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_18 || (templateObject_18 = __makeTemplateObject(["INSERT INTO pokescan_collections (user_id, card_id, card_name, card_image, set_name, set_id, rarity, quantity, condition, variant, price_gbp, grading_company, grade) VALUES (", ", ", ", ", ", ", ", ", ", ", ", ", ", ", ", ", ", ", ", ", ", ", ", ", ")"], ["INSERT INTO pokescan_collections (user_id, card_id, card_name, card_image, set_name, set_id, rarity, quantity, condition, variant, price_gbp, grading_company, grade) VALUES (", ", ", ", ", ", ", ", ", ", ", ", ", ", ", ", ", ", ", ", ", ", ", ", ", ")"])), user.id, cardId, cardName, cardImage !== null && cardImage !== void 0 ? cardImage : null, setName || setId_5 || "Unknown", setId_5 || null, rarity || "Unknown", quantity || 1, condition, v, priceGBP !== null && priceGBP !== void 0 ? priceGBP : null, gc_1, gr))];
                                        case 5:
                                            _c.sent();
                                            _c.label = 6;
                                        case 6: return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_19 || (templateObject_19 = __makeTemplateObject(["SELECT * FROM pokescan_collections WHERE user_id = ", " ORDER BY added_at DESC"], ["SELECT * FROM pokescan_collections WHERE user_id = ", " ORDER BY added_at DESC"])), user.id))];
                                        case 7:
                                            rows = _c.sent();
                                            items = rows.rows.map(function (r) {
                                                var _a;
                                                return ({
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
                                                    isVerified: (_a = r.is_verified) !== null && _a !== void 0 ? _a : false,
                                                    verifiedAt: r.verified_at || null,
                                                    addedAt: r.added_at,
                                                });
                                            });
                                            res.json({ collection: items });
                                            return [3 /*break*/, 9];
                                        case 8:
                                            error_35 = _c.sent();
                                            console.error("Collection add error:", error_35);
                                            res.status(500).json({ error: error_35.message || "Failed to add card" });
                                            return [3 /*break*/, 9];
                                        case 9: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.put("/api/collection/:id", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, id, _a, quantity, gradingCompany, grade, gc_2, gr, rows, items, error_36;
                                var _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _c.trys.push([0, 9, , 10]);
                                            token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _c.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            id = req.params.id;
                                            _a = req.body, quantity = _a.quantity, gradingCompany = _a.gradingCompany, grade = _a.grade;
                                            if (!(quantity <= 0)) return [3 /*break*/, 3];
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_20 || (templateObject_20 = __makeTemplateObject(["DELETE FROM pokescan_collections WHERE id = ", " AND user_id = ", ""], ["DELETE FROM pokescan_collections WHERE id = ", " AND user_id = ", ""])), id, user.id))];
                                        case 2:
                                            _c.sent();
                                            return [3 /*break*/, 7];
                                        case 3:
                                            if (!(gradingCompany !== undefined)) return [3 /*break*/, 5];
                                            gc_2 = gradingCompany || null;
                                            gr = grade || null;
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_21 || (templateObject_21 = __makeTemplateObject(["UPDATE pokescan_collections SET quantity = ", ", grading_company = ", ", grade = ", " WHERE id = ", " AND user_id = ", ""], ["UPDATE pokescan_collections SET quantity = ", ", grading_company = ", ", grade = ", " WHERE id = ", " AND user_id = ", ""])), quantity, gc_2, gr, id, user.id))];
                                        case 4:
                                            _c.sent();
                                            return [3 /*break*/, 7];
                                        case 5: return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_22 || (templateObject_22 = __makeTemplateObject(["UPDATE pokescan_collections SET quantity = ", " WHERE id = ", " AND user_id = ", ""], ["UPDATE pokescan_collections SET quantity = ", " WHERE id = ", " AND user_id = ", ""])), quantity, id, user.id))];
                                        case 6:
                                            _c.sent();
                                            _c.label = 7;
                                        case 7: return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_23 || (templateObject_23 = __makeTemplateObject(["SELECT * FROM pokescan_collections WHERE user_id = ", " ORDER BY added_at DESC"], ["SELECT * FROM pokescan_collections WHERE user_id = ", " ORDER BY added_at DESC"])), user.id))];
                                        case 8:
                                            rows = _c.sent();
                                            items = rows.rows.map(function (r) {
                                                var _a;
                                                return ({
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
                                                    isVerified: (_a = r.is_verified) !== null && _a !== void 0 ? _a : false,
                                                    verifiedAt: r.verified_at || null,
                                                    addedAt: r.added_at,
                                                });
                                            });
                                            res.json({ collection: items });
                                            return [3 /*break*/, 10];
                                        case 9:
                                            error_36 = _c.sent();
                                            console.error("Collection update error:", error_36);
                                            res.status(500).json({ error: error_36.message || "Failed to update card" });
                                            return [3 /*break*/, 10];
                                        case 10: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.delete("/api/collection/:id", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, id, rows, items, error_37;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 4, , 5]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _b.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            id = req.params.id;
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_24 || (templateObject_24 = __makeTemplateObject(["DELETE FROM pokescan_collections WHERE id = ", " AND user_id = ", ""], ["DELETE FROM pokescan_collections WHERE id = ", " AND user_id = ", ""])), id, user.id))];
                                        case 2:
                                            _b.sent();
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_25 || (templateObject_25 = __makeTemplateObject(["SELECT * FROM pokescan_collections WHERE user_id = ", " ORDER BY added_at DESC"], ["SELECT * FROM pokescan_collections WHERE user_id = ", " ORDER BY added_at DESC"])), user.id))];
                                        case 3:
                                            rows = _b.sent();
                                            items = rows.rows.map(function (r) {
                                                var _a;
                                                return ({
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
                                                    isVerified: (_a = r.is_verified) !== null && _a !== void 0 ? _a : false,
                                                    verifiedAt: r.verified_at || null,
                                                    addedAt: r.added_at,
                                                });
                                            });
                                            res.json({ collection: items });
                                            return [3 /*break*/, 5];
                                        case 4:
                                            error_37 = _b.sent();
                                            console.error("Collection delete error:", error_37);
                                            res.status(500).json({ error: error_37.message || "Failed to remove card" });
                                            return [3 /*break*/, 5];
                                        case 5: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Card photo verification ──────────────────────────────────────────────
                            app.post("/api/collection/:id/verify", express_1.default.json({ limit: "25mb" }), function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, id, _a, frontImageBase64, backImageBase64, row, card, cardNumber, prompt_1, aiRes, raw, jsonMatch, parsed, verified, verifiedPercent, badgeEarned, countRow, counts, total, verifiedCount, alreadyBadged, err_17;
                                var _b, _c, _d, _e, _f, _g;
                                return __generator(this, function (_h) {
                                    switch (_h.label) {
                                        case 0:
                                            _h.trys.push([0, 9, , 10]);
                                            token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _h.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid session" });
                                                return [2 /*return*/];
                                            }
                                            id = req.params.id;
                                            _a = req.body, frontImageBase64 = _a.frontImageBase64, backImageBase64 = _a.backImageBase64;
                                            if (!frontImageBase64 || !backImageBase64) {
                                                res.status(400).json({ error: "Both frontImageBase64 and backImageBase64 are required" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_26 || (templateObject_26 = __makeTemplateObject(["SELECT card_name, set_name, card_id, card_image FROM pokescan_collections WHERE id = ", " AND user_id = ", ""], ["SELECT card_name, set_name, card_id, card_image FROM pokescan_collections WHERE id = ", " AND user_id = ", ""])), id, user.id))];
                                        case 2:
                                            row = _h.sent();
                                            if (!row.rows.length) {
                                                res.status(404).json({ error: "Collection item not found" });
                                                return [2 /*return*/];
                                            }
                                            card = row.rows[0];
                                            cardNumber = ((_c = card.card_id) === null || _c === void 0 ? void 0 : _c.split("-").pop()) || "";
                                            prompt_1 = "You are a Pok\u00E9mon TCG card verification expert. A user claims this physical card is:\nCard Name: ".concat(card.card_name, "\nSet Name: ").concat(card.set_name, "\nCard Number: ").concat(cardNumber, "\n\nYou have been given TWO photos: the first is the FRONT of the physical card, the second is the BACK.\n\nExamine both images carefully and determine whether the physical card shown matches the claimed card.\nCheck: the card name printed on the card, the artwork/illustration, set symbol, collector number, and overall appearance.\nThe card back should show the standard Pok\u00E9mon TCG card back design (red/blue Pok\u00E9 Ball pattern).\n\nReturn ONLY valid JSON with no markdown:\n{\"matches\": true, \"confidence\": \"high\", \"reason\": \"The card name, artwork and set symbol all match exactly.\"}\n\nconfidence must be \"high\", \"medium\", or \"low\".\nmatches must be true or false.");
                                            return [4 /*yield*/, openai.chat.completions.create({
                                                    model: "gpt-4o",
                                                    max_tokens: 200,
                                                    messages: [{
                                                            role: "user",
                                                            content: [
                                                                { type: "text", text: prompt_1 },
                                                                { type: "image_url", image_url: { url: frontImageBase64, detail: "high" } },
                                                                { type: "image_url", image_url: { url: backImageBase64, detail: "low" } },
                                                            ],
                                                        }],
                                                })];
                                        case 3:
                                            aiRes = _h.sent();
                                            raw = ((_f = (_e = (_d = aiRes.choices[0]) === null || _d === void 0 ? void 0 : _d.message) === null || _e === void 0 ? void 0 : _e.content) === null || _f === void 0 ? void 0 : _f.trim()) || "";
                                            jsonMatch = raw.match(/\{[\s\S]*\}/);
                                            if (!jsonMatch)
                                                throw new Error("AI returned invalid response");
                                            parsed = JSON.parse(jsonMatch[0]);
                                            verified = !!(parsed.matches && parsed.confidence !== "low");
                                            verifiedPercent = 0;
                                            badgeEarned = false;
                                            if (!verified) return [3 /*break*/, 8];
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_27 || (templateObject_27 = __makeTemplateObject(["UPDATE pokescan_collections SET is_verified = true, verified_at = NOW() WHERE id = ", " AND user_id = ", ""], ["UPDATE pokescan_collections SET is_verified = true, verified_at = NOW() WHERE id = ", " AND user_id = ", ""])), id, user.id))];
                                        case 4:
                                            _h.sent();
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_28 || (templateObject_28 = __makeTemplateObject(["SELECT COUNT(*) FILTER (WHERE is_verified = true) AS verified_count, COUNT(*) AS total_count FROM pokescan_collections WHERE user_id = ", ""], ["SELECT COUNT(*) FILTER (WHERE is_verified = true) AS verified_count, COUNT(*) AS total_count FROM pokescan_collections WHERE user_id = ", ""])), user.id))];
                                        case 5:
                                            countRow = _h.sent();
                                            counts = countRow.rows[0];
                                            total = parseInt(counts.total_count) || 0;
                                            verifiedCount = parseInt(counts.verified_count) || 0;
                                            verifiedPercent = total > 0 ? Math.round((verifiedCount / total) * 100) : 0;
                                            if (!(total > 0 && verifiedCount / total >= 0.9)) return [3 /*break*/, 8];
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_29 || (templateObject_29 = __makeTemplateObject(["SELECT is_verified_collector FROM pokescan_users WHERE id = ", ""], ["SELECT is_verified_collector FROM pokescan_users WHERE id = ", ""])), user.id))];
                                        case 6:
                                            alreadyBadged = _h.sent();
                                            if (!!((_g = alreadyBadged.rows[0]) === null || _g === void 0 ? void 0 : _g.is_verified_collector)) return [3 /*break*/, 8];
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_30 || (templateObject_30 = __makeTemplateObject(["UPDATE pokescan_users SET is_verified_collector = true WHERE id = ", ""], ["UPDATE pokescan_users SET is_verified_collector = true WHERE id = ", ""])), user.id))];
                                        case 7:
                                            _h.sent();
                                            badgeEarned = true;
                                            _h.label = 8;
                                        case 8:
                                            res.json({
                                                verified: verified,
                                                confidence: parsed.confidence || "low",
                                                reason: parsed.reason || "Unable to determine.",
                                                verifiedPercent: verifiedPercent,
                                                badgeEarned: badgeEarned,
                                            });
                                            return [3 /*break*/, 10];
                                        case 9:
                                            err_17 = _h.sent();
                                            console.error("Card verify error:", err_17);
                                            res.status(500).json({ error: "Verification failed" });
                                            return [3 /*break*/, 10];
                                        case 10: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Top verified value collections ──────────────────────────────────────
                            app.get("/api/collections/top-verified", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, me, result, top_1, err_18;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 3, , 4]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            me = _b.sent();
                                            if (!me) {
                                                res.status(401).json({ error: "Invalid session" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_31 || (templateObject_31 = __makeTemplateObject(["SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_verified_collector,\n                   COUNT(c.id) FILTER (WHERE c.is_verified = true)::int AS verified_count,\n                   COUNT(c.id)::int AS total_count,\n                   COALESCE(SUM(c.price_gbp * c.quantity) FILTER (WHERE c.is_verified = true), 0) AS verified_value\n            FROM pokescan_users u\n            JOIN pokescan_collections c ON c.user_id = u.id\n            WHERE u.collection_visible = true\n            GROUP BY u.id, u.username, u.display_name, u.avatar_url, u.is_verified_collector\n            HAVING COUNT(c.id) FILTER (WHERE c.is_verified = true) > 0\n            ORDER BY verified_value DESC\n            LIMIT 10"], ["SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_verified_collector,\n                   COUNT(c.id) FILTER (WHERE c.is_verified = true)::int AS verified_count,\n                   COUNT(c.id)::int AS total_count,\n                   COALESCE(SUM(c.price_gbp * c.quantity) FILTER (WHERE c.is_verified = true), 0) AS verified_value\n            FROM pokescan_users u\n            JOIN pokescan_collections c ON c.user_id = u.id\n            WHERE u.collection_visible = true\n            GROUP BY u.id, u.username, u.display_name, u.avatar_url, u.is_verified_collector\n            HAVING COUNT(c.id) FILTER (WHERE c.is_verified = true) > 0\n            ORDER BY verified_value DESC\n            LIMIT 10"]))))];
                                        case 2:
                                            result = _b.sent();
                                            top_1 = result.rows.map(function (r) {
                                                var _a;
                                                return ({
                                                    id: r.id,
                                                    username: r.username,
                                                    displayName: r.display_name,
                                                    avatarUrl: r.avatar_url || null,
                                                    isVerifiedCollector: (_a = r.is_verified_collector) !== null && _a !== void 0 ? _a : false,
                                                    verifiedCount: r.verified_count,
                                                    totalCount: r.total_count,
                                                    verifiedValue: parseFloat(r.verified_value) || 0,
                                                    verifiedPercent: r.total_count > 0 ? Math.round((r.verified_count / r.total_count) * 100) : 0,
                                                });
                                            });
                                            res.json({ top: top_1 });
                                            return [3 /*break*/, 4];
                                        case 3:
                                            err_18 = _b.sent();
                                            res.status(500).json({ error: err_18.message || "Failed to fetch top verified" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Collection visibility toggle ─────────────────────────────────────────
                            app.patch("/api/user/collection-visible", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, visible, updated, error_38;
                                var _a, _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _c.trys.push([0, 3, , 4]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _c.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid session" });
                                                return [2 /*return*/];
                                            }
                                            visible = req.body.visible;
                                            return [4 /*yield*/, storage_1.storage.updateUser(user.id, { collectionVisible: !!visible })];
                                        case 2:
                                            updated = _c.sent();
                                            res.json({ collectionVisible: (_b = updated === null || updated === void 0 ? void 0 : updated.collectionVisible) !== null && _b !== void 0 ? _b : !!visible });
                                            return [3 /*break*/, 4];
                                        case 3:
                                            error_38 = _c.sent();
                                            res.status(500).json({ error: error_38.message || "Failed to update visibility" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // Alias for collection visibility following task API contract
                            app.patch("/api/collection/privacy", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, isPublic, updated, error_39;
                                var _a, _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _c.trys.push([0, 3, , 4]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _c.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid session" });
                                                return [2 /*return*/];
                                            }
                                            isPublic = req.body.isPublic;
                                            return [4 /*yield*/, storage_1.storage.updateUser(user.id, { collectionVisible: !!isPublic })];
                                        case 2:
                                            updated = _c.sent();
                                            res.json({ isPublic: (_b = updated === null || updated === void 0 ? void 0 : updated.collectionVisible) !== null && _b !== void 0 ? _b : !!isPublic });
                                            return [3 /*break*/, 4];
                                        case 3:
                                            error_39 = _c.sent();
                                            res.status(500).json({ error: error_39.message || "Failed to update privacy" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── View a friend's public collection ────────────────────────────────────
                            app.get("/api/collection/user/:userId", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, me, userId, target, friendship, rows, items, error_40;
                                var _a, _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _c.trys.push([0, 5, , 6]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            me = _c.sent();
                                            if (!me) {
                                                res.status(401).json({ error: "Invalid session" });
                                                return [2 /*return*/];
                                            }
                                            userId = req.params.userId;
                                            return [4 /*yield*/, storage_1.storage.getUserById(userId)];
                                        case 2:
                                            target = _c.sent();
                                            if (!target) {
                                                res.status(404).json({ error: "User not found" });
                                                return [2 /*return*/];
                                            }
                                            if (!target.collectionVisible) {
                                                res.status(403).json({ error: "This collection is private" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_32 || (templateObject_32 = __makeTemplateObject(["SELECT id FROM pokescan_friendships WHERE status = 'accepted' AND (\n          (requester_id = ", " AND addressee_id = ", ") OR\n          (requester_id = ", " AND addressee_id = ", ")\n        )"], ["SELECT id FROM pokescan_friendships WHERE status = 'accepted' AND (\n          (requester_id = ", " AND addressee_id = ", ") OR\n          (requester_id = ", " AND addressee_id = ", ")\n        )"])), me.id, userId, userId, me.id))];
                                        case 3:
                                            friendship = _c.sent();
                                            if (friendship.rows.length === 0 && me.id !== userId) {
                                                res.status(403).json({ error: "You are not friends with this user" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_33 || (templateObject_33 = __makeTemplateObject(["SELECT * FROM pokescan_collections WHERE user_id = ", " ORDER BY added_at DESC"], ["SELECT * FROM pokescan_collections WHERE user_id = ", " ORDER BY added_at DESC"])), userId))];
                                        case 4:
                                            rows = _c.sent();
                                            items = rows.rows.map(function (r) {
                                                var _a;
                                                return ({
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
                                                    isVerified: (_a = r.is_verified) !== null && _a !== void 0 ? _a : false,
                                                    verifiedAt: r.verified_at || null,
                                                    addedAt: r.added_at,
                                                });
                                            });
                                            res.json({ collection: items, owner: { id: target.id, displayName: target.displayName, username: target.username, avatarUrl: target.avatarUrl, isVerifiedCollector: (_b = target.isVerifiedCollector) !== null && _b !== void 0 ? _b : false } });
                                            return [3 /*break*/, 6];
                                        case 5:
                                            error_40 = _c.sent();
                                            res.status(500).json({ error: error_40.message || "Failed to fetch collection" });
                                            return [3 /*break*/, 6];
                                        case 6: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Public Collections browse ────────────────────────────────────────────
                            app.get("/api/collections/public", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, me, search, page_5, pageSize_2, offset_4, searchClause, result, collectors, error_41;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 3, , 4]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            me = _b.sent();
                                            if (!me) {
                                                res.status(401).json({ error: "Invalid session" });
                                                return [2 /*return*/];
                                            }
                                            search = (req.query.search || "").trim();
                                            page_5 = parseInt(req.query.page || "1", 10);
                                            pageSize_2 = 20;
                                            offset_4 = (page_5 - 1) * pageSize_2;
                                            searchClause = search
                                                ? (0, drizzle_orm_1.sql)(templateObject_34 || (templateObject_34 = __makeTemplateObject(["AND (u.username ILIKE ", " OR u.display_name ILIKE ", ")"], ["AND (u.username ILIKE ", " OR u.display_name ILIKE ", ")"])), '%' + search + '%', '%' + search + '%') : (0, drizzle_orm_1.sql)(templateObject_35 || (templateObject_35 = __makeTemplateObject([""], [""])));
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_36 || (templateObject_36 = __makeTemplateObject(["SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_verified_collector,\n                   COUNT(c.id)::int AS card_count,\n                   COALESCE(SUM(c.quantity), 0)::int AS total_quantity,\n                   COALESCE(SUM(c.price_gbp * c.quantity), 0) AS total_value\n            FROM pokescan_users u\n            LEFT JOIN pokescan_collections c ON c.user_id = u.id\n            WHERE u.collection_visible = true ", "\n            GROUP BY u.id, u.username, u.display_name, u.avatar_url, u.is_verified_collector\n            ORDER BY total_value DESC\n            LIMIT ", " OFFSET ", ""], ["SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_verified_collector,\n                   COUNT(c.id)::int AS card_count,\n                   COALESCE(SUM(c.quantity), 0)::int AS total_quantity,\n                   COALESCE(SUM(c.price_gbp * c.quantity), 0) AS total_value\n            FROM pokescan_users u\n            LEFT JOIN pokescan_collections c ON c.user_id = u.id\n            WHERE u.collection_visible = true ", "\n            GROUP BY u.id, u.username, u.display_name, u.avatar_url, u.is_verified_collector\n            ORDER BY total_value DESC\n            LIMIT ", " OFFSET ", ""])), searchClause, pageSize_2, offset_4))];
                                        case 2:
                                            result = _b.sent();
                                            collectors = result.rows.map(function (r) {
                                                var _a;
                                                return ({
                                                    id: r.id,
                                                    username: r.username,
                                                    displayName: r.display_name,
                                                    avatarUrl: r.avatar_url || null,
                                                    isVerifiedCollector: (_a = r.is_verified_collector) !== null && _a !== void 0 ? _a : false,
                                                    cardCount: r.card_count,
                                                    totalQuantity: r.total_quantity,
                                                    totalValue: parseFloat(r.total_value) || 0,
                                                });
                                            });
                                            res.json({ collectors: collectors, page: page_5, hasMore: collectors.length === pageSize_2 });
                                            return [3 /*break*/, 4];
                                        case 3:
                                            error_41 = _b.sent();
                                            res.status(500).json({ error: error_41.message || "Failed to fetch public collections" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Public collection view (no friendship required) ───────────────────────
                            app.get("/api/collections/public/:userId", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, me, userId, target, rows, items, error_42;
                                var _a, _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _c.trys.push([0, 4, , 5]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            me = _c.sent();
                                            if (!me) {
                                                res.status(401).json({ error: "Invalid session" });
                                                return [2 /*return*/];
                                            }
                                            userId = req.params.userId;
                                            return [4 /*yield*/, storage_1.storage.getUserById(userId)];
                                        case 2:
                                            target = _c.sent();
                                            if (!target) {
                                                res.status(404).json({ error: "User not found" });
                                                return [2 /*return*/];
                                            }
                                            if (!target.collectionVisible) {
                                                res.status(403).json({ error: "This collection is private" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_37 || (templateObject_37 = __makeTemplateObject(["SELECT * FROM pokescan_collections WHERE user_id = ", " ORDER BY added_at DESC"], ["SELECT * FROM pokescan_collections WHERE user_id = ", " ORDER BY added_at DESC"])), userId))];
                                        case 3:
                                            rows = _c.sent();
                                            items = rows.rows.map(function (r) {
                                                var _a;
                                                return ({
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
                                                    isVerified: (_a = r.is_verified) !== null && _a !== void 0 ? _a : false,
                                                    verifiedAt: r.verified_at || null,
                                                    addedAt: r.added_at,
                                                });
                                            });
                                            res.json({
                                                collection: items,
                                                owner: {
                                                    id: target.id,
                                                    displayName: target.displayName,
                                                    username: target.username,
                                                    avatarUrl: target.avatarUrl,
                                                    isVerifiedCollector: (_b = target.isVerifiedCollector) !== null && _b !== void 0 ? _b : false,
                                                }
                                            });
                                            return [3 /*break*/, 5];
                                        case 4:
                                            error_42 = _c.sent();
                                            res.status(500).json({ error: error_42.message || "Failed to fetch collection" });
                                            return [3 /*break*/, 5];
                                        case 5: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Collector Verification ────────────────────────────────────────────────
                            app.post("/api/collector-verification", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, _a, cardId, cardName, cardImage, frontPhoto, backPhoto, cardOwnership, existing, userRow, error_43;
                                var _b, _c;
                                return __generator(this, function (_d) {
                                    switch (_d.label) {
                                        case 0:
                                            _d.trys.push([0, 6, , 7]);
                                            token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _d.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid session" });
                                                return [2 /*return*/];
                                            }
                                            _a = req.body, cardId = _a.cardId, cardName = _a.cardName, cardImage = _a.cardImage, frontPhoto = _a.frontPhoto, backPhoto = _a.backPhoto;
                                            if (!cardId || !cardName || !frontPhoto || !backPhoto) {
                                                res.status(400).json({ error: "cardId, cardName, frontPhoto and backPhoto are required" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_38 || (templateObject_38 = __makeTemplateObject(["SELECT id, grading_company, grade FROM pokescan_collections\n            WHERE user_id = ", " AND card_id = ", "\n              AND grading_company IS NOT NULL AND grade IS NOT NULL\n            LIMIT 1"], ["SELECT id, grading_company, grade FROM pokescan_collections\n            WHERE user_id = ", " AND card_id = ", "\n              AND grading_company IS NOT NULL AND grade IS NOT NULL\n            LIMIT 1"])), user.id, cardId))];
                                        case 2:
                                            cardOwnership = _d.sent();
                                            if (cardOwnership.rows.length === 0) {
                                                res.status(403).json({ error: "The selected card must be a professionally graded entry in your collection (add it with a grading company and grade first)" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_39 || (templateObject_39 = __makeTemplateObject(["SELECT id FROM pokescan_collector_verifications WHERE user_id = ", " AND status = 'pending'"], ["SELECT id FROM pokescan_collector_verifications WHERE user_id = ", " AND status = 'pending'"])), user.id))];
                                        case 3:
                                            existing = _d.sent();
                                            if (existing.rows.length > 0) {
                                                res.status(409).json({ error: "You already have a pending verification application" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_40 || (templateObject_40 = __makeTemplateObject(["SELECT is_verified_collector FROM pokescan_users WHERE id = ", ""], ["SELECT is_verified_collector FROM pokescan_users WHERE id = ", ""])), user.id))];
                                        case 4:
                                            userRow = _d.sent();
                                            if ((_c = userRow.rows[0]) === null || _c === void 0 ? void 0 : _c.is_verified_collector) {
                                                res.status(409).json({ error: "You are already a Verified Collector" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_41 || (templateObject_41 = __makeTemplateObject(["INSERT INTO pokescan_collector_verifications (user_id, card_id, card_name, card_image, front_photo, back_photo)\n            VALUES (", ", ", ", ", ", ", ", ", ", ", ")"], ["INSERT INTO pokescan_collector_verifications (user_id, card_id, card_name, card_image, front_photo, back_photo)\n            VALUES (", ", ", ", ", ", ", ", ", ", ", ")"])), user.id, cardId, cardName, cardImage || "", frontPhoto, backPhoto))];
                                        case 5:
                                            _d.sent();
                                            res.json({ success: true, message: "Application submitted" });
                                            return [3 /*break*/, 7];
                                        case 6:
                                            error_43 = _d.sent();
                                            res.status(500).json({ error: error_43.message || "Failed to submit verification" });
                                            return [3 /*break*/, 7];
                                        case 7: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.get("/api/collector-verification/status", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, user, row, app_1, error_44;
                                var _a, _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _c.trys.push([0, 3, , 4]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            user = _c.sent();
                                            if (!user) {
                                                res.status(401).json({ error: "Invalid session" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_42 || (templateObject_42 = __makeTemplateObject(["SELECT id, status, created_at FROM pokescan_collector_verifications WHERE user_id = ", " ORDER BY created_at DESC LIMIT 1"], ["SELECT id, status, created_at FROM pokescan_collector_verifications WHERE user_id = ", " ORDER BY created_at DESC LIMIT 1"])), user.id))];
                                        case 2:
                                            row = _c.sent();
                                            app_1 = row.rows[0];
                                            res.json({
                                                isVerifiedCollector: (_b = user.isVerifiedCollector) !== null && _b !== void 0 ? _b : false,
                                                application: app_1 ? { id: app_1.id, status: app_1.status, createdAt: app_1.created_at } : null,
                                            });
                                            return [3 /*break*/, 4];
                                        case 3:
                                            error_44 = _c.sent();
                                            res.status(500).json({ error: error_44.message || "Failed to get verification status" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.get("/api/admin/collector-verifications", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var adminToken, admin, _a, status_5, result, verifications, error_45;
                                var _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _c.trys.push([0, 5, , 6]);
                                            adminToken = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", "");
                                            if (!adminToken) return [3 /*break*/, 2];
                                            return [4 /*yield*/, storage_1.storage.validateSession(adminToken)];
                                        case 1:
                                            _a = _c.sent();
                                            return [3 /*break*/, 3];
                                        case 2:
                                            _a = null;
                                            _c.label = 3;
                                        case 3:
                                            admin = _a;
                                            if (!admin || (admin.role !== "admin" && admin.role !== "moderator")) {
                                                res.status(403).json({ error: "Forbidden" });
                                                return [2 /*return*/];
                                            }
                                            status_5 = req.query.status || "pending";
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_43 || (templateObject_43 = __makeTemplateObject(["SELECT v.*, u.username, u.display_name, u.avatar_url\n            FROM pokescan_collector_verifications v\n            JOIN pokescan_users u ON u.id = v.user_id\n            WHERE v.status = ", "\n            ORDER BY v.created_at DESC"], ["SELECT v.*, u.username, u.display_name, u.avatar_url\n            FROM pokescan_collector_verifications v\n            JOIN pokescan_users u ON u.id = v.user_id\n            WHERE v.status = ", "\n            ORDER BY v.created_at DESC"])), status_5))];
                                        case 4:
                                            result = _c.sent();
                                            verifications = result.rows.map(function (r) { return ({
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
                                                createdAt: r.created_at,
                                            }); });
                                            res.json({ verifications: verifications });
                                            return [3 /*break*/, 6];
                                        case 5:
                                            error_45 = _c.sent();
                                            res.status(500).json({ error: error_45.message || "Failed to fetch verifications" });
                                            return [3 /*break*/, 6];
                                        case 6: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/admin/collector-verifications/:id/approve", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, reviewer, _a, id, ver, v, error_46;
                                var _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _c.trys.push([0, 7, , 8]);
                                            token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", "");
                                            if (!token) return [3 /*break*/, 2];
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            _a = _c.sent();
                                            return [3 /*break*/, 3];
                                        case 2:
                                            _a = null;
                                            _c.label = 3;
                                        case 3:
                                            reviewer = _a;
                                            if (!reviewer || (reviewer.role !== "admin" && reviewer.role !== "moderator")) {
                                                res.status(403).json({ error: "Forbidden" });
                                                return [2 /*return*/];
                                            }
                                            id = req.params.id;
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_44 || (templateObject_44 = __makeTemplateObject(["SELECT * FROM pokescan_collector_verifications WHERE id = ", ""], ["SELECT * FROM pokescan_collector_verifications WHERE id = ", ""])), id))];
                                        case 4:
                                            ver = _c.sent();
                                            if (!ver.rows.length) {
                                                res.status(404).json({ error: "Not found" });
                                                return [2 /*return*/];
                                            }
                                            v = ver.rows[0];
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_45 || (templateObject_45 = __makeTemplateObject(["UPDATE pokescan_collector_verifications SET status = 'approved', reviewed_by = ", ", reviewed_at = NOW() WHERE id = ", ""], ["UPDATE pokescan_collector_verifications SET status = 'approved', reviewed_by = ", ", reviewed_at = NOW() WHERE id = ", ""])), (reviewer === null || reviewer === void 0 ? void 0 : reviewer.id) || null, id))];
                                        case 5:
                                            _c.sent();
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_46 || (templateObject_46 = __makeTemplateObject(["UPDATE pokescan_users SET is_verified_collector = true WHERE id = ", ""], ["UPDATE pokescan_users SET is_verified_collector = true WHERE id = ", ""])), v.user_id))];
                                        case 6:
                                            _c.sent();
                                            res.json({ success: true });
                                            return [3 /*break*/, 8];
                                        case 7:
                                            error_46 = _c.sent();
                                            res.status(500).json({ error: error_46.message || "Failed to approve" });
                                            return [3 /*break*/, 8];
                                        case 8: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/admin/collector-verifications/:id/reject", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, reviewer, _a, id, error_47;
                                var _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _c.trys.push([0, 5, , 6]);
                                            token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", "");
                                            if (!token) return [3 /*break*/, 2];
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            _a = _c.sent();
                                            return [3 /*break*/, 3];
                                        case 2:
                                            _a = null;
                                            _c.label = 3;
                                        case 3:
                                            reviewer = _a;
                                            if (!reviewer || (reviewer.role !== "admin" && reviewer.role !== "moderator")) {
                                                res.status(403).json({ error: "Forbidden" });
                                                return [2 /*return*/];
                                            }
                                            id = req.params.id;
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_47 || (templateObject_47 = __makeTemplateObject(["UPDATE pokescan_collector_verifications SET status = 'rejected', reviewed_by = ", ", reviewed_at = NOW() WHERE id = ", ""], ["UPDATE pokescan_collector_verifications SET status = 'rejected', reviewed_by = ", ", reviewed_at = NOW() WHERE id = ", ""])), (reviewer === null || reviewer === void 0 ? void 0 : reviewer.id) || null, id))];
                                        case 4:
                                            _c.sent();
                                            res.json({ success: true });
                                            return [3 /*break*/, 6];
                                        case 5:
                                            error_47 = _c.sent();
                                            res.status(500).json({ error: error_47.message || "Failed to reject" });
                                            return [3 /*break*/, 6];
                                        case 6: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.get("/api/admin/subscription-stats", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, caller, MONTHLY_PRICE_1, ANNUAL_PRICE_1, MONTHLY_ID_1, ANNUAL_ID_1, result, subscribers, now, dayStart, weekStart, monthStart, yearStart, dailyRevenue, weeklyRevenue, monthlyRevenue, yearlyRevenue, totalActive, monthlyCount, annualCount, _i, subscribers_1, s, pEnd, periodStart, monthlyRecurring, error_48;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 3, , 4]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            caller = _b.sent();
                                            if (!caller) {
                                                res.status(401).json({ error: "Invalid session" });
                                                return [2 /*return*/];
                                            }
                                            if (caller.role !== "admin") {
                                                res.status(403).json({ error: "Admin required" });
                                                return [2 /*return*/];
                                            }
                                            MONTHLY_PRICE_1 = 4.99;
                                            ANNUAL_PRICE_1 = 49.99;
                                            MONTHLY_ID_1 = "price_1TM7D8K7N6BNdayAPnuINUuU";
                                            ANNUAL_ID_1 = "price_1TM7D8K7N6BNdayAB1PFakyH";
                                            return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_48 || (templateObject_48 = __makeTemplateObject(["SELECT id, username, display_name, stripe_price_id, subscription_status, subscription_period_end, created_at\n            FROM pokescan_users\n            WHERE is_premium = true AND subscription_status IS NOT NULL\n            ORDER BY subscription_period_end DESC NULLS LAST"], ["SELECT id, username, display_name, stripe_price_id, subscription_status, subscription_period_end, created_at\n            FROM pokescan_users\n            WHERE is_premium = true AND subscription_status IS NOT NULL\n            ORDER BY subscription_period_end DESC NULLS LAST"]))))];
                                        case 2:
                                            result = _b.sent();
                                            subscribers = result.rows.map(function (r) {
                                                var plan = r.stripe_price_id === MONTHLY_ID_1 ? "monthly" : r.stripe_price_id === ANNUAL_ID_1 ? "annual" : "unknown";
                                                return {
                                                    id: r.id,
                                                    username: r.username,
                                                    displayName: r.display_name,
                                                    plan: plan,
                                                    price: plan === "monthly" ? MONTHLY_PRICE_1 : plan === "annual" ? ANNUAL_PRICE_1 : 0,
                                                    status: r.subscription_status,
                                                    periodEnd: r.subscription_period_end,
                                                    createdAt: r.created_at,
                                                };
                                            });
                                            now = new Date();
                                            dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                            weekStart = new Date(dayStart);
                                            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                                            monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                                            yearStart = new Date(now.getFullYear(), 0, 1);
                                            dailyRevenue = 0, weeklyRevenue = 0, monthlyRevenue = 0, yearlyRevenue = 0;
                                            totalActive = 0, monthlyCount = 0, annualCount = 0;
                                            for (_i = 0, subscribers_1 = subscribers; _i < subscribers_1.length; _i++) {
                                                s = subscribers_1[_i];
                                                if (s.status === "active" || s.status === "canceling") {
                                                    totalActive++;
                                                    if (s.plan === "monthly")
                                                        monthlyCount++;
                                                    else
                                                        annualCount++;
                                                }
                                                if (s.periodEnd) {
                                                    pEnd = new Date(s.periodEnd);
                                                    periodStart = s.plan === "monthly"
                                                        ? new Date(pEnd.getTime() - 30 * 24 * 60 * 60 * 1000)
                                                        : new Date(pEnd.getTime() - 365 * 24 * 60 * 60 * 1000);
                                                    if (periodStart >= dayStart)
                                                        dailyRevenue += s.price;
                                                    if (periodStart >= weekStart)
                                                        weeklyRevenue += s.price;
                                                    if (periodStart >= monthStart)
                                                        monthlyRevenue += s.price;
                                                    if (periodStart >= yearStart)
                                                        yearlyRevenue += s.price;
                                                }
                                            }
                                            monthlyRecurring = monthlyCount * MONTHLY_PRICE_1 + annualCount * (ANNUAL_PRICE_1 / 12);
                                            res.json({
                                                subscribers: subscribers,
                                                stats: {
                                                    totalActive: totalActive,
                                                    monthlyCount: monthlyCount,
                                                    annualCount: annualCount,
                                                    dailyRevenue: dailyRevenue,
                                                    weeklyRevenue: weeklyRevenue,
                                                    monthlyRevenue: monthlyRevenue,
                                                    yearlyRevenue: yearlyRevenue,
                                                    monthlyRecurring: Math.round(monthlyRecurring * 100) / 100,
                                                },
                                            });
                                            return [3 /*break*/, 4];
                                        case 3:
                                            error_48 = _b.sent();
                                            console.error("Subscription stats error:", error_48);
                                            res.status(500).json({ error: error_48.message || "Failed to fetch stats" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.get("/api/auth/users", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, session, caller, users, error_49;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 4, , 5]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Authentication required" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            session = _b.sent();
                                            if (!session) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.getUserById(session.userId)];
                                        case 2:
                                            caller = _b.sent();
                                            if (!caller || (caller.role !== "admin" && caller.role !== "moderator")) {
                                                res.status(403).json({ error: "Insufficient permissions" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.getAllUsers()];
                                        case 3:
                                            users = _b.sent();
                                            res.json({ users: users });
                                            return [3 /*break*/, 5];
                                        case 4:
                                            error_49 = _b.sent();
                                            console.error("Get users error:", error_49);
                                            res.status(500).json({ error: error_49.message || "Failed to get users" });
                                            return [3 /*break*/, 5];
                                        case 5: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.put("/api/auth/users/:userId", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, session, caller, userId, _a, isPremium, role, updated, error_50;
                                var _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _c.trys.push([0, 4, , 5]);
                                            token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Authentication required" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            session = _c.sent();
                                            if (!session) {
                                                res.status(401).json({ error: "Invalid or expired session" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.getUserById(session.userId)];
                                        case 2:
                                            caller = _c.sent();
                                            if (!caller || caller.role !== "admin") {
                                                res.status(403).json({ error: "Admin access required" });
                                                return [2 /*return*/];
                                            }
                                            userId = req.params.userId;
                                            _a = req.body, isPremium = _a.isPremium, role = _a.role;
                                            return [4 /*yield*/, storage_1.storage.updateUser(userId, { isPremium: isPremium, role: role })];
                                        case 3:
                                            updated = _c.sent();
                                            if (!updated) {
                                                res.status(404).json({ error: "User not found" });
                                                return [2 /*return*/];
                                            }
                                            res.json({ user: updated });
                                            return [3 /*break*/, 5];
                                        case 4:
                                            error_50 = _c.sent();
                                            console.error("Update user error:", error_50);
                                            res.status(500).json({ error: error_50.message || "Update failed" });
                                            return [3 /*break*/, 5];
                                        case 5: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // Superadmin-authenticated user edit endpoint (no session token needed)
                            app.patch("/api/admin/edit-user", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var _a, superadminPassword, userId, displayName, email, mobileNumber, password, isPremium, role, callerToken, caller, _b, callerId, before, profileUpdates, updated, _c, passwordHash, changes, _d, _ph, safeUser, error_51;
                                var _e;
                                return __generator(this, function (_f) {
                                    switch (_f.label) {
                                        case 0:
                                            _f.trys.push([0, 21, , 22]);
                                            _a = req.body, superadminPassword = _a.superadminPassword, userId = _a.userId, displayName = _a.displayName, email = _a.email, mobileNumber = _a.mobileNumber, password = _a.password, isPremium = _a.isPremium, role = _a.role;
                                            return [4 /*yield*/, isSuperadminAuthorized(req)];
                                        case 1:
                                            if (!(_f.sent())) {
                                                res.status(403).json({ error: "Forbidden" });
                                                return [2 /*return*/];
                                            }
                                            if (!userId) {
                                                res.status(400).json({ error: "userId required" });
                                                return [2 /*return*/];
                                            }
                                            callerToken = (_e = req.headers.authorization) === null || _e === void 0 ? void 0 : _e.replace("Bearer ", "");
                                            if (!callerToken) return [3 /*break*/, 3];
                                            return [4 /*yield*/, storage_1.storage.validateSession(callerToken)];
                                        case 2:
                                            _b = _f.sent();
                                            return [3 /*break*/, 4];
                                        case 3:
                                            _b = null;
                                            _f.label = 4;
                                        case 4:
                                            caller = _b;
                                            callerId = (caller === null || caller === void 0 ? void 0 : caller.id) || "system";
                                            return [4 /*yield*/, storage_1.storage.getUserById(userId)];
                                        case 5:
                                            before = _f.sent();
                                            if (!before) {
                                                res.status(404).json({ error: "User not found" });
                                                return [2 /*return*/];
                                            }
                                            profileUpdates = {};
                                            if (displayName !== undefined && displayName.trim())
                                                profileUpdates.displayName = displayName.trim();
                                            if (email !== undefined && email.trim())
                                                profileUpdates.email = email.trim().toLowerCase();
                                            if (mobileNumber !== undefined)
                                                profileUpdates.mobileNumber = mobileNumber.trim();
                                            if (isPremium !== undefined)
                                                profileUpdates.isPremium = isPremium;
                                            if (role !== undefined)
                                                profileUpdates.role = role;
                                            if (Object.keys(profileUpdates).length === 0 && !password) {
                                                res.status(400).json({ error: "No fields to update" });
                                                return [2 /*return*/];
                                            }
                                            if (!(isPremium === false && before.isPremium)) return [3 /*break*/, 7];
                                            return [4 /*yield*/, cancelStripeForUser(userId, true)];
                                        case 6:
                                            _f.sent();
                                            _f.label = 7;
                                        case 7:
                                            if (!(Object.keys(profileUpdates).length > 0)) return [3 /*break*/, 9];
                                            return [4 /*yield*/, storage_1.storage.updateUser(userId, profileUpdates)];
                                        case 8:
                                            _c = _f.sent();
                                            return [3 /*break*/, 11];
                                        case 9: return [4 /*yield*/, storage_1.storage.getUserById(userId)];
                                        case 10:
                                            _c = _f.sent();
                                            _f.label = 11;
                                        case 11:
                                            updated = _c;
                                            if (!updated) {
                                                res.status(404).json({ error: "User not found" });
                                                return [2 /*return*/];
                                            }
                                            if (!(password !== undefined && password.trim().length >= 6)) return [3 /*break*/, 14];
                                            return [4 /*yield*/, bcryptjs_1.default.hash(password.trim(), 10)];
                                        case 12:
                                            passwordHash = _f.sent();
                                            return [4 /*yield*/, storage_1.storage.setPassword(userId, passwordHash)];
                                        case 13:
                                            _f.sent();
                                            _f.label = 14;
                                        case 14:
                                            changes = [];
                                            if (displayName !== undefined && displayName !== before.displayName)
                                                changes.push("name: \"".concat(before.displayName, "\" \u2192 \"").concat(displayName, "\""));
                                            if (email !== undefined && email.toLowerCase() !== before.email)
                                                changes.push("email: \"".concat(before.email, "\" \u2192 \"").concat(email.toLowerCase(), "\""));
                                            if (mobileNumber !== undefined && mobileNumber !== before.mobileNumber)
                                                changes.push("mobile changed");
                                            if (password)
                                                changes.push("password reset");
                                            if (!(isPremium !== undefined && isPremium !== before.isPremium)) return [3 /*break*/, 16];
                                            return [4 /*yield*/, logModAction({
                                                    action: isPremium ? "premium_granted" : "premium_revoked",
                                                    performedBy: callerId,
                                                    targetUserId: userId,
                                                    targetUsername: before.username,
                                                    note: isPremium ? "Premium granted by admin" : "Premium revoked by admin (Stripe cancelled)",
                                                })];
                                        case 15:
                                            _f.sent();
                                            _f.label = 16;
                                        case 16:
                                            if (!(role !== undefined && role !== before.role)) return [3 /*break*/, 18];
                                            return [4 /*yield*/, logModAction({
                                                    action: "role_changed",
                                                    performedBy: callerId,
                                                    targetUserId: userId,
                                                    targetUsername: before.username,
                                                    note: "".concat(before.role, " \u2192 ").concat(role),
                                                })];
                                        case 17:
                                            _f.sent();
                                            _f.label = 18;
                                        case 18:
                                            if (!(changes.length > 0)) return [3 /*break*/, 20];
                                            return [4 /*yield*/, logModAction({
                                                    action: "user_edited",
                                                    performedBy: callerId,
                                                    targetUserId: userId,
                                                    targetUsername: before.username,
                                                    note: changes.join("; "),
                                                })];
                                        case 19:
                                            _f.sent();
                                            _f.label = 20;
                                        case 20:
                                            _d = updated, _ph = _d.passwordHash, safeUser = __rest(_d, ["passwordHash"]);
                                            res.json({ user: safeUser });
                                            return [3 /*break*/, 22];
                                        case 21:
                                            error_51 = _f.sent();
                                            console.error("Admin edit-user error:", error_51);
                                            res.status(500).json({ error: error_51.message || "Update failed" });
                                            return [3 /*break*/, 22];
                                        case 22: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ---------------------------------------------------------------------
                            // Superadmin auth — OTP via email
                            // Legacy OTP-based admin login is removed. The admin/superadmin now logs in
                            // via the regular email+password flow (POST /api/auth/login). Stubs below
                            // return a clear error so older APKs prompt the user to update.
                            app.post("/api/admin/request-otp", function (_req, res) {
                                res.status(410).json({ error: "Admin code login has been removed. Please update the app and use the email + password login." });
                            });
                            app.post("/api/admin/verify-otp", function (_req, res) {
                                res.status(410).json({ error: "Admin code login has been removed. Please update the app and use the email + password login." });
                            });
                            // Validate a stored superadmin token (used by client to check if it's still good).
                            app.get("/api/admin/validate-token", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var _a, _b;
                                var _c;
                                return __generator(this, function (_d) {
                                    switch (_d.label) {
                                        case 0:
                                            _b = (_a = res).json;
                                            _c = {};
                                            return [4 /*yield*/, isSuperadminAuthorized(req)];
                                        case 1:
                                            _b.apply(_a, [(_c.valid = _d.sent(), _c)]);
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                            // Legacy endpoint kept as a stub so older APKs get a clear error.
                            app.post("/api/admin/superadmin-login", function (_req, res) {
                                res.status(410).json({
                                    error: "This sign-in method has been disabled. Please update the app and use the email code login.",
                                });
                            });
                            app.post("/api/admin/create-user", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var _a, superadminPassword, username, displayName, email, mobileNumber, password, isPremium, role, existing, existingUser, passwordHash, user, _b, _ph, safeUser, error_52;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _c.trys.push([0, 6, , 7]);
                                            _a = req.body, superadminPassword = _a.superadminPassword, username = _a.username, displayName = _a.displayName, email = _a.email, mobileNumber = _a.mobileNumber, password = _a.password, isPremium = _a.isPremium, role = _a.role;
                                            return [4 /*yield*/, isSuperadminAuthorized(req)];
                                        case 1:
                                            if (!(_c.sent())) {
                                                res.status(403).json({ error: "Forbidden" });
                                                return [2 /*return*/];
                                            }
                                            if (!username || !displayName || !email || !password) {
                                                res.status(400).json({ error: "Username, display name, email and password are required" });
                                                return [2 /*return*/];
                                            }
                                            if (password.length < 6) {
                                                res.status(400).json({ error: "Password must be at least 6 characters" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.getUserByEmail(email.toLowerCase().trim())];
                                        case 2:
                                            existing = _c.sent();
                                            if (existing) {
                                                res.status(409).json({ error: "An account with this email already exists" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.getUserByUsername(username.toLowerCase().trim())];
                                        case 3:
                                            existingUser = _c.sent();
                                            if (existingUser) {
                                                res.status(409).json({ error: "Username is already taken" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, bcryptjs_1.default.hash(password, 10)];
                                        case 4:
                                            passwordHash = _c.sent();
                                            return [4 /*yield*/, storage_1.storage.createUser({
                                                    username: username.toLowerCase().trim(),
                                                    displayName: displayName.trim(),
                                                    email: email.toLowerCase().trim(),
                                                    mobileNumber: (mobileNumber === null || mobileNumber === void 0 ? void 0 : mobileNumber.trim()) || "",
                                                    passwordHash: passwordHash,
                                                    authProvider: "local",
                                                    isPremium: isPremium === true,
                                                    role: role || "user",
                                                    avatarUrl: null,
                                                })];
                                        case 5:
                                            user = _c.sent();
                                            _b = user, _ph = _b.passwordHash, safeUser = __rest(_b, ["passwordHash"]);
                                            res.json({ user: safeUser });
                                            return [3 /*break*/, 7];
                                        case 6:
                                            error_52 = _c.sent();
                                            console.error("Admin create-user error:", error_52);
                                            res.status(500).json({ error: error_52.message || "Create user failed" });
                                            return [3 /*break*/, 7];
                                        case 7: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.get("/api/admin/users", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var pwd, users, error_53;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 3, , 4]);
                                            pwd = req.query.superadminPassword;
                                            return [4 /*yield*/, isSuperadminAuthorized(req)];
                                        case 1:
                                            if (!(_a.sent())) {
                                                res.status(403).json({ error: "Forbidden" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.getAllUsers()];
                                        case 2:
                                            users = _a.sent();
                                            res.json({ users: users });
                                            return [3 /*break*/, 4];
                                        case 3:
                                            error_53 = _a.sent();
                                            console.error("Admin get-users error:", error_53);
                                            res.status(500).json({ error: error_53.message || "Failed to get users" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.delete("/api/admin/delete-user", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var _a, superadminPassword, userId, callerToken, caller, _b, callerId, before, deleted, error_54;
                                var _c;
                                return __generator(this, function (_d) {
                                    switch (_d.label) {
                                        case 0:
                                            _d.trys.push([0, 11, , 12]);
                                            _a = req.body, superadminPassword = _a.superadminPassword, userId = _a.userId;
                                            return [4 /*yield*/, isSuperadminAuthorized(req)];
                                        case 1:
                                            if (!(_d.sent())) {
                                                res.status(403).json({ error: "Forbidden" });
                                                return [2 /*return*/];
                                            }
                                            if (!userId) {
                                                res.status(400).json({ error: "userId required" });
                                                return [2 /*return*/];
                                            }
                                            callerToken = (_c = req.headers.authorization) === null || _c === void 0 ? void 0 : _c.replace("Bearer ", "");
                                            if (!callerToken) return [3 /*break*/, 3];
                                            return [4 /*yield*/, storage_1.storage.validateSession(callerToken)];
                                        case 2:
                                            _b = _d.sent();
                                            return [3 /*break*/, 4];
                                        case 3:
                                            _b = null;
                                            _d.label = 4;
                                        case 4:
                                            caller = _b;
                                            callerId = (caller === null || caller === void 0 ? void 0 : caller.id) || "system";
                                            return [4 /*yield*/, storage_1.storage.getUserById(userId)];
                                        case 5:
                                            before = _d.sent();
                                            if (!before) {
                                                res.status(404).json({ error: "User not found" });
                                                return [2 /*return*/];
                                            }
                                            // Cancel any active Stripe subscription immediately
                                            return [4 /*yield*/, cancelStripeForUser(userId, true)];
                                        case 6:
                                            // Cancel any active Stripe subscription immediately
                                            _d.sent();
                                            // Add email + mobile to blocklist so they can't claim a new trial
                                            return [4 /*yield*/, addBlockedCredential(before.email || null, before.mobileNumber || null, "deleted", callerId)];
                                        case 7:
                                            // Add email + mobile to blocklist so they can't claim a new trial
                                            _d.sent();
                                            // Delete user's sessions first, then the user
                                            return [4 /*yield*/, db_1.db.delete(schema_1.pokescanSessions).where((0, drizzle_orm_1.eq)(schema_1.pokescanSessions.userId, userId))];
                                        case 8:
                                            // Delete user's sessions first, then the user
                                            _d.sent();
                                            return [4 /*yield*/, db_1.db.delete(schema_1.pokescanUsers).where((0, drizzle_orm_1.eq)(schema_1.pokescanUsers.id, userId)).returning()];
                                        case 9:
                                            deleted = _d.sent();
                                            if (!deleted.length) {
                                                res.status(404).json({ error: "User not found" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, logModAction({
                                                    action: "user_deleted",
                                                    performedBy: callerId,
                                                    targetUserId: userId,
                                                    targetUsername: before.username,
                                                    note: "Deleted @".concat(before.username, " (").concat(before.email, "); Stripe sub cancelled; email+mobile added to trial blocklist"),
                                                })];
                                        case 10:
                                            _d.sent();
                                            res.json({ success: true, userId: userId });
                                            return [3 /*break*/, 12];
                                        case 11:
                                            error_54 = _d.sent();
                                            console.error("Admin delete-user error:", error_54);
                                            res.status(500).json({ error: error_54.message || "Delete failed" });
                                            return [3 /*break*/, 12];
                                        case 12: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Ban / unban / mute (account-level) ─────────────────────────────────────
                            app.post("/api/admin/users/:id/ban", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, caller, id, _a, reason, durationHours, banChat, target, permanent, bannedUntil, banReason, error_55;
                                var _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _c.trys.push([0, 8, , 9]);
                                            token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            caller = _c.sent();
                                            if (!caller) {
                                                res.status(401).json({ error: "Invalid session" });
                                                return [2 /*return*/];
                                            }
                                            if (caller.role !== "admin" && caller.role !== "moderator") {
                                                res.status(403).json({ error: "Staff only" });
                                                return [2 /*return*/];
                                            }
                                            id = req.params.id;
                                            _a = req.body || {}, reason = _a.reason, durationHours = _a.durationHours, banChat = _a.banChat;
                                            return [4 /*yield*/, storage_1.storage.getUserById(id)];
                                        case 2:
                                            target = _c.sent();
                                            if (!target) {
                                                res.status(404).json({ error: "User not found" });
                                                return [2 /*return*/];
                                            }
                                            if (target.role === "admin" || target.role === "moderator") {
                                                res.status(403).json({ error: "Cannot ban staff members" });
                                                return [2 /*return*/];
                                            }
                                            permanent = durationHours == null || durationHours <= 0;
                                            bannedUntil = permanent
                                                ? new Date("9999-12-31T23:59:59Z")
                                                : new Date(Date.now() + Number(durationHours) * 3600 * 1000);
                                            banReason = (reason && String(reason).trim()) || "Violation of community guidelines";
                                            return [4 /*yield*/, db_1.pool.query("UPDATE pokescan_users SET banned_until = $1, ban_reason = $2, banned_at = NOW(), banned_by = $3 ".concat(banChat ? ", chat_banned_until = $1" : "", " WHERE id = $4"), [bannedUntil, banReason, caller.id, id])];
                                        case 3:
                                            _c.sent();
                                            if (!target.isPremium) return [3 /*break*/, 5];
                                            return [4 /*yield*/, cancelStripeForUser(id, true)];
                                        case 4:
                                            _c.sent();
                                            _c.label = 5;
                                        case 5: 
                                        // Revoke all sessions so they can't continue using the app
                                        return [4 /*yield*/, db_1.db.delete(schema_1.pokescanSessions).where((0, drizzle_orm_1.eq)(schema_1.pokescanSessions.userId, id))];
                                        case 6:
                                            // Revoke all sessions so they can't continue using the app
                                            _c.sent();
                                            return [4 /*yield*/, logModAction({
                                                    action: "user_banned",
                                                    performedBy: caller.id,
                                                    targetUserId: id,
                                                    targetUsername: target.username,
                                                    note: "".concat(permanent ? "Permanent" : "".concat(durationHours, "h"), " ban \u2014 Reason: ").concat(banReason).concat(target.isPremium ? "; Stripe sub cancelled" : ""),
                                                })];
                                        case 7:
                                            _c.sent();
                                            res.json({ success: true, bannedUntil: bannedUntil.toISOString(), permanent: permanent, banReason: banReason });
                                            return [3 /*break*/, 9];
                                        case 8:
                                            error_55 = _c.sent();
                                            console.error("Ban error:", error_55);
                                            res.status(500).json({ error: error_55.message || "Ban failed" });
                                            return [3 /*break*/, 9];
                                        case 9: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/admin/users/:id/unban", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, caller, id, target, error_56;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 5, , 6]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            caller = _b.sent();
                                            if (!caller) {
                                                res.status(401).json({ error: "Invalid session" });
                                                return [2 /*return*/];
                                            }
                                            if (caller.role !== "admin" && caller.role !== "moderator") {
                                                res.status(403).json({ error: "Staff only" });
                                                return [2 /*return*/];
                                            }
                                            id = req.params.id;
                                            return [4 /*yield*/, storage_1.storage.getUserById(id)];
                                        case 2:
                                            target = _b.sent();
                                            if (!target) {
                                                res.status(404).json({ error: "User not found" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.pool.query("UPDATE pokescan_users SET banned_until = NULL, ban_reason = NULL, banned_at = NULL, banned_by = NULL, chat_banned_until = NULL WHERE id = $1", [id])];
                                        case 3:
                                            _b.sent();
                                            return [4 /*yield*/, logModAction({
                                                    action: "user_unbanned",
                                                    performedBy: caller.id,
                                                    targetUserId: id,
                                                    targetUsername: target.username,
                                                })];
                                        case 4:
                                            _b.sent();
                                            res.json({ success: true });
                                            return [3 /*break*/, 6];
                                        case 5:
                                            error_56 = _b.sent();
                                            console.error("Unban error:", error_56);
                                            res.status(500).json({ error: error_56.message || "Unban failed" });
                                            return [3 /*break*/, 6];
                                        case 6: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/admin/users/:id/mute", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, caller, id, minutes, target, mins, mutedUntil, error_57;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 5, , 6]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            caller = _b.sent();
                                            if (!caller) {
                                                res.status(401).json({ error: "Invalid session" });
                                                return [2 /*return*/];
                                            }
                                            if (caller.role !== "admin" && caller.role !== "moderator") {
                                                res.status(403).json({ error: "Staff only" });
                                                return [2 /*return*/];
                                            }
                                            id = req.params.id;
                                            minutes = (req.body || {}).minutes;
                                            return [4 /*yield*/, storage_1.storage.getUserById(id)];
                                        case 2:
                                            target = _b.sent();
                                            if (!target) {
                                                res.status(404).json({ error: "User not found" });
                                                return [2 /*return*/];
                                            }
                                            if (target.role === "admin" || target.role === "moderator") {
                                                res.status(403).json({ error: "Cannot mute staff" });
                                                return [2 /*return*/];
                                            }
                                            mins = Number(minutes);
                                            if (!mins || mins < 1) {
                                                res.status(400).json({ error: "minutes (positive) required" });
                                                return [2 /*return*/];
                                            }
                                            mutedUntil = new Date(Date.now() + mins * 60 * 1000);
                                            return [4 /*yield*/, db_1.pool.query("UPDATE pokescan_users SET chat_muted_until = $1 WHERE id = $2", [mutedUntil, id])];
                                        case 3:
                                            _b.sent();
                                            return [4 /*yield*/, logModAction({
                                                    action: "user_muted",
                                                    performedBy: caller.id,
                                                    targetUserId: id,
                                                    targetUsername: target.username,
                                                    note: "Muted for ".concat(mins, " minutes (until ").concat(mutedUntil.toISOString(), ")"),
                                                })];
                                        case 4:
                                            _b.sent();
                                            res.json({ success: true, mutedUntil: mutedUntil.toISOString() });
                                            return [3 /*break*/, 6];
                                        case 5:
                                            error_57 = _b.sent();
                                            console.error("Mute error:", error_57);
                                            res.status(500).json({ error: error_57.message || "Mute failed" });
                                            return [3 /*break*/, 6];
                                        case 6: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/admin/users/:id/unmute", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, caller, id, target, error_58;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 5, , 6]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            caller = _b.sent();
                                            if (!caller) {
                                                res.status(401).json({ error: "Invalid session" });
                                                return [2 /*return*/];
                                            }
                                            if (caller.role !== "admin" && caller.role !== "moderator") {
                                                res.status(403).json({ error: "Staff only" });
                                                return [2 /*return*/];
                                            }
                                            id = req.params.id;
                                            return [4 /*yield*/, storage_1.storage.getUserById(id)];
                                        case 2:
                                            target = _b.sent();
                                            if (!target) {
                                                res.status(404).json({ error: "User not found" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.pool.query("UPDATE pokescan_users SET chat_muted_until = NULL WHERE id = $1", [id])];
                                        case 3:
                                            _b.sent();
                                            return [4 /*yield*/, logModAction({
                                                    action: "user_unmuted",
                                                    performedBy: caller.id,
                                                    targetUserId: id,
                                                    targetUsername: target.username,
                                                })];
                                        case 4:
                                            _b.sent();
                                            res.json({ success: true });
                                            return [3 /*break*/, 6];
                                        case 5:
                                            error_58 = _b.sent();
                                            console.error("Unmute error:", error_58);
                                            res.status(500).json({ error: error_58.message || "Unmute failed" });
                                            return [3 /*break*/, 6];
                                        case 6: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Bulk listing moderation ────────────────────────────────────────────────
                            app.post("/api/admin/listings/bulk", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, caller, _a, ids, action, reviewNote, updated, r, _i, _b, row, status_6, r, _c, _d, row, error_59;
                                var _e;
                                return __generator(this, function (_f) {
                                    switch (_f.label) {
                                        case 0:
                                            _f.trys.push([0, 13, , 14]);
                                            token = (_e = req.headers.authorization) === null || _e === void 0 ? void 0 : _e.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            caller = _f.sent();
                                            if (!caller) {
                                                res.status(401).json({ error: "Invalid session" });
                                                return [2 /*return*/];
                                            }
                                            if (caller.role !== "admin" && caller.role !== "moderator") {
                                                res.status(403).json({ error: "Staff only" });
                                                return [2 /*return*/];
                                            }
                                            _a = req.body || {}, ids = _a.ids, action = _a.action, reviewNote = _a.reviewNote;
                                            if (!Array.isArray(ids) || ids.length === 0) {
                                                res.status(400).json({ error: "ids array required" });
                                                return [2 /*return*/];
                                            }
                                            if (action !== "approve" && action !== "reject" && action !== "delete") {
                                                res.status(400).json({ error: "action must be approve|reject|delete" });
                                                return [2 /*return*/];
                                            }
                                            updated = 0;
                                            if (!(action === "delete")) return [3 /*break*/, 7];
                                            return [4 /*yield*/, db_1.pool.query("DELETE FROM pokescan_market_listings WHERE id = ANY($1::text[]) RETURNING id, card_name", [ids])];
                                        case 2:
                                            r = _f.sent();
                                            updated = r.rowCount || 0;
                                            _i = 0, _b = r.rows;
                                            _f.label = 3;
                                        case 3:
                                            if (!(_i < _b.length)) return [3 /*break*/, 6];
                                            row = _b[_i];
                                            return [4 /*yield*/, logModAction({
                                                    action: "listing_deleted_bulk",
                                                    performedBy: caller.id,
                                                    listingId: row.id,
                                                    listingName: row.card_name,
                                                    note: reviewNote || null,
                                                })];
                                        case 4:
                                            _f.sent();
                                            _f.label = 5;
                                        case 5:
                                            _i++;
                                            return [3 /*break*/, 3];
                                        case 6: return [3 /*break*/, 12];
                                        case 7:
                                            status_6 = action === "approve" ? "approved" : "rejected";
                                            return [4 /*yield*/, db_1.pool.query("UPDATE pokescan_market_listings\n              SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_note = COALESCE($3, review_note)\n            WHERE id = ANY($4::text[])\n          RETURNING id, card_name", [status_6, caller.id, reviewNote !== null && reviewNote !== void 0 ? reviewNote : null, ids])];
                                        case 8:
                                            r = _f.sent();
                                            updated = r.rowCount || 0;
                                            _c = 0, _d = r.rows;
                                            _f.label = 9;
                                        case 9:
                                            if (!(_c < _d.length)) return [3 /*break*/, 12];
                                            row = _d[_c];
                                            return [4 /*yield*/, logModAction({
                                                    action: "bulk_".concat(status_6),
                                                    performedBy: caller.id,
                                                    listingId: row.id,
                                                    listingName: row.card_name,
                                                    note: reviewNote || null,
                                                })];
                                        case 10:
                                            _f.sent();
                                            _f.label = 11;
                                        case 11:
                                            _c++;
                                            return [3 /*break*/, 9];
                                        case 12:
                                            res.json({ success: true, updated: updated, requested: ids.length });
                                            return [3 /*break*/, 14];
                                        case 13:
                                            error_59 = _f.sent();
                                            console.error("Bulk listings error:", error_59);
                                            res.status(500).json({ error: error_59.message || "Bulk action failed" });
                                            return [3 /*break*/, 14];
                                        case 14: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Staff: view chatroom and private DMs ───────────────────────────────────
                            app.get("/api/admin/chatroom", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, caller, limit, msgs, error_60;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 3, , 4]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            caller = _b.sent();
                                            if (!caller) {
                                                res.status(401).json({ error: "Invalid session" });
                                                return [2 /*return*/];
                                            }
                                            if (caller.role !== "admin" && caller.role !== "moderator") {
                                                res.status(403).json({ error: "Staff only" });
                                                return [2 /*return*/];
                                            }
                                            limit = Math.min(500, Math.max(1, parseInt(req.query.limit || "200", 10)));
                                            return [4 /*yield*/, db_1.db.select().from(schema_1.pokescanChatroomMessages)
                                                    .orderBy((0, drizzle_orm_1.desc)(schema_1.pokescanChatroomMessages.createdAt))
                                                    .limit(limit)];
                                        case 2:
                                            msgs = _b.sent();
                                            res.json({ messages: msgs.reverse() });
                                            return [3 /*break*/, 4];
                                        case 3:
                                            error_60 = _b.sent();
                                            console.error("Admin chatroom view error:", error_60);
                                            res.status(500).json({ error: error_60.message || "Failed to load chatroom" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.get("/api/admin/messages", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, caller, userA, userB, r, q, error_61;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 8, , 9]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            caller = _b.sent();
                                            if (!caller) {
                                                res.status(401).json({ error: "Invalid session" });
                                                return [2 /*return*/];
                                            }
                                            if (caller.role !== "admin" && caller.role !== "moderator") {
                                                res.status(403).json({ error: "Staff only" });
                                                return [2 /*return*/];
                                            }
                                            userA = (req.query.userA || "").trim();
                                            userB = (req.query.userB || "").trim();
                                            if (!!userA) return [3 /*break*/, 3];
                                            return [4 /*yield*/, db_1.pool.query("SELECT m.*, su.username AS sender_username, su.display_name AS sender_display_name,\n                  ru.username AS recipient_username, ru.display_name AS recipient_display_name\n             FROM pokescan_messages m\n             LEFT JOIN pokescan_users su ON su.id = m.sender_id\n             LEFT JOIN pokescan_users ru ON ru.id = m.recipient_id\n            ORDER BY m.created_at DESC\n            LIMIT 200")];
                                        case 2:
                                            r = _b.sent();
                                            res.json({ messages: r.rows });
                                            return [2 /*return*/];
                                        case 3:
                                            q = void 0;
                                            if (!userB) return [3 /*break*/, 5];
                                            return [4 /*yield*/, db_1.pool.query("SELECT m.*, su.username AS sender_username, su.display_name AS sender_display_name,\n                  ru.username AS recipient_username, ru.display_name AS recipient_display_name\n             FROM pokescan_messages m\n             LEFT JOIN pokescan_users su ON su.id = m.sender_id\n             LEFT JOIN pokescan_users ru ON ru.id = m.recipient_id\n            WHERE (m.sender_id = $1 AND m.recipient_id = $2)\n               OR (m.sender_id = $2 AND m.recipient_id = $1)\n            ORDER BY m.created_at ASC\n            LIMIT 500", [userA, userB])];
                                        case 4:
                                            q = _b.sent();
                                            return [3 /*break*/, 7];
                                        case 5: return [4 /*yield*/, db_1.pool.query("SELECT m.*, su.username AS sender_username, su.display_name AS sender_display_name,\n                  ru.username AS recipient_username, ru.display_name AS recipient_display_name\n             FROM pokescan_messages m\n             LEFT JOIN pokescan_users su ON su.id = m.sender_id\n             LEFT JOIN pokescan_users ru ON ru.id = m.recipient_id\n            WHERE m.sender_id = $1 OR m.recipient_id = $1\n            ORDER BY m.created_at DESC\n            LIMIT 500", [userA])];
                                        case 6:
                                            q = _b.sent();
                                            _b.label = 7;
                                        case 7:
                                            res.json({ messages: q.rows });
                                            return [3 /*break*/, 9];
                                        case 8:
                                            error_61 = _b.sent();
                                            console.error("Admin messages view error:", error_61);
                                            res.status(500).json({ error: error_61.message || "Failed to load messages" });
                                            return [3 /*break*/, 9];
                                        case 9: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Blocked credentials list (superadmin) ──────────────────────────────────
                            app.get("/api/admin/blocked-credentials", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var r, error_62;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 3, , 4]);
                                            return [4 /*yield*/, isSuperadminAuthorized(req)];
                                        case 1:
                                            if (!(_a.sent())) {
                                                res.status(403).json({ error: "Forbidden" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.pool.query("SELECT * FROM pokescan_blocked_credentials ORDER BY created_at DESC LIMIT 500")];
                                        case 2:
                                            r = _a.sent();
                                            res.json({ blocked: r.rows });
                                            return [3 /*break*/, 4];
                                        case 3:
                                            error_62 = _a.sent();
                                            console.error("Blocked creds list error:", error_62);
                                            res.status(500).json({ error: error_62.message || "Failed to load" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.delete("/api/admin/blocked-credentials/:id", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var error_63;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 3, , 4]);
                                            return [4 /*yield*/, isSuperadminAuthorized(req)];
                                        case 1:
                                            if (!(_a.sent())) {
                                                res.status(403).json({ error: "Forbidden" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.pool.query("DELETE FROM pokescan_blocked_credentials WHERE id = $1", [req.params.id])];
                                        case 2:
                                            _a.sent();
                                            res.json({ success: true });
                                            return [3 /*break*/, 4];
                                        case 3:
                                            error_63 = _a.sent();
                                            console.error("Blocked creds delete error:", error_63);
                                            res.status(500).json({ error: error_63.message || "Failed to remove" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Scrydex Sync ────────────────────────────────────────────────────────────
                            // POST /api/admin/scrydex-sync  — triggers scrydex.com data sync (superadmin only).
                            // Uses Server-Sent Events so the client can stream progress in real time.
                            // The sync is NOT triggered automatically — only when this endpoint is called.
                            app.post("/api/admin/scrydex-sync", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var superadminPassword, send_1, runScrydexSync, result, error_64;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 4, , 5]);
                                            superadminPassword = req.body.superadminPassword;
                                            return [4 /*yield*/, isSuperadminAuthorized(req)];
                                        case 1:
                                            if (!(_a.sent())) {
                                                res.status(403).json({ error: "Forbidden" });
                                                return [2 /*return*/];
                                            }
                                            // Set up SSE headers so the client receives progress events in real time
                                            res.setHeader("Content-Type", "text/event-stream");
                                            res.setHeader("Cache-Control", "no-cache");
                                            res.setHeader("Connection", "keep-alive");
                                            res.flushHeaders();
                                            send_1 = function (data) {
                                                res.write("data: ".concat(JSON.stringify(data), "\n\n"));
                                            };
                                            return [4 /*yield*/, Promise.resolve().then(function () { return require("./scrydex-scraper"); })];
                                        case 2:
                                            runScrydexSync = (_a.sent()).runScrydexSync;
                                            return [4 /*yield*/, runScrydexSync(function (progress) {
                                                    send_1(progress);
                                                })];
                                        case 3:
                                            result = _a.sent();
                                            send_1(__assign(__assign({}, result), { done: true }));
                                            res.end();
                                            return [3 /*break*/, 5];
                                        case 4:
                                            error_64 = _a.sent();
                                            console.error("Scrydex sync error:", error_64);
                                            try {
                                                res.write("data: ".concat(JSON.stringify({ phase: "error", message: error_64.message || "Sync failed", done: true }), "\n\n"));
                                                res.end();
                                            }
                                            catch (_b) { }
                                            return [3 /*break*/, 5];
                                        case 5: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Asian Set Sync ──────────────────────────────────────────────────────────
                            // POST /api/admin/sync-asian-sets — inserts JP (211 sets from Scrydex) + KO + ZH sets.
                            // Uses Server-Sent Events so the client can see real-time progress.
                            app.post("/api/admin/sync-asian-sets", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var superadminPassword, send_2, seedAsianSets, result, seedKoZhCards, koZhResult, error_65;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 6, , 7]);
                                            superadminPassword = req.body.superadminPassword;
                                            return [4 /*yield*/, isSuperadminAuthorized(req)];
                                        case 1:
                                            if (!(_a.sent())) {
                                                res.status(403).json({ error: "Forbidden" });
                                                return [2 /*return*/];
                                            }
                                            res.setHeader("Content-Type", "text/event-stream");
                                            res.setHeader("Cache-Control", "no-cache");
                                            res.setHeader("Connection", "keep-alive");
                                            res.flushHeaders();
                                            send_2 = function (data) { return res.write("data: ".concat(JSON.stringify(data), "\n\n")); };
                                            return [4 /*yield*/, Promise.resolve().then(function () { return require("./asian-set-seed"); })];
                                        case 2:
                                            seedAsianSets = (_a.sent()).seedAsianSets;
                                            return [4 /*yield*/, seedAsianSets(function (msg) {
                                                    send_2({ phase: "progress", message: msg });
                                                })];
                                        case 3:
                                            result = _a.sent();
                                            send_2({ phase: "seeding-cards", message: "Seeding KO/ZH cards from JP sources…" });
                                            return [4 /*yield*/, Promise.resolve().then(function () { return require("./ko-zh-seed"); })];
                                        case 4:
                                            seedKoZhCards = (_a.sent()).seedKoZhCards;
                                            return [4 /*yield*/, seedKoZhCards(function (msg) {
                                                    send_2({ phase: "progress", message: msg });
                                                })];
                                        case 5:
                                            koZhResult = _a.sent();
                                            send_2({ phase: "progress", message: "KO/ZH cards: ".concat(koZhResult.inserted, " inserted, ").concat(koZhResult.skipped, " skipped") });
                                            send_2(__assign(__assign({ phase: "done" }, result), { koZhInserted: koZhResult.inserted, koZhSkipped: koZhResult.skipped, done: true }));
                                            res.end();
                                            return [3 /*break*/, 7];
                                        case 6:
                                            error_65 = _a.sent();
                                            console.error("Asian set sync error:", error_65);
                                            try {
                                                res.write("data: ".concat(JSON.stringify({ phase: "error", message: error_65.message || "Sync failed", done: true }), "\n\n"));
                                                res.end();
                                            }
                                            catch (_b) { }
                                            return [3 /*break*/, 7];
                                        case 7: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.get("/api/admin/sets", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var pw, allSets, error_66;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 3, , 4]);
                                            pw = req.query.superadminPassword;
                                            return [4 /*yield*/, isSuperadminAuthorized(req)];
                                        case 1:
                                            if (!(_a.sent())) {
                                                res.status(403).json({ error: "Forbidden" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db
                                                    .select({
                                                    id: schema_1.pokemonSets.id,
                                                    name: schema_1.pokemonSets.name,
                                                    series: schema_1.pokemonSets.series,
                                                    hidden: schema_1.pokemonSets.hidden,
                                                    releaseDate: schema_1.pokemonSets.releaseDate,
                                                    cardCount: (0, drizzle_orm_1.sql)(templateObject_49 || (templateObject_49 = __makeTemplateObject(["count(", ")::int"], ["count(", ")::int"])), schema_1.pokemonCards.id),
                                                })
                                                    .from(schema_1.pokemonSets)
                                                    .leftJoin(schema_1.pokemonCards, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokemonCards.setId, schema_1.pokemonSets.id), (0, drizzle_orm_1.isNull)(schema_1.pokemonCards.deletedAt)))
                                                    .where((0, drizzle_orm_1.isNull)(schema_1.pokemonSets.deletedAt))
                                                    .groupBy(schema_1.pokemonSets.id, schema_1.pokemonSets.name, schema_1.pokemonSets.series, schema_1.pokemonSets.hidden, schema_1.pokemonSets.releaseDate)
                                                    .orderBy((0, drizzle_orm_1.desc)(schema_1.pokemonSets.releaseDate))];
                                        case 2:
                                            allSets = _a.sent();
                                            res.json({
                                                sets: allSets.map(function (s) {
                                                    var _a;
                                                    return (__assign(__assign({}, s), { hidden: (_a = s.hidden) !== null && _a !== void 0 ? _a : false, language: detectSetLanguage(s.id) }));
                                                }),
                                            });
                                            return [3 /*break*/, 4];
                                        case 3:
                                            error_66 = _a.sent();
                                            res.status(500).json({ error: error_66.message || "Failed to list sets" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.patch("/api/admin/sets/visibility", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var _a, superadminPassword, setIds, hidden, _i, setIds_1, id, error_67;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 6, , 7]);
                                            _a = req.body, superadminPassword = _a.superadminPassword, setIds = _a.setIds, hidden = _a.hidden;
                                            return [4 /*yield*/, isSuperadminAuthorized(req)];
                                        case 1:
                                            if (!(_b.sent())) {
                                                res.status(403).json({ error: "Forbidden" });
                                                return [2 /*return*/];
                                            }
                                            if (!Array.isArray(setIds) || setIds.length === 0) {
                                                res.status(400).json({ error: "setIds is required" });
                                                return [2 /*return*/];
                                            }
                                            _i = 0, setIds_1 = setIds;
                                            _b.label = 2;
                                        case 2:
                                            if (!(_i < setIds_1.length)) return [3 /*break*/, 5];
                                            id = setIds_1[_i];
                                            return [4 /*yield*/, db_1.db.update(schema_1.pokemonSets).set({ hidden: !!hidden }).where((0, drizzle_orm_1.eq)(schema_1.pokemonSets.id, id))];
                                        case 3:
                                            _b.sent();
                                            _b.label = 4;
                                        case 4:
                                            _i++;
                                            return [3 /*break*/, 2];
                                        case 5:
                                            res.json({ updated: setIds.length, hidden: !!hidden });
                                            return [3 /*break*/, 7];
                                        case 6:
                                            error_67 = _b.sent();
                                            res.status(500).json({ error: error_67.message || "Failed to update visibility" });
                                            return [3 /*break*/, 7];
                                        case 7: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // GET /api/admin/scrydex-preview — dry-run: returns what would be added
                            // without writing anything to the database.
                            app.get("/api/admin/scrydex-preview", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var pw, _a, scrapeScrydexSets, scrapeScrydexTcgPocketSets, scrapeScrydexJpSets, _b, enSets, pocketSets, jpSets, allSetsMap, _i, _c, s, allSets, existingRows, existingIds_1, setsWithCards_1, missingSets, emptySets, setsToProcess, error_68;
                                return __generator(this, function (_d) {
                                    switch (_d.label) {
                                        case 0:
                                            _d.trys.push([0, 5, , 6]);
                                            pw = req.query.superadminPassword;
                                            return [4 /*yield*/, isSuperadminAuthorized(req)];
                                        case 1:
                                            if (!(_d.sent())) {
                                                res.status(403).json({ error: "Forbidden" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, Promise.resolve().then(function () { return require("./scrydex-scraper"); })];
                                        case 2:
                                            _a = _d.sent(), scrapeScrydexSets = _a.scrapeScrydexSets, scrapeScrydexTcgPocketSets = _a.scrapeScrydexTcgPocketSets, scrapeScrydexJpSets = _a.scrapeScrydexJpSets;
                                            return [4 /*yield*/, Promise.all([
                                                    scrapeScrydexSets(),
                                                    scrapeScrydexTcgPocketSets(),
                                                    scrapeScrydexJpSets(),
                                                ])];
                                        case 3:
                                            _b = _d.sent(), enSets = _b[0], pocketSets = _b[1], jpSets = _b[2];
                                            allSetsMap = new Map();
                                            for (_i = 0, _c = __spreadArray(__spreadArray(__spreadArray([], enSets, true), pocketSets, true), jpSets, true); _i < _c.length; _i++) {
                                                s = _c[_i];
                                                if (!allSetsMap.has(s.id))
                                                    allSetsMap.set(s.id, s);
                                            }
                                            allSets = __spreadArray([], allSetsMap.values(), true);
                                            return [4 /*yield*/, db_1.db
                                                    .select({ id: schema_1.pokemonSets.id, card_count: (0, drizzle_orm_1.sql)(templateObject_50 || (templateObject_50 = __makeTemplateObject(["COUNT(", ")"], ["COUNT(", ")"])), schema_1.pokemonCards.id) })
                                                    .from(schema_1.pokemonSets)
                                                    .leftJoin(schema_1.pokemonCards, (0, drizzle_orm_1.eq)(schema_1.pokemonCards.setId, schema_1.pokemonSets.id))
                                                    .groupBy(schema_1.pokemonSets.id)];
                                        case 4:
                                            existingRows = _d.sent();
                                            existingIds_1 = new Set(existingRows.map(function (r) { return r.id; }));
                                            setsWithCards_1 = new Set(existingRows.filter(function (r) { return parseInt(r.card_count, 10) > 0; }).map(function (r) { return r.id; }));
                                            missingSets = allSets.filter(function (s) { return !existingIds_1.has(s.id); });
                                            emptySets = allSets.filter(function (s) { return existingIds_1.has(s.id) && !setsWithCards_1.has(s.id); });
                                            setsToProcess = allSets.filter(function (s) { return !existingIds_1.has(s.id) || !setsWithCards_1.has(s.id); });
                                            res.json({
                                                scrydexSetCount: allSets.length,
                                                dbSetCount: existingIds_1.size,
                                                newSetsFound: missingSets.length,
                                                emptySetsFound: emptySets.length,
                                                setsToProcess: setsToProcess.length,
                                                newSets: missingSets.map(function (s) { return ({ id: s.id, name: s.name, series: s.series }); }),
                                                emptySets: emptySets.map(function (s) { return ({ id: s.id, name: s.name, series: s.series }); }),
                                            });
                                            return [3 /*break*/, 6];
                                        case 5:
                                            error_68 = _d.sent();
                                            res.status(500).json({ error: error_68.message || "Preview failed" });
                                            return [3 /*break*/, 6];
                                        case 6: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/admin/import-users", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var _a, superadminPassword, users, results, _i, users_1, u, result, err_19, error_69;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 8, , 9]);
                                            _a = req.body, superadminPassword = _a.superadminPassword, users = _a.users;
                                            return [4 /*yield*/, isSuperadminAuthorized(req)];
                                        case 1:
                                            if (!(_b.sent())) {
                                                res.status(403).json({ error: "Forbidden" });
                                                return [2 /*return*/];
                                            }
                                            if (!Array.isArray(users) || users.length === 0) {
                                                res.status(400).json({ error: "users array required" });
                                                return [2 /*return*/];
                                            }
                                            results = [];
                                            _i = 0, users_1 = users;
                                            _b.label = 2;
                                        case 2:
                                            if (!(_i < users_1.length)) return [3 /*break*/, 7];
                                            u = users_1[_i];
                                            _b.label = 3;
                                        case 3:
                                            _b.trys.push([3, 5, , 6]);
                                            return [4 /*yield*/, storage_1.storage.importUser({
                                                    id: u.id,
                                                    username: u.username,
                                                    displayName: u.displayName,
                                                    email: u.email,
                                                    mobileNumber: u.mobileNumber || "",
                                                    passwordHash: u.passwordHash || null,
                                                    authProvider: u.authProvider || "local",
                                                    isPremium: u.isPremium || false,
                                                    role: u.role || "user",
                                                    avatarUrl: u.avatarUrl || null,
                                                })];
                                        case 4:
                                            result = _b.sent();
                                            results.push({ username: u.username, status: result.status });
                                            return [3 /*break*/, 6];
                                        case 5:
                                            err_19 = _b.sent();
                                            results.push({ username: u.username, status: "error", reason: err_19.message });
                                            return [3 /*break*/, 6];
                                        case 6:
                                            _i++;
                                            return [3 /*break*/, 2];
                                        case 7:
                                            res.json({ results: results });
                                            return [3 /*break*/, 9];
                                        case 8:
                                            error_69 = _b.sent();
                                            console.error("Admin import-users error:", error_69);
                                            res.status(500).json({ error: error_69.message || "Import failed" });
                                            return [3 /*break*/, 9];
                                        case 9: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Friends ─────────────────────────────────────────────────────────────────
                            app.get("/api/social/friends", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var me, rows, friendIds, _i, rows_1, r, friendFields, friends, _a, pendingReceived, pendingSent, pendingUsers, _b, sentUsers, _c;
                                return __generator(this, function (_d) {
                                    switch (_d.label) {
                                        case 0: return [4 /*yield*/, getUserFromToken(req)];
                                        case 1:
                                            me = _d.sent();
                                            if (!me) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.select().from(schema_1.pokescanFriendships).where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.pokescanFriendships.requesterId, me.id), (0, drizzle_orm_1.eq)(schema_1.pokescanFriendships.addresseeId, me.id)))];
                                        case 2:
                                            rows = _d.sent();
                                            friendIds = new Set();
                                            for (_i = 0, rows_1 = rows; _i < rows_1.length; _i++) {
                                                r = rows_1[_i];
                                                if (r.status === "accepted") {
                                                    friendIds.add(r.requesterId === me.id ? r.addresseeId : r.requesterId);
                                                }
                                            }
                                            friendFields = { id: schema_1.pokescanUsers.id, username: schema_1.pokescanUsers.username, displayName: schema_1.pokescanUsers.displayName, avatarUrl: schema_1.pokescanUsers.avatarUrl, isPremium: schema_1.pokescanUsers.isPremium, collectionVisible: schema_1.pokescanUsers.collectionVisible };
                                            if (!(friendIds.size > 0)) return [3 /*break*/, 4];
                                            return [4 /*yield*/, db_1.db.select(friendFields)
                                                    .from(schema_1.pokescanUsers).where(drizzle_orm_1.or.apply(void 0, __spreadArray([], friendIds, true).map(function (id) { return (0, drizzle_orm_1.eq)(schema_1.pokescanUsers.id, id); })))];
                                        case 3:
                                            _a = _d.sent();
                                            return [3 /*break*/, 5];
                                        case 4:
                                            _a = [];
                                            _d.label = 5;
                                        case 5:
                                            friends = _a;
                                            pendingReceived = rows.filter(function (r) { return r.addresseeId === me.id && r.status === "pending"; });
                                            pendingSent = rows.filter(function (r) { return r.requesterId === me.id && r.status === "pending"; });
                                            if (!(pendingReceived.length > 0)) return [3 /*break*/, 7];
                                            return [4 /*yield*/, db_1.db.select(friendFields)
                                                    .from(schema_1.pokescanUsers).where(drizzle_orm_1.or.apply(void 0, pendingReceived.map(function (r) { return (0, drizzle_orm_1.eq)(schema_1.pokescanUsers.id, r.requesterId); })))];
                                        case 6:
                                            _b = _d.sent();
                                            return [3 /*break*/, 8];
                                        case 7:
                                            _b = [];
                                            _d.label = 8;
                                        case 8:
                                            pendingUsers = _b;
                                            if (!(pendingSent.length > 0)) return [3 /*break*/, 10];
                                            return [4 /*yield*/, db_1.db.select(friendFields)
                                                    .from(schema_1.pokescanUsers).where(drizzle_orm_1.or.apply(void 0, pendingSent.map(function (r) { return (0, drizzle_orm_1.eq)(schema_1.pokescanUsers.id, r.addresseeId); })))];
                                        case 9:
                                            _c = _d.sent();
                                            return [3 /*break*/, 11];
                                        case 10:
                                            _c = [];
                                            _d.label = 11;
                                        case 11:
                                            sentUsers = _c;
                                            res.json({ friends: friends, pendingReceived: pendingUsers, pendingSent: sentUsers });
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/social/friend-request", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var me, targetUserId, existing, row;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, getUserFromToken(req)];
                                        case 1:
                                            me = _a.sent();
                                            if (!me) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            targetUserId = req.body.targetUserId;
                                            if (!targetUserId || targetUserId === me.id) {
                                                res.status(400).json({ error: "Invalid target" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.select().from(schema_1.pokescanFriendships).where((0, drizzle_orm_1.or)((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokescanFriendships.requesterId, me.id), (0, drizzle_orm_1.eq)(schema_1.pokescanFriendships.addresseeId, targetUserId)), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokescanFriendships.requesterId, targetUserId), (0, drizzle_orm_1.eq)(schema_1.pokescanFriendships.addresseeId, me.id))))];
                                        case 2:
                                            existing = _a.sent();
                                            if (existing.length > 0) {
                                                res.status(400).json({ error: "Request already exists" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.insert(schema_1.pokescanFriendships).values({ requesterId: me.id, addresseeId: targetUserId, status: "pending" }).returning()];
                                        case 3:
                                            row = (_a.sent())[0];
                                            res.json({ friendship: row });
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/social/friend-respond", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var me, _a, requesterId, action, rows;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0: return [4 /*yield*/, getUserFromToken(req)];
                                        case 1:
                                            me = _b.sent();
                                            if (!me) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            _a = req.body, requesterId = _a.requesterId, action = _a.action;
                                            if (!requesterId || !["accept", "decline"].includes(action)) {
                                                res.status(400).json({ error: "Bad request" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.select().from(schema_1.pokescanFriendships).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokescanFriendships.requesterId, requesterId), (0, drizzle_orm_1.eq)(schema_1.pokescanFriendships.addresseeId, me.id), (0, drizzle_orm_1.eq)(schema_1.pokescanFriendships.status, "pending")))];
                                        case 2:
                                            rows = _b.sent();
                                            if (!rows.length) {
                                                res.status(404).json({ error: "Request not found" });
                                                return [2 /*return*/];
                                            }
                                            if (!(action === "accept")) return [3 /*break*/, 4];
                                            return [4 /*yield*/, db_1.db.update(schema_1.pokescanFriendships).set({ status: "accepted" }).where((0, drizzle_orm_1.eq)(schema_1.pokescanFriendships.id, rows[0].id))];
                                        case 3:
                                            _b.sent();
                                            res.json({ status: "accepted" });
                                            return [3 /*break*/, 6];
                                        case 4: return [4 /*yield*/, db_1.db.delete(schema_1.pokescanFriendships).where((0, drizzle_orm_1.eq)(schema_1.pokescanFriendships.id, rows[0].id))];
                                        case 5:
                                            _b.sent();
                                            res.json({ status: "declined" });
                                            _b.label = 6;
                                        case 6: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.delete("/api/social/friend-remove", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var me, friendId;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, getUserFromToken(req)];
                                        case 1:
                                            me = _a.sent();
                                            if (!me) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            friendId = req.body.friendId;
                                            return [4 /*yield*/, db_1.db.delete(schema_1.pokescanFriendships).where((0, drizzle_orm_1.or)((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokescanFriendships.requesterId, me.id), (0, drizzle_orm_1.eq)(schema_1.pokescanFriendships.addresseeId, friendId)), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokescanFriendships.requesterId, friendId), (0, drizzle_orm_1.eq)(schema_1.pokescanFriendships.addresseeId, me.id))))];
                                        case 2:
                                            _a.sent();
                                            res.json({ success: true });
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.get("/api/social/user-search", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var me, q, users;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, getUserFromToken(req)];
                                        case 1:
                                            me = _a.sent();
                                            if (!me) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            q = (req.query.q || "").trim();
                                            if (q.length < 2) {
                                                res.json({ users: [] });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.select({ id: schema_1.pokescanUsers.id, username: schema_1.pokescanUsers.username, displayName: schema_1.pokescanUsers.displayName, avatarUrl: schema_1.pokescanUsers.avatarUrl })
                                                    .from(schema_1.pokescanUsers)
                                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.ne)(schema_1.pokescanUsers.id, me.id), (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.pokescanUsers.username, "%".concat(q, "%")), (0, drizzle_orm_1.ilike)(schema_1.pokescanUsers.displayName, "%".concat(q, "%")))))
                                                    .limit(20)];
                                        case 2:
                                            users = _a.sent();
                                            res.json({ users: users });
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Support ─────────────────────────────────────────────────────────────────
                            app.get("/api/support/admin", function (_req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var admins, err_20;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 2, , 3]);
                                            return [4 /*yield*/, db_1.db
                                                    .select({ id: schema_1.pokescanUsers.id, displayName: schema_1.pokescanUsers.displayName, username: schema_1.pokescanUsers.username })
                                                    .from(schema_1.pokescanUsers)
                                                    .where((0, drizzle_orm_1.eq)(schema_1.pokescanUsers.role, "admin"))
                                                    .limit(1)];
                                        case 1:
                                            admins = _a.sent();
                                            if (admins.length === 0) {
                                                res.json({ admin: null });
                                                return [2 /*return*/];
                                            }
                                            res.json({ admin: admins[0] });
                                            return [3 /*break*/, 3];
                                        case 2:
                                            err_20 = _a.sent();
                                            res.status(500).json({ error: "Failed to find support contact" });
                                            return [3 /*break*/, 3];
                                        case 3: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Messages ────────────────────────────────────────────────────────────────
                            app.get("/api/social/messages/inbox", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var me, rows;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, getUserFromToken(req)];
                                        case 1:
                                            me = _a.sent();
                                            if (!me) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.select({
                                                    id: schema_1.pokescanMessages.id, subject: schema_1.pokescanMessages.subject, body: schema_1.pokescanMessages.body,
                                                    isRead: schema_1.pokescanMessages.isRead, createdAt: schema_1.pokescanMessages.createdAt,
                                                    senderId: schema_1.pokescanMessages.senderId,
                                                    senderUsername: schema_1.pokescanUsers.username, senderDisplayName: schema_1.pokescanUsers.displayName, senderAvatarUrl: schema_1.pokescanUsers.avatarUrl,
                                                }).from(schema_1.pokescanMessages)
                                                    .innerJoin(schema_1.pokescanUsers, (0, drizzle_orm_1.eq)(schema_1.pokescanMessages.senderId, schema_1.pokescanUsers.id))
                                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokescanMessages.recipientId, me.id), (0, drizzle_orm_1.eq)(schema_1.pokescanMessages.deletedByRecipient, false)))
                                                    .orderBy((0, drizzle_orm_1.desc)(schema_1.pokescanMessages.createdAt))];
                                        case 2:
                                            rows = _a.sent();
                                            res.json({ messages: rows });
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.get("/api/social/messages/sent", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var me, rows;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, getUserFromToken(req)];
                                        case 1:
                                            me = _a.sent();
                                            if (!me) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.select({
                                                    id: schema_1.pokescanMessages.id, subject: schema_1.pokescanMessages.subject, body: schema_1.pokescanMessages.body,
                                                    isRead: schema_1.pokescanMessages.isRead, createdAt: schema_1.pokescanMessages.createdAt,
                                                    recipientId: schema_1.pokescanMessages.recipientId,
                                                    recipientUsername: schema_1.pokescanUsers.username, recipientDisplayName: schema_1.pokescanUsers.displayName, recipientAvatarUrl: schema_1.pokescanUsers.avatarUrl,
                                                }).from(schema_1.pokescanMessages)
                                                    .innerJoin(schema_1.pokescanUsers, (0, drizzle_orm_1.eq)(schema_1.pokescanMessages.recipientId, schema_1.pokescanUsers.id))
                                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokescanMessages.senderId, me.id), (0, drizzle_orm_1.eq)(schema_1.pokescanMessages.deletedBySender, false)))
                                                    .orderBy((0, drizzle_orm_1.desc)(schema_1.pokescanMessages.createdAt))];
                                        case 2:
                                            rows = _a.sent();
                                            res.json({ messages: rows });
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.get("/api/social/messages/unread-count", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var me, result;
                                var _a, _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0: return [4 /*yield*/, getUserFromToken(req)];
                                        case 1:
                                            me = _c.sent();
                                            if (!me) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.select({ count: (0, drizzle_orm_1.sql)(templateObject_51 || (templateObject_51 = __makeTemplateObject(["count(*)::int"], ["count(*)::int"]))) }).from(schema_1.pokescanMessages)
                                                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokescanMessages.recipientId, me.id), (0, drizzle_orm_1.eq)(schema_1.pokescanMessages.isRead, false), (0, drizzle_orm_1.eq)(schema_1.pokescanMessages.deletedByRecipient, false)))];
                                        case 2:
                                            result = _c.sent();
                                            res.json({ count: (_b = (_a = result[0]) === null || _a === void 0 ? void 0 : _a.count) !== null && _b !== void 0 ? _b : 0 });
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/social/messages/send", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var me, _a, recipientId, subject, body, target, msg;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0: return [4 /*yield*/, getUserFromToken(req)];
                                        case 1:
                                            me = _b.sent();
                                            if (!me) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            _a = req.body, recipientId = _a.recipientId, subject = _a.subject, body = _a.body;
                                            if (!recipientId || !(body === null || body === void 0 ? void 0 : body.trim())) {
                                                res.status(400).json({ error: "recipientId and body required" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.getUserById(recipientId)];
                                        case 2:
                                            target = _b.sent();
                                            if (!target) {
                                                res.status(404).json({ error: "Recipient not found" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.insert(schema_1.pokescanMessages).values({
                                                    senderId: me.id,
                                                    recipientId: recipientId,
                                                    subject: (subject || "").trim(), body: body.trim(),
                                                }).returning()];
                                        case 3:
                                            msg = (_b.sent())[0];
                                            res.json({ message: msg });
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.patch("/api/social/messages/:id/read", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var me;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, getUserFromToken(req)];
                                        case 1:
                                            me = _a.sent();
                                            if (!me) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.update(schema_1.pokescanMessages).set({ isRead: true }).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokescanMessages.id, req.params.id), (0, drizzle_orm_1.eq)(schema_1.pokescanMessages.recipientId, me.id)))];
                                        case 2:
                                            _a.sent();
                                            res.json({ success: true });
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.delete("/api/social/messages/:id", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var me, msg;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, getUserFromToken(req)];
                                        case 1:
                                            me = _a.sent();
                                            if (!me) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.select().from(schema_1.pokescanMessages).where((0, drizzle_orm_1.eq)(schema_1.pokescanMessages.id, req.params.id))];
                                        case 2:
                                            msg = (_a.sent())[0];
                                            if (!msg) {
                                                res.status(404).json({ error: "Not found" });
                                                return [2 /*return*/];
                                            }
                                            if (!(msg.senderId === me.id)) return [3 /*break*/, 4];
                                            return [4 /*yield*/, db_1.db.update(schema_1.pokescanMessages).set({ deletedBySender: true }).where((0, drizzle_orm_1.eq)(schema_1.pokescanMessages.id, msg.id))];
                                        case 3:
                                            _a.sent();
                                            return [3 /*break*/, 6];
                                        case 4:
                                            if (!(msg.recipientId === me.id)) return [3 /*break*/, 6];
                                            return [4 /*yield*/, db_1.db.update(schema_1.pokescanMessages).set({ deletedByRecipient: true }).where((0, drizzle_orm_1.eq)(schema_1.pokescanMessages.id, msg.id))];
                                        case 5:
                                            _a.sent();
                                            _a.label = 6;
                                        case 6:
                                            res.json({ success: true });
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Reports ─────────────────────────────────────────────────────────────────
                            app.post("/api/social/report", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var me, _a, contentType, contentId, reason, contentSnapshot, reportedUserId, existing, report;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0: return [4 /*yield*/, getUserFromToken(req)];
                                        case 1:
                                            me = _b.sent();
                                            if (!me) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            _a = req.body, contentType = _a.contentType, contentId = _a.contentId, reason = _a.reason, contentSnapshot = _a.contentSnapshot, reportedUserId = _a.reportedUserId;
                                            if (!contentType || !contentId || !(reason === null || reason === void 0 ? void 0 : reason.trim())) {
                                                res.status(400).json({ error: "contentType, contentId, and reason are required" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.select().from(schema_1.pokescanReports).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokescanReports.reporterId, me.id), (0, drizzle_orm_1.eq)(schema_1.pokescanReports.contentId, contentId), (0, drizzle_orm_1.eq)(schema_1.pokescanReports.status, "pending")))];
                                        case 2:
                                            existing = _b.sent();
                                            if (existing.length > 0) {
                                                res.status(400).json({ error: "You already reported this content" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.insert(schema_1.pokescanReports).values({
                                                    reporterId: me.id,
                                                    reportedUserId: reportedUserId || null,
                                                    contentType: contentType,
                                                    contentId: contentId,
                                                    reason: reason.trim(),
                                                    contentSnapshot: contentSnapshot ? JSON.stringify(contentSnapshot) : null,
                                                }).returning()];
                                        case 3:
                                            report = (_b.sent())[0];
                                            res.json({ report: report });
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.get("/api/admin/reports", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var pw, token, isAuthorized, user, reports;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            pw = req.query.superadminPassword;
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            return [4 /*yield*/, isSuperadminAuthorized(req)];
                                        case 1:
                                            isAuthorized = _b.sent();
                                            if (!(!isAuthorized && token)) return [3 /*break*/, 3];
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 2:
                                            user = _b.sent();
                                            if (user && (user.role === "admin" || user.role === "moderator"))
                                                isAuthorized = true;
                                            _b.label = 3;
                                        case 3:
                                            if (!isAuthorized) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.select({
                                                    id: schema_1.pokescanReports.id,
                                                    contentType: schema_1.pokescanReports.contentType,
                                                    contentId: schema_1.pokescanReports.contentId,
                                                    reason: schema_1.pokescanReports.reason,
                                                    contentSnapshot: schema_1.pokescanReports.contentSnapshot,
                                                    status: schema_1.pokescanReports.status,
                                                    reviewNote: schema_1.pokescanReports.reviewNote,
                                                    reviewedAt: schema_1.pokescanReports.reviewedAt,
                                                    createdAt: schema_1.pokescanReports.createdAt,
                                                    reporterUsername: (0, drizzle_orm_1.sql)(templateObject_52 || (templateObject_52 = __makeTemplateObject(["r_user.username"], ["r_user.username"]))),
                                                    reporterDisplayName: (0, drizzle_orm_1.sql)(templateObject_53 || (templateObject_53 = __makeTemplateObject(["r_user.display_name"], ["r_user.display_name"]))),
                                                    reportedUserUsername: (0, drizzle_orm_1.sql)(templateObject_54 || (templateObject_54 = __makeTemplateObject(["ru_user.username"], ["ru_user.username"]))),
                                                    reportedUserDisplayName: (0, drizzle_orm_1.sql)(templateObject_55 || (templateObject_55 = __makeTemplateObject(["ru_user.display_name"], ["ru_user.display_name"]))),
                                                    reviewedByUsername: (0, drizzle_orm_1.sql)(templateObject_56 || (templateObject_56 = __makeTemplateObject(["rev_user.username"], ["rev_user.username"]))),
                                                })
                                                    .from(schema_1.pokescanReports)
                                                    .leftJoin((0, drizzle_orm_1.sql)(templateObject_57 || (templateObject_57 = __makeTemplateObject(["pokescan_users AS r_user"], ["pokescan_users AS r_user"]))), (0, drizzle_orm_1.sql)(templateObject_58 || (templateObject_58 = __makeTemplateObject(["r_user.id = pokescan_reports.reporter_id"], ["r_user.id = pokescan_reports.reporter_id"]))))
                                                    .leftJoin((0, drizzle_orm_1.sql)(templateObject_59 || (templateObject_59 = __makeTemplateObject(["pokescan_users AS ru_user"], ["pokescan_users AS ru_user"]))), (0, drizzle_orm_1.sql)(templateObject_60 || (templateObject_60 = __makeTemplateObject(["ru_user.id = pokescan_reports.reported_user_id"], ["ru_user.id = pokescan_reports.reported_user_id"]))))
                                                    .leftJoin((0, drizzle_orm_1.sql)(templateObject_61 || (templateObject_61 = __makeTemplateObject(["pokescan_users AS rev_user"], ["pokescan_users AS rev_user"]))), (0, drizzle_orm_1.sql)(templateObject_62 || (templateObject_62 = __makeTemplateObject(["rev_user.id = pokescan_reports.reviewed_by"], ["rev_user.id = pokescan_reports.reviewed_by"]))))
                                                    .orderBy((0, drizzle_orm_1.desc)(schema_1.pokescanReports.createdAt))];
                                        case 4:
                                            reports = _b.sent();
                                            res.json({ reports: reports });
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.patch("/api/admin/reports/:id", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var pw, token, reviewerId, isAuthorized, user, _a, status, reviewNote, updated;
                                var _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            pw = req.body.superadminPassword;
                                            token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", "");
                                            reviewerId = null;
                                            return [4 /*yield*/, isSuperadminAuthorized(req)];
                                        case 1:
                                            isAuthorized = _c.sent();
                                            if (!(!isAuthorized && token)) return [3 /*break*/, 3];
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 2:
                                            user = _c.sent();
                                            if (user && (user.role === "admin" || user.role === "moderator")) {
                                                isAuthorized = true;
                                                reviewerId = user.id;
                                            }
                                            _c.label = 3;
                                        case 3:
                                            if (!isAuthorized) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            _a = req.body, status = _a.status, reviewNote = _a.reviewNote;
                                            if (!["reviewed", "dismissed"].includes(status)) {
                                                res.status(400).json({ error: "status must be 'reviewed' or 'dismissed'" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.update(schema_1.pokescanReports).set({
                                                    status: status,
                                                    reviewNote: (reviewNote === null || reviewNote === void 0 ? void 0 : reviewNote.trim()) || null,
                                                    reviewedBy: reviewerId || null,
                                                    reviewedAt: new Date(),
                                                }).where((0, drizzle_orm_1.eq)(schema_1.pokescanReports.id, req.params.id)).returning()];
                                        case 4:
                                            updated = (_c.sent())[0];
                                            if (!updated) {
                                                res.status(404).json({ error: "Report not found" });
                                                return [2 /*return*/];
                                            }
                                            res.json({ report: updated });
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                            // POST /api/admin/card-reseed — seeds cards for any sets that have 0 cards in DB.
                            // Fire-and-forget: returns immediately and runs in the background.
                            app.post("/api/admin/card-reseed", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var superadminPassword, status;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            superadminPassword = req.body.superadminPassword;
                                            return [4 /*yield*/, isSuperadminAuthorized(req)];
                                        case 1:
                                            if (!(_a.sent())) {
                                                res.status(403).json({ error: "Forbidden" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, (0, card_sync_1.getSyncStatus)()];
                                        case 2:
                                            status = _a.sent();
                                            if (status === null || status === void 0 ? void 0 : status.isRunning) {
                                                res.status(409).json({ error: "Sync already running", status: status });
                                                return [2 /*return*/];
                                            }
                                            // Run without force so it only seeds sets that have 0 cards
                                            (0, card_sync_1.runFullSync)(false).catch(function (err) { return console.error("[CardReseed] Error:", err); });
                                            res.json({ message: "Card reseed started in background — monitor server logs for progress.", running: true });
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/grade", express_1.default.json({ limit: "25mb" }), function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var _a, centering, cornerDamage, edgeDamage, surfaceDamage, frontImageBase64, backImageBase64, imageBase64, frontImg, prompt_2, imageContent, aiRes, raw, jsonMatch, parsed, result_1, cr, centeringRatios, result, err_21;
                                var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
                                return __generator(this, function (_r) {
                                    switch (_r.label) {
                                        case 0:
                                            _r.trys.push([0, 3, , 4]);
                                            _a = req.body, centering = _a.centering, cornerDamage = _a.cornerDamage, edgeDamage = _a.edgeDamage, surfaceDamage = _a.surfaceDamage, frontImageBase64 = _a.frontImageBase64, backImageBase64 = _a.backImageBase64, imageBase64 = _a.imageBase64;
                                            frontImg = frontImageBase64 || imageBase64;
                                            if (!frontImg) return [3 /*break*/, 2];
                                            prompt_2 = "You are an expert Pok\u00E9mon TCG card grader with experience equivalent to PSA/BGS professional grading. You have been given ".concat(backImageBase64 ? "TWO images: the FRONT of the card followed by the BACK of the card" : "ONE image: the FRONT of the card", ". Analyse both surfaces thoroughly.\n\nScore each criterion 0\u20135 (0 = perfect, 5 = severe damage):\n- centering: how off-centre the print is on the card stock\n- cornerDamage: wear, fraying, bending on any corner\n- edgeDamage: nicks, chips, roughness on any edge\n- surfaceDamage: scratches, print lines, scuffs, stains on front or back\n\nAlso provide:\n- centeringRatios: estimate the border-space percentages for each side. topPct + bottomPct = 100, leftPct + rightPct = 100. Perfect centering = 50/50.\n- findings: one detailed sentence per criterion describing exactly what you see, including which specific corners/edges/areas are affected and the severity.\n- gradingComments: a 2\u20133 sentence professional assessment of the overall card quality, likely PSA/BGS grade range, and what the main deductions are.\n- overallNotes: one concise sentence summary.\n\nReturn ONLY valid JSON in exactly this format with no markdown:\n{\n  \"centering\": 0,\n  \"cornerDamage\": 0,\n  \"edgeDamage\": 0,\n  \"surfaceDamage\": 0,\n  \"centeringRatios\": { \"topPct\": 50, \"bottomPct\": 50, \"leftPct\": 50, \"rightPct\": 50 },\n  \"findings\": {\n    \"centering\": \"detailed centering observation\",\n    \"corners\": \"detailed corner observation\",\n    \"edges\": \"detailed edge observation\",\n    \"frontSurface\": \"detailed front surface observation\",\n    \"backSurface\": \"detailed back surface observation or N/A if only front provided\"\n  },\n  \"gradingComments\": \"professional 2-3 sentence overall assessment with likely grade range\",\n  \"overallNotes\": \"one sentence summary\"\n}");
                                            imageContent = [
                                                { type: "text", text: prompt_2 },
                                                { type: "image_url", image_url: { url: frontImg, detail: "high" } },
                                            ];
                                            if (backImageBase64) {
                                                imageContent.push({ type: "image_url", image_url: { url: backImageBase64, detail: "high" } });
                                            }
                                            return [4 /*yield*/, openai.chat.completions.create({
                                                    model: "gpt-4o",
                                                    max_tokens: 800,
                                                    messages: [{ role: "user", content: imageContent }],
                                                })];
                                        case 1:
                                            aiRes = _r.sent();
                                            raw = ((_d = (_c = (_b = aiRes.choices[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.trim()) || "";
                                            jsonMatch = raw.match(/\{[\s\S]*\}/);
                                            if (!jsonMatch)
                                                throw new Error("AI returned invalid response");
                                            parsed = JSON.parse(jsonMatch[0]);
                                            result_1 = (0, grading_1.calculateGrade)({
                                                centering: Math.max(0, Math.min(5, (_e = parsed.centering) !== null && _e !== void 0 ? _e : 0)),
                                                cornerDamage: Math.max(0, Math.min(5, (_f = parsed.cornerDamage) !== null && _f !== void 0 ? _f : 0)),
                                                edgeDamage: Math.max(0, Math.min(5, (_g = parsed.edgeDamage) !== null && _g !== void 0 ? _g : 0)),
                                                surfaceDamage: Math.max(0, Math.min(5, (_h = parsed.surfaceDamage) !== null && _h !== void 0 ? _h : 0)),
                                            });
                                            cr = parsed.centeringRatios;
                                            centeringRatios = cr ? {
                                                topPct: Math.round(Math.max(1, Math.min(99, (_j = cr.topPct) !== null && _j !== void 0 ? _j : 50))),
                                                bottomPct: Math.round(Math.max(1, Math.min(99, (_k = cr.bottomPct) !== null && _k !== void 0 ? _k : 50))),
                                                leftPct: Math.round(Math.max(1, Math.min(99, (_l = cr.leftPct) !== null && _l !== void 0 ? _l : 50))),
                                                rightPct: Math.round(Math.max(1, Math.min(99, (_m = cr.rightPct) !== null && _m !== void 0 ? _m : 50))),
                                            } : null;
                                            return [2 /*return*/, res.json(__assign(__assign({}, result_1), { aiAssessed: true, aiNotes: (_o = parsed.overallNotes) !== null && _o !== void 0 ? _o : null, centeringRatios: centeringRatios, findings: (_p = parsed.findings) !== null && _p !== void 0 ? _p : null, gradingComments: (_q = parsed.gradingComments) !== null && _q !== void 0 ? _q : null }))];
                                        case 2:
                                            result = (0, grading_1.calculateGrade)({ centering: centering, cornerDamage: cornerDamage, edgeDamage: edgeDamage, surfaceDamage: surfaceDamage });
                                            res.json(result);
                                            return [3 /*break*/, 4];
                                        case 3:
                                            err_21 = _r.sent();
                                            console.error("Grading error:", err_21);
                                            res.status(500).json({ error: "Grading failed" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            cleanupOldChatroomMessages();
                            setInterval(cleanupOldChatroomMessages, 60 * 60 * 1000);
                            isStaffRole_1 = function (role) { return role === "admin" || role === "moderator"; };
                            app.get("/api/chatroom/messages", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, caller, msgs, error_70;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 3, , 4]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            caller = _b.sent();
                                            if (!caller) {
                                                res.status(401).json({ error: "Invalid session" });
                                                return [2 /*return*/];
                                            }
                                            if (!caller.isPremium && !isStaffRole_1(caller.role)) {
                                                res.status(403).json({ error: "Premium membership required" });
                                                return [2 /*return*/];
                                            }
                                            if (caller.chatBannedUntil && new Date(caller.chatBannedUntil) > new Date()) {
                                                res.status(403).json({ error: "You are banned from the chat", bannedUntil: caller.chatBannedUntil });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.select().from(schema_1.pokescanChatroomMessages)
                                                    .orderBy((0, drizzle_orm_1.desc)(schema_1.pokescanChatroomMessages.createdAt))
                                                    .limit(200)];
                                        case 2:
                                            msgs = _b.sent();
                                            res.json({ messages: msgs.reverse() });
                                            return [3 /*break*/, 4];
                                        case 3:
                                            error_70 = _b.sent();
                                            console.error("Chatroom get error:", error_70);
                                            res.status(500).json({ error: error_70.message || "Failed to load chatroom" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/chatroom/messages", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, caller, body, trimmed, msg, error_71;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 3, , 4]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            caller = _b.sent();
                                            if (!caller) {
                                                res.status(401).json({ error: "Invalid session" });
                                                return [2 /*return*/];
                                            }
                                            if (!caller.isPremium && !isStaffRole_1(caller.role)) {
                                                res.status(403).json({ error: "Premium membership required" });
                                                return [2 /*return*/];
                                            }
                                            if (caller.chatBannedUntil && new Date(caller.chatBannedUntil) > new Date()) {
                                                res.status(403).json({ error: "You are banned from the chat", bannedUntil: caller.chatBannedUntil });
                                                return [2 /*return*/];
                                            }
                                            if (caller.chatMutedUntil && new Date(caller.chatMutedUntil) > new Date()) {
                                                res.status(403).json({ error: "You are muted", mutedUntil: caller.chatMutedUntil });
                                                return [2 /*return*/];
                                            }
                                            body = req.body.body;
                                            if (!body || typeof body !== "string" || !body.trim()) {
                                                res.status(400).json({ error: "Message body is required" });
                                                return [2 /*return*/];
                                            }
                                            trimmed = body.trim().substring(0, 2000);
                                            return [4 /*yield*/, db_1.db.insert(schema_1.pokescanChatroomMessages).values({
                                                    senderId: caller.id,
                                                    senderUsername: caller.username,
                                                    senderDisplayName: caller.displayName || caller.username,
                                                    senderAvatarUrl: caller.avatarUrl || null,
                                                    body: trimmed,
                                                }).returning()];
                                        case 2:
                                            msg = (_b.sent())[0];
                                            res.json({ message: msg });
                                            return [3 /*break*/, 4];
                                        case 3:
                                            error_71 = _b.sent();
                                            console.error("Chatroom send error:", error_71);
                                            res.status(500).json({ error: error_71.message || "Failed to send message" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.delete("/api/chatroom/messages/:id", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, caller, msgId, existing, error_72;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 4, , 5]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            caller = _b.sent();
                                            if (!caller) {
                                                res.status(401).json({ error: "Invalid session" });
                                                return [2 /*return*/];
                                            }
                                            if (!caller.isPremium && !isStaffRole_1(caller.role)) {
                                                res.status(403).json({ error: "Premium membership required" });
                                                return [2 /*return*/];
                                            }
                                            if (caller.chatBannedUntil && new Date(caller.chatBannedUntil) > new Date() && !isStaffRole_1(caller.role)) {
                                                res.status(403).json({ error: "You are banned from the chat", bannedUntil: caller.chatBannedUntil });
                                                return [2 /*return*/];
                                            }
                                            msgId = req.params.id;
                                            return [4 /*yield*/, db_1.db.select().from(schema_1.pokescanChatroomMessages).where((0, drizzle_orm_1.eq)(schema_1.pokescanChatroomMessages.id, msgId))];
                                        case 2:
                                            existing = (_b.sent())[0];
                                            if (!existing) {
                                                res.status(404).json({ error: "Message not found" });
                                                return [2 /*return*/];
                                            }
                                            if (existing.senderId !== caller.id && !isStaffRole_1(caller.role)) {
                                                res.status(403).json({ error: "Not allowed" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.delete(schema_1.pokescanChatroomMessages).where((0, drizzle_orm_1.eq)(schema_1.pokescanChatroomMessages.id, msgId))];
                                        case 3:
                                            _b.sent();
                                            res.json({ success: true });
                                            return [3 /*break*/, 5];
                                        case 4:
                                            error_72 = _b.sent();
                                            console.error("Chatroom delete error:", error_72);
                                            res.status(500).json({ error: error_72.message || "Failed to delete message" });
                                            return [3 /*break*/, 5];
                                        case 5: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/chatroom/mute", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, caller, _a, userId, minutes, target, mutedUntil, error_73;
                                var _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _c.trys.push([0, 4, , 5]);
                                            token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            caller = _c.sent();
                                            if (!caller) {
                                                res.status(401).json({ error: "Invalid session" });
                                                return [2 /*return*/];
                                            }
                                            if (!isStaffRole_1(caller.role)) {
                                                res.status(403).json({ error: "Staff only" });
                                                return [2 /*return*/];
                                            }
                                            _a = req.body, userId = _a.userId, minutes = _a.minutes;
                                            if (!userId || !minutes || typeof minutes !== "number" || minutes < 1) {
                                                res.status(400).json({ error: "userId and minutes (positive number) required" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.getUserById(userId)];
                                        case 2:
                                            target = _c.sent();
                                            if (!target) {
                                                res.status(404).json({ error: "User not found" });
                                                return [2 /*return*/];
                                            }
                                            if (isStaffRole_1(target.role)) {
                                                res.status(403).json({ error: "Cannot mute staff members" });
                                                return [2 /*return*/];
                                            }
                                            mutedUntil = new Date(Date.now() + minutes * 60 * 1000);
                                            return [4 /*yield*/, db_1.pool.query("UPDATE pokescan_users SET chat_muted_until = $1 WHERE id = $2", [mutedUntil, userId])];
                                        case 3:
                                            _c.sent();
                                            res.json({ success: true, mutedUntil: mutedUntil.toISOString() });
                                            return [3 /*break*/, 5];
                                        case 4:
                                            error_73 = _c.sent();
                                            console.error("Mute error:", error_73);
                                            res.status(500).json({ error: error_73.message || "Failed to mute user" });
                                            return [3 /*break*/, 5];
                                        case 5: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/chatroom/unmute", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, caller, userId, error_74;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 3, , 4]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            caller = _b.sent();
                                            if (!caller) {
                                                res.status(401).json({ error: "Invalid session" });
                                                return [2 /*return*/];
                                            }
                                            if (!isStaffRole_1(caller.role)) {
                                                res.status(403).json({ error: "Staff only" });
                                                return [2 /*return*/];
                                            }
                                            userId = req.body.userId;
                                            if (!userId) {
                                                res.status(400).json({ error: "userId required" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.pool.query("UPDATE pokescan_users SET chat_muted_until = NULL WHERE id = $1", [userId])];
                                        case 2:
                                            _b.sent();
                                            res.json({ success: true });
                                            return [3 /*break*/, 4];
                                        case 3:
                                            error_74 = _b.sent();
                                            console.error("Unmute error:", error_74);
                                            res.status(500).json({ error: error_74.message || "Failed to unmute user" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/chatroom/ban", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, caller, _a, userId, minutes, target, bannedUntil, error_75;
                                var _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _c.trys.push([0, 4, , 5]);
                                            token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            caller = _c.sent();
                                            if (!caller) {
                                                res.status(401).json({ error: "Invalid session" });
                                                return [2 /*return*/];
                                            }
                                            if (!isStaffRole_1(caller.role)) {
                                                res.status(403).json({ error: "Staff only" });
                                                return [2 /*return*/];
                                            }
                                            _a = req.body, userId = _a.userId, minutes = _a.minutes;
                                            if (!userId || !minutes || typeof minutes !== "number" || minutes < 1) {
                                                res.status(400).json({ error: "userId and minutes (positive number) required" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.getUserById(userId)];
                                        case 2:
                                            target = _c.sent();
                                            if (!target) {
                                                res.status(404).json({ error: "User not found" });
                                                return [2 /*return*/];
                                            }
                                            if (isStaffRole_1(target.role)) {
                                                res.status(403).json({ error: "Cannot ban staff members" });
                                                return [2 /*return*/];
                                            }
                                            bannedUntil = new Date(Date.now() + minutes * 60 * 1000);
                                            return [4 /*yield*/, db_1.pool.query("UPDATE pokescan_users SET chat_banned_until = $1 WHERE id = $2", [bannedUntil, userId])];
                                        case 3:
                                            _c.sent();
                                            res.json({ success: true, bannedUntil: bannedUntil.toISOString() });
                                            return [3 /*break*/, 5];
                                        case 4:
                                            error_75 = _c.sent();
                                            console.error("Ban error:", error_75);
                                            res.status(500).json({ error: error_75.message || "Failed to ban user" });
                                            return [3 /*break*/, 5];
                                        case 5: return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/chatroom/unban", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var token, caller, userId, error_76;
                                var _a;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0:
                                            _b.trys.push([0, 3, , 4]);
                                            token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
                                            if (!token) {
                                                res.status(401).json({ error: "Unauthorized" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, storage_1.storage.validateSession(token)];
                                        case 1:
                                            caller = _b.sent();
                                            if (!caller) {
                                                res.status(401).json({ error: "Invalid session" });
                                                return [2 /*return*/];
                                            }
                                            if (!isStaffRole_1(caller.role)) {
                                                res.status(403).json({ error: "Staff only" });
                                                return [2 /*return*/];
                                            }
                                            userId = req.body.userId;
                                            if (!userId) {
                                                res.status(400).json({ error: "userId required" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.pool.query("UPDATE pokescan_users SET chat_banned_until = NULL WHERE id = $1", [userId])];
                                        case 2:
                                            _b.sent();
                                            res.json({ success: true });
                                            return [3 /*break*/, 4];
                                        case 3:
                                            error_76 = _b.sent();
                                            console.error("Unban error:", error_76);
                                            res.status(500).json({ error: error_76.message || "Failed to unban user" });
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─── Admin DB Editor ─────────────────────────────────────────────────────────
                            app.get("/api/admin/db/cards", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var page, pageSize, search, setIdFilter, trash, offset, deletedFilter, condition, _a, countResult, rows;
                                var _b, _c;
                                return __generator(this, function (_d) {
                                    switch (_d.label) {
                                        case 0: return [4 /*yield*/, isSuperadminSessionOnly(req)];
                                        case 1:
                                            if (!(_d.sent())) {
                                                res.status(403).json({ error: "Forbidden" });
                                                return [2 /*return*/];
                                            }
                                            page = Math.max(1, parseInt(req.query.page || "1", 10));
                                            pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || "50", 10)));
                                            search = (req.query.search || "").trim();
                                            setIdFilter = (req.query.setId || "").trim();
                                            trash = req.query.trash === "1";
                                            offset = (page - 1) * pageSize;
                                            deletedFilter = trash ? (0, drizzle_orm_1.isNotNull)(schema_1.pokemonCards.deletedAt) : (0, drizzle_orm_1.isNull)(schema_1.pokemonCards.deletedAt);
                                            if (search && setIdFilter) {
                                                condition = (0, drizzle_orm_1.and)(deletedFilter, (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.pokemonCards.name, "%".concat(search, "%")), (0, drizzle_orm_1.ilike)(schema_1.pokemonCards.id, "%".concat(search, "%"))), (0, drizzle_orm_1.eq)(schema_1.pokemonCards.setId, setIdFilter));
                                            }
                                            else if (search) {
                                                condition = (0, drizzle_orm_1.and)(deletedFilter, (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.pokemonCards.name, "%".concat(search, "%")), (0, drizzle_orm_1.ilike)(schema_1.pokemonCards.id, "%".concat(search, "%"))));
                                            }
                                            else if (setIdFilter) {
                                                condition = (0, drizzle_orm_1.and)(deletedFilter, (0, drizzle_orm_1.eq)(schema_1.pokemonCards.setId, setIdFilter));
                                            }
                                            else {
                                                condition = deletedFilter;
                                            }
                                            return [4 /*yield*/, Promise.all([
                                                    db_1.db.select({ count: (0, drizzle_orm_1.sql)(templateObject_63 || (templateObject_63 = __makeTemplateObject(["count(*)::int"], ["count(*)::int"]))) }).from(schema_1.pokemonCards).where(condition),
                                                    db_1.db.select({
                                                        id: schema_1.pokemonCards.id,
                                                        setId: schema_1.pokemonCards.setId,
                                                        setName: schema_1.pokemonSets.name,
                                                        name: schema_1.pokemonCards.name,
                                                        number: schema_1.pokemonCards.number,
                                                        rarity: schema_1.pokemonCards.rarity,
                                                        supertype: schema_1.pokemonCards.supertype,
                                                        subtypes: schema_1.pokemonCards.subtypes,
                                                        imageSmall: schema_1.pokemonCards.imageSmall,
                                                        imageLarge: schema_1.pokemonCards.imageLarge,
                                                        artist: schema_1.pokemonCards.artist,
                                                        hp: schema_1.pokemonCards.hp,
                                                        nationalPokedexNumbers: schema_1.pokemonCards.nationalPokedexNumbers,
                                                        description: schema_1.pokemonCards.description,
                                                        deletedAt: schema_1.pokemonCards.deletedAt,
                                                    }).from(schema_1.pokemonCards)
                                                        .leftJoin(schema_1.pokemonSets, (0, drizzle_orm_1.eq)(schema_1.pokemonCards.setId, schema_1.pokemonSets.id))
                                                        .where(condition).orderBy(schema_1.pokemonCards.number).limit(pageSize).offset(offset),
                                                ])];
                                        case 2:
                                            _a = _d.sent(), countResult = _a[0], rows = _a[1];
                                            res.json({ cards: rows, total: (_c = (_b = countResult[0]) === null || _b === void 0 ? void 0 : _b.count) !== null && _c !== void 0 ? _c : 0, page: page, pageSize: pageSize });
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.patch("/api/admin/db/cards/:id", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var id, _a, name, number, rarity, imageSmall, imageLarge, artist, hp, supertype, subtypes, description, updates, drizzleUpdates, updated;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0: return [4 /*yield*/, isSuperadminSessionOnly(req)];
                                        case 1:
                                            if (!(_b.sent())) {
                                                res.status(403).json({ error: "Forbidden" });
                                                return [2 /*return*/];
                                            }
                                            id = req.params.id;
                                            _a = req.body, name = _a.name, number = _a.number, rarity = _a.rarity, imageSmall = _a.imageSmall, imageLarge = _a.imageLarge, artist = _a.artist, hp = _a.hp, supertype = _a.supertype, subtypes = _a.subtypes, description = _a.description;
                                            updates = {};
                                            if (typeof name === "string") {
                                                if (!name.trim()) {
                                                    res.status(400).json({ error: "Card name cannot be empty" });
                                                    return [2 /*return*/];
                                                }
                                                updates.name = name.trim();
                                            }
                                            if (typeof number === "string")
                                                updates.number = number.trim() || undefined;
                                            if (Object.prototype.hasOwnProperty.call(req.body, "rarity"))
                                                updates.rarity = typeof rarity === "string" ? (rarity.trim() || null) : null;
                                            if (Object.prototype.hasOwnProperty.call(req.body, "imageSmall"))
                                                updates.image_small = typeof imageSmall === "string" ? (imageSmall.trim() || null) : null;
                                            if (Object.prototype.hasOwnProperty.call(req.body, "imageLarge"))
                                                updates.image_large = typeof imageLarge === "string" ? (imageLarge.trim() || null) : null;
                                            if (Object.prototype.hasOwnProperty.call(req.body, "artist"))
                                                updates.artist = typeof artist === "string" ? (artist.trim() || null) : null;
                                            if (Object.prototype.hasOwnProperty.call(req.body, "hp"))
                                                updates.hp = typeof hp === "string" ? (hp.trim() || null) : null;
                                            if (Object.prototype.hasOwnProperty.call(req.body, "supertype"))
                                                updates.supertype = typeof supertype === "string" ? (supertype.trim() || null) : null;
                                            if (Object.prototype.hasOwnProperty.call(req.body, "subtypes"))
                                                updates.subtypes = typeof subtypes === "string" ? (subtypes.trim() || null) : null;
                                            if (Object.prototype.hasOwnProperty.call(req.body, "description"))
                                                updates.description = typeof description === "string" ? (description.trim() || null) : null;
                                            if (Object.keys(updates).length === 0) {
                                                res.status(400).json({ error: "No valid fields to update" });
                                                return [2 /*return*/];
                                            }
                                            drizzleUpdates = {};
                                            if (updates.name !== undefined)
                                                drizzleUpdates.name = updates.name;
                                            if (updates.number !== undefined)
                                                drizzleUpdates.number = updates.number;
                                            if (Object.prototype.hasOwnProperty.call(updates, "rarity"))
                                                drizzleUpdates.rarity = updates.rarity;
                                            if (Object.prototype.hasOwnProperty.call(updates, "image_small"))
                                                drizzleUpdates.imageSmall = updates.image_small;
                                            if (Object.prototype.hasOwnProperty.call(updates, "image_large"))
                                                drizzleUpdates.imageLarge = updates.image_large;
                                            if (Object.prototype.hasOwnProperty.call(updates, "artist"))
                                                drizzleUpdates.artist = updates.artist;
                                            if (Object.prototype.hasOwnProperty.call(updates, "hp"))
                                                drizzleUpdates.hp = updates.hp;
                                            if (Object.prototype.hasOwnProperty.call(updates, "supertype"))
                                                drizzleUpdates.supertype = updates.supertype;
                                            if (Object.prototype.hasOwnProperty.call(updates, "subtypes"))
                                                drizzleUpdates.subtypes = updates.subtypes;
                                            if (Object.prototype.hasOwnProperty.call(updates, "description"))
                                                drizzleUpdates.description = updates.description;
                                            return [4 /*yield*/, db_1.db.update(schema_1.pokemonCards).set(drizzleUpdates).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokemonCards.id, id), (0, drizzle_orm_1.isNull)(schema_1.pokemonCards.deletedAt))).returning()];
                                        case 2:
                                            updated = (_b.sent())[0];
                                            if (!updated) {
                                                res.status(404).json({ error: "Card not found" });
                                                return [2 /*return*/];
                                            }
                                            res.json({ card: updated });
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.get("/api/admin/db/sets", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var page, pageSize, search, trash, offset, deletedFilter, condition, _a, countResult, sets;
                                var _b, _c;
                                return __generator(this, function (_d) {
                                    switch (_d.label) {
                                        case 0: return [4 /*yield*/, isSuperadminSessionOnly(req)];
                                        case 1:
                                            if (!(_d.sent())) {
                                                res.status(403).json({ error: "Forbidden" });
                                                return [2 /*return*/];
                                            }
                                            page = Math.max(1, parseInt(req.query.page || "1", 10));
                                            pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize || "50", 10)));
                                            search = (req.query.search || "").trim();
                                            trash = req.query.trash === "1";
                                            offset = (page - 1) * pageSize;
                                            deletedFilter = trash ? (0, drizzle_orm_1.isNotNull)(schema_1.pokemonSets.deletedAt) : (0, drizzle_orm_1.isNull)(schema_1.pokemonSets.deletedAt);
                                            condition = search
                                                ? (0, drizzle_orm_1.and)(deletedFilter, (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.pokemonSets.name, "%".concat(search, "%")), (0, drizzle_orm_1.ilike)(schema_1.pokemonSets.id, "%".concat(search, "%"))))
                                                : deletedFilter;
                                            return [4 /*yield*/, Promise.all([
                                                    db_1.db.select({ count: (0, drizzle_orm_1.sql)(templateObject_64 || (templateObject_64 = __makeTemplateObject(["count(*)::int"], ["count(*)::int"]))) }).from(schema_1.pokemonSets).where(condition),
                                                    db_1.db.select({
                                                        id: schema_1.pokemonSets.id, name: schema_1.pokemonSets.name, series: schema_1.pokemonSets.series,
                                                        releaseDate: schema_1.pokemonSets.releaseDate, hidden: schema_1.pokemonSets.hidden, total: schema_1.pokemonSets.total,
                                                        deletedAt: schema_1.pokemonSets.deletedAt,
                                                        cardCount: (0, drizzle_orm_1.sql)(templateObject_65 || (templateObject_65 = __makeTemplateObject(["count(", ")::int"], ["count(", ")::int"])), schema_1.pokemonCards.id),
                                                    }).from(schema_1.pokemonSets)
                                                        .leftJoin(schema_1.pokemonCards, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokemonCards.setId, schema_1.pokemonSets.id), (0, drizzle_orm_1.isNull)(schema_1.pokemonCards.deletedAt)))
                                                        .where(condition)
                                                        .groupBy(schema_1.pokemonSets.id)
                                                        .orderBy((0, drizzle_orm_1.desc)(schema_1.pokemonSets.releaseDate))
                                                        .limit(pageSize).offset(offset),
                                                ])];
                                        case 2:
                                            _a = _d.sent(), countResult = _a[0], sets = _a[1];
                                            res.json({ sets: sets, total: (_c = (_b = countResult[0]) === null || _b === void 0 ? void 0 : _b.count) !== null && _c !== void 0 ? _c : 0, page: page, pageSize: pageSize });
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.patch("/api/admin/db/sets/:id", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var id, _a, name, releaseDate, hidden, updates, updated;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0: return [4 /*yield*/, isSuperadminSessionOnly(req)];
                                        case 1:
                                            if (!(_b.sent())) {
                                                res.status(403).json({ error: "Forbidden" });
                                                return [2 /*return*/];
                                            }
                                            id = req.params.id;
                                            _a = req.body, name = _a.name, releaseDate = _a.releaseDate, hidden = _a.hidden;
                                            updates = {};
                                            if (typeof name === "string") {
                                                if (!name.trim()) {
                                                    res.status(400).json({ error: "Set name cannot be empty" });
                                                    return [2 /*return*/];
                                                }
                                                updates.name = name.trim();
                                            }
                                            if (typeof releaseDate === "string")
                                                updates.releaseDate = releaseDate.trim() || null;
                                            if (typeof hidden === "boolean")
                                                updates.hidden = hidden;
                                            if (Object.keys(updates).length === 0) {
                                                res.status(400).json({ error: "No valid fields to update" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.update(schema_1.pokemonSets).set(updates).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokemonSets.id, id), (0, drizzle_orm_1.isNull)(schema_1.pokemonSets.deletedAt))).returning()];
                                        case 2:
                                            updated = (_b.sent())[0];
                                            if (!updated) {
                                                res.status(404).json({ error: "Set not found" });
                                                return [2 /*return*/];
                                            }
                                            res.json({ set: updated });
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.delete("/api/admin/db/cards/:id", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var id, existing;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, isSuperadminSessionOnly(req)];
                                        case 1:
                                            if (!(_a.sent())) {
                                                res.status(403).json({ error: "Forbidden" });
                                                return [2 /*return*/];
                                            }
                                            id = req.params.id;
                                            return [4 /*yield*/, db_1.db.select({ id: schema_1.pokemonCards.id }).from(schema_1.pokemonCards).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokemonCards.id, id), (0, drizzle_orm_1.isNull)(schema_1.pokemonCards.deletedAt))).limit(1)];
                                        case 2:
                                            existing = _a.sent();
                                            if (existing.length === 0) {
                                                res.status(404).json({ error: "Card not found" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.update(schema_1.pokemonCards).set({ deletedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.pokemonCards.id, id))];
                                        case 3:
                                            _a.sent();
                                            res.json({ success: true });
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/admin/db/cards/:id/restore", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var id, existing;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, isSuperadminSessionOnly(req)];
                                        case 1:
                                            if (!(_a.sent())) {
                                                res.status(403).json({ error: "Forbidden" });
                                                return [2 /*return*/];
                                            }
                                            id = req.params.id;
                                            return [4 /*yield*/, db_1.db.select({ id: schema_1.pokemonCards.id }).from(schema_1.pokemonCards).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokemonCards.id, id), (0, drizzle_orm_1.isNotNull)(schema_1.pokemonCards.deletedAt))).limit(1)];
                                        case 2:
                                            existing = _a.sent();
                                            if (existing.length === 0) {
                                                res.status(404).json({ error: "Card not found in trash" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.update(schema_1.pokemonCards).set({ deletedAt: null }).where((0, drizzle_orm_1.eq)(schema_1.pokemonCards.id, id))];
                                        case 3:
                                            _a.sent();
                                            res.json({ success: true });
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.delete("/api/admin/db/sets/:id", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var id, existing, now;
                                var _this = this;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, isSuperadminSessionOnly(req)];
                                        case 1:
                                            if (!(_a.sent())) {
                                                res.status(403).json({ error: "Forbidden" });
                                                return [2 /*return*/];
                                            }
                                            id = req.params.id;
                                            return [4 /*yield*/, db_1.db.select({ id: schema_1.pokemonSets.id }).from(schema_1.pokemonSets).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokemonSets.id, id), (0, drizzle_orm_1.isNull)(schema_1.pokemonSets.deletedAt))).limit(1)];
                                        case 2:
                                            existing = _a.sent();
                                            if (existing.length === 0) {
                                                res.status(404).json({ error: "Set not found" });
                                                return [2 /*return*/];
                                            }
                                            now = new Date();
                                            return [4 /*yield*/, db_1.db.transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                                    return __generator(this, function (_a) {
                                                        switch (_a.label) {
                                                            case 0: return [4 /*yield*/, tx.update(schema_1.pokemonCards).set({ deletedAt: now }).where((0, drizzle_orm_1.eq)(schema_1.pokemonCards.setId, id))];
                                                            case 1:
                                                                _a.sent();
                                                                return [4 /*yield*/, tx.update(schema_1.pokemonSets).set({ deletedAt: now }).where((0, drizzle_orm_1.eq)(schema_1.pokemonSets.id, id))];
                                                            case 2:
                                                                _a.sent();
                                                                return [2 /*return*/];
                                                        }
                                                    });
                                                }); })];
                                        case 3:
                                            _a.sent();
                                            res.json({ success: true });
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                            app.post("/api/admin/db/sets/:id/restore", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var id, existing;
                                var _this = this;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, isSuperadminSessionOnly(req)];
                                        case 1:
                                            if (!(_a.sent())) {
                                                res.status(403).json({ error: "Forbidden" });
                                                return [2 /*return*/];
                                            }
                                            id = req.params.id;
                                            return [4 /*yield*/, db_1.db.select({ id: schema_1.pokemonSets.id }).from(schema_1.pokemonSets).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokemonSets.id, id), (0, drizzle_orm_1.isNotNull)(schema_1.pokemonSets.deletedAt))).limit(1)];
                                        case 2:
                                            existing = _a.sent();
                                            if (existing.length === 0) {
                                                res.status(404).json({ error: "Set not found in trash" });
                                                return [2 /*return*/];
                                            }
                                            return [4 /*yield*/, db_1.db.transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                                    return __generator(this, function (_a) {
                                                        switch (_a.label) {
                                                            case 0: return [4 /*yield*/, tx.update(schema_1.pokemonCards).set({ deletedAt: null }).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokemonCards.setId, id), (0, drizzle_orm_1.isNotNull)(schema_1.pokemonCards.deletedAt)))];
                                                            case 1:
                                                                _a.sent();
                                                                return [4 /*yield*/, tx.update(schema_1.pokemonSets).set({ deletedAt: null }).where((0, drizzle_orm_1.eq)(schema_1.pokemonSets.id, id))];
                                                            case 2:
                                                                _a.sent();
                                                                return [2 /*return*/];
                                                        }
                                                    });
                                                }); })];
                                        case 3:
                                            _a.sent();
                                            res.json({ success: true });
                                            return [2 /*return*/];
                                    }
                                });
                            }); });
                            ADMIN_DB_TABLES_1 = {
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
                                users: { pk: "id", searchCols: ["username"] },
                            };
                            // ─────────────────────────────────────────────────────────────────────────────
                            // TABLE SCHEMA
                            // MARKER: ADMIN_DB_SCHEMA
                            // ─────────────────────────────────────────────────────────────────────────────
                            app.get("/api/admin/db/table/:tableName/schema", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var tableName, result, err_22;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 3, , 4]);
                                            return [4 /*yield*/, isSuperadminSessionOnly(req)];
                                        case 1:
                                            if (!(_a.sent())) {
                                                return [2 /*return*/, res.status(403).json({ error: "Forbidden" })];
                                            }
                                            tableName = req.params.tableName;
                                            if (!ADMIN_DB_TABLES_1[tableName]) {
                                                return [2 /*return*/, res.status(400).json({ error: "Unknown table" })];
                                            }
                                            return [4 /*yield*/, db_1.pool.query("\n                     SELECT column_name, data_type, is_nullable, column_default\n                     FROM information_schema.columns\n                     WHERE table_name = $1\n                     AND table_schema = 'public'\n                     ORDER BY ordinal_position\n                     ", [tableName])];
                                        case 2:
                                            result = _a.sent();
                                            return [2 /*return*/, res.json({
                                                    columns: result.rows,
                                                    pk: ADMIN_DB_TABLES_1[tableName].pk,
                                                })];
                                        case 3:
                                            err_22 = _a.sent();
                                            console.error("[ADMIN_DB_SCHEMA]", err_22);
                                            return [2 /*return*/, res.status(500).json({ error: "Internal server error" })];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─────────────────────────────────────────────────────────────────────────────
                            // TABLE DATA
                            // MARKER: ADMIN_DB_TABLE_DATA
                            // ─────────────────────────────────────────────────────────────────────────────
                            app.get("/api/admin/db/table/:tableName", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var tableName, tbl, page_6, pageSize_3, search_1, offset_5, values, whereClause, conditions, countResult, dataResult, err_23;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 4, , 5]);
                                            return [4 /*yield*/, isSuperadminSessionOnly(req)];
                                        case 1:
                                            if (!(_a.sent())) {
                                                return [2 /*return*/, res.status(403).json({ error: "Forbidden" })];
                                            }
                                            tableName = req.params.tableName;
                                            tbl = ADMIN_DB_TABLES_1[tableName];
                                            if (!tbl) {
                                                return [2 /*return*/, res.status(400).json({ error: "Unknown table" })];
                                            }
                                            page_6 = Math.max(1, parseInt(req.query.page || "1", 10));
                                            pageSize_3 = Math.min(100, Math.max(1, parseInt(req.query.pageSize || "50", 10)));
                                            search_1 = (req.query.search || "").trim();
                                            offset_5 = (page_6 - 1) * pageSize_3;
                                            values = [];
                                            whereClause = "";
                                            if (search_1 && tbl.searchCols.length > 0) {
                                                conditions = tbl.searchCols.map(function (col, i) { return "\"".concat(col, "\"::text ILIKE $").concat(i + 1); });
                                                whereClause = "WHERE (".concat(conditions.join(" OR "), ")");
                                                values.push.apply(values, tbl.searchCols.map(function () { return "%".concat(search_1, "%"); }));
                                            }
                                            return [4 /*yield*/, db_1.pool.query("SELECT COUNT(*) as count FROM \"".concat(tableName, "\" ").concat(whereClause), values)];
                                        case 2:
                                            countResult = _a.sent();
                                            return [4 /*yield*/, db_1.pool.query("\n                     SELECT *\n                     FROM \"".concat(tableName, "\"\n                     ").concat(whereClause, "\n                     ORDER BY \"").concat(tbl.pk, "\" DESC\n                     LIMIT $").concat(values.length + 1, "\n                     OFFSET $").concat(values.length + 2, "\n                     "), __spreadArray(__spreadArray([], values, true), [pageSize_3, offset_5], false))];
                                        case 3:
                                            dataResult = _a.sent();
                                            return [2 /*return*/, res.json({
                                                    rows: dataResult.rows,
                                                    total: parseInt(countResult.rows[0].count, 10),
                                                    page: page_6,
                                                    pageSize: pageSize_3,
                                                })];
                                        case 4:
                                            err_23 = _a.sent();
                                            console.error("[ADMIN_DB_TABLE]", err_23);
                                            return [2 /*return*/, res.status(500).json({ error: "Internal server error" })];
                                        case 5: return [2 /*return*/];
                                    }
                                });
                            }); });
                            // ─────────────────────────────────────────────────────────────────────────────
                            // TABLE LIST
                            // MARKER: ADMIN_DB_TABLES_LIST
                            // ─────────────────────────────────────────────────────────────────────────────
                            app.get("/api/admin/db/tables", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                                var tables, err_24;
                                var _this = this;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            _a.trys.push([0, 3, , 4]);
                                            return [4 /*yield*/, isSuperadminSessionOnly(req)];
                                        case 1:
                                            if (!(_a.sent())) {
                                                return [2 /*return*/, res.status(403).json({ error: "Forbidden" })];
                                            }
                                            return [4 /*yield*/, Promise.all(Object.keys(ADMIN_DB_TABLES_1).map(function (t) { return __awaiter(_this, void 0, void 0, function () {
                                                    var r;
                                                    return __generator(this, function (_a) {
                                                        switch (_a.label) {
                                                            case 0: return [4 /*yield*/, db_1.pool.query("SELECT COUNT(*) as count FROM \"".concat(t, "\""))];
                                                            case 1:
                                                                r = _a.sent();
                                                                return [2 /*return*/, {
                                                                        name: t,
                                                                        rowCount: parseInt(r.rows[0].count, 10),
                                                                    }];
                                                        }
                                                    });
                                                }); }))];
                                        case 2:
                                            tables = _a.sent();
                                            return [2 /*return*/, res.json({ tables: tables })];
                                        case 3:
                                            err_24 = _a.sent();
                                            console.error("[ADMIN_DB_TABLES]", err_24);
                                            return [2 /*return*/, res.status(500).json({ error: "Internal server error" })];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                            httpServer = (0, node_http_1.createServer)(app);
                            // ─────────────────────────────────────────────────────────────────────────────
                            // RESYNC PROGRESS
                            // MARKER: RESYNC_PROGRESS
                            // ─────────────────────────────────────────────────────────────────────────────
                            app.get("/api/admin/resync-progress", function (_req, res) {
                                return res.json(resyncState);
                            });
                            // ─────────────────────────────────────────────────────────────────────────────
                            // FULL RESYNC
                            // MARKER: FULL_RESYNC
                            // ─────────────────────────────────────────────────────────────────────────────
                            app.post("/api/admin/full-resync", function (_req, res) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    try {
                                        if (resyncState.running) {
                                            return [2 /*return*/, res.status(409).json({
                                                    success: false,
                                                    error: "Resync already running",
                                                })];
                                        }
                                        resyncState = {
                                            running: true,
                                            progress: null,
                                            error: null,
                                            startedAt: new Date(),
                                            finishedAt: null,
                                        };
                                        res.json({
                                            success: true,
                                            message: "Full resync started",
                                        });
                                        void (0, full_resync_1.runFullResync)(function (p) {
                                            resyncState.progress = p;
                                        })
                                            .then(function () {
                                            resyncState.running = false;
                                            resyncState.finishedAt = new Date();
                                        })
                                            .catch(function (err) {
                                            console.error("[FullResync] failed:", err);
                                            resyncState.running = false;
                                            resyncState.error = (err === null || err === void 0 ? void 0 : err.message) || "Full resync failed";
                                            resyncState.finishedAt = new Date();
                                        });
                                    }
                                    catch (err) {
                                        console.error("[FULL_RESYNC_ROUTE]", err);
                                        return [2 /*return*/, res.status(500).json({
                                                success: false,
                                                error: "Internal server error",
                                            })];
                                    }
                                    return [2 /*return*/];
                                });
                            }); });
                            return [2 /*return*/, httpServer];
                        case 10: return [7 /*endfinally*/];
                        case 11: return [2 /*return*/];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
var templateObject_1, templateObject_2, templateObject_3, templateObject_4, templateObject_5, templateObject_6, templateObject_7, templateObject_8, templateObject_9, templateObject_10, templateObject_11, templateObject_12, templateObject_13, templateObject_14, templateObject_15, templateObject_16, templateObject_17, templateObject_18, templateObject_19, templateObject_20, templateObject_21, templateObject_22, templateObject_23, templateObject_24, templateObject_25, templateObject_26, templateObject_27, templateObject_28, templateObject_29, templateObject_30, templateObject_31, templateObject_32, templateObject_33, templateObject_34, templateObject_35, templateObject_36, templateObject_37, templateObject_38, templateObject_39, templateObject_40, templateObject_41, templateObject_42, templateObject_43, templateObject_44, templateObject_45, templateObject_46, templateObject_47, templateObject_48, templateObject_49, templateObject_50, templateObject_51, templateObject_52, templateObject_53, templateObject_54, templateObject_55, templateObject_56, templateObject_57, templateObject_58, templateObject_59, templateObject_60, templateObject_61, templateObject_62, templateObject_63, templateObject_64, templateObject_65;
