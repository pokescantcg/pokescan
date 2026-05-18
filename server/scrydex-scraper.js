"use strict";
/**
 * Scrydex Scraper — https://scrydex.com
 *
 * Scrapes Pokémon set and card data from scrydex.com and uses it to:
 *   1. Add sets that are not yet in the database (e.g. TCG Pocket, some Chinese sets)
 *   2. Add missing cards within existing sets
 *   3. Fill in missing image URLs for cards that have none
 *
 * IMPORTANT: This scraper is NOT triggered automatically on startup.
 * It must be invoked explicitly via POST /api/admin/scrydex-sync.
 *
 * Deduplication rules:
 *   - Sets:  skip if pokemon_sets.id already exists
 *   - Cards: skip if pokemon_cards.id already exists AND image_small is populated
 *            update image_small/image_large if the card exists but images are null
 */
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
exports.scrapeScrydexSets = scrapeScrydexSets;
exports.scrapeScrydexTcgPocketSets = scrapeScrydexTcgPocketSets;
exports.scrapeScrydexJpSets = scrapeScrydexJpSets;
exports.scrapeScrydexSetDetail = scrapeScrydexSetDetail;
exports.scrapeScrydexSetCards = scrapeScrydexSetCards;
exports.runScrydexSync = runScrydexSync;
var db_1 = require("./db");
var schema_1 = require("@shared/schema");
var drizzle_orm_1 = require("drizzle-orm");
var card_normalizers_1 = require("./utils/card-normalizers");
var BASE_URL = "https://scrydex.com";
var IMAGE_BASE = "https://images.scrydex.com/pokemon";
var DELAY_MS = 150; // polite delay between page requests
// ─── Internal helpers ─────────────────────────────────────────────────────────
function delay(ms) {
    return new Promise(function (r) { return setTimeout(r, ms); });
}
function fetchPage(path) {
    return __awaiter(this, void 0, void 0, function () {
        var url, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = path.startsWith("http") ? path : "".concat(BASE_URL).concat(path);
                    return [4 /*yield*/, fetch(url, {
                            headers: {
                                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                            },
                            signal: AbortSignal.timeout(20000),
                        })];
                case 1:
                    res = _a.sent();
                    if (!res.ok)
                        throw new Error("HTTP ".concat(res.status, " fetching ").concat(url));
                    return [2 /*return*/, res.text()];
            }
        });
    });
}
function htmlDecode(str) {
    return str
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ");
}
/** Convert a URL slug like "ethans-pinsir" into "Ethan's Pinsir" */
function slugToName(slug) {
    return slug
        .split("-")
        .map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); })
        .join(" ");
}
// ─── Parse sets from /pokemon/expansions ─────────────────────────────────────
function scrapeScrydexSets() {
    return __awaiter(this, void 0, void 0, function () {
        var html;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchPage("/pokemon/expansions")];
                case 1:
                    html = _a.sent();
                    return [2 /*return*/, parseSetsFromHtml(html)];
            }
        });
    });
}
function scrapeScrydexTcgPocketSets() {
    return __awaiter(this, void 0, void 0, function () {
        var html;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchPage("/pokemon/tcg-pocket/expansions")];
                case 1:
                    html = _a.sent();
                    return [2 /*return*/, parseSetsFromHtml(html)];
            }
        });
    });
}
/** Fetches all Japanese expansion sets from the Scrydex JP page */
function scrapeScrydexJpSets() {
    return __awaiter(this, void 0, void 0, function () {
        var html;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchPage("/pokemon/jp/expansions")];
                case 1:
                    html = _a.sent();
                    return [2 /*return*/, parseSetsFromHtml(html)];
            }
        });
    });
}
function parseSetsFromHtml(html) {
    var sets = [];
    var seen = new Set();
    // Each expansion link: /pokemon/expansions/{slug}/{setId}
    var linkRe = /href="\/pokemon\/expansions\/([^"/]+)\/([^"/?\s]+)"/g;
    var m;
    while ((m = linkRe.exec(html)) !== null) {
        var slug = m[1];
        var id = m[2];
        if (seen.has(id))
            continue;
        seen.add(id);
        // Find the block around this link to extract set data
        var start = m.index;
        var block = html.substring(start, start + 2000);
        // Set name — look for the h1 or strong with the set name near this link
        // The name appears in the link's aria-label or nearby text
        // We'll parse it from the expansion detail page later if needed
        // For now, convert slug to title case
        var name_1 = slugToName(slug);
        // Series — infer from set ID prefix (same logic as PCV scraper)
        var series = inferSeries(id);
        // Release date from nearby text
        var dateM = block.match(/(\d{4}\/\d{2}\/\d{2}|\d{4}-\d{2}-\d{2})/);
        var releaseDate = dateM ? dateM[1].replace(/\//g, "-") : "";
        // Card count
        var countM = block.match(/(\d+)\s*cards?/i);
        var total = countM ? parseInt(countM[1], 10) : 0;
        // Logo and symbol
        var logoUrl = "".concat(IMAGE_BASE, "/").concat(id, "-logo/logo");
        var symbolUrl = "".concat(IMAGE_BASE, "/").concat(id, "-symbol/symbol");
        sets.push({ id: id, slug: slug, name: name_1, series: series, releaseDate: releaseDate, total: total, logoUrl: logoUrl, symbolUrl: symbolUrl });
    }
    return sets;
}
/** Fetches an individual expansion page to get accurate name, series, date, total */
function scrapeScrydexSetDetail(slug, id) {
    return __awaiter(this, void 0, void 0, function () {
        var html, nameM, name, seriesM, series, total, dateM, releaseDate, logoUrl, symbolUrl;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchPage("/pokemon/expansions/".concat(slug, "/").concat(id))];
                case 1:
                    html = _a.sent();
                    nameM = html.match(/<h1[^>]*class="[^"]*text-heading-32[^"]*"[^>]*>([^<]+)<\/h1>/);
                    name = nameM ? htmlDecode(nameM[1].trim()) : slugToName(slug);
                    seriesM = html.match(/<span[^>]*text-heading-16[^>]*>([^<]+)<\/span>[^<]*<span[^>]*text-mono-2[^>]*>[^<]*<\/span>[^<]*<span[^>]*text-heading-16[^>]*>(\d+)\s*cards?<\/span>/);
                    series = seriesM ? htmlDecode(seriesM[1].trim()) : inferSeries(id);
                    total = seriesM ? parseInt(seriesM[2], 10) : 0;
                    dateM = html.match(/(\d{4}\/\d{2}\/\d{2})/);
                    releaseDate = dateM ? dateM[1].replace(/\//g, "-") : "";
                    logoUrl = "".concat(IMAGE_BASE, "/").concat(id, "-logo/logo");
                    symbolUrl = "".concat(IMAGE_BASE, "/").concat(id, "-symbol/symbol");
                    return [2 /*return*/, { id: id, slug: slug, name: name, series: series, releaseDate: releaseDate, total: total, logoUrl: logoUrl, symbolUrl: symbolUrl }];
            }
        });
    });
}
// ─── Parse cards from a set's expansion page ──────────────────────────────────
function scrapeScrydexSetCards(slug, setId) {
    return __awaiter(this, void 0, void 0, function () {
        var html;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetchPage("/pokemon/expansions/".concat(slug, "/").concat(setId))];
                case 1:
                    html = _a.sent();
                    return [2 /*return*/, parseCardsFromSetHtml(html, setId)];
            }
        });
    });
}
function parseCardsFromSetHtml(html, setId) {
    var cards = [];
    var seen = new Set();
    var linkRe = /href="\/pokemon\/cards\/([^/]+)\/([^?"]+)\?variant=([^"]+)"/g;
    var m;
    while ((m = linkRe.exec(html)) !== null) {
        var cardSlug = m[1];
        var cardId = m[2];
        var rawVariant = m[3] || "normal";
        // Prevent cross-set pollution
        if (!cardId.startsWith("".concat(setId, "-"))) {
            continue;
        }
        // Normalize variant metadata
        var finishType = (0, card_normalizers_1.normalizeFinishType)(rawVariant);
        var editionType = (0, card_normalizers_1.normalizeEdition)(rawVariant);
        var language = setId.includes("_ja")
            ? "japanese"
            : setId.includes("_ko")
                ? "korean"
                : setId.includes("_zh")
                    ? "chinese"
                    : "english";
        var variantId = (0, card_normalizers_1.createVariantId)(cardId, finishType, editionType, language);
        var uniqueKey = "".concat(cardId, ":").concat(variantId);
        // Skip duplicate variants
        if (seen.has(uniqueKey)) {
            continue;
        }
        seen.add(uniqueKey);
        // Local HTML chunk
        var block = html.substring(m.index, m.index + 1500);
        // ─────────────────────────────────────────────────────────
        // Images
        // ─────────────────────────────────────────────────────────
        var imgM = block.match(/src="(https:\/\/images\.scrydex\.com\/pokemon\/[^"]+\/medium)"/);
        var imageSmall = imgM
            ? imgM[1]
            : "".concat(IMAGE_BASE, "/").concat(cardId, "/medium");
        var imageLarge = imageSmall.replace("/medium", "/large");
        // ─────────────────────────────────────────────────────────
        // Name + number
        // ─────────────────────────────────────────────────────────
        var name_2 = htmlDecode(slugToName(cardSlug));
        var number = cardId.replace("".concat(setId, "-"), "");
        var nameM = block.match(/class="[^"]*text-body-12[^"]*text-white[^"]*"[^>]*>([^<]+)<\/span>/);
        if (nameM) {
            var raw = htmlDecode(nameM[1].trim());
            var numMatch = raw.match(/^(.+?)\s*#(\S+)$/);
            if (numMatch) {
                name_2 = numMatch[1].trim();
                number = numMatch[2];
            }
            else {
                name_2 = raw;
            }
        }
        // ─────────────────────────────────────────────────────────
        // Price
        // ─────────────────────────────────────────────────────────
        var priceM = block.match(/\$(\d+\.\d+)/);
        var priceUsd = priceM
            ? parseFloat(priceM[1])
            : null;
        // ─────────────────────────────────────────────────────────
        // Push card
        // ─────────────────────────────────────────────────────────
        cards.push({
            id: cardId,
            setId: setId,
            name: name_2,
            number: number,
            finishType: finishType,
            editionType: editionType,
            language: language,
            variantId: variantId,
            imageSmall: imageSmall,
            imageLarge: imageLarge,
            priceUsd: priceUsd,
        });
    }
    return cards;
}
// ─── Series inference (mirrors PCV scraper logic) ─────────────────────────────
function inferSeries(id) {
    var lower = id.toLowerCase();
    // Language-specific suffixes take priority
    if (lower.includes("_ja"))
        return "Japanese";
    if (lower.includes("_ko"))
        return "Korean";
    if (lower.includes("_zh") || lower.includes("_cn"))
        return "Chinese";
    if (lower.startsWith("tcgp"))
        return "TCG Pocket";
    if (lower.startsWith("sv"))
        return "Scarlet & Violet";
    if (lower.startsWith("swsh"))
        return "Sword & Shield";
    if (lower.startsWith("sm"))
        return "Sun & Moon";
    if (lower.startsWith("xy"))
        return "XY";
    if (lower.startsWith("bw"))
        return "Black & White";
    if (/^me\d/.test(lower))
        return "Mega Evolution";
    if (lower.startsWith("rsv") || lower.startsWith("zsv"))
        return "Scarlet & Violet";
    if (lower.startsWith("me"))
        return "Mega Evolution";
    if (lower.startsWith("neo"))
        return "Neo";
    if (lower.startsWith("ecard"))
        return "E-Card";
    if (lower.startsWith("ex"))
        return "EX";
    if (lower.startsWith("dp"))
        return "Diamond & Pearl";
    if (lower.startsWith("pl"))
        return "Platinum";
    if (lower.startsWith("hgss"))
        return "HeartGold & SoulSilver";
    if (lower.startsWith("col"))
        return "Call of Legends";
    if (lower.startsWith("gym"))
        return "Gym";
    if (lower.startsWith("base"))
        return "Base";
    if (lower.startsWith("pop"))
        return "POP Series";
    if (lower.startsWith("wc"))
        return "World Championships";
    if (lower.startsWith("np"))
        return "Neo";
    if (lower.startsWith("cel"))
        return "Sword & Shield";
    return "Other";
}
// ─── Main sync function ───────────────────────────────────────────────────────
/**
 * Runs the full Scrydex sync.
 *
 * For each set on scrydex.com:
 *   - If the set is NOT in pokemon_sets → insert it
 *   - Then fetch all cards for that set from scrydex
 *     - If a card is NOT in pokemon_cards → insert it
 *     - If a card IS in pokemon_cards but image_small is NULL → update images
 *
 * onProgress is called with status updates throughout the run.
 */
function runScrydexSync(onProgress) {
    return __awaiter(this, void 0, void 0, function () {
        var progress, report, _a, enSets, pocketSets, jpSets, allSetsMap, _i, _b, s, allSets, existingSetRows, existingSetIds, setsWithCards, _c, existingSetRows_1, row, setsToProcess, _d, setsToProcess_1, set, setId, detail, err_1, cards, cardIds, existingCardsRes, existingCards, _e, cards_1, card, convertedValue, err_2, convertedValue, err_3, err_4, existingImg, err_5, err_6, err_7, err_8;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    progress = {
                        phase: "sets",
                        setsProcessed: 0,
                        setsTotal: 0,
                        setsAdded: 0,
                        cardsProcessed: 0,
                        cardsAdded: 0,
                        cardsUpdated: 0,
                    };
                    report = function (patch) {
                        Object.assign(progress, patch);
                        onProgress === null || onProgress === void 0 ? void 0 : onProgress(progress);
                    };
                    _f.label = 1;
                case 1:
                    _f.trys.push([1, 39, , 40]);
                    // ── Phase 1: Fetch all sets from Scrydex ──────────────────────────────
                    report({ phase: "sets", message: "Fetching set list from scrydex.com..." });
                    return [4 /*yield*/, Promise.all([
                            scrapeScrydexSets(),
                            scrapeScrydexTcgPocketSets(),
                            scrapeScrydexJpSets(),
                        ])];
                case 2:
                    _a = _f.sent(), enSets = _a[0], pocketSets = _a[1], jpSets = _a[2];
                    allSetsMap = new Map();
                    for (_i = 0, _b = __spreadArray(__spreadArray(__spreadArray([], enSets, true), pocketSets, true), jpSets, true); _i < _b.length; _i++) {
                        s = _b[_i];
                        if (!allSetsMap.has(s.id))
                            allSetsMap.set(s.id, s);
                    }
                    allSets = __spreadArray([], allSetsMap.values(), true);
                    report({ setsTotal: allSets.length, message: "Found ".concat(allSets.length, " sets on scrydex.com (EN + TCG Pocket + JP)") });
                    return [4 /*yield*/, db_1.db
                            .select({ id: schema_1.pokemonSets.id, cardCount: (0, drizzle_orm_1.count)(schema_1.pokemonCards.id) })
                            .from(schema_1.pokemonSets)
                            .leftJoin(schema_1.pokemonCards, (0, drizzle_orm_1.eq)(schema_1.pokemonCards.setId, schema_1.pokemonSets.id))
                            .groupBy(schema_1.pokemonSets.id)];
                case 3:
                    existingSetRows = _f.sent();
                    existingSetIds = new Set();
                    setsWithCards = new Set();
                    for (_c = 0, existingSetRows_1 = existingSetRows; _c < existingSetRows_1.length; _c++) {
                        row = existingSetRows_1[_c];
                        existingSetIds.add(row.id);
                        if (row.cardCount > 0)
                            setsWithCards.add(row.id);
                    }
                    setsToProcess = allSets;
                    report({
                        setsTotal: setsToProcess.length,
                        message: "Found ".concat(allSets.length, " sets on Scrydex \u2014 ").concat(setsToProcess.length, " need processing (new or empty)."),
                    });
                    // ── Phase 3: Process each set ─────────────────────────────────────────
                    report({ phase: "cards" });
                    _d = 0, setsToProcess_1 = setsToProcess;
                    _f.label = 4;
                case 4:
                    if (!(_d < setsToProcess_1.length)) return [3 /*break*/, 35];
                    set = setsToProcess_1[_d];
                    report({ currentSet: set.name, setsProcessed: progress.setsProcessed });
                    setId = set.id;
                    if (!!existingSetIds.has(setId)) return [3 /*break*/, 10];
                    _f.label = 5;
                case 5:
                    _f.trys.push([5, 9, , 10]);
                    return [4 /*yield*/, delay(DELAY_MS)];
                case 6:
                    _f.sent();
                    return [4 /*yield*/, scrapeScrydexSetDetail(set.slug, set.id)];
                case 7:
                    detail = _f.sent();
                    return [4 /*yield*/, db_1.db.insert(schema_1.pokemonSets).values({
                            id: detail.id,
                            name: detail.name,
                            series: detail.series,
                            printedTotal: detail.total,
                            total: detail.total,
                            releaseDate: detail.releaseDate || null,
                            logoUrl: detail.logoUrl,
                            symbolUrl: detail.symbolUrl,
                            imageUrl: detail.logoUrl,
                        }).onConflictDoNothing()];
                case 8:
                    _f.sent();
                    existingSetIds.add(setId);
                    report({ setsAdded: progress.setsAdded + 1 });
                    return [3 /*break*/, 10];
                case 9:
                    err_1 = _f.sent();
                    console.error("[Scrydex] Failed to insert set ".concat(setId, ":"), err_1.message);
                    return [3 /*break*/, 10];
                case 10:
                    _f.trys.push([10, 33, , 34]);
                    return [4 /*yield*/, delay(DELAY_MS)];
                case 11:
                    _f.sent();
                    return [4 /*yield*/, scrapeScrydexSetCards(set.slug, setId)];
                case 12:
                    cards = _f.sent();
                    if (cards.length === 0) {
                        report({ setsProcessed: progress.setsProcessed + 1 });
                        return [3 /*break*/, 34];
                    }
                    cardIds = cards.map(function (c) { return c.id; });
                    return [4 /*yield*/, db_1.db
                            .select({ id: schema_1.pokemonCards.id, imageSmall: schema_1.pokemonCards.imageSmall })
                            .from(schema_1.pokemonCards)
                            .where((0, drizzle_orm_1.inArray)(schema_1.pokemonCards.id, cardIds))];
                case 13:
                    existingCardsRes = _f.sent();
                    existingCards = new Map(existingCardsRes.map(function (r) { return [r.id, r.imageSmall]; }));
                    _e = 0, cards_1 = cards;
                    _f.label = 14;
                case 14:
                    if (!(_e < cards_1.length)) return [3 /*break*/, 32];
                    card = cards_1[_e];
                    if (!(card.priceUsd !== null)) return [3 /*break*/, 18];
                    convertedValue = Math.round(card.priceUsd * 0.79 * 100) / 100;
                    _f.label = 15;
                case 15:
                    _f.trys.push([15, 17, , 18]);
                    return [4 /*yield*/, db_1.db.insert(schema_1.cardPricing)
                            .values({
                            variantId: card.variantId,
                            priceGBP: convertedValue,
                            updatedAt: new Date(),
                        })
                            .onConflictDoNothing()];
                case 16:
                    _f.sent();
                    return [3 /*break*/, 18];
                case 17:
                    err_2 = _f.sent();
                    console.error("[Scrydex] Failed pricing sync for ".concat(card.id), err_2);
                    return [3 /*break*/, 18];
                case 18:
                    progress.cardsProcessed++;
                    if (!!existingCards.has(card.id)) return [3 /*break*/, 27];
                    // New card — insert if its set is in the DB
                    if (!existingSetIds.has(setId))
                        return [3 /*break*/, 31];
                    _f.label = 19;
                case 19:
                    _f.trys.push([19, 25, , 26]);
                    return [4 /*yield*/, db_1.db.insert(schema_1.pokemonCards).values({
                            id: card.id,
                            setId: card.setId,
                            name: card.name,
                            number: card.number,
                            imageSmall: card.imageSmall,
                            imageLarge: card.imageLarge,
                        }).onConflictDoNothing()];
                case 20:
                    _f.sent();
                    if (!(card.priceUsd !== null)) return [3 /*break*/, 24];
                    convertedValue = Math.round(card.priceUsd * 0.79 * 100) / 100;
                    _f.label = 21;
                case 21:
                    _f.trys.push([21, 23, , 24]);
                    return [4 /*yield*/, db_1.db.insert(schema_1.cardPricing)
                            .values({
                            variantId: card.variantId,
                            priceGBP: convertedValue,
                            updatedAt: new Date(),
                        })
                            .onConflictDoNothing()];
                case 22:
                    _f.sent();
                    return [3 /*break*/, 24];
                case 23:
                    err_3 = _f.sent();
                    console.error("[Scrydex] Price insert failed for ".concat(card.id), err_3);
                    return [3 /*break*/, 24];
                case 24:
                    progress.cardsAdded++;
                    return [3 /*break*/, 26];
                case 25:
                    err_4 = _f.sent();
                    return [3 /*break*/, 26];
                case 26: return [3 /*break*/, 31];
                case 27:
                    existingImg = existingCards.get(card.id);
                    if (!(!existingImg || existingImg === "")) return [3 /*break*/, 31];
                    _f.label = 28;
                case 28:
                    _f.trys.push([28, 30, , 31]);
                    return [4 /*yield*/, db_1.db.update(schema_1.pokemonCards)
                            .set({ imageSmall: card.imageSmall, imageLarge: card.imageLarge })
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.pokemonCards.id, card.id), (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_1.pokemonCards.imageSmall), (0, drizzle_orm_1.eq)(schema_1.pokemonCards.imageSmall, ""))))];
                case 29:
                    _f.sent();
                    progress.cardsUpdated++;
                    return [3 /*break*/, 31];
                case 30:
                    err_5 = _f.sent();
                    return [3 /*break*/, 31];
                case 31:
                    _e++;
                    return [3 /*break*/, 14];
                case 32:
                    report({ setsProcessed: progress.setsProcessed + 1 });
                    return [3 /*break*/, 34];
                case 33:
                    err_6 = _f.sent();
                    console.error("[Scrydex] Failed to process cards for ".concat(setId, ":"), err_6.message);
                    report({ setsProcessed: progress.setsProcessed + 1 });
                    return [3 /*break*/, 34];
                case 34:
                    _d++;
                    return [3 /*break*/, 4];
                case 35:
                    _f.trys.push([35, 37, , 38]);
                    return [4 /*yield*/, db_1.db.insert(schema_1.pokemonCardVariants)
                            .values({
                            id: "".concat(card.id, "-holo"),
                            cardId: card.id,
                            finishType: card.finishType,
                            editionType: card.editionType,
                            language: card.language,
                            imageUrl: card.imageLarge,
                            variantLabel: "".concat(card.finishType, " ").concat(card.editionType),
                        })
                            .onConflictDoNothing()];
                case 36:
                    _f.sent();
                    return [3 /*break*/, 38];
                case 37:
                    err_7 = _f.sent();
                    console.error("Variant insert failed", err_7);
                    return [3 /*break*/, 38];
                case 38:
                    report({
                        phase: "done",
                        message: "Sync complete. ".concat(progress.setsAdded, " sets added, ").concat(progress.cardsAdded, " cards added, ").concat(progress.cardsUpdated, " card images updated."),
                    });
                    return [3 /*break*/, 40];
                case 39:
                    err_8 = _f.sent();
                    report({ phase: "error", message: err_8.message || "Sync failed" });
                    return [3 /*break*/, 40];
                case 40: return [2 /*return*/, progress];
            }
        });
    });
}
