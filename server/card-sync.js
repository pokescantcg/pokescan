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
exports.runFullSync = runFullSync;
exports.runPriceRefresh = runPriceRefresh;
exports.startSyncService = startSyncService;
exports.getSyncStatus = getSyncStatus;
var db_1 = require("./db");
var schema_1 = require("@shared/schema");
var drizzle_orm_1 = require("drizzle-orm");
var pokecardvalues_scraper_1 = require("./pokecardvalues-scraper");
var cheerio = require("cheerio");
var POKEMON_API = "https://api.pokemontcg.io/v2";
var PRICE_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
var EBAY_THROTTLE_MS = 2000;
var GBP_THROTTLE_MS = 1000;
var TCG_REQUEST_DELAY_MS = 200;
var syncRunning = false;
var priceRefreshTimer = null;
var SYNC_STATUS_ID = 1;
function getOrCreateSyncStatus() {
    return __awaiter(this, void 0, void 0, function () {
        var rows, inserted, refetched;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db_1.db.select().from(schema_1.syncStatus).where((0, drizzle_orm_1.eq)(schema_1.syncStatus.id, SYNC_STATUS_ID)).limit(1)];
                case 1:
                    rows = _a.sent();
                    if (!(rows.length === 0)) return [3 /*break*/, 4];
                    return [4 /*yield*/, db_1.db
                            .insert(schema_1.syncStatus)
                            .values({ id: SYNC_STATUS_ID, totalSets: 0, syncedSets: 0, totalCards: 0, syncedCards: 0, isRunning: false })
                            .onConflictDoNothing()
                            .returning()];
                case 2:
                    inserted = _a.sent();
                    if (inserted.length > 0)
                        return [2 /*return*/, inserted[0]];
                    return [4 /*yield*/, db_1.db.select().from(schema_1.syncStatus).where((0, drizzle_orm_1.eq)(schema_1.syncStatus.id, SYNC_STATUS_ID)).limit(1)];
                case 3:
                    refetched = _a.sent();
                    return [2 /*return*/, refetched[0]];
                case 4: return [2 /*return*/, rows[0]];
            }
        });
    });
}
function updateSyncStatus(patch) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db_1.db
                        .insert(schema_1.syncStatus)
                        .values(__assign({ id: SYNC_STATUS_ID }, patch))
                        .onConflictDoUpdate({
                        target: schema_1.syncStatus.id,
                        set: __assign(__assign({}, patch), { updatedAt: new Date() }),
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function buildTcgHeaders() {
    var headers = { "User-Agent": "PokeScanTCG/1.0" };
    var key = process.env.POKEMON_TCG_API_KEY;
    if (key)
        headers["X-Api-Key"] = key;
    return headers;
}
function fetchJson(url_1) {
    return __awaiter(this, arguments, void 0, function (url, retries) {
        var _loop_1, attempt, state_1;
        var _a;
        if (retries === void 0) { retries = 2; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _loop_1 = function (attempt) {
                        var controller, timer, res, err_1;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    controller = new AbortController();
                                    timer = setTimeout(function () { return controller.abort(); }, 20000);
                                    _c.label = 1;
                                case 1:
                                    _c.trys.push([1, 6, , 9]);
                                    return [4 /*yield*/, fetch(url, { headers: buildTcgHeaders(), signal: controller.signal })];
                                case 2:
                                    res = _c.sent();
                                    clearTimeout(timer);
                                    if (!(res.status === 429 || res.status === 503 || res.status === 504)) return [3 /*break*/, 5];
                                    if (!(attempt < retries)) return [3 /*break*/, 4];
                                    return [4 /*yield*/, sleep(10000 * (attempt + 1))];
                                case 3:
                                    _c.sent();
                                    return [2 /*return*/, "continue"];
                                case 4: throw new Error("HTTP ".concat(res.status, " for ").concat(url));
                                case 5:
                                    if (!res.ok)
                                        throw new Error("HTTP ".concat(res.status, " for ").concat(url));
                                    return [2 /*return*/, { value: res.json() }];
                                case 6:
                                    err_1 = _c.sent();
                                    clearTimeout(timer);
                                    if (!(attempt < retries && (err_1.name === "AbortError" || ((_a = err_1.message) === null || _a === void 0 ? void 0 : _a.includes("fetch"))))) return [3 /*break*/, 8];
                                    return [4 /*yield*/, sleep(5000 * (attempt + 1))];
                                case 7:
                                    _c.sent();
                                    return [2 /*return*/, "continue"];
                                case 8: throw err_1;
                                case 9: return [2 /*return*/];
                            }
                        });
                    };
                    attempt = 0;
                    _b.label = 1;
                case 1:
                    if (!(attempt <= retries)) return [3 /*break*/, 4];
                    return [5 /*yield**/, _loop_1(attempt)];
                case 2:
                    state_1 = _b.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    _b.label = 3;
                case 3:
                    attempt++;
                    return [3 /*break*/, 1];
                case 4: throw new Error("fetchJson exhausted retries for ".concat(url));
            }
        });
    });
}
function sleep(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
function syncAllSets() {
    return __awaiter(this, void 0, void 0, function () {
        var responseData, sets, _i, sets_1, set, err_2;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
        return __generator(this, function (_x) {
            switch (_x.label) {
                case 0:
                    console.log("[CardSync] Fetching all sets from Pokemon TCG API...");
                    return [4 /*yield*/, fetchJson("".concat(POKEMON_API, "/sets?orderBy=-releaseDate&pageSize=250"))];
                case 1:
                    responseData = _x.sent();
                    sets = (_a = responseData.data) !== null && _a !== void 0 ? _a : [];
                    console.log("[CardSync] Got ".concat(sets.length, " sets."));
                    return [4 /*yield*/, updateSyncStatus({ totalSets: sets.length })];
                case 2:
                    _x.sent();
                    _i = 0, sets_1 = sets;
                    _x.label = 3;
                case 3:
                    if (!(_i < sets_1.length)) return [3 /*break*/, 9];
                    set = sets_1[_i];
                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 10); })];
                case 4:
                    _x.sent();
                    _x.label = 5;
                case 5:
                    _x.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, db_1.db
                            .insert(schema_1.pokemonSets)
                            .values({
                            id: set.id,
                            name: set.name,
                            series: (_b = set.series) !== null && _b !== void 0 ? _b : "",
                            printedTotal: (_c = set.printedTotal) !== null && _c !== void 0 ? _c : null,
                            total: (_d = set.total) !== null && _d !== void 0 ? _d : null,
                            releaseDate: (_e = set.releaseDate) !== null && _e !== void 0 ? _e : null,
                            logoUrl: (_g = (_f = set.images) === null || _f === void 0 ? void 0 : _f.logo) !== null && _g !== void 0 ? _g : null,
                            symbolUrl: (_j = (_h = set.images) === null || _h === void 0 ? void 0 : _h.symbol) !== null && _j !== void 0 ? _j : null,
                            imageUrl: (_l = (_k = set.images) === null || _k === void 0 ? void 0 : _k.logo) !== null && _l !== void 0 ? _l : null,
                            syncedAt: new Date(),
                        })
                            .onConflictDoUpdate({
                            target: schema_1.pokemonSets.id,
                            set: {
                                name: set.name,
                                series: (_m = set.series) !== null && _m !== void 0 ? _m : "",
                                printedTotal: (_o = set.printedTotal) !== null && _o !== void 0 ? _o : null,
                                total: (_p = set.total) !== null && _p !== void 0 ? _p : null,
                                releaseDate: (_q = set.releaseDate) !== null && _q !== void 0 ? _q : null,
                                logoUrl: (_s = (_r = set.images) === null || _r === void 0 ? void 0 : _r.logo) !== null && _s !== void 0 ? _s : null,
                                symbolUrl: (_u = (_t = set.images) === null || _t === void 0 ? void 0 : _t.symbol) !== null && _u !== void 0 ? _u : null,
                                imageUrl: (_w = (_v = set.images) === null || _v === void 0 ? void 0 : _v.logo) !== null && _w !== void 0 ? _w : null,
                                syncedAt: new Date(),
                            },
                        })];
                case 6:
                    _x.sent();
                    return [3 /*break*/, 8];
                case 7:
                    err_2 = _x.sent();
                    console.error("[CardSync] Failed to upsert set ".concat(set.id, ":"), err_2);
                    return [3 /*break*/, 8];
                case 8:
                    _i++;
                    return [3 /*break*/, 3];
                case 9: return [2 /*return*/];
            }
        });
    });
}
function syncCardsForSet(setId_1, setName_1) {
    return __awaiter(this, arguments, void 0, function (setId, setName, force) {
        var allCards, page, data, typed, cards, existingIds, ids, existing, inserted, _i, allCards_1, card, alreadySynced, existingPricing, hasAnyPrice, err_3;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
        if (force === void 0) { force = false; }
        return __generator(this, function (_z) {
            switch (_z.label) {
                case 0:
                    allCards = [];
                    page = 1;
                    _z.label = 1;
                case 1:
                    if (!true) return [3 /*break*/, 3];
                    return [4 /*yield*/, fetchJson("".concat(POKEMON_API, "/cards?q=set.id:").concat(setId, "&orderBy=number&page=").concat(page, "&pageSize=250"))];
                case 2:
                    data = _z.sent();
                    typed = data;
                    cards = (_a = typed.data) !== null && _a !== void 0 ? _a : [];
                    allCards = allCards.concat(cards);
                    if (allCards.length >= ((_b = typed.totalCount) !== null && _b !== void 0 ? _b : 0) || cards.length < 250)
                        return [3 /*break*/, 3];
                    page++;
                    return [3 /*break*/, 1];
                case 3:
                    existingIds = new Set();
                    if (!(!force && allCards.length > 0)) return [3 /*break*/, 5];
                    ids = allCards.map(function (c) { return c.id; });
                    return [4 /*yield*/, db_1.db
                            .select({ id: schema_1.pokemonCards.id })
                            .from(schema_1.pokemonCards)
                            .where((0, drizzle_orm_1.inArray)(schema_1.pokemonCards.id, ids))];
                case 4:
                    existing = _z.sent();
                    existingIds = new Set(existing.map(function (r) { return r.id; }));
                    _z.label = 5;
                case 5:
                    inserted = 0;
                    _i = 0, allCards_1 = allCards;
                    _z.label = 6;
                case 6:
                    if (!(_i < allCards_1.length)) return [3 /*break*/, 20];
                    card = allCards_1[_i];
                    alreadySynced = !force && existingIds.has(card.id);
                    _z.label = 7;
                case 7:
                    _z.trys.push([7, 18, , 19]);
                    return [4 /*yield*/, db_1.db
                            .insert(schema_1.pokemonCards)
                            .values({
                            id: card.id,
                            setId: (_d = (_c = card.set) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : setId,
                            name: card.name,
                            number: card.number,
                            rarity: (_e = card.rarity) !== null && _e !== void 0 ? _e : null,
                            supertype: (_f = card.supertype) !== null && _f !== void 0 ? _f : null,
                            subtypes: card.subtypes ? card.subtypes.join(",") : null,
                            imageSmall: (_h = (_g = card.images) === null || _g === void 0 ? void 0 : _g.small) !== null && _h !== void 0 ? _h : null,
                            imageLarge: (_k = (_j = card.images) === null || _j === void 0 ? void 0 : _j.large) !== null && _k !== void 0 ? _k : null,
                            artist: (_l = card.artist) !== null && _l !== void 0 ? _l : null,
                            hp: (_m = card.hp) !== null && _m !== void 0 ? _m : null,
                            nationalPokedexNumbers: card.nationalPokedexNumbers
                                ? card.nationalPokedexNumbers.join(",")
                                : null,
                            syncedAt: new Date(),
                        })
                            .onConflictDoUpdate({
                            target: schema_1.pokemonCards.id,
                            set: {
                                name: card.name,
                                number: card.number,
                                rarity: (_o = card.rarity) !== null && _o !== void 0 ? _o : null,
                                supertype: (_p = card.supertype) !== null && _p !== void 0 ? _p : null,
                                subtypes: card.subtypes ? card.subtypes.join(",") : null,
                                imageSmall: (_r = (_q = card.images) === null || _q === void 0 ? void 0 : _q.small) !== null && _r !== void 0 ? _r : null,
                                imageLarge: (_t = (_s = card.images) === null || _s === void 0 ? void 0 : _s.large) !== null && _t !== void 0 ? _t : null,
                                artist: (_u = card.artist) !== null && _u !== void 0 ? _u : null,
                                hp: (_v = card.hp) !== null && _v !== void 0 ? _v : null,
                                nationalPokedexNumbers: card.nationalPokedexNumbers
                                    ? card.nationalPokedexNumbers.join(",")
                                    : null,
                                syncedAt: new Date(),
                            },
                        })];
                case 8:
                    _z.sent();
                    if (!(!alreadySynced || force)) return [3 /*break*/, 17];
                    return [4 /*yield*/, syncPricingForCard(card)];
                case 9:
                    _z.sent();
                    return [4 /*yield*/, db_1.db
                            .select()
                            .from(schema_1.cardPricing)
                            .where((0, drizzle_orm_1.eq)(schema_1.cardPricing.variantId, card.id))
                            .limit(1)];
                case 10:
                    existingPricing = _z.sent();
                    hasAnyPrice = ((_w = existingPricing[0]) === null || _w === void 0 ? void 0 : _w.tcgMarket) ||
                        ((_x = existingPricing[0]) === null || _x === void 0 ? void 0 : _x.priceGBP) ||
                        ((_y = existingPricing[0]) === null || _y === void 0 ? void 0 : _y.cardmarketAvg);
                    if (!!hasAnyPrice) return [3 /*break*/, 12];
                    console.log("[PricingFallback] Using PokecardValues for ".concat(card.name));
                    return [4 /*yield*/, syncGbpPricingForCard(card.id, card.name, card.number)];
                case 11:
                    _z.sent();
                    _z.label = 12;
                case 12: return [4 /*yield*/, sleep(GBP_THROTTLE_MS)];
                case 13:
                    _z.sent();
                    return [4 /*yield*/, syncGbpPricingForCard(card.id, card.name, card.number)];
                case 14:
                    _z.sent();
                    return [4 /*yield*/, sleep(EBAY_THROTTLE_MS)];
                case 15:
                    _z.sent();
                    return [4 /*yield*/, syncEbayPricesForCard(card.id, card.name, setName, card.number)];
                case 16:
                    _z.sent();
                    _z.label = 17;
                case 17:
                    inserted++;
                    return [3 /*break*/, 19];
                case 18:
                    err_3 = _z.sent();
                    console.error("[CardSync] Failed to upsert card ".concat(card.id, ":"), err_3);
                    return [3 /*break*/, 19];
                case 19:
                    _i++;
                    return [3 /*break*/, 6];
                case 20: return [2 /*return*/, inserted];
            }
        });
    });
}
function syncPricingForCard(card) {
    return __awaiter(this, void 0, void 0, function () {
        var tcgp, cm, tcgNormal, tcgLow, tcgMid, tcgHigh, tcgMarket, tcgDirectLow, cardmarketAvg, cardmarketLow, cardmarketTrend, err_4;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
        return __generator(this, function (_r) {
            switch (_r.label) {
                case 0:
                    tcgp = (_a = card.tcgplayer) === null || _a === void 0 ? void 0 : _a.prices;
                    cm = (_b = card.cardmarket) === null || _b === void 0 ? void 0 : _b.prices;
                    tcgNormal = (_f = (_e = (_d = (_c = tcgp === null || tcgp === void 0 ? void 0 : tcgp.normal) !== null && _c !== void 0 ? _c : tcgp === null || tcgp === void 0 ? void 0 : tcgp.holofoil) !== null && _d !== void 0 ? _d : tcgp === null || tcgp === void 0 ? void 0 : tcgp["1stEditionNormal"]) !== null && _e !== void 0 ? _e : tcgp === null || tcgp === void 0 ? void 0 : tcgp["1stEditionHolofoil"]) !== null && _f !== void 0 ? _f : null;
                    tcgLow = (_g = tcgNormal === null || tcgNormal === void 0 ? void 0 : tcgNormal.low) !== null && _g !== void 0 ? _g : null;
                    tcgMid = (_h = tcgNormal === null || tcgNormal === void 0 ? void 0 : tcgNormal.mid) !== null && _h !== void 0 ? _h : null;
                    tcgHigh = (_j = tcgNormal === null || tcgNormal === void 0 ? void 0 : tcgNormal.high) !== null && _j !== void 0 ? _j : null;
                    tcgMarket = (_k = tcgNormal === null || tcgNormal === void 0 ? void 0 : tcgNormal.market) !== null && _k !== void 0 ? _k : null;
                    tcgDirectLow = (_l = tcgNormal === null || tcgNormal === void 0 ? void 0 : tcgNormal.directLow) !== null && _l !== void 0 ? _l : null;
                    cardmarketAvg = (_o = (_m = cm === null || cm === void 0 ? void 0 : cm.averageSellPrice) !== null && _m !== void 0 ? _m : cm === null || cm === void 0 ? void 0 : cm.avg1) !== null && _o !== void 0 ? _o : null;
                    cardmarketLow = (_p = cm === null || cm === void 0 ? void 0 : cm.lowPrice) !== null && _p !== void 0 ? _p : null;
                    cardmarketTrend = (_q = cm === null || cm === void 0 ? void 0 : cm.trendPrice) !== null && _q !== void 0 ? _q : null;
                    _r.label = 1;
                case 1:
                    _r.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, db_1.db
                            .insert(schema_1.cardPricing)
                            .values({
                            variantId: card.id,
                            tcgLow: tcgLow,
                            tcgMid: tcgMid,
                            tcgHigh: tcgHigh,
                            tcgMarket: tcgMarket,
                            tcgDirectLow: tcgDirectLow,
                            cardmarketAvg: cardmarketAvg,
                            cardmarketLow: cardmarketLow,
                            cardmarketTrend: cardmarketTrend,
                            updatedAt: new Date(),
                        })
                            .onConflictDoUpdate({
                            target: schema_1.cardPricing.variantId,
                            set: {
                                tcgLow: tcgLow,
                                tcgMid: tcgMid,
                                tcgHigh: tcgHigh,
                                tcgMarket: tcgMarket,
                                tcgDirectLow: tcgDirectLow,
                                cardmarketAvg: cardmarketAvg,
                                cardmarketLow: cardmarketLow,
                                cardmarketTrend: cardmarketTrend,
                                updatedAt: new Date(),
                            },
                        })];
                case 2:
                    _r.sent();
                    return [3 /*break*/, 4];
                case 3:
                    err_4 = _r.sent();
                    console.error("[CardSync] Failed to upsert pricing for card ".concat(card.id, ":"), err_4);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function syncGbpPricingForCard(cardId, cardName, cardNumber) {
    return __awaiter(this, void 0, void 0, function () {
        var results, numOnly_1, exactMatch, fuzzyMatch, match, fallbackPrice, err_5;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, (0, pokecardvalues_scraper_1.scrapeCardSearch)(cardName)];
                case 1:
                    results = _c.sent();
                    if (!results || results.length === 0)
                        return [2 /*return*/];
                    numOnly_1 = String(cardNumber)
                        .split("/")[0]
                        .replace(/^0+/, "");
                    exactMatch = results.find(function (c) {
                        var cNum = String(c.number || "")
                            .split("/")[0]
                            .replace(/^0+/, "");
                        return cNum === numOnly_1;
                    });
                    fuzzyMatch = results.find(function (c) { var _a; return (_a = c.name) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(cardName.toLowerCase()); });
                    match = exactMatch ||
                        fuzzyMatch ||
                        results[0];
                    if (!match)
                        return [2 /*return*/];
                    fallbackPrice = (_b = (_a = match.priceGBP) !== null && _a !== void 0 ? _a : match.price) !== null && _b !== void 0 ? _b : null;
                    if (fallbackPrice === null)
                        return [2 /*return*/];
                    return [4 /*yield*/, db_1.db
                            .insert(schema_1.cardPricing)
                            .values({ variantId: cardId, priceGBP: match.priceGBP, updatedAt: new Date() })
                            .onConflictDoUpdate({
                            target: schema_1.cardPricing.variantId,
                            set: { priceGBP: fallbackPrice, updatedAt: new Date() },
                        })];
                case 2:
                    _c.sent();
                    return [3 /*break*/, 4];
                case 3:
                    err_5 = _c.sent();
                    console.error("[CardSync] GBP price sync failed for card ".concat(cardId, ":"), err_5);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function scrapeEbayListings(url, isSold) {
    return __awaiter(this, void 0, void 0, function () {
        var res, html, $_1, listings_1, err_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetch(url, {
                            headers: {
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                                "Accept": "text/html,application/xhtml+xml",
                                "Accept-Language": "en-GB,en;q=0.9",
                            },
                        })];
                case 1:
                    res = _a.sent();
                    if (!res.ok)
                        return [2 /*return*/, []];
                    return [4 /*yield*/, res.text()];
                case 2:
                    html = _a.sent();
                    $_1 = cheerio.load(html);
                    listings_1 = [];
                    $_1(".s-item").each(function (_, el) {
                        var _a;
                        var $el = $_1(el);
                        var title = $el.find(".s-item__title").text().trim();
                        if (!title || title === "Shop on eBay")
                            return;
                        var priceText = $el.find(".s-item__price").text().trim();
                        var priceMatch = priceText.match(/[£$€]([\d,]+\.?\d*)/);
                        if (!priceMatch)
                            return;
                        var price = parseFloat(priceMatch[1].replace(",", ""));
                        var currency = priceText.startsWith("£")
                            ? "GBP"
                            : priceText.startsWith("$")
                                ? "USD"
                                : "EUR";
                        var soldDate = $el
                            .find(".s-item__caption--row, .POSITIVE, .s-item__endedDate")
                            .first()
                            .text()
                            .trim();
                        var listingUrl = (_a = $el.find("a.s-item__link").attr("href")) !== null && _a !== void 0 ? _a : "";
                        listings_1.push({ title: title, price: price, currency: currency, soldDate: soldDate, listingUrl: listingUrl, isSold: isSold });
                    });
                    return [2 /*return*/, listings_1];
                case 3:
                    err_6 = _a.sent();
                    console.error("[CardSync] eBay scrape error:", err_6);
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function syncEbayPricesForCard(cardId, cardName, setName, cardNumber) {
    return __awaiter(this, void 0, void 0, function () {
        var soldUrl, activeUrl, _a, soldListings, activeListings, allListings, existingRows, existingKeys, _i, allListings_1, listing, key, err_7;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 7, , 8]);
                    soldUrl = (0, pokecardvalues_scraper_1.generateEbaySoldUrl)(cardName, setName, cardNumber);
                    activeUrl = (0, pokecardvalues_scraper_1.generateEbaySearchUrl)(cardName, setName, cardNumber);
                    return [4 /*yield*/, Promise.all([
                            scrapeEbayListings(soldUrl, true),
                            scrapeEbayListings(activeUrl, false),
                        ])];
                case 1:
                    _a = _b.sent(), soldListings = _a[0], activeListings = _a[1];
                    allListings = __spreadArray(__spreadArray([], soldListings.slice(0, 10), true), activeListings.slice(0, 5), true);
                    if (allListings.length === 0)
                        return [2 /*return*/];
                    return [4 /*yield*/, db_1.db
                            .select({ listingUrl: schema_1.ebayPrices.listingUrl, isSold: schema_1.ebayPrices.isSold })
                            .from(schema_1.ebayPrices)
                            .where((0, drizzle_orm_1.eq)(schema_1.ebayPrices.cardId, cardId))];
                case 2:
                    existingRows = _b.sent();
                    existingKeys = new Set(existingRows.map(function (r) { var _a; return "".concat((_a = r.listingUrl) !== null && _a !== void 0 ? _a : "", "|").concat(r.isSold ? "1" : "0"); }));
                    _i = 0, allListings_1 = allListings;
                    _b.label = 3;
                case 3:
                    if (!(_i < allListings_1.length)) return [3 /*break*/, 6];
                    listing = allListings_1[_i];
                    key = "".concat(listing.listingUrl, "|").concat(listing.isSold ? "1" : "0");
                    if (existingKeys.has(key))
                        return [3 /*break*/, 5];
                    return [4 /*yield*/, db_1.db.insert(schema_1.ebayPrices).values({
                            cardId: cardId,
                            title: listing.title,
                            price: listing.price,
                            currency: listing.currency,
                            soldDate: listing.soldDate || null,
                            listingUrl: listing.listingUrl,
                            isSold: listing.isSold,
                            fetchedAt: new Date(),
                        })];
                case 4:
                    _b.sent();
                    existingKeys.add(key);
                    _b.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6: return [3 /*break*/, 8];
                case 7:
                    err_7 = _b.sent();
                    console.error("[CardSync] eBay sync failed for card ".concat(cardId, ":"), err_7);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    });
}
function runFullSync() {
    return __awaiter(this, arguments, void 0, function (force) {
        var sets, totalSynced, syncedSetsCount, _i, sets_2, set, count, err_8, err_9, msg;
        if (force === void 0) { force = false; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (syncRunning) {
                        console.log("[CardSync] Sync already in progress, skipping.");
                        return [2 /*return*/];
                    }
                    syncRunning = true;
                    return [4 /*yield*/, updateSyncStatus({ isRunning: true, lastError: null })];
                case 1:
                    _a.sent();
                    console.log("[CardSync] Starting full card sync...");
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 15, 17, 18]);
                    return [4 /*yield*/, syncAllSets()];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, db_1.db.select().from(schema_1.pokemonSets)];
                case 4:
                    sets = _a.sent();
                    return [4 /*yield*/, updateSyncStatus({ totalSets: sets.length, syncedSets: 0 })];
                case 5:
                    _a.sent();
                    totalSynced = 0;
                    syncedSetsCount = 0;
                    _i = 0, sets_2 = sets;
                    _a.label = 6;
                case 6:
                    if (!(_i < sets_2.length)) return [3 /*break*/, 13];
                    set = sets_2[_i];
                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 10); })];
                case 7:
                    _a.sent();
                    _a.label = 8;
                case 8:
                    _a.trys.push([8, 11, , 12]);
                    return [4 /*yield*/, syncCardsForSet(set.id, set.name, force)];
                case 9:
                    count = _a.sent();
                    totalSynced += count;
                    syncedSetsCount++;
                    return [4 /*yield*/, updateSyncStatus({ syncedSets: syncedSetsCount, syncedCards: totalSynced })];
                case 10:
                    _a.sent();
                    console.log("[CardSync] Set ".concat(set.id, " (").concat(set.name, "): ").concat(count, " cards synced."));
                    return [3 /*break*/, 12];
                case 11:
                    err_8 = _a.sent();
                    console.error("[CardSync] Error syncing set ".concat(set.id, ":"), err_8);
                    return [3 /*break*/, 12];
                case 12:
                    _i++;
                    return [3 /*break*/, 6];
                case 13: return [4 /*yield*/, updateSyncStatus({
                        isRunning: false,
                        lastCardSyncAt: new Date(),
                        totalCards: totalSynced,
                        syncedCards: totalSynced,
                    })];
                case 14:
                    _a.sent();
                    console.log("[CardSync] Full sync complete. ".concat(totalSynced, " cards across ").concat(syncedSetsCount, " sets."));
                    return [3 /*break*/, 18];
                case 15:
                    err_9 = _a.sent();
                    msg = err_9 instanceof Error ? err_9.message : String(err_9);
                    console.error("[CardSync] Sync failed:", err_9);
                    return [4 /*yield*/, updateSyncStatus({ isRunning: false, lastError: msg })];
                case 16:
                    _a.sent();
                    return [3 /*break*/, 18];
                case 17:
                    syncRunning = false;
                    return [7 /*endfinally*/];
                case 18: return [2 /*return*/];
            }
        });
    });
}
function runPriceRefresh() {
    return __awaiter(this, void 0, void 0, function () {
        var allSets, _i, allSets_1, set, cards, _a, cards_1, card, apiData, typed, err_10, err_11;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log("[CardSync] Starting pricing refresh...");
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 20, , 21]);
                    return [4 /*yield*/, db_1.db.select({ id: schema_1.pokemonSets.id, name: schema_1.pokemonSets.name }).from(schema_1.pokemonSets)];
                case 2:
                    allSets = _b.sent();
                    _i = 0, allSets_1 = allSets;
                    _b.label = 3;
                case 3:
                    if (!(_i < allSets_1.length)) return [3 /*break*/, 18];
                    set = allSets_1[_i];
                    return [4 /*yield*/, db_1.db
                            .select({
                            id: schema_1.pokemonCards.id,
                            name: schema_1.pokemonCards.name,
                            number: schema_1.pokemonCards.number,
                            rarity: schema_1.pokemonCards.rarity,
                            setId: schema_1.pokemonCards.setId,
                        })
                            .from(schema_1.pokemonCards)
                            .where((0, drizzle_orm_1.eq)(schema_1.pokemonCards.setId, set.id))];
                case 4:
                    cards = _b.sent();
                    _a = 0, cards_1 = cards;
                    _b.label = 5;
                case 5:
                    if (!(_a < cards_1.length)) return [3 /*break*/, 17];
                    card = cards_1[_a];
                    _b.label = 6;
                case 6:
                    _b.trys.push([6, 15, , 16]);
                    return [4 /*yield*/, fetchJson("".concat(POKEMON_API, "/cards/").concat(card.id))];
                case 7:
                    apiData = _b.sent();
                    typed = apiData;
                    if (!typed.data) return [3 /*break*/, 9];
                    return [4 /*yield*/, syncPricingForCard(typed.data)];
                case 8:
                    _b.sent();
                    _b.label = 9;
                case 9: return [4 /*yield*/, sleep(TCG_REQUEST_DELAY_MS)];
                case 10:
                    _b.sent();
                    return [4 /*yield*/, sleep(GBP_THROTTLE_MS)];
                case 11:
                    _b.sent();
                    return [4 /*yield*/, syncGbpPricingForCard(card.id, card.name, card.number)];
                case 12:
                    _b.sent();
                    return [4 /*yield*/, sleep(EBAY_THROTTLE_MS)];
                case 13:
                    _b.sent();
                    return [4 /*yield*/, syncEbayPricesForCard(card.id, card.name, set.name, card.number)];
                case 14:
                    _b.sent();
                    return [3 /*break*/, 16];
                case 15:
                    err_10 = _b.sent();
                    console.error("[CardSync] Price refresh failed for ".concat(card.id, ":"), err_10);
                    return [3 /*break*/, 16];
                case 16:
                    _a++;
                    return [3 /*break*/, 5];
                case 17:
                    _i++;
                    return [3 /*break*/, 3];
                case 18: return [4 /*yield*/, updateSyncStatus({ lastPriceSyncAt: new Date() })];
                case 19:
                    _b.sent();
                    console.log("[CardSync] Pricing refresh complete.");
                    return [3 /*break*/, 21];
                case 20:
                    err_11 = _b.sent();
                    console.error("[CardSync] Pricing refresh error:", err_11);
                    return [3 /*break*/, 21];
                case 21: return [2 /*return*/];
            }
        });
    });
}
// Fast card seed — basic data only, no pricing/eBay, runs in background
function runFastCardSeed() {
    return __awaiter(this, void 0, void 0, function () {
        var allSets, alreadySeededRows, alreadySeeded, sets, totalInserted, NO_CARD_PREFIXES, isNonTcgApiSet, _loop_2, _i, sets_3, set;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
        return __generator(this, function (_x) {
            switch (_x.label) {
                case 0:
                    console.log("[CardSync] Starting fast card seed (basic data, no pricing)...");
                    return [4 /*yield*/, db_1.db.select({ id: schema_1.pokemonSets.id, name: schema_1.pokemonSets.name }).from(schema_1.pokemonSets)];
                case 1:
                    allSets = _x.sent();
                    return [4 /*yield*/, db_1.db
                            .select({ setId: schema_1.pokemonCards.setId })
                            .from(schema_1.pokemonCards)
                            .groupBy(schema_1.pokemonCards.setId)];
                case 2:
                    alreadySeededRows = _x.sent();
                    alreadySeeded = new Set(alreadySeededRows.map(function (r) { return r.setId; }));
                    sets = allSets.filter(function (s) { return !alreadySeeded.has(s.id); });
                    console.log("[CardSync] ".concat(alreadySeeded.size, " sets already seeded, ").concat(sets.length, " remaining..."));
                    totalInserted = 0;
                    NO_CARD_PREFIXES = [];
                    isNonTcgApiSet = function (id) {
                        return id.endsWith("_ko") ||
                            id.endsWith("_zh") ||
                            id.endsWith("_cn") ||
                            id.endsWith("_ja") ||
                            id.startsWith("babanuki-") ||
                            id.startsWith("mengka-");
                    };
                    _loop_2 = function (set) {
                        var allCards, page, _loop_3, state_2, _y, allCards_2, card, prices, variantsToInsert, err_12, err_13;
                        return __generator(this, function (_z) {
                            switch (_z.label) {
                                case 0: return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 10); })];
                                case 1:
                                    _z.sent();
                                    // Instantly skip non-English sets that are handled by other seeders
                                    if (isNonTcgApiSet(set.id)) {
                                        return [2 /*return*/, "continue"];
                                    }
                                    if (!NO_CARD_PREFIXES.some(function (p) { return set.id.startsWith(p); })) return [3 /*break*/, 3];
                                    console.log("[CardSync] Skipped set ".concat(set.id, " (regional set, no TCG API cards)"));
                                    return [4 /*yield*/, sleep(200)];
                                case 2:
                                    _z.sent();
                                    return [2 /*return*/, "continue"];
                                case 3:
                                    _z.trys.push([3, 15, , 17]);
                                    allCards = [];
                                    page = 1;
                                    _loop_3 = function () {
                                        var pageData, ctrl, timer, res, ct, fetchErr_1, cards;
                                        return __generator(this, function (_0) {
                                            switch (_0.label) {
                                                case 0:
                                                    pageData = null;
                                                    ctrl = new AbortController();
                                                    timer = setTimeout(function () { return ctrl.abort(); }, 12000);
                                                    _0.label = 1;
                                                case 1:
                                                    _0.trys.push([1, 7, , 8]);
                                                    return [4 /*yield*/, fetch("".concat(POKEMON_API, "/cards?q=set.id:").concat(set.id, "&orderBy=number&page=").concat(page, "&pageSize=250"), { headers: buildTcgHeaders(), signal: ctrl.signal })];
                                                case 2:
                                                    res = _0.sent();
                                                    clearTimeout(timer);
                                                    if (!(res.status === 429)) return [3 /*break*/, 4];
                                                    // Rate limited — back off and let user requests through
                                                    console.log("[CardSync] Rate limited for ".concat(set.id, ", waiting 20s..."));
                                                    return [4 /*yield*/, sleep(20000)];
                                                case 3:
                                                    _0.sent();
                                                    return [3 /*break*/, 6];
                                                case 4:
                                                    if (!res.ok) return [3 /*break*/, 6];
                                                    ct = res.headers.get("content-type") || "";
                                                    if (!ct.includes("application/json")) return [3 /*break*/, 6];
                                                    return [4 /*yield*/, res.json()];
                                                case 5:
                                                    pageData = _0.sent();
                                                    _0.label = 6;
                                                case 6: return [3 /*break*/, 8];
                                                case 7:
                                                    fetchErr_1 = _0.sent();
                                                    clearTimeout(timer);
                                                    // Timeout or network error — skip this set immediately
                                                    if (fetchErr_1.name === "AbortError") {
                                                        console.log("[CardSync] Timeout for ".concat(set.id, " page ").concat(page, ", skipping set"));
                                                    }
                                                    return [3 /*break*/, 8];
                                                case 8:
                                                    if (!pageData)
                                                        return [2 /*return*/, "break"]; // couldn't fetch this page — skip set
                                                    cards = (_a = pageData.data) !== null && _a !== void 0 ? _a : [];
                                                    allCards = allCards.concat(cards);
                                                    if (allCards.length >= ((_b = pageData.totalCount) !== null && _b !== void 0 ? _b : 0) || cards.length < 250)
                                                        return [2 /*return*/, "break"];
                                                    page++;
                                                    return [4 /*yield*/, sleep(1500)];
                                                case 9:
                                                    _0.sent(); // pause between pages to avoid rate limiting
                                                    return [2 /*return*/];
                                            }
                                        });
                                    };
                                    _z.label = 4;
                                case 4:
                                    if (!true) return [3 /*break*/, 6];
                                    return [5 /*yield**/, _loop_3()];
                                case 5:
                                    state_2 = _z.sent();
                                    if (state_2 === "break")
                                        return [3 /*break*/, 6];
                                    return [3 /*break*/, 4];
                                case 6:
                                    _y = 0, allCards_2 = allCards;
                                    _z.label = 7;
                                case 7:
                                    if (!(_y < allCards_2.length)) return [3 /*break*/, 13];
                                    card = allCards_2[_y];
                                    _z.label = 8;
                                case 8:
                                    _z.trys.push([8, 11, , 12]);
                                    /* =========================================================
                                       INSERT BASE CARD
                                       ========================================================= */
                                    return [4 /*yield*/, db_1.db.insert(schema_1.pokemonCards).values({
                                            id: card.id,
                                            setId: (_d = (_c = card.set) === null || _c === void 0 ? void 0 : _c.id) !== null && _d !== void 0 ? _d : set.id,
                                            name: card.name,
                                            number: card.number,
                                            rarity: (_e = card.rarity) !== null && _e !== void 0 ? _e : null,
                                            supertype: (_f = card.supertype) !== null && _f !== void 0 ? _f : null,
                                            subtypes: card.subtypes
                                                ? card.subtypes.join(",")
                                                : null,
                                            imageSmall: (_h = (_g = card.images) === null || _g === void 0 ? void 0 : _g.small) !== null && _h !== void 0 ? _h : null,
                                            imageLarge: (_k = (_j = card.images) === null || _j === void 0 ? void 0 : _j.large) !== null && _k !== void 0 ? _k : null,
                                            artist: (_l = card.artist) !== null && _l !== void 0 ? _l : null,
                                            hp: (_m = card.hp) !== null && _m !== void 0 ? _m : null,
                                            nationalPokedexNumbers: card.nationalPokedexNumbers
                                                ? card.nationalPokedexNumbers.join(",")
                                                : null,
                                            syncedAt: new Date(),
                                        }).onConflictDoNothing()];
                                case 9:
                                    /* =========================================================
                                       INSERT BASE CARD
                                       ========================================================= */
                                    _z.sent();
                                    prices = ((_o = card.tcgplayer) === null || _o === void 0 ? void 0 : _o.prices) || {};
                                    variantsToInsert = [];
                                    /**
                                     * NORMAL
                                     */
                                    if (prices.normal) {
                                        variantsToInsert.push({
                                            id: "".concat(card.id, "-normal"),
                                            cardId: card.id,
                                            finishType: "Non-Holo",
                                            editionType: "Unlimited",
                                            language: "English",
                                            variantLabel: "Non-Holo",
                                            imageUrl: ((_p = card.images) === null || _p === void 0 ? void 0 : _p.large) ||
                                                ((_q = card.images) === null || _q === void 0 ? void 0 : _q.small) ||
                                                null,
                                            isPromo: card.rarity === "Promo",
                                            isStamped: false,
                                        });
                                    }
                                    /**
                                     * HOLO
                                     */
                                    if (prices.holofoil) {
                                        variantsToInsert.push({
                                            id: "".concat(card.id, "-holo"),
                                            cardId: card.id,
                                            finishType: "Holo",
                                            editionType: "Unlimited",
                                            language: "English",
                                            variantLabel: "Holo",
                                            imageUrl: ((_r = card.images) === null || _r === void 0 ? void 0 : _r.large) ||
                                                ((_s = card.images) === null || _s === void 0 ? void 0 : _s.small) ||
                                                null,
                                            isPromo: card.rarity === "Promo",
                                            isStamped: false,
                                        });
                                    }
                                    /**
                                     * REVERSE HOLO
                                     */
                                    if (prices.reverseHolofoil) {
                                        variantsToInsert.push({
                                            id: "".concat(card.id, "-reverse"),
                                            cardId: card.id,
                                            finishType: "Reverse Holo",
                                            editionType: "Unlimited",
                                            language: "English",
                                            variantLabel: "Reverse Holo",
                                            imageUrl: ((_t = card.images) === null || _t === void 0 ? void 0 : _t.large) ||
                                                ((_u = card.images) === null || _u === void 0 ? void 0 : _u.small) ||
                                                null,
                                            isPromo: card.rarity === "Promo",
                                            isStamped: false,
                                        });
                                    }
                                    /**
                                     * FALLBACK
                                     * If no pricing variants exist,
                                     * still create a standard variant
                                     */
                                    if (variantsToInsert.length === 0) {
                                        variantsToInsert.push({
                                            id: "".concat(card.id, "-default"),
                                            cardId: card.id,
                                            finishType: "Non-Holo",
                                            editionType: "Unlimited",
                                            language: "English",
                                            variantLabel: "Standard",
                                            imageUrl: ((_v = card.images) === null || _v === void 0 ? void 0 : _v.large) ||
                                                ((_w = card.images) === null || _w === void 0 ? void 0 : _w.small) ||
                                                null,
                                            isPromo: card.rarity === "Promo",
                                            isStamped: false,
                                        });
                                    }
                                    /* =========================================================
                                       INSERT VARIANTS
                                       ========================================================= */
                                    return [4 /*yield*/, db_1.db.insert(schema_1.pokemonCardVariants)
                                            .values(variantsToInsert)
                                            .onConflictDoNothing()];
                                case 10:
                                    /* =========================================================
                                       INSERT VARIANTS
                                       ========================================================= */
                                    _z.sent();
                                    totalInserted++;
                                    return [3 /*break*/, 12];
                                case 11:
                                    err_12 = _z.sent();
                                    console.error("[CardSync] Card insert failed ".concat(card.id), err_12);
                                    return [3 /*break*/, 12];
                                case 12:
                                    _y++;
                                    return [3 /*break*/, 7];
                                case 13:
                                    if (allCards.length > 0) {
                                        console.log("[CardSync] Fast seeded ".concat(allCards.length, " cards for set ").concat(set.id, " (").concat(set.name, ")"));
                                    }
                                    else {
                                        console.log("[CardSync] Skipped set ".concat(set.id, " (no cards available)"));
                                    }
                                    return [4 /*yield*/, sleep(5000)];
                                case 14:
                                    _z.sent(); // Be polite to the TCG API — 5s gap protects user request quota
                                    return [3 /*break*/, 17];
                                case 15:
                                    err_13 = _z.sent();
                                    console.error("[CardSync] Fast seed error for set ".concat(set.id, ":"), err_13);
                                    return [4 /*yield*/, sleep(1000)];
                                case 16:
                                    _z.sent();
                                    return [3 /*break*/, 17];
                                case 17: return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, sets_3 = sets;
                    _x.label = 3;
                case 3:
                    if (!(_i < sets_3.length)) return [3 /*break*/, 6];
                    set = sets_3[_i];
                    return [5 /*yield**/, _loop_2(set)];
                case 4:
                    _x.sent();
                    _x.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6: return [4 /*yield*/, updateSyncStatus({ totalCards: totalInserted, syncedCards: totalInserted, lastCardSyncAt: new Date() })];
                case 7:
                    _x.sent();
                    console.log("[CardSync] Fast card seed complete \u2014 ".concat(totalInserted, " cards in DB."));
                    return [2 /*return*/];
            }
        });
    });
}
/** After TCG API seeding, fill any still-empty sets from Scrydex (Japanese, TCG Pocket, etc.) */
// Scrydex startup sync intentionally disabled
function startSyncService() {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            console.log("[CardSync] Sync service starting...");
            if (priceRefreshTimer) {
                clearInterval(priceRefreshTimer);
            }
            priceRefreshTimer = setInterval(function () {
                runPriceRefresh().catch(function (err) {
                    return console.error("[CardSync] Price refresh interval error:", err);
                });
            }, PRICE_REFRESH_INTERVAL_MS);
            // Check DB state and seed if needed
            setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                function runKoZhAndJpFix() {
                    return __awaiter(this, void 0, void 0, function () {
                        var _a, seedKoZhCards, fixEmptyJpSets, _b, jpFix, koZh, err_15;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    _c.trys.push([0, 3, , 4]);
                                    return [4 /*yield*/, Promise.resolve().then(function () { return require("./ko-zh-seed"); })];
                                case 1:
                                    _a = _c.sent(), seedKoZhCards = _a.seedKoZhCards, fixEmptyJpSets = _a.fixEmptyJpSets;
                                    return [4 /*yield*/, Promise.all([
                                            fixEmptyJpSets(),
                                            seedKoZhCards(),
                                        ])];
                                case 2:
                                    _b = _c.sent(), jpFix = _b[0], koZh = _b[1];
                                    if (jpFix.inserted > 0) {
                                        console.log("[JpFix] Inserted ".concat(jpFix.inserted, " cards for empty JP sets"));
                                    }
                                    if (koZh.inserted > 0) {
                                        console.log("[KoZhSeed] Done \u2014 ".concat(koZh.setsProcessed, " sets, ").concat(koZh.inserted, " cards inserted"));
                                    }
                                    else {
                                        console.log("[KoZhSeed] Nothing new to insert (".concat(koZh.skipped, " sets skipped \u2014 JP source not ready yet)"));
                                    }
                                    return [3 /*break*/, 4];
                                case 3:
                                    err_15 = _c.sent();
                                    console.error("[KoZhSeed] Error:", err_15.message);
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    });
                }
                var _a, totalSetRows, seededSetRows, totalSets, seededSets, err_14;
                var _b, _c, _d, _e;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0:
                            _f.trys.push([0, 11, , 12]);
                            return [4 /*yield*/, Promise.all([
                                    db_1.db.select({
                                        count: (0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["count(*)::int"], ["count(*)::int"]))),
                                    }).from(schema_1.pokemonSets),
                                    db_1.db.select({
                                        count: (0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["count(distinct set_id)::int"], ["count(distinct set_id)::int"]))),
                                    }).from(schema_1.pokemonCards),
                                ])];
                        case 1:
                            _a = _f.sent(), totalSetRows = _a[0], seededSetRows = _a[1];
                            totalSets = (_c = (_b = totalSetRows[0]) === null || _b === void 0 ? void 0 : _b.count) !== null && _c !== void 0 ? _c : 0;
                            seededSets = (_e = (_d = seededSetRows[0]) === null || _d === void 0 ? void 0 : _d.count) !== null && _e !== void 0 ? _e : 0;
                            // Always seed Asian sets in background
                            Promise.resolve().then(function () { return require("./asian-set-seed"); }).then(function (_a) {
                                var seedAsianSets = _a.seedAsianSets;
                                seedAsianSets()
                                    .then(function (r) {
                                    return console.log("[AsianSeed] Done \u2014 inserted ".concat(r.inserted, ", skipped ").concat(r.skipped, ", errors ").concat(r.errors));
                                })
                                    .catch(console.error);
                            })
                                .catch(console.error);
                            // Always seed non-TCG sets in background
                            Promise.resolve().then(function () { return require("./non-tcg-seed"); }).then(function (_a) {
                                var seedNonTcgSets = _a.seedNonTcgSets;
                                seedNonTcgSets()
                                    .then(function (r) {
                                    return console.log("[NonTcgSeed] Done \u2014 inserted ".concat(r.inserted, ", skipped ").concat(r.skipped, ", errors ").concat(r.errors));
                                })
                                    .catch(console.error);
                            })
                                .catch(console.error);
                            if (!(totalSets === 0)) return [3 /*break*/, 5];
                            console.log("[CardSync] DB empty — seeding sets first...");
                            return [4 /*yield*/, syncAllSets()];
                        case 2:
                            _f.sent();
                            console.log("[CardSync] Sets seeded. Starting fast card seed in background...");
                            return [4 /*yield*/, runFastCardSeed()];
                        case 3:
                            _f.sent();
                            return [4 /*yield*/, runKoZhAndJpFix()];
                        case 4:
                            _f.sent();
                            return [3 /*break*/, 10];
                        case 5:
                            if (!(seededSets < totalSets)) return [3 /*break*/, 8];
                            console.log("[CardSync] ".concat(seededSets, "/").concat(totalSets, " sets have cards \u2014 seeding missing sets..."));
                            return [4 /*yield*/, runFastCardSeed()];
                        case 6:
                            _f.sent();
                            return [4 /*yield*/, runKoZhAndJpFix()];
                        case 7:
                            _f.sent();
                            return [3 /*break*/, 10];
                        case 8:
                            console.log("[CardSync] DB fully seeded: ".concat(seededSets, "/").concat(totalSets, " sets with cards \u2014 OK."));
                            return [4 /*yield*/, runKoZhAndJpFix()];
                        case 9:
                            _f.sent();
                            _f.label = 10;
                        case 10: return [3 /*break*/, 12];
                        case 11:
                            err_14 = _f.sent();
                            console.error("[CardSync] Auto-seed check failed:", err_14);
                            return [3 /*break*/, 12];
                        case 12: return [2 /*return*/];
                    }
                });
            }); }, 5000);
            return [2 /*return*/];
        });
    });
}
function getSyncStatus() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, getOrCreateSyncStatus()];
        });
    });
}
var templateObject_1, templateObject_2;
