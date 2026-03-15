const express = require("express");

const { all, get, run } = require("../db");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticate, async (req, res) => {
  try {
    const games = await all(
      "SELECT id, title, genre, platform, price, stock, created_at, updated_at FROM games ORDER BY id DESC"
    );
    return res.json({ games });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/", authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, genre, platform, price, stock } = req.body;

    if (!title || !genre || !platform || price === undefined || stock === undefined) {
      return res.status(400).json({ message: "All game fields are required" });
    }

    const result = await run(
      `INSERT INTO games (title, genre, platform, price, stock, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [title, genre, platform, Number(price), Number(stock)]
    );

    const game = await get(
      "SELECT id, title, genre, platform, price, stock, created_at, updated_at FROM games WHERE id = ?",
      [result.lastID]
    );

    return res.status(201).json({ message: "Game created", game });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const gameId = Number(req.params.id);
    const { title, genre, platform, price, stock } = req.body;

    if (!title || !genre || !platform || price === undefined || stock === undefined) {
      return res.status(400).json({ message: "All game fields are required" });
    }

    const exists = await get("SELECT id FROM games WHERE id = ?", [gameId]);
    if (!exists) {
      return res.status(404).json({ message: "Game not found" });
    }

    await run(
      `UPDATE games SET title = ?, genre = ?, platform = ?, price = ?, stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [title, genre, platform, Number(price), Number(stock), gameId]
    );

    const game = await get(
      "SELECT id, title, genre, platform, price, stock, created_at, updated_at FROM games WHERE id = ?",
      [gameId]
    );

    return res.json({ message: "Game updated", game });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const gameId = Number(req.params.id);

    const exists = await get("SELECT id FROM games WHERE id = ?", [gameId]);
    if (!exists) {
      return res.status(404).json({ message: "Game not found" });
    }

    await run("DELETE FROM games WHERE id = ?", [gameId]);

    return res.json({ message: "Game deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
