const runWithConcurrencyLimit = require("../../utils/promisePool");

describe("promisePool", () => {
  test("returns successful results", async () => {
    const tasks = [
      () => Promise.resolve({ success: true, id: 1 }),
      () => Promise.resolve({ success: true, id: 2 }),
    ];

    const results = await runWithConcurrencyLimit(tasks, 2);

    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
  });

  test("converts rejected task into failure result", async () => {
    const tasks = [() => Promise.reject(new Error("boom"))];

    const results = await runWithConcurrencyLimit(tasks, 1);

    expect(results[0]).toEqual({
      success: false,
      reason: "provider_error",
      error: "boom",
    });
  });

  test("converts synchronous task exception into failure and continues", async () => {
    const successfulResult = { success: true, id: 2 };
    const nextTask = jest.fn().mockResolvedValue(successfulResult);
    const onResult = jest.fn();

    const tasks = [
      () => {
        throw new Error("sync failure");
      },
      nextTask,
    ];

    const results = await runWithConcurrencyLimit(tasks, 1, onResult);

    expect(results).toEqual([
      {
        success: false,
        reason: "provider_error",
        error: "sync failure",
      },
      successfulResult,
    ]);

    expect(nextTask).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledTimes(2);
  });

  test("propagates callback error without reporting a provider failure", async () => {
    const successfulResult = { success: true, id: 1 };
    const callbackError = new Error("Callback failed");

    const onResult = jest.fn(() => {
      throw callbackError;
    });

    await expect(
      runWithConcurrencyLimit(
        [() => Promise.resolve(successfulResult)],
        1,
        onResult,
      ),
    ).rejects.toBe(callbackError);

    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith(successfulResult);
  });

  test("calls onResult callback", async () => {
    const onResult = jest.fn();

    const tasks = [() => Promise.resolve({ success: true })];

    await runWithConcurrencyLimit(tasks, 1, onResult);

    expect(onResult).toHaveBeenCalledTimes(1);
  });
});
