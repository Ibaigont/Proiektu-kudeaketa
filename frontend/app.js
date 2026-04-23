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

// Tabs
const adminTab = document.getElementById("admin-tab");
const myListTab = document.getElementById("my-list-tab");
const mySalesTab = document.getElementById("my-sales-tab"); // NUEVO

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

// Simulador de Analíticas (Cumpliendo objetivo de recolección de datos)
function trackEvent(eventName, eventData) {
  console.log(`[ANALYTICS] Event: ${eventName}`, eventData);
  // En un entorno real, aquí haríamos un fetch a un endpoint de analíticas
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
  trackEvent("User_Login", { username: user.username, role: user.role });
}

function clearSession() {
  trackEvent("User_Logout", { username: state.user?.username });
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
    welcomeText.textContent = `Erabiltzailea: ${state.user.username} (${state.user.role})`;

    const isAdmin = state.user.role === "admin";
    const isStandard = state.user.role === "standard";
    
    adminTab.classList.toggle("hidden", !isAdmin);
    myListTab.classList.toggle("hidden", !isStandard);
    mySalesTab.classList.toggle("hidden", !isStandard); // Mostrar ventas solo a usuarios estándar
  }
}

function renderGames() {
  const canInteract = state.user && state.user.role === "standard";

  if (state.games.length === 0) {
    gamesList.innerHTML = "<p>Ez dago bideojoko erabilgarririk.</p>";
    return;
  }

  gamesList.innerHTML = state.games
    .map((game) => {
      const coverHtml = game.cover_image
        ? `<img src="${escapeHtml(game.cover_image)}" alt="${escapeHtml(game.title)}" class="game-cover" />`
        : "";
        
      // Lógica de condición (Nuevo / Segunda mano)
      const condition = game.condition || "berria"; // Por defecto berria si no existe
      const conditionLabel = condition === 'erabilia' ? 'Bigarren eskukoa' : 'Berria';
      const conditionClass = condition === 'erabilia' ? 'tag-erabilia' : 'tag-berria';

      return `
        <article class="game-card">
          ${coverHtml}
          <h4>${escapeHtml(game.title)}</h4>
          <span class="tag ${conditionClass}">${conditionLabel}</span>
          <p><strong>Generoa:</strong> ${escapeHtml(game.genre)}</p>
          <p><strong>Plataforma:</strong> ${escapeHtml(game.platform)}</p>
          <p><strong>Prezioa:</strong> ${Number(game.price).toFixed(2)} EUR</p>
          <p><strong>Stock:</strong> ${escapeHtml(game.stock)}</p>
          ${
            canInteract
              ? `<div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;">
                   <button class="btn btn-ghost" data-fav-add="${escapeHtml(game.id)}">Zerrendan gorde</button>
                   <button class="btn" style="background: linear-gradient(100deg, #be123c, #f43f5e);" data-group-buy="${escapeHtml(game.id)}">Taldeko erosketa</button>
                 </div>`
              : ""
          }
        </article>
      `;
    })
    .join("");
}

function renderFavorites() {
  if (!state.user || state.user.role !== "standard") return;

  if (state.favorites.length === 0) {
    favoritesList.innerHTML = "<p>Zure zerrenda pertsonala hutsik dago.</p>";
    return;
  }

  favoritesList.innerHTML = state.favorites
    .map((game) => {
      return `
        <article class="game-card">
          <h4>${escapeHtml(game.title)}</h4>
          <p><strong>Prezioa:</strong> ${Number(game.price).toFixed(2)} EUR</p>
          <button class="btn btn-ghost" data-fav-remove="${escapeHtml(game.id)}">Kendu</button>
        </article>
      `;
    })
    .join("");
}

