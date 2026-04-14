export interface GradingInput {
  centering: number;
  cornerDamage: number;
  edgeDamage: number;
  surfaceDamage: number;
}

export interface GradingResult {
  grade: number;
  label: string;
  breakdown: {
    centering: number;
    corners: number;
    edges: number;
    surface: number;
  };
}

export function calculateGrade(input: GradingInput): GradingResult {
  const { centering, cornerDamage, edgeDamage, surfaceDamage } = input;

  const centerScore = Math.max(0, 10 - centering * 2);
  const cornerScore = Math.max(0, 10 - cornerDamage * 3);
  const edgeScore = Math.max(0, 10 - edgeDamage * 3);
  const surfaceScore = Math.max(0, 10 - surfaceDamage * 3);

  const raw = centerScore * 0.2 + cornerScore * 0.3 + edgeScore * 0.25 + surfaceScore * 0.25;
  const grade = Math.round(raw * 10) / 10;

  let label = "Poor (1)";
  if (grade >= 9.5) label = "Gem Mint (10)";
  else if (grade >= 9.0) label = "Mint (9)";
  else if (grade >= 8.0) label = "Near Mint-Mint (8)";
  else if (grade >= 7.0) label = "Near Mint (7)";
  else if (grade >= 6.0) label = "Excellent-Near Mint (6)";
  else if (grade >= 5.0) label = "Excellent (5)";
  else if (grade >= 4.0) label = "Very Good-Excellent (4)";
  else if (grade >= 3.0) label = "Very Good (3)";
  else if (grade >= 2.0) label = "Good (2)";

  return {
    grade,
    label,
    breakdown: {
      centering: centerScore,
      corners: cornerScore,
      edges: edgeScore,
      surface: surfaceScore,
    },
  };
}
