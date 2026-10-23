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

  test("propagates callback error when concurrent tasks complete together", async () => {
    const firstResult = { success: true, id: 1 };
    const secondResult = { success: true, id: 2 };
    const callbackError = new Error("Callback failed");

    const onResult = jest.fn((result) => {
      if (result.id === 2) {
        throw callbackError;
      }
    });

    await expect(
      runWithConcurrencyLimit(
        [
          () => Promise.resolve(firstResult),
          () => Promise.resolve(secondResult),
        ],
        2,
        onResult,
      ),
    ).rejects.toBe(callbackError);

    expect(onResult).toHaveBeenCalledTimes(2);
    expect(onResult).toHaveBeenNthCalledWith(1, firstResult);
    expect(onResult).toHaveBeenNthCalledWith(2, secondResult);
  });

  test("stops queued tasks and waits for running tasks after callback failure", async () => {
    const firstResult = { success: true, id: 1 };
    const secondResult = { success: true, id: 2 };
    const callbackError = new Error("Callback failed");

    let finishRunningTask;
    const runningTaskResult = new Promise((resolve) => {
      finishRunningTask = resolve;
    });

    let notifyCallbackFailed;
    const callbackFailed = new Promise((resolve) => {
      notifyCallbackFailed = resolve;
    });

    const runningTask = jest.fn(() => runningTaskResult);
    const queuedTask = jest.fn().mockResolvedValue({
      success: true,
      id: 3,
    });

    const onResult = jest.fn(() => {
      notifyCallbackFailed();
      throw callbackError;
    });

    let poolSettled = false;

    const poolPromise = runWithConcurrencyLimit(
      [() => Promise.resolve(firstResult), runningTask, queuedTask],
      2,
      onResult,
    );

    const observedOutcome = poolPromise.then(
      (results) => {
        poolSettled = true;
        return { results };
      },
      (error) => {
        poolSettled = true;
        return { error };
      },
    );

    await callbackFailed;

    // Let an incorrectly early rejection reach observedOutcome.
    await new Promise((resolve) => setImmediate(resolve));

    const settledBeforeRunningTaskFinished = poolSettled;
    const queuedTaskCallsBeforeFinish = queuedTask.mock.calls.length;

    // Release the running task before assertions to avoid leaving it pending.
    finishRunningTask(secondResult);
    const outcome = await observedOutcome;

    expect(settledBeforeRunningTaskFinished).toBe(false);
    expect(queuedTaskCallsBeforeFinish).toBe(0);
    expect(outcome.error).toBe(callbackError);
    expect(runningTask).toHaveBeenCalledTimes(1);
    expect(queuedTask).not.toHaveBeenCalled();
    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith(firstResult);
  });

  test("does not start tasks when the signal is already aborted", async () => {
    const controller = new AbortController();
    const abortError = new Error("Client disconnected");

    controller.abort(abortError);

    const task = jest.fn();
    const onResult = jest.fn();

    await expect(
      runWithConcurrencyLimit([task], 2, onResult, {
        signal: controller.signal,
      }),
    ).rejects.toBe(abortError);

    expect(task).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  });

  test("stops queued tasks and drains running tasks after cancellation", async () => {
    const controller = new AbortController();
    const abortError = new Error("Client disconnected");

    let finishFirstTask;
    let finishSecondTask;

    const firstResult = new Promise((resolve) => {
      finishFirstTask = resolve;
    });

    const secondResult = new Promise((resolve) => {
      finishSecondTask = resolve;
    });

    const firstTask = jest.fn(() => firstResult);
    const secondTask = jest.fn(() => secondResult);
    const queuedTask = jest.fn().mockResolvedValue({
      success: true,
      id: 3,
    });
    const onResult = jest.fn();

    let poolSettled = false;

    const poolPromise = runWithConcurrencyLimit(
      [firstTask, secondTask, queuedTask],
      2,
      onResult,
      { signal: controller.signal },
    );

    const observedOutcome = poolPromise.then(
      (results) => {
        poolSettled = true;
        return { results };
      },
      (error) => {
        poolSettled = true;
        return { error };
      },
    );

    controller.abort(abortError);
    finishFirstTask({ success: true, id: 1 });

    await new Promise((resolve) => setImmediate(resolve));

    const settledBeforeSecondTaskFinished = poolSettled;
    const queuedCallsBeforeFinish = queuedTask.mock.calls.length;

    finishSecondTask({ success: true, id: 2 });

    const outcome = await observedOutcome;

    expect(settledBeforeSecondTaskFinished).toBe(false);
    expect(queuedCallsBeforeFinish).toBe(0);
    expect(outcome.error).toBe(abortError);

    expect(firstTask).toHaveBeenCalledTimes(1);
    expect(secondTask).toHaveBeenCalledTimes(1);
    expect(queuedTask).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  });

  test("keeps another pool running when both await a shared operation", async () => {
    const controller = new AbortController();
    const abortError = new Error("Client disconnected");

    let finishSharedOperation;

    const sharedOperation = new Promise((resolve) => {
      finishSharedOperation = resolve;
    });

    const cancelledQueuedTask = jest.fn();
    const activeQueuedTask = jest.fn().mockResolvedValue({
      success: true,
      id: 2,
    });

    const cancelledCallback = jest.fn();
    const activeCallback = jest.fn();

    const cancelledSearch = runWithConcurrencyLimit(
      [() => sharedOperation, cancelledQueuedTask],
      1,
      cancelledCallback,
      { signal: controller.signal },
    );

    const activeSearch = runWithConcurrencyLimit(
      [() => sharedOperation, activeQueuedTask],
      1,
      activeCallback,
    );

    const outcomes = Promise.allSettled([cancelledSearch, activeSearch]);

    controller.abort(abortError);

    const sharedResult = { success: true, id: 1 };
    finishSharedOperation(sharedResult);

    const [cancelledOutcome, activeOutcome] = await outcomes;

    expect(cancelledOutcome.status).toBe("rejected");
    expect(cancelledOutcome.reason).toBe(abortError);

    expect(cancelledQueuedTask).not.toHaveBeenCalled();
    expect(cancelledCallback).not.toHaveBeenCalled();

    expect(activeOutcome.status).toBe("fulfilled");
    expect(activeOutcome.value).toEqual([
      sharedResult,
      { success: true, id: 2 },
    ]);

    expect(activeQueuedTask).toHaveBeenCalledTimes(1);
    expect(activeCallback).toHaveBeenCalledTimes(2);
  });
});
