const { getDb } = require("../db");

function createUser({
  email,
  passwordHash,
  verificationToken,
  emailVerified = false,
}) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO users
      (
        email,
        password_hash,
        email_verified,
        verification_token
      )
      VALUES (?, ?, ?, ?)
      ON CONFLICT(email) DO NOTHING
      `,
      [email, passwordHash, emailVerified ? 1 : 0, verificationToken],
      function (err) {
        if (err) {
          return reject(err);
        }

        if (this.changes === 0) {
          return resolve(null);
        }

        resolve({
          id: this.lastID,
        });
      },
    );
  });
}

function findUserById(userId) {
  return new Promise((resolve, reject) => {
    getDb().get(
      `
        SELECT
          id,
          email,
          email_verified,
          plan,
          is_admin,
          smart_flex_preference,
          smart_flex_preference_version
        FROM users
        WHERE id = ?
      `,
      [userId],
      (error, row) => {
        if (error) {
          return reject(error);
        }

        resolve(
          row
            ? {
                ...row,
                smart_flex_preference: row.smart_flex_preference === 1,
              }
            : null,
        );
      },
    );
  });
}

function updateSmartFlexPreference(userId, preference, expectedVersion) {
  if (typeof preference !== "boolean") {
    return Promise.reject(
      new TypeError("Smart Flex preference must be a boolean."),
    );
  }

  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
    return Promise.reject(
      new TypeError(
        "Smart Flex preference version must be a non-negative integer.",
      ),
    );
  }

  return new Promise((resolve, reject) => {
    getDb().get(
      `
        UPDATE users
        SET
          smart_flex_preference = ?,
          smart_flex_preference_version = smart_flex_preference_version + 1
        WHERE id = ?
          AND smart_flex_preference_version = ?
        RETURNING smart_flex_preference_version
      `,
      [preference ? 1 : 0, userId, expectedVersion],
      (error, updatedUser) => {
        if (error) {
          return reject(error);
        }

        if (updatedUser) {
          return resolve({
            status: "updated",
            smartFlexPreferenceVersion:
              updatedUser.smart_flex_preference_version,
          });
        }

        getDb().get(
          "SELECT 1 FROM users WHERE id = ?",
          [userId],
          (lookupError, user) => {
            if (lookupError) {
              return reject(lookupError);
            }

            resolve({
              status: user ? "conflict" : "missing",
            });
          },
        );
      },
    );
  });
}

function findUserByEmail(email) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT *
      FROM users
      WHERE email = ?
      `,
      [email],
      (err, row) => {
        if (err) {
          return reject(err);
        }

        resolve(row || null);
      },
    );
  });
}

function findUserByVerificationToken(token) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT *
      FROM users
      WHERE verification_token = ?
      `,
      [token],
      (err, row) => {
        if (err) {
          return reject(err);
        }

        resolve(row || null);
      },
    );
  });
}

function verifyUser(userId) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run(
      `
      UPDATE users
      SET
        email_verified = 1,
        verification_token = NULL
      WHERE id = ?
      `,
      [userId],
      function (err) {
        if (err) {
          return reject(err);
        }

        resolve();
      },
    );
  });
}

function savePasswordResetToken(userId, token, expires) {
  const db = getDb();

  return new Promise((resolve, reject) => {
    db.run(
      `
      UPDATE users
      SET
        password_reset_token = ?,
        password_reset_expires = ?
      WHERE id = ?
      `,
      [token, new Date(expires).getTime(), userId],

      function (err) {
        if (err) {
          return reject(err);
        }

        resolve();
      },
    );
  });
}

function findUserByPasswordResetToken(token) {
  const db = getDb();

  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT *
      FROM users
      WHERE password_reset_token = ?
      `,
      [token],
      (err, row) => {
        if (err) {
          return reject(err);
        }

        resolve(row || null);
      },
    );
  });
}

function updatePassword(userId, passwordHash, token) {
  const db = getDb();

  return new Promise((resolve, reject) => {
    db.run(
      `
      UPDATE users
      SET
        password_hash = ?,
        password_reset_token = NULL,
        password_reset_expires = NULL
      WHERE id = ?
        AND password_reset_token = ?
        AND password_reset_expires >= ?
      `,
      [passwordHash, userId, token, Date.now()],
      function (err) {
        if (err) {
          return reject(err);
        }

        resolve(this.changes === 1);
      },
    );
  });
}

function grantAdminByEmail(email) {
  return new Promise((resolve, reject) => {
    getDb().run(
      `
        UPDATE users
        SET is_admin = 1
        WHERE email = ?
          AND email_verified = 1
      `,
      [email],
      function (error) {
        if (error) {
          return reject(error);
        }

        resolve(this.changes === 1);
      },
    );
  });
}

module.exports = {
  createUser,
  findUserById,
  updateSmartFlexPreference,
  findUserByEmail,
  findUserByVerificationToken,
  verifyUser,
  savePasswordResetToken,
  findUserByPasswordResetToken,
  updatePassword,
  grantAdminByEmail,
};
