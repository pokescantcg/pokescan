export function usdToGbp(
  usd: number,
  rate: number
) {
  return Math.round(usd * rate * 100) / 100;
}