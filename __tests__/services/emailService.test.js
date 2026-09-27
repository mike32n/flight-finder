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
});
