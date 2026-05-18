"use strict";
/**
 * Korean & Chinese Card Seeder
 *
 * Korean (_ko) and Chinese (_zh / _cn) TCG editions share identical artwork
 * with their Japanese (_ja) counterparts. This seeder mirrors the JP card rows
 * into KO and ZH sets so every set has card images and data.
 *
 * Mapping rules:
 *   sv1s_ko  →  sv1s_ja  (replace trailing _ko with _ja)
 *   sv1s_zh  →  sv1s_ja  (replace trailing _zh with _ja)
 *   sv1s_cn  →  sv1s_ja  (replace trailing _cn with _ja)
 *
 * Card IDs follow the same rule:
 *   sv1s_ja-1  →  sv1s_ko-1  /  sv1s_zh-1
 *
 * Image URLs from Scrydex remain pointing at the JP card images — the artwork
 * is exactly the same regardless of the language printed on the card.
 *
 * Auto-invoked by card-sync.ts on startup.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedKoZhCards = seedKoZhCards;
exports.fixEmptyJpSets = fixEmptyJpSets;
var db_1 = require("./db");
var BATCH_PAUSE_MS = 5; // tiny pause between sets to avoid DB overload
var CARDS_PER_INSERT_BATCH = 50; // insert in chunks of 50
// ─── Helpers ──────────────────────────────────────────────────────────────────
function delay(ms) {
    return new Promise(function (r) { return setTimeout(r, ms); });
}
/** Replace the language suffix to get the JP set ID */
function toJpSetId(setId) {
    if (setId.endsWith("_ko"))
        return setId.slice(0, -3) + "_ja";
    if (setId.endsWith("_zh"))
        return setId.slice(0, -3) + "_ja";
    if (setId.endsWith("_cn"))
        return setId.slice(0, -3) + "_ja";
    return null;
}
/** The 2-letter suffix used in card IDs: "ko", "zh", or "cn" */
function langSuffix(setId) {
    if (setId.endsWith("_ko"))
        return "ko";
    if (setId.endsWith("_zh"))
        return "zh";
    return "cn";
}
/** Convert a JP card ID to the target language card ID */
function toTargetCardId(jpCardId, suffix) {
    // "sv1s_ja-1" → "sv1s_ko-1"
    return jpCardId.replace("_ja-", "_".concat(suffix, "-"));
}
// ─── Main export ──────────────────────────────────────────────────────────────
function seedKoZhCards(onProgress) {
    return __awaiter(this, void 0, void 0, function () {
        var log, emptyRes, emptySets, inserted, skipped, errors, setsProcessed, _i, emptySets_1, set, setId, jpId, suffix, jpRes, setInserted, chunks, i, _a, chunks_1, chunk, valueClauses, params, p, _b, chunk_1, jp, newId, res, count, err_1;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    log = function (msg) {
                        console.log("[KoZhSeed] ".concat(msg));
                        onProgress === null || onProgress === void 0 ? void 0 : onProgress(msg);
                    };
                    return [4 /*yield*/, db_1.pool.query("\n    SELECT s.id, s.name\n    FROM   pokemon_sets s\n    WHERE  (s.id LIKE '%_ko' ESCAPE '\\'\n         OR s.id LIKE '%_zh' ESCAPE '\\'\n         OR s.id LIKE '%_cn' ESCAPE '\\')\n    AND    NOT EXISTS (\n             SELECT 1 FROM pokemon_cards c WHERE c.set_id = s.id\n           )\n    ORDER  BY s.id\n  ")];
                case 1:
                    emptyRes = _d.sent();
                    emptySets = emptyRes.rows;
                    if (emptySets.length === 0) {
                        log("All KO/ZH sets already have cards — nothing to do.");
                        return [2 /*return*/, { inserted: 0, skipped: 0, setsProcessed: 0, errors: 0 }];
                    }
                    log("Found ".concat(emptySets.length, " KO/ZH sets with no cards \u2014 mirroring from JP\u2026"));
                    inserted = 0;
                    skipped = 0;
                    errors = 0;
                    setsProcessed = 0;
                    _i = 0, emptySets_1 = emptySets;
                    _d.label = 2;
                case 2:
                    if (!(_i < emptySets_1.length)) return [3 /*break*/, 14];
                    set = emptySets_1[_i];
                    setId = set.id;
                    jpId = toJpSetId(setId);
                    suffix = langSuffix(setId);
                    if (!jpId) {
                        skipped++;
                        return [3 /*break*/, 13];
                    }
                    return [4 /*yield*/, db_1.pool.query("SELECT id, name, number, rarity, supertype, subtypes, hp,\n              image_small, image_large, artist, national_pokedex_numbers\n       FROM   pokemon_cards\n       WHERE  set_id = $1\n       ORDER  BY id", [jpId])];
                case 3:
                    jpRes = _d.sent();
                    if (jpRes.rows.length === 0) {
                        // JP equivalent not seeded yet — skip silently (will catch next restart)
                        skipped++;
                        return [3 /*break*/, 13];
                    }
                    setInserted = 0;
                    chunks = [];
                    for (i = 0; i < jpRes.rows.length; i += CARDS_PER_INSERT_BATCH) {
                        chunks.push(jpRes.rows.slice(i, i + CARDS_PER_INSERT_BATCH));
                    }
                    _a = 0, chunks_1 = chunks;
                    _d.label = 4;
                case 4:
                    if (!(_a < chunks_1.length)) return [3 /*break*/, 9];
                    chunk = chunks_1[_a];
                    valueClauses = [];
                    params = [];
                    p = 1;
                    for (_b = 0, chunk_1 = chunk; _b < chunk_1.length; _b++) {
                        jp = chunk_1[_b];
                        newId = toTargetCardId(jp.id, suffix);
                        valueClauses.push("($".concat(p++, ",$").concat(p++, ",$").concat(p++, ",$").concat(p++, ",$").concat(p++, ",$").concat(p++, ",$").concat(p++, ",$").concat(p++, ",$").concat(p++, ",$").concat(p++, ",$").concat(p++, ")"));
                        params.push(newId, setId, jp.name, jp.number, jp.rarity, jp.supertype, jp.subtypes, jp.hp, jp.image_small, // same artwork as JP
                        jp.image_large, jp.artist);
                    }
                    _d.label = 5;
                case 5:
                    _d.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, db_1.pool.query("INSERT INTO pokemon_cards\n             (id, set_id, name, number, rarity, supertype, subtypes, hp,\n              image_small, image_large, artist)\n           VALUES ".concat(valueClauses.join(","), "\n           ON CONFLICT (id) DO NOTHING"), params)];
                case 6:
                    res = _d.sent();
                    count = (_c = res.rowCount) !== null && _c !== void 0 ? _c : 0;
                    setInserted += count;
                    inserted += count;
                    return [3 /*break*/, 8];
                case 7:
                    err_1 = _d.sent();
                    console.error("[KoZhSeed] Batch insert error for ".concat(setId, ":"), err_1.message);
                    errors++;
                    return [3 /*break*/, 8];
                case 8:
                    _a++;
                    return [3 /*break*/, 4];
                case 9:
                    if (!(setInserted > 0)) return [3 /*break*/, 11];
                    return [4 /*yield*/, db_1.pool.query("UPDATE pokemon_sets\n         SET    printed_total = CASE WHEN printed_total IS NULL OR printed_total = 0\n                                     THEN $1 ELSE printed_total END,\n                total         = CASE WHEN total IS NULL OR total = 0\n                                     THEN $1 ELSE total END\n         WHERE  id = $2", [jpRes.rows.length, setId])];
                case 10:
                    _d.sent();
                    _d.label = 11;
                case 11:
                    setsProcessed++;
                    if (setInserted > 0) {
                        log("  \u2713 ".concat(setId, ": ").concat(setInserted, " cards (from ").concat(jpId, ")"));
                    }
                    else if (jpRes.rows.length > 0) {
                        log("  ~ ".concat(setId, ": all ").concat(jpRes.rows.length, " cards already present"));
                    }
                    return [4 /*yield*/, delay(BATCH_PAUSE_MS)];
                case 12:
                    _d.sent();
                    _d.label = 13;
                case 13:
                    _i++;
                    return [3 /*break*/, 2];
                case 14:
                    log("Done \u2014 ".concat(setsProcessed, " sets processed, ").concat(inserted, " cards inserted, ") +
                        "".concat(skipped, " skipped (no JP source), ").concat(errors, " errors"));
                    return [2 /*return*/, { inserted: inserted, skipped: skipped, setsProcessed: setsProcessed, errors: errors }];
            }
        });
    });
}
// ─── Fix specific empty JP sets (swsh5s_ja, swsh6l_ja) ───────────────────────
// These are legitimate SWSH-era Japanese sets. We seed them using their known
// card structures by scraping directly from the Scrydex JP expansion page.
function fixEmptyJpSets(onProgress) {
    return __awaiter(this, void 0, void 0, function () {
        var log, targets, inserted, errors, _i, targets_1, target, countRes, scrapeScrydexSetCards, cards, _a, cards_1, card, _b, err_2, n, cardId, imgSmall, imgLarge, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    log = function (msg) {
                        console.log("[JpFix] ".concat(msg));
                        onProgress === null || onProgress === void 0 ? void 0 : onProgress(msg);
                    };
                    targets = [
                        { setId: "swsh5s_ja", slug: "single-strike-master", cards: 70 },
                        { setId: "swsh6l_ja", slug: "silver-lance", cards: 70 },
                    ];
                    inserted = 0;
                    errors = 0;
                    _i = 0, targets_1 = targets;
                    _d.label = 1;
                case 1:
                    if (!(_i < targets_1.length)) return [3 /*break*/, 22];
                    target = targets_1[_i];
                    return [4 /*yield*/, db_1.pool.query("SELECT COUNT(*) AS n FROM pokemon_cards WHERE set_id = $1", [target.setId])];
                case 2:
                    countRes = _d.sent();
                    if (parseInt(countRes.rows[0].n, 10) > 0) {
                        log("".concat(target.setId, " already has cards \u2014 skipping"));
                        return [3 /*break*/, 21];
                    }
                    log("Seeding ".concat(target.setId, " (").concat(target.cards, " cards via Scrydex pattern)\u2026"));
                    _d.label = 3;
                case 3:
                    _d.trys.push([3, 13, , 14]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require("./scrydex-scraper"); })];
                case 4:
                    scrapeScrydexSetCards = (_d.sent()).scrapeScrydexSetCards;
                    return [4 /*yield*/, scrapeScrydexSetCards(target.slug, target.setId)];
                case 5:
                    cards = _d.sent();
                    if (!(cards.length > 0)) return [3 /*break*/, 12];
                    _a = 0, cards_1 = cards;
                    _d.label = 6;
                case 6:
                    if (!(_a < cards_1.length)) return [3 /*break*/, 11];
                    card = cards_1[_a];
                    _d.label = 7;
                case 7:
                    _d.trys.push([7, 9, , 10]);
                    return [4 /*yield*/, db_1.pool.query("INSERT INTO pokemon_cards (id, set_id, name, number, image_small, image_large)\n               VALUES ($1,$2,$3,$4,$5,$6)\n               ON CONFLICT (id) DO NOTHING", [card.id, target.setId, card.name, card.number, card.imageSmall, card.imageLarge])];
                case 8:
                    _d.sent();
                    inserted++;
                    return [3 /*break*/, 10];
                case 9:
                    _b = _d.sent();
                    errors++;
                    return [3 /*break*/, 10];
                case 10:
                    _a++;
                    return [3 /*break*/, 6];
                case 11:
                    log("  \u2713 ".concat(target.setId, ": ").concat(cards.length, " cards scraped from Scrydex"));
                    return [3 /*break*/, 21];
                case 12: return [3 /*break*/, 14];
                case 13:
                    err_2 = _d.sent();
                    log("  Scrydex scrape failed for ".concat(target.setId, ": ").concat(err_2.message, " \u2014 using URL pattern fallback"));
                    return [3 /*break*/, 14];
                case 14:
                    n = 1;
                    _d.label = 15;
                case 15:
                    if (!(n <= target.cards)) return [3 /*break*/, 20];
                    cardId = "".concat(target.setId, "-").concat(n);
                    imgSmall = "https://images.scrydex.com/pokemon/".concat(cardId, "/medium");
                    imgLarge = "https://images.scrydex.com/pokemon/".concat(cardId, "/large");
                    _d.label = 16;
                case 16:
                    _d.trys.push([16, 18, , 19]);
                    return [4 /*yield*/, db_1.pool.query("INSERT INTO pokemon_cards (id, set_id, name, number, image_small, image_large)\n           VALUES ($1,$2,$3,$4,$5,$6)\n           ON CONFLICT (id) DO NOTHING", [cardId, target.setId, "Card #".concat(n), String(n), imgSmall, imgLarge])];
                case 17:
                    _d.sent();
                    inserted++;
                    return [3 /*break*/, 19];
                case 18:
                    _c = _d.sent();
                    errors++;
                    return [3 /*break*/, 19];
                case 19:
                    n++;
                    return [3 /*break*/, 15];
                case 20:
                    log("  \u2713 ".concat(target.setId, ": ").concat(target.cards, " cards inserted (URL-pattern fallback)"));
                    _d.label = 21;
                case 21:
                    _i++;
                    return [3 /*break*/, 1];
                case 22: return [2 /*return*/, { inserted: inserted, errors: errors }];
            }
        });
    });
}
