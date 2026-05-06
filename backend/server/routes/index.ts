import { Express } from "express";

// Import route modules
import { registerAuthRoutes } from "./auth";
import { registerUserRoutes } from "./user";
import { registerAdminRoutes } from "./admin";
import { registerListingRoutes } from "./listings";
import { registerChatRoutes } from "./chat";
import { registerCollectionRoutes } from "./collection";
import { registerMiscRoutes } from "./misc";

export async function registerRoutes(app: Express) {
  console.log("ROUTES REGISTERING (MODULAR)");

  // Load routes
  registerAuthRoutes(app);
  registerUserRoutes(app);
  registerAdminRoutes(app);
  registerListingRoutes(app);
  registerChatRoutes(app);
  registerCollectionRoutes(app);
  registerMiscRoutes(app);
}