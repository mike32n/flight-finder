let authUser = null;

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
