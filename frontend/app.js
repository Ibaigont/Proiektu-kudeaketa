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
const balanceText = document.getElementById("balance-text");
const addFundsBtn = document.getElementById("add-funds-btn");
const fundsModal = document.getElementById("funds-modal");
const fundsForm = document.getElementById("funds-form");
const fundsAmount = document.getElementById("funds-amount");
const fundsCancelBtn = document.getElementById("funds-cancel-btn");
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

function fallbackCoverFor(title) {
  const safeTitle = String(title || "No Cover")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300" role="img" aria-label="${safeTitle}">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#dbeafe" />
          <stop offset="100%" stop-color="#e2e8f0" />
        </linearGradient>
      </defs>
      <rect width="600" height="300" rx="18" fill="url(#bg)" />
      <circle cx="500" cy="70" r="58" fill="rgba(15, 118, 110, 0.18)" />
      <circle cx="110" cy="235" r="72" fill="rgba(190, 18, 60, 0.16)" />
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
        fill="#334155" font-family="Trebuchet MS, Segoe UI, sans-serif" font-size="34" font-weight="700">
        ${safeTitle}
      </text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
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

function formatBalance(value, isAdmin = false) {
  if (isAdmin) {
    return "∞";
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return "0.00 EUR";
  }
  return `${num.toFixed(2)} EUR`;
}

function updateUserInfo() {
  if (!state.user) return;
  welcomeText.textContent = `Erabiltzailea: ${state.user.username} (${state.user.role})`;
  if (balanceText) {
    balanceText.textContent = `Saldoa: ${formatBalance(state.user.balance, state.user.role === "admin")}`;
  }
}

function setSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem("stimToken", token);
  localStorage.setItem("stimUser", JSON.stringify(user));
  updateUserInfo();
  trackEvent("User_Login", { username: user.username, role: user.role });
}

function updateStoredUser(user) {
  state.user = user;
  localStorage.setItem("stimUser", JSON.stringify(user));
  updateUserInfo();
}

function openFundsModal() {
  if (!fundsModal) return;
  fundsModal.classList.remove("hidden");
  fundsModal.setAttribute("aria-hidden", "false");
  if (fundsAmount) {
    fundsAmount.value = "";
    fundsAmount.focus();
  }
}

function closeFundsModal() {
  if (!fundsModal) return;
  fundsModal.classList.add("hidden");
  fundsModal.setAttribute("aria-hidden", "true");
  if (fundsForm) {
    fundsForm.reset();
  }
}

function clearSession() {
  trackEvent("User_Logout", { username: state.user?.username });
  state.token = null;
  state.user = null;
  localStorage.removeItem("stimToken");
  localStorage.removeItem("stimUser");
  if (balanceText) {
    balanceText.textContent = "";
  }
  closeFundsModal();
}

function toggleAuthUI() {
  const loggedIn = Boolean(state.token && state.user);

  authSection.classList.toggle("hidden", loggedIn);
  appSection.classList.toggle("hidden", !loggedIn);
  userInfo.classList.toggle("hidden", !loggedIn);

  if (loggedIn) {
    updateUserInfo();

    const isAdmin = state.user.role === "admin";
    const isStandard = state.user.role === "standard";
    
    adminTab.classList.toggle("hidden", !isAdmin);
    myListTab.classList.toggle("hidden", !isStandard);
    mySalesTab.classList.toggle("hidden", !isStandard); // Mostrar ventas solo a usuarios estándar
    if (addFundsBtn) {
      addFundsBtn.classList.toggle("hidden", !isStandard);
    }
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
      const coverSrc = game.cover_image && game.cover_image.trim()
        ? game.cover_image.trim()
        : fallbackCoverFor(game.title);
      const fallbackSrc = fallbackCoverFor(game.title);
      const coverHtml = `<img src="${escapeHtml(coverSrc)}" alt="${escapeHtml(game.title)}" class="game-cover" loading="lazy" data-fallback="${escapeHtml(fallbackSrc)}" />`;
      const hasStock = Number(game.stock) > 0;
      const hasBalance = typeof state.user?.balance === "number"
        ? state.user.balance >= Number(game.price)
        : true;
      const buyDisabled = !hasStock;
      const buyTitle = !hasStock ? "Ez dago stockik" : !hasBalance ? "Saldo nahikorik ez" : "Erosi";
        
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
                   <button class="btn" data-buy="${escapeHtml(game.id)}" ${buyDisabled ? "disabled" : ""} title="${escapeHtml(buyTitle)}">Erosi</button>
                 </div>`
              : ""
          }
        </article>
      `;
    })
    .join("");
}

