let authUser = null;
let verifiedAuthToken = null;
let sessionVersion = 0;
let currentUserRequestId = 0;

function saveToken(token) {
  sessionVersion++;
  authUser = null;
  verifiedAuthToken = null;

  localStorage.setItem("authToken", token);
  document.getElementById("session-message").hidden = true;
}

function getToken() {
  return localStorage.getItem("authToken");
}

function getSessionContext() {
  return {
    token: getToken(),
    version: sessionVersion,
  };
}

function isSessionContextCurrent(context) {
  return context.token === getToken() && context.version === sessionVersion;
}

function isCurrentUserVerified() {
  const token = getToken();

  return token
    ? authUser !== null && verifiedAuthToken === token
    : authUser === null;
}

function expireSessionIfUnauthorized(response, context) {
  if (
    response.status !== 401 ||
    !context.token ||
    !isSessionContextCurrent(context)
  ) {
    return false;
  }

  endSession({ expired: true });
  window.dispatchEvent(new Event("auth-changed"));

  return true;
}

function removeToken() {
  sessionVersion++;
  verifiedAuthToken = null;

  localStorage.removeItem("authToken");
}

function endSession({ expired = false } = {}) {
  if (expired) {
    clearPrivateSearchResults();
  } else {
    clearSearchResults();
  }

  removeToken();
  authUser = null;
  renderAuthUI();

  const message = document.getElementById("session-message");

  message.textContent = expired
    ? "Your session has expired. Please sign in again."
    : "";

  message.hidden = !expired;
}

async function loadCurrentUser() {
  const requestId = ++currentUserRequestId;
  const context = getSessionContext();

  const isCurrent = () =>
    requestId === currentUserRequestId && isSessionContextCurrent(context);

  verifiedAuthToken = null;

  if (!context.token) {
    authUser = null;
    return "anonymous";
  }

  try {
    const response = await fetch("/api/auth/me", {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${context.token}`,
      },
    });

    if (!isCurrent()) return "stale";

    if (response.status === 401) {
      endSession({ expired: true });
      return "anonymous";
    }

    if (!response.ok) {
      throw new Error(`Session verification failed: ${response.status}`);
    }

    const data = await response.json();

    if (!isCurrent()) return "stale";

    if (!Number.isSafeInteger(data?.user?.id) || data.user.id < 1) {
      throw new Error("Invalid current user response");
    }

    authUser = data.user;
    verifiedAuthToken = context.token;

    return "authenticated";
  } catch (error) {
    if (!isCurrent()) return "stale";

    console.error("Could not verify the current session:", error);

    return "unavailable";
  }
}

function renderAuthUI() {
  const adminLink = document.getElementById("admin-link");

  if (adminLink) {
    adminLink.hidden = authUser?.isAdmin !== true;
  }
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

      const authState = await loadCurrentUser();

      if (authState === "stale") return; //"stale" means that the session changed during the request or a new validation process was initiated (in such cases, the original call cannot modify the interface)

      if (authState !== "authenticated") {
        const message = "Your session could not be verified. Please try again.";

        showAuthMessage("login-message", message);

        if (authState === "unavailable") {
          setSearchAccessUnavailable(message);
        }

        return;
      }

      renderAuthUI();
      window.dispatchEvent(new Event("auth-changed"));

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

      document.getElementById("register-form").reset();

      openAuthModal("login");

      const message = window.emailVerificationRequired
        ? "Registration successful. Please check your email to verify your account."
        : "Registration successful. You can now log in.";

      showAuthMessage("login-message", message, false);
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
  .addEventListener("click", (event) => {
    event.preventDefault();
    openAuthModal("forgot");
  });

document
  .getElementById("back-to-login-btn")
  .addEventListener("click", () => openAuthModal("login"));

document.getElementById("auth-modal").addEventListener("click", (event) => {
  if (event.target.id === "auth-modal") {
    closeAuthModal();
  }
});

function logout() {
  endSession();
  window.dispatchEvent(new Event("auth-changed"));
}
