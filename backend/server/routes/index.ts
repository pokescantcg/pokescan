import { Express } from "express";

// Route modules
import { registerAuthRoutes } from "./auth";
import { registerUserRoutes } from "./user";
import { registerAdminRoutes } from "./admin";
import { registerListingRoutes } from "./listings";
import { registerChatRoutes } from "./chat";
import { registerCollectionRoutes } from "./collection";
import { registerMiscRoutes } from "./misc";

export async function registerRoutes(app: Express) {
  console.log("🚀 Registering API routes...");

  try {
    registerAuthRoutes(app);
    registerUserRoutes(app);
    registerAdminRoutes(app);
    registerListingRoutes(app);
    registerChatRoutes(app);
    registerCollectionRoutes(app);
    registerMiscRoutes(app);

    console.log("✅ All routes registered successfully");
  } catch (err) {
    console.error("❌ Route registration failed:", err);
    throw err; // crash early instead of silently failing
  }
}