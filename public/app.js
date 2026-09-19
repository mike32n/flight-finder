let destinationsData = [];
let selectedDestinations = [];
let maxDestinations;
let maxNights;
let maxResults;

let currentFocus = -1;
let debounceTimer;

let currentResults = [];
let failedCount = 0;
let resultNodes = [];

let authUser = null;

/* ========================= */
/* INIT */
/* ========================= */

window.onload = async function () {
  const res = await fetch("/destinations");
  destinationsData = await res.json();

  try {
    const configRes = await fetch("/config");
    const config = await configRes.json();
    maxDestinations = config.destinations.maxSelected || 3;
    maxNights = config.search.maxNights || 30;
    maxResults = config.search.maxResults || 5;
  } catch {}

  setupAutocomplete();
  loadTheme();

  const nightsInput = document.getElementById("nights");

  nightsInput.addEventListener("input", () => {
    let value = Number(nightsInput.value);

    if (!value || value < 1) {
      value = 1;
    }
    if (value > maxNights) value = maxNights;

    nightsInput.value = value;
  });

  await loadCurrentUser();
  renderAuthUI();
};

/* ========================= */
/* AUTOCOMPLETE */
/* ========================= */

function setupAutocomplete() {
  const input = document.getElementById("destination-input");
  const list = document.getElementById("autocomplete-list");

  input.addEventListener("input", function () {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      const value = this.value.toLowerCase();
      list.innerHTML = "";
      currentFocus = -1;

      if (!value) {
        closeDropdown(list);
        return;
      }

      const filtered = destinationsData.filter(
        (d) =>
          d.label.toLowerCase().includes(value) ||
          d.value.toLowerCase().includes(value),
      );

      filtered.forEach((dest) => {
        const item = document.createElement("div");
        item.className = "autocomplete-item";

        item.innerHTML = highlightMatch(`${dest.label} (${dest.value})`, value);

        item.addEventListener("click", () => {
          selectDestination(dest);
        });

        list.appendChild(item);
      });

      filtered.length ? openDropdown(list) : closeDropdown(list);
    }, 120); // debounce
  });

  input.addEventListener("keydown", function (e) {
    const items = list.getElementsByClassName("autocomplete-item");

    if (e.key === "ArrowDown") {
      currentFocus++;
      addActive(items);
    } else if (e.key === "ArrowUp") {
      currentFocus--;
      addActive(items);
    } else if (e.key === "Enter") {
      e.preventDefault();

      if (currentFocus === -1 && items.length > 0) {
        items[0].click();
      } else if (items[currentFocus]) {
        items[currentFocus].click();
      }
    } else if (e.key === "Escape") {
      closeDropdown(list);
    }
  });

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".autocomplete-wrapper")) {
      closeDropdown(list);
    }
  });
}

/* ========================= */
/* HELPERS */
/* ========================= */

function highlightMatch(text, query) {
  const regex = new RegExp(`(${query})`, "gi");
  return text.replace(regex, `<strong>$1</strong>`);
}

/* ========================= */
/* DROPDOWN */
/* ========================= */

function openDropdown(list) {
  list.classList.remove("hidden");
  requestAnimationFrame(() => list.classList.add("open"));
}

function closeDropdown(list) {
  list.classList.remove("open");
  setTimeout(() => list.classList.add("hidden"), 150);
}

/* ========================= */
/* KEYBOARD */
/* ========================= */

function addActive(items) {
  if (!items || items.length === 0) return;

  removeActive(items);

  if (currentFocus >= items.length) currentFocus = 0;
  if (currentFocus < 0) currentFocus = items.length - 1;

  const activeItem = items[currentFocus];
  activeItem.classList.add("active");

  /* always visible */
  activeItem.scrollIntoView({
    block: "nearest",
    behavior: "auto",
  });
}

function removeActive(items) {
  for (let item of items) {
    item.classList.remove("active");
  }
}

/* ========================= */
/* DESTINATIONS */
/* ========================= */

function selectDestination(dest) {
  if (selectedDestinations.length >= maxDestinations) return;
  if (selectedDestinations.includes(dest.value)) return;

  selectedDestinations.push(dest.value);
  renderSelected();

  document.getElementById("destination-input").value = "";
  closeDropdown(document.getElementById("autocomplete-list"));
}

function renderSelected() {
  const container = document.getElementById("selected-container");
  container.innerHTML = "";

  selectedDestinations.forEach((code) => {
    const badge = document.createElement("div");
    badge.className = "iata-badge";
    badge.textContent = code;

    badge.addEventListener("click", () => {
      selectedDestinations = selectedDestinations.filter((c) => c !== code);
      renderSelected();
    });

    container.appendChild(badge);
  });

  document.getElementById("destination-input").disabled =
    selectedDestinations.length >= maxDestinations;
}

/* ========================= */
/* SEARCH */
/* ========================= */

