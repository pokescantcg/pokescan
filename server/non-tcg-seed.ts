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

import { pool } from "./db";

// ─── Dataset ─────────────────────────────────────────────────────────────────

interface NonTcgSet {
  id: string;
  name: string;
  series: string;
  releaseDate: string;
  logoUrl: string;
  total: number;
  note?: string;
}

// Pokémon Babanuki (ポケモンババ抜き) — official Old Maid card game by The Pokémon Company
// Source: https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Babanuki
const BABANUKI_SETS: NonTcgSet[] = [
  {
    id: "babanuki-v1_ja",
    name: "Pokémon Babanuki",
    series: "Non-TCG",
    releaseDate: "2019-05-11",
    logoUrl:
      "https://archives.bulbagarden.net/media/upload/a/ac/Pok%C3%A9mon_Babanuki_box_art.png",
    total: 0,
    note:
      "Official Old Maid card game by The Pokémon Company. Released exclusively at Pokémon Center stores in Japan. Ages 4+, 3–6 players.",
  },
  {
    id: "babanuki-v2_ja",
    name: "Pokémon Babanuki Super High Tension",
    series: "Non-TCG",
    releaseDate: "2023-08-03",
    logoUrl:
      "https://archives.bulbagarden.net/media/upload/8/85/Pok%C3%A9mon_Babanuki_Super_High_Tension_box_art.png",
    total: 0,
    note:
      "Second version of the official Pokémon Old Maid card game. Released at Pokémon Center stores in Japan. Ages 4+, 3–6 players.",
  },
];

// Mengka — Chinese fan/unofficial Pokémon card brand with multiple serialised series.
// Card counts are verified from eBay UK complete-set listings (April 2026).
// Mengka is not affiliated with or licensed by Nintendo / The Pokémon Company.
const MENGKA_SETS: NonTcgSet[] = [
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
const ALL_NON_TCG_SETS: NonTcgSet[] = [...BABANUKI_SETS, ...MENGKA_SETS];

// ─── Upsert helper ────────────────────────────────────────────────────────────

async function upsertNonTcgSet(set: NonTcgSet): Promise<"inserted" | "skipped" | "error"> {
  try {
    const result = await pool.query(
      `INSERT INTO pokemon_sets (id, name, series, printed_total, total, release_date, logo_url, symbol_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [
        set.id,
        set.name,
        set.series,
        set.total,
        set.total,
        set.releaseDate || null,
        set.logoUrl || null,
        null,
      ]
    );
    const inserted = (result.rowCount ?? 0) > 0;
    return inserted ? "inserted" : "skipped";
  } catch (e) {
    console.error(`[NonTcgSeed] Error inserting ${set.id}:`, e);
    return "error";
  }
}

// ─── Public function ──────────────────────────────────────────────────────────

export interface NonTcgSeedResult {
  inserted: number;
  skipped: number;
  errors: number;
  details: string[];
}

export async function seedNonTcgSets(
  onProgress?: (msg: string) => void
): Promise<NonTcgSeedResult> {
  const result: NonTcgSeedResult = { inserted: 0, skipped: 0, errors: 0, details: [] };
  const log = (msg: string) => { result.details.push(msg); onProgress?.(msg); };

  log(`[NonTcgSeed] Seeding ${ALL_NON_TCG_SETS.length} non-TCG sets...`);

  for (const set of ALL_NON_TCG_SETS) {
    const outcome = await upsertNonTcgSet(set);
    if (outcome === "inserted") {
      result.inserted++;
      log(`✓ Non-TCG: ${set.name} (${set.id})${set.total > 0 ? ` — ${set.total} cards` : ""}`);
    } else if (outcome === "skipped") {
      result.skipped++;
    } else {
      result.errors++;
    }
  }

  log(
    `[NonTcgSeed] Done. Inserted: ${result.inserted}, Skipped: ${result.skipped}, Errors: ${result.errors}`
  );
  return result;
}
