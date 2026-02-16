import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";

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

  const httpServer = createServer(app);
  return httpServer;
}
