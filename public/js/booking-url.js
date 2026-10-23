function getSafeBookingUrl(value) {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" ||
      url.username !== "" ||
      url.password !== ""
    ) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getSafeBookingUrl };
}
