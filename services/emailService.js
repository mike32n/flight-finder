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

module.exports = {
  sendVerificationEmail,
};
