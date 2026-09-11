function sendVerificationEmail(email, verificationToken) {
  const verificationUrl = `http://localhost:3000/api/auth/verify/${verificationToken}`;

  console.log(`[EMAIL] To: ${email}\nVerification link: ${verificationUrl}`);
}

module.exports = {
  sendVerificationEmail,
};
