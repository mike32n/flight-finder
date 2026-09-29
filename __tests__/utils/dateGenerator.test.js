const dayjs = require("dayjs");
const generateTrips = require("../../utils/dateGenerator");

describe("generateTrips", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-09-29T12:00:00"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("should generate the requested number of trips", () => {
    const trips = generateTrips(2, 3, 4);

    expect(trips).toHaveLength(4);
  });

  test("should generate the first trip on the requested weekday", () => {
    const trips = generateTrips(5, 3, 1);

    const departure = dayjs(trips[0].departure);

    expect(departure.day()).toBe(5);
  });

  test("should use today when today matches the requested weekday", () => {
    const trips = generateTrips(2, 3, 1);

    expect(trips[0]).toEqual({
      departure: "2026-09-29",
      return: "2026-10-02",
    });
  });

  test("should use the next occurrence when the requested weekday has already passed", () => {
    const trips = generateTrips(1, 3, 1);

    expect(trips[0]).toEqual({
      departure: "2026-10-05",
      return: "2026-10-08",
    });
  });

  test("should generate departures one week apart", () => {
    const trips = generateTrips(5, 3, 3);

    expect(trips).toEqual([
      {
        departure: "2026-10-02",
        return: "2026-10-05",
      },
      {
        departure: "2026-10-09",
        return: "2026-10-12",
      },
      {
        departure: "2026-10-16",
        return: "2026-10-19",
      },
    ]);
  });

  test("should calculate return date from number of nights", () => {
    const trips = generateTrips(5, 4, 1);

    expect(trips[0]).toEqual({
      departure: "2026-10-02",
      return: "2026-10-06",
    });
  });
});
