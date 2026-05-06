import { Express, Request, Response } from "express";
import bcrypt from "bcrypt";

import { pool } from "../db";
import { storage } from "../storage";

import {
  createOtp,
  verifyOtp,
  sendOtpByEmail,
  sendOtpBySms,
} from "../otp-service";

export function registerAuthRoutes(app: Express) {
  console.log("Auth routes loaded");

  // =====================================================
  // 🔐 LOGIN (email OR username)
  // =====================================================

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { credential, password } = req.body;

      console.log("LOGIN ATTEMPT:", credential);

      if (!credential || !password) {
        return res.status(400).json({ error: "Email/username and password are required" });
      }

      // Try email first
      let user = await pool.query(
        "SELECT * FROM pokescan_users WHERE email = $1",
        [credential.toLowerCase().trim()]
      );

      console.log("EMAIL MATCH:", user.rows.length);

      // If not found by email → try username
      if (!user.rows.length) {
        user = await pool.query(
          "SELECT * FROM pokescan_users WHERE username = $1",
          [credential.toLowerCase().trim()]
        );

        console.log("USERNAME MATCH:", user.rows.length);
      }

      if (!user.rows.length) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const dbUser = user.rows[0];

      console.log("USER FOUND:", dbUser.email);

      if (!dbUser.password_hash) {
        return res.status(401).json({
          error: "This account does not have a password set. Contact an admin.",
        });
      }

      const isValid = await bcrypt.compare(password, dbUser.password_hash);

      console.log({
        password,
        hash: dbUser.password_hash,
        isValid,
      });

      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = await storage.createSession(dbUser.id);

      const { password_hash: _ph, ...safeUser } = dbUser;

      res.json({ token, user: safeUser });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: error.message || "Login failed" });
    }
  });

  // =====================================================
  // 📩 SEND OTP (LOGIN)
  // =====================================================

  app.post("/api/auth/send-otp", async (req: Request, res: Response) => {
    try {
      const { credential, channel } = req.body;

      if (!credential || !channel) {
        return res.status(400).json({ error: "credential and channel are required" });
      }

      if (channel !== "email" && channel !== "sms") {
        return res.status(400).json({ error: "channel must be 'email' or 'sms'" });
      }

      let user = null;

      if (channel === "email") {
        user = await storage.getUserByEmail(credential);
      } else {
        user = await storage.getUserByMobile(credential) ||
               await storage.getUserByEmail(credential);
      }

      if (!user) {
        return res.status(404).json({ error: "No account found with this credential" });
      }

      const { code, rateLimited } = createOtp(credential);

      if (rateLimited) {
        return res.status(429).json({ error: "Too many requests. Please wait." });
      }

      const sent =
        channel === "email"
          ? await sendOtpByEmail(user.email, code)
          : await sendOtpBySms(user.mobileNumber, code);

      if (!sent) {
        return res.status(500).json({ error: "Failed to send verification code" });
      }

      res.json({ message: "Verification code sent", userId: user.id });
    } catch (error: any) {
      console.error("Send OTP error:", error);
      res.status(500).json({ error: error.message || "Failed to send OTP" });
    }
  });

  // =====================================================
  // 🆕 SEND OTP (REGISTER)
  // =====================================================

  app.post("/api/auth/send-otp-register", async (req: Request, res: Response) => {
    try {
      const { userId, channel } = req.body;

      if (!userId || !channel) {
        return res.status(400).json({ error: "userId and channel are required" });
      }

      const user = await storage.getUserById(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const target = channel === "email" ? user.email : user.mobileNumber;

      const { code, rateLimited } = createOtp(target);

      if (rateLimited) {
        return res.status(429).json({ error: "Too many requests. Please wait." });
      }

      const sent =
        channel === "email"
          ? await sendOtpByEmail(user.email, code)
          : await sendOtpBySms(user.mobileNumber, code);

      if (!sent) {
        return res.status(500).json({ error: "Failed to send verification code" });
      }

      res.json({ message: "Verification code sent" });
    } catch (error: any) {
      console.error("Send OTP register error:", error);
      res.status(500).json({ error: error.message || "Failed to send OTP" });
    }
  });

  // =====================================================
  // ✅ VERIFY OTP
  // =====================================================

  app.post("/api/auth/verify-otp", async (req: Request, res: Response) => {
    try {
      const { credential, code } = req.body;

      if (!credential || !code) {
        return res.status(400).json({ error: "credential and code are required" });
      }

      const result = verifyOtp(credential, code);

      if (!result.valid) {
        if (result.tooManyAttempts) {
          return res.status(429).json({ error: "Too many attempts" });
        }

        return res.status(401).json({
          error: result.expired
            ? "Code expired"
            : "Incorrect code",
        });
      }

      let user =
        await storage.getUserByEmail(credential) ||
        await storage.getUserByMobile(credential);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const token = await storage.createSession(user.id);

      res.json({ token, user });
    } catch (error: any) {
      console.error("Verify OTP error:", error);
      res.status(500).json({ error: error.message || "Verification failed" });
    }
  });

  // =====================================================
  // 🔁 SESSION CHECK
  // =====================================================

  app.post("/api/auth/session", async (req: Request, res: Response) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: "token is required" });
      }

      const user = await storage.validateSession(token);

      if (!user) {
        return res.status(401).json({ error: "Invalid session" });
      }

      res.json({ user });
    } catch (error: any) {
      console.error("Session validation error:", error);
      res.status(500).json({ error: error.message || "Session failed" });
    }
  });

  // =====================================================
  // 🚪 LOGOUT
  // =====================================================

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      const { token } = req.body;

      if (token) {
        await storage.deleteSession(token);
      }

      res.json({ message: "Logged out" });
    } catch (error: any) {
      console.error("Logout error:", error);
      res.status(500).json({ error: error.message || "Logout failed" });
    }
  });
}