function renderAdminGames() {
  if (!state.user || state.user.role !== "admin") return;

  if (state.games.length === 0) {
    adminGamesList.innerHTML = "<p>Ez dago kudeatzeko bideojokorik.</p>";
    return;
  }

  adminGamesList.innerHTML = state.games
    .map((game) => {
      const conditionLabel = game.condition === 'erabilia' ? '(Erabilia)' : '(Berria)';
      return `
        <article class="game-card">
          <h4>${escapeHtml(game.title)} ${conditionLabel}</h4>
          <p>${escapeHtml(game.genre)} | ${escapeHtml(game.platform)}</p>
          <p>Prezioa: ${Number(game.price).toFixed(2)} EUR | Stock: ${Number(game.stock)}</p>
          <div class="row-buttons">
            <button class="btn" data-edit="${escapeHtml(game.id)}">Editatu</button>
            <button class="btn btn-ghost" data-delete="${escapeHtml(game.id)}">Ezabatu</button>
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
  if (!state.user || state.user.role !== "standard") return;
  const data = await api("/api/favorites");
  state.favorites = data.favorites;
  renderFavorites();
}

async function bootstrapApp() {
  toggleAuthUI();
  if (!state.token || !state.user) return;

  try {
    await Promise.all([loadGames(), loadFavorites()]);
  } catch (error) {
    clearSession();
    toggleAuthUI();
    showToast(error.message, true);
  }
}

// Lógica de Tabs
document.querySelectorAll(".tab-btn").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((tab) => tab.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"));

    button.classList.add("active");
    document.getElementById(button.dataset.tab).classList.add("active");
    
    trackEvent("Tab_Changed", { tab: button.dataset.tab });
  });
});

// Lógica de Catálogo (Añadir a lista y Compra en Grupo)
gamesList.addEventListener("click", async (event) => {
  const favBtn = event.target.closest("button[data-fav-add]");
  const groupBtn = event.target.closest("button[data-group-buy]");

  if (favBtn) {
    try {
      await api(`/api/favorites/${favBtn.dataset.favAdd}`, { method: "POST" });
      await loadFavorites();
      showToast("Jokoa zure zerrendan gordeta");
      trackEvent("Added_To_Favorites", { gameId: favBtn.dataset.favAdd });
    } catch (error) {
      showToast(error.message, true);
    }
  }

  if (groupBtn) {
    // Aquí iría la lógica real de backend para agrupar usuarios
    showToast("Taldeko erosketa eskaera bidali da! (Simulazioa)");
    trackEvent("Group_Buy_Initiated", { gameId: groupBtn.dataset.groupBuy, userId: state.user.id });
  }
});

// Administrar formulario de Juegos (Admin)
document.getElementById("game-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const gameId = document.getElementById("game-id").value;
  const payload = {
    title: document.getElementById("title").value.trim(),
    genre: document.getElementById("genre").value.trim(),
    platform: document.getElementById("platform").value.trim(),
    price: Number(document.getElementById("price").value),
    stock: Number(document.getElementById("stock").value),
    condition: document.getElementById("condition").value, // NUEVO
    cover_image: document.getElementById("cover-image").value.trim() || null
  };

  try {
    if (gameId) {
      await api(`/api/games/${gameId}`, { method: "PUT", body: JSON.stringify(payload) });
      showToast("Jokoa eguneratuta");
    } else {
      await api("/api/games", { method: "POST", body: JSON.stringify(payload) });
      showToast("Jokoa sortuta");
    }

    document.getElementById("game-form").reset();
    document.getElementById("game-id").value = "";
    document.getElementById("save-game-btn").textContent = "Gorde";
    await loadGames();
  } catch (error) {
    showToast(error.message, true);
  }
});

// Administrar formulario de Juegos (Usuario Estándar - Venta Segunda Mano)
document.getElementById("user-sale-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    title: document.getElementById("user-title").value.trim(),
    genre: document.getElementById("user-genre").value.trim(),
    platform: document.getElementById("user-platform").value.trim(),
    price: Number(document.getElementById("user-price").value),
    stock: Number(document.getElementById("user-stock").value), // Siempre 1
    condition: document.getElementById("user-condition").value, // Siempre 'erabilia'
    cover_image: document.getElementById("user-cover-image").value.trim() || null
  };

  try {
    // En un proyecto real esto podría ir a un endpoint diferente como /api/user-sales
    await api("/api/games", { method: "POST", body: JSON.stringify(payload) });
    showToast("Zure jokoa salgai jarri da!");
    trackEvent("User_Game_Listed", { title: payload.title });
    
    document.getElementById("user-sale-form").reset();
    await loadGames();
    
    // Cambiar a la pestaña de catálogo para ver el juego
    document.querySelector('[data-tab="catalogo"]').click();
  } catch (error) {
    showToast(error.message, true);
  }
});

// Autenticación, Borrado y otros listeners se mantienen igual (Register, Login, Logout)
document.getElementById("register-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  try {
    await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username: formData.get("username"), password: formData.get("password") })
    });
    event.target.reset();
    showToast("Erregistroa osatuta. Orain saioa has dezakezu.");
  } catch (error) { showToast(error.message, true); }
});

document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: formData.get("username"), password: formData.get("password") })
    });
    setSession(data.token, data.user);
    toggleAuthUI();
    await Promise.all([loadGames(), loadFavorites()]);
    event.target.reset();
    showToast("Saioa hasi da");
  } catch (error) { showToast(error.message, true); }
});

document.getElementById("logout-btn").addEventListener("click", () => {
  clearSession();
  toggleAuthUI();
  state.games = []; state.favorites = [];
  gamesList.innerHTML = ""; favoritesList.innerHTML = ""; adminGamesList.innerHTML = "";
  showToast("Saioa itxi da");
});

document.getElementById("reset-form-btn").addEventListener("click", () => {
  document.getElementById("game-form").reset();
  document.getElementById("game-id").value = "";
  document.getElementById("save-game-btn").textContent = "Gorde";
});

favoritesList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-fav-remove]");
  if (!button) return;
  try {
    await api(`/api/favorites/${button.dataset.favRemove}`, { method: "DELETE" });
    await loadFavorites();
    showToast("Jokoa zure zerrendatik ezabatuta");
  } catch (error) { showToast(error.message, true); }
});

adminGamesList.addEventListener("click", async (event) => {
  const editBtn = event.target.closest("button[data-edit]");
  const deleteBtn = event.target.closest("button[data-delete]");

  if (editBtn) {
    const game = state.games.find((item) => item.id === Number(editBtn.dataset.edit));
    if (!game) return;
    document.getElementById("game-id").value = game.id;
    document.getElementById("title").value = game.title;
    document.getElementById("genre").value = game.genre;
    document.getElementById("platform").value = game.platform;
    document.getElementById("price").value = game.price;
    document.getElementById("stock").value = game.stock;
    document.getElementById("condition").value = game.condition || "berria";
    document.getElementById("cover-image").value = game.cover_image || "";
    document.getElementById("save-game-btn").textContent = "Eguneratu";
    return;
  }

  if (deleteBtn) {
    try {
      await api(`/api/games/${Number(deleteBtn.dataset.delete)}`, { method: "DELETE" });
      await Promise.all([loadGames(), loadFavorites()]);
      showToast("Jokoa ezabatuta");
    } catch (error) { showToast(error.message, true); }
  }
});

bootstrapApp();