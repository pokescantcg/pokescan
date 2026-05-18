"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateGrade = calculateGrade;
function calculateGrade(input) {
    var centering = input.centering, cornerDamage = input.cornerDamage, edgeDamage = input.edgeDamage, surfaceDamage = input.surfaceDamage;
    var centerScore = Math.max(0, 10 - centering * 2);
    var cornerScore = Math.max(0, 10 - cornerDamage * 3);
    var edgeScore = Math.max(0, 10 - edgeDamage * 3);
    var surfaceScore = Math.max(0, 10 - surfaceDamage * 3);
    var raw = centerScore * 0.2 + cornerScore * 0.3 + edgeScore * 0.25 + surfaceScore * 0.25;
    var grade = Math.round(raw * 10) / 10;
    var label = "Poor (1)";
    if (grade >= 9.5)
        label = "Gem Mint (10)";
    else if (grade >= 9.0)
        label = "Mint (9)";
    else if (grade >= 8.0)
        label = "Near Mint-Mint (8)";
    else if (grade >= 7.0)
        label = "Near Mint (7)";
    else if (grade >= 6.0)
        label = "Excellent-Near Mint (6)";
    else if (grade >= 5.0)
        label = "Excellent (5)";
    else if (grade >= 4.0)
        label = "Very Good-Excellent (4)";
    else if (grade >= 3.0)
        label = "Very Good (3)";
    else if (grade >= 2.0)
        label = "Good (2)";
    return {
        grade: grade,
        label: label,
        breakdown: {
            centering: centerScore,
            corners: cornerScore,
            edges: edgeScore,
            surface: surfaceScore,
        },
    };
}
