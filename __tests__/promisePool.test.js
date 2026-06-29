const runWithConcurrencyLimit = require("../promisePool");

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
      error: "boom",
    });
  });

  test("calls onResult callback", async () => {
    const onResult = jest.fn();

    const tasks = [() => Promise.resolve({ success: true })];

    await runWithConcurrencyLimit(tasks, 1, onResult);

    expect(onResult).toHaveBeenCalledTimes(1);
  });
});
