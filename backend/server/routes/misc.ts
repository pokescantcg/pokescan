import { Express, Request, Response } from "express";

export function registerMiscRoutes(app: Express) {
  // -------------------- APP CONFIG --------------------
  app.get("/api/config", (_req: Request, res: Response) => {
    res.json({
      maintenanceMode: false,
    });
  });

  console.log("Misc routes loaded");
}