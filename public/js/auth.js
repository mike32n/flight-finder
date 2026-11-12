let authUser = null;
let verifiedAuthToken = null;
let sessionVersion = 0;
let currentUserRequestId = 0;
let loginAttemptId = 0;
let activeLoginAttempt = null;
const pendingSmartFlexSaves = new Map();
let pendingSmartFlexError = null;

function showSmartFlexError(message) {
  const feedback = document.getElementById("smart-flex-preference-error");
  feedback.textContent = message;
  feedback.hidden = false;
}

function clearSmartFlexError() {
  pendingSmartFlexError = null;
  const feedback = document.getElementById("smart-flex-preference-error");
  feedback.textContent = "";
  feedback.hidden = true;
}

function showPendingSmartFlexError(user) {
  if (
    pendingSmartFlexError &&
    pendingSmartFlexError.userId === user?.id &&
    isSessionContextCurrent(pendingSmartFlexError.context)
  ) {
    showSmartFlexError(pendingSmartFlexError.message);
    pendingSmartFlexError = null;
  }
}

function resetSmartFlexPreference() {
  const checkbox = document.getElementById("smart-flex-preference");
  checkbox.checked = false;
  checkbox.disabled = true;
}

function invalidateLoginAttempt() {
  if (!activeLoginAttempt) return;

  resetAuthButton(activeLoginAttempt.button);
  activeLoginAttempt = null;
}

function saveToken(token, loginAttempt = null) {
  if (activeLoginAttempt !== loginAttempt) invalidateLoginAttempt();
  resetSmartFlexPreference();
  clearSmartFlexError();
  sessionVersion++;
  authUser = null;
  verifiedAuthToken = null;

  localStorage.setItem("authToken", token);
  clearSessionExpirationError();
}

function getToken() {
  return localStorage.getItem("authToken");
}

function invalidateCurrentUserVerification() {
  resetSmartFlexPreference();
  currentUserRequestId++;
  verifiedAuthToken = null;
}

function invalidateSessionForTokenChange() {
  invalidateLoginAttempt();
  sessionVersion++;
  clearSmartFlexError();
  invalidateCurrentUserVerification();
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
  invalidateLoginAttempt();
  sessionVersion++;
  verifiedAuthToken = null;

  localStorage.removeItem("authToken");
}

function endSession({ expired = false } = {}) {
  resetSmartFlexPreference();
  clearSmartFlexError();
  if (expired) {
    clearPrivateSearchResults();
  } else {
    clearSearchResults();
  }

  removeToken();
  authUser = null;
  renderAuthUI();

  if (expired) showSessionExpirationError();
}