function handleCoverError(event) {
  const image = event.target;
  if (!(image instanceof HTMLImageElement)) return;
  if (!image.classList.contains("game-cover")) return;

  const fallbackSrc = image.dataset.fallback;
  if (fallbackSrc && image.src !== fallbackSrc) {
    image.src = fallbackSrc;
  }
}

gamesList.addEventListener("error", handleCoverError, true);
favoritesList.addEventListener("error", handleCoverError, true);

function renderFavorites() {
  if (!state.user || state.user.role !== "standard") return;

  if (state.favorites.length === 0) {
    favoritesList.innerHTML = "<p>Zure zerrenda pertsonala hutsik dago.</p>";
    return;
  }

  favoritesList.innerHTML = state.favorites
    .map((game) => {
      const coverSrc = game.cover_image && game.cover_image.trim()
        ? game.cover_image.trim()
        : fallbackCoverFor(game.title);
      const fallbackSrc = fallbackCoverFor(game.title);
      const coverHtml = `<img src="${escapeHtml(coverSrc)}" alt="${escapeHtml(game.title)}" class="game-cover" loading="lazy" data-fallback="${escapeHtml(fallbackSrc)}" />`;
      return `
        <article class="game-card">
          ${coverHtml}
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
  const buyBtn = event.target.closest("button[data-buy]");

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

  if (buyBtn) {
    if (buyBtn.disabled) return;
    const gameId = Number(buyBtn.dataset.buy);
    const game = state.games.find((item) => item.id === gameId);
    if (!game) {
      showToast("Jokoa ez da aurkitu", true);
      return;
    }
    if (Number(game.stock) <= 0) {
      showToast("Ez dago stockik", true);
      return;
    }
    const balance = Number(state.user?.balance);
    if (Number.isFinite(balance) && balance < Number(game.price)) {
      showToast("Saldo nahikorik ez", true);
      return;
    }
    try {
      const data = await api(`/api/games/${gameId}/purchase`, { method: "POST" });
      if (data.user) {
        updateStoredUser(data.user);
      }
      await Promise.all([loadGames(), loadFavorites()]);
      showToast("Erosketa eginda!");
      trackEvent("Purchase_Completed", { gameId, userId: state.user.id });
    } catch (error) {
      showToast(error.message, true);
    }
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
    await api("/api/games/user-sale", { method: "POST", body: JSON.stringify(payload) });
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

if (addFundsBtn) {
  addFundsBtn.addEventListener("click", () => {
    if (!state.user || state.user.role !== "standard") return;
    openFundsModal();
  });
}

if (fundsCancelBtn) {
  fundsCancelBtn.addEventListener("click", closeFundsModal);
}

if (fundsModal) {
  fundsModal.addEventListener("click", (event) => {
    if (event.target === fundsModal) {
      closeFundsModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && fundsModal && !fundsModal.classList.contains("hidden")) {
    closeFundsModal();
  }
});

if (fundsForm) {
  fundsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!fundsAmount) return;
    const amount = Number(fundsAmount.value);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast("Sartu balio egokia", true);
      return;
    }

    try {
      const data = await api("/api/auth/funds", {
        method: "POST",
        body: JSON.stringify({ amount })
      });
      if (data.user) {
        updateStoredUser(data.user);
      }
      renderGames();
      closeFundsModal();
      showToast("Saldoa eguneratuta");
      trackEvent("Balance_Added", { amount, userId: state.user?.id });
    } catch (error) {
      showToast(error.message, true);
    }
  });
}

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