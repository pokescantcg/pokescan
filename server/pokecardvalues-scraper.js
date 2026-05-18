"use strict";
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
exports.scrapeSets = scrapeSets;
exports.scrapeSetCards = scrapeSetCards;
exports.scrapeTopCards = scrapeTopCards;
exports.scrapeCardSearch = scrapeCardSearch;
exports.generateEbaySearchUrl = generateEbaySearchUrl;
exports.generateEbaySoldUrl = generateEbaySoldUrl;
var cheerio = require("cheerio");
var card_normalizers_1 = require("./utils/card-normalizers");
var BASE_URL = "https://pokecardvalues.co.uk";
var CDN_BASE = "https://doujkbm8mih0s.cloudfront.net/static/images/alt";
var CACHE_TTL = 1000 * 60 * 60;
var cache = new Map();
function getCached(key) {
    var entry = cache.get(key);
    if (!entry)
        return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}
function setCache(key, data) {
    cache.set(key, { data: data, timestamp: Date.now() });
}
function fetchPage(url) {
    return __awaiter(this, void 0, void 0, function () {
        var res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetch(url, {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (compatible; PokeScanTCG/1.0)",
                            "Accept": "text/html,application/xhtml+xml",
                        },
                    })];
                case 1:
                    res = _a.sent();
                    if (!res.ok)
                        throw new Error("Failed to fetch ".concat(url, ": ").concat(res.status));
                    return [2 /*return*/, res.text()];
            }
        });
    });
}
function parsePrice(text) {
    var match = text.match(/£([\d,]+\.?\d*)/);
    if (!match)
        return null;
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
    "World Championships",
];
function scrapeSets() {
    return __awaiter(this, void 0, void 0, function () {
        var cached, html, $_1, sets_1, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cached = getCached("sets");
                    if (cached)
                        return [2 /*return*/, cached];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetchPage("".concat(BASE_URL, "/sets/"))];
                case 2:
                    html = _a.sent();
                    $_1 = cheerio.load(html);
                    sets_1 = [];
                    $_1("a[href*='/sets/']").each(function (_, el) {
                        var $el = $_1(el);
                        var href = $el.attr("href");
                        if (!href || href === "/sets/" || href === "".concat(BASE_URL, "/sets/"))
                            return;
                        var urlMatch = href.match(/\/sets\/([^/]+)\/([^/]+)\/?$/);
                        if (!urlMatch)
                            return;
                        var setId = urlMatch[1];
                        var slug = urlMatch[2];
                        var text = $el.text().trim();
                        var lines = text.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
                        var name = "";
                        var releaseDate = "";
                        var cardCount = 0;
                        for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                            var line = lines_1[_i];
                            if (line.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)/i)) {
                                releaseDate = line;
                            }
                            else if (line.match(/^\/?\d+$/)) {
                                cardCount = parseInt(line.replace("/", ""), 10);
                            }
                            else if (line.length > 1 && !line.match(/^\d+$/) && !name) {
                                name = line;
                            }
                        }
                        if (!name)
                            return;
                        var $img = $el.find("img");
                        var logoUrl = "";
                        var symbolUrl = "";
                        $img.each(function (_, imgEl) {
                            var src = $_1(imgEl).attr("src") || "";
                            if (src.includes("LOGOS"))
                                logoUrl = src;
                            else if (src.includes("SYMBOLS"))
                                symbolUrl = src;
                        });
                        var series = "Other";
                        for (var _a = 0, SERIES_ORDER_1 = SERIES_ORDER; _a < SERIES_ORDER_1.length; _a++) {
                            var s = SERIES_ORDER_1[_a];
                            if (href.toLowerCase().includes(s.toLowerCase().replace(/ /g, "-")) ||
                                name.toLowerCase().includes(s.toLowerCase())) {
                                series = s;
                                break;
                            }
                        }
                        if (setId.startsWith("sv"))
                            series = "Scarlet & Violet";
                        else if (setId.startsWith("swsh"))
                            series = "Sword & Shield";
                        else if (setId.startsWith("sm"))
                            series = "Sun & Moon";
                        else if (setId.startsWith("xy"))
                            series = "XY";
                        else if (setId.startsWith("bw"))
                            series = "Black & White";
                        else if (setId.startsWith("me"))
                            series = "Mega Evolution";
                        else if (setId.startsWith("neo"))
                            series = "Neo";
                        else if (setId.startsWith("ecard"))
                            series = "E-Card";
                        else if (setId.startsWith("ex"))
                            series = "EX";
                        else if (setId.startsWith("dp"))
                            series = "Diamond & Pearl";
                        else if (setId.startsWith("pl"))
                            series = "Platinum";
                        else if (setId.startsWith("hgss"))
                            series = "HeartGold & SoulSilver";
                        else if (setId.startsWith("gym"))
                            series = "Gym";
                        else if (setId.startsWith("base"))
                            series = "Base";
                        else if (setId.startsWith("pop"))
                            series = "POP Series";
                        else if (setId.startsWith("wc"))
                            series = "World Championships";
                        else if (setId.startsWith("mc"))
                            series = "Other Promos";
                        else if (setId.startsWith("tk"))
                            series = "Other Promos";
                        else if (setId.startsWith("cel"))
                            series = "Sword & Shield";
                        else if (setId.startsWith("tot"))
                            series = "Sword & Shield";
                        else if (setId.startsWith("det"))
                            series = "Sun & Moon";
                        else if (setId.startsWith("col"))
                            series = "Call of Legends";
                        var existing = sets_1.find(function (s) { return s.id === setId && s.slug === slug; });
                        if (existing)
                            return;
                        sets_1.push({
                            id: setId,
                            slug: slug,
                            name: name,
                            series: series,
                            releaseDate: releaseDate,
                            cardCount: cardCount,
                            logoUrl: logoUrl || "".concat(CDN_BASE, "/thumb_lg/LOGOS/").concat(setId, "-logo.png"),
                            symbolUrl: symbolUrl || "".concat(CDN_BASE, "/thumb_xs/SYMBOLS/").concat(setId, "-symbol.png"),
                            url: "".concat(BASE_URL, "/sets/").concat(setId, "/").concat(slug, "/"),
                        });
                    });
                    setCache("sets", sets_1);
                    return [2 /*return*/, sets_1];
                case 3:
                    error_1 = _a.sent();
                    console.error("Failed to scrape sets:", error_1);
                    throw error_1;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function scrapeSetCards(setId, slug) {
    return __awaiter(this, void 0, void 0, function () {
        var cacheKey, cached, html, $_2, cards, jsonLdItems_1, cardContainers, cardIndex, cardLinks, _i, cardLinks_1, el, $el, href, titleDiv, holoEdDiv, priceDiv, $parentContainer, holoEdDivAlt, priceDivAlt, name_1, number, holoType, rarity, edition, priceGBP, titleText, nameNumMatch, ldName, parts, holoEdText, holoEdLines, rarityEdMatch, priceText, fullText, lines, nameNumMatch2, _a, lines_2, line, rarityEdMatch2, $img, imageUrl, error_2;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    cacheKey = "set-cards-".concat(setId, "-").concat(slug);
                    cached = getCached(cacheKey);
                    if (cached)
                        return [2 /*return*/, cached];
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetchPage("".concat(BASE_URL, "/sets/").concat(setId, "/").concat(slug, "/"))];
                case 2:
                    html = _c.sent();
                    $_2 = cheerio.load(html);
                    cards = [];
                    jsonLdItems_1 = [];
                    $_2('script[type="application/ld+json"]').each(function (_, el) {
                        try {
                            var json = JSON.parse($_2(el).html() || "{}");
                            if (json["@type"] === "ItemList" && json.itemListElement) {
                                for (var _i = 0, _a = json.itemListElement; _i < _a.length; _i++) {
                                    var item = _a[_i];
                                    if (item["@type"] === "ListItem" && item.name) {
                                        jsonLdItems_1.push({ name: item.name, url: item.url || "" });
                                    }
                                }
                            }
                        }
                        catch (_b) { }
                    });
                    cardContainers = $_2(".card-title-info").closest("a[href*='/cards/'], div").parent();
                    cardIndex = 0;
                    cardLinks = $_2("a[href*='/cards/']").toArray();
                    for (_i = 0, cardLinks_1 = cardLinks; _i < cardLinks_1.length; _i++) {
                        el = cardLinks_1[_i];
                        $el = $_2(el);
                        href = $el.attr("href") || "";
                        if (!href.includes("/cards/"))
                            continue;
                        titleDiv = $el.find(".card-title-info");
                        holoEdDiv = $el.find(".card-holo-edition-info");
                        priceDiv = $el.find(".price-info");
                        $parentContainer = $el.parent();
                        holoEdDivAlt = $parentContainer.find(".card-holo-edition-info");
                        priceDivAlt = $parentContainer.find(".price-info");
                        name_1 = "";
                        number = "";
                        holoType = "";
                        rarity = "";
                        edition = "";
                        priceGBP = null;
                        titleText = titleDiv.text().trim();
                        if (titleText) {
                            nameNumMatch = titleText.match(/^(.+?)\s*-\s*(\S+)/);
                            if (nameNumMatch) {
                                name_1 = nameNumMatch[1].trim();
                                number = nameNumMatch[2];
                            }
                            else {
                                name_1 = titleText;
                            }
                        }
                        if (!name_1 && jsonLdItems_1[cardIndex]) {
                            ldName = jsonLdItems_1[cardIndex].name;
                            parts = ldName.split(" - ");
                            if (parts.length >= 2) {
                                name_1 = parts[0].trim();
                                number = parts[1].trim();
                                if (parts.length >= 3)
                                    holoType = parts[2].trim().replace(/\\u002D/g, "-");
                                if (parts.length >= 4)
                                    edition = parts[3].trim();
                                if (parts.length >= 5)
                                    rarity = parts[4].trim().replace(" - Pokémon Card", "");
                            }
                        }
                        holoEdText = (holoEdDiv.length ? holoEdDiv : holoEdDivAlt).html() || "";
                        holoEdLines = holoEdText.split("<br>").map(function (l) { return cheerio.load(l).text().trim(); }).filter(Boolean);
                        if (holoEdLines.length >= 1 && !holoType) {
                            holoType = holoEdLines[0];
                        }
                        if (holoEdLines.length >= 2) {
                            rarityEdMatch = holoEdLines[1].match(/^(.+?)\s*-\s*(.+)$/);
                            if (rarityEdMatch) {
                                rarity = rarityEdMatch[1].trim();
                                edition = rarityEdMatch[2].trim();
                            }
                            else {
                                rarity = holoEdLines[1];
                            }
                        }
                        priceText = (priceDiv.length ? priceDiv : priceDivAlt).text().trim();
                        if (priceText) {
                            priceGBP = parsePrice(priceText);
                        }
                        if (!name_1) {
                            fullText = $el.text().trim();
                            lines = fullText.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
                            nameNumMatch2 = (_b = lines[0]) === null || _b === void 0 ? void 0 : _b.match(/^(.+?)\s*-\s*(\S+)/);
                            if (nameNumMatch2) {
                                name_1 = nameNumMatch2[1].trim();
                                number = nameNumMatch2[2];
                            }
                            for (_a = 0, lines_2 = lines; _a < lines_2.length; _a++) {
                                line = lines_2[_a];
                                if (line.match(/^(Non-Holo|Holo|Reverse Holo)$/i) && !holoType)
                                    holoType = line;
                                if (line.match(/NM\/M Value:/i) && priceGBP === null)
                                    priceGBP = parsePrice(line);
                                rarityEdMatch2 = line.match(/^(Common|Uncommon|Rare|Double Rare|Ultra Rare|Special Illustration Rare|Hyper Rare|ACE SPEC Rare|Promo|Secret Rare|Shining Rare Holo|Rare Holo|Rare Ultra|Rare Rainbow)\s*-\s*(.+)$/i);
                                if (rarityEdMatch2 && !rarity) {
                                    rarity = rarityEdMatch2[1];
                                    edition = rarityEdMatch2[2];
                                }
                            }
                        }
                        if (!name_1) {
                            cardIndex++;
                            continue;
                        }
                        $img = $el.find("img");
                        imageUrl = $img.first().attr("src") || "";
                        cards.push({
                            name: name_1,
                            number: number,
                            holoType: holoType,
                            rarity: rarity,
                            edition: edition,
                            normalizedFinishType: (0, card_normalizers_1.normalizeFinishType)(holoType),
                            normalizedEditionType: (0, card_normalizers_1.normalizeEdition)(edition),
                            priceGBP: priceGBP,
                            url: href.startsWith("http")
                                ? href
                                : "".concat(BASE_URL).concat(href),
                            setName: slug.replace(/-/g, " "),
                            setId: setId,
                            imageUrl: imageUrl,
                        });
                        cardIndex++;
                    }
                    setCache(cacheKey, cards);
                    return [2 /*return*/, cards];
                case 3:
                    error_2 = _c.sent();
                    console.error("Failed to scrape set cards for ".concat(setId, ":"), error_2);
                    throw error_2;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function scrapeTopCards() {
    return __awaiter(this, arguments, void 0, function (condition) {
        var cacheKey, cached, validConditions, cond, html, $_3, topCards_1, rank_1, error_3;
        if (condition === void 0) { condition = "ungraded"; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cacheKey = "top-cards-".concat(condition);
                    cached = getCached(cacheKey);
                    if (cached)
                        return [2 /*return*/, cached];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    validConditions = ["ungraded", "psa8", "psa9", "psa10"];
                    cond = validConditions.includes(condition) ? condition : "ungraded";
                    return [4 /*yield*/, fetchPage("".concat(BASE_URL, "/prices/").concat(cond, "/"))];
                case 2:
                    html = _a.sent();
                    $_3 = cheerio.load(html);
                    topCards_1 = [];
                    rank_1 = 0;
                    $_3("a[href*='/cards/']").each(function (_, el) {
                        var $el = $_3(el);
                        var href = $el.attr("href") || "";
                        if (!href.includes("/cards/"))
                            return;
                        rank_1++;
                        var text = $el.text().trim();
                        var lines = text.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
                        var name = "";
                        var number = "";
                        var rarity = "";
                        var holoType = "";
                        var edition = "";
                        var setName = "";
                        var priceGBP = 0;
                        for (var _i = 0, lines_3 = lines; _i < lines_3.length; _i++) {
                            var line = lines_3[_i];
                            var nameNumMatch = line.match(/^(.+?)\s*-\s*(\S+)/);
                            if (nameNumMatch && !name) {
                                name = nameNumMatch[1].trim();
                                number = nameNumMatch[2];
                            }
                            if (line.match(/NM \/ M Value:|NM\/M Value:/i)) {
                                var p = parsePrice(line);
                                if (p)
                                    priceGBP = p;
                            }
                            var rarityMatch = line.match(/^(Rare Holo|Rare Ultra|Rare Rainbow|Secret Rare|Special Illustration Rare|Shining Rare Holo|Promo|Rare Holo EX)\s*-\s*(.+)$/i);
                            if (rarityMatch) {
                                rarity = rarityMatch[1];
                                holoType = rarityMatch[2];
                            }
                            var edSetMatch = line.match(/^(Unlimited|1st Edition|Shadowless|1999-2000 Print|Worlds Promo|Staff Prerelease|Stamp Promo|National Championships|Top Sixteen Worlds Promo)\s*-\s*(.+)$/i);
                            if (edSetMatch) {
                                edition = edSetMatch[1];
                                setName = edSetMatch[2];
                            }
                        }
                        if (!name || priceGBP === 0)
                            return;
                        var $img = $el.find("img");
                        var imageUrl = $img.first().attr("src") || "";
                        topCards_1.push({
                            rank: rank_1,
                            name: name,
                            number: number,
                            rarity: rarity,
                            holoType: holoType,
                            edition: edition,
                            setName: setName,
                            priceGBP: priceGBP,
                            url: href.startsWith("http") ? href : "".concat(BASE_URL).concat(href),
                            imageUrl: imageUrl,
                        });
                    });
                    setCache(cacheKey, topCards_1);
                    return [2 /*return*/, topCards_1];
                case 3:
                    error_3 = _a.sent();
                    console.error("Failed to scrape top cards:", error_3);
                    throw error_3;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function scrapeCardSearch(query) {
    return __awaiter(this, void 0, void 0, function () {
        var cacheKey, cached, html, $_4, cards_1, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cacheKey = "search-".concat(query.toLowerCase());
                    cached = getCached(cacheKey);
                    if (cached)
                        return [2 /*return*/, cached];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetchPage("".concat(BASE_URL, "/search/?q=").concat(encodeURIComponent(query)))];
                case 2:
                    html = _a.sent();
                    $_4 = cheerio.load(html);
                    cards_1 = [];
                    $_4("a[href*='/cards/']").each(function (_, el) {
                        var _a;
                        var $el = $_4(el);
                        var href = $el.attr("href") || "";
                        if (!href.includes("/cards/"))
                            return;
                        var text = $el.text().trim();
                        var lines = text.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
                        var name = "";
                        var number = "";
                        var holoType = "";
                        var rarity = "";
                        var edition = "";
                        var setName = "";
                        var priceGBP = null;
                        var nameNumMatch = (_a = lines[0]) === null || _a === void 0 ? void 0 : _a.match(/^(.+?)\s*-\s*(\S+)/);
                        if (nameNumMatch) {
                            name = nameNumMatch[1].trim();
                            number = nameNumMatch[2];
                        }
                        for (var _i = 0, lines_4 = lines; _i < lines_4.length; _i++) {
                            var line = lines_4[_i];
                            if (line.match(/^(Non-Holo|Holo|Reverse Holo)$/i)) {
                                holoType = line;
                            }
                            if (line.match(/NM\/M Value:/i)) {
                                priceGBP = parsePrice(line);
                            }
                            var rarityEdMatch = line.match(/^(.+?)\s*-\s*(Unlimited|1st Edition|Shadowless|Poke Ball|Master Ball|Stamp Promo)$/i);
                            if (rarityEdMatch && !rarity) {
                                rarity = rarityEdMatch[1];
                                edition = rarityEdMatch[2];
                            }
                        }
                        var slugParts = href.replace(/^\/cards\//, "").replace(/\/$/, "").split("/")[0] || "";
                        if (!holoType) {
                            if (slugParts.includes("holo-reverse") || slugParts.includes("reverse-holo"))
                                holoType = "Reverse Holo";
                            else if (slugParts.includes("non-holo"))
                                holoType = "Non-Holo";
                            else if (slugParts.includes("holo"))
                                holoType = "Holo";
                        }
                        if (!edition) {
                            if (slugParts.includes("1st-edition"))
                                edition = "1st Edition";
                            else if (slugParts.includes("shadowless"))
                                edition = "Shadowless";
                            else if (slugParts.includes("unlimited"))
                                edition = "Unlimited";
                        }
                        if (!setName) {
                            var setMatch = slugParts.match(/(?:unlimited|shadowless|1st-edition|holo|non-holo|reverse-holo)-(.+)$/);
                            if (setMatch) {
                                setName = setMatch[1].replace(/-\d+$/, "").split("-").map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(" ");
                            }
                        }
                        if (!name)
                            return;
                        var $source = $el.find("source[data-srcset]").first();
                        var $img = $el.find("img");
                        var imageUrl = $source.attr("data-srcset") || $img.first().attr("data-src") || $img.first().attr("src") || "";
                        cards_1.push({
                            name: name,
                            number: number,
                            holoType: holoType,
                            rarity: rarity,
                            edition: edition,
                            priceGBP: priceGBP,
                            url: href.startsWith("http") ? href : "".concat(BASE_URL).concat(href),
                            setName: setName,
                            setId: "",
                            imageUrl: imageUrl,
                        });
                    });
                    setCache(cacheKey, cards_1);
                    return [2 /*return*/, cards_1];
                case 3:
                    error_4 = _a.sent();
                    console.error("Failed to search cards:", error_4);
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function generateEbaySearchUrl(cardName, setName, number) {
    var query = "pokemon card ".concat(cardName);
    if (setName)
        query += " ".concat(setName);
    if (number)
        query += " ".concat(number);
    return "https://www.ebay.co.uk/sch/i.html?_nkw=".concat(encodeURIComponent(query), "&_sacat=183454&LH_PrefLoc=1");
}
function generateEbaySoldUrl(cardName, setName, number) {
    var query = "pokemon card ".concat(cardName);
    if (setName)
        query += " ".concat(setName);
    if (number)
        query += " ".concat(number);
    return "https://www.ebay.co.uk/sch/i.html?_nkw=".concat(encodeURIComponent(query), "&_sacat=183454&LH_PrefLoc=1&LH_Complete=1&LH_Sold=1");
}
