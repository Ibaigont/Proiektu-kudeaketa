const express = require("express");

const { all, get, run } = require("../db");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

function validateGameFields({ title, genre, platform, price, stock }) {
  if (!title || !genre || !platform || price === undefined || stock === undefined) {
    return "All game fields are required";
  }
  if (isNaN(Number(price)) || Number(price) < 0) {
    return "Price must be a non-negative number";
  }
  if (isNaN(Number(stock)) || Number(stock) < 0 || !Number.isInteger(Number(stock))) {
    return "Stock must be a non-negative integer";
  }
  return null;
}

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

    const validationError = validateGameFields({ title, genre, platform, price, stock });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const numPrice = Number(price);
    const numStock = Number(stock);

    const result = await run(
      `INSERT INTO games (title, genre, platform, price, stock, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [title, genre, platform, numPrice, numStock]
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

    const validationError = validateGameFields({ title, genre, platform, price, stock });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const numPrice = Number(price);
    const numStock = Number(stock);

    const result = await run(
      `UPDATE games SET title = ?, genre = ?, platform = ?, price = ?, stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [title, genre, platform, numPrice, numStock, gameId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: "Game not found" });
    }

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

    const result = await run("DELETE FROM games WHERE id = ?", [gameId]);

    if (result.changes === 0) {
      return res.status(404).json({ message: "Game not found" });
    }

    return res.json({ message: "Game deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
