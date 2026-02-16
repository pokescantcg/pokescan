import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import {
  scrapeSets,
  scrapeSetCards,
  scrapeTopCards,
  scrapeCardSearch,
  generateEbaySearchUrl,
  generateEbaySoldUrl,
} from "./pokecardvalues-scraper";

const POKEMON_API = "https://api.pokemontcg.io/v2";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/pokemon/sets", async (_req: Request, res: Response) => {
    try {
      const response = await fetch(`${POKEMON_API}/sets?orderBy=-releaseDate&pageSize=250`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Failed to fetch sets:", error);
      res.status(500).json({ error: "Failed to fetch sets" });
    }
  });

  app.get("/api/pokemon/sets/:setId/cards", async (req: Request, res: Response) => {
    try {
      const { setId } = req.params;
      const page = req.query.page || "1";
      const response = await fetch(
        `${POKEMON_API}/cards?q=set.id:${setId}&orderBy=number&page=${page}&pageSize=50`
      );
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Failed to fetch set cards:", error);
      res.status(500).json({ error: "Failed to fetch cards" });
    }
  });

  app.get("/api/pokemon/cards/search", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      const page = req.query.page || "1";
      const encodedQuery = encodeURIComponent(`name:"${query}*"`);
      const response = await fetch(
        `${POKEMON_API}/cards?q=${encodedQuery}&orderBy=-set.releaseDate&page=${page}&pageSize=20`
      );
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Failed to search cards:", error);
      res.status(500).json({ error: "Failed to search cards" });
    }
  });

  app.get("/api/pokemon/cards/:cardId", async (req: Request, res: Response) => {
    try {
      const { cardId } = req.params;
      const response = await fetch(`${POKEMON_API}/cards/${cardId}`);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Failed to fetch card:", error);
      res.status(500).json({ error: "Failed to fetch card" });
    }
  });

  app.get("/api/pcv/sets", async (_req: Request, res: Response) => {
    try {
      const sets = await scrapeSets();
      res.json({ data: sets, count: sets.length });
    } catch (error) {
      console.error("Failed to scrape PCV sets:", error);
      res.status(500).json({ error: "Failed to fetch UK card sets" });
    }
  });

  app.get("/api/pcv/sets/:setId/:slug/cards", async (req: Request, res: Response) => {
    try {
      const { setId, slug } = req.params;
      const cards = await scrapeSetCards(setId, slug);
      res.json({ data: cards, count: cards.length });
    } catch (error) {
      console.error("Failed to scrape PCV set cards:", error);
      res.status(500).json({ error: "Failed to fetch UK card data" });
    }
  });

  app.get("/api/pcv/top/:condition", async (req: Request, res: Response) => {
    try {
      const { condition } = req.params;
      const topCards = await scrapeTopCards(condition);
      res.json({ data: topCards, count: topCards.length });
    } catch (error) {
      console.error("Failed to scrape PCV top cards:", error);
      res.status(500).json({ error: "Failed to fetch top valued cards" });
    }
  });

  app.get("/api/pcv/search", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        res.json({ data: [], count: 0 });
        return;
      }
      const cards = await scrapeCardSearch(query);
      res.json({ data: cards, count: cards.length });
    } catch (error) {
      console.error("Failed to search PCV cards:", error);
      res.status(500).json({ error: "Failed to search UK cards" });
    }
  });

  app.get("/api/ebay/search-url", (req: Request, res: Response) => {
    const cardName = req.query.cardName as string;
    const setName = req.query.setName as string | undefined;
    const number = req.query.number as string | undefined;
    if (!cardName) {
      res.status(400).json({ error: "cardName is required" });
      return;
    }
    res.json({
      searchUrl: generateEbaySearchUrl(cardName, setName, number),
      soldUrl: generateEbaySoldUrl(cardName, setName, number),
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
