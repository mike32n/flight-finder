function validateEmailType(email) {
  if (email != null && typeof email !== "string") {
    return "Please enter a valid email address.";
  }

  return null;
}

module.exports = {
  validateEmailType,
};
