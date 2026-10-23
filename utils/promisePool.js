async function runWithConcurrencyLimit(tasks, limit, onResult) {
  const results = [];
  let nextTaskIndex = 0;
  let callbackFailed = false;
  let callbackError;

  async function worker() {
    while (!callbackFailed && nextTaskIndex < tasks.length) {
      const task = tasks[nextTaskIndex++];
      let result;

      try {
        result = await task();
      } catch (error) {
        result = {
          success: false,
          reason: "provider_error",
          error: error.message,
        };
      }

      if (callbackFailed) return;

      results.push(result);

      try {
        if (onResult) onResult(result);
      } catch (error) {
        callbackFailed = true;
        callbackError = error;
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () =>
    worker(),
  );

  await Promise.all(workers);

  if (callbackFailed) throw callbackError;

  return results;
}

module.exports = runWithConcurrencyLimit;
