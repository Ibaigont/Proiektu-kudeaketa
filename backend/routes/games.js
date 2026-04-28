const express = require("express");

const { all, get, run } = require("../db");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

const VALID_CONDITIONS = new Set(["berria", "erabilia"]);

function parseCondition(value, fallback = "berria") {
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  return VALID_CONDITIONS.has(normalized) ? normalized : null;
}

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
      "SELECT id, title, genre, platform, price, stock, cover_image, condition, created_at, updated_at FROM games ORDER BY id DESC"
    );
    return res.json({ games });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/user-sale", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "standard") {
      return res.status(403).json({ message: "Only standard users can list second-hand games" });
    }

    const { title, genre, platform, price, cover_image } = req.body;
    const validationError = validateGameFields({ title, genre, platform, price, stock: 1 });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const numPrice = Number(price);
    const coverUrl = cover_image && cover_image.trim() ? cover_image.trim() : null;

    const result = await run(
      `INSERT INTO games (title, genre, platform, price, stock, cover_image, condition, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'erabilia', CURRENT_TIMESTAMP)`,
      [title, genre, platform, numPrice, 1, coverUrl]
    );

    const game = await get(
      "SELECT id, title, genre, platform, price, stock, cover_image, condition, created_at, updated_at FROM games WHERE id = ?",
      [result.lastID]
    );

    return res.status(201).json({ message: "Game listed", game });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/", authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, genre, platform, price, stock, cover_image, condition } = req.body;

    const validationError = validateGameFields({ title, genre, platform, price, stock });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const parsedCondition = parseCondition(condition);
    if (!parsedCondition) {
      return res.status(400).json({ message: "Condition must be 'berria' or 'erabilia'" });
    }

    const numPrice = Number(price);
    const numStock = Number(stock);
    const coverUrl = cover_image && cover_image.trim() ? cover_image.trim() : null;

    const result = await run(
      `INSERT INTO games (title, genre, platform, price, stock, cover_image, condition, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [title, genre, platform, numPrice, numStock, coverUrl, parsedCondition]
    );

    const game = await get(
      "SELECT id, title, genre, platform, price, stock, cover_image, condition, created_at, updated_at FROM games WHERE id = ?",
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
    const { title, genre, platform, price, stock, cover_image, condition } = req.body;

    const validationError = validateGameFields({ title, genre, platform, price, stock });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const parsedCondition = parseCondition(condition);
    if (!parsedCondition) {
      return res.status(400).json({ message: "Condition must be 'berria' or 'erabilia'" });
    }

    const numPrice = Number(price);
    const numStock = Number(stock);
    const coverUrl = cover_image && cover_image.trim() ? cover_image.trim() : null;

    const result = await run(
      `UPDATE games SET title = ?, genre = ?, platform = ?, price = ?, stock = ?, cover_image = ?, condition = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [title, genre, platform, numPrice, numStock, coverUrl, parsedCondition, gameId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: "Game not found" });
    }

    const game = await get(
      "SELECT id, title, genre, platform, price, stock, cover_image, condition, created_at, updated_at FROM games WHERE id = ?",
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

router.post("/:id/purchase", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "standard") {
      return res.status(403).json({ message: "Only standard users can purchase games" });
    }

    const gameId = Number(req.params.id);
    if (!Number.isInteger(gameId)) {
      return res.status(400).json({ message: "Invalid game id" });
    }

    const game = await get(
      "SELECT id, title, price, stock FROM games WHERE id = ?",
      [gameId]
    );
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }
    if (Number(game.stock) <= 0) {
      return res.status(400).json({ message: "Out of stock" });
    }

    const user = await get("SELECT id, balance FROM users WHERE id = ?", [req.user.id]);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (Number(user.balance) < Number(game.price)) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    let removed = false;
    await run("BEGIN TRANSACTION");
    try {
      const stockResult = await run(
        "UPDATE games SET stock = stock - 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND stock > 0",
        [gameId]
      );
      if (stockResult.changes === 0) {
        await run("ROLLBACK");
        return res.status(409).json({ message: "Out of stock" });
      }

      const balanceResult = await run(
        "UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?",
        [game.price, req.user.id, game.price]
      );
      if (balanceResult.changes === 0) {
        await run("ROLLBACK");
        return res.status(409).json({ message: "Insufficient balance" });
      }

      const remaining = await get("SELECT stock FROM games WHERE id = ?", [gameId]);
      if (!remaining) {
        await run("ROLLBACK");
        return res.status(404).json({ message: "Game not found" });
      }
      if (Number(remaining.stock) <= 0) {
        await run("DELETE FROM games WHERE id = ?", [gameId]);
        removed = true;
      }

      await run("COMMIT");
    } catch (error) {
      await run("ROLLBACK");
      throw error;
    }

    const updatedUser = await get(
      "SELECT id, username, role, balance FROM users WHERE id = ?",
      [req.user.id]
    );
    const updatedGame = removed
      ? null
      : await get(
          "SELECT id, title, genre, platform, price, stock, cover_image, condition, created_at, updated_at FROM games WHERE id = ?",
          [gameId]
        );

    return res.json({ message: "Purchase completed", user: updatedUser, game: updatedGame, removed });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
