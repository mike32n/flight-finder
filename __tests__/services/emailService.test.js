const mockSendMail = jest.fn();

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordResetSuccessEmail,
} = require("../../services/emailService");

describe("emailService", () => {
  beforeEach(() => {
    mockSendMail.mockClear();
  });

  afterEach(() => {
    delete process.env.E2E_TEST;
    delete process.env.APP_BASE_URL;
    delete process.env.MAIL_FROM;
  });

  describe("E2E mode", () => {
    beforeEach(() => {
      process.env.E2E_TEST = "true";
    });

    test("does not send verification email", async () => {
      await sendVerificationEmail("test@example.com", "verification-token");

      expect(mockSendMail).not.toHaveBeenCalled();
    });

    test("does not send password reset email", async () => {
      await sendPasswordResetEmail("test@example.com", "reset-token");

      expect(mockSendMail).not.toHaveBeenCalled();
    });

    test("does not send password reset success email", async () => {
      await sendPasswordResetSuccessEmail("test@example.com");

      expect(mockSendMail).not.toHaveBeenCalled();
    });
  });

  describe("email sending", () => {
    beforeEach(() => {
      process.env.APP_BASE_URL = "http://localhost:3000";
      process.env.MAIL_FROM = "noreply@flightfinder.test";
    });

    test("sends verification email with correct data", async () => {
      await sendVerificationEmail("user@example.com", "verification-token");

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "noreply@flightfinder.test",
          to: "user@example.com",
          subject: "Verify your Flight Finder account",
          text: expect.stringContaining(
            "http://localhost:3000/verify/verification-token",
          ),
        }),
      );
    });

    test("sends password reset email with correct data", async () => {
      await sendPasswordResetEmail("user@example.com", "reset-token");

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "noreply@flightfinder.test",
          to: "user@example.com",
          subject: "Reset your Flight Finder password",
          text: expect.stringContaining(
            "http://localhost:3000/reset-password/reset-token",
          ),
        }),
      );
    });

    test("sends password reset success email with correct data", async () => {
      await sendPasswordResetSuccessEmail("user@example.com");

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "noreply@flightfinder.test",
          to: "user@example.com",
          subject: "Your Flight Finder password has been reset",
        }),
      );
    });
  });
});
