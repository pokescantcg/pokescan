export function normalizeFinishType(raw?: string): string {
  const s = (raw || "").toLowerCase();

  if (s.includes("master ball")) return "master_ball";
  if (s.includes("poke ball")) return "poke_ball";
  if (s.includes("staff")) return "staff_stamp";
  if (s.includes("prerelease")) return "prerelease_stamp";
  if (s.includes("winner")) return "winner_stamp";
  if (s.includes("league")) return "league_stamp";
  if (s.includes("champion")) return "champion_stamp";
  if (s.includes("stamp")) return "set_stamp";
  if (s.includes("reverse")) return "reverse_holo";
  if (s.includes("cosmos")) return "cosmos_holo";
  if (s.includes("cracked")) return "cracked_ice";
  if (s.includes("holo")) return "holo";
  if (s.includes("non")) return "non_holo";

  return "normal";
}

export function normalizeEdition(raw?: string): string {
  const s = (raw || "").toLowerCase();

  if (s.includes("1st")) return "1st_edition";
  if (s.includes("shadowless")) return "shadowless";
  if (s.includes("unlimited")) return "unlimited";

  return "standard";
}

export function createVariantId(
  cardId: string,
  finishType: string,
  editionType: string,
  language: string,
): string {
  return `${cardId}_${finishType}_${editionType}_${language}`
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/** Human-readable label shown in the app UI */
export function buildVariantLabel(
  finishType: string,
  editionType: string,
): string {
  const finishMap: Record<string, string> = {
    normal: "Non-Holo",
    non_holo: "Non-Holo",
    holo: "Holo",
    reverse_holo: "Reverse Holo",
    cosmos_holo: "Cosmos Holo",
    cracked_ice: "Cracked Ice",
    master_ball: "Master Ball",
    poke_ball: "Poké Ball",
    staff_stamp: "Staff Stamp",
    prerelease_stamp: "Prerelease Stamp",
    winner_stamp: "Winner Stamp",
    league_stamp: "League Stamp",
    champion_stamp: "Champion Stamp",
    set_stamp: "Set Stamp",
  };

  const editionMap: Record<string, string> = {
    standard: "",
    unlimited: "",
    "1st_edition": "1st Edition",
    shadowless: "Shadowless",
  };

  const finish = finishMap[finishType] || finishType;
  const edition = editionMap[editionType] ?? editionType;

  return edition ? `${finish} (${edition})` : finish;
}
