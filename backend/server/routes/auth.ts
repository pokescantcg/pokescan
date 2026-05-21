import bcrypt from "bcrypt";
import { Express, Request, Response } from "express";
import { db } from "../db";

export function registerAuthRoutes(app: Express) {
  console.log("🔐 Auth routes loaded");

  // --------------------------------------------------
  // VERIFY PASSWORD (LOGIN CHECK)
  // --------------------------------------------------
  app.post("/api/auth/verify-password", async (req: Request, res: Response) => {
    const start = Date.now();

    try {
      const { email, password } = req.body;

      // ------------------------------
      // VALIDATION
      // ------------------------------
      if (!email || !password) {
        return res.status(400).json({
          error: "Email and password are required",
        });
      }

      // ------------------------------
      // FETCH USER
      // ------------------------------
      const { rows } = await db.query(
        `SELECT id, password_hash 
         FROM pokescan_users 
         WHERE email = $1 
         LIMIT 1`,
        [email.toLowerCase()]
      );

      const user = rows[0];

      // ------------------------------
      // GENERIC FAIL (no info leak)
      // ------------------------------
      if (!user || !user.password_hash) {
        return res.status(401).json({
          error: "Invalid email or password",
        });
      }

      // ------------------------------
      // PASSWORD CHECK (bcrypt)
      // ------------------------------
      const isValid = await bcrypt.compare(password, user.password_hash);

      if (!isValid) {
        return res.status(401).json({
          error: "Invalid email or password",
        });
      }

      // ------------------------------
      // SUCCESS RESPONSE
      // ------------------------------
      return res.json({
        success: true,
        userId: user.id,
      });

    } catch (err) {
      console.error("❌ Auth verify-password error:", err);

      return res.status(500).json({
        error: "Internal server error",
      });
    } finally {
      const duration = Date.now() - start;
      console.log(`🔐 /verify-password completed in ${duration}ms`);
    }
  });
}