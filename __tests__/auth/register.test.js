const request = require("supertest");
const express = require("express");

jest.mock("../../models/userModel", () => ({
  createUser: jest.fn(),
  findUserByEmail: jest.fn(),
}));

jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock("../../services/emailService", () => ({
  sendVerificationEmail: jest.fn(),
}));

const bcrypt = require("bcrypt");

const { sendVerificationEmail } = require("../../services/emailService");

const { createUser, findUserByEmail } = require("../../models/userModel");

const { auth } = require("../../config/appConfig");

const authRoutes = require("../../routes/authRoutes");

const app = express();

app.use(express.json());
app.use("/api/auth", authRoutes);

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    auth.emailVerificationRequired = true;
  });

  test("should reject missing email", async () => {
    const response = await request(app).post("/api/auth/register").send({
      password: "Password1",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Email is required.");
  });

  test("should reject invalid email", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "abc",
      password: "Password1",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Please enter a valid email address.");
  });
  
  test("should reject missing password", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "test@test.com",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Password is required.");
  });

  test("should reject short password", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "test@test.com",
      password: "Pass1",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Password must be at least 8 characters.",
    );
  });

  test("should reject weak password", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "test@test.com",
      password: "password",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Password must contain uppercase, lowercase and number.",
    );
  });

  test("should reject duplicate email", async () => {
    findUserByEmail.mockResolvedValue({
      id: 1,
      email: "test@test.com",
    });

    const response = await request(app).post("/api/auth/register").send({
      email: "test@test.com",
      password: "Password1",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Email already registered.");
  });

  test("should reject email registered after the initial lookup", async () => {
    findUserByEmail.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue("hashed-password");
    createUser.mockResolvedValue(null);

    const response = await request(app).post("/api/auth/register").send({
      email: "test@test.com",
      password: "Password1",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: "Email already registered.",
    });

    expect(createUser).toHaveBeenCalledTimes(1);
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  test("should create user", async () => {
    findUserByEmail.mockResolvedValue(null);

    bcrypt.hash.mockResolvedValue("hashed-password");

    createUser.mockResolvedValue({
      id: 1,
    });

    sendVerificationEmail.mockResolvedValue();

    const response = await request(app).post("/api/auth/register").send({
      email: "test@test.com",
      password: "Password1",
    });

    expect(response.status).toBe(201);

    expect(response.body).toEqual({
      success: true,
      message: "User created.",
    });

    expect(createUser).toHaveBeenCalledTimes(1);

    expect(createUser).toHaveBeenCalledWith({
      email: "test@test.com",
      passwordHash: "hashed-password",
      verificationToken: expect.any(String),
      emailVerified: false,
    });

    expect(sendVerificationEmail).toHaveBeenCalledTimes(1);

    expect(sendVerificationEmail).toHaveBeenCalledWith(
      "test@test.com",
      expect.any(String),
    );
  });

  test("should create verified user without verification email when email verification is disabled", async () => {
    auth.emailVerificationRequired = false;

    findUserByEmail.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue("hashed-password");

    createUser.mockResolvedValue({
      id: 1,
    });

    const response = await request(app).post("/api/auth/register").send({
      email: "test@test.com",
      password: "Password1",
    });

    expect(response.status).toBe(201);

    expect(response.body).toEqual({
      success: true,
      message: "User created.",
    });

    expect(createUser).toHaveBeenCalledWith({
      email: "test@test.com",
      passwordHash: "hashed-password",
      verificationToken: null,
      emailVerified: true,
    });

    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  test("should normalize email before registration", async () => {
    findUserByEmail.mockResolvedValue(null);

    bcrypt.hash.mockResolvedValue("hashed-password");

    createUser.mockResolvedValue({
      id: 1,
    });

    await request(app).post("/api/auth/register").send({
      email: "  TEST@TEST.COM  ",
      password: "Password1",
    });

    expect(findUserByEmail).toHaveBeenCalledWith("test@test.com");

    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "test@test.com",
      }),
    );
  });
  
  test("should recover from verification email failure by retrying registration", async () => {
    const storedUser = {
      id: 1,
      email: "test@test.com",
      password_hash: "hashed-password",
      email_verified: 0,
      verification_token: "stored-verification-token",
    };

    findUserByEmail
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(storedUser);

    bcrypt.hash.mockResolvedValue("hashed-password");
    bcrypt.compare.mockResolvedValue(true);
    createUser.mockResolvedValue({ id: 1 });

    sendVerificationEmail
      .mockRejectedValueOnce(new Error("Email unavailable"))
      .mockResolvedValueOnce();

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    try {
      const payload = {
        email: "test@test.com",
        password: "Password1",
      };

      const firstResponse = await request(app)
        .post("/api/auth/register")
        .send(payload);

      expect(firstResponse.status).toBe(503);
      expect(firstResponse.body.success).toBe(false);
      expect(firstResponse.body.message).toContain(
        "Please retry registration with the same email and password.",
      );

      const retryResponse = await request(app)
        .post("/api/auth/register")
        .send(payload);

      expect(retryResponse.status).toBe(200);
      expect(retryResponse.body).toEqual({
        success: true,
        message: "Verification email sent. Please check your inbox.",
      });

      expect(createUser).toHaveBeenCalledTimes(1);
      expect(bcrypt.hash).toHaveBeenCalledTimes(1);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "Password1",
        "hashed-password",
      );

      expect(sendVerificationEmail).toHaveBeenCalledTimes(2);
      expect(sendVerificationEmail).toHaveBeenLastCalledWith(
        "test@test.com",
        "stored-verification-token",
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  test.each([
    {
      name: "incorrect password",
      emailVerified: 0,
      passwordMatches: false,
      verificationRequired: true,
    },
    {
      name: "verified account",
      emailVerified: 1,
      passwordMatches: true,
      verificationRequired: true,
    },
    {
      name: "verification disabled",
      emailVerified: 0,
      passwordMatches: true,
      verificationRequired: false,
    },
  ])(
    "should not resend verification for $name",
    async ({ emailVerified, passwordMatches, verificationRequired }) => {
      auth.emailVerificationRequired = verificationRequired;

      findUserByEmail.mockResolvedValue({
        id: 1,
        email: "test@test.com",
        password_hash: "hashed-password",
        email_verified: emailVerified,
        verification_token: "stored-token",
      });

      bcrypt.compare.mockResolvedValue(passwordMatches);

      const response = await request(app).post("/api/auth/register").send({
        email: "test@test.com",
        password: "Password1",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: "Email already registered.",
      });

      expect(createUser).not.toHaveBeenCalled();
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    },
  );
});
