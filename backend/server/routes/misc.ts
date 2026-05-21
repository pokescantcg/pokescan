import { Express, Request, Response } from "express";

export function registerMiscRoutes(app: Express) {
  // -------------------- APP CONFIG --------------------
  app.get("/api/config", (_req: Request, res: Response) => {
    res.json({
      maintenanceMode: process.env.MAINTENANCE_MODE === "true",
      scannerEnabled: process.env.SCANNER_ENABLED !== "false",
        // optional extras (won’t break frontend)
  apiUrl: process.env.API_URL || "http://localhost:5000",
  environment: process.env.NODE_ENV || "development",
    });
  });

  console.log("Misc routes loaded");
}