async function search() {
  const weekday = Number(document.getElementById("weekday").value);
  const nights = Number(document.getElementById("nights").value);

  const container = document.getElementById("selected-container");
  const resultsDiv = document.getElementById("results");

  // validation FIRST
  if (selectedDestinations.length === 0) {
    container.innerHTML = `
    <div class="card error-card">
      ⚠️ Please select destination airport(s)
    </div>
  `;
    return;
  }

  resultsDiv.innerHTML = "";

  // footer reset
  initFooter(resultsDiv);

  // STATE
  currentResults = [];
  failedCount = 0;
  resultNodes = [];

  try {
    const response = await fetch("/search-stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        destinations: selectedDestinations,
        weekday,
        nights,
      }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop(); // maradék

      for (const part of parts) {
        console.log("RAW EVENT:", part);
        // END
        if (part.includes("event: end")) {
          updateFooter(resultsDiv, true);
          return;
        }

        // FAIL
        if (part.includes("event: fail")) {
          failedCount++;
          updateFooter(resultsDiv, false);
          continue;
        }

        // DATA
        if (part.includes("data:")) {
          const jsonStr = part.split("data: ")[1];
          if (!jsonStr) continue;

          const item = JSON.parse(jsonStr);

          insertSortedWithDOM(item, resultsDiv);
        }
      }
    }
  } catch (err) {
    resultsDiv.innerHTML = "Error occurred.";
  }
}

/* ========================= */
/* THEME */
/* ========================= */

function toggleTheme() {
  document.body.classList.toggle("dark");

  localStorage.setItem(
    "theme",
    document.body.classList.contains("dark") ? "dark" : "light",
  );
}

function loadTheme() {
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
  }
}

function changeNights(delta) {
  const input = document.getElementById("nights");

  let value = Number(input.value) || 1;
  value += delta;

  if (value < 1) value = 1;
  if (value > maxNights) value = maxNights;

  input.value = value;
}

function insertSorted(arr, item) {
  let left = 0;
  let right = arr.length;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);

    if (arr[mid].price < item.price) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  arr.splice(left, 0, item);

  // max results
  if (arr.length > maxResults) {
    arr.length = maxResults;
  }
}

function renderResults(results, container) {
  container.innerHTML = "";

  results.forEach((r) => {
    const div = document.createElement("div");
    div.className = "card";

    div.innerHTML = `
      <strong>→ ${r.destination.city} (${r.destination.code})</strong><br/>
      <span class="meta-info">
        ${r.departure} → ${r.return}
      </span><br/>
      💶 ${r.price.toLocaleString()}
    `;

    container.appendChild(div);
  });
}

function insertSortedWithDOM(item, container) {
  let index = 0;

  while (
    index < currentResults.length &&
    currentResults[index].price < item.price
  ) {
    index++;
  }

  // max results limit
  if (index >= maxResults) return;

  currentResults.splice(index, 0, item);

  const node = createCard(item);

  // insert into DOM
  const cards = container.querySelectorAll(".card");
  const footer = document.getElementById("results-footer");

  if (index >= cards.length) {
    container.insertBefore(node, footer);
  } else {
    container.insertBefore(node, cards[index]);
  }

  resultNodes.splice(index, 0, node);

  // cut off if more than maxResults
  if (currentResults.length > maxResults) {
    currentResults.pop();
    const removed = resultNodes.pop();
    removed.remove();
  }
}

function createCard(r) {
  const div = document.createElement("div");
  div.className = "card";

  div.innerHTML = `
    <strong>→ ${r.destination.city} (${r.destination.code})</strong><br/>
    <span class="meta-info">
      ${r.departure} → ${r.return}
    </span><br/>
    💶 ${r.currency} ${r.price.toLocaleString()}
  `;

  div.style.cursor = "pointer";

  div.addEventListener("click", () => {
    openFlight(r);
  });

  return div;
}

function updateFooter(container, isDone = false) {
  let el = document.getElementById("results-footer");

  if (!el) {
    el = document.createElement("div");
    el.id = "results-footer";
    el.className = "meta-info";
    container.appendChild(el);
  }

  if (isDone) {
    el.textContent = `Finished...(failed: ${failedCount})`;
  } else {
    el.textContent = `Loading... (fails: ${failedCount})`;
  }
}

function initFooter(container) {
  let el = document.getElementById("results-footer");

  if (!el) {
    el = document.createElement("div");
    el.id = "results-footer";
    el.className = "meta-info";
    container.appendChild(el);
  }

  el.textContent = "Loading...";
}

function openFlight(r) {
  const url = r.bookingUrl;

  window.open(url, "_blank");
}

function saveToken(token) {
  localStorage.setItem("authToken", token);
}

function getToken() {
  return localStorage.getItem("authToken");
}

function removeToken() {
  localStorage.removeItem("authToken");
}

async function loadCurrentUser() {
  const token = getToken();

  if (!token) {
    authUser = null;
    return;
  }

  try {
    const response = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      removeToken();
      authUser = null;
      return;
    }

    const data = await response.json();

    authUser = data.user;
  } catch {
    removeToken();
    authUser = null;
  }
}

