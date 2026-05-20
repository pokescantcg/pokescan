// Condition-based pricing multipliers based on industry standards
// Source: TCGPlayer, CardMarket, PSA grading standards

export const CONDITION_MULTIPLIERS: Record<string, number> = {
  Mint: 1.05, // 105% - Pack fresh, perfect centering
  "Near Mint": 1.0, // 100% - Baseline (TCGPlayer default)
  Excellent: 0.9, // 90% - Minor visible wear
  Good: 0.75, // 75% - Moderate wear
  "Lightly Played": 0.75, // 75% - Noticeable play wear
  Played: 0.5, // 50% - Heavy play wear
  Poor: 0.25, // 25% - Damaged, major issues
};

// Alternative naming conventions
export const CONDITION_ALIASES: Record<string, string> = {
  LP: "Lightly Played",
  MP: "Moderately Played",
  HP: "Heavily Played",
  DMG: "Damaged",
  NM: "Near Mint",
  M: "Mint",
  EX: "Excellent",
  GD: "Good",
  PL: "Played",
  PR: "Poor",
  "Moderately Played": "Good",
  "Heavily Played": "Played",
  Damaged: "Poor",
};

/**
 * Calculate adjusted price based on card condition
 * @param basePrice - TCGPlayer Near Mint market price
 * @param condition - Card condition (Mint, Near Mint, Excellent, etc.)
 * @returns Adjusted price based on condition
 */
export function calculateConditionPrice(
  basePrice: number | null | undefined,
  condition: string,
): number {
  if (!basePrice || basePrice <= 0) return 0;

  // Normalize condition
  const normalizedCondition = CONDITION_ALIASES[condition] || condition;

  // Get multiplier (default to Near Mint if unknown)
  const multiplier = CONDITION_MULTIPLIERS[normalizedCondition] ?? 1.0;

  return basePrice * multiplier;
}

/**
 * Get condition multiplier percentage for display
 * @param condition - Card condition
 * @returns Percentage string (e.g., "75%")
 */
export function getConditionMultiplierDisplay(condition: string): string {
  const normalizedCondition = CONDITION_ALIASES[condition] || condition;
  const multiplier = CONDITION_MULTIPLIERS[normalizedCondition] ?? 1.0;
  return `${Math.round(multiplier * 100)}%`;
}

/**
 * Get all available conditions sorted by value (best to worst)
 */
export const CONDITION_TIERS = [
  "Mint",
  "Near Mint",
  "Excellent",
  "Good",
  "Lightly Played",
  "Played",
  "Poor",
] as const;

export type CardCondition = (typeof CONDITION_TIERS)[number];

/**
 * Get condition tier color for UI display
 */
export function getConditionColor(condition: string): string {
  const normalizedCondition = CONDITION_ALIASES[condition] || condition;

  switch (normalizedCondition) {
    case "Mint":
      return "#FFD700"; // Gold
    case "Near Mint":
      return "#2ECC71"; // Green
    case "Excellent":
      return "#3498DB"; // Blue
    case "Good":
    case "Lightly Played":
      return "#F39C12"; // Orange
    case "Played":
      return "#E67E22"; // Dark Orange
    case "Poor":
      return "#E74C3C"; // Red
    default:
      return "#95A5A6"; // Gray
  }
}

/**
 * Calculate collection value with condition adjustments
 * @param items - Collection items with basePrice and condition
 * @returns Total value accounting for condition
 */
export function calculateCollectionValue(
  items: Array<{
    priceGBP: number | null | undefined;
    condition: string;
    quantity: number;
  }>,
): number {
  return items.reduce((total, item) => {
    const adjustedPrice = calculateConditionPrice(
      item.priceGBP,
      item.condition,
    );
    return total + adjustedPrice * item.quantity;
  }, 0);
}

/**
 * Get condition impact description for user education
 */
export function getConditionImpact(condition: string): string {
  const normalizedCondition = CONDITION_ALIASES[condition] || condition;

  switch (normalizedCondition) {
    case "Mint":
      return "Pack-fresh perfection! Worth 5% more than Near Mint.";
    case "Near Mint":
      return "Baseline market value. Minimal wear, great for collecting.";
    case "Excellent":
      return "Minor wear visible. Worth ~90% of Near Mint value.";
    case "Good":
    case "Lightly Played":
      return "Noticeable play wear. Worth ~75% of Near Mint value.";
    case "Played":
      return "Heavy play wear. Worth ~50% of Near Mint value.";
    case "Poor":
      return "Significant damage. Worth ~25% of Near Mint value.";
    default:
      return "Standard market value.";
  }
}
