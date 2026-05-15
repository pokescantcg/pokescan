export function normalizeFinishType(raw?: string): string {
  const s = (raw || "").toLowerCase();

  if (s.includes("master ball")) return "master_ball";
  if (s.includes("poke ball")) return "poke_ball";
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
  language: string
): string {
  return `${cardId}_${finishType}_${editionType}_${language}`
    .toLowerCase()
    .replace(/\s+/g, "_");
}