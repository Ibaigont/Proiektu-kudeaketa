const express = require("express");

const { all, get, run } = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticate, async (req, res) => {
  try {
    const favorites = await all(
      `SELECT g.id, g.title, g.genre, g.platform, g.price, g.stock
       FROM favorites f
       INNER JOIN games g ON g.id = f.game_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );

    return res.json({ favorites });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/:gameId", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "standard") {
      return res.status(403).json({ message: "Only standard users can save personal list items" });
    }

    const gameId = Number(req.params.gameId);
    const game = await get("SELECT id FROM games WHERE id = ?", [gameId]);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }

    await run(
      "INSERT OR IGNORE INTO favorites (user_id, game_id) VALUES (?, ?)",
      [req.user.id, gameId]
    );

    return res.status(201).json({ message: "Game added to personal list" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.delete("/:gameId", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "standard") {
      return res.status(403).json({ message: "Only standard users can remove personal list items" });
    }

    const gameId = Number(req.params.gameId);

    await run(
      "DELETE FROM favorites WHERE user_id = ? AND game_id = ?",
      [req.user.id, gameId]
    );

    return res.json({ message: "Game removed from personal list" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
