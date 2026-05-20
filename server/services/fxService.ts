const FX_CACHE_MS = 1000 * 60 * 15; // 15 minutes

let cachedRate: number | null = null;
let lastFetch = 0;

export async function getUsdToGbpRate(): Promise<number> {
  const now = Date.now();

  if (cachedRate && now - lastFetch < FX_CACHE_MS) {
    return cachedRate;
  }

  try {
    const res = await fetch(
      "https://api.exchangerate.host/latest?base=USD&symbols=GBP"
    );

    const data = await res.json();

    const rate = data?.rates?.GBP;

    if (!rate) throw new Error("Invalid FX response");

    cachedRate = rate;
    lastFetch = now;

    console.log(`[FX] USD -> GBP = ${rate}`);

    return rate;
  } catch (err) {
    console.error("[FX ERROR]", err);

    // fallback
    return cachedRate || 0.74;
  }
}