function renderAuthUI() {
  const container = document.getElementById("auth-container");

  if (!container) return;

  if (authUser) {
    container.innerHTML = `
      <div class="auth-user-card">
        <div class="auth-user-icon">🔐</div>

        <div class="auth-user-info">
          <div class="auth-user-label">Signed in as</div>
          <div class="auth-user-email">${authUser.email}</div>
        </div>

        <button id="logout-btn">Logout</button>
      </div>
    `;

    document.getElementById("logout-btn").addEventListener("click", logout);
  } else {
    container.innerHTML = `
      <div class="auth-bar">
        <button id="login-btn">Login</button>
        <button id="register-btn">Register</button>
      </div>
    `;

    document
      .getElementById("login-btn")
      .addEventListener("click", () => openAuthModal("login"));

    document
      .getElementById("register-btn")
      .addEventListener("click", () => openAuthModal("register"));
  }
}

/* ========================= */
/* AUTH MODAL */
/* ========================= */

function openAuthModal(mode) {
  const modal = document.getElementById("auth-modal");

  const loginContainer = document.getElementById("login-form-container");

  const registerContainer = document.getElementById("register-form-container");

  const forgotContainer = document.getElementById("forgot-form-container");

  clearAuthMessages();

  modal.classList.remove("hidden");

  loginContainer.classList.add("hidden");
  registerContainer.classList.add("hidden");
  forgotContainer.classList.add("hidden");

  if (mode === "register") {
    registerContainer.classList.remove("hidden");
  } else if (mode === "forgot") {
    forgotContainer.classList.remove("hidden");
  } else {
    loginContainer.classList.remove("hidden");
  }
}

function closeAuthModal() {
  document.getElementById("auth-modal").classList.add("hidden");

  clearAuthMessages();

  document.getElementById("login-form").reset();
  document.getElementById("register-form").reset();
  document.getElementById("forgot-form").reset();
}

function clearAuthMessages() {
  document.getElementById("login-message").textContent = "";
  document.getElementById("register-message").textContent = "";
  document.getElementById("forgot-message").textContent = "";
}

function showAuthMessage(elementId, message, isError = true) {
  const element = document.getElementById(elementId);

  element.textContent = message;

  element.classList.toggle("error", isError);
  element.classList.toggle("success", !isError);
}

function setAuthButtonLoading(button, loadingText) {
  button.disabled = true;
  button.dataset.originalText = button.textContent;

  button.innerHTML = `
    <span class="auth-spinner"></span>
    ${loadingText}
  `;
}

function resetAuthButton(button) {
  button.disabled = false;
  button.textContent = button.dataset.originalText || button.textContent;
  delete button.dataset.originalText;
}

document
  .getElementById("login-form")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const button = event.target.querySelector('button[type="submit"]');

    setAuthButtonLoading(button, "Signing in...");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showAuthMessage("login-message", data.message);
        return;
      }

      saveToken(data.token);

      await loadCurrentUser();

      renderAuthUI();

      closeAuthModal();
    } catch {
      showAuthMessage("login-message", "Login failed.");
    } finally {
      resetAuthButton(button);
    }
  });

document
  .getElementById("register-form")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;
    const button = event.target.querySelector('button[type="submit"]');

    setAuthButtonLoading(button, "Creating account...");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showAuthMessage("register-message", data.message);
        return;
      }

      showAuthMessage(
        "register-message",
        "Registration successful. Please check your email to verify your account.",
        false,
      );

      document.getElementById("register-form").reset();
    } catch {
      showAuthMessage("register-message", "Registration failed.");
    } finally {
      resetAuthButton(button);
    }
  });

document
  .getElementById("forgot-form")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("forgot-email").value.trim();
    const button = event.target.querySelector('button[type="submit"]');

    setAuthButtonLoading(button, "Sending reset link...");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showAuthMessage("forgot-message", data.message);
        return;
      }

      showAuthMessage("forgot-message", data.message, false);

      document.getElementById("forgot-form").reset();
    } catch {
      showAuthMessage("forgot-message", "Request failed.");
    } finally {
      resetAuthButton(button);
    }
  });

document
  .getElementById("auth-modal-close")
  .addEventListener("click", closeAuthModal);

document
  .getElementById("show-register-btn")
  .addEventListener("click", () => openAuthModal("register"));

document
  .getElementById("show-login-btn")
  .addEventListener("click", () => openAuthModal("login"));

document
  .getElementById("forgot-password-btn")
  .addEventListener("click", () => openAuthModal("forgot"));

document
  .getElementById("back-to-login-btn")
  .addEventListener("click", () => openAuthModal("login"));

document.getElementById("auth-modal").addEventListener("click", (event) => {
  if (event.target.id === "auth-modal") {
    closeAuthModal();
  }
});

function logout() {
  removeToken();

  authUser = null;

  renderAuthUI();
}
