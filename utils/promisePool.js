async function runWithConcurrencyLimit(tasks, limit, onResult) {
  const executing = [];
  const results = [];

  for (const task of tasks) {
    const p = Promise.resolve()
      .then(() => task())
      .catch((error) => ({
        success: false,
        reason: "provider_error",
        error: error.message,
      }))
      .then((result) => {
        results.push(result);
        if (onResult) onResult(result);
        return result;
      })
      .finally(() => {
        executing.splice(executing.indexOf(p), 1);
      });

    executing.push(p);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);

  return results;
}

module.exports = runWithConcurrencyLimit;
