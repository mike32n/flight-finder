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

  for (const endpoint of [
    "register",
    "login",
    "forgot-password",
    "reset-password/test-token",
  ]) {
    test.each([
      {
        name: "missing body",
        prepare: (pendingRequest) => pendingRequest,
      },
      {
        name: "empty array body",
        prepare: (pendingRequest) => pendingRequest.send([]),
      },
      {
        name: "non-empty array body",
        prepare: (pendingRequest) =>
          pendingRequest.send([
            {
              email: "test@example.com",
              password: "Password123",
            },
          ]),
      },
      {
        name: "text body",
        prepare: (pendingRequest) =>
          pendingRequest.type("text").send(
            JSON.stringify({
              email: "test@example.com",
              password: "Password123",
            }),
          ),
      },
    ])(
      `${endpoint} rejects $name before processing credentials`,
      async ({ prepare }) => {
        const response = await prepare(
          request(app).post(`/api/auth/${endpoint}`),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual({
          success: false,
          message: "Invalid request body.",
        });

        expectNoDatabaseOrBcryptCalls();
      },
    );
  }

  test.each([
    ["register", "Email is required."],
    ["login", "Email is required."],
    ["reset-password/test-token", "Password is required."],
  ])(
    "%s applies field validation to an empty object body",
    async (endpoint, message) => {
      const response = await request(app)
        .post(`/api/auth/${endpoint}`)
        .send({});

      expect(response.statusCode).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message,
      });

      expectNoDatabaseOrBcryptCalls();
    },
  );
});
