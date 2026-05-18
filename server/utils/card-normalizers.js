"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeFinishType = normalizeFinishType;
exports.normalizeEdition = normalizeEdition;
exports.createVariantId = createVariantId;
function normalizeFinishType(raw) {
    var s = (raw || "").toLowerCase();
    if (s.includes("master ball"))
        return "master_ball";
    if (s.includes("poke ball"))
        return "poke_ball";
    if (s.includes("staff"))
        return "staff_stamp";
    if (s.includes("prerelease"))
        return "prerelease_stamp";
    if (s.includes("winner"))
        return "winner_stamp";
    if (s.includes("league"))
        return "league_stamp";
    if (s.includes("champion"))
        return "champion_stamp";
    if (s.includes("stamp"))
        return "set_stamp";
    if (s.includes("reverse"))
        return "reverse_holo";
    if (s.includes("cosmos"))
        return "cosmos_holo";
    if (s.includes("cracked"))
        return "cracked_ice";
    if (s.includes("holo"))
        return "holo";
    if (s.includes("non"))
        return "non_holo";
    return "normal";
}
function normalizeEdition(raw) {
    var s = (raw || "").toLowerCase();
    if (s.includes("1st"))
        return "1st_edition";
    if (s.includes("shadowless"))
        return "shadowless";
    if (s.includes("unlimited"))
        return "unlimited";
    return "standard";
}
function createVariantId(cardId, finishType, editionType, language) {
    return "".concat(cardId, "_").concat(finishType, "_").concat(editionType, "_").concat(language)
        .toLowerCase()
        .replace(/\s+/g, "_");
}
