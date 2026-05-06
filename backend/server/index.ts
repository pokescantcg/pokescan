import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "./routes/index";
import { warmupDb, db } from "./db";
import * as fs from "fs";
import * as path from "path";
import cors from "cors";

const app = express();
const log = console.log;

// -------------------- TEST ROUTE (KEEP THIS FOR DEBUGGING) --------------------
app.get("/api/test", (_req, res) => {
  res.json({ ok: true });
});

// TEMP test route
app.get("/api/users", (_req, res) => {
  res.json([{ id: 1, email: "test@example.com" }]);
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// -------------------- CORS (FIXED) --------------------
const allowedOrigins = [
  "http://localhost:8081",
  "http://localhost:19006",
  "http://localhost:3000",
  "https://pokescantcg.onrender.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, true); // 🔥 allow all for now (fixes your issue immediately)
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// 🔥 REQUIRED for preflight
app.options("/*", cors());

// -------------------- BODY --------------------
function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      limit: "10mb",
      verify: (req, _res, buf) => {
        (req as any).rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false, limit: "10mb" }));
}

// -------------------- LOGGING --------------------
function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;

    let capturedJsonResponse: Record<string, unknown> | undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;

      const duration = Date.now() - start;

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 120) {
        logLine = logLine.slice(0, 119) + "…";
      }

      log(logLine);
    });

    next();
  });
}

// -------------------- EXPO + LANDING --------------------
function getAppName(): string {
  try {
    const appJson = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "app.json"), "utf-8"),
    );
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  res.send(fs.readFileSync(manifestPath, "utf-8"));
}

function configureExpoAndLanding(app: express.Application) {
  const template = fs.readFileSync(
    path.resolve(process.cwd(), "backend/server/templates/landing-page.html"),
    "utf-8",
  );

  const appName = getAppName();

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) return next();

    if (req.path === "/" || req.path === "/manifest") {
      const platform = req.header("expo-platform");

      if (platform === "ios" || platform === "android") {
        return serveExpoManifest(platform, res);
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const html = template
        .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
        .replace(/APP_NAME_PLACEHOLDER/g, appName);

      return res.send(html);
    }

    next();
  });

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));
}

// -------------------- BAN MIDDLEWARE (FIXED DB) --------------------
function setupBanMiddleware(app: express.Application) {
  app.use(async (req: any, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) return next();

      const result = await db.query(
        `SELECT is_banned, banned_reason FROM pokescan_users WHERE id = $1`,
        [userId],
      );

      const user = result.rows[0];

      if (user?.is_banned) {
        return res.status(403).json({
          error: "Account banned",
          reason: user.banned_reason || "No reason provided",
        });
      }

      next();
    } catch (err) {
      console.error("Ban middleware error:", err);
      next();
    }
  });
}

// -------------------- ERROR HANDLER --------------------
function setupErrorHandler(app: express.Application) {
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    console.error("Internal Server Error:", err);

    if (res.headersSent) return next(err);

    res.status(err.status || 500).json({
      message: err.message || "Internal Server Error",
    });
  });
}

// -------------------- START SERVER --------------------
(async () => {
  setupBodyParsing(app);
  setupRequestLogging(app);

  configureExpoAndLanding(app);

  await warmupDb();

  setupBanMiddleware(app);

  await registerRoutes(app);

  setupErrorHandler(app);

  const port = parseInt(process.env.PORT || "5000", 10);

  app.listen(port, "0.0.0.0", () => {
    log(`Server running on port ${port}`);
  });
})();