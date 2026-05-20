/**
 * Pokemon TCG Set Database
 * ========================
 * Complete mapping of every English Pokemon TCG set with:
 *   - PTCGO code (printed on the card bottom-right, e.g. "MEW", "SVI")
 *   - Pokemon TCG API set ID (used in API queries, e.g. "sv3pt5", "sv1")
 *   - pokesymbols.com slug (used to build symbol/logo image URLs)
 *   - Set name, series, release year
 *
 * Symbol image URL pattern:
 *   https://pokesymbols.com/images/tcg/sets/symbols/{slug}.png
 * Logo image URL pattern:
 *   https://pokesymbols.com/images/tcg/sets/logos/{slug}.png
 *
 * Sources:
 *   - https://pokesymbols.com/tcg/sets  (symbol images + PTCGO codes)
 *   - https://api.pokemontcg.io/v2/sets (API set IDs)
 */

export interface SetInfo {
  /** Full English set name */
  name: string;
  /** Pokemon TCG API set ID, used in API queries */
  apiId: string;
  /** PTCGO code printed on the card (e.g. "MEW"). null if none printed. */
  ptcgoCode: string | null;
  /** pokesymbols.com slug — used to build symbol/logo URLs */
  slug: string;
  /** Era / series name */
  series: string;
  /** Release year */
  year: number;
}

const SYMBOL_BASE = "https://pokesymbols.com/images/tcg/sets/symbols";
const LOGO_BASE   = "https://pokesymbols.com/images/tcg/sets/logos";

/** Returns the URL of the set symbol PNG from pokesymbols.com */
export function getSymbolUrl(slug: string): string {
  return `${SYMBOL_BASE}/${slug}.png`;
}

