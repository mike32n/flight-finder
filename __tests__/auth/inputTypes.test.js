const request = require("supertest");
const express = require("express");

jest.mock("../../models/userModel", () => ({
  findUserByEmail: jest.fn(),
  findUserByPasswordResetToken: jest.fn(),
  createUser: jest.fn(),
  updatePassword: jest.fn(),
}));

jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock("../../services/emailService", () => ({
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendPasswordResetSuccessEmail: jest.fn(),
}));

const {
  findUserByEmail,
  findUserByPasswordResetToken,
  createUser,
  updatePassword,
} = require("../../models/userModel");

const bcrypt = require("bcrypt");
const authRoutes = require("../../routes/authRoutes");

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);

const invalidValues = [
  { name: "zero", value: 0 },
  { name: "number", value: 123 },
  { name: "boolean", value: true },
  { name: "object", value: {} },
  { name: "empty array", value: [] },
  { name: "string array", value: Array(8).fill("Password1") },
];

describe("Authentication input types", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  function expectNoDatabaseOrBcryptCalls() {
    expect(findUserByEmail).not.toHaveBeenCalled();
    expect(findUserByPasswordResetToken).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
    expect(updatePassword).not.toHaveBeenCalled();
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(bcrypt.compare).not.toHaveBeenCalled();
  }

  for (const endpoint of ["register", "login", "forgot-password"]) {
    test.each(invalidValues)(
      `${endpoint} rejects email type: $name`,
      async ({ value }) => {
        const response = await request(app).post(`/api/auth/${endpoint}`).send({
          email: value,
          password: "Password123",
        });

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual({
          success: false,
          message: "Please enter a valid email address.",
        });

        expectNoDatabaseOrBcryptCalls();
      },
    );
  }

  for (const endpoint of ["register", "login", "reset-password/test-token"]) {
    test.each(invalidValues)(
      `${endpoint} rejects password type: $name`,
      async ({ value }) => {
        const response = await request(app).post(`/api/auth/${endpoint}`).send({
          email: "test@example.com",
          password: value,
        });

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual({
          success: false,
          message: "Password must be a string.",
        });

        expectNoDatabaseOrBcryptCalls();
      },
    );
  }
});
