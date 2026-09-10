const { getDb } = require("../db");
const db = getDb();

function createUser({ email, passwordHash, verificationToken }) {
  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO users
      (
        email,
        password_hash,
        verification_token
      )
      VALUES (?, ?, ?)
      `,
      [email, passwordHash, verificationToken],
      function (err) {
        if (err) {
          return reject(err);
        }

        resolve({
          id: this.lastID,
        });
      },
    );
  });
}

function findUserByEmail(email) {
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

module.exports = {
  createUser,
  findUserByEmail,
  findUserByVerificationToken,
  verifyUser,
};
