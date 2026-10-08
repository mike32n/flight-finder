function normalizeEmail(email) {
  if (typeof email !== "string") {
    return undefined;
  }

  return email.trim().toLowerCase();
}

module.exports = {
  normalizeEmail,
};
