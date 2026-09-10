const request = require("supertest");
const express = require("express");

jest.mock("../models/userModel", () => ({
  findUserByVerificationToken: jest.fn(),
  verifyUser: jest.fn(),
}));

const {
  findUserByVerificationToken,
  verifyUser,
} = require("../models/userModel");

const authRoutes = require("../routes/authRoutes");

const app = express();

app.use(express.json());
app.use("/api/auth", authRoutes);

describe("GET /api/auth/verify/:token", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should return 400 if token is invalid", async () => {
    findUserByVerificationToken.mockResolvedValue(null);

    const response = await request(app).get("/api/auth/verify/invalid-token");

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      success: false,
      message: "Invalid verification token.",
    });
  });

  test("should verify user with valid token", async () => {
    const mockUser = {
      id: 123,
    };

    findUserByVerificationToken.mockResolvedValue(mockUser);

    verifyUser.mockResolvedValue();

    const response = await request(app).get("/api/auth/verify/valid-token");

    expect(response.status).toBe(200);

    expect(verifyUser).toHaveBeenCalledWith(123);

    expect(response.body).toEqual({
      success: true,
      message: "Email verified successfully.",
    });
  });

  test("should return 500 if lookup fails", async () => {
    findUserByVerificationToken.mockRejectedValue(new Error("Database error"));

    const response = await request(app).get("/api/auth/verify/valid-token");

    expect(response.status).toBe(500);

    expect(response.body).toEqual({
      success: false,
      message: "Internal server error.",
    });
  });

  test("should return 500 if verifyUser fails", async () => {
    findUserByVerificationToken.mockResolvedValue({
      id: 123,
    });

    verifyUser.mockRejectedValue(new Error("Database error"));

    const response = await request(app).get("/api/auth/verify/valid-token");

    expect(response.status).toBe(500);

    expect(response.body).toEqual({
      success: false,
      message: "Internal server error.",
    });
  });
});
