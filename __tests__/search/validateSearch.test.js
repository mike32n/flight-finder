const validateSearch = require("../../middlewares/validateSearch");
const appConfig = require("../../config/appConfig");

describe("validateSearch", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      body: {
        destinations: ["BCN"],
        weekday: 2,
        nights: 3,
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();
  });

  test("calls next for valid payload", () => {
    validateSearch(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test.each([[{ destinations: [] }], [{ destinations: "BCN" }]])(
    "rejects invalid destinations",
    (override) => {
      Object.assign(req.body, override);

      validateSearch(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    },
  );

  test.each([-1, 7, 2.5, "2"])("rejects invalid weekday %p", (weekday) => {
    req.body.weekday = weekday;

    validateSearch(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test.each([0, 2.5, "3"])("rejects invalid nights %p", (nights) => {
    req.body.nights = nights;

    validateSearch(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("rejects too many destinations", () => {
    req.body.destinations = Array.from(
      { length: appConfig.destinations.maxSelected + 1 },
      (_, i) => `D${i}`,
    );

    validateSearch(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid destinations",
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("accepts maximum allowed destinations", () => {
    req.body.destinations = Array.from(
      { length: appConfig.destinations.maxSelected },
      (_, i) => `D${i}`,
    );

    validateSearch(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test("rejects nights above configured maximum", () => {
    req.body = {
      destinations: ["CFU"],
      weekday: 5,
      nights: appConfig.search.maxNights + 1,
    };

    validateSearch(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid nights",
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("accepts configured maximum nights", () => {
    req.body = {
      destinations: ["CFU"],
      weekday: 5,
      nights: appConfig.search.maxNights,
    };

    validateSearch(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
