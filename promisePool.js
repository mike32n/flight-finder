async function runWithConcurrencyLimit(tasks, limit) {
  const results = [];
  const executing = [];

  for (const task of tasks) {
    const p = task()
      .then(result => {
        results.push({ success: true, data: result });
      })
      .catch(error => {
        results.push({ success: false, error: error.message });
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