import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Pool } from "pg";
import { logger } from "../logger.js";
import { getJwtSecret } from "../utils/jwt.js";

export function createAuthRouter(pool: Pool): express.Router {
  const router = express.Router();

  router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password required" });
      return;
    }

    try {
      const { rows } = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
      if (rows.length === 0) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const user = rows[0];
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const secret = getJwtSecret();
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, permissions: user.permissions },
        secret,
        { expiresIn: "24h" }
      );

      res.json({ token, user: { id: user.id, username: user.username, role: user.role, permissions: user.permissions } });
    } catch (err) {
      logger.error({ err }, "Login failed");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
