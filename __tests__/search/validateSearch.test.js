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

  test.each([
    { destinations: [] },
    { destinations: "BCN" },
    { destinations: [null] },
    { destinations: [123] },
    { destinations: [{}] },
    { destinations: [""] },
    { destinations: ["lca"] },
    { destinations: ["LC"] },
    { destinations: ["LCAA"] },
    { destinations: ["LC1"] },
    { destinations: [" LCA"] },
    { destinations: ["LCA\n"] },
    { destinations: ["BCN", null] },
    { destinations: ["LCA", "LCA"] },
  ])("rejects invalid destinations: %p", ({ destinations }) => {
    req.body.destinations = destinations;

    validateSearch(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid destinations",
    });
    expect(next).not.toHaveBeenCalled();
  });

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
      (_, i) =>
        String.fromCharCode(
          65 + Math.floor(i / 676),
          65 + (Math.floor(i / 26) % 26),
          65 + (i % 26),
        ),
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
      (_, i) =>
        String.fromCharCode(
          65 + Math.floor(i / 676),
          65 + (Math.floor(i / 26) % 26),
          65 + (i % 26),
        ),
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
