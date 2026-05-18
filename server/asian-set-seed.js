"use strict";
/**
 * Asian TCG Set Seeder
 *
 * Inserts Japanese, Korean, and Chinese Pokémon TCG sets into the database.
 * - Japanese: 211 sets scraped from scrydex.com/pokemon/jp/expansions (cards also available on Scrydex)
 * - Korean: SV + SWSH + SM + XY + BW + older eras (comprehensive research-based list)
 * - Chinese (Simplified): XY era through current (research-based list)
 *
 * Sets inserted here will be auto-filled with card data by the Scrydex startup sync
 * (for Japanese sets that Scrydex covers). Korean/Chinese sets will show in Browse tab
 * but may have limited card data until a dedicated card source is connected.
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
exports.TOTAL_ASIAN_SETS = exports.JAPANESE_SET_SLUGS = void 0;
exports.seedAsianSets = seedAsianSets;
var db_1 = require("./db");
var SCRYDEX_IMAGE_BASE = "https://images.scrydex.com/pokemon";
// ─── Helpers ─────────────────────────────────────────────────────────────────
function slugToName(slug) {
    return slug
        .split("-")
        .map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); })
        .join(" ")
        .replace(/\bEx\b/g, "ex")
        .replace(/\bV\b/g, "V")
        .replace(/\bGx\b/g, "GX")
        .replace(/\bVmax\b/g, "VMAX")
        .replace(/\bVstar\b/g, "VSTAR")
        .replace(/\bTag\b/g, "TAG");
}
function inferSeries(id) {
    var lower = id.toLowerCase();
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
    if (lower.startsWith("dp"))
        return "Diamond & Pearl";
    if (lower.startsWith("pt"))
        return "Platinum";
    if (lower.startsWith("hgss") || lower.startsWith("l1") || lower.startsWith("l2") || lower.startsWith("l3"))
        return "HeartGold & SoulSilver";
    if (lower.startsWith("neo"))
        return "Neo";
    if (lower.startsWith("ecard"))
        return "E-Card";
    if (lower.startsWith("ex") || lower.startsWith("pcg") || lower.startsWith("adv"))
        return "EX";
    if (lower.startsWith("gym") || lower.startsWith("base"))
        return "Classic";
    return "Other";
}
// ─── Japanese Sets (211 from scrydex.com/pokemon/jp/expansions) ───────────────
var JAPANESE_SETS = [
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
    { slug: "xy-promos", id: "xyp_ja" },
];
var KOREAN_SETS = [
    // Scarlet & Violet era (2023–present)
    { id: "sv1s_ko", name: "Scarlet ex", releaseDate: "2023-01-20" },
    { id: "sv1v_ko", name: "Violet ex", releaseDate: "2023-01-20" },
    { id: "sv1a_ko", name: "Triplet Beat", releaseDate: "2023-03-10" },
    { id: "sv2d_ko", name: "Clay Burst", releaseDate: "2023-04-21" },
    { id: "sv2p_ko", name: "Snow Hazard", releaseDate: "2023-04-21" },
    { id: "sv2a_ko", name: "Pokémon Card 151", releaseDate: "2023-06-23" },
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
    { id: "swsh10a_ko", name: "Pokémon GO", releaseDate: "2022-07-01" },
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
    { id: "l3_ko", name: "Clash at the Summit", releaseDate: "2010-10-27" },
];
var CHINESE_SETS = [
    // Scarlet & Violet era (2023–present)
    { id: "sv1s_zh", name: "Scarlet ex", releaseDate: "2023-04-14" },
    { id: "sv1v_zh", name: "Violet ex", releaseDate: "2023-04-14" },
    { id: "sv1a_zh", name: "Triplet Beat", releaseDate: "2023-06-16" },
    { id: "sv2d_zh", name: "Clay Burst", releaseDate: "2023-07-21" },
    { id: "sv2p_zh", name: "Snow Hazard", releaseDate: "2023-07-21" },
    { id: "sv2a_zh", name: "Pokémon Card 151", releaseDate: "2023-10-27" },
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
    { id: "xy12_zh", name: "Evolutions", releaseDate: "2017-03-24" },
];
function upsertSet(id, name, series, releaseDate, logoUrl, symbolUrl, total) {
    return __awaiter(this, void 0, void 0, function () {
        var e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, db_1.pool.query("INSERT INTO pokemon_sets (id, name, series, printed_total, total, release_date, logo_url, symbol_url)\n       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)\n       ON CONFLICT (id) DO NOTHING", [id, name, series, total, total, releaseDate || null, logoUrl || null, symbolUrl || null])];
                case 1:
                    _a.sent();
                    return [2 /*return*/, "inserted"];
                case 2:
                    e_1 = _a.sent();
                    console.error("[AsianSeed] Error inserting set ".concat(id, ":"), e_1);
                    return [2 /*return*/, "error"];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function getExistingSetIds() {
    return __awaiter(this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db_1.pool.query("SELECT id FROM pokemon_sets")];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, new Set(result.rows.map(function (r) { return r.id; }))];
            }
        });
    });
}
function seedAsianSets(onProgress) {
    return __awaiter(this, void 0, void 0, function () {
        var result, log, existing, _i, JAPANESE_SETS_1, _a, slug, id, name_1, series, logoUrl, symbolUrl, outcome, _b, KOREAN_SETS_1, set, series, outcome, _c, CHINESE_SETS_1, set, series, outcome;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    result = { inserted: 0, skipped: 0, errors: 0, details: [] };
                    log = function (msg) { result.details.push(msg); onProgress === null || onProgress === void 0 ? void 0 : onProgress(msg); };
                    log("Fetching existing set IDs from DB...");
                    return [4 /*yield*/, getExistingSetIds()];
                case 1:
                    existing = _d.sent();
                    // ── Japanese sets ──
                    log("Inserting ".concat(JAPANESE_SETS.length, " Japanese sets..."));
                    _i = 0, JAPANESE_SETS_1 = JAPANESE_SETS;
                    _d.label = 2;
                case 2:
                    if (!(_i < JAPANESE_SETS_1.length)) return [3 /*break*/, 5];
                    _a = JAPANESE_SETS_1[_i], slug = _a.slug, id = _a.id;
                    if (existing.has(id)) {
                        result.skipped++;
                        return [3 /*break*/, 4];
                    }
                    name_1 = slugToName(slug);
                    series = inferSeries(id);
                    logoUrl = "".concat(SCRYDEX_IMAGE_BASE, "/").concat(id, "-logo/logo");
                    symbolUrl = "".concat(SCRYDEX_IMAGE_BASE, "/").concat(id, "-symbol/symbol");
                    return [4 /*yield*/, upsertSet(id, name_1, series, "", logoUrl, symbolUrl, 0)];
                case 3:
                    outcome = _d.sent();
                    if (outcome === "inserted") {
                        result.inserted++;
                        log("\u2713 JP: ".concat(name_1, " (").concat(id, ")"));
                    }
                    else if (outcome === "error")
                        result.errors++;
                    _d.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    // ── Korean sets ──
                    log("Inserting ".concat(KOREAN_SETS.length, " Korean sets..."));
                    _b = 0, KOREAN_SETS_1 = KOREAN_SETS;
                    _d.label = 6;
                case 6:
                    if (!(_b < KOREAN_SETS_1.length)) return [3 /*break*/, 9];
                    set = KOREAN_SETS_1[_b];
                    if (existing.has(set.id)) {
                        result.skipped++;
                        return [3 /*break*/, 8];
                    }
                    series = inferSeries(set.id);
                    return [4 /*yield*/, upsertSet(set.id, set.name, series, set.releaseDate || "", "", "", 0)];
                case 7:
                    outcome = _d.sent();
                    if (outcome === "inserted") {
                        result.inserted++;
                        log("\u2713 KO: ".concat(set.name, " (").concat(set.id, ")"));
                    }
                    else if (outcome === "error")
                        result.errors++;
                    _d.label = 8;
                case 8:
                    _b++;
                    return [3 /*break*/, 6];
                case 9:
                    // ── Chinese sets ──
                    log("Inserting ".concat(CHINESE_SETS.length, " Chinese sets..."));
                    _c = 0, CHINESE_SETS_1 = CHINESE_SETS;
                    _d.label = 10;
                case 10:
                    if (!(_c < CHINESE_SETS_1.length)) return [3 /*break*/, 13];
                    set = CHINESE_SETS_1[_c];
                    if (existing.has(set.id)) {
                        result.skipped++;
                        return [3 /*break*/, 12];
                    }
                    series = inferSeries(set.id);
                    return [4 /*yield*/, upsertSet(set.id, set.name, series, set.releaseDate || "", "", "", 0)];
                case 11:
                    outcome = _d.sent();
                    if (outcome === "inserted") {
                        result.inserted++;
                        log("\u2713 ZH: ".concat(set.name, " (").concat(set.id, ")"));
                    }
                    else if (outcome === "error")
                        result.errors++;
                    _d.label = 12;
                case 12:
                    _c++;
                    return [3 /*break*/, 10];
                case 13:
                    log("Done. Inserted: ".concat(result.inserted, ", Skipped (already existed): ").concat(result.skipped, ", Errors: ").concat(result.errors));
                    return [2 /*return*/, result];
            }
        });
    });
}
exports.JAPANESE_SET_SLUGS = JAPANESE_SETS;
exports.TOTAL_ASIAN_SETS = JAPANESE_SETS.length + KOREAN_SETS.length + CHINESE_SETS.length;
