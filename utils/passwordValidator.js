function validatePassword(password) {
  if (password == null || password === "") {
    return "Password is required.";
  }

  if (typeof password !== "string") {
    return "Password must be a string.";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  if (!hasUppercase || !hasLowercase || !hasNumber) {
    return "Password must contain uppercase, lowercase and number.";
  }

  return null;
}

module.exports = {
  validatePassword,
};
