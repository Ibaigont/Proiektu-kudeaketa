const state = {
  token: localStorage.getItem("stimToken") || null,
  user: JSON.parse(localStorage.getItem("stimUser") || "null"),
  games: [],
  favorites: []
};

const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");
const userInfo = document.getElementById("user-info");
const welcomeText = document.getElementById("welcome-text");
const toast = document.getElementById("toast");
const gamesList = document.getElementById("games-list");
const favoritesList = document.getElementById("favorites-list");
const adminGamesList = document.getElementById("admin-games-list");
const adminTab = document.getElementById("admin-tab");
const myListTab = document.getElementById("my-list-tab");

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.classList.remove("hidden");
  toast.style.background = isError ? "#7f1d1d" : "#111827";

  setTimeout(() => toast.classList.add("hidden"), 2200);
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

function setSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem("stimToken", token);
  localStorage.setItem("stimUser", JSON.stringify(user));
}

function clearSession() {
  state.token = null;
  state.user = null;
  localStorage.removeItem("stimToken");
  localStorage.removeItem("stimUser");
}

function toggleAuthUI() {
  const loggedIn = Boolean(state.token && state.user);

  authSection.classList.toggle("hidden", loggedIn);
  appSection.classList.toggle("hidden", !loggedIn);
  userInfo.classList.toggle("hidden", !loggedIn);

  if (loggedIn) {
    welcomeText.textContent = `Usuario: ${state.user.username} (${state.user.role})`;

    const isAdmin = state.user.role === "admin";
    adminTab.classList.toggle("hidden", !isAdmin);
    myListTab.classList.toggle("hidden", isAdmin);
  }
}

function renderGames() {
  const canSaveFavorites = state.user && state.user.role === "standard";

  if (state.games.length === 0) {
    gamesList.innerHTML = "<p>No hay videojuegos disponibles.</p>";
    return;
  }

  gamesList.innerHTML = state.games
    .map((game) => {
      return `
        <article class="game-card">
          <h4>${escapeHtml(game.title)}</h4>
          <p><strong>Genero:</strong> ${escapeHtml(game.genre)}</p>
          <p><strong>Plataforma:</strong> ${escapeHtml(game.platform)}</p>
          <p><strong>Precio:</strong> ${Number(game.price).toFixed(2)} EUR</p>
          <p><strong>Stock:</strong> ${escapeHtml(game.stock)}</p>
          ${
            canSaveFavorites
              ? `<button class="btn" data-fav-add="${escapeHtml(game.id)}">Guardar en mi lista</button>`
              : ""
          }
        </article>
      `;
    })
    .join("");
}

function renderFavorites() {
  if (!state.user || state.user.role !== "standard") {
    favoritesList.innerHTML = "<p>Solo disponible para usuarios estandar.</p>";
    return;
  }

  if (state.favorites.length === 0) {
    favoritesList.innerHTML = "<p>Tu lista personal esta vacia.</p>";
    return;
  }

  favoritesList.innerHTML = state.favorites
    .map((game) => {
      return `
        <article class="game-card">
          <h4>${escapeHtml(game.title)}</h4>
          <p><strong>Genero:</strong> ${escapeHtml(game.genre)}</p>
          <p><strong>Plataforma:</strong> ${escapeHtml(game.platform)}</p>
          <p><strong>Precio:</strong> ${Number(game.price).toFixed(2)} EUR</p>
          <button class="btn btn-ghost" data-fav-remove="${escapeHtml(game.id)}">Quitar</button>
        </article>
      `;
    })
    .join("");
}

