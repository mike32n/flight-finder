const bcrypt = require("bcrypt");
const crypto = require("crypto");

const {
  createUser,
  verifyUser,
  savePasswordResetToken,
  grantAdminByEmail,
} = require("../../models/userModel");

const { auth } = require("../../config/appConfig");

export function createUniqueTestEmail(prefix = "e2e"): string {
  return `${prefix}-${crypto.randomUUID()}@example.com`;
}

export async function createTestUser(prefix = "e2e-test") {
  const email = createUniqueTestEmail(prefix);
  const password = "TestPassword1";
  const passwordHash = await bcrypt.hash(password, auth.bcryptSaltRounds);
  const verificationToken = crypto.randomUUID();

  const user = await createUser({
    email,
    passwordHash,
    verificationToken,
  });

  return {
    email,
    password,
    verificationToken,
    userId: user.id,
  };
}

export async function createVerifiedTestUser(prefix = "e2e-verified") {
  const user = await createTestUser(prefix);

  await verifyUser(user.userId);

  return {
    email: user.email,
    password: user.password,
    userId: user.userId,
  };
}

export async function createVerifiedAdminTestUser() {
  const user = await createVerifiedTestUser();
  const updated = await grantAdminByEmail(user.email);

  if (!updated) {
    throw new Error("Could not grant admin access to the test user.");
  }

  return user;
}

async function attachResetToken(user: {
  email: string;
  password: string;
  userId: number;
}) {
  const resetToken = crypto.randomUUID();
  const resetExpires = new Date(Date.now() + auth.passwordResetTokenLifetimeMs);

  await savePasswordResetToken(user.userId, resetToken, resetExpires);

  return {
    email: user.email,
    password: user.password,
    resetToken,
    userId: user.userId,
  };
}

export async function createTestUserWithResetToken() {
  return attachResetToken(await createTestUser("e2e-reset"));
}

export async function createVerifiedTestUserWithResetToken() {
  return attachResetToken(await createVerifiedTestUser("e2e-verified-reset"));
}
