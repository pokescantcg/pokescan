import { Express, Request, Response } from "express";
import { db } from "../db"; // adjust path if needed

export function registerAuthRoutes(app: Express) {
  console.log("🔐 Auth routes loaded");

  // --------------------------------------------------
  // VERIFY PASSWORD
  // --------------------------------------------------
  app.post("/api/auth/verify-password", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Missing credentials" });
      }

      const result = await db.query(
        "SELECT id, password_hash FROM pokescan_users WHERE email = $1",
        [email]
      );

      const user = result.rows[0];

      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // ⚠️ If you're using bcrypt, replace this
      const isValid = password === user.password_hash;

      if (!isValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      return res.json({
        success: true,
        userId: user.id,
      });

    } catch (err) {
      console.error("❌ Verify password error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  });
}