"use strict";
/**
 * Non-TCG Set Seeder
 *
 * Inserts officially-licensed and fan/unofficial Pokémon card sets that are
 * NOT part of the standard Pokémon TCG into the database. These appear in
 * the app's "Non-TCG 🎴" Browse tab category.
 *
 * Sources:
 *  - Pokémon Babanuki: Bulbapedia (https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Babanuki)
 *  - Mengka series card counts: eBay UK completed/active listings (April 2026)
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
exports.seedNonTcgSets = seedNonTcgSets;
var db_1 = require("./db");
// Pokémon Babanuki (ポケモンババ抜き) — official Old Maid card game by The Pokémon Company
// Source: https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Babanuki
var BABANUKI_SETS = [
    {
        id: "babanuki-v1_ja",
        name: "Pokémon Babanuki",
        series: "Non-TCG",
        releaseDate: "2019-05-11",
        logoUrl: "https://archives.bulbagarden.net/media/upload/a/ac/Pok%C3%A9mon_Babanuki_box_art.png",
        total: 0,
        note: "Official Old Maid card game by The Pokémon Company. Released exclusively at Pokémon Center stores in Japan. Ages 4+, 3–6 players.",
    },
    {
        id: "babanuki-v2_ja",
        name: "Pokémon Babanuki Super High Tension",
        series: "Non-TCG",
        releaseDate: "2023-08-03",
        logoUrl: "https://archives.bulbagarden.net/media/upload/8/85/Pok%C3%A9mon_Babanuki_Super_High_Tension_box_art.png",
        total: 0,
        note: "Second version of the official Pokémon Old Maid card game. Released at Pokémon Center stores in Japan. Ages 4+, 3–6 players.",
    },
];
// Mengka — Chinese fan/unofficial Pokémon card brand with multiple serialised series.
// Card counts are verified from eBay UK complete-set listings (April 2026).
// Mengka is not affiliated with or licensed by Nintendo / The Pokémon Company.
var MENGKA_SETS = [
    {
        id: "mengka-oor",
        name: "Mengka OOR Series",
        series: "Non-TCG",
        releaseDate: "",
        logoUrl: "",
        total: 19,
        note: "Chinese fan card set. OOR-001 through OOR-019 documented from eBay listings.",
    },
    {
        id: "mengka-sr",
        name: "Mengka SR Series",
        series: "Non-TCG",
        releaseDate: "",
        logoUrl: "",
        total: 20,
        note: "Chinese fan card set. Complete set of 20 cards verified from eBay listings.",
    },
    {
        id: "mengka-hr",
        name: "Mengka HR Series",
        series: "Non-TCG",
        releaseDate: "",
        logoUrl: "",
        total: 12,
        note: "Chinese fan card set. Complete set of 12 cards verified from eBay listings.",
    },
    {
        id: "mengka-ar",
        name: "Mengka AR Eeveelution Series",
        series: "Non-TCG",
        releaseDate: "",
        logoUrl: "",
        total: 9,
        note: "Chinese fan card set. Eevee & Eeveelutions themed. 9 cards (AR-001 to AR-009) verified from eBay.",
    },
    {
        id: "mengka-ur",
        name: "Mengka UR Series",
        series: "Non-TCG",
        releaseDate: "",
        logoUrl: "",
        total: 9,
        note: "Chinese fan card set. UR-001 through UR-009 documented from eBay listings.",
    },
    {
        id: "mengka-dr",
        name: "Mengka DR Series",
        series: "Non-TCG",
        releaseDate: "",
        logoUrl: "",
        total: 9,
        note: "Chinese fan card set. DR-001 through DR-009 documented from eBay listings.",
    },
    {
        id: "mengka-rs",
        name: "Mengka RS Series",
        series: "Non-TCG",
        releaseDate: "",
        logoUrl: "",
        total: 15,
        note: "Chinese fan card set. 15-card lot confirmed from eBay listings.",
    },
    {
        id: "mengka-xr",
        name: "Mengka XR Travel Series",
        series: "Non-TCG",
        releaseDate: "",
        logoUrl: "",
        total: 7,
        note: "Chinese fan card set. Travel-themed series of 7 cards verified from eBay.",
    },
    {
        id: "mengka-trainer",
        name: "Mengka Trainer Series",
        series: "Non-TCG",
        releaseDate: "",
        logoUrl: "",
        total: 9,
        note: "Chinese fan card set. Trainer Waifu edition, 9 cards verified from eBay.",
    },
    {
        id: "mengka-travel",
        name: "Mengka Pokémon Travel",
        series: "Non-TCG",
        releaseDate: "",
        logoUrl: "",
        total: 10,
        note: "Chinese fan card set. Pokémon Travel edition, 10-card complete set from eBay.",
    },
];
// All non-TCG sets combined
var ALL_NON_TCG_SETS = __spreadArray(__spreadArray([], BABANUKI_SETS, true), MENGKA_SETS, true);
// ─── Upsert helper ────────────────────────────────────────────────────────────
function upsertNonTcgSet(set) {
    return __awaiter(this, void 0, void 0, function () {
        var result, inserted, e_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, db_1.pool.query("INSERT INTO pokemon_sets (id, name, series, printed_total, total, release_date, logo_url, symbol_url)\n       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)\n       ON CONFLICT (id) DO NOTHING", [
                            set.id,
                            set.name,
                            set.series,
                            set.total,
                            set.total,
                            set.releaseDate || null,
                            set.logoUrl || null,
                            null,
                        ])];
                case 1:
                    result = _b.sent();
                    inserted = ((_a = result.rowCount) !== null && _a !== void 0 ? _a : 0) > 0;
                    return [2 /*return*/, inserted ? "inserted" : "skipped"];
                case 2:
                    e_1 = _b.sent();
                    console.error("[NonTcgSeed] Error inserting ".concat(set.id, ":"), e_1);
                    return [2 /*return*/, "error"];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function seedNonTcgSets(onProgress) {
    return __awaiter(this, void 0, void 0, function () {
        var result, log, _i, ALL_NON_TCG_SETS_1, set, outcome;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    result = { inserted: 0, skipped: 0, errors: 0, details: [] };
                    log = function (msg) { result.details.push(msg); onProgress === null || onProgress === void 0 ? void 0 : onProgress(msg); };
                    log("[NonTcgSeed] Seeding ".concat(ALL_NON_TCG_SETS.length, " non-TCG sets..."));
                    _i = 0, ALL_NON_TCG_SETS_1 = ALL_NON_TCG_SETS;
                    _a.label = 1;
                case 1:
                    if (!(_i < ALL_NON_TCG_SETS_1.length)) return [3 /*break*/, 4];
                    set = ALL_NON_TCG_SETS_1[_i];
                    return [4 /*yield*/, upsertNonTcgSet(set)];
                case 2:
                    outcome = _a.sent();
                    if (outcome === "inserted") {
                        result.inserted++;
                        log("\u2713 Non-TCG: ".concat(set.name, " (").concat(set.id, ")").concat(set.total > 0 ? " \u2014 ".concat(set.total, " cards") : ""));
                    }
                    else if (outcome === "skipped") {
                        result.skipped++;
                    }
                    else {
                        result.errors++;
                    }
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    log("[NonTcgSeed] Done. Inserted: ".concat(result.inserted, ", Skipped: ").concat(result.skipped, ", Errors: ").concat(result.errors));
                    return [2 /*return*/, result];
            }
        });
    });
}