function renderAdminGames() {
  if (!state.user || state.user.role !== "admin") {
    adminGamesList.innerHTML = "<p>Solo administradores.</p>";
    return;
  }

  if (state.games.length === 0) {
    adminGamesList.innerHTML = "<p>No hay videojuegos que gestionar.</p>";
    return;
  }

  adminGamesList.innerHTML = state.games
    .map((game) => {
      return `
        <article class="game-card">
          <h4>${escapeHtml(game.title)}</h4>
          <p>${escapeHtml(game.genre)} | ${escapeHtml(game.platform)}</p>
          <p>Precio: ${Number(game.price).toFixed(2)} EUR | Stock: ${Number(game.stock)}</p>
          <div class="row-buttons">
            <button class="btn" data-edit="${escapeHtml(game.id)}">Editar</button>
            <button class="btn btn-ghost" data-delete="${escapeHtml(game.id)}">Eliminar</button>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadGames() {
  const data = await api("/api/games");
  state.games = data.games;
  renderGames();
  renderAdminGames();
}

async function loadFavorites() {
  if (!state.user || state.user.role !== "standard") {
    state.favorites = [];
    renderFavorites();
    return;
  }

  const data = await api("/api/favorites");
  state.favorites = data.favorites;
  renderFavorites();
}

async function bootstrapApp() {
  toggleAuthUI();

  if (!state.token || !state.user) {
    return;
  }

  try {
    await Promise.all([loadGames(), loadFavorites()]);
  } catch (error) {
    clearSession();
    toggleAuthUI();
    showToast(error.message, true);
  }
}

document.getElementById("register-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);

  try {
    await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        username: formData.get("username"),
        password: formData.get("password")
      })
    });

    event.target.reset();
    showToast("Registro completado. Ya puedes iniciar sesion.");
  } catch (error) {
    showToast(error.message, true);
  }
});

document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);

  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: formData.get("username"),
        password: formData.get("password")
      })
    });

    setSession(data.token, data.user);
    toggleAuthUI();
    await Promise.all([loadGames(), loadFavorites()]);
    event.target.reset();
    showToast("Sesion iniciada");
  } catch (error) {
    showToast(error.message, true);
  }
});

document.getElementById("logout-btn").addEventListener("click", () => {
  clearSession();
  toggleAuthUI();
  state.games = [];
  state.favorites = [];
  gamesList.innerHTML = "";
  favoritesList.innerHTML = "";
  adminGamesList.innerHTML = "";
  showToast("Sesion cerrada");
});

document.querySelectorAll(".tab-btn").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((tab) => tab.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"));

    button.classList.add("active");
    document.getElementById(button.dataset.tab).classList.add("active");
  });
});

gamesList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-fav-add]");
  if (!button) {
    return;
  }

  try {
    await api(`/api/favorites/${button.dataset.favAdd}`, { method: "POST" });
    await loadFavorites();
    showToast("Juego guardado en tu lista");
  } catch (error) {
    showToast(error.message, true);
  }
});

favoritesList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-fav-remove]");
  if (!button) {
    return;
  }

  try {
    await api(`/api/favorites/${button.dataset.favRemove}`, { method: "DELETE" });
    await loadFavorites();
    showToast("Juego eliminado de tu lista");
  } catch (error) {
    showToast(error.message, true);
  }
});

adminGamesList.addEventListener("click", async (event) => {
  const editBtn = event.target.closest("button[data-edit]");
  const deleteBtn = event.target.closest("button[data-delete]");

  if (editBtn) {
    const game = state.games.find((item) => item.id === Number(editBtn.dataset.edit));
    if (!game) {
      return;
    }

    document.getElementById("game-id").value = game.id;
    document.getElementById("title").value = game.title;
    document.getElementById("genre").value = game.genre;
    document.getElementById("platform").value = game.platform;
    document.getElementById("price").value = game.price;
    document.getElementById("stock").value = game.stock;
    document.getElementById("save-game-btn").textContent = "Actualizar";
    return;
  }

  if (deleteBtn) {
    const gameId = Number(deleteBtn.dataset.delete);

    try {
      await api(`/api/games/${gameId}`, { method: "DELETE" });
      await Promise.all([loadGames(), loadFavorites()]);
      showToast("Juego eliminado");
    } catch (error) {
      showToast(error.message, true);
    }
  }
});

document.getElementById("game-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const gameId = document.getElementById("game-id").value;
  const payload = {
    title: document.getElementById("title").value.trim(),
    genre: document.getElementById("genre").value.trim(),
    platform: document.getElementById("platform").value.trim(),
    price: Number(document.getElementById("price").value),
    stock: Number(document.getElementById("stock").value)
  };

  try {
    if (gameId) {
      await api(`/api/games/${gameId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      showToast("Juego actualizado");
    } else {
      await api("/api/games", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      showToast("Juego creado");
    }

    document.getElementById("game-form").reset();
    document.getElementById("game-id").value = "";
    document.getElementById("save-game-btn").textContent = "Guardar";

    await loadGames();
  } catch (error) {
    showToast(error.message, true);
  }
});

document.getElementById("reset-form-btn").addEventListener("click", () => {
  document.getElementById("game-form").reset();
  document.getElementById("game-id").value = "";
  document.getElementById("save-game-btn").textContent = "Guardar";
});

bootstrapApp();
