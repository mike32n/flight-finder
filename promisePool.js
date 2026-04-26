async function runWithConcurrencyLimit(tasks, limit, onResult) {
  const executing = [];
  const results = [];

  for (const task of tasks) {
    const p = task()
      .then((result) => {
        results.push(result);
        if (onResult) onResult(result);
        return result;
      })
      .catch((error) => {
        const errResult = { success: false, error: error.message };
        results.push(errResult);
        if (onResult) onResult(errResult);
        return errResult;
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

  return results; // 🔥 EZ HIÁNYZOTT
}

module.exports = runWithConcurrencyLimit;
