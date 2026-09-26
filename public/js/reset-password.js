const token = window.location.pathname.split("/").pop();

const button = document.getElementById("reset-btn");
const passwordInput = document.getElementById("password");
const message = document.getElementById("message");
const backToLoginLink = document.getElementById("back-to-login");

function disableResetForm() {
  passwordInput.disabled = true;
  button.disabled = true;
}

function enableResetForm() {
  passwordInput.disabled = false;
  button.disabled = false;
}

function showBackToLogin() {
  backToLoginLink.classList.remove("hidden");
}

function setLoading() {
  button.disabled = true;
  button.classList.add("loading");
  button.innerHTML = `
          <span class="auth-spinner"></span>
          Resetting...
        `;
}

function resetLoading() {
  button.textContent = "Reset Password";
  button.classList.remove("loading");

  if (!passwordInput.disabled) {
    button.disabled = false;
  }
}

(async function validateToken() {
  disableResetForm();

  try {
    const response = await fetch(`/api/auth/reset-password/${token}`);
    const data = await response.json();

    if (!response.ok) {
      message.textContent = data.message;
      message.classList.add("error");
      showBackToLogin();
      return;
    }

    enableResetForm();
  } catch {
    message.textContent = "Unable to validate reset link.";
    message.classList.add("error");
    showBackToLogin();
  }
})();

document.getElementById("reset-btn").addEventListener("click", async () => {
  const password = passwordInput.value;

  setLoading();

  try {
    const response = await fetch(`/api/auth/reset-password/${token}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password,
      }),
    });

    const data = await response.json();

    message.textContent = data.message;

    message.classList.remove("success", "error");

    if (response.ok) {
      message.classList.add("success");
      disableResetForm();
      showBackToLogin();
    } else {
      message.classList.add("error");

      if (data.message === "Invalid or expired password reset token.") {
        disableResetForm();
      }

      showBackToLogin();
    }
  } catch {
    message.textContent = "Request failed.";
    message.classList.remove("success");
    message.classList.add("error");

    showBackToLogin();
    disableResetForm();
  } finally {
    resetLoading();
  }
});