/** Returns the URL of the set logo PNG from pokesymbols.com */
export function getLogoUrl(slug: string): string {
  return `${LOGO_BASE}/${slug}.png`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTER SET LIST — ordered newest → oldest
// ─────────────────────────────────────────────────────────────────────────────
export const ALL_SETS: SetInfo[] = [

  // ── Scarlet & Violet era ─────────────────────────────────────────────────

  { name: "Perfect Order",                          apiId: "sv9",        ptcgoCode: "PRO",  slug: "perfect-order",                          series: "Scarlet & Violet", year: 2026 },
  { name: "Ascended Heroes",                        apiId: "sv8pt5",     ptcgoCode: "ASH",  slug: "ascended-heroes",                        series: "Scarlet & Violet", year: 2026 },
  { name: "Phantasmal Flames",                      apiId: "sv8",        ptcgoCode: "PHF",  slug: "phantasmal-flames",                      series: "Scarlet & Violet", year: 2025 },
  { name: "Mega Evolution",                         apiId: "sv7pt5",     ptcgoCode: "MEG",  slug: "mega-evolution",                         series: "Scarlet & Violet", year: 2025 },
  { name: "Black Bolt",                             apiId: "sv7b",       ptcgoCode: "BLB",  slug: "black-bolt",                             series: "Scarlet & Violet", year: 2025 },
  { name: "White Flare",                            apiId: "sv7a",       ptcgoCode: "WHF",  slug: "white-flare",                            series: "Scarlet & Violet", year: 2025 },
  { name: "Destined Rivals",                        apiId: "sv6pt5",     ptcgoCode: "DRI",  slug: "destined-rivals",                        series: "Scarlet & Violet", year: 2025 },
  { name: "Journey Together",                       apiId: "sv6",        ptcgoCode: "JTG",  slug: "journey-together",                       series: "Scarlet & Violet", year: 2025 },
  { name: "Prismatic Evolutions",                   apiId: "sv8pt5",     ptcgoCode: "PRE",  slug: "prismatic-evolutions",                   series: "Scarlet & Violet", year: 2025 },
  { name: "Surging Sparks",                         apiId: "sv8",        ptcgoCode: "SSP",  slug: "surging-sparks",                         series: "Scarlet & Violet", year: 2024 },
  { name: "Stellar Crown",                          apiId: "sv7",        ptcgoCode: "SCR",  slug: "stellar-crown",                          series: "Scarlet & Violet", year: 2024 },
  { name: "Shrouded Fable",                         apiId: "sv6pt5",     ptcgoCode: "SFA",  slug: "shrouded-fable",                         series: "Scarlet & Violet", year: 2024 },
  { name: "Twilight Masquerade",                    apiId: "sv6",        ptcgoCode: "TWM",  slug: "twilight-masquerade",                    series: "Scarlet & Violet", year: 2024 },
  { name: "Temporal Forces",                        apiId: "sv5",        ptcgoCode: "TEF",  slug: "temporal-forces",                        series: "Scarlet & Violet", year: 2024 },
  { name: "Paldean Fates",                          apiId: "sv4pt5",     ptcgoCode: "PAF",  slug: "paldean-fates",                          series: "Scarlet & Violet", year: 2024 },
  { name: "Paradox Rift",                           apiId: "sv4",        ptcgoCode: "PAR",  slug: "paradox-rift",                           series: "Scarlet & Violet", year: 2023 },
  { name: "151",                                    apiId: "sv3pt5",     ptcgoCode: "MEW",  slug: "151",                                    series: "Scarlet & Violet", year: 2023 },
  { name: "Obsidian Flames",                        apiId: "sv3",        ptcgoCode: "OBF",  slug: "obsidian-flames",                        series: "Scarlet & Violet", year: 2023 },
  { name: "Paldea Evolved",                         apiId: "sv2",        ptcgoCode: "PAL",  slug: "paldea-evolved",                         series: "Scarlet & Violet", year: 2023 },
  { name: "Scarlet & Violet",                       apiId: "sv1",        ptcgoCode: "SVI",  slug: "scarlet-and-violet",                     series: "Scarlet & Violet", year: 2023 },
  { name: "Scarlet & Violet Energies",              apiId: "sve",        ptcgoCode: null,   slug: "scarlet-and-violet-energies",            series: "Scarlet & Violet", year: 2023 },
  { name: "Scarlet & Violet Black Star Promos",     apiId: "svp",        ptcgoCode: "SVP",  slug: "scarlet-and-violet-black-star-promos",   series: "Scarlet & Violet", year: 2023 },
  { name: "McDonald's Collection 2024",             apiId: "mcd24",      ptcgoCode: null,   slug: "mc-donalds-collection-2024",             series: "Scarlet & Violet", year: 2024 },
  { name: "McDonald's Collection 2023",             apiId: "mcd23",      ptcgoCode: null,   slug: "mc-donalds-collection-2023",             series: "Scarlet & Violet", year: 2023 },

  // ── Pokémon Trading Card Game Classic ────────────────────────────────────

  { name: "Pokémon TCG Classic (Blastoise)",        apiId: "pkcb",       ptcgoCode: null,   slug: "pokemon-trading-card-game-classic-blastoise",  series: "Other", year: 2023 },
  { name: "Pokémon TCG Classic (Charizard)",        apiId: "pkcc",       ptcgoCode: null,   slug: "pokemon-trading-card-game-classic-charizard",  series: "Other", year: 2023 },
  { name: "Pokémon TCG Classic (Venusaur)",         apiId: "pkcv",       ptcgoCode: null,   slug: "pokemon-trading-card-game-classic-venusaur",   series: "Other", year: 2023 },

  // ── Sword & Shield era ───────────────────────────────────────────────────

  { name: "Crown Zenith",                           apiId: "swsh125",    ptcgoCode: "CRZ",  slug: "crown-zenith",                           series: "Sword & Shield", year: 2023 },
  { name: "Crown Zenith Galarian Gallery",          apiId: "swsh125gg",  ptcgoCode: "CRZ",  slug: "crown-zenith-galarian-gallery",           series: "Sword & Shield", year: 2023 },
  { name: "Silver Tempest",                         apiId: "swsh12",     ptcgoCode: "SIT",  slug: "silver-tempest",                         series: "Sword & Shield", year: 2022 },
  { name: "Silver Tempest Trainer Gallery",         apiId: "swsh12tg",   ptcgoCode: "SIT",  slug: "silver-tempest-trainer-gallery",          series: "Sword & Shield", year: 2022 },
  { name: "Lost Origin",                            apiId: "swsh11",     ptcgoCode: "LOR",  slug: "lost-origin",                            series: "Sword & Shield", year: 2022 },
  { name: "Lost Origin Trainer Gallery",            apiId: "swsh11tg",   ptcgoCode: "LOR",  slug: "lost-origin-trainer-gallery",             series: "Sword & Shield", year: 2022 },
  { name: "Pokémon GO",                             apiId: "pgo",        ptcgoCode: "PGO",  slug: "pokemon-go",                             series: "Sword & Shield", year: 2022 },
  { name: "Astral Radiance",                        apiId: "swsh10",     ptcgoCode: "ASR",  slug: "astral-radiance",                        series: "Sword & Shield", year: 2022 },
  { name: "Astral Radiance Trainer Gallery",        apiId: "swsh10tg",   ptcgoCode: "ASR",  slug: "astral-radiance-trainer-gallery",         series: "Sword & Shield", year: 2022 },
  { name: "Brilliant Stars",                        apiId: "swsh9",      ptcgoCode: "BRS",  slug: "brilliant-stars",                        series: "Sword & Shield", year: 2022 },
  { name: "Brilliant Stars Trainer Gallery",        apiId: "swsh9tg",    ptcgoCode: "BRS",  slug: "brilliant-stars-trainer-gallery",         series: "Sword & Shield", year: 2022 },
  { name: "Fusion Strike",                          apiId: "swsh8",      ptcgoCode: "FST",  slug: "fusion-strike",                          series: "Sword & Shield", year: 2021 },
  { name: "Celebrations",                           apiId: "cel25",      ptcgoCode: "CEL",  slug: "celebrations",                           series: "Sword & Shield", year: 2021 },
  { name: "Celebrations: Classic Collection",       apiId: "cel25c",     ptcgoCode: "CEL",  slug: "celebrations-classic-collection",         series: "Sword & Shield", year: 2021 },
  { name: "Evolving Skies",                         apiId: "swsh7",      ptcgoCode: "EVS",  slug: "evolving-skies",                         series: "Sword & Shield", year: 2021 },
  { name: "Chilling Reign",                         apiId: "swsh6",      ptcgoCode: "CRE",  slug: "chilling-reign",                         series: "Sword & Shield", year: 2021 },
  { name: "Battle Styles",                          apiId: "swsh5",      ptcgoCode: "BST",  slug: "battle-styles",                          series: "Sword & Shield", year: 2021 },
  { name: "Shining Fates",                          apiId: "swsh45",     ptcgoCode: "SHF",  slug: "shining-fates",                          series: "Sword & Shield", year: 2021 },
  { name: "Shining Fates Shiny Vault",              apiId: "swsh45sv",   ptcgoCode: "SHF",  slug: "shining-fates-shiny-vault",               series: "Sword & Shield", year: 2021 },
  { name: "Vivid Voltage",                          apiId: "swsh4",      ptcgoCode: "VIV",  slug: "vivid-voltage",                          series: "Sword & Shield", year: 2020 },
  { name: "Champion's Path",                        apiId: "swsh35",     ptcgoCode: "CPA",  slug: "champions-path",                         series: "Sword & Shield", year: 2020 },
  { name: "Darkness Ablaze",                        apiId: "swsh3",      ptcgoCode: "DAA",  slug: "darkness-ablaze",                        series: "Sword & Shield", year: 2020 },
  { name: "Rebel Clash",                            apiId: "swsh2",      ptcgoCode: "RCL",  slug: "rebel-clash",                            series: "Sword & Shield", year: 2020 },
  { name: "Sword & Shield",                         apiId: "swsh1",      ptcgoCode: "SSH",  slug: "sword-and-shield",                       series: "Sword & Shield", year: 2020 },
  { name: "SWSH Black Star Promos",                 apiId: "swshp",      ptcgoCode: "PR-SW",slug: "swsh-black-star-promos",                  series: "Sword & Shield", year: 2019 },
  { name: "McDonald's Collection 2022",             apiId: "mcd22",      ptcgoCode: null,   slug: "mc-donalds-collection-2022",             series: "Sword & Shield", year: 2022 },
  { name: "McDonald's Collection 2021",             apiId: "mcd21",      ptcgoCode: null,   slug: "mc-donalds-collection-2021",             series: "Sword & Shield", year: 2021 },
  { name: "Pokémon Futsal Collection",              apiId: "fut20",      ptcgoCode: null,   slug: "pokemon-futsal-collection",              series: "Sword & Shield", year: 2020 },

  // ── Sun & Moon era ───────────────────────────────────────────────────────

  { name: "Cosmic Eclipse",                         apiId: "sm12",       ptcgoCode: "CEC",  slug: "cosmic-eclipse",                         series: "Sun & Moon", year: 2019 },
  { name: "Hidden Fates",                           apiId: "sm115",      ptcgoCode: "HIF",  slug: "hidden-fates",                           series: "Sun & Moon", year: 2019 },
  { name: "Hidden Fates Shiny Vault",               apiId: "sm115sv",    ptcgoCode: "HIF",  slug: "hidden-fates-shiny-vault",                series: "Sun & Moon", year: 2019 },
  { name: "Unified Minds",                          apiId: "sm11",       ptcgoCode: "UNM",  slug: "unified-minds",                          series: "Sun & Moon", year: 2019 },
  { name: "Unbroken Bonds",                         apiId: "sm10",       ptcgoCode: "UNB",  slug: "unbroken-bonds",                         series: "Sun & Moon", year: 2019 },
  { name: "Detective Pikachu",                      apiId: "det1",       ptcgoCode: null,   slug: "detective-pikachu",                      series: "Sun & Moon", year: 2019 },
  { name: "Team Up",                                apiId: "sm9",        ptcgoCode: "TUD",  slug: "team-up",                                series: "Sun & Moon", year: 2019 },
  { name: "Lost Thunder",                           apiId: "sm8",        ptcgoCode: "LOT",  slug: "lost-thunder",                           series: "Sun & Moon", year: 2018 },
  { name: "Dragon Majesty",                         apiId: "sm75",       ptcgoCode: "DRM",  slug: "dragon-majesty",                         series: "Sun & Moon", year: 2018 },
  { name: "Celestial Storm",                        apiId: "sm7",        ptcgoCode: "CES",  slug: "celestial-storm",                        series: "Sun & Moon", year: 2018 },
  { name: "Forbidden Light",                        apiId: "sm6",        ptcgoCode: "FLI",  slug: "forbidden-light",                        series: "Sun & Moon", year: 2018 },
  { name: "Ultra Prism",                            apiId: "sm5",        ptcgoCode: "UPR",  slug: "ultra-prism",                            series: "Sun & Moon", year: 2018 },
  { name: "Crimson Invasion",                       apiId: "sm4",        ptcgoCode: "CIN",  slug: "crimson-invasion",                       series: "Sun & Moon", year: 2017 },
  { name: "Shining Legends",                        apiId: "sm35",       ptcgoCode: "SHL",  slug: "shining-legends",                        series: "Sun & Moon", year: 2017 },
  { name: "Burning Shadows",                        apiId: "sm3",        ptcgoCode: "BUS",  slug: "burning-shadows",                        series: "Sun & Moon", year: 2017 },
  { name: "Guardians Rising",                       apiId: "sm2",        ptcgoCode: "GRI",  slug: "guardians-rising",                       series: "Sun & Moon", year: 2017 },
  { name: "Sun & Moon",                             apiId: "sm1",        ptcgoCode: "SUM",  slug: "sun-and-moon",                           series: "Sun & Moon", year: 2017 },
  { name: "SM Black Star Promos",                   apiId: "smp",        ptcgoCode: "PR-SM",slug: "sm-black-star-promos",                    series: "Sun & Moon", year: 2017 },
  { name: "McDonald's Collection 2019",             apiId: "mcd19",      ptcgoCode: null,   slug: "mc-donalds-collection-2019",             series: "Sun & Moon", year: 2019 },
  { name: "McDonald's Collection 2018",             apiId: "mcd18",      ptcgoCode: null,   slug: "mc-donalds-collection-2018",             series: "Sun & Moon", year: 2018 },
  { name: "McDonald's Collection 2017",             apiId: "mcd17",      ptcgoCode: null,   slug: "mc-donalds-collection-2017",             series: "Sun & Moon", year: 2017 },

  // ── XY era ───────────────────────────────────────────────────────────────

  { name: "Evolutions",                             apiId: "xy12",       ptcgoCode: "EVO",  slug: "evolutions",                             series: "XY", year: 2016 },
  { name: "Steam Siege",                            apiId: "xy11",       ptcgoCode: "STS",  slug: "steam-siege",                            series: "XY", year: 2016 },
  { name: "Fates Collide",                          apiId: "xy10",       ptcgoCode: "FCO",  slug: "fates-collide",                          series: "XY", year: 2016 },
  { name: "Generations",                            apiId: "g1",         ptcgoCode: "GEN",  slug: "generations",                            series: "XY", year: 2016 },
  { name: "BREAKpoint",                             apiId: "xy9",        ptcgoCode: "BKP",  slug: "breakpoint",                             series: "XY", year: 2016 },
  { name: "BREAKthrough",                           apiId: "xy8",        ptcgoCode: "BKT",  slug: "breakthrough",                           series: "XY", year: 2015 },
  { name: "Ancient Origins",                        apiId: "xy7",        ptcgoCode: "AOR",  slug: "ancient-origins",                        series: "XY", year: 2015 },
  { name: "Roaring Skies",                          apiId: "xy6",        ptcgoCode: "ROS",  slug: "roaring-skies",                          series: "XY", year: 2015 },
  { name: "Double Crisis",                          apiId: "dc1",        ptcgoCode: null,   slug: "double-crisis",                          series: "XY", year: 2015 },
  { name: "Primal Clash",                           apiId: "xy5",        ptcgoCode: "PRC",  slug: "primal-clash",                           series: "XY", year: 2015 },
  { name: "Phantom Forces",                         apiId: "xy4",        ptcgoCode: "PHF",  slug: "phantom-forces",                         series: "XY", year: 2014 },
  { name: "Furious Fists",                          apiId: "xy3",        ptcgoCode: "FFI",  slug: "furious-fists",                          series: "XY", year: 2014 },
  { name: "Flashfire",                              apiId: "xy2",        ptcgoCode: "FLF",  slug: "flashfire",                              series: "XY", year: 2014 },
  { name: "XY",                                     apiId: "xy1",        ptcgoCode: "XY",   slug: "xy",                                     series: "XY", year: 2014 },
  { name: "Kalos Starter Set",                      apiId: "xy0",        ptcgoCode: null,   slug: "kalos-starter-set",                      series: "XY", year: 2013 },
  { name: "Legendary Treasures",                    apiId: "bw11",       ptcgoCode: "LTR",  slug: "legendary-treasures",                    series: "XY", year: 2013 },
  { name: "XY Black Star Promos",                   apiId: "xyp",        ptcgoCode: "PR-XY",slug: "xy-black-star-promos",                    series: "XY", year: 2013 },
  { name: "McDonald's Collection 2016",             apiId: "mcd16",      ptcgoCode: null,   slug: "mc-donalds-collection-2016",             series: "XY", year: 2016 },
  { name: "McDonald's Collection 2015",             apiId: "mcd15",      ptcgoCode: null,   slug: "mc-donalds-collection-2015",             series: "XY", year: 2015 },
  { name: "McDonald's Collection 2014",             apiId: "mcd14",      ptcgoCode: null,   slug: "mc-donalds-collection-2014",             series: "XY", year: 2014 },

  // ── Black & White era ────────────────────────────────────────────────────

  { name: "Plasma Blast",                           apiId: "bw10",       ptcgoCode: "PLB",  slug: "plasma-blast",                           series: "Black & White", year: 2013 },
  { name: "Plasma Freeze",                          apiId: "bw9",        ptcgoCode: "PLF",  slug: "plasma-freeze",                          series: "Black & White", year: 2013 },
  { name: "Plasma Storm",                           apiId: "bw8",        ptcgoCode: "PLS",  slug: "plasma-storm",                           series: "Black & White", year: 2013 },
  { name: "Boundaries Crossed",                     apiId: "bw7",        ptcgoCode: "BCR",  slug: "boundaries-crossed",                     series: "Black & White", year: 2012 },
  { name: "Dragon Vault",                           apiId: "dv1",        ptcgoCode: "DRV",  slug: "dragon-vault",                           series: "Black & White", year: 2012 },
  { name: "Dragons Exalted",                        apiId: "bw6",        ptcgoCode: "DRX",  slug: "dragons-exalted",                        series: "Black & White", year: 2012 },
  { name: "Dark Explorers",                         apiId: "bw5",        ptcgoCode: "DEX",  slug: "dark-explorers",                         series: "Black & White", year: 2012 },
  { name: "Next Destinies",                         apiId: "bw4",        ptcgoCode: "NXD",  slug: "next-destinies",                         series: "Black & White", year: 2012 },
  { name: "Noble Victories",                        apiId: "bw3",        ptcgoCode: "NVI",  slug: "noble-victories",                        series: "Black & White", year: 2011 },
  { name: "Emerging Powers",                        apiId: "bw2",        ptcgoCode: "EPO",  slug: "emerging-powers",                        series: "Black & White", year: 2011 },
  { name: "Black & White",                          apiId: "bw1",        ptcgoCode: "BLW",  slug: "black-and-white",                        series: "Black & White", year: 2011 },
  { name: "BW Black Star Promos",                   apiId: "bwp",        ptcgoCode: "PR-BW",slug: "bw-black-star-promos",                    series: "Black & White", year: 2011 },
  { name: "Call of Legends",                        apiId: "col1",       ptcgoCode: "CL",   slug: "call-of-legends",                        series: "Black & White", year: 2011 },
  { name: "McDonald's Collection 2012",             apiId: "mcd12",      ptcgoCode: null,   slug: "mc-donalds-collection-2012",             series: "Black & White", year: 2012 },
  { name: "McDonald's Collection 2011",             apiId: "mcd11",      ptcgoCode: null,   slug: "mc-donalds-collection-2011",             series: "Black & White", year: 2011 },

  // ── HeartGold & SoulSilver era ───────────────────────────────────────────

  { name: "HS-Triumphant",                          apiId: "hs6",        ptcgoCode: "TM",   slug: "hs-triumphant",                          series: "HeartGold & SoulSilver", year: 2010 },
  { name: "HS-Undaunted",                           apiId: "hs5",        ptcgoCode: "UD",   slug: "hs-undaunted",                           series: "HeartGold & SoulSilver", year: 2010 },
  { name: "HS-Unleashed",                           apiId: "hs4",        ptcgoCode: "UL",   slug: "hs-unleashed",                           series: "HeartGold & SoulSilver", year: 2010 },
  { name: "HeartGold & SoulSilver",                 apiId: "hs1",        ptcgoCode: "HS",   slug: "heart-gold-and-soul-silver",              series: "HeartGold & SoulSilver", year: 2010 },
  { name: "HGSS Black Star Promos",                 apiId: "hsp",        ptcgoCode: null,   slug: "hgss-black-star-promos",                 series: "HeartGold & SoulSilver", year: 2010 },

  // ── Platinum era ─────────────────────────────────────────────────────────

  { name: "Arceus",                                 apiId: "pl4",        ptcgoCode: "AR",   slug: "arceus",                                 series: "Platinum", year: 2009 },
  { name: "Supreme Victors",                        apiId: "pl3",        ptcgoCode: "SV",   slug: "supreme-victors",                        series: "Platinum", year: 2009 },
  { name: "Rising Rivals",                          apiId: "pl2",        ptcgoCode: "RR",   slug: "rising-rivals",                          series: "Platinum", year: 2009 },
  { name: "Platinum",                               apiId: "pl1",        ptcgoCode: "PL",   slug: "platinum",                               series: "Platinum", year: 2009 },
  { name: "Stormfront",                             apiId: "dp7",        ptcgoCode: "SF",   slug: "stormfront",                             series: "Platinum", year: 2008 },
  { name: "Pokémon Rumble",                         apiId: "ru1",        ptcgoCode: null,   slug: "pokemon-rumble",                         series: "Other", year: 2009 },

  // ── Diamond & Pearl era ──────────────────────────────────────────────────

  { name: "Legends Awakened",                       apiId: "dp6",        ptcgoCode: "LA",   slug: "legends-awakened",                       series: "Diamond & Pearl", year: 2008 },
  { name: "Majestic Dawn",                          apiId: "dp5",        ptcgoCode: "MD",   slug: "majestic-dawn",                          series: "Diamond & Pearl", year: 2008 },
  { name: "Great Encounters",                       apiId: "dp4",        ptcgoCode: "GE",   slug: "great-encounters",                       series: "Diamond & Pearl", year: 2008 },
  { name: "Secret Wonders",                         apiId: "dp3",        ptcgoCode: "SW",   slug: "secret-wonders",                         series: "Diamond & Pearl", year: 2007 },
  { name: "Mysterious Treasures",                   apiId: "dp2",        ptcgoCode: "MT",   slug: "mysterious-treasures",                   series: "Diamond & Pearl", year: 2007 },
  { name: "Diamond & Pearl",                        apiId: "dp1",        ptcgoCode: "DP",   slug: "diamond-and-pearl",                      series: "Diamond & Pearl", year: 2007 },
  { name: "DP Black Star Promos",                   apiId: "dpp",        ptcgoCode: null,   slug: "dp-black-star-promos",                   series: "Diamond & Pearl", year: 2007 },

  // ── EX era ───────────────────────────────────────────────────────────────

  { name: "Power Keepers",                          apiId: "ex16",       ptcgoCode: "PK",   slug: "power-keepers",                          series: "EX", year: 2007 },
  { name: "Dragon Frontiers",                       apiId: "ex15",       ptcgoCode: "DF",   slug: "dragon-frontiers",                       series: "EX", year: 2006 },
  { name: "Crystal Guardians",                      apiId: "ex14",       ptcgoCode: "CG",   slug: "crystal-guardians",                      series: "EX", year: 2006 },
  { name: "Holon Phantoms",                         apiId: "ex13",       ptcgoCode: "HP",   slug: "holon-phantoms",                         series: "EX", year: 2006 },
  { name: "Legend Maker",                           apiId: "ex12",       ptcgoCode: "LM",   slug: "legend-maker",                           series: "EX", year: 2006 },
  { name: "Delta Species",                          apiId: "ex11",       ptcgoCode: "DS",   slug: "delta-species",                          series: "EX", year: 2005 },
  { name: "Unseen Forces",                          apiId: "ex10",       ptcgoCode: "UF",   slug: "unseen-forces",                          series: "EX", year: 2005 },
  { name: "Emerald",                                apiId: "ex9",        ptcgoCode: "EM",   slug: "emerald",                                series: "EX", year: 2005 },
  { name: "Deoxys",                                 apiId: "ex8",        ptcgoCode: "DX",   slug: "deoxys",                                 series: "EX", year: 2005 },
  { name: "Team Rocket Returns",                    apiId: "ex7",        ptcgoCode: "TRR",  slug: "team-rocket-returns",                    series: "EX", year: 2004 },
  { name: "FireRed & LeafGreen",                    apiId: "ex6",        ptcgoCode: "FRLG", slug: "fire-red-and-leaf-green",                series: "EX", year: 2004 },
  { name: "Hidden Legends",                         apiId: "ex5",        ptcgoCode: "HL",   slug: "hidden-legends",                         series: "EX", year: 2004 },
  { name: "Team Magma vs Team Aqua",                apiId: "ex4",        ptcgoCode: "MA",   slug: "team-magma-vs-team-aqua",                series: "EX", year: 2004 },
  { name: "Dragon",                                 apiId: "ex3",        ptcgoCode: "DR",   slug: "dragon",                                 series: "EX", year: 2003 },
  { name: "Sandstorm",                              apiId: "ex2",        ptcgoCode: "SS",   slug: "sandstorm",                              series: "EX", year: 2003 },
  { name: "Ruby & Sapphire",                        apiId: "ex1",        ptcgoCode: "RS",   slug: "ruby-and-sapphire",                      series: "EX", year: 2003 },
  { name: "Nintendo Black Star Promos",             apiId: "np",         ptcgoCode: null,   slug: "nintendo-black-star-promos",             series: "EX", year: 2003 },

  // ── Neo era ──────────────────────────────────────────────────────────────

  { name: "Skyridge",                               apiId: "si1",        ptcgoCode: null,   slug: "skyridge",                               series: "Neo", year: 2003 },
  { name: "Aquapolis",                              apiId: "aq1",        ptcgoCode: null,   slug: "aquapolis",                              series: "Neo", year: 2003 },
  { name: "Expedition Base Set",                    apiId: "ecard1",     ptcgoCode: null,   slug: "expedition-base-set",                    series: "Neo", year: 2002 },
  { name: "Legendary Collection",                   apiId: "lc",         ptcgoCode: null,   slug: "legendary-collection",                   series: "Neo", year: 2002 },
  { name: "Neo Destiny",                            apiId: "neo4",       ptcgoCode: "N4",   slug: "neo-destiny",                            series: "Neo", year: 2002 },
  { name: "Neo Revelation",                         apiId: "neo3",       ptcgoCode: "N3",   slug: "neo-revelation",                         series: "Neo", year: 2001 },
  { name: "Southern Islands",                       apiId: "si2",        ptcgoCode: null,   slug: "southern-islands",                       series: "Neo", year: 2001 },
  { name: "Neo Discovery",                          apiId: "neo2",       ptcgoCode: "N2",   slug: "neo-discovery",                          series: "Neo", year: 2001 },
  { name: "Neo Genesis",                            apiId: "neo1",       ptcgoCode: "N1",   slug: "neo-genesis",                            series: "Neo", year: 2000 },

  // ── Gym era ──────────────────────────────────────────────────────────────

  { name: "Gym Challenge",                          apiId: "gym2",       ptcgoCode: "G2",   slug: "gym-challenge",                          series: "Gym", year: 2000 },
  { name: "Gym Heroes",                             apiId: "gym1",       ptcgoCode: "G1",   slug: "gym-heroes",                             series: "Gym", year: 2000 },

  // ── Base era ─────────────────────────────────────────────────────────────

  { name: "Team Rocket",                            apiId: "base5",      ptcgoCode: "TR",   slug: "team-rocket",                            series: "Base", year: 2000 },
  { name: "Base Set 2",                             apiId: "base4",      ptcgoCode: "B2",   slug: "base-set-2",                             series: "Base", year: 2000 },
  { name: "Fossil",                                 apiId: "base3",      ptcgoCode: "FO",   slug: "fossil",                                 series: "Base", year: 1999 },
  { name: "Jungle",                                 apiId: "base2",      ptcgoCode: "JU",   slug: "jungle",                                 series: "Base", year: 1999 },
  { name: "Wizards Black Star Promos",              apiId: "basep",      ptcgoCode: null,   slug: "wizards-black-star-promos",              series: "Base", year: 1999 },
  { name: "Base Set",                               apiId: "base1",      ptcgoCode: "BS",   slug: "base",                                   series: "Base", year: 1999 },
  { name: "Best of Game",                           apiId: "bp",         ptcgoCode: null,   slug: "best-of-game",                           series: "Base", year: 2002 },
];

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP MAPS — built once at import time for O(1) access
// ─────────────────────────────────────────────────────────────────────────────

/** PTCGO code → SetInfo (e.g. "MEW" → 151 set) */
export const BY_PTCGO_CODE = new Map<string, SetInfo>(
  ALL_SETS
    .filter(s => s.ptcgoCode)
    .map(s => [s.ptcgoCode!.toUpperCase(), s])
);

/** Pokemon TCG API ID → SetInfo (e.g. "sv3pt5" → 151 set) */
export const BY_API_ID = new Map<string, SetInfo>(
  ALL_SETS.map(s => [s.apiId.toLowerCase(), s])
);

/** pokesymbols.com slug → SetInfo */
export const BY_SLUG = new Map<string, SetInfo>(
  ALL_SETS.map(s => [s.slug, s])
);

/**
 * Set name → SetInfo (normalised lowercase for fuzzy matching)
 * Keys are lowercased + stripped of punctuation for resilience.
 */
export const BY_NAME = new Map<string, SetInfo>(
  ALL_SETS.map(s => [normaliseSetName(s.name), s])
);

function normaliseSetName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Look up a set by PTCGO code (e.g. "MEW", "SVI", "PAR").
 * Case-insensitive.
 */
export function findSetByPtcgoCode(code: string): SetInfo | null {
  return BY_PTCGO_CODE.get(code.toUpperCase()) ?? null;
}

/**
 * Look up a set by Pokemon TCG API ID (e.g. "sv3pt5", "swsh1").
 * Case-insensitive.
 */
export function findSetByApiId(apiId: string): SetInfo | null {
  return BY_API_ID.get(apiId.toLowerCase()) ?? null;
}

/**
 * Look up a set by pokesymbols.com slug (e.g. "151", "scarlet-and-violet").
 */
export function findSetBySlug(slug: string): SetInfo | null {
  return BY_SLUG.get(slug) ?? null;
}

/**
 * Find a set by name — exact first, then fuzzy (normalised).
 * Returns null if nothing found.
 */
export function findSetByName(name: string): SetInfo | null {
  const key = normaliseSetName(name);
  if (BY_NAME.has(key)) return BY_NAME.get(key)!;

  // Partial / contains match
  for (const [k, v] of BY_NAME) {
    if (k.includes(key) || key.includes(k)) return v;
  }
  return null;
}

/**
 * Given anything that might identify a set — PTCGO code, API ID, name, slug —
 * returns the best matching SetInfo or null.
 */
export function resolveSet(hint: string): SetInfo | null {
  const h = hint.trim();
  return (
    findSetByPtcgoCode(h) ??
    findSetByApiId(h) ??
    findSetBySlug(h.toLowerCase().replace(/\s+/g, "-")) ??
    findSetByName(h) ??
    null
  );
}

/**
 * Returns the symbol image URL for a given set (by any identifier).
 * Falls back to null if the set can't be resolved.
 */
export function getSetSymbolUrl(hint: string): string | null {
  const set = resolveSet(hint);
  return set ? getSymbolUrl(set.slug) : null;
}

/**
 * Returns the logo image URL for a given set (by any identifier).
 */
export function getSetLogoUrl(hint: string): string | null {
  const set = resolveSet(hint);
  return set ? getLogoUrl(set.slug) : null;
}

/**
 * Given a PTCGO code, returns the Pokemon TCG API set ID.
 * This is what you pass to the API query: `set.id:${apiId}`
 *
 * Example: ptcgoCodeToApiId("MEW") → "sv3pt5"
 */
export function ptcgoCodeToApiId(code: string): string | null {
  return findSetByPtcgoCode(code)?.apiId ?? null;
}

/**
 * Parse the bottom-right text of a Pokemon card and extract
 * card number, set total, and set code.
 *
 * Examples:
 *   "188/132 MEW"  → { cardNumber: "188", totalInSet: "132", ptcgoCode: "MEW" }
 *   "45/165"       → { cardNumber: "45",  totalInSet: "165", ptcgoCode: null  }
 *   "SWSH001"      → { cardNumber: "001", totalInSet: null,  ptcgoCode: "SWSH" }
 *   "SV045"        → { cardNumber: "045", totalInSet: null,  ptcgoCode: "SV"  }
 */
export function parseCardBottomText(text: string): {
  cardNumber: string | null;
  totalInSet: string | null;
  ptcgoCode: string | null;
  setInfo: SetInfo | null;
} {
  const t = text.trim();

  // "188/132 MEW" — number/total + code
  const fullMatch = t.match(/(\d+)\s*\/\s*(\d+)\s+([A-Z]{2,6})/);
  if (fullMatch) {
    const code = fullMatch[3];
    return {
      cardNumber: fullMatch[1],
      totalInSet: fullMatch[2],
      ptcgoCode: code,
      setInfo: findSetByPtcgoCode(code),
    };
  }

  // "188/132" — number/total only
  const numOnly = t.match(/(\d+)\s*\/\s*(\d+)/);
  if (numOnly) {
    return { cardNumber: numOnly[1], totalInSet: numOnly[2], ptcgoCode: null, setInfo: null };
  }

  // "SWSH001", "SV045" — promo style (letters + digits)
  const promoMatch = t.match(/([A-Z]{2,4})(\d{3,4})/);
  if (promoMatch) {
    const code = promoMatch[1];
    return {
      cardNumber: promoMatch[2],
      totalInSet: null,
      ptcgoCode: code,
      setInfo: findSetByPtcgoCode(code),
    };
  }

  return { cardNumber: null, totalInSet: null, ptcgoCode: null, setInfo: null };
}

/**
 * Build the optimal Pokemon TCG API query string given what we know.
 *
 * Usage:
 *   const q = buildApiQuery("Charizard", "4", "MEW");
 *   fetch(`https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}`)
 */
export function buildApiQuery(
  cardName: string,
  cardNumber: string | null,
  ptcgoCodeOrApiId: string | null,
): string {
  const parts: string[] = [];

  if (cardName) {
    // Use name: prefix for partial match support
    parts.push(`name:"${cardName}"`);
  }

  if (ptcgoCodeOrApiId) {
    const set = resolveSet(ptcgoCodeOrApiId);
    if (set) {
      parts.push(`set.id:${set.apiId}`);
    }
  }

  if (cardNumber) {
    parts.push(`number:${cardNumber}`);
  }

  return parts.join(" ");
}
