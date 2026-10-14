const getStartDateError = require("../../utils/startDateValidator");

describe("getStartDateError", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-10-14T12:00:00"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test.each([undefined, "", "2026-10-14", "2027-03-01", "2028-02-29"])(
    "accepts an optional or valid date: %p",
    (startDate) => {
      expect(getStartDateError(startDate)).toBeNull();
    },
  );

  test.each(
    [
      null,
      123,
      {},
      [],
      "2027-3-01",
      "2027-02-29",
      "2027-04-31",
      "2027-13-01",
      "2027-03-01T00:00:00Z",
      "2027-03-01\n",
    ].map((value) => [value]),
  )("rejects an invalid date: %p", (startDate) => {
    expect(getStartDateError(startDate)).toBe("Invalid start date");
  });

  test("rejects a past date", () => {
    expect(getStartDateError("2026-10-13")).toBe(
      "Start date cannot be in the past",
    );
  });
});
