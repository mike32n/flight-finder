const { isKnownAirportCode } = require("./airportCatalog");
const { getSafeBookingUrl } = require("../public/js/booking-url");

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isFlightDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function isValidFlightData(data) {
  return (
    isRecord(data) &&
    isKnownAirportCode(data.destination) &&
    isFlightDate(data.departure) &&
    isFlightDate(data.return) &&
    data.return > data.departure &&
    Number.isFinite(data.price) &&
    data.price > 0 &&
    typeof data.currency === "string" &&
    data.currency.length === 3 &&
    /^[A-Z]{3}$/.test(data.currency) &&
    (data.bookingUrl === undefined ||
      getSafeBookingUrl(data.bookingUrl) !== null)
  );
}

function normalizeProviderResult(result) {
  if (isRecord(result) && result.success === false) {
    if (result.reason === "no_results") {
      return {
        success: false,
        reason: "no_results",
      };
    }

    if (result.reason === "provider_error") {
      return {
        success: false,
        reason: "provider_error",
        error:
          typeof result.error === "string"
            ? result.error
            : "Provider request failed",
      };
    }
  }

  if (
    isRecord(result) &&
    result.success === true &&
    isValidFlightData(result.data)
  ) {
    return result;
  }

  return {
    success: false,
    reason: "provider_error",
    error: "Invalid provider response",
  };
}

module.exports = { normalizeProviderResult };
