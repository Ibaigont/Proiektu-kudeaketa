const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");

const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "stim.sqlite");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

function run(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });
}

function get(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

function all(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

async function initDb() {
  await run("PRAGMA foreign_keys = ON");

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'standard')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      genre TEXT NOT NULL,
      platform TEXT NOT NULL,
      price REAL NOT NULL CHECK(price >= 0),
      stock INTEGER NOT NULL CHECK(stock >= 0),
      cover_image TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: add cover_image column to existing databases
  const gameColumns = await all("PRAGMA table_info(games)");
  const hasCoverImage = gameColumns.some((col) => col.name === "cover_image");
  if (!hasCoverImage) {
    await run("ALTER TABLE games ADD COLUMN cover_image TEXT");
  }

  await run(`
    CREATE TABLE IF NOT EXISTS favorites (
      user_id INTEGER NOT NULL,
      game_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(user_id, game_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  const admin = await get("SELECT id FROM users WHERE username = ?", ["admin"]);
  if (!admin) {
    const adminHash = bcrypt.hashSync("admin123", 10);
    await run(
      "INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')",
      ["admin", adminHash]
    );
  }

  const count = await get("SELECT COUNT(*) AS total FROM games");
  if (!count || count.total === 0) {
    const seedGames = [
      ["Elden Ring", "Action RPG", "PC", 59.99, 25, "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg"],
      ["Hades", "Roguelike", "PC", 24.99, 40, "https://cdn.cloudflare.steamstatic.com/steam/apps/1145360/header.jpg"],
      ["Stardew Valley", "Simulation", "PC", 14.99, 60, "https://cdn.cloudflare.steamstatic.com/steam/apps/413150/header.jpg"],
      ["Cyberpunk 2077", "Action RPG", "PC", 49.99, 18, "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg"]
    ];

    await run("BEGIN TRANSACTION");
    for (const game of seedGames) {
      await run(
        `INSERT INTO games (title, genre, platform, price, stock, cover_image) VALUES (?, ?, ?, ?, ?, ?)`,
        game
      );
    }
    await run("COMMIT");
  }

  const defaultCoversByTitle = {
    "Elden Ring": "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg",
    Hades: "https://cdn.cloudflare.steamstatic.com/steam/apps/1145360/header.jpg",
    "Stardew Valley": "https://cdn.cloudflare.steamstatic.com/steam/apps/413150/header.jpg",
    "Cyberpunk 2077": "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg"
  };

  for (const [title, cover] of Object.entries(defaultCoversByTitle)) {
    await run(
      `UPDATE games
       SET cover_image = ?, updated_at = CURRENT_TIMESTAMP
       WHERE title = ? AND (cover_image IS NULL OR TRIM(cover_image) = '')`,
      [cover, title]
    );
  }
}

module.exports = {
  db,
  run,
  get,
  all,
  initDb
};
