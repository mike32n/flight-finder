const jwt = require("jsonwebtoken");

const { authenticateToken } = require("../middlewares/authMiddleware");

describe("authenticateToken", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-jwt-secret";
  });

  test("should return 401 when Authorization header is missing", () => {
    const req = {
      headers: {},
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const next = jest.fn();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Authentication required.",
    });

    expect(next).not.toHaveBeenCalled();
  });

  test("should return 401 when Authorization header has invalid format", () => {
    const req = {
      headers: {
        authorization: "InvalidToken",
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const next = jest.fn();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid authentication token.",
    });

    expect(next).not.toHaveBeenCalled();
  });

  test("should return 401 when JWT is invalid", () => {
    const req = {
      headers: {
        authorization: "Bearer invalid-token",
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const next = jest.fn();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid or expired authentication token.",
    });

    expect(next).not.toHaveBeenCalled();
  });

  test("should return 401 when JWT is expired", () => {
    const token = jwt.sign(
      {
        userId: 1,
        email: "test@test.com",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: -1,
      },
    );

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const next = jest.fn();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid or expired authentication token.",
    });

    expect(next).not.toHaveBeenCalled();
  });

  test("should call next and set req.user for a valid JWT", () => {
    const payload = {
      userId: 1,
      email: "test@test.com",
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    const next = jest.fn();

    authenticateToken(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user.userId).toBe(payload.userId);
    expect(req.user.email).toBe(payload.email);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
