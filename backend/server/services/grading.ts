export interface GradingResult {
  centering: number;
  corners: number;
  edges: number;
  surface: number;
  finalScore: number;
  estimatedGrade: string;
}

export function calculateGrade(data: {
  centering: number;
  cornerDamage: number;
  edgeDamage: number;
  surfaceDamage: number;
}): GradingResult {

  const centeringScore = 10 - data.centering;
  const cornersScore = 10 - data.cornerDamage;
  const edgesScore = 10 - data.edgeDamage;
  const surfaceScore = 10 - data.surfaceDamage;

  const finalScore =
    centeringScore * 0.3 +
    cornersScore * 0.3 +
    edgesScore * 0.2 +
    surfaceScore * 0.2;

  let estimatedGrade = "PSA 6";

  if (finalScore >= 9.5) estimatedGrade = "PSA 10";
  else if (finalScore >= 8.5) estimatedGrade = "PSA 9";
  else if (finalScore >= 7.5) estimatedGrade = "PSA 8";
  else if (finalScore >= 6.5) estimatedGrade = "PSA 7";

  return {
    centering: centeringScore,
    corners: cornersScore,
    edges: edgesScore,
    surface: surfaceScore,
    finalScore,
    estimatedGrade,
  };
}