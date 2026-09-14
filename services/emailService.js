const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

async function sendVerificationEmail(email, verificationToken) {
  const verificationUrl = `${process.env.APP_BASE_URL}/api/auth/verify/${verificationToken}`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: "Verify your Flight Finder account",
    text:
      `Welcome to Flight Finder!\n\n` +
      `Please verify your email by visiting:\n\n` +
      `${verificationUrl}`,
  });

  console.log(`[EMAIL] Verification email sent to ${email}`);
}

async function sendPasswordResetEmail(email, token) {
  const resetUrl = `http://localhost:3000/reset-password/${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Reset your Flight Finder password",
    text: `
      You requested a password reset for your Flight Finder account.

      Click the following link to reset your password:

      ${resetUrl}

      This link expires in 1 hour.

      If you did not request a password reset, you can safely ignore this email.
    `,
  });
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
