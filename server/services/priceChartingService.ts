import axios from "axios";
import * as cheerio from "cheerio";

export async function scrapePriceCharting(url: string) {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    const $ = cheerio.load(response.data);

    // Example selectors (will need adjustment)
    const rawPriceText =
      $(".price").first().text().trim();

    const rawPrice = parseFloat(
      rawPriceText.replace("$", "")
    );

    return {
      success: true,
      priceUsd: rawPrice,
      sourceUrl: url
    };
  } catch (err) {
    console.error("[PRICECHARTING ERROR]", err);

    return {
      success: false
    };
  }
}