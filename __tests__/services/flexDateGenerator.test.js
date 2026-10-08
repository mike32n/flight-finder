const {
  expandControlledFlexibility,
} = require("../../services/flexDateGenerator");
const { smartFlex } = require("../../config/appConfig");

describe("expandControlledFlexibility", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 1, 12));

    smartFlex.departureShiftDays = 1;
    smartFlex.returnShiftDays = 1;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("should include the original trip", () => {
    const trip = {
      departure: "2026-10-10",
      return: "2026-10-13",
    };

    const results = expandControlledFlexibility(trip);

    expect(results[0]).toEqual(trip);
  });

  test("should generate an earlier departure variant", () => {
    const trip = {
      departure: "2026-10-10",
      return: "2026-10-13",
    };

    const results = expandControlledFlexibility(trip);

    expect(results[1]).toEqual({
      departure: "2026-10-09",
      return: "2026-10-13",
    });
  });

  test("should generate a later return variant", () => {
    const trip = {
      departure: "2026-10-10",
      return: "2026-10-13",
    };

    const results = expandControlledFlexibility(trip);

    expect(results[2]).toEqual({
      departure: "2026-10-10",
      return: "2026-10-14",
    });
  });

  test("should exclude earlier departure when it falls in the past", () => {
    jest.setSystemTime(new Date(2026, 9, 8, 12));

    const results = expandControlledFlexibility({
      departure: "2026-10-08",
      return: "2026-10-11",
    });

    expect(results).toEqual([
      {
        departure: "2026-10-08",
        return: "2026-10-11",
      },
      {
        departure: "2026-10-08",
        return: "2026-10-12",
      },
    ]);
  });

  test("should allow earlier departure falling on today", () => {
    jest.setSystemTime(new Date(2026, 9, 8, 12));

    const results = expandControlledFlexibility({
      departure: "2026-10-09",
      return: "2026-10-11",
    });

    expect(results).toEqual([
      {
        departure: "2026-10-09",
        return: "2026-10-11",
      },
      {
        departure: "2026-10-08",
        return: "2026-10-11",
      },
      {
        departure: "2026-10-09",
        return: "2026-10-12",
      },
    ]);
  });

  test("should exclude past departure with a larger configured shift", () => {
    jest.setSystemTime(new Date(2026, 9, 8, 12));
    smartFlex.departureShiftDays = 3;

    const results = expandControlledFlexibility({
      departure: "2026-10-10",
      return: "2026-10-13",
    });

    expect(results).toEqual([
      {
        departure: "2026-10-10",
        return: "2026-10-13",
      },
      {
        departure: "2026-10-10",
        return: "2026-10-14",
      },
    ]);
  });

  test("should return exactly three trip variants", () => {
    const trip = {
      departure: "2026-10-10",
      return: "2026-10-13",
    };

    const results = expandControlledFlexibility(trip);

    expect(results).toHaveLength(3);
  });

  test("should handle month boundaries correctly", () => {
    const trip = {
      departure: "2026-10-01",
      return: "2026-10-31",
    };

    const results = expandControlledFlexibility(trip);

    expect(results).toEqual([
      {
        departure: "2026-10-01",
        return: "2026-10-31",
      },
      {
        departure: "2026-09-30",
        return: "2026-10-31",
      },
      {
        departure: "2026-10-01",
        return: "2026-11-01",
      },
    ]);
  });
});
