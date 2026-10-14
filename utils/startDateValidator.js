const dayjs = require("dayjs");

function getStartDateError(startDate) {
  if (startDate === undefined || startDate === "") {
    return null;
  }

  if (typeof startDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return "Invalid start date";
  }

  const parsed = dayjs(startDate);

  if (!parsed.isValid() || parsed.format("YYYY-MM-DD") !== startDate) {
    return "Invalid start date";
  }

  if (startDate < dayjs().format("YYYY-MM-DD")) {
    return "Start date cannot be in the past";
  }

  return null;
}

module.exports = getStartDateError;
