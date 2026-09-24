const bcrypt = require("bcrypt");
const crypto = require("crypto");

const {
  createUser,
  verifyUser,
  savePasswordResetToken,
} = require("../../models/userModel");

export async function createTestUser() {
  const email = `e2e-${Date.now()}@example.com`;
  const password = "TestPassword1";

  const passwordHash = await bcrypt.hash(password, 10);
  const verificationToken = crypto.randomUUID();

  const user = await createUser({
    email,
    passwordHash,
    verificationToken,
  });

  return {
    email,
    password,
    userId: user.id,
  };
}

export async function createVerifiedTestUser() {
  const email = `e2e-${Date.now()}@example.com`;
  const password = "TestPassword1";

  const passwordHash = await bcrypt.hash(password, 10);
  const verificationToken = crypto.randomUUID();

  const user = await createUser({
    email,
    passwordHash,
    verificationToken,
  });

  await verifyUser(user.id);

  return {
    email,
    password,
    userId: user.id,
  };
}

export async function createTestUserWithResetToken() {
  const email = `e2e-${Date.now()}@example.com`;
  const password = "TestPassword1";

  const passwordHash = await bcrypt.hash(password, 10);
  const verificationToken = crypto.randomUUID();
  const resetToken = crypto.randomUUID();
  const resetExpires = new Date(Date.now() + 3600000);

  const user = await createUser({
    email,
    passwordHash,
    verificationToken,
  });

  await savePasswordResetToken(user.id, resetToken, resetExpires);

  return {
    email,
    password,
    resetToken,
    userId: user.id,
  };
}