async function loadCurrentUser({ signal } = {}) {
  const requestId = ++currentUserRequestId;
  const context = getSessionContext();

  const isCurrent = () =>
    !signal?.aborted &&
    requestId === currentUserRequestId &&
    isSessionContextCurrent(context);

  resetSmartFlexPreference();
  verifiedAuthToken = null;

  if (!context.token) {
    authUser = null;
    return "anonymous";
  }

  const pendingSave = pendingSmartFlexSaves.get(context.token);
  if (pendingSave) {
    await pendingSave;
    if (!isCurrent()) return "stale";
  }

  try {
    const response = await fetch("/api/auth/me", {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${context.token}`,
      },
      signal,
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

    if (
      ["registered", "premium"].includes(authUser.plan) &&
      typeof authUser.smartFlexPreference === "boolean" &&
      Number.isSafeInteger(authUser.smartFlexPreferenceVersion) &&
      authUser.smartFlexPreferenceVersion >= 0
    ) {
      const checkbox = document.getElementById("smart-flex-preference");
      checkbox.checked = authUser.smartFlexPreference;
      checkbox.disabled = false;
    } else {
      console.error("Invalid Smart Flex preference or plan for current user.");
    }

    showPendingSmartFlexError(authUser);
    return "authenticated";
  } catch (error) {
    if (!isCurrent()) return "stale";

    showPendingSmartFlexError(authUser);
    console.error("Could not verify the current session:", error);

    return "unavailable";
  }
}

async function saveSmartFlexPreference() {
  const saveTimeoutMs = 15000;
  const checkbox = document.getElementById("smart-flex-preference");
  const user = authUser;
  const context = getSessionContext();
  const requestId = currentUserRequestId;

  if (
    checkbox.disabled ||
    !context.token ||
    !isCurrentUserVerified() ||
    !["registered", "premium"].includes(user?.plan) ||
    typeof user.smartFlexPreference !== "boolean" ||
    !Number.isSafeInteger(user.smartFlexPreferenceVersion) ||
    user.smartFlexPreferenceVersion < 0
  ) {
    if (
      user &&
      isCurrentUserVerified() &&
      pendingSmartFlexSaves.has(context.token)
    ) {
      checkbox.checked = user.smartFlexPreference;
    } else {
      resetSmartFlexPreference();
    }
    return;
  }

  const preference = checkbox.checked;
  const expectedVersion = user.smartFlexPreferenceVersion;
  checkbox.checked = user.smartFlexPreference;
  checkbox.disabled = true;

  const isOriginalSession = () =>
    isSessionContextCurrent(context) && authUser === user;

  const isCurrent = () =>
    isOriginalSession() &&
    requestId === currentUserRequestId &&
    verifiedAuthToken === context.token;

  const reportFailure = (message) => {
    if (!isOriginalSession()) return false;

    if (isCurrent()) {
      showSmartFlexError(message);
      pendingSmartFlexError = null;
    } else {
      pendingSmartFlexError = { context, userId: user.id, message };
    }
    return true;
  };

  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  pendingSmartFlexSaves.set(context.token, pending);
  let reconcile = false;
  const controller = new AbortController();
  let timeoutId;

  try {
    const operation = (async () => {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${context.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          smartFlexPreference: preference,
          expectedSmartFlexPreferenceVersion: expectedVersion,
        }),
        signal: controller.signal,
      });

      if (!response.ok || !isOriginalSession()) return { response };
      return { response, data: await response.json() };
    })();
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error("Smart Flex preference request timed out"));
        controller.abort();
      }, saveTimeoutMs);
    });
    const { response, data } = await Promise.race([operation, timeout]);

    if (response.status === 401) {
      if (isCurrent()) {
        expireSessionIfUnauthorized(response, context);
      } else if (
        reportFailure("Smart Flex preference could not be saved. Please try again.")
      ) {
        console.error("Smart Flex preference was rejected: session verification required.");
      }
      return;
    }

    if (response.status === 400) {
      if (
        reportFailure("Smart Flex preference could not be saved. Please try again.")
      ) {
        console.error("Smart Flex preference was rejected.");
      }
      return;
    }

    if (response.status === 409) {
      reportFailure("Smart Flex preference could not be saved. Please try again.");
      reconcile = isCurrent();
    } else {
      if (!response.ok) {
        throw new Error(`Smart Flex preference request failed: ${response.status}`);
      }

      if (!isOriginalSession()) return;
      if (
        data?.success !== true ||
        data.smartFlexPreference !== preference ||
        !Number.isSafeInteger(data.smartFlexPreferenceVersion) ||
        data.smartFlexPreferenceVersion < 0 ||
        data.smartFlexPreferenceVersion !== expectedVersion + 1
      ) {
        throw new Error("Invalid Smart Flex preference response");
      }

      clearSmartFlexError();
      if (!isCurrent()) return;
      user.smartFlexPreference = data.smartFlexPreference;
      user.smartFlexPreferenceVersion = data.smartFlexPreferenceVersion;
      checkbox.checked = user.smartFlexPreference;
    }
  } catch (error) {
    if (
      reportFailure(
        "Smart Flex preference could not be confirmed. Please reload if it does not refresh.",
      )
    ) {
      console.error("Could not confirm Smart Flex preference:", error);
      reconcile = isCurrent();
    }
  } finally {
    clearTimeout(timeoutId);
    if (pendingSmartFlexSaves.get(context.token) === pending) {
      pendingSmartFlexSaves.delete(context.token);
    }
    release();

    if (!reconcile && isCurrent()) checkbox.disabled = false;
  }

  if (reconcile && isCurrent()) {
    const verification = loadCurrentUser();
    const verificationRequestId = currentUserRequestId;
    updateSearchControls();
    const authState = await verification;

    if (
      authState === "anonymous" &&
      !getToken() &&
      sessionVersion === context.version + 1 &&
      currentUserRequestId === verificationRequestId
    ) {
      window.dispatchEvent(new Event("auth-changed"));
    } else if (
      isSessionContextCurrent(context) &&
      currentUserRequestId === verificationRequestId
    ) {
      if (authState === "unavailable") {
        setSearchAccessUnavailable(
          "Your session could not be verified. Please reload the page to try again.",
        );
      } else if (authState === "authenticated") {
        updateSearchControls();
      }
    }
  }
}

document
  .getElementById("smart-flex-preference")
  .addEventListener("change", saveSmartFlexPreference);

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
        <div class="auth-user-icon" aria-hidden="true">🔐</div>

        <div
          class="auth-user-info"
          role="group"
          aria-label="Signed in"
          aria-describedby="auth-user-email"
        >
          <div class="auth-user-label" aria-hidden="true">Signed in</div>
          <span id="auth-user-email" class="auth-user-email" hidden></span>
        </div>

        <button id="logout-btn">Logout</button>
      </div>
    `;

    const info = container.querySelector(".auth-user-info");
    const email = document.getElementById("auth-user-email");
    email.textContent = authUser.email;
    email.title = authUser.email;
    info.title = authUser.email;

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

    let interruptedContext = null;
    if (
      activeLoginAttempt &&
      isSessionContextCurrent(activeLoginAttempt.context)
    ) {
      if (activeLoginAttempt.verifying) {
        interruptedContext = activeLoginAttempt.context;
        invalidateCurrentUserVerification();
      } else {
        interruptedContext = activeLoginAttempt.interruptedContext;
      }
    }
    invalidateLoginAttempt();
    const attempt = {
      id: ++loginAttemptId,
      button,
      context: getSessionContext(),
      interruptedContext,
      verifying: false,
    };
    activeLoginAttempt = attempt;
    const isCurrent = () =>
      attempt.id === loginAttemptId && isSessionContextCurrent(attempt.context);

    setAuthButtonLoading(button, "Signing in...");

    let loginFailed = false;
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

      if (!isCurrent()) return;

      const data = await response.json();

      if (!isCurrent()) return;

      if (!response.ok) {
        showAuthMessage("login-message", data.message);
        loginFailed = true;
        return;
      }

      try {
        saveToken(data.token, attempt);
      } finally {
        attempt.context = getSessionContext();
      }

      attempt.verifying = true;
      const verification = loadCurrentUser();
      const verificationRequestId = currentUserRequestId;
      const authState = await verification;
      attempt.verifying = false;

      const expiredDuringVerification =
        authState === "anonymous" &&
        attempt.id === loginAttemptId &&
        !getToken() &&
        sessionVersion === attempt.context.version + 1 &&
        currentUserRequestId === verificationRequestId;

      if (authState === "stale" || (!isCurrent() && !expiredDuringVerification)) {
        return;
      }

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
      if (isCurrent()) {
        showAuthMessage("login-message", "Login failed.");
        loginFailed = true;
      }
    } finally {
      if (activeLoginAttempt === attempt) {
        resetAuthButton(button);
        try {
          if (
            loginFailed &&
            attempt.interruptedContext?.token &&
            isCurrent() &&
            isSessionContextCurrent(attempt.interruptedContext) &&
            !isCurrentUserVerified()
          ) {
            attempt.verifying = true;
            const verification = loadCurrentUser();
            const verificationRequestId = currentUserRequestId;
            updateSearchControls();
            const authState = await verification;
            attempt.verifying = false;

            if (
              authState === "anonymous" &&
              attempt.id === loginAttemptId &&
              !getToken() &&
              sessionVersion === attempt.context.version + 1 &&
              currentUserRequestId === verificationRequestId
            ) {
              window.dispatchEvent(new Event("auth-changed"));
            } else if (isCurrent() && currentUserRequestId === verificationRequestId) {
              if (authState === "unavailable") {
                setSearchAccessUnavailable(
                  "Your session could not be verified. Please reload the page to try again.",
                );
              } else if (authState === "authenticated") {
                renderAuthUI();
                window.dispatchEvent(new Event("auth-changed"));
              }
            }
          }
        } finally {
          if (activeLoginAttempt === attempt) invalidateLoginAttempt();
        }
      }
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
