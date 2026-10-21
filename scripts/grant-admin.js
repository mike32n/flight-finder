const validator = require("validator");

const { initDb, closeDb } = require("../db");
const { grantAdminByEmail } = require("../models/userModel");
const { normalizeEmail } = require("../utils/emailNormalizer");

async function grantAdmin(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !validator.isEmail(normalizedEmail)) {
    throw new Error("A valid email address is required.");
  }

  const updated = await grantAdminByEmail(normalizedEmail);

  if (!updated) {
    throw new Error("Verified user not found.");
  }

  return normalizedEmail;
}

async function main() {
  try {
    const args = process.argv.slice(2);

    if (args.length !== 1) {
      throw new Error("Usage: node scripts/grant-admin.js <email>");
    }

    await initDb();

    const email = await grantAdmin(args[0]);

    console.log(`Admin access granted to ${email}.`);
  } finally {
    await closeDb();
  }
}

if (require.main === module) {
  require("dotenv").config();

  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  grantAdmin,
};
