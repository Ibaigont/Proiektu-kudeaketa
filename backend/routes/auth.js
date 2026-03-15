const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { run, get } = require("../db");
const { JWT_SECRET, authenticate } = require("../middleware/auth");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existing = await get("SELECT id FROM users WHERE username = ?", [username]);
    if (existing) {
      return res.status(409).json({ message: "Username already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await run(
      "INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'standard')",
      [username, passwordHash]
    );

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: result.lastID,
        username,
        role: "standard"
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const user = await get("SELECT id, username, password_hash, role FROM users WHERE username = ?", [username]);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/me", authenticate, async (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router;
