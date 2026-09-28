function hasValidPasswordResetToken(user) {
  return Boolean(
    user &&
    user.password_reset_expires &&
    new Date(user.password_reset_expires) >= new Date(),
  );
}

module.exports = {
  hasValidPasswordResetToken,
};
