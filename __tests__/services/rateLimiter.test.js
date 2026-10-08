const mockDefineCommand = jest.fn();
const mockAcquireToken = jest.fn();

jest.mock("../../services/redisClient", () => ({
  defineCommand: mockDefineCommand,
  acquireToken: mockAcquireToken,
}));

const appConfig = require("../../config/appConfig");
const { acquireToken } = require("../../services/rateLimiter");

describe("rateLimiter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("should call Redis with correct rate limit parameters", async () => {
    mockAcquireToken.mockResolvedValue(1);

    const now = 1_700_000_000_000;
    jest.spyOn(Date, "now").mockReturnValue(now);

    await acquireToken("serpapi", 10, 60);

    expect(mockAcquireToken).toHaveBeenCalledWith(
      "ratelimit:serpapi",
      now,
      60_000,
      10,
      expect.stringMatching(new RegExp(`^${now}-`)),
    );
  });

  test("should return true when token is acquired", async () => {
    mockAcquireToken.mockResolvedValue(1);

    const result = await acquireToken("serpapi", 10, 60);

    expect(result).toBe(true);
  });

  test("should return false when rate limit is reached", async () => {
    mockAcquireToken.mockResolvedValue(0);

    const result = await acquireToken("serpapi", 10, 60);

    expect(result).toBe(false);
  });

  test("should reject when Redis does not respond before timeout", async () => {
    jest.useFakeTimers();

    try {
      mockAcquireToken.mockImplementationOnce(() => new Promise(() => {}));

      const pending = acquireToken("serpapi", 20, 60);

      const assertion = expect(pending).rejects.toThrow(
        "Rate limiter Redis timeout",
      );

      await jest.advanceTimersByTimeAsync(appConfig.cache.operationTimeoutMs);

      await assertion;

      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  test("should generate unique request IDs for requests in the same millisecond", async () => {
    mockAcquireToken.mockResolvedValue(1);

    const now = 1_700_000_000_000;
    jest.spyOn(Date, "now").mockReturnValue(now);

    await acquireToken("serpapi", 10, 60);
    await acquireToken("serpapi", 10, 60);

    const firstRequestId = mockAcquireToken.mock.calls[0][4];
    const secondRequestId = mockAcquireToken.mock.calls[1][4];

    expect(firstRequestId).not.toBe(secondRequestId);
  });
});
