const token = window.location.pathname.split("/").pop();

const message = document.getElementById("message");

(async () => {
  try {
    const response = await fetch(`/api/auth/verify/${token}`);
    const data = await response.json();

    message.textContent = data.message;

    message.classList.remove("success", "error");

    if (response.ok) {
      message.classList.add("success");
    } else {
      message.classList.add("error");
    }
  } catch {
    message.textContent = "Unable to verify email.";
    message.classList.remove("success");
    message.classList.add("error");
  }
})();
