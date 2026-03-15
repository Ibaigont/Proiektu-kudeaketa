const path = require("path");
const express = require("express");

const { initDb } = require("./db");
const authRoutes = require("./routes/auth");
const gameRoutes = require("./routes/games");
const favoriteRoutes = require("./routes/favorites");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/favorites", favoriteRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "STIM" });
});

app.use(express.static(path.join(__dirname, "..", "frontend")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`STIM server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database", error);
    process.exit(1);
  });
